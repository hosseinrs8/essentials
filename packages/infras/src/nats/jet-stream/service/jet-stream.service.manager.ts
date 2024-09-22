import { Container, Logger, LogService } from '@essentials/common';
import { NatsFactory } from '../../nats.factory';
import { ControllerType, NatsCodec } from '../../nats-service-manager';
import { NatsCodecType } from '../../nats-service.decorator';
import { JetStreamFactory } from '../jet-stream.factory';
import { JetStreamClient, JetStreamOptions } from '../client/jet-stream.client';
import { JetStreamUtility } from '../client/jet-stream.utility';
import { randomUUID } from 'crypto';

interface MethodConfig {
  subject: string;
  codecType: NatsCodecType;
  queue?: string;
}

export class JetStreamServiceManager {
  protected readonly logger: Logger;
  protected readonly clients: Map<string, JetStreamClient>;

  constructor(
    private readonly factory: JetStreamFactory,
    private readonly natsFactory: NatsFactory,
  ) {
    this.clients = new Map();
    this.logger = Container.get(LogService).createServiceLogger(
      this.constructor.name,
    );
  }

  protected async processControllers(
    controller: ControllerType<any>,
    identity: string,
    options?: JetStreamOptions,
  ) {
    const instance = Container.get(controller);
    this.logger.debug(`calling jetStream service manager getMethods`, {
      instance: instance.constructor.name,
    });
    const methods = this.getMethods(instance);
    for (const methodName of methods) {
      await this.processMethods(instance, methodName, identity, options);
    }
  }

  protected async processMethods(
    instance: any,
    methodName: string,
    identity: string,
    options?: JetStreamOptions,
  ) {
    const config = this.getMetadata(instance, methodName);
    if (config.subject) {
      const callback = instance[methodName].bind(instance);
      let client = this.clients.get(identity);
      if (!client) {
        client = await this.factory.boot(
          identity,
          options,
          await this.natsFactory.create(identity),
          true,
        );
        this.clients.set(identity, client);
      }
      this.setCallback(client, callback, config, options);
    }
  }

  protected setCallback(
    client: JetStreamClient,
    callback: any,
    config: MethodConfig,
    options?: JetStreamOptions,
  ) {
    const { subject, codecType, queue } = config;
    const codec = NatsCodec[codecType];
    setImmediate(async () => {
      const stream = await JetStreamUtility.createOrUpdateStream(
        client.manager,
        {
          ...options,
          subjects: [subject],
          name: subject,
        },
      );
      const consumerName = [subject, randomUUID()].join('-');
      const consumer = await JetStreamUtility.createOrUpdateConsumer(
        client.manager,
        subject,
        {
          ...options,
          name: consumerName,
        },
      );
      const messages = await consumer.consume();
      for await (const message of messages) {
        if (queue) {
          const consumers = await client.manager.consumers
            .list(stream.name)
            .next();
          if (consumers[message.seq % consumers.length].name !== consumerName)
            continue;
        }
        message.ack();
        callback(codec.decode(message.data), message);
      }
    });
  }

  protected getMethods<T>(obj: T): Array<string> {
    this.logger.debug('getMethods');
    const properties = new Set();
    let currentObj = obj;
    do {
      Object.getOwnPropertyNames(currentObj).forEach((item) =>
        properties.add(item),
      );
    } while ((currentObj = Object.getPrototypeOf(currentObj)));
    return ([...properties.keys()] as Array<string>).filter(
      (item) => typeof (obj as any)[item] === 'function',
    );
  }

  protected getMetadata(instance: any, methodName: string): MethodConfig {
    const subject = Reflect.getMetadata(
      'jet-stream.subject',
      instance,
      methodName,
    );
    const codec = Reflect.getMetadata('jet-stream.codec', instance, methodName);
    const queue = Reflect.getMetadata('jet-stream.queue', instance, methodName);
    return { subject, codecType: codec, queue };
  }

  async boot(
    identity: string,
    controllers: Array<ControllerType>,
    options?: JetStreamOptions,
  ) {
    this.logger.debug('boot jetStream', { identity });
    for (const controller of controllers) {
      await this.processControllers(controller, identity, options);
    }
  }

  static create() {
    return new JetStreamServiceManager(
      Container.get(JetStreamFactory),
      Container.get(NatsFactory),
    );
  }
}
