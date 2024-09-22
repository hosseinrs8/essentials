import { Container, Logger, LogService } from '@essentials/common';
import { RedisClientType } from './redis.factory';

export enum RedisMonitoringMode {
  all = 1,
  pattern,
  lookup,
  alive,
}

export type RedisMonitoringOptions = {
  mode: RedisMonitoringMode;
  period?: number;
  keys?: Array<string>;
  pattern?: string;
  keepAlive?: boolean;
};

const KEEP_ALIVE_KEY = `redis_monitoring_keep_alive_key`;

export class RedisMonitoring {
  private readonly logger: Logger;
  private readonly period: number;
  private readonly pattern: string;
  private readonly mode: RedisMonitoringMode;

  private lookupKeys: Array<string>;

  constructor(
    private readonly identity: string,
    private readonly client: RedisClientType,
    private readonly options: RedisMonitoringOptions,
  ) {
    this.logger = Container.get(LogService).createServiceLogger(
      this.constructor.name,
    );

    this.logger.debug('constructed monitoring service', { options });
    this.mode = options.mode;
    this.lookupKeys = options?.keys || [];
    this.pattern = options?.pattern || '*';
    this.period = options?.period || 5 * 60;

    this.interval();
  }

  pushLookup(key: string) {
    this.lookupKeys.push(key);
  }

  omitLookup(key: string) {
    this.lookupKeys = this.lookupKeys.filter((lk) => lk !== key);
  }

  private interval() {
    if (this.mode === RedisMonitoringMode.alive)
      setInterval(() => this.keepAlive(), 60_000);
    else {
      if (this.options.keepAlive) setInterval(() => this.keepAlive(), 60_000);
      setInterval(() => this.monitor(), this.period * 1000);
    }
  }

  private async keepAlive() {
    const now = Date.now();
    this.logger.silly('RedisKeepAlive', { identity: this.identity, time: now });
    try {
      await this.client.set(KEEP_ALIVE_KEY, `${now}`);
      const val = await this.client.get(KEEP_ALIVE_KEY);
      if (val) {
        this.logger.silly(`redis keepAlive at ${val}`);
      }
    } catch (e) {
      this.logger.error('redis keepAlive failed', { error: e });
    }
  }

  private async monitor() {
    const keys =
      this.mode === RedisMonitoringMode.lookup
        ? this.lookupKeys
        : await this.client.keys(this.pattern);
    this.logger.debug('monitoring redis values on keys', { keys });
    for (const key of keys) {
      const value = await this.client
        .get(key)
        .catch(() => this.client.sMembers(key));
      if (value !== null)
        try {
          this.logger.debug('read redis value', {
            key,
            value: Array.isArray(value)
              ? value.map((v) => JSON.parse(v))
              : JSON.parse(value),
          });
        } catch (err) {
          this.logger.debug('read redis value', {
            key,
            value,
          });
        }
    }
  }
}
