export enum NatsCodecType {
  jsonCodec = 1,
  msgpack,
}

export interface NatsServiceConfig {
  identityName?: string;
  queue?: string;
  sync?: boolean;
  bufferMode?: boolean;
  autoAcknowledge?: boolean;
  codec?: NatsCodecType;
}

export function OnNatsEvent(
  subject: string,
  config: NatsServiceConfig = {},
): MethodDecorator {
  return function (target, propertyKey) {
    Reflect.defineMetadata('nats.subject', subject, target, propertyKey);
    Reflect.defineMetadata('nats.hasResponse', false, target, propertyKey);
    Reflect.defineMetadata(
      'nats.sync',
      config.sync !== false,
      target,
      propertyKey,
    );
    Reflect.defineMetadata(
      'nats.bufferMode',
      config.bufferMode === true,
      target,
      propertyKey,
    );
    Reflect.defineMetadata(
      'nats.autoAcknowledge',
      config.autoAcknowledge !== false,
      target,
      propertyKey,
    );
    Reflect.defineMetadata(
      'nats.codec',
      config.codec ?? NatsCodecType.jsonCodec,
      target,
      propertyKey,
    );
    if (config.queue) {
      Reflect.defineMetadata('nats.queue', config.queue, target, propertyKey);
    }
    if (config.identityName) {
      Reflect.defineMetadata(
        'nats.identityName',
        config.identityName,
        target,
        propertyKey,
      );
    }
  };
}

export function OnNatsRequest(
  subject: string,
  config: Omit<NatsServiceConfig, 'autoAcknowledge'> = {},
): MethodDecorator {
  return function (target, propertyKey) {
    Reflect.defineMetadata('nats.subject', subject, target, propertyKey);
    Reflect.defineMetadata('nats.hasResponse', true, target, propertyKey);
    Reflect.defineMetadata(
      'nats.sync',
      config.sync !== false,
      target,
      propertyKey,
    );
    Reflect.defineMetadata(
      'nats.bufferMode',
      config.bufferMode === true,
      target,
      propertyKey,
    );
    Reflect.defineMetadata('nats.autoAcknowledge', true, target, propertyKey);
    Reflect.defineMetadata(
      'nats.codec',
      config.codec ?? NatsCodecType.jsonCodec,
      target,
      propertyKey,
    );
    if (config.queue) {
      Reflect.defineMetadata('nats.queue', config.queue, target, propertyKey);
    }
    if (config.identityName) {
      Reflect.defineMetadata(
        'nats.identityName',
        config.identityName,
        target,
        propertyKey,
      );
    }
  };
}
