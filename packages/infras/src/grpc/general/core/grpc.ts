import { Container, Service } from '@essentials/common';
import { GRPC } from '../../base/core/grpc';
import { RPCTransferEvent } from '../services/events.service';
import { EventsProto } from '../services/event.interface';
import { Server, ServerCredentials } from '@grpc/grpc-js';
import { GrpcGeneralServer } from './grpc-server';
import { ControllerType, Router } from '../../base/router/router';

@Service()
export class GeneralGrpc extends GRPC<
  EventsProto,
  RPCTransferEvent,
  RPCTransferEvent
> {
  private router: Router;

  constructor(private readonly server: GrpcGeneralServer) {
    super();
  }

  static create(controllers: Array<ControllerType>) {
    const grpc = Container.get(GeneralGrpc);
    grpc.logger.debug('create grpc communication');
    grpc.router = Router.create(controllers);
    return grpc;
  }

  async boot() {
    this.logger.debug('boot gRPC communication');
    await this.router.boot();
    await this.runServer();
  }

  private runServer() {
    this.logger.debug('run grpc server');

    this.loadService();
    this.protoService = this.protoDef.communication.Events.service;

    const { serverHost, localPort } = this.config;
    this.logger.debug('create gRPC server', {
      port: localPort,
      host: serverHost,
    });
    this.server.raw = new Server();
    this.server.raw.addService(this.protoService, {
      handle: this.server.handle.bind(this),
      handleStream: this.server.handleStream.bind(this),
      handleDuplex: this.server.handleDuplex.bind(this),
    });
    return new Promise((resolve, reject) => {
      this.server.raw.bindAsync(
        [serverHost, localPort].join(':'),
        ServerCredentials.createInsecure(),
        (error, port) => {
          if (error) {
            this.logger.error('error in gRPC server boot', { error });
            reject(error);
          }
          this.logger.info(`server running on address: ${serverHost}:${port}`);
          resolve(this);
        },
      );
    });
  }
}
