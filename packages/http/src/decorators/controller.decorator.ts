export function Controller(prefix = ''): ClassDecorator {
  // eslint-disable-next-line @typescript-eslint/ban-types
  return (target: Function) => {
    if (!prefix.startsWith('/')) {
      prefix = '/' + prefix;
    }
    Reflect.defineMetadata('http.route.prefix', prefix, target.prototype);
  };
}
