import { Readable } from 'stream';
import { Service } from '@essentials/common';
import { FileExtension, fromBuffer } from 'file-type';
import { UnprocessableEntity } from '@essentials/errors';
import { FileMaxSizeExceeded, InvalidFileExtension } from '@essentials/errors';
import * as crypto from 'crypto';

export type File = {
  readStream: Readable;
  totalSize: number;
  fileName: string;
  fileMimeType: string;
};

export type ValidatedFile = {
  fileBuffer: Buffer | Readable;
  fileName: string;
  fileMimeType: string;
  fileExt?: string;
};

enum AllowedExtensions {
  png = 'png',
  jpeg = 'jpeg',
  jpg = 'jpg',
}

@Service()
export class FileValidator {
  maxFileSize = 10485760; //10Mb
  allowedExtensions?: string[] = Object.values(AllowedExtensions);
  private characters =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  constructor(allowedExtensions?: string[], maxFileSize?: number) {
    this.maxFileSize = maxFileSize || this.maxFileSize;
    this.allowedExtensions = allowedExtensions || this.allowedExtensions;
  }

  async validate(file: Buffer): Promise<ValidatedFile> {
    const type = await fromBuffer(file);
    if (!(type && type.ext && type.mime)) throw new UnprocessableEntity();
    if (this.allowedExtensions)
      this.extensionCheck(type.ext, this.allowedExtensions);
    if (file.byteLength > this.maxFileSize) {
      throw new FileMaxSizeExceeded();
    }
    const fileName = this.generateRandomString(20) + `.${type.ext}`;
    return {
      fileBuffer: file,
      fileName,
      fileMimeType: type.mime,
      fileExt: type.ext,
    };
  }

  private extensionCheck(ext: FileExtension, allowedExtensions: string[]) {
    let extCheck = false;
    for (const allowedExt of allowedExtensions) {
      if (allowedExt === ext) {
        extCheck = true;
        break;
      }
    }
    if (!extCheck) throw new InvalidFileExtension();
  }

  private generateRandomString(length: number) {
    let randomString = '';
    for (let i = 0; i < length; i++) {
      randomString += this.characters.charAt(
        crypto.randomInt(this.characters.length),
      );
    }
    return randomString;
  }
}
