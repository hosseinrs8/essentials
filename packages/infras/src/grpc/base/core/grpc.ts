import {
  ConfigService,
  Container,
  Logger,
  LogService,
  Service,
} from '@essentials/common';
import { loadSync, PackageDefinition } from '@grpc/proto-loader';
import { GRPCIdentity, ProtoLoaderOptions } from '../interfaces/grpc-identity';
import { loadPackageDefinition, ServiceDefinition } from '@grpc/grpc-js';
import { BaseServiceInterface } from '../interfaces/base-service.interface';

enum GrpcState {
  booted = 1,
  not = 0,
}

@Service()
export abstract class GRPC<ProtoType, T = any, R = any> {
  protected state = GrpcState.not;
  protected protoDef: ProtoType;
  protected readonly logger: Logger;
  protected readonly config: GRPCIdentity;

  protoService: ServiceDefinition<BaseServiceInterface<T, R>>;

  protected constructor() {
    this.logger = Container.get(LogService).createServiceLogger(
      this.constructor.name,
    );
    this.config = Container.get(ConfigService).get<GRPCIdentity>('grpc');
  }

  loadService(
    options: ProtoLoaderOptions = {
      keepCase: true,
      longs: String,
      enums: String,
      defaults: true,
      oneofs: true,
    },
  ) {
    const packageDefinition: PackageDefinition = loadSync(
      this.config.protoPath,
      options,
    );
    this.protoDef = loadPackageDefinition(
      packageDefinition,
    ) as unknown as ProtoType;
    return this;
  }

  abstract boot(...args: Array<any>): void;
}
