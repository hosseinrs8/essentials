import {
  ConfigService,
  Container,
  Logger,
  LogService,
  Service,
} from '@essentials/common';
import { HttpServerRawConfig } from './http-config.interface';
import {
  App,
  CompressOptions,
  HttpRequest,
  HttpResponse,
  SSLApp,
  TemplatedApp,
  us_listen_socket_close,
} from 'uWebSockets.js';
import { HTTPMethods } from './decorators/router-map.decorator';
import { requestErrorWrapper } from './middlewares/error-wrapper.middleware';
import { bootHealth, isHealthy } from './tools/health';
import { AddressInfo } from 'net';
import { Middleware } from './middlewares/middleware';

export type HttpApp = TemplatedApp & {
  address(): AddressInfo;
  close(): void;
};

export interface ServiceConfig {
  globalPrefix?: string;

  /** Maximum length of received message. If a client tries to send you a message larger than this, the connection is immediately closed. Defaults to 16 * 1024. */
  maxPayloadLength?: number;
  /** Whether we should automatically close the socket when a message is dropped due to backpressure. Defaults to false. */
  closeOnBackpressureLimit?: number;
  /** Maximum number of minutes a WebSocket may be connected before being closed by the server. 0 disables the feature. */
  maxLifetime?: number;
  /** Maximum amount of seconds that may pass without sending or getting a message. Connection is closed if this timeout passes. Resolution (granularity) for timeouts are typically 4 seconds, rounded to closest.
   * Disable by using 0. Defaults to 120.
   */
  idleTimeout?: number;
  /** What per message-deflate compression to use. uWS.DISABLED, uWS.SHARED_COMPRESSOR or any of the uWS.DEDICATED_COMPRESSOR_xxxKB. Defaults to uWS.DISABLED. */
  compression?: CompressOptions;
  /** Maximum length of allowed backpressure per socket when publishing or sending messages. Slow receivers with too high backpressure will be skipped until they catch up or timeout. Defaults to 64 * 1024. */
  maxBackpressure?: number;
  /** Whether we should automatically send pings to uphold a stable connection given whatever idleTimeout. */
  sendPingsAutomatically?: boolean;
}

export declare type ControllerType<T = any> = new (...args: any[]) => T;
export declare type MiddlewareType<T = any> =
  | Middleware
  | (new (...args: any[]) => T);
export declare type MiddlewareFunctionType = (
  res?: HttpResponse,
  req?: HttpRequest,
  next?: MiddlewareFunctionType,
) => Promise<any>;

@Service()
export class HttpFactory {
  protected readonly logger: Logger;

  constructor(
    protected readonly configService: ConfigService,
    logService: LogService,
  ) {
    this.logger = logService.createServiceLogger(HttpFactory.name);
  }

  static getMethods<T>(obj: T): Array<string> {
    const properties = new Set();
    let currentObj = obj;
    do {
      Object.getOwnPropertyNames(currentObj).forEach((item) =>
        properties.add(item),
      );
    } while ((currentObj = Object.getPrototypeOf(currentObj)));
    return ([...properties.keys()] as Array<string>).filter(
      (item) => typeof (obj as any)[item] === 'function',
    );
  }

  protected static compose(middleware: Array<MiddlewareFunctionType>) {
    return function (
      res: HttpResponse,
      req: HttpRequest,
      next?: () => Promise<void>,
    ) {
      let index = -1;
      return dispatch(0);

      function dispatch(i: number): Promise<any> {
        if (i <= index)
          return Promise.reject(new Error('next() called multiple times'));
        index = i;
        let fn: MiddlewareFunctionType | undefined = middleware[i];
        if (i === middleware.length) fn = next;
        if (!fn) return Promise.resolve();
        try {
          return Promise.resolve(fn(res, req, dispatch.bind(null, i + 1)));
        } catch (err) {
          return Promise.reject(err);
        }
      }
    };
  }

