import {
  ConfigService,
  Container,
  Logger,
  LogService,
  Service,
} from '@essentials/common';
import { ControllerType, HttpFactory, ServiceConfig } from './http.factory';
import {
  App,
  HttpRequest,
  HttpResponse,
  SSLApp,
  TemplatedApp,
  us_socket_context_t,
  WebSocket,
} from 'uWebSockets.js';
import { HttpServerRawConfig } from './http-config.interface';
import { isHealthy } from './tools/health';

@Service()
export class WsFactory {
  protected readonly logger: Logger;

  constructor(
    protected readonly configService: ConfigService,
    logService: LogService,
  ) {
    this.logger = logService.createServiceLogger(HttpFactory.name);
  }

  protected loadConfig(configName: string): HttpServerRawConfig {
    this.logger.debug(`loadConfig`, { configName: configName });
    const config = this.configService.get<Partial<HttpServerRawConfig>>(
      configName,
      {},
    );
    this.logger.info(`config successfully loaded`, {
      host: config.host || '127.0.0.1',
      port: config.port || 3000,
      tls: config.tls,
    });
    return {
      host: config.host || '127.0.0.1',
      port: config.port || 3000,
      tls: config.tls,
    };
  }

  protected parseController(controller: ControllerType) {
    this.logger.debug(`parseController`, { controller: controller });
    const result = [];
    const instance = Container.get(controller);
    const methods = HttpFactory.getMethods(instance);
    for (const methodName of methods) {
      const onConnect =
        Reflect.getMetadata('ws.io.connect', instance, methodName) || false;
      const onMessage =
        Reflect.getMetadata('ws.io.message', instance, methodName) || false;
      const onClose =
        Reflect.getMetadata('ws.io.close', instance, methodName) || false;
      const onUpgrade =
        Reflect.getMetadata('ws.io.upgrade', instance, methodName) || false;
      const onPing =
        Reflect.getMetadata('ws.io.onPing', instance, methodName) || false;
      const onPong =
        Reflect.getMetadata('ws.io.onPong', instance, methodName) || false;
      const subjects =
        Reflect.getMetadata('ws.io.subject', instance, methodName) || [];
      result.push({
        onConnect,
        onMessage,
        onClose,
        onUpgrade,
        onPing,
        onPong,
        subjects,
        callback: instance[methodName].bind(instance),
      });
    }
    return result;
  }

