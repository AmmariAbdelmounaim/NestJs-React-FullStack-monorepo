import {
  pgTable,
  index,
  uniqueIndex,
  pgPolicy,
  bigserial,
  varchar,
  date,
  text,
  jsonb,
  timestamp,
  foreignKey,
  bigint,
  unique,
  primaryKey,
  pgEnum,
  customType,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const cardStatus = pgEnum('card_status', ['FREE', 'IN_USE', 'ARCHIVED']);
export const loanStatus = pgEnum('loan_status', [
  'ONGOING',
  'RETURNED',
  'LATE',
]);
export const userRole = pgEnum('user_role', ['ADMIN', 'USER']);

// Define custom tsvector type
const tsvector = customType<{ data: string; driverData: string }>({
  dataType() {
    return 'tsvector';
  },
});

export const books = pgTable(
  'books',
  {
    id: bigserial({ mode: 'bigint' }).primaryKey().notNull(),
    title: varchar({ length: 255 }).notNull(),
    isbn10: varchar('isbn_10', { length: 10 }),
    isbn13: varchar('isbn_13', { length: 13 }),
    genre: varchar({ length: 100 }),
    publicationDate: date('publication_date'),
    description: text(),
    coverImageUrl: text('cover_image_url'),
    externalSource: varchar('external_source', { length: 100 }),
    externalId: varchar('external_id', { length: 255 }),
    externalMetadata: jsonb('external_metadata'),
    // TODO: failed to parse database type 'tsvector'
    searchVector: tsvector('search_vector'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('idx_books_genre').using(
      'btree',
      table.genre.asc().nullsLast().op('text_ops'),
    ),
    index('idx_books_search_vector').using(
      'gin',
      table.searchVector.asc().nullsLast().op('tsvector_ops'),
    ),
    uniqueIndex('uniq_books_isbn_13')
      .using('btree', table.isbn13.asc().nullsLast().op('text_ops'))
      .where(sql`(isbn_13 IS NOT NULL)`),
    pgPolicy('books_admin_delete', {
      as: 'permissive',
      for: 'delete',
      to: ['library_app'],
      using: sql`(current_setting('app.current_user_role'::text, true) = 'ADMIN'::text)`,
    }),
    pgPolicy('books_admin_update', {
      as: 'permissive',
      for: 'update',
      to: ['library_app'],
    }),
    pgPolicy('books_admin_insert', {
      as: 'permissive',
      for: 'insert',
      to: ['library_app'],
    }),
    pgPolicy('books_select_all', {
      as: 'permissive',
      for: 'select',
      to: ['library_app'],
    }),
  ],
);

export const loans = pgTable(
  'loans',
  {
    id: bigserial({ mode: 'bigint' }).primaryKey().notNull(),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    userId: bigint('user_id', { mode: 'number' }).notNull(),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    bookId: bigint('book_id', { mode: 'number' }).notNull(),
    status: loanStatus().default('ONGOING').notNull(),
    borrowedAt: timestamp('borrowed_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    dueAt: timestamp('due_at', { withTimezone: true, mode: 'string' }),
    returnedAt: timestamp('returned_at', {
      withTimezone: true,
      mode: 'string',
    }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('idx_loans_book_id').using(
      'btree',
      table.bookId.asc().nullsLast().op('int8_ops'),
    ),
    index('idx_loans_user_id').using(
      'btree',
      table.userId.asc().nullsLast().op('int8_ops'),
    ),
    uniqueIndex('uniq_loans_book_ongoing')
      .using('btree', table.bookId.asc().nullsLast().op('int8_ops'))
      .where(sql`(returned_at IS NULL)`),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: 'loans_user_id_fkey',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.bookId],
      foreignColumns: [books.id],
      name: 'loans_book_id_fkey',
    }).onDelete('cascade'),
    pgPolicy('loans_admin_delete', {
      as: 'permissive',
      for: 'delete',
      to: ['library_app'],
      using: sql`(current_setting('app.current_user_role'::text, true) = 'ADMIN'::text)`,
    }),
    pgPolicy('loans_user_or_admin_update', {
      as: 'permissive',
      for: 'update',
      to: ['library_app'],
    }),
    pgPolicy('loans_user_or_admin_insert', {
      as: 'permissive',
      for: 'insert',
      to: ['library_app'],
    }),
    pgPolicy('loans_user_or_admin_select', {
      as: 'permissive',
      for: 'select',
      to: ['library_app'],
    }),
  ],
);

export const membershipCards = pgTable(
  'membership_cards',
  {
    id: bigserial({ mode: 'bigint' }).primaryKey().notNull(),
    serialNumber: varchar('serial_number', { length: 20 }).notNull(),
    status: cardStatus().default('FREE').notNull(),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    userId: bigint('user_id', { mode: 'number' }),
    assignedAt: timestamp('assigned_at', {
      withTimezone: true,
      mode: 'string',
    }),
    archivedAt: timestamp('archived_at', {
      withTimezone: true,
      mode: 'string',
    }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('idx_membership_cards_status_serial').using(
      'btree',
      table.status.asc().nullsLast().op('text_ops'),
      table.serialNumber.asc().nullsLast().op('text_ops'),
    ),
    uniqueIndex('uniq_membership_cards_user_active')
      .using('btree', table.userId.asc().nullsLast().op('int8_ops'))
      .where(sql`(status = 'IN_USE'::card_status)`),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: 'membership_cards_user_id_fkey',
    }).onDelete('set null'),
    unique('membership_cards_serial_number_key').on(table.serialNumber),
    pgPolicy('membership_cards_admin_delete', {
      as: 'permissive',
      for: 'delete',
      to: ['library_app'],
      using: sql`(current_setting('app.current_user_role'::text, true) = 'ADMIN'::text)`,
    }),
    pgPolicy('membership_cards_admin_update', {
      as: 'permissive',
      for: 'update',
      to: ['library_app'],
    }),
    pgPolicy('membership_cards_admin_insert', {
      as: 'permissive',
      for: 'insert',
      to: ['library_app'],
    }),
    pgPolicy('membership_cards_select_all', {
      as: 'permissive',
      for: 'select',
      to: ['library_app'],
    }),
  ],
);

