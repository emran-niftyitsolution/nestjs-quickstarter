import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';

export function IsNotWhitespace(validationOptions?: ValidationOptions) {
  return function (object: any, propertyName: string) {
    registerDecorator({
      name: 'isNotWhitespace',
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        validate(value: any, _args: ValidationArguments) {
          if (typeof value !== 'string') {
            return false;
          }
          // Check if the string contains at least one non-whitespace character
          return value.trim().length > 0;
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must not be empty or contain only whitespace`;
        },
      },
    });
  };
}
