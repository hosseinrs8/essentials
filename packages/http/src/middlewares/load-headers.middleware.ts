import { Container, Logger, LogService, Service } from '@essentials/common';
import { Middleware } from './middleware';
import { HttpRequest, HttpResponse } from 'uWebSockets.js';
import { MiddlewareFunctionType } from '../http.factory';

export interface WithHeaders {
  headers: Record<string, string>;
  getHeader(key: string): string | undefined;
}

@Service()
export class LoadHeadersMiddleware implements Middleware {
  protected logger: Logger;
  constructor() {
    this.logger = Container.get(LogService).createServiceLogger(
      this.constructor.name,
    );
  }
  use(res: HttpResponse, req: HttpRequest, next: MiddlewareFunctionType) {
    this.logger.debug(`middleware, loading headers`);
    const headers: Record<string, string> = {};
    req.forEach((key, value) => (headers[key] = value));
    res.headers = headers;
    res.getHeader = (key: string) => {
      return res.headers[key];
    };
    return next(res, req);
  }
}