export const authors = pgTable(
  'authors',
  {
    id: bigserial({ mode: 'bigint' }).primaryKey().notNull(),
    firstName: varchar('first_name', { length: 100 }),
    lastName: varchar('last_name', { length: 100 }).notNull(),
    birthDate: date('birth_date'),
    deathDate: date('death_date'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('idx_authors_last_name').using(
      'btree',
      table.lastName.asc().nullsLast().op('text_ops'),
    ),
  ],
);

export const users = pgTable(
  'users',
  {
    id: bigserial({ mode: 'bigint' }).primaryKey().notNull(),
    email: varchar({ length: 255 }).notNull(),
    firstName: varchar('first_name', { length: 100 }).notNull(),
    lastName: varchar('last_name', { length: 100 }).notNull(),
    role: userRole().default('USER').notNull(),
    password: varchar({ length: 255 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('idx_users_email').using(
      'btree',
      table.email.asc().nullsLast().op('text_ops'),
    ),
    index('idx_users_role').using(
      'btree',
      table.role.asc().nullsLast().op('enum_ops'),
    ),
    unique('users_email_key').on(table.email),
    pgPolicy('users_admin_delete', {
      as: 'permissive',
      for: 'delete',
      to: ['library_app'],
      using: sql`(current_setting('app.current_user_role'::text, true) = 'ADMIN'::text)`,
    }),
    pgPolicy('users_admin_insert', {
      as: 'permissive',
      for: 'insert',
      to: ['library_app'],
    }),
    pgPolicy('users_update_self_or_admin', {
      as: 'permissive',
      for: 'update',
      to: ['library_app'],
    }),
    pgPolicy('users_select_self_or_admin', {
      as: 'permissive',
      for: 'select',
      to: ['library_app'],
    }),
  ],
);

export const bookAuthors = pgTable(
  'book_authors',
  {
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    bookId: bigint('book_id', { mode: 'number' }).notNull(),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    authorId: bigint('author_id', { mode: 'number' }).notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.bookId],
      foreignColumns: [books.id],
      name: 'book_authors_book_id_fkey',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.authorId],
      foreignColumns: [authors.id],
      name: 'book_authors_author_id_fkey',
    }).onDelete('cascade'),
    primaryKey({
      columns: [table.bookId, table.authorId],
      name: 'book_authors_pkey',
    }),
  ],
);
