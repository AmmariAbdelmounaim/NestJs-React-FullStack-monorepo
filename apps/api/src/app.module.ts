import { Module, Logger } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { resolve } from 'node:path';
import { existsSync } from 'node:fs';
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

const rootEnvPath = resolve(__dirname, '..', '..', '..', '.env');
const envFilePath = existsSync(rootEnvPath) ? rootEnvPath : undefined;

const configModuleOptions: {
  isGlobal: boolean;
  envFilePath?: string;
} = {
  isGlobal: true,
};

if (envFilePath) {
  configModuleOptions.envFilePath = envFilePath;
}

@Module({
  imports: [
    ConfigModule.forRoot(configModuleOptions),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const redisHost = configService.get<string>('REDIS_HOST');
        const redisPort = configService.get<number>('REDIS_PORT', 6379);

        if (!redisHost) {
          throw new Error('REDIS_HOST environment variable is not set');
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
