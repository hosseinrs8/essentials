import { createServer, Server } from 'http';
import { URL } from 'url';
import {
  collectDefaultMetrics,
  Counter,
  CounterConfiguration,
  Gauge,
  GaugeConfiguration,
  Histogram,
  HistogramConfiguration,
  register,
  Registry,
  Summary,
  SummaryConfiguration,
} from 'prom-client';
import { LogService } from '../logger/log.service';
import { Service } from 'typedi';
import { ConfigService } from '../config/config.service';
import { Logger } from '../logger/logger.interface';
import {
  MetricConfigInterface,
  metricConfigRootKey,
} from './metric.config.interface';

@Service()
export class MetricService {
  private server: Server;
  private readonly registry: Registry;
  private readonly serverPath: string;
  private readonly serverAddress: string;
  private readonly serverPort: number;
  private readonly namePrefix: string;
  protected isBooted = false;
  protected logger: Logger;

  constructor(
    private readonly logService: LogService,
    configService: ConfigService,
  ) {
    this.logger = logService.createServiceLogger(this.constructor.name);
    this.registry = new Registry();
    const configs =
      configService.get<MetricConfigInterface>(metricConfigRootKey);
    this.namePrefix = configs.namePrefix;
    this.serverPath = configs.serverPath;
    this.serverAddress = configs.serverHost;
    this.serverPort = configs.serverPort;
    if (configs.enabled) {
      this.boot();
      if (configs.collectDefaultMetrics) {
        this.registerDefaultMetrics();
      }
    }
  }

  registerDefaultMetrics() {
    collectDefaultMetrics({ register: this.registry });
    this.logger.verbose('Default Metrics registered');
  }

  boot() {
    if (!this.isBooted) {
      this.isBooted = true;
      this.logger.debug(`boot`);
      return this.runServer();
    }
  }

  histogram<T extends string>(
    config: Omit<HistogramConfiguration<T>, 'registers'>,
  ) {
    config.name = this.namePrefix + config.name;
    const tmp = register.getSingleMetric(config.name);
    if (tmp) {
      return tmp as Histogram<T>;
    }
    const result = new Histogram({ ...config, registers: [this.registry] });
    register.registerMetric(result);
    this.logger.debug('create histogram', { config: config });
    return result;
  }

  summary<T extends string>(
    config: Omit<SummaryConfiguration<T>, 'registers'>,
  ) {
    config.name = this.namePrefix + config.name;
    const tmp = register.getSingleMetric(config.name);
    if (tmp) {
      return tmp as Summary<T>;
    }
    const result = new Summary({ ...config, registers: [this.registry] });
    register.registerMetric(result);
    this.logger.debug('summary', { config: config });
    return result;
  }

  counter<T extends string>(
    config: Omit<CounterConfiguration<T>, 'registers'>,
  ) {
    config.name = this.namePrefix + config.name;
    const tmp = register.getSingleMetric(config.name);
    if (tmp) {
      return tmp as Counter<T>;
    }
    const result = new Counter({ ...config, registers: [this.registry] });
    register.registerMetric(result);
    this.logger.debug('create counter', { config: config });
    return result;
  }

  gauge<T extends string>(
    config: Omit<GaugeConfiguration<T>, 'registers'>,
  ): Gauge<T> {
    config.name = this.namePrefix + config.name;
    const tmp = register.getSingleMetric(config.name);
    if (tmp) {
      return tmp as Gauge<T>;
    }
    const result = new Gauge({ ...config, registers: [this.registry] });
    register.registerMetric(result);
    this.logger.debug('create gauge', { config: config });
    return result;
  }

  getMetrics() {
    return this.registry.metrics();
  }

  getRegister() {
    return this.registry;
  }

  private runServer() {
    this.logger.debug('running metric server');
    this.server = createServer(async (req, res) => {
      if (req.url) {
        const url = new URL(req.url, `http://${req.headers.host}`);
        const route = url.pathname;
        if (route === this.serverPath) {
          const data = await this.registry.metrics();
          res.setHeader('Content-Type', register.contentType);
          res.end(data);
          this.logger.silly('metrics requested', {
            clientIp: req.socket.remoteAddress,
          });
        } else {
          this.logger.warn(`path not match`, {
            route,
            server: this.serverPath,
          });
          res.statusCode = 403;
          res.end();
        }
      } else {
        this.logger.warn(`server didn't create (url not found). status: 403`);
        res.statusCode = 403;
        res.end();
      }
    });
    this.server.listen(this.serverPort, this.serverAddress, () => {
      this.logger.verbose('metric server initialized.', {
        port: this.serverPort,
        hostname: this.serverAddress,
        path: this.serverPath,
      });
    });
  }
}
