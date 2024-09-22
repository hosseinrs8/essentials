export function OnDuplexRequest(type: string): MethodDecorator {
  return function (target, propertyKey) {
    Reflect.defineMetadata('rpc.duplex.sub', type, target, propertyKey);
  };
}