  create<T = any>(
    configName: string,
    controllers: Array<ControllerType>,
    upgradeFunction?: (
      res: HttpResponse,
      req: HttpRequest,
      context: us_socket_context_t,
    ) => any,
    serviceConfig: ServiceConfig = {},
  ): Promise<TemplatedApp> {
    this.logger.debug(`create websocket`, {
      configName: configName,
      controllers: controllers,
      serviceConfig: serviceConfig,
    });
    return new Promise((resolve, reject) => {
      const config = this.loadConfig(configName);
      let app: TemplatedApp;
      try {
        if (config.tls) {
          app = SSLApp({
            key_file_name: config.tls.keyPath,
            cert_file_name: config.tls.certPath,
          });
        } else {
          app = App();
        }
        const onConnectMethods: Array<(ws: WebSocket<T>) => any> = [];
        const onMessageMethods: Array<
          (ws: WebSocket<T>, message?: ArrayBuffer, isBinary?: boolean) => any
        > = [];
        const onCloseMethods: Array<
          (ws: WebSocket<T>, code?: number, message?: string) => any
        > = [];
        const onUpgradeMethods: Array<
          (
            res: HttpResponse,
            req: HttpRequest,
            context: us_socket_context_t,
          ) => any
        > = [];
        const onPingMethods: Array<(ws: WebSocket<T>) => any> = [];
        const onPongMethods: Array<(ws: WebSocket<T>) => any> = [];
        const subjects: Map<
          string,
          Array<(data: any, ws?: WebSocket<T>) => any>
        > = new Map();
        for (const controller of controllers) {
          this.logger.verbose(`parsing methods`);
          const methods = this.parseController(controller);
          for (const method of methods) {
            if (method.onConnect) {
              onConnectMethods.push(method.callback);
            }
            if (method.onMessage) {
              onMessageMethods.push(method.callback);
            }
            if (method.onClose) {
              onCloseMethods.push(method.callback);
            }
            if (method.onUpgrade) {
              onUpgradeMethods.push(method.callback);
            }
            if (method.onPing) {
              onPingMethods.push(method.callback);
            }
            if (method.onPong) {
              onPongMethods.push(method.callback);
            }
            for (const subject of method.subjects) {
              if (!subjects.has(subject)) {
                subjects.set(subject, []);
              }
              subjects.get(subject)?.push(method.callback);
            }
          }
        }

        app.ws(serviceConfig.globalPrefix || '/*', {
          // compression: SHARED_COMPRESSOR,
          idleTimeout: serviceConfig.idleTimeout ?? 16,
          maxBackpressure: serviceConfig.maxBackpressure ?? 100 * 1024 * 1024,
          sendPingsAutomatically: serviceConfig.sendPingsAutomatically ?? true,
          maxPayloadLength: serviceConfig.maxPayloadLength ?? 100 * 1024 * 1024,
          upgrade: upgradeFunction, // todo put all in try catch
          // upgrade(
          //   res: HttpResponse,
          //   req: HttpRequest,
          //   context: us_socket_context_t,
          // ) {
          //   if (upgradeFunction) {
          //     upgradeFunction(res, req, context);
          //   } else {
          //     // todo run onUpgrade functions middleware based
          //   }
          // },
          open(ws: WebSocket<T>) {
            for (const callback of onConnectMethods) {
              callback(ws);
            }
          },
          message(ws: WebSocket<T>, message, isBinary) {
            for (const callback of onMessageMethods) {
              callback(ws, message, isBinary);
            }
            if (!isBinary) {
              const messageBuffer = Buffer.from(message).toString('utf8');
              const payload = WsFactory.toJson(messageBuffer);
              if (payload) {
                if (Array.isArray(payload) && payload[0]) {
                  const callbacks = subjects.get(payload[0]) || [];
                  for (const callback of callbacks) {
                    callback(payload[1], ws);
                  }
                }
              }
            }
          },
          close(ws: WebSocket<T>, code, message) {
            for (const callback of onCloseMethods) {
              callback(ws, code, Buffer.from(message).toString('utf8'));
            }
          },
          ping(ws: WebSocket<T>) {
            for (const callback of onPingMethods) {
              callback(ws);
            }
          },
          pong(ws: WebSocket<T>) {
            for (const callback of onPongMethods) {
              callback(ws);
            }
          },
        });

        app.any('/readiness', (res) => {
          res.cork(() => {
            res.writeStatus('200 OK');
            res.end();
          });
        });
        app.any('/liveness', async (res) => {
          let aborted = false;
          res.onAborted(() => {
            console.log('error on liveness');
            aborted = true;
          });
          if (!aborted && (await isHealthy())) {
            res.cork(() => {
              res.writeStatus('200 OK');
              res.end();
            });
          } else {
            !aborted &&
              res.cork(() => {
                res.writeStatus('500 Internal Server Error');
                res.end();
              });
          }
        });

        app.any('/*', (res) => {
          res.cork(() => {
            res.writeStatus('404 Not Found!').end();
          });
        });
        app.listen(config.host, config.port, (socket) => {
          if (socket) {
            this.logger.info(
              `config: ${configName} listing on ${
                config.tls ? 'https' : 'http'
              }://${config.host}:${config.port}`,
              {
                configName: configName,
                configTls: config.tls,
                configHost: config.host,
                configPort: config.port,
              },
            );
            return resolve(app);
          } else {
            this.logger.error(`server not created`);
            return reject(new Error('server not created!'));
          }
        });
      } catch (e) {
        this.logger.error(`error`, { error: e });
        return reject(e);
      }
    });
  }

  private static toJson<T>(str: string): T | boolean {
    try {
      return JSON.parse(str);
    } catch (e) {
      return false;
    }
  }
}
