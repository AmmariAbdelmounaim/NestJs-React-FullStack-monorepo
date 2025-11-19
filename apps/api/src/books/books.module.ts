import { Module } from '@nestjs/common';
import { BooksController } from './books.controller';
import { BooksService } from './services/books.service';
import { BooksRepository } from './books.repository';
import { GoogleBooksService } from './services/google-books.service';
import { AuthorsModule } from '../authors/authors.module';

@Module({
  imports: [AuthorsModule],
  controllers: [BooksController],
  providers: [BooksRepository, BooksService, GoogleBooksService],
  exports: [BooksService, BooksRepository],
})
export class BooksModule {}
