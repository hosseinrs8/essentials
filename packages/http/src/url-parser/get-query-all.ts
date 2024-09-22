import { HttpResponse } from 'uWebSockets.js';
import { WithQuery } from '../middlewares/load-queries.middleware';
import { BadRequestException } from '@essentials/errors';

export function getQueryAll<T>(
  response: HttpResponse & WithQuery,
  key: string,
  type: (...args: any) => any & { name: string },
  config?: any,
): T[] {
  const query = response.getQueryAll(key);
  if (Array.isArray(query) && query.length > 0) {
    const queryParams: T[] = [];
    for (const queryParam of query) {
      switch (type.name) {
        case 'Number':
          if (isNaN(Number(queryParam)))
            throw new BadRequestException(`queryShouldBeNumber: ${queryParam}`);
          if (config) {
            if (config.positive && Number(queryParam) < 0) {
              throw new BadRequestException(
                `queryShouldBePositiveNumber: ${queryParam}`,
              );
            }
            if (config.maxLength && queryParam.length > config.maxLength) {
              throw new BadRequestException(`queryIsSoBig: ${queryParam}`);
            }
          }
          queryParams.push(parseInt(queryParam) as T);
          break;
        case 'Boolean':
          if (!['true', 'false'].includes(queryParam.toLowerCase()))
            throw new BadRequestException(
              `queryShouldBeBoolean: ${queryParam}`,
            );
          queryParam.toLowerCase() === 'true'
            ? queryParams.push(type(true) as T)
            : queryParams.push(type(false) as T);
          break;
        case 'Date':
          new Date(queryParam.toString());
          queryParams.push(new Date(queryParam) as T);
          break;
        case 'BigInt':
          if (
            isNaN(Number(queryParam)) &&
            queryParam[queryParam.length - 1] !== 'n'
          )
            throw new BadRequestException(`queryShouldBeBigInt: ${queryParam}`);
          else if (!isNaN(Number(queryParam))) {
            queryParams.push(BigInt(Number(queryParam)) as T);
          }
          queryParams.push(
            BigInt(Number(queryParam.substring(0, queryParam.length - 1))) as T,
          );
          break;
        case 'UUID':
          const regex =
            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
          if (!regex.test(queryParam)) {
            throw new BadRequestException(`queryShouldBeUUID: ${queryParam}`);
          }
          queryParams.push(queryParam as T);
          break;
        default:
          if (
            !/^[^\s`~!@#$%^&*()+={}\[\]|:;"'<>,?\/\\]*$/.test(
              queryParam.toString(),
            )
          )
            throw new BadRequestException(`queryShouldBeString: ${queryParam}`);
          queryParams.push(queryParam.toString() as T);
          break;
      }
    }
    return queryParams as T[];
  }
  throw new BadRequestException('queryUndefined');
}
