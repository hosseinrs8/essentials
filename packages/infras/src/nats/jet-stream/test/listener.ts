import { OnJetStreamMsg } from '../service/jet-stream.service.decorator';
import { DiscardPolicy, JsMsg } from 'nats';
import { JetStreamServiceManager } from '../service/jet-stream.service.manager';
import { Service } from '@essentials/common';
import { NatsCodecType } from '../../nats-service.decorator';

@Service()
export class Listener {
  @OnJetStreamMsg('test-sub', { codec: NatsCodecType.msgpack })
  listen(data: any, msg: JsMsg) {
    console.log('got test-sub');
    console.dir(data, { depth: 10 });
    msg.ack();
    // console.dir(msg, { depth: 10 });
  }

  static async run() {
    console.log('running test ...');
    await JetStreamServiceManager.create().boot('general', [Listener], {
      discard: DiscardPolicy.Old,
      max_age: 100_000_000,
    });
    console.log('service created');
  }
}

Listener.run();
