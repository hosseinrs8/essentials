import { Container, Logger, LogService, Service } from '@essentials/common';
import { Middleware } from './middleware';
import { HttpRequest, HttpResponse } from 'uWebSockets.js';
import { MiddlewareFunctionType } from '../http.factory';

export interface WithParameters {
  parameters: Array<string>;

  getParameter(index: number): string | undefined;
}

@Service()
export class LoadParametersMiddleware implements Middleware {
  protected logger: Logger;

  constructor() {
    this.logger = Container.get(LogService).createServiceLogger(
      this.constructor.name,
    );
  }

  use(res: HttpResponse, req: HttpRequest, next: MiddlewareFunctionType) {
    this.logger.debug(`middleware, loading parameters`);
    const parameters: Array<string> = [];
    let i = 0;
    while (true) {
      const value = req.getParameter(i);
      if (value?.length && value.length > 0) {
        parameters.push(value);
        i++;
      } else break;
    }
    res.parameters = parameters;
    res.getParameter = (index: number) => {
      return parameters[index];
    };
    return next(res, req);
  }
}
