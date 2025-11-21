import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createDatabase } from './index';
import { TransactionService } from './transaction.service';

@Global()
@Module({
  providers: [
    {
      provide: 'DB',
      useFactory: (configService: ConfigService) => {
        return createDatabase(configService);
      },
      inject: [ConfigService],
    },
    TransactionService,
  ],
  exports: ['DB', TransactionService],
})
export class DatabaseModule {}
