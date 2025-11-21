import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import {
  Injectable,
  Logger,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { GoogleBooksService } from '../services/google-books.service';
import { BooksService } from '../services/books.service';
import { BooksRepository } from '../books.repository';
import { BookResponseDto, UpdateBookDto } from '../books.dto';
import { mapDto } from '../../utils/map-dto';
import {
  EnrichBookJobData,
  CreateBookFromGoogleJobData,
  ENRICH_BOOK_JOB_NAME,
  CREATE_BOOK_FROM_GOOGLE_JOB_NAME,
} from './google-books.types';

@Processor('google-books')
@Injectable()
export class GoogleBooksProcessor extends WorkerHost {
  private readonly logger = new Logger(GoogleBooksProcessor.name);

  constructor(
    private readonly googleBooksService: GoogleBooksService,
    private readonly booksService: BooksService,
    private readonly booksRepository: BooksRepository,
  ) {
    super();
  }

  async process(job: Job<EnrichBookJobData | CreateBookFromGoogleJobData>) {
    this.logger.log(`Processing job ${job.id} of type ${job.name}`);

    try {
      switch (job.name) {
        case ENRICH_BOOK_JOB_NAME:
          return await this.processEnrichBook(job.data as EnrichBookJobData);
        case CREATE_BOOK_FROM_GOOGLE_JOB_NAME:
          return await this.processCreateFromGoogle(
            job.data as CreateBookFromGoogleJobData,
          );
        default:
          throw new Error(`Unknown job type: ${job.name}`);
      }
    } catch (error) {
      this.logger.error(
        `Job ${job.id} failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  private async processEnrichBook(data: EnrichBookJobData): Promise<void> {
    this.logger.log(
      `Enriching book ${data.bookId} with ISBN-13: ${data.isbn13 || 'N/A'}, ISBN-10: ${data.isbn10 || 'N/A'}`,
    );

    const book = await this.booksService.findOne(data.bookId);

    let googleBook = null;
    if (data.isbn13) {
      googleBook = await this.googleBooksService.searchByIsbn(data.isbn13);
    } else if (data.isbn10) {
      googleBook = await this.googleBooksService.searchByIsbn(data.isbn10);
    } else if (book.isbn13) {
      googleBook = await this.googleBooksService.searchByIsbn(book.isbn13);
    } else if (book.isbn10) {
      googleBook = await this.googleBooksService.searchByIsbn(book.isbn10);
    }

    if (!googleBook) {
      this.logger.warn(
        `Book ${data.bookId} not found in Google Books. Skipping enrichment.`,
      );
      return;
    }

    const enrichedData =
      await this.googleBooksService.transformToBookData(googleBook);

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

    updateData.externalSource = enrichedData.externalSource;
    updateData.externalId = enrichedData.externalId;
    updateData.externalMetadata = enrichedData.externalMetadata;

    await this.booksService.update(data.bookId, updateData);

    this.logger.log(`Successfully enriched book ${data.bookId}`);
  }

  private async processCreateFromGoogle(
    data: CreateBookFromGoogleJobData,
  ): Promise<BookResponseDto> {
    this.logger.log(`Creating book from Google Books with ISBN: ${data.isbn}`);

    const cleanIsbn = data.isbn.replace(/-/g, '');
    const isIsbn13 = cleanIsbn.length === 13;

    let googleBook = null;
    if (isIsbn13) {
      googleBook = await this.googleBooksService.searchByIsbn(cleanIsbn);
    } else {
      googleBook = await this.googleBooksService.searchByIsbn(cleanIsbn);
    }

    if (!googleBook) {
      throw new NotFoundException(
        `Book with ISBN ${data.isbn} not found in Google Books`,
      );
    }

    const bookData =
      await this.googleBooksService.transformToBookData(googleBook);

    if (bookData.isbn13) {
      const exists = await this.booksRepository.existsByIsbn13(bookData.isbn13);
      if (exists) {
        throw new ConflictException('Book with this ISBN-13 already exists');
      }
    }

    const newBook = await this.booksRepository.create(bookData);
    const createdBook = mapDto(BookResponseDto, {
      ...newBook,
      id: Number(newBook.id),
    });

    this.logger.log(
      `Successfully created book ${createdBook.id} from Google Books`,
    );

    return createdBook;
  }
}
