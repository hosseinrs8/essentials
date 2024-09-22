export * from 'class-validator';

import {
  ValidationOptions,
  registerDecorator,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'IsValidName', async: false })
export class IsValidNameConstraint implements ValidatorConstraintInterface {
  public validate(value: string, args: ValidationArguments) {
    return /^(\p{L})+(\p{L}|\p{Z}|\p{N})*(\p{L}|\p{N})+$/gu.test(value);
  }

  public defaultMessage(args: ValidationArguments) {
    return `must be valid name (not contain symbol or been empty)`;
  }
}

export function IsValidName(validationOptions?: ValidationOptions) {
  // eslint-disable-next-line @typescript-eslint/ban-types
  return (object: Object, propertyName: string) => {
    registerDecorator({
      name: 'IsValidName',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: IsValidNameConstraint,
    });
  };
}
