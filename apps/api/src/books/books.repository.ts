import { Injectable, Inject } from '@nestjs/common';
import { eq, sql, or, ilike, and } from 'drizzle-orm';
import {
  books,
  bookAuthors,
  authors,
  createDatabase,
  BookRow,
  BookInsert,
} from '../db';

type Database = ReturnType<typeof createDatabase>;

@Injectable()
export class BooksRepository {
  constructor(@Inject('DB') private readonly db: Database) {}

  /**
   * Find a book by ID
   * @param id - Book ID (number or bigint)
   * @returns Book row or undefined if not found
   */
  async findById(id: number | bigint): Promise<BookRow | undefined> {
    const idBigInt = typeof id === 'number' ? BigInt(id) : id;
    const [book] = await this.db
      .select()
      .from(books)
      .where(eq(books.id, idBigInt))
      .limit(1);
    return book;
  }

  /**
   * Find all books
   * @returns Array of book rows
   */
  async findAll(): Promise<BookRow[]> {
    return await this.db.select().from(books);
  }

  /**
   * Check if a book exists with the given ISBN-13
   * @param isbn13 - ISBN-13 identifier
   * @returns true if book exists, false otherwise
   */
  async existsByIsbn13(isbn13: string): Promise<boolean> {
    const [book] = await this.db
      .select({ id: books.id })
      .from(books)
      .where(eq(books.isbn13, isbn13))
      .limit(1);
    return !!book;
  }

  /**
   * Create a new book
   * @param data - Book data to insert
   * @returns Created book row
   */
  async create(data: BookInsert): Promise<BookRow> {
    const [newBook] = await this.db.insert(books).values(data).returning();
    return newBook;
  }

  /**
   * Update a book by ID
   * @param id - Book ID (number or bigint)
   * @param data - Partial book data to update
   * @returns Updated book row or undefined if not found
   */
  async update(
    id: number | bigint,
    data: Partial<BookInsert>,
  ): Promise<BookRow | undefined> {
    const idBigInt = typeof id === 'number' ? BigInt(id) : id;
    const [updatedBook] = await this.db
      .update(books)
      .set({
        ...data,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(books.id, idBigInt))
      .returning();
    return updatedBook;
  }

  /**
   * Delete a book by ID
   * @param id - Book ID (number or bigint)
   * @returns true if book was deleted, false if not found
   */
  async delete(id: number | bigint): Promise<boolean> {
    const idBigInt = typeof id === 'number' ? BigInt(id) : id;
    const result = await this.db
      .delete(books)
      .where(eq(books.id, idBigInt))
      .returning();
    return result.length > 0;
  }

  /**
   * Search books using PostgreSQL full-text search on the search_vector column.
   * Results are ranked by relevance when a search query is provided.
   *
   * @param query - Optional search query string (multiple words joined with '&')
   * @param genre - Optional genre filter for exact match
   * @returns Array of matching books, ordered by relevance if query provided
   */
  async search(query?: string, genre?: string): Promise<BookRow[]> {
    const conditions = [];

    // Genre filter (exact match)
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
      return await this.db
        .select()
        .from(books)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(
          sql`ts_rank(${books.searchVector}, to_tsquery('simple', ${searchQuery})) DESC`,
        );
    }

    return await this.db
      .select()
      .from(books)
      .where(conditions.length > 0 ? and(...conditions) : undefined);
  }

  /**
   * Search books using case-insensitive pattern matching on title, genre, and author name.
   * When searching by author, joins with authors table and searches first/last/full name.
   *
   * @param title - Optional title search string (case-insensitive pattern match)
   * @param genre - Optional genre filter for exact match
   * @param authorName - Optional author name search (searches first, last, and full name)
   * @returns Array of matching books (grouped by book ID when authorName is provided)
   */
  async searchSimple(
    title?: string,
    genre?: string,
    authorName?: string,
  ): Promise<BookRow[]> {
    if (authorName) {
      // Search by author requires a join
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

      return await this.db
        .select()
        .from(books)
        .where(conditions.length > 0 ? and(...conditions) : undefined);
    }
  }
}
