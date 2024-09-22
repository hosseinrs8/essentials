import { Storage } from '../storage.interface';

export interface CloudStorage extends Storage {
  url(path: string, bucket?: string): Promise<string>;
}
