import {
  getIP,
  getUserAgent,
  HttpRequest,
  HttpResponse,
  Middleware,
  MiddlewareFunctionType,
} from '@essentials/http';
import { Container, Logger, LogService, Service } from '@essentials/common';
import { Authenticator } from '../authenticator';
import {
  AuthenticationTokenPublicDataInterface,
  TokenProblem,
} from '../authentication-token.interface';
import {
  TwoFactorAuthenticationError,
  UnauthorizedException,
  InvalidWorkspaceError,
} from '@essentials/errors';

export type AuthenticatedResponse = HttpResponse & {
  user: AuthenticationTokenPublicDataInterface;
};

@Service()
export class AuthenticatedMiddleware implements Middleware {
  protected logger: Logger;

  constructor(private readonly authenticator: Authenticator) {
    this.logger = Container.get(LogService).createServiceLogger(
      this.constructor.name,
    );
  }

  async use(
    res: HttpResponse,
    req: HttpRequest,
    next: MiddlewareFunctionType,
  ): Promise<void> {
    this.logger.debug('middleware, authenticate');
    const token = req.getHeader('authorization');
    const fgp = req.getHeader('cookie');
    if (token) {
      const ip = getIP(res);
      const ua = getUserAgent(req);
      const result = await this.authenticator.authenticate(
        {
          token: token.slice(7),
          ip,
          userAgent: ua,
          fgp,
        },
        {
          ignoreWorkspace: false,
          ignoreOtp: false,
        },
      );
      if (typeof result !== 'number') {
        res.user = {
          userId: result.userId,
          workspaceId: result.workspaceId,
          tokenId: result.tokenId,
        } as AuthenticationTokenPublicDataInterface;
        return next(res, req);
      } else {
        this.logger.warn('401 Unauthorized', { warn: TokenProblem[result] });
        switch (result) {
          case TokenProblem.otpProblem:
            throw new TwoFactorAuthenticationError();
          case TokenProblem.workspaceProblem:
            throw new InvalidWorkspaceError();
        }
      }
    }
    this.logger.error(`UnauthorizedException`);
    throw new UnauthorizedException();
  }
}
