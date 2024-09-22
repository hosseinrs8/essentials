import { Service } from '@essentials/common';
import { Middleware } from './middleware';
import { HttpRequest, HttpResponse } from 'uWebSockets.js';
import { MiddlewareFunctionType } from '../http.factory';

@Service()
export class DownloadMiddleware implements Middleware {
  use(res: HttpResponse, req: HttpRequest, next: MiddlewareFunctionType) {
    res.hasReadStreamResponse = true;
    return next(res, req);
  }
}
