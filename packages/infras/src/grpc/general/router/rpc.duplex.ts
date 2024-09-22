import { RPCTransferEvent } from '../services/events.service';
import { ServerDuplexStream } from '@grpc/grpc-js/build/src/server-call';
import { RpcDuplex } from '../../base/router/entities/rpc.duplex';
import { Router } from '../../base/router/router';
import { UnprocessableEntity } from '@essentials/errors';

export class RpcGeneralDuplex extends RpcDuplex<RPCTransferEvent> {
  i = 0;
  data: any;
  handler: any;

  constructor(call: ServerDuplexStream<RPCTransferEvent, RPCTransferEvent>) {
    super(call);
    call.on('data', (data: any) => {
      this.i++;
      this.data = new RPCTransferEvent(data.subject, data.payload, data.reply);
      if (this.i >= 5) {
        this.route();
        this.i = 0;
      }
    });
    call.on('error', (e: any) => {
      this.logger.error('error on duplex stream', { e });
    });
    call.on('end', () => {
      this.end();
    });
    call.on('finish', () => {
      this.logger.debug('response duplex stream ended', { call });
    });
  }

  async route() {
    try {
      this.logger.debug('route rpc stream');
      this.pickHandler();
      this.handler(this.data.parsedPayload(), this);
    } catch (e: any) {
      this.logger.error('error on routing ', { e });
      return;
    }
  }

  protected pickHandler(): void {
    const handler = Router.duplexHandlers.get(this.data.subject);
    if (!handler) {
      this.logger.error('no handler registered for subject');
      throw new UnprocessableEntity('NoHandlerRegistered');
    }
    this.handler = handler;
  }
}
