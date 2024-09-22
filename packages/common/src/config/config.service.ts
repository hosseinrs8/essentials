import {
  accessSync,
  constants as FSConstants,
  existsSync,
  readFileSync,
} from 'fs';
import { parse } from 'yaml';
import { validateSync } from 'class-validator';
import { ConfigNotFoundError } from './errors/config-not-found.error';
import { Container, Service } from 'typedi';
import { plainToInstance } from 'class-transformer';
import { ClassConstructor } from 'class-transformer/types/interfaces';

export const CONFIG_FORMAT_INTERFACE = 'config-format-interface';
export const CONFIG_FILE_PATH = 'config-file-path';

@Service()
export class ConfigService {
  private readonly configFilePath: string;
  private rawData = '';
  private configs: object = {};

  private static getConfigPath(): string {
    if (
      process.env.CONFIG_FILE_PATH &&
      process.env.CONFIG_FILE_PATH.length > 0
    ) {
      return process.env.CONFIG_FILE_PATH;
    }
    try {
      return Container.get<string>(CONFIG_FILE_PATH);
    } catch (e) {
      return 'config.yaml';
    }
  }

  constructor() {
    this.configFilePath = ConfigService.getConfigPath();
    this.boot();
  }

  static readFileSync(path: string) {
    try {
      if (!existsSync(path)) {
        console.trace(path);
        throw new Error(`file "${path}" is not exists!`);
      }
      try {
        accessSync(path, FSConstants.R_OK);
      } catch (e) {
        throw new Error(`file "${path}" is not accessible!`);
      }
      return readFileSync(path, {
        encoding: 'utf8',
        flag: 'r',
      });
    } catch (e) {
      console.error('cant read file', { path, error: e });
      throw e;
    }
  }

  static readFileBufferSync(path: string): Buffer {
    if (!existsSync(path)) {
      throw new Error(`file "${path}" is not exists!`);
    }
    try {
      accessSync(path, FSConstants.R_OK);
    } catch (e) {
      throw new Error(`file "${path}" is not accessible!`);
    }
    return readFileSync(path, {
      flag: 'r',
    });
  }

  read() {
    if (this.configFilePath) {
      this.rawData = ConfigService.readFileSync(this.configFilePath);
    }
  }

  parse() {
    this.configs = parse(this.rawData || '', { prettyErrors: true });
  }

  validate() {
    this.configs = this.configs || {};
    let ConfigInterface = undefined;
    try {
      ConfigInterface = Container.get<ClassConstructor<any>>(
        CONFIG_FORMAT_INTERFACE,
      );
    } catch (e) {
      console.warn(CONFIG_FORMAT_INTERFACE + ' not found!');
    }
    if (ConfigInterface) {
      const tmpConfig = plainToInstance(ConfigInterface, this.configs);
      const syntaxErrors = validateSync(tmpConfig, {
        skipMissingProperties: false,
      });
      if (syntaxErrors.length > 0) {
        console.error('syntaxErrors', {
          error: syntaxErrors.toString(),
        });
        process.exit(1);
      }
    } else {
      console.warn(
        'Warning [ConfigService]: Config Validation Interface Not Provided!',
      );
    }
  }

  boot() {
    this.read();
    this.parse();
    this.validate();
  }

  get<T = string>(key: string, defaultValue?: T): T {
    const path = key.split('.');
    let target: any = this.configs;
    for (const targetPath of path) {
      if (target.hasOwnProperty(targetPath)) {
        target = target[targetPath];
      } else {
        console.error('ConfigNotFoundError', {
          config: this.configs,
          key: key,
          target: target,
          configFilePath: this.configFilePath,
        });
        if (defaultValue !== undefined) {
          console.info(`returning default value for key ${key}`);
          return defaultValue;
        }
        throw new ConfigNotFoundError(
          this.configs,
          key,
          target,
          this.configFilePath,
        );
      }
    }
    return target;
  }

  get config(): Record<string, any> {
    return this.configs;
  }
}
