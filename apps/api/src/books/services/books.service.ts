import {
  Injectable,
  ConflictException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { mapDto } from '../../utils/map-dto';
import {
  CreateBookDto,
  UpdateBookDto,
  BookResponseDto,
  BookWithAuthorsDto,
  SearchBooksDto,
  SearchSimpleBooksDto,
  SearchGoogleBooksDto,
} from '../books.dto';
import { BookInsert } from '../../db';
import { BooksRepository } from '../books.repository';
import { GoogleBooksService } from './google-books.service';
import { AuthorsRepository } from '../../authors/authors.repository';
import { WithErrorHandling } from '../../utils/with-error-handling.decorator';
import { google, type books_v1 } from 'googleapis';

@Injectable()
export class BooksService {
  private readonly logger = new Logger(BooksService.name);

  constructor(
    private readonly booksRepository: BooksRepository,
    private readonly googleBooksService: GoogleBooksService,
    private readonly authorsRepository: AuthorsRepository,
  ) {}

  @WithErrorHandling('BooksService', 'create')
  async create(createBookDto: CreateBookDto): Promise<BookResponseDto> {
    // Check if book with ISBN-13 already exists
    if (createBookDto.isbn13) {
      const existingBook = await this.booksRepository.existsByIsbn13(
        createBookDto.isbn13,
      );

      if (existingBook) {
        throw new ConflictException('Book with this ISBN-13 already exists');
      }
    }

    // Create book
    const newBook = await this.booksRepository.create(createBookDto);
    return mapDto(BookResponseDto, {
      ...newBook,
      id: Number(newBook.id), // Convert BigInt to number
    });
  }

  @WithErrorHandling('BooksService', 'findAll')
  async findAll(): Promise<BookResponseDto[]> {
    const books = await this.booksRepository.findAll();
    return books.map((book) =>
      mapDto(BookResponseDto, {
        ...book,
        id: Number(book.id), // Convert BigInt to number
      }),
    );
  }

  @WithErrorHandling('BooksService', 'findOne')
  async findOne(id: number): Promise<BookWithAuthorsDto> {
    const book = await this.booksRepository.findById(id);

    if (!book) {
      throw new NotFoundException(`Book with the id ${id} is not found`);
    }

    // Get authors who wrote this book
    const authors = await this.authorsRepository.findByBookId(id);

    const bookResponse = mapDto(BookResponseDto, {
      ...book,
      id: Number(book.id), // Convert BigInt to number
    });

    // Convert authors to plain objects (not DTOs yet) so @Type() can transform them
    const authorsPlain = authors.map((author) => ({
      ...author,
      id: Number(author.id), // Convert BigInt to number
    }));

    const bookWithAuthors = mapDto(BookWithAuthorsDto, {
      ...bookResponse,
      authors: authorsPlain,
    });
    return bookWithAuthors;
  }

  @WithErrorHandling('BooksService', 'update')
  async update(
    id: number,
    updateBookDto: UpdateBookDto,
  ): Promise<BookResponseDto> {
    // Check if book exists
    const existingBook = await this.booksRepository.findById(id);

    if (!existingBook) {
      throw new NotFoundException(`Book with the id ${id} is not found`);
    }

    // If ISBN-13 is being updated, check for conflicts
    if (updateBookDto.isbn13 && updateBookDto.isbn13 !== existingBook.isbn13) {
      const isbnExists = await this.booksRepository.existsByIsbn13(
        updateBookDto.isbn13,
      );

      if (isbnExists) {
        throw new ConflictException('Book with this ISBN-13 already exists');
      }
    }

    // Prepare update data
    const updateData: Partial<BookInsert> = {};

    if (updateBookDto.title !== undefined)
      updateData.title = updateBookDto.title;
    if (updateBookDto.isbn10 !== undefined)
      updateData.isbn10 = updateBookDto.isbn10;
    if (updateBookDto.isbn13 !== undefined)
      updateData.isbn13 = updateBookDto.isbn13;
    if (updateBookDto.genre !== undefined)
      updateData.genre = updateBookDto.genre;
    if (updateBookDto.publicationDate !== undefined)
      updateData.publicationDate = updateBookDto.publicationDate;
    if (updateBookDto.description !== undefined)
      updateData.description = updateBookDto.description;
    if (updateBookDto.coverImageUrl !== undefined)
      updateData.coverImageUrl = updateBookDto.coverImageUrl;
    if (updateBookDto.externalSource !== undefined)
      updateData.externalSource = updateBookDto.externalSource;
    if (updateBookDto.externalId !== undefined)
      updateData.externalId = updateBookDto.externalId;
    if (updateBookDto.externalMetadata !== undefined)
      updateData.externalMetadata = updateBookDto.externalMetadata;

    // Update book
    const updatedBook = await this.booksRepository.update(id, updateData);

    if (!updatedBook) {
      throw new NotFoundException(`Book with the id ${id} is not found`);
    }

    return mapDto(BookResponseDto, {
      ...updatedBook,
      id: Number(updatedBook.id), // Convert BigInt to number
    });
  }

  @WithErrorHandling('BooksService', 'remove')
  async remove(id: number): Promise<void> {
    // Check if book exists (findOne already throws NotFoundException if not found)
    await this.findOne(id);

    const deleted = await this.booksRepository.delete(id);
    if (!deleted) {
      throw new NotFoundException(`Book with the id ${id} is not found`);
    }
  }

  @WithErrorHandling('BooksService', 'search')
  async search(searchDto: SearchBooksDto): Promise<BookResponseDto[]> {
    const books = await this.booksRepository.search(
      searchDto.query,
      searchDto.genre,
    );
    return books.map((book) =>
      mapDto(BookResponseDto, {
        ...book,
        id: Number(book.id),
      }),
    );
  }

  @WithErrorHandling('BooksService', 'searchSimple')
  async searchSimple(
    searchDto: SearchSimpleBooksDto,
  ): Promise<BookResponseDto[]> {
    const books = await this.booksRepository.searchSimple(
      searchDto.title,
      searchDto.genre,
      searchDto.authorName,
    );
    return books.map((book) =>
      mapDto(BookResponseDto, {
        ...book,
        id: Number(book.id),
      }),
    );
  }

  @WithErrorHandling('BooksService', 'enrichFromGoogleBooks')
  async enrichFromGoogleBooks(id: number): Promise<BookResponseDto> {
    const book = await this.findOne(id);
    // Try to find book in Google Books by ISBN-13 or ISBN-10
    let googleBook = null;
    if (book.isbn13) {
      googleBook = await this.googleBooksService.searchByIsbn13(book.isbn13);
    } else if (book.isbn10) {
      googleBook = await this.googleBooksService.searchByIsbn10(book.isbn10);
    }

    if (!googleBook) {
      throw new NotFoundException(
        `Book not found in Google Books database. Ensure the book has a valid ISBN-13 or ISBN-10.`,
      );
    }

    // Transform and update book
    const enrichedData =
      await this.googleBooksService.transformToBookData(googleBook);

    // Merge with existing data (don't overwrite existing fields unless they're missing)
    const updateData: UpdateBookDto = {};

    if (!book.description && enrichedData.description) {
      updateData.description = enrichedData.description;
    }
    if (!book.coverImageUrl && enrichedData.coverImageUrl) {
      updateData.coverImageUrl = enrichedData.coverImageUrl;
    }
    if (!book.genre && enrichedData.genre) {
      updateData.genre = enrichedData.genre;
    }
    if (!book.publicationDate && enrichedData.publicationDate) {
      updateData.publicationDate = enrichedData.publicationDate;
    }
    if (!book.isbn10 && enrichedData.isbn10) {
      updateData.isbn10 = enrichedData.isbn10;
    }
    if (!book.isbn13 && enrichedData.isbn13) {
      updateData.isbn13 = enrichedData.isbn13;
    }

    // Always update external metadata
    updateData.externalSource = enrichedData.externalSource;
    updateData.externalId = enrichedData.externalId;
    updateData.externalMetadata = enrichedData.externalMetadata;

    return this.update(id, updateData);
  }

  @WithErrorHandling('BooksService', 'createFromGoogleBooks')
  async createFromGoogleBooks(isbn: string): Promise<BookResponseDto> {
    // Determine if it's ISBN-10 or ISBN-13
    const cleanIsbn = isbn.replace(/-/g, '');
    const isIsbn13 = cleanIsbn.length === 13;

    let googleBook = null;
    if (isIsbn13) {
      googleBook = await this.googleBooksService.searchByIsbn13(cleanIsbn);
    } else {
      googleBook = await this.googleBooksService.searchByIsbn10(cleanIsbn);
    }

    if (!googleBook) {
      throw new NotFoundException(
        `Book with ISBN ${isbn} not found in Google Books`,
      );
    }

    // Transform to book data
    const bookData =
      await this.googleBooksService.transformToBookData(googleBook);
    // Check if book already exists
    if (bookData.isbn13) {
      const exists = await this.booksRepository.existsByIsbn13(bookData.isbn13);
      if (exists) {
        throw new ConflictException('Book with this ISBN-13 already exists');
      }
    }

    // Create the book
    return this.create(bookData);
  }

  @WithErrorHandling('BooksService', 'searchGoogleBooks')
  async searchGoogleBooks(
    searchDto: SearchGoogleBooksDto,
  ): Promise<books_v1.Schema$Volume[]> {
    const maxResults = searchDto.maxResults || 10;
    return this.googleBooksService.search(searchDto.query, maxResults);
  }
}
