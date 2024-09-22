import { RedisClientOptions } from '@redis/client';

export interface BeeQueueIdentityInterface {
  prefix?: string;
  stallInterval?: number;
  nearTermWindow?: number;
  delayedDebounce?: number;
  isWorker?: boolean;
  getEvents?: boolean;
  sendEvents?: boolean;
  storeJobs?: boolean;
  ensureScripts?: boolean;
  activateDelayedJobs?: boolean;
  removeOnSuccess?: boolean;
  removeOnFailure?: boolean;
  quitCommandClient?: boolean;
  redisScanCount?: number;
}

export interface BeeQueueConfig {
  prefix?: string;
  stallInterval?: number;
  nearTermWindow?: number;
  delayedDebounce?: number;
  redis?: RedisClientOptions;
  isWorker?: boolean;
  getEvents?: boolean;
  sendEvents?: boolean;
  storeJobs?: boolean;
  ensureScripts?: boolean;
  activateDelayedJobs?: boolean;
  removeOnSuccess?: boolean;
  removeOnFailure?: boolean;
  quitCommandClient?: boolean;
  redisScanCount?: number;
}
