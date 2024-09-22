import { Container, Logger, LogService } from '@essentials/common';
import { JSONCodec, NatsConnection } from 'nats';
import { NatsClient, NatsFactory } from '../../nats.factory';

export class NatsPublisher {
  private readonly logger: Logger;
  private client: NatsClient;
  private connection: NatsConnection;
  private readonly codec = JSONCodec();

  constructor() {
    this.logger = Container.get(LogService).createServiceLogger(
      this.constructor.name,
    );
  }

  async boot() {
    this.logger.info('boot service');
    this.client = await Container.get(NatsFactory).createClient('test');
    this.connection = await Container.get(NatsFactory).create('test');
  }

  emit<T>(data: T, ack = true) {
    this.logger.info('emit test', { ack, data });
    ack
      ? this.client.publish<T>('nats.test.ack', data)
      : this.connection.publish('nats.test', this.codec.encode(data));
  }

  async request<T, U>(data: T, ack = true) {
    this.logger.info('request test', { ack, data });
    const res = ack
      ? await this.client.request<T, U>('nats.test.req-ack', data)
      : await this.connection
          .request('nats.test.req', this.codec.encode(data))
          .then((r) => this.codec.decode(r.data));
    console.log('got response', res);
  }

  static async run() {
    const pub = new NatsPublisher();
    await pub.boot();

    let pubId = 1;
    let ackPubId = 1;
    let reqId = 1;
    let ackReqId = 1;

    setTimeout(() => {
      setInterval(() => {
        pub.emit({ time: Date.now(), id: pubId }, false);
        pubId += 1;
      }, 1000);
      setInterval(() => {
        pub.emit({ time: Date.now(), id: ackPubId });
        ackPubId += 1;
      }, 1000);
    }, 2000);

    setTimeout(() => {
      setInterval(() => {
        pub.request({ time: Date.now(), id: reqId }, false);
        reqId += 1;
      }, 1000);
      setInterval(() => {
        pub.request<{ time: number; id: number }, boolean>({
          time: Date.now(),
          id: ackReqId,
        });
        ackReqId += 1;
      }, 1000);
    }, 2000);
  }
}

NatsPublisher.run();
