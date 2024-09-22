import {
  createLogger,
  format,
  Logger as WinstonLogger,
  transports,
} from 'winston';
import { ConfigService } from '../config/config.service';
import { Container, Service } from 'typedi';
import * as Transport from 'winston-transport';
import { Logger } from './logger.interface';
import { ServiceLogger, ServiceLoggerMock } from './service-logger';
import {
  LoggerConfigInterface,
  loggerConfigRootKey,
} from './logger.config.interface';

const { combine, timestamp, metadata, json, colorize, printf } = format;
const { Console, File } = transports;

@Service()
export class LogService implements Logger {
  private readonly logger: WinstonLogger;
  private readonly enabled: boolean;

  constructor() {
    const configService = Container.get(ConfigService);
    const config = configService.get<LoggerConfigInterface>(
      loggerConfigRootKey,
      {
        enabled: true,
        consoleEnabled: true,
      },
    );
    this.enabled = config.enabled;
    if (this.enabled) {
      const transportsArray: Array<Transport> = [];
      if (config.consoleEnabled) {
        transportsArray.push(
          new Console({
            format: config.consolePrettyEnabled
              ? combine(
                  timestamp({ format: 'YY-MM-DD HH:mm:ss.SSS' }),
                  metadata(),
                  colorize({ all: true }),
                  printf((ctx) => {
                    try {
                      const time = ctx.metadata.timestamp;
                      const serviceName = ctx.metadata.serviceName;
                      delete ctx.metadata.serviceName;
                      delete ctx.metadata.timestamp;
                      return `${time}: [${serviceName}] (${ctx.level}) ${
                        ctx.message
                      } ${JSON.stringify(
                        ctx.metadata,
                        (key, value) =>
                          typeof value === 'bigint' ? value.toString() : value, // return everything else unchanged
                        1,
                      )}`;
                    } catch (e) {
                      console.error('cant log', ctx, e);
                      return 'error while logging';
                    }
                  }),
                )
              : combine(timestamp(), metadata(), json()),
          }),
        );
      }
      if (config.fileEnabled) {
        transportsArray.push(
          new File({
            filename: config.fileName,
            dirname: config.filePath,
            format: combine(timestamp(), metadata(), json()),
          }),
        );
      }
      this.logger = createLogger({
        level: config.level,
        transports: transportsArray,
      });
    }
  }

  winstonInstance() {
    return this.logger;
  }

  createServiceLogger(serviceName: string): Logger {
    if (this.enabled) {
      return new ServiceLogger(this, serviceName);
    } else {
      return new ServiceLoggerMock();
    }
  }

  error<T>(message: string, meta?: T) {
    if (this.enabled) {
      this.logger.log('error', message, meta);
    }
  }

  warn<T>(message: string, meta?: T) {
    if (this.enabled) {
      this.logger.log('warn', message, meta);
    }
  }

  info<T>(message: string, meta?: T) {
    if (this.enabled) {
      this.logger.log('info', message, meta);
    }
  }

  http<T>(message: string, meta?: T) {
    if (this.enabled) {
      this.logger.log('http', message, meta);
    }
  }

  verbose<T>(message: string, meta?: T) {
    if (this.enabled) {
      this.logger.log('verbose', message, meta);
    }
  }

  debug<T>(message: string, meta?: T) {
    if (this.enabled) {
      this.logger.log('debug', message, meta);
    }
  }

  silly<T>(message: string, meta?: T) {
    if (this.enabled) {
      this.logger.log('silly', message, meta);
    }
  }
}
