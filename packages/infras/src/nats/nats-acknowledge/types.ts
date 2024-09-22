import { Msg } from 'nats';

export enum SubscriberCount {
  Auto = -1,
}

export type NatsRequestPayload<T> = {
  _payload: T;
  _natsRequestOptions?: {
    id: string;
    timeout: number;
  };
};

export const CONSUMER_REQUEST_POSTFIX = '.consumer.register';
export const PRODUCER_REQUEST_POSTFIX = '.producer.register';
export const ACKNOWLEDGEMENT_POSTFIX = '.akc.';
export const ACKNOWLEDGEMENT_TIMEOUT = 2000;

export function isAcknowledgeEvent({ subject }: Msg): boolean {
  return !![
    CONSUMER_REQUEST_POSTFIX,
    PRODUCER_REQUEST_POSTFIX,
    ACKNOWLEDGEMENT_POSTFIX,
  ].find((txt) => subject.includes(txt));
}
