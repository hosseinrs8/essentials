import * as Sentry from '@sentry/node';
import { ConfigService } from '../config/config.service';
import { SentryConfig } from './sentry.config.interface';
import * as Integrations from '@sentry/integrations';
import { Context } from '@sentry/types';
import { Service } from 'typedi';
import { existsSync, readFileSync } from 'fs';

const SENTRY_SHUTDOWN_TIMEOUT = 10 * 1000;

@Service()
export class SentryService {
  constructor(private readonly configService: ConfigService) {
    this.boot();
  }

  boot() {
    const packages = existsSync('./package.json')
      ? JSON.parse(readFileSync('./package.json').toString())
      : {
          name: 'unknown',
          version: 'unknown',
        };
    const config = this.configService.get<SentryConfig>('sentry');
    Sentry.init({
      dsn: config.dsn,
      environment: 'essentials',
      release: packages.name + '@' + packages.version,
      sampleRate: 1,
      tracesSampleRate: 1,
      integrations: [
        new Sentry.Integrations.Console(),
        Integrations.captureConsoleIntegration(),
        // new Integrations.Transaction(),
      ],
    });
  }

  createScope() {
    return new SentryClient();
  }

  async close() {
    return Sentry.close(SENTRY_SHUTDOWN_TIMEOUT);
  }
}

export class SentryClient {
  protected events: Array<(s: Sentry.Scope) => void> = [];

  addBreadcrumb<T>(category: string, data: T) {
    const now = Date.now();
    this.events.push((s) => {
      s.addBreadcrumb({
        category,
        timestamp: now,
        data: { ...data, now },
        type: 'action',
      });
    });
  }

  setUser(userId: string, ip: string) {
    this.events.push((s) => {
      s.setUser({
        id: userId.toString(),
        ip_address: ip,
      });
    });
  }

  setExtra<T>(key: string, value: T) {
    this.events.push((s) => {
      s.setExtra(key, value);
    });
  }

  setTag(key: string, value: string) {
    this.events.push((s) => {
      s.setTag(key, value);
    });
  }

  setContext(key: string, data: Context) {
    this.events.push((s) => {
      s.setContext(key, data);
    });
  }

  captureException(error: any) {
    Sentry.withScope((scope) => {
      this.events.forEach((eventCallback) => eventCallback(scope));
      Sentry.captureException(error);
    });
  }

  captureMessage(message: string) {
    Sentry.withScope((scope) => {
      this.events.forEach((eventCallback) => eventCallback(scope));
      Sentry.captureMessage(message);
    });
  }
}
