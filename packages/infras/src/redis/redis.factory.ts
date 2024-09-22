import {
  ConfigService,
  Container,
  Logger,
  LogService,
  Service,
} from '@essentials/common';
import {
  createClient,
  RedisClientOptions,
  RedisClientType as RedisClient,
} from '@redis/client';
import { RedisIdentity, RedisIdentityRaw } from './redis-identity.interface';
import { RedisHealth } from './redis.health';
import {
  RedisMonitoring,
  RedisMonitoringMode,
  RedisMonitoringOptions,
} from './redis-monitoring.service';
import { RedisSocketOptions } from '@redis/client/dist/lib/client/socket';
import {
  RedisFunctions,
  RedisModules,
  RedisScripts,
} from '@redis/client/dist/lib/commands';

export const REDIS_IDENTITY_CONFIG_PREFIX = 'redis-identity-';

export type RedisClientType = RedisClient<
  RedisModules,
  RedisFunctions,
  RedisScripts
>;

@Service()
export class RedisFactory {
  private readonly configCache: Map<string, RedisClientOptions> = new Map();
  private readonly clientPool: Map<string, RedisClientType> = new Map();
  protected logger: Logger;

  public static health = new RedisHealth();

  constructor(protected readonly configService: ConfigService) {
    this.logger = Container.get(LogService).createServiceLogger(
      this.constructor.name,
    );
  }

  private loadIdentity(identityName: string): RedisIdentity {
    this.logger.debug('loadIdentity', { identityName: identityName });
    const rawIdentity = this.configService.get<RedisIdentityRaw>(
      REDIS_IDENTITY_CONFIG_PREFIX + identityName,
    );
    const identity: RedisIdentity = {
      url: rawIdentity.url,
      username: rawIdentity.username,
    };
    if (rawIdentity.passwordPath) {
      this.logger.debug(`calling ConfigService.readFileSync`, {
        passwordPath: '***',
      });
      identity.password = ConfigService.readFileSync(rawIdentity.passwordPath);
    }
    if (rawIdentity.tls && rawIdentity.tls.enabled) {
      identity.tls = {
        enabled: rawIdentity.tls.enabled,
      };
      if (rawIdentity.tls.keyPath) {
        this.logger.debug(`calling ConfigService.readFileSync`, {
          keyPath: '***',
        });
        identity.tls.key = ConfigService.readFileSync(rawIdentity.tls.keyPath);
      }
      if (rawIdentity.tls.caPath) {
        this.logger.debug(`calling ConfigService.readFileSync`, {
          caPath: '***',
        });
        identity.tls.ca = ConfigService.readFileSync(rawIdentity.tls.caPath);
      }
      if (rawIdentity.tls.certPath) {
        this.logger.debug(`calling ConfigService.readFileSync`, {
          certPath: '***',
        });
        identity.tls.cert = ConfigService.readFileSync(
          rawIdentity.tls.certPath,
        );
      }
    }
    this.logger.info(`identity successfully loaded`, {
      url: identity.url,
      username: identity.username,
    });
    return identity;
  }

  private static generateConfig(identity: RedisIdentity): RedisClientOptions {
    const options: RedisClientOptions = { url: identity.url };
    if (identity.username) {
      options.username = identity.username;
    }
    if (identity.password) {
      options.password = identity.password;
    }
    if (identity.database) {
      options.database = identity.database;
    }
    if (identity.tls && identity.tls.enabled) {
      const socketOptions: RedisSocketOptions = {
        tls: true,
      };
      if (identity.tls.ca) {
        socketOptions.ca = identity.tls.ca;
      }
      if (identity.tls.key) {
        socketOptions.key = identity.tls.key;
      }
      if (identity.tls.cert) {
        socketOptions.cert = identity.tls.cert;
      }
      options.socket = socketOptions;
    }
    return options;
  }

  protected loadConfig(identityName: string): RedisClientOptions {
    this.logger.debug('loadConfig', { identityName: identityName });
    const cachedConfig = this.configCache.get(identityName);
    if (cachedConfig) {
      return cachedConfig;
    } else {
      const options = RedisFactory.generateConfig(
        this.loadIdentity(identityName),
      );
      this.configCache.set(identityName, options);
      return options;
    }
  }

  async create(
    identityName: string,
    advanceOptions?: RedisClientOptions,
    monitoringOptions: RedisMonitoringOptions = {
      keepAlive: true,
      mode: RedisMonitoringMode.alive,
    },
  ) {
    this.logger.debug('create', {
      identityName: identityName,
      advancedOption: advanceOptions,
    });
    const options = this.loadConfig(identityName);
    const client = createClient({ ...options, ...advanceOptions });
    await client
      .on('error', (e) => this.logger.error('redis error', { error: e }))
      .on('connect', () => this.logger.info('redis client connected'))
      .connect();
    this.logger.info(`client successfully created and connected`, {
      identityName: identityName,
    });
    if (monitoringOptions) {
      new RedisMonitoring(identityName, client, monitoringOptions);
    }
    RedisFactory.health.register([advanceOptions?.legacyMode || false, client]);
    return client;
  }

  async boot(identityName: string) {
    this.logger.debug('boot', { identityName: identityName });
    if (!this.clientPool.has(identityName)) {
      const client = await this.create(identityName);
      this.clientPool.set(identityName, client);
    }
  }

  get(identityName: string) {
    this.logger.debug('get client by identityName', {
      identityName: identityName,
    });
    const client = this.clientPool.get(identityName);
    if (client) {
      return client;
    } else {
      this.logger.error(`identity not booted.`, { identityName: identityName });
      throw new Error(`identity "${identityName}" not booted.`);
    }
  }

  closeClientPool() {
    this.logger.debug(`close client pool`);
    return Promise.all([...this.clientPool.values()].map((c) => c.quit()));
  }
}
