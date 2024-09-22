import { Container, LogService, Logger, Service } from '@essentials/common';
import { JetStreamClient, JetStreamOptions } from './client/jet-stream.client';
import { NatsConnection } from 'nats';
import { NatsClient, NatsFactory } from '../nats.factory';

@Service()
export class JetStreamFactory {
  private readonly logger: Logger;

  static clients = new Map<string, JetStreamClient>();

  constructor() {
    this.logger = Container.get(LogService).createServiceLogger(
      this.constructor.name,
    );
  }

  async create(identity: string, base?: NatsConnection | NatsClient) {
    this.logger.debug('create nats jet stream client', { identity });
    base = base ?? (await Container.get(NatsFactory).create(identity));
    const client = new JetStreamClient(identity, base);
    JetStreamFactory.clients.set(identity, client);
    return client;
  }

  async boot(
    identity: string,
    opts?: JetStreamOptions,
    base?: NatsConnection | NatsClient,
    force = false,
  ): Promise<JetStreamClient> {
    this.logger.debug('boot nats jet stream client', { identity });
    const client = JetStreamFactory.clients.get(identity);
    if (!force && client) {
      return client.boot(opts);
    }
    base = base ?? (await Container.get(NatsFactory).create(identity));
    return (await this.create(identity, base)).boot(opts);
  }

  get(identity: string) {
    this.logger.debug('get nats jet stream client', { identity });
    return JetStreamFactory.clients.get(identity);
  }
}
