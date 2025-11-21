import { Injectable } from '@nestjs/common';
import { eq, sql, or, ilike, and } from 'drizzle-orm';
import { books, bookAuthors, authors, BookRow, BookInsert } from '../db';
import { TransactionService } from '../db/transaction.service';

@Injectable()
export class BooksRepository {
  constructor(private readonly transactionService: TransactionService) {}

  async findById(
    id: bigint,
    rlsContext?: { userId?: string; userRole?: string },
  ): Promise<BookRow | undefined> {
    return await this.transactionService.withTransaction(async (tx) => {
      const [book] = await tx
        .select()
        .from(books)
        .where(eq(books.id, id))
        .limit(1);
      return book;
    }, rlsContext);
  }

  async findAll(rlsContext?: {
    userId?: string;
    userRole?: string;
  }): Promise<BookRow[]> {
    return await this.transactionService.withTransaction(async (tx) => {
      return await tx.select().from(books);
    }, rlsContext);
  }

  async existsByIsbn13(
    isbn13: string,
    rlsContext?: { userId?: string; userRole?: string },
  ): Promise<boolean> {
    return await this.transactionService.withTransaction(async (tx) => {
      const [book] = await tx
        .select({ id: books.id })
        .from(books)
        .where(eq(books.isbn13, isbn13))
        .limit(1);
      return !!book;
    }, rlsContext);
  }

  async create(
    data: BookInsert,
    rlsContext?: { userId?: string; userRole?: string },
  ): Promise<BookRow> {
    return await this.transactionService.withTransaction(async (tx) => {
      const [newBook] = await tx.insert(books).values(data).returning();
      return newBook;
    }, rlsContext);
  }

  async update(
    id: bigint,
    data: Partial<BookInsert>,
    rlsContext?: { userId?: string; userRole?: string },
  ): Promise<BookRow | undefined> {
    return await this.transactionService.withTransaction(async (tx) => {
      const [updatedBook] = await tx
        .update(books)
        .set({
          ...data,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(books.id, id))
        .returning();
      return updatedBook;
    }, rlsContext);
  }

  async delete(
    id: bigint,
    rlsContext?: { userId?: string; userRole?: string },
  ): Promise<boolean> {
    return await this.transactionService.withTransaction(async (tx) => {
      const result = await tx.delete(books).where(eq(books.id, id)).returning();
      return result.length > 0;
    }, rlsContext);
  }

  async search(
    query?: string,
    genre?: string,
    rlsContext?: { userId?: string; userRole?: string },
  ): Promise<BookRow[]> {
    return await this.transactionService.withTransaction(async (tx) => {
      const conditions = [];

      if (genre) {
        conditions.push(eq(books.genre, genre));
      }

      // Full-text search on search_vector
      let searchQuery: string | undefined;
      if (query && query.trim()) {
        searchQuery = query.trim().split(/\s+/).join(' & '); // AND operator
        conditions.push(
          sql`${books.searchVector} @@ to_tsquery('simple', ${searchQuery})`,
        );
      }

      // Build query in a single chain to avoid type issues
      if (searchQuery) {
        return await tx
          .select()
          .from(books)
          .where(conditions.length > 0 ? and(...conditions) : undefined)
          .orderBy(
            sql`ts_rank(${books.searchVector}, to_tsquery('simple', ${searchQuery})) DESC`,
          );
      }

      return await tx
        .select()
        .from(books)
        .where(conditions.length > 0 ? and(...conditions) : undefined);
    }, rlsContext);
  }

  async searchSimple(
    title?: string,
    genre?: string,
    authorName?: string,
    rlsContext?: { userId?: string; userRole?: string },
  ): Promise<BookRow[]> {
    return await this.transactionService.withTransaction(async (tx) => {
      if (authorName) {
        // Search by author requires a join
        return await tx
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
          .innerJoin(authors, eq(bookAuthors.authorId, authors.id))
          .where(
            and(
              title ? ilike(books.title, `%${title}%`) : undefined,
              genre ? eq(books.genre, genre) : undefined,
              authorName
                ? or(
                    ilike(authors.firstName, `%${authorName}%`),
                    ilike(authors.lastName, `%${authorName}%`),
                    ilike(
                      sql`${authors.firstName} || ' ' || ${authors.lastName}`,
                      `%${authorName}%`,
                    ),
                  )
                : undefined,
            ),
          )
          .groupBy(books.id);
      } else {
        // Simple search without author join
        const conditions = [];
        if (title) conditions.push(ilike(books.title, `%${title}%`));
        if (genre) conditions.push(eq(books.genre, genre));

        return await tx
          .select()
          .from(books)
          .where(conditions.length > 0 ? and(...conditions) : undefined);
      }
    }, rlsContext);
  }
}
