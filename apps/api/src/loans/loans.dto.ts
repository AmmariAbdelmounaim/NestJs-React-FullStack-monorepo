import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsDateString,
} from 'class-validator';
import { BookResponseDto } from '../books/books.dto';
import { UserResponseDto } from '../users/users.dto';

import { LoanRow } from '../db';
export class LoanBaseDto {
  @Expose()
  @ApiProperty({
    description: 'Loan ID',
    example: 1,
  })
  @IsInt()
  id: number;

  @Expose()
  @ApiProperty({
    description: 'User ID who borrowed the book',
    example: 1,
  })
  @IsInt()
  @IsNotEmpty()
  userId: LoanRow['userId'];

  @Expose()
  @ApiProperty({
    description: 'Book ID that was borrowed',
    example: 1,
  })
  @IsInt()
  @IsNotEmpty()
  bookId: LoanRow['bookId'];

  @Expose()
  @ApiProperty({
    description: 'Loan status',
    enum: ['ONGOING', 'RETURNED', 'LATE'],
    example: 'ONGOING',
    type: String,
  })
  @IsEnum(['ONGOING', 'RETURNED', 'LATE'])
  status: LoanRow['status'];

  @Expose()
  @ApiProperty({
    description: 'Date and time when the book was borrowed',
    type: String,
    format: 'date-time',
    example: '2024-01-01T00:00:00.000Z',
  })
  @IsDateString()
  borrowedAt: LoanRow['borrowedAt'];

  @Expose()
  @ApiProperty({
    description: 'Due date for returning the book',
    type: String,
    format: 'date-time',
    example: '2024-01-22T00:00:00.000Z',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  dueAt?: LoanRow['dueAt'];

  @Expose()
  @ApiProperty({
    description: 'Date and time when the book was returned',
    type: String,
    format: 'date-time',
    example: '2024-01-15T00:00:00.000Z',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  returnedAt?: LoanRow['returnedAt'];

  @Expose()
  @ApiProperty({
    description: 'Loan creation timestamp',
    type: String,
    format: 'date-time',
    example: '2024-01-01T00:00:00.000Z',
  })
  createdAt: LoanRow['createdAt'];

  @Expose()
  @ApiProperty({
    description: 'Loan last update timestamp',
    type: String,
    format: 'date-time',
    example: '2024-01-01T00:00:00.000Z',
  })
  updatedAt: LoanRow['updatedAt'];
}

export class LoanResponseDto extends LoanBaseDto {}

export class LoanWithRelationsDto extends LoanResponseDto {
  @Expose()
  @Type(() => BookResponseDto)
  @ApiProperty({
    description: 'Book information',
    type: BookResponseDto,
    required: false,
  })
  book?: BookResponseDto;

  @Expose()
  @Type(() => UserResponseDto)
  @ApiProperty({
    description: 'User information',
    type: UserResponseDto,
    required: false,
  })
  user?: UserResponseDto;
}

export class CreateLoanDto {
  @ApiProperty({
    description: 'Book ID to borrow',
    example: 1,
  })
  @IsInt()
  @IsNotEmpty()
  bookId: LoanRow['bookId'];

  @ApiProperty({
    description:
      'Due date for returning the book (optional, defaults to 21 days from now)',
    type: String,
    format: 'date-time',
    example: '2024-01-22T00:00:00.000Z',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  dueAt?: LoanRow['dueAt'];
}

export class ReturnLoanDto {
  @ApiProperty({
    description: 'Loan ID to return',
    example: 1,
  })
  @IsInt()
  @IsNotEmpty()
  loanId: LoanRow['id'];
}
