/* eslint-disable @typescript-eslint/no-unused-vars */
import { LogService } from './log.service';
import { Logger } from './logger.interface';

export class ServiceLogger implements Logger {
  constructor(
    private readonly logger: LogService,
    private readonly serviceName: string,
  ) {
    return;
  }

  debug<T>(message: string, meta?: T): void {
    return this.logger.debug(message, {
      serviceName: this.serviceName,
      ...meta,
    });
  }

  error<T>(message: string, meta?: T): void {
    return this.logger.error(message, {
      serviceName: this.serviceName,
      ...meta,
    });
  }

  http<T>(message: string, meta?: T): void {
    return this.logger.http(message, {
      serviceName: this.serviceName,
      ...meta,
    });
  }

  info<T>(message: string, meta?: T): void {
    return this.logger.info(message, {
      serviceName: this.serviceName,
      ...meta,
    });
  }

  silly<T>(message: string, meta?: T): void {
    return this.logger.silly(message, {
      serviceName: this.serviceName,
      ...meta,
    });
  }

  verbose<T>(message: string, meta?: T): void {
    return this.logger.verbose(message, {
      serviceName: this.serviceName,
      ...meta,
    });
  }

  warn<T>(message: string, meta?: T): void {
    return this.logger.warn(message, {
      serviceName: this.serviceName,
      ...meta,
    });
  }
}

export class ServiceLoggerMock implements Logger {
  debug<T>(message: string, meta?: T): void {
    return;
  }

  error<T>(message: string, meta?: T): void {
    return;
  }

  http<T>(message: string, meta?: T): void {
    return;
  }

  info<T>(message: string, meta?: T): void {
    return;
  }

  silly<T>(message: string, meta?: T): void {
    return;
  }

  verbose<T>(message: string, meta?: T): void {
    return;
  }

  warn<T>(message: string, meta?: T): void {
    return;
  }
}
