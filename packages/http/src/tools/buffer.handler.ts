import { Readable } from 'stream';
import { HttpResponse } from 'uWebSockets.js';
import { clearTimeout } from 'timers';

let globalRes: HttpResponse;
let globalReadStream: Readable;
let timeout: NodeJS.Timeout;

function setStreamTimeout() {
  timeout = setTimeout(() => {
    onAbortedOrFinishedResponse(globalRes, globalReadStream);
    // globalRes.close();
  }, 10000);
}

function clearStreamTimeout() {
  clearTimeout(timeout);
}

export function pipeStreamOverResponse(
  res: HttpResponse,
  readStream: Readable,
  totalSize: number,
): void {
  globalRes = res;
  globalReadStream = readStream;
  readStream
    .on('data', (chunk) => {
      res.cork(() => {
        const ab = toArrayBuffer(chunk as Buffer);
        const lastOffset = res.getWriteOffset();
        const [ok, done] = res.tryEnd(ab, totalSize);
        if (done) {
          onAbortedOrFinishedResponse(res, readStream);
        } else if (!ok) {
          readStream.pause();
          res.ab = ab;
          res.abOffset = lastOffset;
          retryWrite(res, readStream, totalSize, 3);
        }
      });
    })
    .on('error', (err) => {
      res.close();
      //might be nodeJs error
      throw err;
    });
  res.cork(() => {
    res.onAborted(() => {
      onAbortedOrFinishedResponse(res, readStream);
    });
  });
}

function retryWrite(
  res: HttpResponse,
  readStream: Readable,
  totalSize: number,
  retryTime = 0,
) {
  if (retryTime == 0) {
    return false;
  }
  setStreamTimeout();
  res.cork(() => {
    res.onWritable((offset) => {
      clearStreamTimeout();
      const [ok, done] = res.tryEnd(
        res.ab.slice(offset - res.abOffset),
        totalSize,
      );
      if (done) {
        onAbortedOrFinishedResponse(res, readStream);
      } else {
        if (ok) {
          readStream.resume();
        } else {
          retryWrite(res, readStream, retryTime - 1);
        }
      }
      return ok;
    });
  });
}

function toArrayBuffer(buffer: Buffer) {
  return buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength,
  );
}

function onAbortedOrFinishedResponse(res: HttpResponse, readStream: Readable) {
  if (res.id != -1) {
    readStream.destroy();
  }
  res.id = -1;
}
