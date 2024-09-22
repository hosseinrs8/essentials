export function OnRPCRequest(type: string): MethodDecorator {
  return function (target, propertyKey) {
    Reflect.defineMetadata('rpc.request.sub', type, target, propertyKey);
  };
}
