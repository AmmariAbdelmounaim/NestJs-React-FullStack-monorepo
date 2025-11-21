import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { resolve } from 'node:path';
import { DatabaseModule } from './db/db.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { MembershipCardsModule } from './membership-cards/membership-cards.module';
import { StartupService } from './startup/startup.service';
import { BooksModule } from './books/books.module';
import { AuthorsModule } from './authors/authors.module';
import { LoansModule } from './loans/loans.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: resolve(__dirname, '../../..', '.env'),
    }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const redisHost = configService.get<string>('REDIS_HOST');
        const redisPort = configService.get<number>('REDIS_PORT');

        if (!redisHost || !redisPort) {
          throw new Error('REDIS environment variables are not set');
        }

        return {
          connection: {
            host: redisHost,
            port: redisPort,
          },
        };
      },
      inject: [ConfigService],
    }),
    DatabaseModule,
    UsersModule,
    AuthModule,
    MembershipCardsModule,
    BooksModule,
    AuthorsModule,
    LoansModule,
  ],
  providers: [StartupService],
})
export class AppModule {}
