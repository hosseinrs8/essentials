import {
  ConfigService,
  Container,
  Logger,
  LogService,
  Service,
} from '@essentials/common';
import {
  Server,
  ServerCredentials,
  credentials,
  makeGenericClientConstructor,
  ServiceClientConstructor,
  Client,
} from '@grpc/grpc-js';
import { GRPCIdentity } from './interfaces/grpc-identity';
import { GRPC } from './core/grpc';
import { GrpcServer } from './core/grpc-server';

@Service()
export class GrpcFactory {
  private readonly logger: Logger;
  private server: Server;
  private config: GRPCIdentity;
  private readonly clients: Map<string, Client> = new Map();
  private readonly servers: Map<string, Server> = new Map();

  constructor() {
    this.logger = Container.get(LogService).createServiceLogger(
      this.constructor.name,
    );
  }

  private loadConfig(identity: string) {
    this.logger.debug('load grpc config', { identity });
    this.config = Container.get(ConfigService).get<GRPCIdentity>(identity);
    return this.config;
  }

  createClient<T = any>(grpc: GRPC<T>, identity = 'grpc') {
    const { clientHost, foreignPort } = this.loadConfig(identity);
    this.logger.debug('create gRPC client', {
      port: foreignPort,
      host: clientHost,
    });
    const clientConstructor: ServiceClientConstructor =
      makeGenericClientConstructor(grpc.protoService, 'EventsService');
    const client = new clientConstructor(
      [clientHost, foreignPort.toString()].join(':'),
      credentials.createInsecure(),
    );
    this.clients.set(identity, client);
    return client;
  }

  getClient(identity: string) {
    const client = this.clients.get(identity);
    if (!client) {
      this.logger.error('Grpc client not found', { identity });
    }
    return client;
  }

  createServer(identity = 'general') {
    const { serverHost, localPort } = this.loadConfig('grpc');
    this.logger.debug('create gRPC server', {
      port: localPort,
      host: serverHost,
    });
    return new Promise((resolve, reject) => {
      this.server.bindAsync(
        [serverHost, localPort].join(':'),
        ServerCredentials.createInsecure(),
        (error, port) => {
          if (error) {
            this.logger.error('error in gRPC server boot', { error });
            reject(error);
          }
          this.logger.info(
            `server running on address: ${this.config.localPort}:${port}`,
          );
          this.servers.set(identity, this.server);
          resolve(this);
        },
      );
    });
  }

  getServer(identity: string) {
    const client = this.servers.get(identity);
    if (!client) {
      this.logger.error('Grpc server not found', { identity });
    }
    return client;
  }

  addServices<PROTO, T = any, R = any>(
    handlers: GrpcServer<T, R>,
    service: GRPC<PROTO, T, R>,
    otherHandlers?: { [key: string]: any },
  ) {
    const collectedHandlers: { [key: string]: any } = {};
    let currentHandlers: any = handlers;
    do {
      const handlerNames = Object.getOwnPropertyNames(currentHandlers);
      for (const handlerName of handlerNames) {
        if (['handle', 'handleStream', 'handleDuplex'].includes(handlerName)) {
          collectedHandlers[handlerName] =
            currentHandlers[handlerName].bind(handlers);
        }
      }
      currentHandlers = Object.getPrototypeOf(currentHandlers);
    } while (currentHandlers && currentHandlers !== Object.prototype);
    this.server = new Server();
    this.server.addService(service.protoService, {
      ...collectedHandlers,
      ...otherHandlers,
    });
  }
}
