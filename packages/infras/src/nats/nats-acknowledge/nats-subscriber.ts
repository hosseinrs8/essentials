import { NatsConnection, Subscription } from 'nats/lib/nats-base-client/core';
import { Codec, JSONCodec, Msg, NatsError } from 'nats';
import {
  ACKNOWLEDGEMENT_POSTFIX,
  CONSUMER_REQUEST_POSTFIX,
  NatsRequestPayload,
  PRODUCER_REQUEST_POSTFIX,
} from './types';
import { Container, Logger, LogService } from '@essentials/common';

export class NatsSubscriber<PayloadType = unknown> {
  protected subscriptionForProducer!: Subscription;
  protected subscription!: Subscription;
  protected readonly codec = JSONCodec<NatsRequestPayload<PayloadType>>();
  protected readonly logger: Logger;

  constructor(
    protected readonly client: NatsConnection,
    protected readonly subject: string,
    protected readonly queueName: string,
    protected readonly autoRegister = true,
  ) {
    this.logger = Container.get(LogService).createServiceLogger(
      this.constructor.name,
    );
    if (this.autoRegister) {
      this.register();
      this.listenForProducer();
    }
  }

  protected listenForProducer() {
    const subject = this.subject + PRODUCER_REQUEST_POSTFIX;
    this.subscriptionForProducer = this.client.subscribe(subject, {
      callback: this.register.bind(this),
    });
    this.logger.debug('listen for producer', { subject });
  }

  protected register() {
    const subject = this.subject + CONSUMER_REQUEST_POSTFIX;
    this.client.publish(subject, this.queueName);
    this.logger.debug('register', {
      rawSubject: subject,
      queueName: this.queueName,
    });
    return this;
  }

  protected refreshSubscription() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
    this.subscription = this.client.subscribe(this.subject, {
      queue: this.queueName,
    });
    this.logger.debug('refresh subscription');
  }

  protected acknowledge(id: string) {
    const subject = this.subject + ACKNOWLEDGEMENT_POSTFIX + id;
    this.client.publish(subject, this.queueName);
    this.logger.silly('acknowledge', {
      rawSubject: subject,
      queueName: this.queueName,
    });
  }

  async *subscribe() {
    this.logger.debug('subscribe normal mode');
    this.refreshSubscription();
    for await (const msg of this.subscription) {
      try {
        const request = this.codec.decode(msg.data);
        const { _natsRequestOptions: options } = request;
        if (options) {
          this.logger.silly('new message', {
            id: options.id,
            timeout: options.timeout,
          });
          yield msg;
          this.acknowledge(options.id);
        } else {
          this.logger.silly('new message');
          yield msg;
        }
      } catch (e) {
        // don't break the loop
        this.logger.error('error in subscribe loop', {
          error: (e as Error).toString(),
        });
        console.warn(e);
      }
    }
  }

  async subscribeWait(
    callback: (err: NatsError | null, msg: Msg) => Promise<void>,
  ) {
    this.logger.debug('subscribe wait mode');
    this.refreshSubscription();
    for await (const msg of this.subscription) {
      try {
        const request = this.codec.decode(msg.data);
        const { _natsRequestOptions: options } = request;
        if (options) {
          this.logger.silly('new message wait mode', {
            id: options.id,
            timeout: options.timeout,
          });
          await callback(null, msg);
          this.acknowledge(options.id);
        } else {
          this.logger.silly('new message');
          await callback(null, msg);
        }
      } catch (e) {
        // don't break the loop
        this.logger.error('error in subscribe wait loop', {
          error: (e as Error).toString(),
        });
        console.warn(e);
        await callback(e as NatsError, msg);
      }
    }
  }

  manualSubscription() {
    return this.client.subscribe(this.subject, {
      queue: this.queueName,
    });
  }

  manualAcknowledge(message: Msg, codec: Codec<any> = this.codec) {
    try {
      const { _natsRequestOptions: options } = codec.decode(
        message.data,
      ) as NatsRequestPayload<PayloadType>;
      if (options) {
        this.acknowledge(options.id);
      }
    } catch (e) {
      this.logger.debug('message is not decodable', {
        msg: message.string(),
        error: (e as Error).message,
      });
    }
  }

  stop() {
    if (this.subscriptionForProducer) {
      this.subscriptionForProducer.unsubscribe();
    }
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
    this.logger.debug('stopped');
  }

  getSubject() {
    return this.subject;
  }
}
