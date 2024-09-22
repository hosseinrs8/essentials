import { InterfaceHealth } from '../interface.health';
import { RedisClientType } from './redis.factory';

export class RedisHealth extends InterfaceHealth<[boolean, RedisClientType]> {
  check([legacyMode, client]: [boolean, RedisClientType]): Promise<boolean> {
    if (client.isOpen) {
      if (!legacyMode) {
        return client.ping().then((r) => r === 'PONG');
      } else {
        return new Promise((resolve, reject) => {
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          client.ping((err, result) => {
            if (err) reject(err);
            resolve(result === 'PONG');
          });
        });
      }
    } else return Promise.resolve(false);
  }
}
