import { MiddlewareType } from '../http.factory';

export function UseMiddleware(
  ...middleware: Array<MiddlewareType>
): MethodDecorator & ClassDecorator {
  return (
    target: any,
    key?: string | symbol,
    descriptor?: TypedPropertyDescriptor<any>,
  ) => {
    let tmp: Array<MiddlewareType> =
      Reflect.getMetadata('http.route.middleware', target) || [];
    if (descriptor && key) {
      // method
      tmp = Reflect.getMetadata('http.route.middleware', target, key) || [];
      Reflect.defineMetadata(
        'http.route.middleware',
        tmp.concat(middleware),
        target,
        key,
      );
      return descriptor;
    }
    // class
    Reflect.defineMetadata(
      'http.route.middleware',
      tmp.concat(middleware),
      target,
      target.prototype,
    );
    return target;
  };
}
