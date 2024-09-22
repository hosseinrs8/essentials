import {
  ConfigService,
  Container,
  Logger,
  LogService,
  Service,
} from '@essentials/common';
import { NatsIdentity, NatsRawIdentity } from './nats-identity.interface';
import {
  connect,
  ConnectionOptions,
  Msg,
  NatsConnection,
  TlsOptions,
  RequestOptions,
  NatsError,
  Codec,
  JSONCodec,
} from 'nats';
import { NatsHealth } from './nats.health';
import {
  NatsPublisher,
  NatsSubscriber,
  SubscriberCount,
} from './nats-acknowledge';

export const NATS_IDENTITY_CONFIG_PREFIX = 'nats-identity-';

export type ClientPublishOptions = {
  timeout?: number;
  codec?: Codec<any>;
};

export type ClientSubscribeOptions = {
  queue?: string;
  callback?: (err: NatsError | null, msg: Msg) => Promise<void>;
};

export type NatsClient = Omit<
  NatsConnection,
  'publish' | 'subscribe' | 'request'
> & {
  publish: <T>(
    subject: string,
    payload: T,
    options?: ClientPublishOptions,
  ) => Promise<boolean>;
  request: <T, U = unknown>(
    subject: string,
    payload?: T,
    opts?: RequestOptions & { codec?: Codec<unknown> },
  ) => Promise<U>;
  subscribe: (
    subject: string,
    options?: ClientSubscribeOptions,
  ) => AsyncGenerator<Msg, void, unknown> | Promise<void>;
};

@Service()
export class NatsFactory {
  private readonly configCache: Map<string, ConnectionOptions> = new Map();
  private readonly connectionPool: Map<string, NatsConnection> = new Map();
  private readonly clientPool: Map<string, NatsClient> = new Map();
  protected readonly logger: Logger;

  public static health = new NatsHealth();

  constructor(private readonly configService: ConfigService) {
    this.logger = Container.get(LogService).createServiceLogger(
      this.constructor.name,
    );
  }

