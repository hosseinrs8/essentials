import {
  ClientReadableStream,
  ServiceDefinition,
  ServiceError,
} from '@grpc/grpc-js';
import { EventAcknowledge, RPCTransferEvent } from './events.service';

export interface EventsService {
  [key: string]: (
    event: RPCTransferEvent,
    callback?: (
      err: ServiceError | undefined,
      ack: EventAcknowledge | any,
    ) => void,
  ) => void | ClientReadableStream<RPCTransferEvent>;
}

export type EventsProto = {
  communication: {
    Events: {
      service: ServiceDefinition<any>;
    };
  };
};
