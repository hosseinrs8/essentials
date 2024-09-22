import { HttpResponse } from 'uWebSockets.js';

export function readBody(response: HttpResponse): Promise<Buffer> {
  if (response.bodyPromise) {
    return response.bodyPromise;
  } else throw new Error('you didnt register LoadBodyMiddleware!');
}
