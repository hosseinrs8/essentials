import { ServiceError } from '@grpc/grpc-js';

export class RPCTransferEvent {
  subject: string;
  reply: boolean;
  payload: string;

  constructor(subject: string, payload: any, reply = false) {
    this.subject = subject;
    this.payload =
      typeof payload === 'string' ? payload : JSON.stringify(payload);
    this.reply = reply;
  }

  parsedPayload() {
    try {
      return JSON.parse(this.payload);
    } catch (e) {
      return this.payload;
    }
  }
}

export enum AcknowledgementStatus {
  failure,
  success,
}

export class EventAcknowledge {
  readonly subject: string;
  readonly status: AcknowledgementStatus;
  readonly payload: string;

  constructor(
    event: RPCTransferEvent | EventAcknowledge,
    payload?: any,
    error?: ServiceError,
  ) {
    if (event.subject.split('-')[0] === 'ack') {
      this.subject = event.subject;
      this.status = (event as EventAcknowledge).status;
      this.payload = event.payload;
    } else {
      this.subject = 'ack-' + event.subject;
      this.status = error
        ? AcknowledgementStatus.failure
        : AcknowledgementStatus.success;
      const code = error?.code ?? 0;
      const errorMessage = error?.message;
      if (payload)
        this.payload =
          typeof payload === 'string' ? payload : JSON.stringify(payload);
      else if (error) this.payload = JSON.stringify({ code, errorMessage });
    }
  }

  parsedPayload<T>(): T | undefined {
    return this.payload ? (JSON.parse(this.payload) as T) : undefined;
  }
}
