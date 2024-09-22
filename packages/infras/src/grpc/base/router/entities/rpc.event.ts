import { Container, Logger, LogService } from '@essentials/common';
import { RouterHandler } from '../router';

export abstract class RPCEvent<T> {
  protected logger: Logger;
  protected data: T;
  protected handler: RouterHandler<any>;

  protected constructor() {
    this.logger = Container.get(LogService).createServiceLogger(
      this.constructor.name,
    );
  }

  route(req: T) {
    this.logger.debug('route rpc event');
    this.data = req;
    this.pickHandler();
    return this.handler(this.data).then();
  }

  abstract pickHandler(): void;
}
