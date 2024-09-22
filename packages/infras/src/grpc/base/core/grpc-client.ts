import { LogService, Logger, Container } from '@essentials/common';
import { Client } from '@grpc/grpc-js';

export abstract class GrpcClient<SERVICE = any, T = any, R = any> {
  protected client: Client & SERVICE;
  protected logger: Logger;

  protected constructor() {
    this.logger = Container.get(LogService).createServiceLogger(
      this.constructor.name,
    );
  }
  bootClient(client: Client & SERVICE) {
    this.client = client;
    return this;
  }

  abstract publish(req: T): Promise<R>;

  abstract publishDuplex<RES = any>(): Promise<RES>;
}
