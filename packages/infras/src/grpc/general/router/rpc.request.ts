import { RPCTransferEvent } from '../services/events.service';
import { Router } from '../../base/router/router';
import { UnprocessableEntity } from '@essentials/errors';
import { RpcRequest } from '../../base/router/entities/rpc.request';

export class RpcGeneralRequest extends RpcRequest<RPCTransferEvent> {
  constructor() {
    super();
  }

  static route(req: RPCTransferEvent) {
    return new RpcGeneralRequest().route(req);
  }

  route(req: RPCTransferEvent) {
    this.logger.debug('route rpc event', { subject: req.subject });
    this.data = req;
    this.pickHandler();
    return this.handler(req.parsedPayload());
  }

  pickHandler(): void {
    const handler = Router.requestHandlers.get(this.data.subject);
    if (!handler) {
      this.logger.error('no handler registered for subject', {
        subject: this.data.subject,
      });
      throw new UnprocessableEntity('NoHandlerRegistered');
    }
    this.handler = handler;
  }
}
