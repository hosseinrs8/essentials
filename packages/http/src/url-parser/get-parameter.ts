import { HttpResponse } from 'uWebSockets.js';
import { WithParameters } from '../middlewares/load-parameters.middleware';
import { BadRequestException } from '@essentials/errors';

export type GetParameterOptions = {
  positive?: boolean;
  maxValue?: number;
  minValue?: number;
  maxLength?: number;
};

export function getParameter<T>(
  response: HttpResponse & WithParameters,
  index: number,
  type: (...args: any) => any & { name: string },
  config?: GetParameterOptions,
): T {
  const value = response.getParameter(index);
  if (!value) throw new BadRequestException('parameterUndefined');
  switch (type.name) {
    case 'Number':
      if (isNaN(Number(value)))
        throw new BadRequestException(`parameterShouldBeNumber: ${value}`);
      if (config) {
        if (config.positive && Number(value) < 0) {
          throw new BadRequestException(
            `parameterShouldBePositiveNumber: ${value}`,
          );
        }
        if (config.maxValue && Number(value) > config.maxValue) {
          throw new BadRequestException(`parameterIsBiggerThanMax: ${value}`);
        }
        if (config.minValue && Number(value) < config.minValue) {
          throw new BadRequestException(`parameterIsSmallerThanMin: ${value}`);
        }
        if (config.maxLength && value.length > config.maxLength) {
          throw new BadRequestException(`parameterIsSoBig: ${value}`);
        }
      }
      return parseInt(value) as T;
    case 'Boolean':
      if (!['true', 'false'].includes(value.toLowerCase()))
        throw new BadRequestException(`parameterShouldBeBoolean: ${value}`);
      return value.toLowerCase() === 'true'
        ? (type(true) as T)
        : (type(false) as T);
    case 'Date':
      new Date(value.toString());
      return new Date(value) as T;
    case 'BigInt':
      if (isNaN(Number(value)) && value[value.length - 1] !== 'n')
        throw new BadRequestException(`parameterShouldBeBigInt: ${value}`);
      else if (!isNaN(Number(value))) {
        return BigInt(Number(value)) as T;
      }
      return BigInt(Number(value.substring(0, value.length - 1))) as T;
    case 'UUID':
      const regex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!regex.test(value)) {
        throw new BadRequestException(`parameterShouldBeUUID: ${value}`);
      }
      return value as T;
    default:
      if (!/^[^\s`~!@#$%^&*()+={}\[\]|:;"'<>,?\/\\]*$/.test(value.toString()))
        throw new BadRequestException(`parameterShouldBeString: ${value}`);
      return value.toString() as T;
  }
}
