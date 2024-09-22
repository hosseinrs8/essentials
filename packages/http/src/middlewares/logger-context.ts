import { readBody } from '../body-parser/read-body';
import { instanceToPlain } from 'class-transformer';
import https, { RequestOptions } from 'https';
import {
  ConfigService,
  Container,
  Logger,
  LogService,
} from '@essentials/common';
import { HttpResponse } from '../main';
import http from 'http';
import { LoggerConfiguredResponse } from './logger.middleware';
import { randomUUID } from 'node:crypto';

export const maskKeys = [
  'password',
  'oldpassword',
  'newpassword',
  'token',
  'accesstoken',
  'refreshtoken',
];

export function maskLogActivityPayload(payload: any): any {
  try {
    if (payload && typeof payload === 'object') {
      if (Array.isArray(payload)) {
        return payload.map((element) => maskLogActivityPayload(element));
      }
      for (const key of Object.keys(payload)) {
        if (maskKeys.includes(key.toLowerCase())) {
          payload[key] = '*****';
        } else {
          payload[key] = maskLogActivityPayload(payload[key]);
        }
      }
    } else if (payload === null) payload = undefined;
  } catch (e) {
    console.warn(`masking payload failed: ${(e as Error).message}`);
  }
  return payload;
}

export enum LogResourceType {
  bookmark = 'b',
  bridge = 'br',
  bridgeCamera = 'br-c',
  camera = 'c',
  cameraGroup = 'cg',
  clip = 'cl',
  map = 'm',
  metadata = 'md',
  payment = 'p',
  team = 't',
  user = 'u',
  workspace = 'w',
  schedule = 's',
}

export type AuthenticatedResponse = HttpResponse & {
  user: {
    userId?: string;
    tokenId?: string;
    workspaceId?: string;
  };
};

interface LogPayload {
  requestAt: number;
  method: string;
  url: string;
  workspaceId: string;
  userId: string;
  tokenId: string;
  resources: Array<{
    id: string;
    type: string;
  }>;
  resourceId: string;
  resourceType: string;
  request: unknown;
  response: unknown;
  status: number;
  clientIp: string;
  isImportant: boolean;
}

class ActionLogConfig {
  hostname?: string = undefined;
  port?: number;
  enabled?: boolean = false;
  tls?: {
    enabled?: boolean;
    keyPath?: string;
    certPath?: string;
    caPath?: string;
  };
}

export class LoggerContext {
  public payload: Partial<LogPayload> = {};
  private config: ActionLogConfig;
  protected logger: Logger;
  private randomId = randomUUID();

  protected constructor(method: string, url: string) {
    this.payload.url = url.toLowerCase();
    this.payload.method = method.toLowerCase();
    this.payload.requestAt = Date.now();
    this.payload.resources = [];
  }

  boot() {
    const config = Container.get(ConfigService);
    this.logger = Container.get(LogService).createServiceLogger(
      this.constructor.name,
    );
    try {
      this.config = config.get<ActionLogConfig>('action-log', {
        enabled: false,
        tls: {
          enabled: false,
        },
      });
    } catch (e) {
      this.logger.warn('loggerContext:BootFailed', {
        error: (e as Error).message,
      });
      this.config = {
        enabled: false,
        tls: {
          enabled: false,
        },
      };
    }
  }

  static request(method: string, url: string) {
    return new LoggerContext(method, url);
  }

  async publish(
    response: LoggerConfiguredResponse,
    responseBody: any,
  ): Promise<void> {
    try {
      if (this.config?.enabled && !this.ignore(response, responseBody)) {
        this.logger.silly('start publishing the request log activity', {
          url: this.payload.url,
          method: this.payload.method,
          requestAt: this.payload.requestAt,
          randomId: this.randomId,
        });
        await this.fillRequest(response);
        this.fillResponse(responseBody);
        this.fillGeneralInfo(response, responseBody);
        this.fillResources(response, responseBody, this.payload.request);
        this.hidePayload(response);

        this.publishToLogger()
          .then()
          .catch((e) =>
            this.logger.error('SendingActionLogsFailed', {
              error: (e as Error).message,
              config: this.config,
              randomId: this.randomId,
            }),
          );
      }
    } catch (e) {
      this.logger.error('something went wrong', {
        error: e,
        randomId: this.randomId,
      });
    }
  }

  private ignore(
    response: LoggerConfiguredResponse,
    responseBody: any,
  ): boolean {
    if (
      !response?.user ||
      !response.user?.userId ||
      response.user.userId === ''
    )
      return true;

    if (response?.loggerExtractor?.config?.ignore !== undefined) {
      if (typeof response.loggerExtractor.config.ignore === 'boolean') {
        return response.loggerExtractor.config.ignore;
      } else if (typeof response.loggerExtractor.config.ignore === 'function') {
        return response.loggerExtractor.config.ignore(responseBody);
      }
    }

    return false;
  }

