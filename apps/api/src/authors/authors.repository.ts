import { Injectable, Inject } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import {
  authors,
  bookAuthors,
  books,
  createDatabase,
  AuthorRow,
  AuthorInsert,
  BookRow,
} from '../db';
import { TransactionService } from '../db/transaction.service';

type Database = ReturnType<typeof createDatabase>;

@Injectable()
export class AuthorsRepository {
  constructor(
    @Inject('DB') private readonly db: Database,
    private readonly transactionService: TransactionService,
  ) {}

  async findById(id: bigint): Promise<AuthorRow | undefined> {
    const [author] = await this.db
      .select()
      .from(authors)
      .where(eq(authors.id, id))
      .limit(1);
    return author;
  }

  async findAll(): Promise<AuthorRow[]> {
    return await this.db.select().from(authors);
  }

  async findByBookId(bookId: number): Promise<AuthorRow[]> {
    return await this.db
      .select({
        id: authors.id,
        firstName: authors.firstName,
        lastName: authors.lastName,
        birthDate: authors.birthDate,
        deathDate: authors.deathDate,
        createdAt: authors.createdAt,
        updatedAt: authors.updatedAt,
      })
      .from(authors)
      .innerJoin(bookAuthors, eq(authors.id, bookAuthors.authorId))
      .where(eq(bookAuthors.bookId, bookId));
  }

  async findBooksByAuthorId(authorId: number): Promise<BookRow[]> {
    return await this.db
      .select({
        id: books.id,
        title: books.title,
        isbn10: books.isbn10,
        isbn13: books.isbn13,
        genre: books.genre,
        publicationDate: books.publicationDate,
        description: books.description,
        coverImageUrl: books.coverImageUrl,
        externalSource: books.externalSource,
        externalId: books.externalId,
        externalMetadata: books.externalMetadata,
        searchVector: books.searchVector,
        createdAt: books.createdAt,
        updatedAt: books.updatedAt,
      })
      .from(books)
      .innerJoin(bookAuthors, eq(books.id, bookAuthors.bookId))
      .where(eq(bookAuthors.authorId, authorId));
  }

  async create(
    data: AuthorInsert,
    rlsContext?: { userId?: string; userRole?: string },
  ): Promise<AuthorRow> {
    // Authors can only be created by ADMIN, so RLS context is required
    if (rlsContext) {
      return await this.transactionService.withTransaction(async (tx) => {
        const [newAuthor] = await tx.insert(authors).values(data).returning();
        return newAuthor;
      }, rlsContext);
    } else {
      // Fallback for non-RLS queries (should not happen in normal flow)
      const [newAuthor] = await this.db.insert(authors).values(data).returning();
      return newAuthor;
    }
  }

  async update(
    id: bigint,
    data: Partial<AuthorInsert>,
    rlsContext?: { userId?: string; userRole?: string },
  ): Promise<AuthorRow | undefined> {
    // Authors can only be updated by ADMIN, so RLS context is required
    if (rlsContext) {
      return await this.transactionService.withTransaction(async (tx) => {
        const [updatedAuthor] = await tx
          .update(authors)
          .set({
            ...data,
            updatedAt: new Date().toISOString(),
          })
          .where(eq(authors.id, id))
          .returning();
        return updatedAuthor;
      }, rlsContext);
    } else {
      // Fallback for non-RLS queries (should not happen in normal flow)
      const [updatedAuthor] = await this.db
        .update(authors)
        .set({
          ...data,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(authors.id, id))
        .returning();
      return updatedAuthor;
    }
  }

  async delete(
    id: bigint,
    rlsContext?: { userId?: string; userRole?: string },
  ): Promise<boolean> {
    // Authors can only be deleted by ADMIN, so RLS context is required
    if (rlsContext) {
      return await this.transactionService.withTransaction(async (tx) => {
        const result = await tx
          .delete(authors)
          .where(eq(authors.id, id))
          .returning();
        return result.length > 0;
      }, rlsContext);
    } else {
      // Fallback for non-RLS queries (should not happen in normal flow)
      const result = await this.db
        .delete(authors)
        .where(eq(authors.id, id))
        .returning();
      return result.length > 0;
    }
  }
}
