import { RetryRunnerError } from './retry-runner.error';
import { Container, Logger, LogService } from '@essentials/common';

export class RetryRunner<T = unknown> {
  protected retryCount = 0;
  protected running = false;
  public errors: Map<string, unknown> = new Map();
  protected logger: Logger;

  constructor(
    protected readonly job: () => Promise<T>,
    protected readonly maxRetry = 30,
    protected readonly delayFactor = 500,
    protected readonly maxDelay = 30000,
  ) {
    this.logger = Container.get(LogService).createServiceLogger(
      this.constructor.name,
    );
  }

  public static sleep(time: number): Promise<void> {
    return new Promise((r) => setTimeout(r, time));
  }

  protected calculateSleepTime(): number {
    return Math.min(this.delayFactor * this.retryCount, this.maxDelay);
  }
  protected async internalRun(): Promise<T> {
    try {
      this.logger.debug('running job');
      const result = await this.job();
      this.retryCount = 0;
      this.running = false;
      return result;
    } catch (e) {
      this.logger.debug('job failed');
      this.errors.set(new Date().toISOString(), e);
      this.retryCount++;
      if (this.maxRetry > this.retryCount) {
        const sleepTime = this.calculateSleepTime();
        this.logger.debug('sleep', { time: sleepTime });
        await RetryRunner.sleep(sleepTime);
        return this.internalRun();
      } else {
        this.logger.debug('runner exhausted', {
          retryCount: this.retryCount,
          maxRetry: this.maxRetry,
        });
        this.running = false;
        throw new RetryRunnerError((e as Error).message, e, this.errors);
      }
    }
  }

  public run(): Promise<T> {
    if (!this.running) {
      this.logger.debug('start running job');
      this.running = true;
      return this.internalRun();
    } else {
      this.logger.error('Runner is already in use!');
      throw new Error('Runner is already in use!');
    }
  }
}
