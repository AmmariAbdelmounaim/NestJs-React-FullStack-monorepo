import { Module } from '@nestjs/common';
import { BooksController } from './books.controller';
import { BooksService } from './services/books.service';
import { BooksRepository } from './books.repository';
import { GoogleBooksService } from './services/google-books.service';
import { AuthorsModule } from '../authors/authors.module';
import { GoogleBooksQueueModule } from './queues/google-books.queue.module';

@Module({
  imports: [AuthorsModule, GoogleBooksQueueModule],
  controllers: [BooksController],
  providers: [BooksRepository, BooksService, GoogleBooksService],
  exports: [BooksService, BooksRepository],
})
export class BooksModule {}
