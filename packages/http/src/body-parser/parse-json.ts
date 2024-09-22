import { plainToInstance } from 'class-transformer';
import { validateOrReject, ValidationError } from 'class-validator';
import { ClassConstructor } from 'class-transformer/types/interfaces';
import { BadRequestException } from '@essentials/errors';

function extractError(error: ValidationError, payload: any = {}) {
  if (error.children?.length) {
    payload[error.property] = error.children.map((e) => extractError(e));
  } else {
    payload[error.property] = Object.keys(error.constraints || {});
  }
  return payload;
}

export async function parseJson<T>(
  data: Buffer | string,
  validator: ClassConstructor<T>,
): Promise<T> {
  try {
    const obj = JSON.parse(data.toString('utf8'));
    const instance = plainToInstance<T, object>(validator, obj);
    await validateOrReject(instance);
    return instance as unknown as T;
  } catch (e) {
    if (Array.isArray(e)) {
      let payload: Record<string, Array<string>> = {};
      (e as ValidationError[]).forEach((r) => {
        payload = extractError(r, payload);
      });
      throw new BadRequestException(payload);
    } else {
      throw new BadRequestException('NotValidJSON');
    }
  }
}
