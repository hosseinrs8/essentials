import {
  sendUnaryData,
  ServerUnaryCall,
  ServerWritableStream,
} from '@grpc/grpc-js';
import { ServerDuplexStream } from '@grpc/grpc-js/build/src/server-call';

export interface BaseServiceInterface<T, R> {
  [key: string]: (call: any, callback?: any) => void;

  handle(call: ServerUnaryCall<T, R>, callback?: sendUnaryData<R>): void;

  handleStream(call?: ServerWritableStream<T, R>): void;

  handleDuplex(call: ServerDuplexStream<T, R>): void;
}
