import {
  ConfigService,
  Service,
  Logger,
  LogService,
  Container,
} from '@essentials/common';
import { S3Identity } from './s3-identity-interface';
import { S3Config } from './s3-config';
import { S3Storage } from '../cloud/s3-storage';

export const S3_IDENTITY_CONFIG_PREFIX = 's3-identity-';

@Service()
export class S3StorageFactory {
  private readonly configCache: Map<string, S3Config> = new Map();

  protected logger: Logger;
  constructor(private readonly configService: ConfigService) {
    this.logger = Container.get(LogService).createServiceLogger(
      this.constructor.name,
    );
  }

  private loadIdentity(identityName: string) {
    this.logger.debug('load identity', { identityName });
    return this.configService.get<S3Identity>(
      S3_IDENTITY_CONFIG_PREFIX + identityName,
    );
  }

  private static generateConfig(identity: S3Identity) {
    const { accessKeyIdPath, secretAccessKeyPath, region, endpoint, bucket } =
      identity;
    const options: S3Config = {
      accessKeyId: ConfigService.readFileSync(accessKeyIdPath),
      secretAccessKey: ConfigService.readFileSync(secretAccessKeyPath),
    };
    if (identity.region) {
      options.region = region;
    }
    if (identity.endpoint) {
      options.endpoint = endpoint;
    }
    if (identity.bucket) {
      options.bucket = bucket;
    }
    return options;
  }

  loadConfig(identityName: string): S3Config {
    this.logger.debug('load config', { identityName });
    const cachedConfig = this.configCache.get(identityName);
    if (cachedConfig) {
      return cachedConfig;
    } else {
      const options = S3StorageFactory.generateConfig(
        this.loadIdentity(identityName),
      );
      this.logger.debug(`config generated and set to config catch`, {
        identityName,
      });
      this.configCache.set(identityName, options);
      return options;
    }
  }

  create(identityName: string) {
    const config = this.loadConfig(identityName);
    return new S3Storage(config);
  }

  getBucket(identityName: string): string | undefined {
    return (
      this.configCache.get(identityName)?.bucket ||
      this.configService.get<S3Identity>(
        S3_IDENTITY_CONFIG_PREFIX + identityName,
      ).bucket
    );
  }
}
