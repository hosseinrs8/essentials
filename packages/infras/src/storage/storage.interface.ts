import { Readable } from 'stream';
import { CopyObjectCommandOutput } from '@aws-sdk/client-s3';

export interface Storage {
  exists(path: string, bucket: string): Promise<boolean>;

  get(path: string, bucket: string): Promise<Readable>;

  put(path: string, content: Buffer | Readable, bucket?: string): Promise<void>;

  delete(path: string, bucket: string): Promise<void>;

  size(path: string, bucket: string): Promise<number>;

  move(path: string, target: string, bucket: string): Promise<void>;

  copy(
    path: string,
    target: string,
    bucket: string,
  ): Promise<CopyObjectCommandOutput | void>;
}
