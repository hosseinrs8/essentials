import { ClassConstructor } from 'class-transformer/types/interfaces';
import { Logger } from '@essentials/common';
import { plainToInstance } from '../tools/transformer';
import { validateOrReject } from '../tools/validator';
import { BadRequestException } from '@essentials/errors';

export async function validateObject<T>(
  data: any,
  validator: ClassConstructor<T>,
  logger: Logger | Console = console,
): Promise<boolean> {
  try {
    const instance = plainToInstance<T, object>(validator, data);
    await validateOrReject(instance);
    return true;
  } catch (e) {
    logger.warn('bad data dto', { error: (e as Error).message, data: data });
    throw new BadRequestException(data);
  }
}
