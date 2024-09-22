import { Container, Logger, LogService } from '@essentials/common';
import { RouterHandler } from '../router';
import { Metadata } from '@grpc/grpc-js';
import { ServerDuplexStream } from '@grpc/grpc-js/build/src/server-call';

export abstract class RpcDuplex<T> {
  protected readonly logger: Logger;
  protected readonly call: ServerDuplexStream<T, T>;
  protected handler: RouterHandler<any>;
  protected peer: string;
  protected path: string;
  protected constructor(call: ServerDuplexStream<T, T>) {
    this.call = call;
    this.peer = this.call.getPeer();
    this.path = this.call.getPath();
    this.logger = Container.get(LogService).createServiceLogger(
      this.constructor.name,
    );
  }

  handleData(data: T) {
    this.logger.debug('route rpc stream');
    return this.handler(data, this);
  }

  send(req: T): boolean {
    this.logger.silly('send rpc stream');
    return this.call.write(req);
  }

  sendMetadata(metaData: Metadata) {
    this.logger.debug('send meta data to client', { metaData });
    this.call.sendMetadata(metaData);
  }

  getDeadLine() {
    this.logger.debug('get client dead line');
    return this.call.getDeadline();
  }

  end() {
    this.logger.debug('end rpc stream', { call: this.call });
    return this.call.end();
  }

  finish() {
    this.logger.debug('response duplex stream ended', { call: this.call });
  }
}
