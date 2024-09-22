import { RPCTransferEvent } from '../services/events.service';
import { Router } from '../../base/router/router';
import { UnprocessableEntity } from '@essentials/errors';
import { ServerWritableStream } from '@grpc/grpc-js';
import { RPCStream } from '../../base/router/entities/rpc.stream';

export class RpcGeneralStream extends RPCStream<RPCTransferEvent> {
  constructor(
    data: RPCTransferEvent,
    stream: ServerWritableStream<RPCTransferEvent, RPCTransferEvent>,
  ) {
    super(data, stream);
  }

  async route() {
    try {
      this.logger.debug('route rpc stream');
      this.pickHandler();
      this.handler(this.data.parsedPayload(), this).then();
    } catch (e: any) {
      this.logger.error('error on routing ', { e });
      return;
    }
  }

  end() {
    this.logger.debug('end rpc stream', { data: this.data });
    return this.stream.end();
  }

  protected pickHandler(): void {
    const handler = Router.streamHandlers.get(this.data.subject);
    if (!handler) {
      this.logger.error('no handler registered for subject', {
        subject: this.data.subject,
      });
      throw new UnprocessableEntity('NoHandlerRegistered');
    }
    this.handler = handler;
  }
}
