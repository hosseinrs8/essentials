import { JetStreamClient } from '../client/jet-stream.client';
import { decode, encode } from '@msgpack/msgpack';
import { Container } from '@essentials/common';
import { JetStreamFactory } from '../jet-stream.factory';
import { DiscardPolicy } from 'nats';

export class Publisher {
  private client: JetStreamClient;

  async boot() {
    this.client = await Container.get(JetStreamFactory).boot('general', {
      discard: DiscardPolicy.Old,
      max_age: 100_000_000,
    });
  }

  publish() {
    return this.client.publish(
      'test-sub',
      {
        name: 'Armold Schwartzemi',
      },
      { codec: { encode, decode } },
    );
  }

  static async run() {
    console.log('running publisher...');
    const publisher = new Publisher();
    await publisher.boot();
    // return setInterval(() => publisher.publish(), 200);
    return publisher.publish();
  }
}

Publisher.run();
