import { Service } from '@essentials/common';
import {
  Metadata,
  sendUnaryData,
  ServerUnaryCall,
  ServiceError,
  ServerWritableStream,
  ServerDuplexStream,
} from '@grpc/grpc-js';
import { RPCTransferEvent, EventAcknowledge } from '../services/events.service';
import { Status } from '@grpc/grpc-js/build/src/constants';
import { RpcGeneralRequest } from '../router/rpc.request';
import { RpcGeneralEvent } from '../router/rpc.event';
import { RpcGeneralStream } from '../router/rpc.stream';
import { RpcGeneralDuplex } from '../router/rpc.duplex';
import { GrpcServer } from '../../base/core/grpc-server';

@Service()
export class GrpcGeneralServer extends GrpcServer<
  RPCTransferEvent,
  EventAcknowledge
> {
  constructor() {
    super();
  }

  handleStream(call: ServerWritableStream<RPCTransferEvent, RPCTransferEvent>) {
    const { request } = call;
    this.logger.debug('handle stream', { sub: request.subject });
    call.on('error', (error) => {
      this.logger.error('stream error', { sub: request.subject, error });
    });
    call.on('end', () => {
      this.logger.silly('stream end', { sub: request.subject });
    });
    return new RpcGeneralStream(
      new RPCTransferEvent(request.subject, request.payload, request.reply),
      call,
    ).route();
  }

  handleDuplex(
    call: ServerDuplexStream<RPCTransferEvent, RPCTransferEvent>,
  ): void {
    this.logger.debug('handle duplex');
    new RpcGeneralDuplex(call);
  }

  handle(
    call: ServerUnaryCall<RPCTransferEvent, EventAcknowledge>,
    callback: sendUnaryData<EventAcknowledge>,
  ): void {
    let { request } = call;
    request = new RPCTransferEvent(
      request.subject,
      request.payload,
      request.reply,
    );
    this.logger.debug('handle gRPC event', { event: request });
    if (request.reply) {
      this.handleRequest(request)
        .then((res) => callback(null, new EventAcknowledge(request, res)))
        .catch((e) => {
          this.logger.error('error in gRPC request handling', { error: e });
          const error = this.constructError(e);
          return callback(
            error,
            new EventAcknowledge(request, undefined, error),
          );
        });
      return;
    }
    this.handleEvent(request).catch((e) => {
      this.logger.error('error in gRPC event handling', { error: e });
      const error = this.constructError(e);
      return callback(error, new EventAcknowledge(request, undefined, error));
    });
    return callback(null, new EventAcknowledge(request, { time: Date.now() }));
  }

  handleRequest(request: RPCTransferEvent): Promise<any> {
    this.logger.debug('handle gRPC request', { request });
    return Promise.resolve(RpcGeneralRequest.route(request));
  }

  handleEvent(request: RPCTransferEvent): Promise<any> {
    this.logger.debug('handle gRPC event', { request });
    return Promise.resolve(RpcGeneralEvent.route(request));
  }

  constructError(e: unknown): ServiceError {
    return {
      ...(e as Error),
      code: Status.UNKNOWN,
      details: '',
      metadata: new Metadata(),
    };
  }
}
