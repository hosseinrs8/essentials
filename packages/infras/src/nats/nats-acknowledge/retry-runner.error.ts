export class RetryRunnerError extends Error {
  constructor(
    message: string,
    protected readonly lastError: unknown,
    protected readonly errors: Map<string, unknown>,
  ) {
    super(message);
  }
}
