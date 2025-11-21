import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { ConfigService } from '@nestjs/config';
import * as schema from './migrations/schema';

export function createDatabase(configService: ConfigService) {
  // Use DB_APP_ROLE for RLS, fallback to POSTGRES_USER
  const dbUser =
    configService.get<string>('DB_APP_ROLE') ||
    configService.get<string>('POSTGRES_USER');
  const dbPassword =
    configService.get<string>('DB_APP_PASSWORD') ||
    configService.get<string>('POSTGRES_PASSWORD');
  const dbHost = configService.get<string>('POSTGRES_HOST');
  const dbPort = configService.get<string>('POSTGRES_PORT');
  const dbName = configService.get<string>('POSTGRES_DB');

  const connectionString = `postgresql://${dbUser}:${dbPassword}@${dbHost}:${dbPort}/${dbName}`;

  // Validate connection string
  if (
    !connectionString ||
    connectionString.includes('undefined') ||
    connectionString.includes('null')
  ) {
    throw new Error(
      'Invalid database connection string. Please set POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_HOST, POSTGRES_PORT, and POSTGRES_DB environment variables.',
    );
  }

  // Create postgres client with connection pool
  const client = postgres(connectionString, {
    max: 10,
    idle_timeout: 20,
    max_lifetime: 60 * 30,
    connect_timeout: 10,
    prepare: false, // Keep this for session variables
  });

  // Create drizzle instance with schema
  const db = drizzle(client, { schema });

  return db;
}

// Export inferred types for convenience
export type BookRow = typeof schema.books.$inferSelect;
export type BookInsert = typeof schema.books.$inferInsert;

export type UserRow = typeof schema.users.$inferSelect;
export type UserInsert = typeof schema.users.$inferInsert;

export type MembershipCardRow = typeof schema.membershipCards.$inferSelect;
export type MembershipCardInsert = typeof schema.membershipCards.$inferInsert;

export type AuthorRow = typeof schema.authors.$inferSelect;
export type AuthorInsert = typeof schema.authors.$inferInsert;

export type LoanRow = typeof schema.loans.$inferSelect;
export type LoanInsert = typeof schema.loans.$inferInsert;

export * from './migrations/schema';
