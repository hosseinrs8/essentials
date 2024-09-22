import {
  CopyObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectAclCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { Readable } from 'stream';
import { URL } from 'url';
import { Container, Logger, LogService } from '@essentials/common';
import { CloudStorage } from './cloud.storage';
import { S3Config } from '../util/s3-config';

export class S3Storage implements CloudStorage {
  protected client: S3Client;
  protected logger: Logger;
  private folderPath = '';

  constructor(private readonly config: S3Config) {
    this.client = new S3Client({
      region: config.region || 'default',
      endpoint: config.endpoint,
      credentials: {
        accessKeyId: config.accessKeyId || '',
        secretAccessKey: config.secretAccessKey || '',
      },
    });
    this.logger = Container.get(LogService).createServiceLogger(
      this.constructor.name,
    );
  }

  setFolder(folderName: string): void {
    this.folderPath = folderName + '/';
  }

  getPath(fileName: string): string {
    return this.folderPath + fileName;
  }

  copy(path: string, target: string, bucket: string): Promise<void> {
    const srcPath = this.getPath(path);
    const targetPath = this.getPath(target);

    this.logger.debug(`copy object`, { src: srcPath, key: targetPath, bucket });
    return this.client
      .send(
        new CopyObjectCommand({
          Bucket: bucket,
          CopySource: srcPath,
          Key: targetPath,
        }),
      )
      .then();
  }

  delete(path: string, bucket: string): Promise<void> {
    const key = this.getPath(path);

    this.logger.debug(`remove object from s3client`, { key, bucket });
    return this.client
      .send(
        new DeleteObjectCommand({
          Bucket: bucket,
          Key: key,
        }),
      )
      .then();
  }

  exists(path: string, bucket: string): Promise<boolean> {
    const key = this.getPath(path);

    this.logger.debug(`check existence of object`, { key, bucket });
    return this.client
      .send(
        new HeadObjectCommand({
          Bucket: bucket,
          Key: key,
        }),
      )
      .then(() => true)
      .catch((error: any) => {
        if (error?.$metadata?.httpStatusCode === 404) {
          return false;
        } else {
          this.logger.error(`there is not exist such object`, {
            bucket,
            key: key,
            errorCode: 404,
          });
          throw error;
        }
      });
  }

  get(path: string, bucket: string): Promise<Readable> {
    const key = this.getPath(path);

    this.logger.debug(`get object from s3client`, { key, bucket });
    return this.client
      .send(
        new GetObjectCommand({
          Bucket: bucket,
          Key: key,
        }),
      )
      .then((res: any) => res.Body as Readable);
  }

  async move(path: string, target: string, bucket: string): Promise<void> {
    this.logger.debug(`move object`, { path, target, bucket });
    await this.copy(path, target, bucket);
    await this.delete(path, bucket);
  }

  put(path: string, content: Buffer | Readable, bucket: string): Promise<void> {
    const key = this.getPath(path);

    this.logger.debug(`put object body to s3client`, {
      key: key,
      bucket,
    });
    return this.client
      .send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: content,
        }),
      )
      .then();
  }

  async url(path: string, bucket: string): Promise<string> {
    const key = this.getPath(path);

    this.logger.debug(`generate url`, { key, bucket });
    await this.client.send(
      new PutObjectAclCommand({
        Bucket: bucket,
        Key: key,
        ACL: 'public-read',
      }),
    );
    const url = new URL(this.config.endpoint || '');
    return `${url.protocol}//${bucket}.${url.host}/${key}`;
  }

  size(path: string, bucket: string): Promise<number> {
    const key = this.getPath(path);

    this.logger.debug(`get size of object from s3client`, {
      key,
      bucket,
    });
    return this.client
      .send(
        new HeadObjectCommand({
          Bucket: bucket,
          Key: key,
        }),
      )
      .then((res: any) => res.ContentLength);
  }
}