  protected static getMiddlewareCallback(
    instance: any,
    methodName: string,
    controllerMiddlewares: Array<MiddlewareType> = [],
    methodMiddlewares: Array<MiddlewareType> = [],
  ) {
    const middlewares: Array<MiddlewareFunctionType> = controllerMiddlewares
      .concat(methodMiddlewares)
      .map((middleware) => {
        if (typeof middleware === 'function') {
          const mInstance = Container.get(middleware);
          return mInstance.use.bind(mInstance);
        } else {
          return middleware.use.bind(middleware);
        }
      })
      .concat([instance[methodName].bind(instance)]);
    middlewares.unshift(requestErrorWrapper as MiddlewareFunctionType);
    return HttpFactory.compose(middlewares);
  }

  protected static registerRoutes(
    app: TemplatedApp,
    controller: ControllerType,
    serviceConfig: ServiceConfig,
  ) {
    const instance = Container.get(controller);
    const prefix: string = Reflect.getMetadata('http.route.prefix', instance);
    const controllerMiddlewares: Array<MiddlewareType> = Reflect.getMetadata(
      'http.route.middleware',
      instance,
    );
    if (prefix) {
      const methods = HttpFactory.getMethods(instance);
      for (const methodName of methods) {
        const path = Reflect.getMetadata(
          'http.route.path',
          instance,
          methodName,
        );
        if (path) {
          const methodMiddlewares: Array<MiddlewareType> = Reflect.getMetadata(
            'http.route.middleware',
            instance,
            methodName,
          );
          const callback = HttpFactory.getMiddlewareCallback(
            instance,
            methodName,
            controllerMiddlewares,
            methodMiddlewares,
          );
          const method = Reflect.getMetadata(
            'http.route.method',
            instance,
            methodName,
          ) as HTTPMethods;
          let methodPath = (serviceConfig.globalPrefix || '') + prefix + path;
          methodPath = methodPath.replace(/\/$/g, '').replace(/\/(\/)+/g, '/');
          switch (method) {
            case HTTPMethods.GET:
              app.get(methodPath, callback);
              break;
            case HTTPMethods.POST:
              app.post(methodPath, callback);
              break;
            case HTTPMethods.PUT:
              app.put(methodPath, callback);
              break;
            case HTTPMethods.PATCH:
              app.patch(methodPath, callback);
              break;
            case HTTPMethods.DELETE:
              app.del(methodPath, callback);
              break;
          }
        }
      }
    } else {
      throw new Error('Controller not defined!');
    }
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

  create(
    configName: string,
    controllers: Array<ControllerType>,
    serviceConfig: ServiceConfig = {},
  ): Promise<HttpApp> {
    this.logger.debug(`create a Templated app`, {
      configName: configName,
      controllers: controllers,
      serviceConfig: serviceConfig,
    });
    bootHealth();
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
        for (const controller of controllers) {
          this.logger.verbose(`calling HttpFactory.registerRoutes`);
          HttpFactory.registerRoutes(app, controller, serviceConfig);
        }

        app
          .get('/readiness', (res) => {
            res.cork(() => {
              res.writeStatus('200 OK');
              res.end();
            });
          })
          .get('/liveness', async (res) => {
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
          })
          .any('/*', (res) => {
            res.cork(() => {
              res.writeStatus('404 Not Found!').end();
            });
          })
          .listen(config.host, config.port, (socket) => {
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
              return resolve({
                ...app,
                address(): AddressInfo {
                  return {
                    address: config.host,
                    port: config.port,
                    family: 'IPv4',
                  };
                },
                close() {
                  us_listen_socket_close(socket);
                  return app; // new uws returns TemplatedApp
                },
              });
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

  static create(
    configName: string,
    controllers: Array<ControllerType>,
    serviceConfig: ServiceConfig = {},
  ): Promise<HttpApp> {
    return Container.get(HttpFactory).create(
      configName,
      controllers,
      serviceConfig,
    );
  }
}
