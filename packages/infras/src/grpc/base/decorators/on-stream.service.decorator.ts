export function OnRPCStream(type: string): MethodDecorator {
  return function (target, propertyKey) {
    Reflect.defineMetadata('rpc.stream.sub', type, target, propertyKey);
  };
}
