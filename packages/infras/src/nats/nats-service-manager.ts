import {
  Codec,
  JSONCodec,
  Msg,
  MsgHdrs,
  NatsConnection,
  NatsError,
} from 'nats';
import { Container, Logger, LogService } from '@essentials/common';
import { NatsClient, NatsFactory } from './nats.factory';
import { NatsSubscriber } from './nats-acknowledge';
import { decode, encode } from '@msgpack/msgpack';
import { NatsCodecType } from './nats-service.decorator';

export declare type ControllerType<T = any> = new (...args: any[]) => T;

export const NatsCodec = {
  1: { ...JSONCodec(), type: NatsCodecType.jsonCodec },
  2: { encode, decode, type: NatsCodecType.msgpack },
};
function parseHeaders(headers?: MsgHdrs): Record<string, string> {
  const result: Record<string, string> = {};
  if (headers) {
    const keys = headers.keys();
    for (const key of keys) {
      result[key] = headers.get(key);
    }
  }
  return result;
}

function eventWrapper(
  callback: (
    request: any,
    headers: Record<string, string>,
    msg: Msg,
    ackHandler?: () => void,
  ) => Promise<any>,
  codec: Codec<any> & { type: NatsCodecType },
  bufferMode = false,
  ackHandler?: () => void,
) {
  return async (err: NatsError | null, msg: Msg) => {
    if (!err) {
      let event;
      if (bufferMode) {
        event = Buffer.from(msg.data);
      } else {
        try {
          event =
            codec.type === NatsCodecType.msgpack
              ? codec.decode(Buffer.from(msg.data))
              : codec.decode(msg.data);
        } catch (e) {
          console.error(
            'data is not a valid JSON',
            (e as Error).message,
            msg.data,
          );
          event = msg.data;
        }
      }
      try {
        await callback(
          event._payload ?? event,
          parseHeaders(msg.headers),
          msg,
          ackHandler,
        );
      } catch (e) {
        console.error('nats error', e);
      }
    } else {
      console.error('nats error', err);
    }
  };
}

function requestWrapper(
  callback: (
    request: any,
    headers: Record<string, string>,
    msg: Msg,
  ) => Promise<any>,
  codec: Codec<any> & { type: NatsCodecType },
  bufferMode = false,
) {
  return async (err: NatsError | null, msg: Msg) => {
    if (!err) {
      let event;
      if (bufferMode) {
        event = Buffer.from(msg.data);
      } else {
        event =
          codec.type === NatsCodecType.msgpack
            ? codec.decode(Buffer.from(msg.data))
            : codec.decode(msg.data);
      }
      try {
        const result = await callback(
          event._payload ?? event,
          parseHeaders(msg.headers),
          msg,
        );
        msg.respond(codec.encode(result));
      } catch (e) {
        console.error('nats error', e);
      }
    } else {
      console.error('nats error', err);
    }
  };
}

interface MethodConfig {
  subject: string;
  identityName: string;
  hasResponse: boolean;
  queue: string;
  sync: boolean;
  bufferMode: boolean;
  autoAcknowledge: boolean;
  codecType: NatsCodecType;
}

export class NatsServiceManager {
  protected clients: Map<string, NatsClient> = new Map();
  protected connections: Map<string, NatsConnection> = new Map();
  protected logger: Logger;

