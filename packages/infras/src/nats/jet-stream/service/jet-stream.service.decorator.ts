import { NatsCodecType } from '../../nats-service.decorator';

export function OnJetStreamMsg(
  subject: string,
  config?: { codec?: NatsCodecType; queue?: string },
): MethodDecorator {
  return function (target, propertyKey) {
    Reflect.defineMetadata('jet-stream.subject', subject, target, propertyKey);
    Reflect.defineMetadata(
      'jet-stream.codec',
      config?.codec ?? NatsCodecType.jsonCodec,
      target,
      propertyKey,
    );
    if (config?.queue)
      Reflect.defineMetadata(
        'jet-stream.queue',
        config.queue,
        target,
        propertyKey,
      );
  };
}
