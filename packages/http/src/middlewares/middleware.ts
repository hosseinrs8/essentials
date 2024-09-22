import { HttpRequest, HttpResponse } from 'uWebSockets.js';

export interface Middleware {
  use(
    res: HttpResponse,
    req: HttpRequest,
    next?: () => Promise<void>,
  ): Promise<void> | void;
}