  protected static getMethods<T>(obj: T): Array<string> {
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

  constructor(protected readonly natsFactory: NatsFactory) {
    this.logger = Container.get(LogService).createServiceLogger(
      this.constructor.name,
    );
  }

  protected getMetadata(instance: any, methodName: string): MethodConfig {
    const subject = Reflect.getMetadata('nats.subject', instance, methodName);
    const identityName = Reflect.getMetadata(
      'nats.identityName',
      instance,
      methodName,
    );
    const hasResponse = Reflect.getMetadata(
      'nats.hasResponse',
      instance,
      methodName,
    );
    const queue = Reflect.getMetadata('nats.queue', instance, methodName);
    const sync = Reflect.getMetadata('nats.sync', instance, methodName);
    const autoAcknowledge = Reflect.getMetadata(
      'nats.autoAcknowledge',
      instance,
      methodName,
    );
    const bufferMode = Reflect.getMetadata(
      'nats.bufferMode',
      instance,
      methodName,
    );
    const codec = Reflect.getMetadata('nats.codec', instance, methodName);
    return {
      subject,
      identityName,
      hasResponse,
      queue,
      sync,
      bufferMode,
      autoAcknowledge,
      codecType: codec,
    };
  }

  protected setSyncMode(
    connection: NatsConnection,
    callback: any,
    config: MethodConfig,
  ) {
    const {
      subject,
      hasResponse,
      queue,
      bufferMode,
      autoAcknowledge,
      codecType,
    } = config;
    const codec = NatsCodec[codecType];
    setImmediate(async () => {
      if (connection) {
        const subscriber = new NatsSubscriber(connection, subject, queue);
        this.logger.debug('subscribe subject', config);
        try {
          for await (const message of subscriber.manualSubscription()) {
            try {
              const ackHandler = () =>
                subscriber.manualAcknowledge(message, codec);
              if (hasResponse) {
                await requestWrapper(callback, codec, bufferMode).call(
                  this,
                  null,
                  message as Msg,
                );
              } else {
                await eventWrapper(
                  callback,
                  codec,
                  bufferMode,
                  ackHandler,
                ).call(this, null, message as Msg);
              }
              if (autoAcknowledge) {
                ackHandler();
              }
            } catch (err) {
              console.error('NatsError', err);
              (message as Msg).respond(
                codec.encode({ message: 'NatsError', error: err }),
              );
            }
          }
        } catch (e) {
          this.logger.error(`nats error`, { error: e });
          console.log('nats error', e);
        }
      } else {
        this.logger.error(`connection not found`);
        throw new Error('connection not found!');
      }
    });
  }

  protected setAsyncMode(
    connection: NatsClient,
    callback: any,
    config: MethodConfig,
  ) {
    const codec = NatsCodec[config.codecType];
    connection.subscribe(config.subject, {
      queue: config.queue,
      callback: config.hasResponse
        ? requestWrapper(callback, codec, config.bufferMode)
        : eventWrapper(callback, codec, config.bufferMode, undefined),
    });
  }

  protected async processMethods(
    instance: any,
    methodName: string,
    defaultIdentityName: string,
  ) {
    const config = this.getMetadata(instance, methodName);
    const { subject, identityName, sync } = config;
    const identityNameNats = identityName || defaultIdentityName;
    if (subject) {
      const callback = instance[methodName].bind(instance);
      if (sync) {
        let connection = this.connections.get(identityNameNats);
        if (!connection) {
          connection = await this.natsFactory.create(identityNameNats);
          this.connections.set(identityNameNats, connection);
        }
        this.setSyncMode(connection, callback, config);
      } else {
        let client = this.clients.get(identityNameNats);
        if (!client) {
          client = await this.natsFactory.createClient(identityNameNats);
          this.clients.set(identityNameNats, client);
        }
        this.setAsyncMode(client, callback, config);
        this.logger.debug('subscribe subject', config);
      }
    }
  }

  protected async processControllers(
    controller: ControllerType<any>,
    defaultIdentityName: string,
  ) {
    const instance = Container.get(controller);
    this.logger.debug(`calling NatsServiceManager.getMethods`, {
      instance: instance.constructor.name,
    });
    const methods = NatsServiceManager.getMethods(instance);
    for (const methodName of methods) {
      await this.processMethods(instance, methodName, defaultIdentityName);
    }
  }

  async boot(defaultIdentityName: string, controllers: Array<ControllerType>) {
    this.logger.debug('boot', {
      defaultIdentityName: defaultIdentityName,
    });
    for (const controller of controllers) {
      await this.processControllers(controller, defaultIdentityName);
    }
  }

  close() {
    this.logger.debug('close all nats connection');
    return Promise.all([...this.clients.values()].map((r) => r.close()));
  }

  static create() {
    return new NatsServiceManager(Container.get(NatsFactory));
  }
}
