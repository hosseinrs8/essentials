import { HttpResponse } from 'uWebSockets.js';
import { ClassConstructor } from 'class-transformer/types/interfaces';
import { readBody } from './read-body';
import { parseJson } from './parse-json';

export function getBody<T>(
  response: HttpResponse,
  validator: ClassConstructor<T>,
): Promise<T> {
  return readBody(response).then((buf) => parseJson<T>(buf, validator));
}
