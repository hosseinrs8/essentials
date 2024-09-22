import { RedisFactory } from '../redis/redis.factory';
import { ConfigService, Container, Service } from '@essentials/common';
import {
  BeeQueueConfig,
  BeeQueueIdentityInterface,
} from './bee-queue-identity.interface';
import BeeQueue from 'bee-queue';

export const QUEUE_IDENTITY_CONFIG_PREFIX = 'bee-queue-identity-';

@Service()
export class BeeQueueFactory extends RedisFactory {
  private readonly queueConfigCache = new Map<string, BeeQueueConfig>();

  constructor() {
    super(Container.get(ConfigService));
  }

  private loadBeeQueueIdentity(
    identityName: string,
  ): BeeQueueIdentityInterface {
    this.logger.debug('load beeQueue identity', { identityName });
    const identity = this.configService.get<BeeQueueIdentityInterface>(
      QUEUE_IDENTITY_CONFIG_PREFIX + identityName,
    );
    this.logger.info('identity successfully loaded', { identity });
    return identity;
  }

  private generateBeeQueueConfig(identityName: string): BeeQueueConfig {
    this.logger.debug('generate beeQueue config');
    const cachedConfig = this.queueConfigCache.get(identityName);
    if (cachedConfig) {
      return cachedConfig;
    }
    const identity = this.loadBeeQueueIdentity(identityName);
    const config: BeeQueueConfig = {};
    config.prefix = identity.prefix;
    config.stallInterval = identity.stallInterval;
    config.nearTermWindow = identity.nearTermWindow;
    config.delayedDebounce = identity.delayedDebounce;
    config.redis = this.loadConfig('export-queue');
    config.isWorker = identity.isWorker;
    config.getEvents = identity.getEvents;
    config.sendEvents = identity.sendEvents;
    config.storeJobs = identity.storeJobs;
    config.ensureScripts = identity.ensureScripts;
    config.activateDelayedJobs = identity.activateDelayedJobs;
    config.removeOnSuccess = identity.removeOnSuccess;
    config.removeOnFailure = identity.removeOnFailure;
    config.quitCommandClient = identity.quitCommandClient;
    config.redisScanCount = identity.redisScanCount;
    this.queueConfigCache.set(identityName, config);
    return config;
  }

  createQueue<T>(name: string, identityName: string): BeeQueue<T> {
    this.logger.debug('create', { identityName, name });
    const config = this.generateBeeQueueConfig(identityName);
    const queue = new BeeQueue<T>(name, config);
    this.logger.info('queue successfully created', { identityName });
    return queue;
  }
}
