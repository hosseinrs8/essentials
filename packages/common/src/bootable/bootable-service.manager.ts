import { Constructable } from 'typedi/types/types/constructable.type';
import { Container } from 'typedi';
import { BootableInterface } from './bootable.interface';
import { Logger } from '../logger/logger.interface';
import { LogService } from '../logger/log.service';

export type Services = Array<Constructable<any> | Array<Constructable<any>>>;

export class BootableServiceManager {
  protected logger: Logger;
  constructor(public readonly services: Services) {
    this.logger = Container.get(LogService).createServiceLogger(
      this.constructor.name,
    );
  }

  async boot() {
    this.logger.verbose('boot service');
    for (const service of this.services) {
      if (Array.isArray(service)) {
        await Promise.all(
          service.map((r) => Container.get<BootableInterface>(r).boot()),
        );
      } else {
        await Container.get<BootableInterface>(service).boot();
      }
    }
  }

  static create(services: Services) {
    return new BootableServiceManager(services);
  }
}
