import { InterfaceHealth } from '@essentials/infras/lib/interface.health';
import { NatsFactory, PostgresFactory, RedisFactory } from '@essentials/infras';

function getRedisHealth(): null | InterfaceHealth<any> {
  try {
    const health = RedisFactory.health;
    if (health) {
      return health;
    }
  } catch (e) {
    return null;
  }
  return null;
}

function getNatsHealth(): null | InterfaceHealth<any> {
  try {
    const health = NatsFactory.health;
    if (health) {
      return health;
    }
  } catch (e) {
    return null;
  }
  return null;
}

function getPostgresHealth(): null | InterfaceHealth<any> {
  try {
    const health = PostgresFactory.health;
    if (health) {
      return health;
    }
  } catch (e) {
    return null;
  }
  return null;
}

const services: Array<InterfaceHealth<any>> = [];

export function bootHealth() {
  if (services.length === 0) {
    const redis = getRedisHealth();
    if (redis) {
      services.push(redis);
    }
    const nats = getNatsHealth();
    if (nats) {
      services.push(nats);
    }
    const postgres = getPostgresHealth();
    if (postgres) {
      services.push(postgres);
    }
  }
}

export async function isHealthy() {
  const requests = await Promise.all(services.map((s) => s.isHealthy()));
  for (const request of requests) {
    if (request === false) {
      return false;
    }
  }
  return true;
}
