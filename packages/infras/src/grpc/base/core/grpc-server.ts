import { ConfigService, Container, Logger, LogService } from '@essentials/common';
import {
  Metadata,
  sendUnaryData,
  Server,
  ServerUnaryCall,
  ServiceError,
  ServerWritableStream,
  ServerDuplexStream,
} from '@grpc/grpc-js';
import { Status } from '@grpc/grpc-js/build/src/constants';
import { GRPCIdentity } from '../interfaces/grpc-identity';

export abstract class GrpcServer<T = any, R = any> {
  private server: Server;

  get raw(): Server {
    return this.server;
  }

  set raw(value: Server) {
    this.server = value;
  }

  protected logger: Logger;

  protected constructor() {
    this.logger = Container.get(LogService).createServiceLogger(
      this.constructor.name,
    );
  }

  abstract handleStream?(call: ServerWritableStream<T, T>): void;

  abstract handleDuplex?(call: ServerDuplexStream<T, T>): void;

  abstract handle?(
    call: ServerUnaryCall<T, R>,
    callback: sendUnaryData<R>,
  ): void;

  constructError(e: unknown): ServiceError {
    return {
      ...(e as Error),
      code: Status.UNKNOWN,
      details: '',
      metadata: new Metadata(),
    };
  }
}
