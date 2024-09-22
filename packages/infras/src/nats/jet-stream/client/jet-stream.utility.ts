import { Consumer, JetStreamManager, NatsError, Stream } from 'nats';
import { StreamConfig } from 'nats/lib/jetstream/jsapi_types';
import { UnprocessableEntity } from '@essentials/errors';

export class JetStreamUtility {
  static async createOrUpdateStream(
    manager: JetStreamManager,
    config: Partial<StreamConfig> & { name: string },
  ): Promise<Stream> {
    try {
      await manager.streams.add(config);
    } catch (e) {
      if (e instanceof NatsError && e.code === '400') {
        await manager.streams.update(config.name, config);
      } else throw new UnprocessableEntity(e);
    }
    return manager.streams.get(config.name);
  }

  static async createOrUpdateConsumer(
    manager: JetStreamManager,
    stream: string,
    config: Partial<StreamConfig> & { name: string },
  ): Promise<Consumer> {
    try {
      await manager.consumers.add(stream, config);
    } catch (e) {
      if (e instanceof NatsError && e.code === '400') {
        await manager.consumers.update(stream, config.name, config);
      } else throw new UnprocessableEntity(e);
    }
    return manager.streams.get(stream).then((s) => s.getConsumer(config.name));
  }
}
