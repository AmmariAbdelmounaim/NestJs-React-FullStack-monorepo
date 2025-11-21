import { Module, Logger } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { resolve } from 'node:path';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './db/db.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { MembershipCardsModule } from './membership-cards/membership-cards.module';
import { StartupService } from './startup/startup.service';
import { BooksModule } from './books/books.module';
import { AuthorsModule } from './authors/authors.module';
import { LoansModule } from './loans/loans.module';

// Find the first existing .env file
const rootEnvPath = resolve(__dirname, '..', '..', '..', '.env');
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: rootEnvPath,
    }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get<string>('REDIS_HOST', 'localhost'),
          port: configService.get<number>('REDIS_PORT', 6379),
        },
      }),
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
  controllers: [AppController],
  providers: [
    {
      provide: Logger,
      useFactory: () => new Logger(AppService.name),
    },
    AppService,
    StartupService,
  ],
})
export class AppModule {}
