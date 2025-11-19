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

type Database = ReturnType<typeof createDatabase>;

@Injectable()
export class AuthorsRepository {
  constructor(@Inject('DB') private readonly db: Database) {}

  /**
   * Find an author by ID
   * @param id - Author ID (number or bigint)
   * @returns Author row or undefined if not found
   */
  async findById(id: number | bigint): Promise<AuthorRow | undefined> {
    const idBigInt = typeof id === 'number' ? BigInt(id) : id;
    const [author] = await this.db
      .select()
      .from(authors)
      .where(eq(authors.id, idBigInt))
      .limit(1);
    return author;
  }

  /**
   * Find all authors
   * @returns Array of author rows
   */
  async findAll(): Promise<AuthorRow[]> {
    return await this.db.select().from(authors);
  }

  /**
   * Find authors by book ID
   * @param bookId - Book ID (number or bigint)
   * @returns Array of author rows
   */
  async findByBookId(bookId: number | bigint): Promise<AuthorRow[]> {
    const bookIdNumber = typeof bookId === 'bigint' ? Number(bookId) : bookId;
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
      .where(eq(bookAuthors.bookId, bookIdNumber));
  }

  /**
   * Find books by author ID
   * @param authorId - Author ID (number or bigint)
   * @returns Array of book rows
   */
  async findBooksByAuthorId(authorId: number | bigint): Promise<BookRow[]> {
    const authorIdNumber =
      typeof authorId === 'bigint' ? Number(authorId) : authorId;
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
      .where(eq(bookAuthors.authorId, authorIdNumber));
  }

  /**
   * Create a new author
   * @param data - Author data to insert
   * @returns Created author row
   */
  async create(data: AuthorInsert): Promise<AuthorRow> {
    const [newAuthor] = await this.db.insert(authors).values(data).returning();
    return newAuthor;
  }

  /**
   * Update an author by ID
   * @param id - Author ID (number or bigint)
   * @param data - Partial author data to update
   * @returns Updated author row or undefined if not found
   */
  async update(
    id: number | bigint,
    data: Partial<AuthorInsert>,
  ): Promise<AuthorRow | undefined> {
    const idBigInt = typeof id === 'number' ? BigInt(id) : id;
    const [updatedAuthor] = await this.db
      .update(authors)
      .set({
        ...data,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(authors.id, idBigInt))
      .returning();
    return updatedAuthor;
  }

  /**
   * Delete an author by ID
   * @param id - Author ID (number or bigint)
   * @returns true if author was deleted, false if not found
   */
  async delete(id: number | bigint): Promise<boolean> {
    const idBigInt = typeof id === 'number' ? BigInt(id) : id;
    const result = await this.db
      .delete(authors)
      .where(eq(authors.id, idBigInt))
      .returning();
    return result.length > 0;
  }
}
