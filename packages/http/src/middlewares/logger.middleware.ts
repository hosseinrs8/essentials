import { Container, Logger, LogService, Service } from '@essentials/common';
import { Middleware } from './middleware';
import { HttpRequest, HttpResponse } from 'uWebSockets.js';
import { MiddlewareFunctionType } from '../http.factory';
import { AuthenticatedResponse } from './logger-context';

export type LogResourceInterface = {
  id: string;
  type: string;
  isMain?: boolean;
};

export interface LoggerResourceExtractor {
  justUser?: boolean;
  body?: {
    mapIdFunction: (response: any) => string | undefined;
    mapTypeFunction: string | ((response: any) => string | undefined);
    considerAsArray: boolean;
    isMain?: boolean;
  };
  requestBody?: {
    mapIdFunction: (request: any) => string | undefined;
    mapTypeFunction: string | ((request: any) => string | undefined);
  };
  parameters?: {
    mapIdFunction: string;
    mapTypeFunction: string;
  };
  query?: {
    mapIdFunction: string;
    mapTypeFunction: string;
  };
  custom?: {
    runner: (response: any, request: any) => Array<LogResourceInterface>;
  };
  payment?: boolean;
  considerResourceIdAsWorkspaceId?: boolean;
  isImportant: boolean;
  config?: LoggerMiddlewareConfig;
}

export type LoggerConfiguredResponse = (
  | AuthenticatedResponse
  | {
      user: {
        userId?: string;
        tokenId?: string;
        workspaceId?: string;
      };
      clientIp?: string;
    }
) & {
  loggerExtractor: LoggerResourceExtractor;
};

export type LoggerMiddlewareConfig = {
  hideRes?: boolean;
  hideReq?: boolean;
  ignore?: boolean | ((response: any) => boolean);
};

@Service()
export class LoggerMiddlewareUser implements Middleware {
  protected logger: Logger;
  protected important = false;
  protected config?: LoggerMiddlewareConfig;

  constructor(important = false, config?: LoggerMiddlewareConfig) {
    this.important = important;
    this.config = config;
    this.logger = Container.get(LogService).createServiceLogger(
      this.constructor.name,
    );
  }

  static args(important = false, config?: LoggerMiddlewareConfig) {
    return new LoggerMiddlewareUser(important, config);
  }

  use(res: HttpResponse, req: HttpRequest, next: MiddlewareFunctionType) {
    try {
      if (res?.loggerExtractor) {
        res.loggerExtractor['justUser'] = true;
        res.loggerExtractor['isImportant'] = this.important;
        res.loggerExtractor['config'] = this.config;
      } else {
        res.loggerExtractor = {
          justUser: true,
          isImportant: this.important,
          config: this.config,
        };
      }
    } catch (e) {
      this.logger.error(`can't extract the resource`, { error: e });
    }

    return next(res, req);
  }
}

@Service()
export class LoggerMiddlewareBody implements Middleware {
  protected logger: Logger;
  protected mapIdFunction: (response: any) => string | undefined;
  protected mapTypeFunction: string | ((response: any) => string | undefined);
  protected considerAsArray = false;
  protected isMain = true;
  protected important = false;
  protected config?: LoggerMiddlewareConfig;

  constructor(
    mapIdFunction: (response: any) => string | undefined,
    mapTypeFunction: string | ((response: any) => string | undefined),
    considerAsArray = false,
    isMain = true,
    important = false,
    config?: LoggerMiddlewareConfig,
  ) {
    this.mapIdFunction = mapIdFunction;
    this.mapTypeFunction = mapTypeFunction;
    this.considerAsArray = considerAsArray;
    this.config = config;
    this.isMain = isMain;
    this.important = important;

    this.logger = Container.get(LogService).createServiceLogger(
      this.constructor.name,
    );
  }

  static args(
    mapIdFunction: (response: any) => string | undefined,
    mapTypeFunction: string | ((response: any) => string | undefined),
    considerAsArray = false,
    isMain = true,
    important = false,
    config?: LoggerMiddlewareConfig,
  ) {
    return new LoggerMiddlewareBody(
      mapIdFunction,
      mapTypeFunction,
      considerAsArray,
      isMain,
      important,
      config,
    );
  }

