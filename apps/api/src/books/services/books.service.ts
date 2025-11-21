import {
  Injectable,
  ConflictException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue, QueueEvents } from 'bullmq';
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
import { type books_v1 } from 'googleapis';
import {
  GOOGLE_BOOKS_QUEUE_NAME,
  ENRICH_BOOK_JOB_NAME,
  CREATE_BOOK_FROM_GOOGLE_JOB_NAME,
} from '../queues/google-books.types';

@Injectable()
export class BooksService {
  private readonly logger = new Logger(BooksService.name);
  private readonly queueEvents: QueueEvents;

  constructor(
    private readonly booksRepository: BooksRepository,
    private readonly googleBooksService: GoogleBooksService,
    private readonly authorsRepository: AuthorsRepository,
    private readonly configService: ConfigService,
    @InjectQueue(GOOGLE_BOOKS_QUEUE_NAME)
    private readonly googleBooksQueue: Queue,
  ) {
    // Create QueueEvents with the same Redis connection configuration
    const redisHost = this.configService.get<string>('REDIS_HOST');
    const redisPort = this.configService.get<number>('REDIS_PORT', 6379);

    if (!redisHost) {
      throw new Error('REDIS_HOST environment variable is not set');
    }

    this.queueEvents = new QueueEvents(GOOGLE_BOOKS_QUEUE_NAME, {
      connection: {
        host: redisHost,
        port: redisPort,
      },
    });
  }

  @WithErrorHandling('BooksService', 'create')
  async create(
    createBookDto: CreateBookDto,
    currentUser?: { id: number; role: string },
  ): Promise<BookResponseDto> {
    if (createBookDto.isbn13) {
      const existingBook = await this.booksRepository.existsByIsbn13(
        createBookDto.isbn13,
      );

      if (existingBook) {
        throw new ConflictException('Book with this ISBN-13 already exists');
      }
    }

    const rlsContext = currentUser
      ? { userId: currentUser.id.toString(), userRole: currentUser.role }
      : undefined;

    const newBook = await this.booksRepository.create(createBookDto, rlsContext);
    const bookId = Number(newBook.id);

    if (createBookDto.isbn13 || createBookDto.isbn10) {
      this.googleBooksQueue
        .add(ENRICH_BOOK_JOB_NAME, {
          bookId,
          isbn13: createBookDto.isbn13 || undefined,
          isbn10: createBookDto.isbn10 || undefined,
        })
        .catch((error) => {
          this.logger.error(
            `Failed to queue enrichment job for book ${bookId}: ${error instanceof Error ? error.message : String(error)}`,
          );
        });

      this.logger.log(
        `Queued enrichment job for book ${bookId} with ISBN-13: ${createBookDto.isbn13 || 'N/A'}, ISBN-10: ${createBookDto.isbn10 || 'N/A'}`,
      );
    }

    return mapDto(BookResponseDto, {
      ...newBook,
      id: bookId,
    });
  }

  @WithErrorHandling('BooksService', 'findAll')
  async findAll(): Promise<BookResponseDto[]> {
    const books = await this.booksRepository.findAll();
    return books.map((book) =>
      mapDto(BookResponseDto, {
        ...book,
        id: Number(book.id),
      }),
    );
  }

  @WithErrorHandling('BooksService', 'findOne')
  async findOne(id: number): Promise<BookWithAuthorsDto> {
    const book = await this.booksRepository.findById(BigInt(id));

    if (!book) {
      throw new NotFoundException(`Book with the id ${id} is not found`);
    }

    const authors = await this.authorsRepository.findByBookId(id);

    const bookResponse = mapDto(BookResponseDto, {
      ...book,
      id: Number(book.id),
    });

    const authorsPlain = authors.map((author) => ({
      ...author,
      id: Number(author.id),
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
    currentUser?: { id: number; role: string },
  ): Promise<BookResponseDto> {
    const existingBook = await this.booksRepository.findById(BigInt(id));

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

    const rlsContext = currentUser
      ? { userId: currentUser.id.toString(), userRole: currentUser.role }
      : undefined;

    // Update book
    const updatedBook = await this.booksRepository.update(
      BigInt(id),
      updateData,
      rlsContext,
    );

    if (!updatedBook) {
      throw new NotFoundException(`Book with the id ${id} is not found`);
    }

    return mapDto(BookResponseDto, {
      ...updatedBook,
      id: Number(updatedBook.id),
    });
  }

  @WithErrorHandling('BooksService', 'remove')
  async remove(
    id: number,
    currentUser?: { id: number; role: string },
  ): Promise<void> {
    // Check if book exists (findOne already throws NotFoundException if not found)
    await this.findOne(id);

    const rlsContext = currentUser
      ? { userId: currentUser.id.toString(), userRole: currentUser.role }
      : undefined;

    const deleted = await this.booksRepository.delete(BigInt(id), rlsContext);
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

    // Validate that book has ISBN
    if (!book.isbn13 && !book.isbn10) {
      throw new NotFoundException(
        'Book must have a valid ISBN-13 or ISBN-10 to be enriched from Google Books.',
      );
    }

    await this.googleBooksQueue.add(ENRICH_BOOK_JOB_NAME, {
      bookId: id,
      isbn13: book.isbn13 || undefined,
      isbn10: book.isbn10 || undefined,
    });

    this.logger.log(
      `Queued enrichment job for book ${id} with ISBN-13: ${book.isbn13 || 'N/A'}, ISBN-10: ${book.isbn10 || 'N/A'}`,
    );

    // Return immediately (job will process in background)
    return book;
  }

  @WithErrorHandling('BooksService', 'createFromGoogleBooks')
  async createFromGoogleBooks(isbn: string): Promise<BookResponseDto> {
    const job = await this.googleBooksQueue.add(
      CREATE_BOOK_FROM_GOOGLE_JOB_NAME,
      { isbn },
    );

    this.logger.log(`Queued create-from-google job for ISBN: ${isbn}`);

    try {
      const result = await job.waitUntilFinished(this.queueEvents, 60000);
      return result as BookResponseDto;
    } catch (error) {
      // Re-throw with proper error handling
      if (
        error instanceof ConflictException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new NotFoundException(
        `Failed to create book from Google Books: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  @WithErrorHandling('BooksService', 'searchGoogleBooks')
  async searchGoogleBooks(
    searchDto: SearchGoogleBooksDto,
  ): Promise<books_v1.Schema$Volume[]> {
    const maxResults = searchDto.maxResults || 10;
    return this.googleBooksService.search(searchDto.query, maxResults);
  }
}
