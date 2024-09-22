import { createHash } from 'crypto';
import {
  BootableInterface,
  Container,
  Logger,
  LogService,
  Service,
} from '@essentials/common';
import { TokenVerifier } from './token/token-verifier';
import { TokenProblem } from './authentication-token.interface';
import { NatsFactory, RedisFactory } from '@essentials/infras';
import { JSONCodec, NatsConnection } from '@essentials/infras/lib/nats';
import { TokenSessionNotFound } from '@essentials/errors';

export interface AuthenticatePayload {
  token: string;
  ip: string;
  userAgent: string;
  fgp: string;
}

export interface AuthenticatorConfig {
  ignoreWorkspace?: boolean;
  ignoreOtp?: boolean;
  ignoreSession?: boolean;
}

@Service()
export class Authenticator implements BootableInterface {
  private natsClient: NatsConnection;
  private readonly natsCodec = JSONCodec();
  protected logger: Logger;

  constructor(private readonly tokenVerifier: TokenVerifier) {
    this.logger = Container.get(LogService).createServiceLogger(
      this.constructor.name,
    );
  }

  // little trick to reduce redis ram usage
  static minimizeTokenPrivateData(ip: string, userAgent: string): string {
    return createHash('md5')
      .update(ip + '-' + userAgent)
      .digest('hex');
  }

  async authenticate(
    { token, ip, userAgent, fgp }: AuthenticatePayload,
    config: AuthenticatorConfig = {
      ignoreOtp: false,
      ignoreWorkspace: true,
      ignoreSession: false,
    },
  ): Promise<
    | TokenProblem
    | {
        workspaceId?: string;
        userId: string;
        tokenId: string;
        otpSatisfy: boolean;
      }
  > {
    this.logger.debug('authenticate user', { config });
    try {
      const {
        secureDataHash,
        workspaceId,
        userId,
        tokenId,
        otpSatisfy,
        activeTokenId,
      } = await this.tokenVerifier.verify(token, undefined, fgp);
      if (!config.ignoreSession && activeTokenId !== tokenId) {
        this.logger.warn('session is not active');
        return TokenProblem.sessionProblem;
      }
      if (workspaceId || config.ignoreWorkspace) {
        if (otpSatisfy || config.ignoreOtp) {
          if (
            Authenticator.minimizeTokenPrivateData(ip, userAgent) ===
            secureDataHash
          ) {
            return {
              workspaceId,
              userId,
              tokenId,
              otpSatisfy: otpSatisfy,
            };
          } else {
            this.logger.warn(`secureDataHash has changed.`);
            if (
              await this.diagnoseTokenProblemRequest(tokenId, ip, userAgent)
            ) {
              return this.authenticate({ token, ip, userAgent, fgp }, config);
            } else {
              this.logger.warn(`'user problem', token revoked.`, {
                userId: userId,
              });
              return TokenProblem.userProblem;
            }
          }
        } else {
          this.logger.warn(`otp not satisfy not found`, {
            userId: userId,
          });
          return TokenProblem.otpProblem;
        }
      } else {
        this.logger.warn(`workspace not found`, {
          userId: userId,
        });
        return TokenProblem.workspaceProblem;
      }
    } catch (e) {
      if (e instanceof TokenSessionNotFound) {
        this.logger.error(`notAuthenticate`, {
          error: (e as Error).message,
        });
        return TokenProblem.sessionProblem;
      } else {
        this.logger.error(`notAuthenticate`, {
          error: (e as Error).message,
        });
        return TokenProblem.signatureProblem;
      }
    }
  }

  async diagnoseTokenProblemRequest(
    token: string,
    ip: string,
    userAgent: string,
  ) {
    this.logger.debug('diagnose token problem request', {
      token: '***',
    });
    return this.natsClient
      .request(
        'e.authentication.cache-conflict',
        this.natsCodec.encode({ token, ip, userAgent }),
      )
      .then((r) => this.natsCodec.decode(r.data));
  }

  async boot(): Promise<void> {
    this.natsClient = await Container.get(NatsFactory).create('authentication');
    await Container.get(RedisFactory).boot('authentication');
    await this.tokenVerifier.boot();
  }
}
