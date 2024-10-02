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
import { JetStreamMessage, JetStreamUtility } from './jet-stream.utility';
import { StreamConfig } from 'nats/lib/jetstream/jsapi_types';
import { NatsClient } from '../../nats.factory';
import { randomUUID } from 'crypto';
import { RequestTimeOut } from '@essentials/errors';

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
    const encoded = codec.encode({ _payload: payload });
    return this.connection.jetstream().publish(subject, encoded);
  }

  async request<T = any, R = any>(
    subject: string,
    payload: T,
    opts?: { codec?: Codec<unknown>; timeout?: number },
  ): Promise<R> {
    const codec = opts?.codec ?? this.codec;
    this.logger.debug('publish jetStream message', { subject });
    const message: JetStreamMessage<T> = {
      _payload: payload,
      _reply: randomUUID(),
    };
    const encoded = codec.encode(message);
    await this.connection.jetstream().publish(subject, encoded);

    const stream = await JetStreamUtility.createOrUpdateStream(this.manager, {
      subjects: [message._reply!],
      name: message._reply!,
    });
    const consumerName = [message._reply!, randomUUID()].join('-');
    const consumer = await JetStreamUtility.createOrUpdateConsumer(
      this.manager,
      stream.name,
      {
        name: consumerName,
      },
    );
    return new Promise(async (resolve, reject) => {
      setTimeout(() => {
        this.removeListener(stream.name, consumerName).catch((e) =>
          this.logger.error('failed to stop listeners', { error: e }),
        );
        return reject(new RequestTimeOut());
      }, opts?.timeout ?? 1_000);
      for await (const message of await consumer.consume()) {
        message.ack();
        this.removeListener(stream.name, consumerName).catch((e) =>
          this.logger.error('failed to stop listeners', { error: e }),
        );
        return resolve(codec.decode(message.data) as R);
      }
    });
  }

  private async removeListener(streamName: string, consumerName: string) {
    await this.manager.consumers.delete(streamName, consumerName);
    await this.manager.streams.delete(streamName);
  }
}
