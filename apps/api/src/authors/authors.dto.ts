import { ApiProperty, PartialType, PickType } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
  IsDateString,
} from 'class-validator';
import { AuthorRow } from '../db';
import { BookResponseDto } from '../books/books.dto';

// Base class for all author DTOs
export class AuthorBaseDto {
  @Expose()
  @ApiProperty({
    description: 'Author ID',
    example: 1,
  })
  @IsInt()
  id: number;

  @Expose()
  @ApiProperty({
    description: 'Author first name',
    example: 'Harper',
    maxLength: 100,
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  firstName?: AuthorRow['firstName'];

  @Expose()
  @ApiProperty({
    description: 'Author last name',
    example: 'Lee',
    minLength: 1,
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(100)
  lastName: AuthorRow['lastName'];

  @Expose()
  @ApiProperty({
    description: 'Author birth date',
    example: '1926-04-28',
    type: String,
    format: 'date',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  birthDate?: AuthorRow['birthDate'];

  @Expose()
  @ApiProperty({
    description: 'Author death date',
    example: '2016-02-19',
    type: String,
    format: 'date',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  deathDate?: AuthorRow['deathDate'];

  @Expose()
  @ApiProperty({
    description: 'Author creation timestamp',
    type: String,
    format: 'date-time',
    example: '2024-01-01T00:00:00.000Z',
  })
  createdAt: AuthorRow['createdAt'];

  @Expose()
  @ApiProperty({
    description: 'Author last update timestamp',
    type: String,
    format: 'date-time',
    example: '2024-01-01T00:00:00.000Z',
  })
  updatedAt: AuthorRow['updatedAt'];
}

export class AuthorResponseDto extends AuthorBaseDto {}

export class CreateAuthorDto extends PickType(AuthorBaseDto, [
  'firstName',
  'lastName',
  'birthDate',
  'deathDate',
] as const) {}

export class UpdateAuthorDto extends PartialType(
  PickType(AuthorBaseDto, [
    'firstName',
    'lastName',
    'birthDate',
    'deathDate',
  ] as const),
) {}

export class AuthorWithBooksDto extends AuthorResponseDto {
  @Expose()
  @Type(() => BookResponseDto)
  @ApiProperty({
    description: 'Books written by this author',
    type: [BookResponseDto],
  })
  books: BookResponseDto[];
}
