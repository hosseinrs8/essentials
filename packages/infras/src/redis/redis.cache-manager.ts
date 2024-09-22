import {
  BootableInterface,
  Container,
  Logger,
  LogService,
} from '@essentials/common';
import { RedisClientType, RedisFactory } from './redis.factory';
import { RedisMonitoringOptions } from './redis-monitoring.service';
import { RedisClientOptions } from '@redis/client';

export abstract class RedisCacheManager implements BootableInterface {
  protected cache: RedisClientType;
  protected logger: Logger;

  protected constructor(
    protected readonly identity: string,
    protected readonly prefix = '',
    protected readonly monitoringOptions?: RedisMonitoringOptions,
    protected readonly advanceOptions?: RedisClientOptions,
  ) {
    this.logger = Container.get(LogService).createServiceLogger(
      this.constructor.name,
    );
  }

  async set<T = string>(key: string, value: T): Promise<boolean> {
    this.logger.debug('cache set item', { key, value });
    try {
      typeof value !== 'string'
        ? await this.cache.set(this.prefix + key, JSON.stringify(value))
        : await this.cache.set(this.prefix + key, value);
      return true;
    } catch (e) {
      this.logger.error('error in cache set item', { error: e });
      return false;
    }
  }

  async setMembers<T = string>(
    key: string,
    value: Array<T> | T,
  ): Promise<boolean> {
    try {
      const valueSet = new Set<string>();
      if (Array.isArray(value)) {
        value.map((v) =>
          typeof v === 'string'
            ? valueSet.add(v)
            : valueSet.add(JSON.stringify(v)),
        );
      } else
        typeof value === 'string'
          ? valueSet.add(value)
          : valueSet.add(JSON.stringify(value));
      await this.cache.sAdd(this.prefix + key, Array.from(valueSet));
      return true;
    } catch (e) {
      this.logger.error('error in cache set members', { error: e });
      return false;
    }
  }

  async delete(key: string): Promise<boolean> {
    this.logger.debug('cache delete item');
    try {
      await this.cache.del(this.prefix + key);
      return true;
    } catch (e) {
      this.logger.error('error in cache delete item', { error: e });
      return false;
    }
  }

  async deleteMember<T = string>(key: string, value: T): Promise<boolean> {
    this.logger.debug('cache delete member');
    try {
      const val = typeof value === 'string' ? value : JSON.stringify(value);
      await this.cache.sRem(this.prefix + key, val);
      return true;
    } catch (e) {
      this.logger.error('error in cache delete member', { error: e });
      return false;
    }
  }

  getItem<T = string>(key: string): Promise<T> {
    return this.cache.get(this.prefix + key).then((r) => {
      try {
        return JSON.parse(r || 'null');
      } catch (e) {
        return r;
      }
    });
  }

  getMembers<T = string>(key: string): Promise<Array<T>> {
    return this.cache.sMembers(this.prefix + key).then((r) =>
      r.map((item) => {
        try {
          return JSON.parse(item) as T;
        } catch (e) {
          return item as T;
        }
      }),
    );
  }

  getCache() {
    return this.cache;
  }

  async boot() {
    this.cache = await Container.get(RedisFactory).create(
      this.identity,
      this.advanceOptions,
      this.monitoringOptions,
    );
  }

  abstract refresh(): Promise<boolean | void>;
}