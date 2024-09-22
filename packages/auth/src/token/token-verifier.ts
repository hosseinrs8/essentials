import {
  BootableInterface,
  ConfigService,
  Container,
  Logger,
  LogService,
  Service,
} from '@essentials/common';
import jwt from 'jsonwebtoken';
import { RedisFactory } from '@essentials/infras';
import { RedisClientType } from '@essentials/infras';
import {
  AuthenticationTokenPrivateDataInterface,
  AuthenticationTokenPrivateDataRaw,
  AuthenticationTokenPublicDataGeneralInterface,
} from '../authentication-token.interface';
import {
  TokenSessionNotFound,
  UnauthorizedException,
} from '@essentials/errors';
import { TokenPriDataHelper } from './token-pri-data-helper';

export const DEFAULT_CACHE_TOKEN_KEY_PREFIX = 'at';
export const DEFAULT_CACHE_KEY_SEPARATOR = '.';

export const SESSION_CACHE_PREFIX = 'auth-session';
export const SESSION_CACHE_SEPARATOR = '.';

export const DEFAULT_TOKEN_EXPIRY = 86_400_000; // 24 hours in millis

// store key here so its be static and doesn't expose anywhere
const keys: { pubKey: Buffer | string | null } = {
  pubKey: null,
};

@Service()
export class TokenVerifier implements BootableInterface {
  private static readonly cacheIdentityName = 'authentication';
  private cache: RedisClientType;
  protected logger: Logger;
  protected cachePrefix = DEFAULT_CACHE_TOKEN_KEY_PREFIX;

  constructor(
    private readonly redisFactory: RedisFactory,
    private readonly configService: ConfigService,
  ) {
    this.logger = Container.get(LogService).createServiceLogger(
      this.constructor.name,
    );
  }

  async boot() {
    await this.loadKey();
    this.cache = this.redisFactory.get(TokenVerifier.cacheIdentityName);
  }

  private async loadKey() {
    this.logger.debug(`load key`);
    if (!keys.pubKey) {
      const keyPath = this.configService.get('authentication.pubKeyPath');
      keys.pubKey = ConfigService.readFileSync(keyPath);
    }
  }

  private static deserialize(
    data: string | null,
  ): AuthenticationTokenPrivateDataInterface {
    const tmp: AuthenticationTokenPrivateDataRaw = JSON.parse(data || '');
    return {
      secureDataHash: tmp[0],
      otpSatisfy: tmp[1],
      workspaceId: tmp[2],
      createdAt: tmp[3],
    };
  }

  async verify(
    token: string,
    cachePrefix = this.cachePrefix,
    fgp?: string,
  ): Promise<
    AuthenticationTokenPrivateDataInterface &
      AuthenticationTokenPublicDataGeneralInterface & {
        tokenId: string;
        activeTokenId?: string;
      }
  > {
    this.logger.debug('verify token and extract information from it');
    if (keys.pubKey) {
      try {
        const payload = jwt.verify(token, keys.pubKey);
        if (payload && typeof payload === 'object' && payload.sub) {
          const key = [cachePrefix, payload.sub].join(
            DEFAULT_CACHE_KEY_SEPARATOR,
          );
          const priData = await this.cache.get(key);
          const deserializedPriData = TokenVerifier.deserialize(priData);
          const tokenKey = [
            SESSION_CACHE_PREFIX,
            deserializedPriData.workspaceId,
            payload['userId'],
          ].join(SESSION_CACHE_SEPARATOR);
          const activeTokenId = (await this.cache.get(tokenKey)) || undefined;
          if (priData) {
            if (
              deserializedPriData.createdAt &&
              deserializedPriData.createdAt > Date.now() - DEFAULT_TOKEN_EXPIRY
            ) {
              if (
                fgp &&
                !TokenPriDataHelper.verifyFgp(fgp, payload['fgpHash'])
              ) {
                this.logger.warn('fgp not verified', {
                  cookieString: fgp,
                  fgpHash: payload['fgpHash'],
                });
                throw new UnauthorizedException();
              }
              return {
                ...deserializedPriData,
                tokenId: payload.sub,
                userId: payload['userId'],
                activeTokenId,
              };
            } else
              this.logger.warn('token is expired', {
                createdAt: deserializedPriData.createdAt,
              });
          } else this.logger.warn('priData not found');
        }
      } catch (error) {
        this.logger.error('token is invalid', { token });
        throw new UnauthorizedException();
      }
      this.logger.error(`TokenSessionNotFound`);
      throw new TokenSessionNotFound();
    } else {
      this.logger.error('Token private data not found!');
      throw new Error('key not ready yet');
    }
  }
}
