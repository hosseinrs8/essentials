import { HttpResponse } from 'uWebSockets.js';
import { WithQuery } from '../middlewares/load-queries.middleware';
import { BadRequestException } from '@essentials/errors';

export function getQuery<T>(
  response: HttpResponse & WithQuery,
  key: string,
  type: (...args: any) => any & { name: string },
  config?: any,
): T | undefined {
  const query = response.getQuery(key);
  if (query) {
    switch (type.name) {
      case 'Number':
        if (isNaN(Number(query)))
          throw new BadRequestException(`queryShouldBeNumber: ${query}`);
        if (config) {
          if (config.positive && Number(query) < 0) {
            throw new BadRequestException(
              `queryShouldBePositiveNumber: ${query}`,
            );
          }
          if (config.maxLength && query.length > config.maxLength) {
            throw new BadRequestException(`queryIsSoBig: ${query}`);
          }
        }
        return parseInt(query) as T;
      case 'Boolean':
        if (!['true', 'false'].includes(query.toLowerCase()))
          throw new BadRequestException(`queryShouldBeBoolean: ${query}`);
        return query.toLowerCase() === 'true'
          ? (type(true) as T)
          : (type(false) as T);
      case 'Date':
        new Date(query.toString());
        return new Date(query) as T;
      case 'BigInt':
        if (isNaN(Number(query)) && query[query.length - 1] !== 'n')
          throw new BadRequestException(`queryShouldBeBigInt: ${query}`);
        else if (!isNaN(Number(query))) {
          return BigInt(Number(query)) as T;
        }
        return BigInt(Number(query.substring(0, query.length - 1))) as T;
      case 'UUID':
        const regex =
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!regex.test(query)) {
          throw new BadRequestException(`queryShouldBeUUID: ${query}`);
        }
        return query as T;
      default:
        if (!/^[^\s`~!@#$%^&*()+={}\[\]|:;"'<>,?\/\\]*$/.test(query.toString()))
          throw new BadRequestException(`queryShouldBeString: ${query}`);
        return query.toString() as T;
    }
  }
  return undefined;
}
