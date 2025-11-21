import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { GoogleBooksProcessor } from './google-books.processor';
import { GoogleBooksService } from '../services/google-books.service';
import { BooksService } from '../services/books.service';
import { BooksRepository } from '../books.repository';
import { AuthorsModule } from '../../authors/authors.module';
import { GOOGLE_BOOKS_QUEUE_NAME } from './google-books.types';

@Module({
  imports: [
    AuthorsModule,
    BullModule.registerQueue({
      name: GOOGLE_BOOKS_QUEUE_NAME,
    }),
  ],
  providers: [
    GoogleBooksProcessor,
    GoogleBooksService,
    BooksService,
    BooksRepository,
  ],
  exports: [BullModule],
})
export class GoogleBooksQueueModule {}
