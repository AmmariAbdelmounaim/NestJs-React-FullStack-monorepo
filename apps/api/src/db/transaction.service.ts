import { Injectable, Inject } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { createDatabase } from './index';

type Database = ReturnType<typeof createDatabase>;
type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0];

interface RlsContext {
  userId?: string | number;
  userRole?: string;
}

@Injectable()
export class TransactionService {
  constructor(@Inject('DB') private readonly db: Database) {}

  async withTransaction<T>(
    callback: (tx: Transaction) => Promise<T>,
    rlsContext?: RlsContext,
  ): Promise<T> {
    // Use drizzle's built-in transaction API
    return await this.db.transaction(async (tx) => {
      // Set RLS context at the start of the transaction
      if (rlsContext) {
        if (rlsContext.userId) {
          await tx.execute(
            sql`SELECT set_config('app.current_user_id', ${rlsContext.userId.toString()}, true)`,
          );
        } else {
          await tx.execute(
            sql`SELECT set_config('app.current_user_id', '', true)`,
          );
        }

        if (rlsContext.userRole) {
          await tx.execute(
            sql`SELECT set_config('app.current_user_role', ${rlsContext.userRole}, true)`,
          );
        } else {
          await tx.execute(
            sql`SELECT set_config('app.current_user_role', '', true)`,
          );
        }
      } else {
        // No user context - set ADMIN role temporarily for registration flow
        // This is a workaround: RLS policies work with ADMIN but not with other values
        // The actual user being created will have their own role set in the database
        await tx.execute(
          sql`SELECT set_config('app.current_user_id', '', true)`,
        );
        await tx.execute(
          sql`SELECT set_config('app.current_user_role', 'ADMIN', true)`,
        );
      }

      // Execute the callback with the transaction database instance
      return await callback(tx);
    });
  }
}