  private async fillRequest(response: LoggerConfiguredResponse): Promise<void> {
    this.payload.request = {};
    let rawRequest;

    try {
      rawRequest = await readBody(response as HttpResponse);
    } catch (e) {
      return;
    }

    if (rawRequest) {
      try {
        this.payload.request = JSON.parse(rawRequest.toString('utf-8'));
      } catch (e) {
        if (e instanceof Error) {
          this.logger.warn(`couldn't parse request`, {
            error: e,
            randomId: this.randomId,
          });
        }
        this.payload.request = {};
      }
    }
  }

  private fillResponse(responseBody: any): void {
    if (this.payload.url === '/api/action-logs/resource')
      this.payload.response = 'Related Data.';
    else this.payload.response = instanceToPlain(responseBody) || {};
  }

  private hidePayload(response: LoggerConfiguredResponse): void {
    if (response?.loggerExtractor?.config?.hideRes)
      this.payload.response = 'Related Data.';
    if (response?.loggerExtractor?.config?.hideReq)
      this.payload.request = 'Related Data.';
  }

  private fillGeneralInfo(
    response: LoggerConfiguredResponse,
    responseBody: any,
  ): void {
    if (responseBody?.status && typeof responseBody.status === 'number') {
      this.payload.status = responseBody.status;
    } else {
      this.payload.status = this.payload.method === 'post' ? 201 : 200;
    }
    this.payload.clientIp = response?.clientIp ? response.clientIp : '';
    this.payload.userId = response?.user?.userId ? response.user.userId : '';
    this.payload.tokenId = response?.user?.tokenId ? response.user.tokenId : '';
    this.payload.workspaceId = response?.user?.workspaceId
      ? response.user.workspaceId
      : '';
  }

  private fillResources(
    response: LoggerConfiguredResponse,
    responseBody: unknown,
    requestBody?: unknown,
  ): void {
    try {
      this.payload.isImportant =
        response?.loggerExtractor?.isImportant || false;

      this.pushToResources(this.payload.userId, LogResourceType.user);

      if (response?.loggerExtractor?.justUser) {
        this.payload.workspaceId = '';
        this.fillMainResource(this.payload.userId, LogResourceType.user);
        return;
      }

      this.fillBodyResources(response, responseBody);
      this.fillRequestBodyResources(response, requestBody);
      this.fillParametersResources(response);
      this.fillQueriesResources(response);
      this.fillCustomResources(response, responseBody, requestBody);
      this.checkWorkspaceMiddleware(response);
      this.fillPaymentResources(response);

      this.pushToResources(
        this.payload?.workspaceId,
        LogResourceType.workspace,
      );
    } catch (e) {
      this.payload.resources = [];
    }

    if (!this.payload?.resourceId || !this.payload?.resourceType)
      this.fillMainResource(
        this.payload.workspaceId,
        LogResourceType.workspace,
      );
  }

  private fillBodyResources(
    response: LoggerConfiguredResponse,
    responseBody: unknown,
  ): void {
    if (response.loggerExtractor?.body) {
      try {
        if (response.loggerExtractor.body.considerAsArray) {
          (responseBody as Array<unknown>).map(
            (resBody) =>
              response.loggerExtractor.body &&
              this.pushToResources(
                response.loggerExtractor.body.mapIdFunction(resBody),
                typeof response.loggerExtractor.body.mapTypeFunction ===
                  'string'
                  ? response.loggerExtractor.body.mapTypeFunction
                  : response.loggerExtractor.body.mapTypeFunction(resBody),
              ),
          );
        } else {
          const id = response.loggerExtractor.body.mapIdFunction(responseBody);
          const type =
            typeof response.loggerExtractor.body.mapTypeFunction === 'string'
              ? response.loggerExtractor.body.mapTypeFunction
              : response.loggerExtractor.body.mapTypeFunction(responseBody);
          this.pushToResources(id, type);
          response.loggerExtractor?.body?.isMain &&
            this.fillMainResource(id, type);
        }
      } catch (e) {
        this.logger.error(`can't extract the resource`, {
          error: e,
          randomId: this.randomId,
        });
      }
    }
  }

  private fillRequestBodyResources(
    response: LoggerConfiguredResponse,
    requestBody?: unknown,
  ): void {
    if (response.loggerExtractor?.requestBody) {
      try {
        const id =
          response.loggerExtractor.requestBody.mapIdFunction(requestBody);
        const type =
          typeof response.loggerExtractor.requestBody.mapTypeFunction ===
          'string'
            ? response.loggerExtractor.requestBody.mapTypeFunction
            : response.loggerExtractor.requestBody.mapTypeFunction(requestBody);
        this.pushToResources(id, type);
        this.fillMainResource(id, type);
      } catch (e) {
        this.logger.error(`can't extract the resource`, {
          error: e,
          randomId: this.randomId,
        });
      }
    }
  }

