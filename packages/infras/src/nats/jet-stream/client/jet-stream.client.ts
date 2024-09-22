import { Container, Logger, LogService } from '@essentials/common';
import {
  Consumer,
  JetStreamManager,
  NatsConnection,
  PubAck,
  Stream,
  Codec,
  JSONCodec,
} from 'nats';
import { JetStreamUtility } from './jet-stream.utility';
import { StreamConfig } from 'nats/lib/jetstream/jsapi_types';
import { NatsClient } from '../../nats.factory';

export type JetStreamOptions = Partial<StreamConfig> & {
  subjects?: Array<string>;
};

export class JetStreamClient {
  private readonly logger: Logger;

  private _streamPrefix: string;
  private _consumerPrefix: string;

  private _manager: JetStreamManager;
  private _stream: Stream;
  private _consumer: Consumer;

  private readonly codec = JSONCodec();

  constructor(
    private readonly identity: string,
    protected readonly connection: NatsConnection | NatsClient,
  ) {
    this.logger = Container.get(LogService).createServiceLogger(
      this.constructor.name,
    );
  }

  get manager() {
    return this._manager;
  }

  streamPrefix(prefix: string) {
    this._streamPrefix = prefix;
  }

  consumerPrefix(prefix: string) {
    this._consumerPrefix = prefix;
  }

  async boot(opts?: JetStreamOptions): Promise<this> {
    this.logger.debug(`boot service`, { identity: this.identity });
    this._manager = await this.connection.jetstreamManager();
    if (opts) await this.init(opts);
    return this;
  }

  private async init(opts: JetStreamOptions): Promise<void> {
    this.logger.debug(`init stream and consumer`, { identity: this.identity });
    const streamName = this._streamPrefix
      ? [this._streamPrefix, this.identity].join('-')
      : this.identity;
    const consumerName = this._consumerPrefix
      ? [this._consumerPrefix, this.identity].join('-')
      : this.identity;
    this._stream = await JetStreamUtility.createOrUpdateStream(this._manager, {
      name: streamName,
      ...opts,
    });
    this._consumer = await JetStreamUtility.createOrUpdateConsumer(
      this._manager,
      streamName,
      {
        name: consumerName,
        ...opts,
      },
    );
  }

  async publish<T = any>(
    subject: string,
    payload: T,
    opts?: { codec?: Codec<unknown> },
  ): Promise<PubAck> {
    const codec = opts?.codec ?? this.codec;
    this.logger.debug('publish jetStream message', { subject });
    const encoded = codec.encode(payload);
    return this.connection.jetstream().publish(subject, encoded);
  }
}
