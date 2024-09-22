import { Service } from '@essentials/common';
import { Middleware } from './middleware';
import { HttpRequest, HttpResponse } from 'uWebSockets.js';
import { MiddlewareFunctionType } from '../http.factory';
import { URLSearchParams } from 'url';

export interface WithQuery {
  rawQuery: string;
  queries: URLSearchParams;
  getQuery(key: string): string | undefined;
  getQueryAll(key: string): Array<string>;
}

@Service()
export class LoadQueriesMiddleware implements Middleware {
  use(res: HttpResponse, req: HttpRequest, next: MiddlewareFunctionType) {
    const rawQuery = req.getQuery();
    res.queries = new URLSearchParams(rawQuery);
    res.rawQuery = rawQuery;
    res.getQuery = (key: string) => {
      return res.queries.get(key);
    };
    res.getQueryAll = (key: string) => {
      return res.queries.getAll(key);
    };
    return next(res, req);
  }
}
