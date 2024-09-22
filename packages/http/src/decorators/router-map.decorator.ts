export enum HTTPMethods {
  GET,
  POST,
  PUT,
  PATCH,
  DELETE,
}

export function Get(path = '/'): MethodDecorator {
  return function (target, propertyKey) {
    if (!path.startsWith('/')) {
      path = '/' + path;
    }
    Reflect.defineMetadata(
      'http.route.method',
      HTTPMethods.GET,
      target,
      propertyKey,
    );
    Reflect.defineMetadata('http.route.path', path, target, propertyKey);
  };
}

export function Post(path = '/'): MethodDecorator {
  return function (target, propertyKey) {
    if (!path.startsWith('/')) {
      path = '/' + path;
    }
    Reflect.defineMetadata(
      'http.route.method',
      HTTPMethods.POST,
      target,
      propertyKey,
    );
    Reflect.defineMetadata('http.route.path', path, target, propertyKey);
  };
}

export function Put(path = '/'): MethodDecorator {
  return function (target, propertyKey) {
    if (!path.startsWith('/')) {
      path = '/' + path;
    }
    Reflect.defineMetadata(
      'http.route.method',
      HTTPMethods.PUT,
      target,
      propertyKey,
    );
    Reflect.defineMetadata('http.route.path', path, target, propertyKey);
  };
}

export function Patch(path = '/'): MethodDecorator {
  return function (target, propertyKey) {
    if (!path.startsWith('/')) {
      path = '/' + path;
    }
    Reflect.defineMetadata(
      'http.route.method',
      HTTPMethods.PATCH,
      target,
      propertyKey,
    );
    Reflect.defineMetadata('http.route.path', path, target, propertyKey);
  };
}

export function Delete(path = '/'): MethodDecorator {
  return function (target, propertyKey) {
    if (!path.startsWith('/')) {
      path = '/' + path;
    }
    Reflect.defineMetadata(
      'http.route.method',
      HTTPMethods.DELETE,
      target,
      propertyKey,
    );
    Reflect.defineMetadata('http.route.path', path, target, propertyKey);
  };
}

export function OnConnect(): MethodDecorator {
  return function (target, propertyKey) {
    Reflect.defineMetadata('ws.io.connect', true, target, propertyKey);
  };
}

export function OnMessage(): MethodDecorator {
  return function (target, propertyKey) {
    Reflect.defineMetadata('ws.io.message', true, target, propertyKey);
  };
}

export function OnClose(): MethodDecorator {
  return function (target, propertyKey) {
    Reflect.defineMetadata('ws.io.close', true, target, propertyKey);
  };
}

export function OnUpgrade(): MethodDecorator {
  return function (target, propertyKey) {
    Reflect.defineMetadata('ws.io.upgrade', true, target, propertyKey);
  };
}

export function OnPing(): MethodDecorator {
  return function (target, propertyKey) {
    Reflect.defineMetadata('ws.io.ping', true, target, propertyKey);
  };
}

export function OnPong(): MethodDecorator {
  return function (target, propertyKey) {
    Reflect.defineMetadata('ws.io.pong', true, target, propertyKey);
  };
}

export function OnSubject(subject: string): MethodDecorator {
  return function (target, propertyKey) {
    const tmp: Array<string> =
      Reflect.getMetadata('ws.io.subject', target) || [];
    tmp.push(subject);
    Reflect.defineMetadata('ws.io.subject', tmp, target, propertyKey);
  };
}
