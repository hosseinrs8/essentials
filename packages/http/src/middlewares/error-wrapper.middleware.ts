import { HttpRequest, HttpResponse, RecognizedString } from 'uWebSockets.js';
import { MiddlewareFunctionType } from '../http.factory';
import { instanceToPlain } from 'class-transformer';
import { HttpError } from '@essentials/errors';
import { calculateRemoteIp } from '../utils/ip-utilities';
import { setSecurityHeaders } from './security-utilities';
import { pipeStreamOverResponse } from '../tools/buffer.handler';
import { LoggerContext } from './logger-context';
import { LoggerConfiguredResponse } from './logger.middleware';

export interface WithCustomStatus {
  status: RecognizedString;
}

export async function requestErrorWrapper(
  res: HttpResponse & { status?: RecognizedString },
  req: HttpRequest,
  next: MiddlewareFunctionType,
) {
  const method = req.getMethod();
  const url = req.getUrl();
  const log = LoggerContext.request(method, url);
  log.boot();
  res.clientIp = calculateRemoteIp(res, req);
  let isWrote = false;
  try {
    if (!res.hasReadStreamResponse) {
      res
        .onWritable(() => {
          isWrote = true;
          return true;
        })
        .onAborted(() => {
          isWrote = true;
        });
    }
    const response = await next(res, req);
    if (!isWrote) {
      res.cork(() => {
        setSecurityHeaders(res);
        if (response) {
          if (method === 'post') {
            res.writeStatus('201 Created');
          } else {
            res.writeStatus('200 OK');
          }
          if (res.hasReadStreamResponse) {
            res.writeHeader('Content-Type', response.fileMimeType);
            res.writeHeader(
              'Content-Disposition',
              `attachment; filename="${response.fileName}`,
            );
            if (response.dateTime)
              res.writeHeader('Date-Time', response.dateTime);
            const { readStream, totalSize, ...rest } = response;
            log
              .publish(
                {
                  user: { ...res.user },
                  loggerExtractor: { ...res.loggerExtractor },
                  clientIp: `${res.clientIp}`,
                } as LoggerConfiguredResponse,
                rest,
              )
              .then();
            pipeStreamOverResponse(res, readStream, totalSize);
          } else {
            res.writeHeader('content-type', 'application/json');
            log.publish(res as LoggerConfiguredResponse, response).then();
            res.end(JSON.stringify(instanceToPlain(response)));
          }
        } else {
          if (res.status) res.writeStatus(res.status);
          else res.writeStatus('204 No Content');
          log.publish(res as LoggerConfiguredResponse, {}).then();
          res.end();
        }
      });
    }
  } catch (e) {
    // todo send to sentry
    res.cork(() => {
      if (e instanceof HttpError) {
        res.writeStatus(e.statusText);
        res.writeHeader('content-type', 'application/json');
        log.publish(res as LoggerConfiguredResponse, e).then();
        res.end(e.payloadText);
      } else {
        console.log('error At', url, method);
        console.error(e);
        res.writeStatus('500 Internal Server Error');
        log
          .publish(res as LoggerConfiguredResponse, {
            status: 500,
            message: 'Something went wrong!',
          })
          .then();
        res.end('Internal Server Error');
      }
    });
  }
}
