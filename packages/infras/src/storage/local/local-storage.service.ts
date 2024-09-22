import { Storage } from '../storage.interface';
import * as fs from 'fs/promises';
import { existsSync, createReadStream, createWriteStream } from 'fs';
import path from 'path';
import { Readable } from 'stream';
import { Container, Logger, LogService, Service } from '@essentials/common';

@Service()
export class LocalStorageService implements Storage {
  protected logger: Logger;

  constructor() {
    this.logger = Container.get(LogService).createServiceLogger(
      this.constructor.name,
    );
  }

  protected getState(path: string) {
    this.logger.debug(`get state of file`, { path });
    return fs.stat(path);
  }

  protected async deepCopyDirectory(src: string, dest: string) {
    this.logger.debug(`copy all files and folder of src directory to dest`, {
      src,
      dest,
    });
    await fs.mkdir(dest, { recursive: true });
    const entries = await fs.readdir(src, { withFileTypes: true });

    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);

      entry.isDirectory()
        ? await this.deepCopyDirectory(srcPath, destPath)
        : await fs.copyFile(srcPath, destPath);
    }
  }

  async copy(path: string, target: string): Promise<void> {
    this.logger.debug(`copy entity from path to target`, { path, target });
    const state = await this.getState(path);
    if (state.isDirectory()) {
      return this.deepCopyDirectory(path, target);
    } else {
      return fs.copyFile(path, target);
    }
  }

  delete(path: string): Promise<void> {
    this.logger.debug(`delete path file or folder`, { path });
    return fs.unlink(path);
  }

  exists(path: string): Promise<boolean> {
    this.logger.debug(`check existence of path address`, { path });
    return Promise.resolve(existsSync(path));
  }

  get(path: string): Promise<Readable> {
    this.logger.debug(`get path entity`, { path });
    return Promise.resolve(createReadStream(path));
  }

  move(path: string, target: string): Promise<void> {
    this.logger.debug(`move path entity to target`, { path, target });
    return fs.rename(path, target);
  }

  put(path: string, content: Buffer | Readable): Promise<void> {
    this.logger.debug(`put file to path`, { path });
    if (Buffer.isBuffer(content)) {
      return fs.writeFile(path, content);
    } else {
      const dest = createWriteStream(path);
      content.pipe(dest);
      return Promise.resolve();
    }
  }

  size(path: string): Promise<number> {
    this.logger.debug(`get size of path file or folder`, { path });
    return this.getState(path).then((res) => res.size);
  }
}
