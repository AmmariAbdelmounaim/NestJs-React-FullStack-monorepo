import { plainToInstance, ClassConstructor } from 'class-transformer';
import { validateSync, ValidationError } from 'class-validator';
import { UnprocessableEntityException } from '@nestjs/common';

export function mapDto<T extends object, R extends T>(
  DtoClass: ClassConstructor<T>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  plain: R & Record<string, any>,
): T {
  const dto = plainToInstance(DtoClass, plain, {
    enableImplicitConversion: true,
  });

  const errors: ValidationError[] = validateSync(dto, {});

  if (errors.length > 0) {
    throw new UnprocessableEntityException(errors);
  }

  return dto;
}
