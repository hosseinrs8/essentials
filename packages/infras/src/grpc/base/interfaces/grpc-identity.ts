import { Options } from '@grpc/proto-loader/build/src/util';

export interface GRPCIdentity {
  serverHost: string;
  clientHost: string;
  localPort: number;
  foreignPort: number;
  protoPath: string;
}
export type ProtoLoaderOptions = Options;
