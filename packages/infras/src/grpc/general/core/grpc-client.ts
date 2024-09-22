import { GrpcClient } from '../../base/core/grpc-client';
import { EventAcknowledge, RPCTransferEvent } from '../services/events.service';

export class GrpcGeneralClient extends GrpcClient<any, any, any> {
  constructor() {
    super();
  }

  publish(request: RPCTransferEvent): Promise<EventAcknowledge> {
    return new Promise((resolve, reject) => {
      this.client.handle(request, (error: any, response: RPCTransferEvent) => {
        if (error) {
          this.logger.error('error from grpc server', { error });
          reject(error);
        } else {
          this.logger.debug('received grpc server acknowledge', { response });
          resolve(new EventAcknowledge(response));
        }
      });
    });
  }

  publishDuplex() {
    this.logger.debug('create client handle duplex');
    return this.client.handleDuplex() as any;
  }

  requestStream(request: RPCTransferEvent) {
    this.logger.debug('create client handle stream', { request });
    return this.client.handleStream(request) as any;
  }
}
