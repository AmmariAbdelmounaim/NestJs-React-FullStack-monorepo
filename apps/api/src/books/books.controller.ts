import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiBearerAuth,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiNotFoundResponse,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiCreatedResponse,
} from '@nestjs/swagger';
import { BooksService } from './services/books.service';
import {
  CreateBookDto,
  UpdateBookDto,
  BookResponseDto,
  BookWithAuthorsDto,
  SearchBooksDto,
  SearchSimpleBooksDto,
  SearchGoogleBooksDto,
} from './books.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import type { books_v1 } from 'googleapis';

@ApiTags('books')
@Controller('books')
export class BooksController {
  constructor(private readonly booksService: BooksService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Create a new book',
    description:
      'Create a new book. This operation is restricted to users with ADMIN role only.',
  })
  @ApiCreatedResponse({
    description: 'Book successfully created',
    type: BookResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiForbiddenResponse({
    description: 'Forbidden - Admin role required to create books',
  })
  @ApiBadRequestResponse({
    description: 'Invalid input data',
  })
  @ApiConflictResponse({
    description: 'Book with this ISBN-13 already exists',
  })
  create(@Body() createBookDto: CreateBookDto): Promise<BookResponseDto> {
    return this.booksService.create(createBookDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get all books',
    description: 'Retrieve a list of all books. Requires authentication.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of books retrieved successfully',
    type: [BookResponseDto],
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  findAll(): Promise<BookResponseDto[]> {
    return this.booksService.findAll();
  }

  @Get('search')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Search books using full-text search',
    description:
      'Search books using PostgreSQL full-text search on the search_vector column. Results are ranked by relevance. Requires authentication.',
  })
  @ApiResponse({
    status: 200,
    description: 'Search results retrieved successfully',
    type: [BookResponseDto],
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  search(@Query() searchDto: SearchBooksDto): Promise<BookResponseDto[]> {
    return this.booksService.search(searchDto);
  }

  @Get('search/simple')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Search books using simple pattern matching',
    description:
      'Search books using case-insensitive pattern matching on title, genre, and author name. Requires authentication.',
  })
  @ApiResponse({
    status: 200,
    description: 'Search results retrieved successfully',
    type: [BookResponseDto],
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  searchSimple(
    @Query() searchDto: SearchSimpleBooksDto,
  ): Promise<BookResponseDto[]> {
    return this.booksService.searchSimple(searchDto);
  }

  @Get('google/search')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Search books in Google Books API',
    description:
      'Search for books in Google Books API using a query string. Supports Google Books query syntax (title, author, ISBN, etc.). Requires authentication.',
  })
  @ApiResponse({
    status: 200,
    description: 'Search results from Google Books API',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        description: 'Google Books Volume object',
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  searchGoogleBooks(
    @Query() searchDto: SearchGoogleBooksDto,
  ): Promise<books_v1.Schema$Volume[]> {
    return this.booksService.searchGoogleBooks(searchDto);
  }

  @Post('enrich/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Enrich book data from Google Books',
    description:
      'Fetch additional book information from Google Books API and update the book. Requires the book to have a valid ISBN-13 or ISBN-10. Admin only.',
  })
  @ApiParam({
    name: 'id',
    description: 'Book ID',
    type: Number,
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Book successfully enriched with Google Books data',
    type: BookResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiForbiddenResponse({
    description: 'Forbidden - Admin role required to enrich books',
  })
  @ApiNotFoundResponse({
    description: 'Book not found or not found in Google Books database',
  })
  enrichFromGoogleBooks(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<BookResponseDto> {
    return this.booksService.enrichFromGoogleBooks(id);
  }

  @Post('from-google-books')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Create a book from Google Books by ISBN',
    description:
      'Search Google Books by ISBN (ISBN-10 or ISBN-13) and create a new book entry. Admin only.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        isbn: {
          type: 'string',
          description: 'ISBN-10 or ISBN-13 (with or without hyphens)',
          example: '9780061120084',
        },
      },
      required: ['isbn'],
    },
  })
  @ApiCreatedResponse({
    description: 'Book successfully created from Google Books',
    type: BookResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiForbiddenResponse({
    description: 'Forbidden - Admin role required to create books',
  })
  @ApiNotFoundResponse({
    description: 'Book not found in Google Books database',
  })
  @ApiConflictResponse({
    description: 'Book with this ISBN-13 already exists',
  })
  @ApiBadRequestResponse({
    description: 'Invalid ISBN format',
  })
  createFromGoogleBooks(
    @Body() body: { isbn: string },
  ): Promise<BookResponseDto> {
    return this.booksService.createFromGoogleBooks(body.isbn);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get book by ID',
    description:
      'Get book information by ID including all authors who wrote this book. Requires authentication.',
  })
  @ApiParam({
    name: 'id',
    description: 'Book ID',
    type: Number,
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Book found and returned successfully with authors',
    type: BookWithAuthorsDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiNotFoundResponse({
    description: 'Book not found',
  })
  findOne(@Param('id', ParseIntPipe) id: number): Promise<BookWithAuthorsDto> {
    return this.booksService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Update book by ID',
    description:
      'Update book information by ID. This operation is restricted to users with ADMIN role only.',
  })
  @ApiParam({
    name: 'id',
    description: 'Book ID',
    type: Number,
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Book successfully updated',
    type: BookResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiForbiddenResponse({
    description: 'Forbidden - Admin role required to update books',
  })
  @ApiNotFoundResponse({
    description: 'Book not found',
  })
  @ApiBadRequestResponse({
    description: 'Invalid input data',
  })
  @ApiConflictResponse({
    description: 'Book with this ISBN-13 already exists',
  })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateBookDto: UpdateBookDto,
  ): Promise<BookResponseDto> {
    return this.booksService.update(id, updateBookDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Delete book by ID',
    description:
      'Delete a book by ID. This operation is restricted to users with ADMIN role only.',
  })
  @ApiParam({
    name: 'id',
    description: 'Book ID',
    type: Number,
    example: 1,
  })
  @ApiResponse({
    status: 204,
    description: 'Book successfully deleted',
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiForbiddenResponse({
    description: 'Forbidden - Admin role required to delete books',
  })
  @ApiNotFoundResponse({
    description: 'Book not found',
  })
  remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.booksService.remove(id);
  }
}
