import { Container, Logger, LogService } from '@essentials/common';
import { RouterHandler } from '../router';
import { ServerWritableStream, Metadata } from '@grpc/grpc-js';

export abstract class RPCStream<T> {
  protected readonly logger: Logger;
  protected readonly stream: ServerWritableStream<T, T>;
  protected readonly data: T;
  protected handler: RouterHandler<any>;
  protected peer: string;
  protected path: string;

  protected constructor(data: T, stream: ServerWritableStream<T, T>) {
    this.data = data;
    this.stream = stream;
    this.peer = this.stream.getPeer();
    this.path = this.stream.getPath();
    this.logger = Container.get(LogService).createServiceLogger(
      this.constructor.name,
    );
  }

  async route() {
    this.logger.debug('route rpc stream', { data: this.data });
    this.pickHandler();
    this.handler(this.data, this).then();
  }

  send(req: T): boolean {
    this.logger.silly('send rpc stream');
    return this.stream.write(req);
  }

  sendMetadata(metadata: Metadata): void {
    this.logger.debug('send meta data to client', { metadata });
    this.stream.sendMetadata(metadata);
  }

  getDeadline() {
    this.logger.debug('get client deadline', { user: this.peer });
    return this.stream.getDeadline();
  }

  end() {
    this.logger.debug('end rpc stream', {
      user: this.peer,
      address: this.path,
    });
    return this.stream.end();
  }

  protected abstract pickHandler(): void;
}
