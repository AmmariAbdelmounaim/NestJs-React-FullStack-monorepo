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
    BullModule.registerQueueAsync({
      name: GOOGLE_BOOKS_QUEUE_NAME,
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get<string>('REDIS_HOST', 'localhost'),
          port: configService.get<number>('REDIS_PORT', 6379),
        },
      }),
      inject: [ConfigService],
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

