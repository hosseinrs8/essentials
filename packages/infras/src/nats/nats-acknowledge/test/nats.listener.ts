import { Container, Logger, LogService, Service } from '@essentials/common';
import { NatsServiceManager } from '../../nats-service-manager';
import { OnNatsEvent, OnNatsRequest } from '../../nats-service.decorator';

@Service()
export class NatsListener {
  private readonly logger: Logger;

  constructor() {
    this.logger = Container.get(LogService).createServiceLogger(
      this.constructor.name,
    );
  }

  static async boot() {
    Container.get(NatsListener).logger.info('service running');
    await NatsServiceManager.create().boot('test', [NatsListener]);
  }

  @OnNatsEvent('nats.test.ack', { queue: 'test' })
  listenAck<T>(data: T) {
    this.logger.info('ack - data received 1', { data });
  }

  @OnNatsEvent('nats.test.ack', { queue: 'test2' })
  listenAck2<T>(data: T) {
    this.logger.info('ack - data received 2', { data });
  }

  @OnNatsEvent('nats.test.ack', { queue: 'test3' })
  listenAck3<T>(data: T) {
    this.logger.info('ack - data received 3', { data });
  }

  @OnNatsEvent('nats.test.ack', { queue: 'test4' })
  listenAck4<T>(data: T) {
    this.logger.info('ack - data received 4', { data });
  }

  @OnNatsEvent('nats.test', { queue: 'test' })
  listen<T>(data: T) {
    this.logger.info('data received', { data });
  }

  @OnNatsRequest('nats.test.req-ack', { queue: 'test' })
  onReqAck<T>(data: T) {
    this.logger.info('ack - request received', { data });
    return true;
  }

  @OnNatsRequest('nats.test.req', { queue: 'test' })
  onReq<T>(data: T) {
    this.logger.info('request received', { data });
    return true;
  }
}

NatsListener.boot();
