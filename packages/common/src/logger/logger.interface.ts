export interface Logger {
  error<T>(message: string, meta?: T): void;

  warn<T>(message: string, meta?: T): void;

  info<T>(message: string, meta?: T): void;

  http<T>(message: string, meta?: T): void;

  verbose<T>(message: string, meta?: T): void;

  debug<T>(message: string, meta?: T): void;

  silly<T>(message: string, meta?: T): void;
}
