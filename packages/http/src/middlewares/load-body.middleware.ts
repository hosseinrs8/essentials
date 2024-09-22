import { HttpRequest, HttpResponse } from 'uWebSockets.js';
import { MiddlewareFunctionType } from '../http.factory';
import { Container, Logger, LogService, Service } from '@essentials/common';

interface BodyReaderOptions {
  maxSize: number;
  timeout: number;
}

@Service()
export class LoadBodyMiddleware {
  protected logger: Logger;
  constructor() {
    this.logger = Container.get(LogService).createServiceLogger(
      this.constructor.name,
    );
  }
  use(res: HttpResponse, req: HttpRequest, next: MiddlewareFunctionType) {
    this.logger.debug(`middleware, loading body`);
    // todo get option from user
    res.bodyPromise = new Promise((resolve, reject) => {
      const validatedOptions: BodyReaderOptions = {
        maxSize: -1,
        timeout: -1,
      };
      const chunks: Array<Buffer> = [];
      let bodySize = 0;
      let timeout: ReturnType<typeof setTimeout>;
      if (validatedOptions.timeout !== -1) {
        timeout = setTimeout(() => {
          res.close();
          reject(new Error('timeout'));
        }, validatedOptions.timeout);
      }
      res.onData((chunk, isLast) => {
        const buffer = Buffer.from(chunk);
        const result = Buffer.alloc(buffer.length);
        buffer.copy(result);
        chunks.push(result);
        bodySize += chunk.byteLength;
        if (
          validatedOptions.maxSize !== -1 &&
          bodySize > validatedOptions.maxSize
        ) {
          reject(new Error('SizeLimit'));
        }
        if (isLast) {
          clearTimeout(timeout);
          resolve(Buffer.concat(chunks));
        }
      });
    });
    return next(res, req);
  }
}
