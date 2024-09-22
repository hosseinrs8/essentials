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
import { TokenProblem } from '../authentication-token.interface';
import {
  TwoFactorAuthenticationError,
  UnauthorizedException,
} from '@essentials/errors';

@Service()
export class AuthenticatedNoSessionMiddleware implements Middleware {
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
    this.logger.debug(`middleware, authenticate without workspace`);
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
          ignoreSession: true,
        },
      );
      if (typeof result !== 'number') {
        res.user = result;
        return next(res, req);
      } else {
        this.logger.warn('401 Unauthorized', { warn: TokenProblem[result] });
        if (result === TokenProblem.otpProblem) {
          throw new TwoFactorAuthenticationError();
        }
      }
    }
    this.logger.error(`UnauthorizedException`);
    throw new UnauthorizedException();
  }
}