  private loadIdentity(identityName: string): NatsIdentity {
    this.logger.debug('loadIdentity');
    const rawIdentity = this.configService.get<NatsRawIdentity>(
      NATS_IDENTITY_CONFIG_PREFIX + identityName,
    );
    const identity: NatsIdentity = {
      urls: rawIdentity.urls,
      username: rawIdentity.username,
      noEcho: !rawIdentity.echo,
    };
    if (rawIdentity.passwordPath) {
      this.logger.debug(`calling ConfigService.readFileSync`, {
        passwordPath: '***',
      });
      identity.password = ConfigService.readFileSync(rawIdentity.passwordPath);
    }
    if (rawIdentity.tokenPath) {
      this.logger.debug(`calling ConfigService.readFileSync`, {
        tokenPath: '***',
      });
      identity.token = ConfigService.readFileSync(rawIdentity.tokenPath);
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
          cerPath: '***',
        });
        identity.tls.cert = ConfigService.readFileSync(
          rawIdentity.tls.certPath,
        );
      }
    }
    this.logger.info(`identity successfully loaded`, {
      url: identity.urls,
      username: identity.username,
    });
    return identity;
  }

  private static generateConfig(identity: NatsIdentity): ConnectionOptions {
    const options: ConnectionOptions = { servers: identity.urls };
    if (identity.username) {
      options.user = identity.username;
    }
    if (identity.password) {
      options.pass = identity.password;
    }
    if (identity.token) {
      options.token = identity.token;
    }
    if (identity.tls && identity.tls.enabled) {
      const socketOptions: TlsOptions = {};
      if (identity.tls.ca) {
        socketOptions.ca = identity.tls.ca;
      }
      if (identity.tls.key) {
        socketOptions.key = identity.tls.key;
      }
      if (identity.tls.cert) {
        socketOptions.cert = identity.tls.cert;
      }
      options.tls = socketOptions;
    }
    options.noEcho = identity.noEcho;
    return options;
  }

  private loadConfig(identityName: string): ConnectionOptions {
    this.logger.debug('loadConfig', { identityName: identityName });
    const cachedConfig = this.configCache.get(identityName);
    if (cachedConfig) {
      return cachedConfig;
    } else {
      this.logger.debug(`calling NatsFactory.generateConfig`);
      const options = NatsFactory.generateConfig(
        this.loadIdentity(identityName),
      );
      this.configCache.set(identityName, options);
      return options;
    }
  }

  create(identityName: string): Promise<NatsConnection> {
    this.logger.debug('create new connection', {
      identityName: identityName,
    });
    const options = this.loadConfig(identityName);
    return connect(options);
  }

  async boot(identityName: string, force = false) {
    this.logger.debug('boot service', { identityName: identityName });
    let connection = this.connectionPool.get(identityName);
    if (!force && connection) return connection;
    connection = await this.create(identityName);
    this.connectionPool.set(identityName, connection);
    return connection;
  }

  async bootClient(identityName: string, force = false) {
    this.logger.debug('boot ack service', { identityName: identityName });
    let client = this.clientPool.get(identityName);
    if (!force && client) return client;
    client = await this.createClient(identityName);
    this.clientPool.set(identityName, client);
    return client;
  }

  get(identityName: string) {
    this.logger.debug('get client', { identityName: identityName });
    const client = this.connectionPool.get(identityName);
    if (client) {
      return client;
    } else {
      this.logger.error(`identity not booted`, { identityName: identityName });
      throw new Error(`identity "${identityName}" not booted.`);
    }
  }

  getClient(identityName: string) {
    this.logger.debug('get ack client', { identityName: identityName });
    const client = this.clientPool.get(identityName);
    if (client) {
      return client;
    } else {
      this.logger.error(`identity not booted`, { identityName: identityName });
      throw new Error(`identity "${identityName}" not booted.`);
    }
  }

  closeConnectionPool() {
    this.logger.debug(`close client pool`);
    return Promise.all([...this.connectionPool.values()].map((c) => c.close()));
  }

  closeClientPool() {
    this.logger.debug(`close client pool`);
    return Promise.all([...this.clientPool.values()].map((c) => c.close()));
  }

  createClient(identityName: string): Promise<NatsClient> {
    this.logger.debug('create new connection', {
      identityName: identityName,
    });
    const options = this.loadConfig(identityName);
    return connect(options).then((c) => this.buildClient(c));
  }

  protected publisherMap: Map<string, NatsPublisher> = new Map();

  private buildClient(connection: NatsConnection): NatsClient {
    this.logger.silly('build nats client', { connection: connection.info });
    return {
      ...connection,
      publish: <T>(
        subject: string,
        payload: T,
        options?: ClientPublishOptions,
      ): Promise<boolean> => {
        const tmp = this.publisherMap.get(subject);
        if (tmp) {
          return (tmp as NatsPublisher<T>).request(
            payload,
            options?.timeout,
            options?.codec,
          );
        } else {
          const publisher = new NatsPublisher<T>(
            connection,
            subject,
            SubscriberCount.Auto,
          );
          this.publisherMap.set(subject, publisher);
          return publisher.request(payload, options?.timeout, options?.codec);
        }
      },
      request: <T, U = unknown>(
        subject: string,
        payload?: T,
        opts?: RequestOptions & { codec?: Codec<any> },
      ): Promise<U> => {
        const codec = opts?.codec ?? JSONCodec<T | U | unknown>();
        return connection
          .request(
            subject,
            payload ? codec.encode(payload) : codec.encode({}),
            opts,
          )
          .then((msg) => codec.decode(msg.data) as U);
      },
      subscribe: <T>(
        subject: string,
        options?: ClientSubscribeOptions,
      ): AsyncGenerator<Msg, void, unknown> | Promise<void> => {
        const subscriber = new NatsSubscriber<T>(
          connection,
          subject,
          options?.queue || 'general',
          true,
        );
        if (options?.callback) {
          return subscriber.subscribeWait(options.callback);
        } else {
          return subscriber.subscribe();
        }
      },
    };
  }
}
