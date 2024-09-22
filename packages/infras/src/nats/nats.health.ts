import { InterfaceHealth } from '../interface.health';
import { NatsConnection } from 'nats';

export class NatsHealth extends InterfaceHealth<NatsConnection> {
  check(client: NatsConnection): Promise<boolean> {
    return Promise.resolve(!client.isClosed());
  }
}
