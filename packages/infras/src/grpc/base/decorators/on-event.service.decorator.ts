export function OnRPCEvent(type: string): MethodDecorator {
  return function (target, propertyKey) {
    Reflect.defineMetadata('rpc.event.sub', type, target, propertyKey);
  };
}
