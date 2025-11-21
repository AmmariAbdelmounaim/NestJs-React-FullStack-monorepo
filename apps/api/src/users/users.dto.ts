import { ApiProperty, OmitType, PartialType, PickType } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import {
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsString,
  MinLength,
  MaxLength,
  IsEnum,
} from 'class-validator';
import { UserRow } from '../db';

// Base class for all user DTOs
// this class contains all user fields and is used to create other DTOs via PickType/OmitType/PartialType
export class UserBaseDto {
  @Expose()
  @ApiProperty({
    description: 'User ID',
    example: 1,
  })
  @IsInt()
  id: number;

  @Expose()
  @ApiProperty({
    description: 'User email address',
    example: 'user@example.com',
    type: String,
  })
  @IsEmail()
  @IsNotEmpty()
  email: UserRow['email'];

  @Expose()
  @ApiProperty({
    description: 'User first name',
    example: 'John',
    type: String,
    minLength: 2,
    maxLength: 100,
  })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  firstName: UserRow['firstName'];

  @Expose()
  @ApiProperty({
    description: 'User last name',
    example: 'Doe',
    type: String,
    minLength: 2,
    maxLength: 100,
  })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  lastName: UserRow['lastName'];

  @Expose()
  @ApiProperty({
    description: 'User password',
    example: 'SecurePassword123!',
    type: String,
    minLength: 8,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password: UserRow['password'];

  @Expose()
  @ApiProperty({
    description: 'User role',
    example: 'USER',
    enum: ['ADMIN', 'USER'],
    type: String,
  })
  @IsEnum(['ADMIN', 'USER'])
  role: UserRow['role'];

  @Expose()
  @ApiProperty({
    description: 'User creation timestamp',
    type: String,
    format: 'date-time',
    example: '2024-01-01T00:00:00.000Z',
  })
  createdAt: UserRow['createdAt'];

  @Expose()
  @ApiProperty({
    description: 'User last update timestamp',
    type: String,
    format: 'date-time',
    example: '2024-01-01T00:00:00.000Z',
  })
  updatedAt: UserRow['updatedAt'];
}

export class UserResponseDto extends OmitType(UserBaseDto, [
  'password',
] as const) {}

export class CreateUserDto extends PickType(UserBaseDto, [
  'email',
  'firstName',
  'lastName',
  'password',
] as const) {}

export class UpdateUserDto extends PartialType(
  PickType(UserBaseDto, [
    'email',
    'firstName',
    'lastName',
    'password',
  ] as const),
) {}
