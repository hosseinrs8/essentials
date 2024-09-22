import { Container, Logger, LogService, Service } from '@essentials/common';
import { RedisFactory } from '@essentials/infras';
import { RedisClientType } from '@essentials/infras';
import { UnauthorizedException } from '@essentials/errors';
import crypto from 'crypto';

export interface PriDataType {
  hash: string;
  workspaceId?: string;
  otpSatisfy: boolean;
  createdAt: number;
}

@Service({ transient: true })
export class TokenPriDataHelper {
  protected logger: Logger;
  private readonly redis: RedisClientType;
  private key: string;
  private data: PriDataType;

  constructor(redisFactory: RedisFactory) {
    this.logger = Container.get(LogService).createServiceLogger(
      this.constructor.name,
    );
    this.redis = redisFactory.get('authentication');
  }

  getKey() {
    return this.key;
  }

  async loadData(key: string) {
    this.key = key;
    const data = await this.redis.get(key);
    if (data) {
      const tmp = JSON.parse(data);
      this.data = {
        hash: tmp[0],
        otpSatisfy: tmp[1],
        workspaceId: tmp[2],
        createdAt: tmp[3],
      };
      return this.data;
    } else throw new UnauthorizedException();
  }

  setWorkspaceId(id: string) {
    this.data.workspaceId = id;
    return this;
  }

  removeWorkspaceId(workspaceId: string) {
    this.logger.silly('reset workspace', {
      data: this.data,
      workspaceId,
    });
    if (workspaceId === this.data.workspaceId) {
      this.data.workspaceId = undefined;
      return true;
    } else return false;
  }

  setOtpSatisfyState(value: boolean) {
    this.data.otpSatisfy = value;
    return this;
  }

  async updateData() {
    await this.redis.set(
      this.key,
      JSON.stringify(
        this.data.workspaceId
          ? [this.data.hash, this.data.otpSatisfy, this.data.workspaceId]
          : [this.data.hash, this.data.otpSatisfy],
      ),
      {
        KEEPTTL: true,
      },
    );
  }

  protected static parseCookies(cookieHeader: string) {
    const list: Record<string, string> = {};
    cookieHeader &&
      cookieHeader.split(';').forEach((cookie) => {
        const parts = cookie.split('=');
        const key = parts.shift();
        if (key) {
          list[key.trim()] = decodeURIComponent(parts.join('='));
        }
      });
    return list;
  }

  protected static makeHash(data: string) {
    const ctx = crypto.createHash('sha256');
    ctx.update(data);
    return ctx.digest('hex');
  }

  static verifyFgp(cookiesString: string, fgpHash: string) {
    const cookies = TokenPriDataHelper.parseCookies(cookiesString);
    const value = cookies['__Secure-Fgp'];
    if (value) {
      return fgpHash === TokenPriDataHelper.makeHash(value);
    } else return false;
  }
}
