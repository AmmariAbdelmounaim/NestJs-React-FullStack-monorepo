import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { GoogleBooksProcessor } from './google-books.processor';
import { GoogleBooksService } from '../services/google-books.service';
import { BooksService } from '../services/books.service';
import { BooksRepository } from '../books.repository';
import { AuthorsModule } from '../../authors/authors.module';
import { GOOGLE_BOOKS_QUEUE_NAME } from './google-books.types';

@Module({
  imports: [
    AuthorsModule,
    // Register queue - it will reuse the connection from BullModule.forRootAsync in app.module.ts
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

