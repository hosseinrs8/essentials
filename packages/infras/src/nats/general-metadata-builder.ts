import { BootableInterface, Service } from '@essentials/common';
import { NatsClient, NatsFactory } from './nats.factory';
import { JSONCodec, NatsConnection } from 'nats';

type CreationDataInput = {
  remoteId: string;
  type: string;
  fields: any; //todo type
};

@Service()
export class GeneralMetadataBuilder implements BootableInterface {
  private connection: NatsClient;
  private codec = JSONCodec();

  constructor(private readonly natsFactory: NatsFactory) {}

  create(input: CreationDataInput): Promise<boolean> {
    const data = this.codec.encode(input);
    return this.connection.publish('io.metadata-builder.create', data);
  }

  async boot(): Promise<void> {
    this.connection = await this.natsFactory.createClient('general');
  }
}