  use(res: HttpResponse, req: HttpRequest, next: MiddlewareFunctionType) {
    try {
      if (res?.loggerExtractor) {
        res.loggerExtractor['body'] = {
          mapIdFunction: this.mapIdFunction,
          mapTypeFunction: this.mapTypeFunction,
          considerAsArray: this.considerAsArray,
          isMain: this.isMain,
        };
        res.loggerExtractor['isImportant'] = this.important;
        res.loggerExtractor['config'] = this.config;
      } else {
        res.loggerExtractor = {
          body: {
            mapIdFunction: this.mapIdFunction,
            mapTypeFunction: this.mapTypeFunction,
            considerAsArray: this.considerAsArray,
            isMain: this.isMain,
          },
          isImportant: this.important,
          config: this.config,
        };
      }
    } catch (e) {
      this.logger.error(`can't extract the resource`, { error: e });
    }

    return next(res, req);
  }
}

@Service()
export class LoggerMiddlewareBodyRequest implements Middleware {
  protected logger: Logger;
  protected mapIdFunction: (request: any) => string | undefined;
  protected mapTypeFunction: string | ((request: any) => string | undefined);
  protected important = false;
  protected config?: LoggerMiddlewareConfig;

  constructor(
    mapIdFunction: (request: any) => string | undefined,
    mapTypeFunction: string | ((request: any) => string | undefined),
    important = false,
    config?: LoggerMiddlewareConfig,
  ) {
    this.mapIdFunction = mapIdFunction;
    this.mapTypeFunction = mapTypeFunction;
    this.config = config;
    this.important = important;
    this.logger = Container.get(LogService).createServiceLogger(
      this.constructor.name,
    );
  }

  static args(
    mapIdFunction: (request: any) => string | undefined,
    mapTypeFunction: string | ((request: any) => string | undefined),
    important = false,
    config?: LoggerMiddlewareConfig,
  ) {
    return new LoggerMiddlewareBodyRequest(
      mapIdFunction,
      mapTypeFunction,
      important,
      config,
    );
  }

  use(res: HttpResponse, req: HttpRequest, next: MiddlewareFunctionType) {
    try {
      if (res?.loggerExtractor) {
        res.loggerExtractor['requestBody'] = {
          mapIdFunction: this.mapIdFunction,
          mapTypeFunction: this.mapTypeFunction,
        };
        res.loggerExtractor['isImportant'] = this.important;
        res.loggerExtractor['config'] = this.config;
      } else {
        res.loggerExtractor = {
          requestBody: {
            mapIdFunction: this.mapIdFunction,
            mapTypeFunction: this.mapTypeFunction,
          },
          isImportant: this.important,
          config: this.config,
        };
      }
    } catch (e) {
      this.logger.error(`can't extract the resource`, { error: e });
    }

    return next(res, req);
  }
}

@Service()
export class LoggerMiddlewareParameters implements Middleware {
  protected logger: Logger;
  protected mapIdFunction: number;
  protected mapTypeFunction: string;
  protected important = false;
  protected config?: LoggerMiddlewareConfig;

  constructor(
    mapIdFunction: number,
    mapTypeFunction: string,
    important = false,
    config?: LoggerMiddlewareConfig,
  ) {
    this.mapIdFunction = mapIdFunction;
    this.mapTypeFunction = mapTypeFunction;
    this.important = important;
    this.config = config;

    this.logger = Container.get(LogService).createServiceLogger(
      this.constructor.name,
    );
  }

  static args(
    idIndex: number,
    type: string,
    important = false,
    config?: LoggerMiddlewareConfig,
  ) {
    return new LoggerMiddlewareParameters(idIndex, type, important, config);
  }

  use(res: HttpResponse, req: HttpRequest, next: MiddlewareFunctionType) {
    try {
      if (res?.loggerExtractor) {
        res.loggerExtractor['parameters'] = {
          mapIdFunction: res.parameters[this.mapIdFunction],
          mapTypeFunction: this.mapTypeFunction,
        };
        res.loggerExtractor['isImportant'] = this.important;
        res.loggerExtractor['config'] = this.config;
      } else {
        res.loggerExtractor = {
          parameters: {
            mapIdFunction: res.parameters[this.mapIdFunction],
            mapTypeFunction: this.mapTypeFunction,
          },
          isImportant: this.important,
          config: this.config,
        };
      }
    } catch (e) {
      this.logger.error(`can't extract the resource`, { error: e });
    }

    return next(res, req);
  }
}

@Service()
export class LoggerMiddlewareQuery implements Middleware {
  protected logger: Logger;
  protected mapIdFunction: string;
  protected mapTypeFunction: string;
  protected important = false;
  protected config?: LoggerMiddlewareConfig;

