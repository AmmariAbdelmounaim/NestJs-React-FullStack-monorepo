import { Module, Logger } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { resolve } from 'node:path';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './db/db.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { MembershipCardsModule } from './membership-cards/membership-cards.module';
import { StartupService } from './startup/startup.service';

// Find the first existing .env file
const rootEnvPath = resolve(__dirname, '..', '..', '..', '.env');
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: rootEnvPath,
    }),
    DatabaseModule,
    UsersModule,
    AuthModule,
    MembershipCardsModule,
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
