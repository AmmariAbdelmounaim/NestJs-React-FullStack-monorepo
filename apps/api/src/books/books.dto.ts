import { ApiProperty, PartialType, PickType } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
  IsDateString,
  IsUrl,
  IsObject,
  Matches,
  Min,
  Max,
} from 'class-validator';
import { BookRow } from '../db';

// Base class for all book DTOs
export class BookBaseDto {
  @Expose()
  @ApiProperty({
    description: 'Book ID',
    example: 1,
  })
  @IsInt()
  id: number;

  @Expose()
  @ApiProperty({
    description: 'Book title',
    example: 'To Kill a Mockingbird',
    minLength: 1,
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(255)
  title: BookRow['title'];

  @Expose()
  @ApiProperty({
    description: 'ISBN-10 identifier',
    example: '0061120089',
    type: String,
    maxLength: 10,
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  @Matches(/^[0-9X]{10}$/, {
    message: 'ISBN-10 must be 10 digits or X',
  })
  isbn10?: BookRow['isbn10'];

  @Expose()
  @ApiProperty({
    description: 'ISBN-13 identifier',
    example: '9780061120084',
    type: String,
    maxLength: 13,
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(13)
  @Matches(/^[0-9]{13}$/, {
    message: 'ISBN-13 must be 13 digits',
  })
  isbn13?: BookRow['isbn13'];

  @Expose()
  @ApiProperty({
    description: 'Book genre',
    example: 'Classic Literature',
    maxLength: 100,
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  genre?: BookRow['genre'];

  @Expose()
  @ApiProperty({
    description: 'Publication date',
    example: '1960-07-11',
    type: String,
    format: 'date',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  publicationDate?: BookRow['publicationDate'];

  @Expose()
  @ApiProperty({
    description: 'Book description',
    example:
      'A gripping tale of racial injustice and childhood innocence in the American South.',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: BookRow['description'];

  @Expose()
  @ApiProperty({
    description: 'Cover image URL',
    example: 'https://covers.openlibrary.org/b/id/12345678-L.jpg',
    required: false,
  })
  @IsOptional()
  @IsUrl()
  coverImageUrl?: BookRow['coverImageUrl'];

  @Expose()
  @ApiProperty({
    description: 'External source name',
    example: 'google_books',
    maxLength: 100,
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  externalSource?: BookRow['externalSource'];

  @Expose()
  @ApiProperty({
    description: 'External source ID',
    example: 'ISBN:9780061120084',
    maxLength: 255,
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  externalId?: BookRow['externalId'];

  @Expose()
  @ApiProperty({
    description: 'External metadata (JSON)',
    example: {
      publisher: 'HarperCollins',
      pageCount: 376,
      language: 'en',
      categories: ['Fiction', 'Classics'],
    },
    required: false,
  })
  @IsOptional()
  @IsObject()
  externalMetadata?: BookRow['externalMetadata'];

  @Expose()
  @ApiProperty({
    description: 'Book creation timestamp',
    type: String,
    format: 'date-time',
    example: '2024-01-01T00:00:00.000Z',
  })
  createdAt: BookRow['createdAt'];

  @Expose()
  @ApiProperty({
    description: 'Book last update timestamp',
    type: String,
    format: 'date-time',
    example: '2024-01-01T00:00:00.000Z',
  })
  updatedAt: BookRow['updatedAt'];
}

export class BookResponseDto extends BookBaseDto {}

export class CreateBookDto extends PickType(BookBaseDto, [
  'title',
  'isbn10',
  'isbn13',
  'genre',
  'publicationDate',
  'description',
  'coverImageUrl',
  'externalSource',
  'externalId',
  'externalMetadata',
] as const) {}

export class UpdateBookDto extends PartialType(
  PickType(BookBaseDto, [
    'title',
    'isbn10',
    'isbn13',
    'genre',
    'publicationDate',
    'description',
    'coverImageUrl',
    'externalSource',
    'externalId',
    'externalMetadata',
  ] as const),
) {}

export class SearchBooksDto {
  @ApiProperty({
    description: 'Search query string for full-text search',
    example: 'mockingbird',
    required: false,
  })
  @IsOptional()
  @IsString()
  query?: string;

  @ApiProperty({
    description: 'Genre filter (exact match)',
    example: 'Fiction',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  genre?: string;
}

export class SearchSimpleBooksDto {
  @ApiProperty({
    description: 'Title search string (case-insensitive pattern match)',
    example: 'mockingbird',
    required: false,
  })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({
    description: 'Genre filter (exact match)',
    example: 'Fiction',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  genre?: string;

  @ApiProperty({
    description: 'Author name search (searches first, last, and full name)',
    example: 'Harper Lee',
    required: false,
  })
  @IsOptional()
  @IsString()
  authorName?: string;
}

export class SearchGoogleBooksDto {
  @ApiProperty({
    description:
      'Search query string (supports Google Books query syntax: title, author, ISBN, etc.)',
    example: 'harper lee mockingbird',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  query: string;

  @ApiProperty({
    description: 'Maximum number of results to return (1-40)',
    example: 10,
    required: false,
    default: 10,
    minimum: 1,
    maximum: 40,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(40)
  maxResults?: number;
}