  constructor(
    mapIdFunction: string,
    mapTypeFunction: string,
    important = false,
    config?: LoggerMiddlewareConfig,
  ) {
    this.mapIdFunction = mapIdFunction;
    this.mapTypeFunction = mapTypeFunction;
    this.important = important;
    this.config = config;

    this.logger = Container.get(LogService).createServiceLogger(
      this.constructor.name,
    );
  }

  static args(
    mapIdFunction: string,
    mapTypeFunction: string,
    important = false,
    config?: LoggerMiddlewareConfig,
  ) {
    return new LoggerMiddlewareQuery(
      mapIdFunction,
      mapTypeFunction,
      important,
      config,
    );
  }

  use(res: HttpResponse, req: HttpRequest, next: MiddlewareFunctionType) {
    try {
      if (res?.loggerExtractor) {
        res.loggerExtractor['query'] = {
          mapIdFunction: res.queries.get(this.mapIdFunction),
          mapTypeFunction: this.mapTypeFunction,
        };
        res.loggerExtractor['isImportant'] = this.important;
        res.loggerExtractor['config'] = this.config;
      } else {
        res.loggerExtractor = {
          query: {
            mapIdFunction: res.queries.get(this.mapIdFunction),
            mapTypeFunction: this.mapTypeFunction,
          },
          isImportant: this.important,
          config: this.config,
        };
      }
    } catch (e) {
      this.logger.error(`can't extract the resource`, { error: e });
    }

    return next(res, req);
  }
}

@Service()
export class LoggerMiddlewareCustom implements Middleware {
  protected logger: Logger;
  protected runner: (res: any, req: any) => Array<LogResourceInterface>;
  protected important = false;
  protected config?: LoggerMiddlewareConfig;

  constructor(
    runner: (res: any, req: any) => Array<LogResourceInterface>,
    important = false,
    config?: LoggerMiddlewareConfig,
  ) {
    this.runner = runner;
    this.important = important;
    this.config = config;
    this.logger = Container.get(LogService).createServiceLogger(
      this.constructor.name,
    );
  }

  static args(
    runner: (res: any, req: any) => Array<LogResourceInterface>,
    important = false,
    config?: LoggerMiddlewareConfig,
  ) {
    return new LoggerMiddlewareCustom(runner, important, config);
  }

  use(res: HttpResponse, req: HttpRequest, next: MiddlewareFunctionType) {
    try {
      if (res?.loggerExtractor) {
        res.loggerExtractor['custom'] = {
          runner: this.runner,
        };
        res.loggerExtractor['isImportant'] = this.important;
        res.loggerExtractor['config'] = this.config;
      } else {
        res.loggerExtractor = {
          custom: {
            runner: this.runner,
          },
          isImportant: this.important,
          config: this.config,
        };
      }
    } catch (e) {
      this.logger.error(`can't extract the resource`, { error: e });
    }

    return next(res, req);
  }
}

@Service()
export class LoggerMiddlewarePayment implements Middleware {
  protected logger: Logger;
  protected important = false;
  protected config?: LoggerMiddlewareConfig;

  constructor(important = false, config?: LoggerMiddlewareConfig) {
    this.config = config;
    this.important = important;
    this.logger = Container.get(LogService).createServiceLogger(
      this.constructor.name,
    );
  }

  static args(important = false, config?: LoggerMiddlewareConfig) {
    return new LoggerMiddlewarePayment(important, config);
  }

  use(res: HttpResponse, req: HttpRequest, next: MiddlewareFunctionType) {
    try {
      if (res?.loggerExtractor) {
        res.loggerExtractor['payment'] = true;
        res.loggerExtractor['isImportant'] = this.important;
        res.loggerExtractor['config'] = this.config;
      } else {
        res.loggerExtractor = {
          payment: true,
          isImportant: this.important,
          config: this.config,
        };
      }
    } catch (e) {
      this.logger.error(`can't extract the resource`, { error: e });
    }

    return next(res, req);
  }
}

@Service()
export class LoggerMiddlewareWorkspace implements Middleware {
  protected logger: Logger;

  constructor() {
    this.logger = Container.get(LogService).createServiceLogger(
      this.constructor.name,
    );
  }

  static args() {
    return new LoggerMiddlewareWorkspace();
  }

  use(res: HttpResponse, req: HttpRequest, next: MiddlewareFunctionType) {
    try {
      if (res?.loggerExtractor) {
        res.loggerExtractor['considerResourceIdAsWorkspaceId'] = true;
      } else {
        res.loggerExtractor = {
          considerResourceIdAsWorkspaceId: true,
        };
      }
    } catch (e) {
      this.logger.error(`can't extract the resource`, { error: e });
    }

    return next(res, req);
  }
}