  private fillParametersResources(response: LoggerConfiguredResponse): void {
    if (response.loggerExtractor?.parameters) {
      const id = response.loggerExtractor.parameters?.mapIdFunction;
      const type = response.loggerExtractor.parameters?.mapTypeFunction;
      this.pushToResources(id, type);
      this.fillMainResource(id, type);
    }
  }

  private fillQueriesResources(response: LoggerConfiguredResponse): void {
    if (response.loggerExtractor?.query) {
      const id = response.loggerExtractor.query.mapIdFunction;
      const type = response.loggerExtractor.query.mapTypeFunction;
      this.pushToResources(id, type);
      this.fillMainResource(id, type);
    }
  }

  private fillCustomResources(
    response: LoggerConfiguredResponse,
    responseBody: unknown,
    requestBody?: unknown,
  ): void {
    if (response.loggerExtractor?.custom) {
      try {
        const resources = response.loggerExtractor.custom.runner(
          responseBody,
          requestBody,
        );

        resources?.forEach((res) => {
          res?.isMain && this.fillMainResource(res.id, res.type);
        });

        if (this.payload?.resources?.length) {
          resources?.forEach((res) => {
            this.payload.resources?.push(res);
          });
        } else {
          this.payload.resources = resources;
        }
      } catch (e) {
        this.logger.error(`can't extract the resource`, {
          error: e,
          randomId: this.randomId,
        });
      }
    }
  }

  private fillPaymentResources(response: LoggerConfiguredResponse): void {
    if (response.loggerExtractor?.payment) {
      if (this.payload?.workspaceId) {
        this.pushToResources(
          this.payload?.workspaceId,
          LogResourceType.payment,
        );
      }
      this.fillMainResource(this.payload?.workspaceId, LogResourceType.payment);
    }
  }

  private checkWorkspaceMiddleware(response: LoggerConfiguredResponse): void {
    if (response.loggerExtractor?.considerResourceIdAsWorkspaceId) {
      if (this.payload?.resourceId) {
        this.payload.workspaceId = this.payload.resourceId;
      }
    }
  }

  private pushToResources(
    id: string | undefined,
    type: string | undefined,
  ): void {
    if (id && type) {
      this.payload.resources?.push({ id, type });
    }
  }

  private fillMainResource(
    id: string | undefined,
    type: string | undefined,
  ): void {
    if (id && type) {
      this.payload.resourceId = id;
      this.payload.resourceType = type;
    }
  }

  private async publishToLogger() {
    if (this.config?.hostname) {
      return new Promise((resolve, reject) => {
        const stringifyPayload = JSON.stringify(
          maskLogActivityPayload(this.payload) || {},
        );
        let protocol;
        if (this.config?.tls?.enabled) {
          protocol = https;
        } else {
          protocol = http;
        }
        if (this.config.hostname) {
          const requestOptions: RequestOptions = {
            hostname: this.config.hostname,
            method: 'POST',
            headers: {
              'Content-Type': 'application/json; charset=utf-8',
              'Content-Length': Buffer.byteLength(stringifyPayload),
            },
            port: this.config?.port || 80,
            path: '/api/internal/http',
          };
          if (this.config?.tls?.enabled) {
            if (this.config.tls?.certPath)
              requestOptions.cert = ConfigService.readFileSync(
                this.config.tls.certPath,
              );
            if (this.config.tls?.keyPath)
              requestOptions.key = ConfigService.readFileSync(
                this.config.tls.keyPath,
              );
            if (this.config.tls?.caPath)
              requestOptions.ca = ConfigService.readFileSync(
                this.config.tls.caPath,
              );
          }
          const req = protocol.request(requestOptions, (res) => {
            this.logger.silly('return response of target service', {
              statusCode: res.statusCode,
              statusMessage: res.statusMessage,
              randomId: this.randomId,
            });
            if (res.statusCode === 200) {
              res.setEncoding('utf8');
              res.on('close', () => {
                // this.logger.silly('response closed');
              });
              res.on('error', (error) => {
                this.logger.silly('get response from log collector failed', {
                  error,
                  randomId: this.randomId,
                });
                reject(error);
              });
            }
          });
          req.on('error', (error) => {
            this.logger.error('send request to log collector failed', {
              randomId: this.randomId,
            });
            reject(error);
          });
          req.write(stringifyPayload);
          // req.setTimeout(5_000, () => {
          //   this.logger.error('request to log collector timeout');
          //   req.destroy();
          //   reject('request timeout');
          // });
          req.end();
          this.logger.silly('request sent successfully', {
            config: this.config,
            randomId: this.randomId,
          });
        }
      });
    } else {
      this.logger.error('NotBootedYet', {
        config: this.config,
        randomId: this.randomId,
      });
    }
  }
}
