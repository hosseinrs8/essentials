import { ConsoleLogger } from '@nestjs/common';
import { Container, Logger, LogService } from '../main';

export class NestCustomLoggerService extends ConsoleLogger {
  public logger: Logger;

  constructor() {
    super();
    this.logger = Container.get(LogService);
  }

  printStackTrace(stack: string) {
    console.trace(stack);
  }

  log(message: any, ...optionalParams: string[]): void {
    const serviceName = optionalParams[0];
    delete optionalParams[0];
    this.logger.info(String(message), { serviceName, ...optionalParams });
  }

  error(message: any, ...optionalParams: string[]): void {
    const stack = optionalParams[0];
    const serviceName = optionalParams[1];
    delete optionalParams[0];
    delete optionalParams[1];
    this.logger.error(String(message), {
      serviceName,
      stack,
      ...optionalParams,
    });
  }

  warn(message: any, ...optionalParams: string[]): void {
    const serviceName = optionalParams[0];
    delete optionalParams[0];
    this.logger.warn(String(message), { serviceName, ...optionalParams });
  }

  debug(message: any, ...optionalParams: string[]): void {
    const serviceName = optionalParams[0];
    delete optionalParams[0];
    this.logger.debug(String(message), { serviceName, ...optionalParams });
  }

  verbose(message: any, ...optionalParams: string[]): void {
    const serviceName = optionalParams[0];
    delete optionalParams[0];
    this.logger.verbose(String(message), { serviceName, ...optionalParams });
  }
}
