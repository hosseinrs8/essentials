import { JSONCodec } from 'nats';
import {
  Msg,
  NatsConnection,
  NatsError,
  Subscription,
} from 'nats/lib/nats-base-client/core';
import { randomUUID } from 'crypto';
import {
  ACKNOWLEDGEMENT_POSTFIX,
  ACKNOWLEDGEMENT_TIMEOUT,
  CONSUMER_REQUEST_POSTFIX,
  NatsRequestPayload,
  PRODUCER_REQUEST_POSTFIX,
  SubscriberCount,
} from './types';
import { RetryRunner } from './retry-runner';
import { Container, Logger, LogService } from '@essentials/common';

function sleep(t: number) {
  return new Promise((r) => setTimeout(r, t));
}

export class NatsPublisher<PayloadType = unknown> {
  protected readonly codec = JSONCodec<NatsRequestPayload<PayloadType>>();
  protected readonly queues: Set<string> = new Set();
  protected subscriptionForConsumer!: Subscription;
  protected readonly logger: Logger;
  protected registerHasBeenCalled = false;

  constructor(
    protected readonly client: NatsConnection,
    protected readonly subject: string,
    protected subscriberCount: SubscriberCount | number,
  ) {
    this.logger = Container.get(LogService).createServiceLogger(
      this.constructor.name,
    );
    if (this.subscriberCount === SubscriberCount.Auto) {
      this.subscribeForConsumer();
    }
  }

  protected async register() {
    const subject = this.subject + PRODUCER_REQUEST_POSTFIX;
    this.client.publish(subject);
    await sleep(50); // wait for consumers
    this.registerHasBeenCalled = true;
    this.logger.debug('register', { rawSubject: subject });
    return this;
  }

  protected onNewConsumer(err: NatsError | null, msg: Msg) {
    if (!err) {
      const consumer = msg.string();
      if (this.queues.has(consumer)) {
        this.logger.silly('consumer already registered', {
          consumer,
          subscriberCount: this.subscriberCount,
          subject: this.subject,
        });
        this.subscriberCount = this.queues.size;
        return;
      }
      this.queues.add(consumer);
      this.subscriberCount = this.queues.size;
      this.logger.debug('new consumer', {
        consumer,
        subscriberCount: this.subscriberCount,
        subject: this.subject,
      });
    } else {
      console.warn(err);
    }
  }

  protected subscribeForConsumer() {
    this.subscriptionForConsumer = this.client.subscribe(
      this.subject + CONSUMER_REQUEST_POSTFIX,
      {
        callback: this.onNewConsumer.bind(this),
      },
    );
    this.logger.debug('subscribed for consumer');
    setTimeout(this.register.bind(this));
  }

  protected async waitForAcknowledgement(id: string, timeout: number) {
    const subject = this.subject + ACKNOWLEDGEMENT_POSTFIX + id;
    this.logger.silly('wait for acknowledgement', { subject, id });
    const subscription = this.client.subscribe(subject);
    const timeoutHandler = setTimeout(() => {
      try {
        subscription.unsubscribe();
      } catch (e) {}
      this.logger.silly('acknowledgement timeout!', { id });
    }, timeout);
    const acknowledgements: Set<string> = new Set();
    for await (const msg of subscription) {
      acknowledgements.add(msg.string());
      if (acknowledgements.size === this.subscriberCount) break;
    }
    clearTimeout(timeoutHandler);
    if (!subscription.isClosed()) {
      subscription.unsubscribe();
    }
    if (acknowledgements.size !== this.subscriberCount) {
      const leftConsumers: Array<string> = [];
      for (const consumer of this.queues.values()) {
        if (!acknowledgements.has(consumer)) {
          leftConsumers.push(consumer);
        }
      }
      this.logger.error('Acknowledgement not fulfil', {
        id,
        leftConsumers,
      });
    }
    return acknowledgements.size === this.subscriberCount;
  }

  protected async internalRequest(
    payload: PayloadType,
    timeout: number,
    codec = this.codec,
  ) {
    const id = randomUUID().replace(/-/g, '');
    setTimeout(() => {
      this.client.publish(
        this.subject,
        codec.encode({
          _payload: payload,
          _natsRequestOptions: {
            timeout,
            id,
          },
        }),
      );
      this.logger.debug('message published', { id });
    });
    const fulfil = await this.waitForAcknowledgement(id, timeout);
    if (fulfil) {
      return true;
    } else {
      this.logger.error('request not fulfilled', { sub: this.subject });
      // throw new Error('request not fulfilled');
    }
  }

  protected async checkForConsumerStatus(): Promise<void> {
    this.logger.verbose('Check for register to been called');
    if (this.subscriberCount <= 0) {
      if (this.registerHasBeenCalled) {
        this.logger.error('There is no consumer!');
        // throw new Error('There is no consumer!');
      } else {
        await sleep(60);
        return this.checkForConsumerStatus();
      }
    }
    return;
  }

  async request(
    payload: PayloadType,
    timeout = ACKNOWLEDGEMENT_TIMEOUT,
    codec = this.codec,
  ): Promise<boolean> {
    this.logger.verbose('message publish start');
    await this.checkForConsumerStatus();
    const runner = new RetryRunner(
      () => this.internalRequest(payload, timeout, codec),
      3,
    );
    try {
      await runner.run();
      this.logger.verbose('message published successfully');
      return true;
    } catch (e) {
      console.warn(e);
      this.logger.error('publish failed!', { error: (e as Error).toString() });
      return false;
    }
  }

  stop() {
    if (this.subscriptionForConsumer) {
      this.subscriptionForConsumer.unsubscribe();
    }
    this.logger.debug('stopped');
  }

  getSubject() {
    return this.subject;
  }
}
