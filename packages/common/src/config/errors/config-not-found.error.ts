export class ConfigNotFoundError extends Error {
  constructor(
    public configObject: any,
    public path: string,
    public target: string,
    public configPath: string,
  ) {
    super(`Config "${path}" not found`);
  }
}
