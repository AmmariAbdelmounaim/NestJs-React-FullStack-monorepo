import { Injectable, Inject } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { users, createDatabase, UserRow, UserInsert, DEFAULT_USER_ROLE } from '../db';

type Database = ReturnType<typeof createDatabase>;

@Injectable()
export class UsersRepository {
  constructor(@Inject('DB') private readonly db: Database) {}

  /**
   * Find a user by ID
   * @param id - User ID (number or bigint)
   * @returns User row or undefined if not found
   */
  async findById(id: number | bigint): Promise<UserRow | undefined> {
    const idBigInt = typeof id === 'number' ? BigInt(id) : id;
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.id, idBigInt))
      .limit(1);
    return user;
  }

  /**
   * Find a user by email
   * @param email - User email address
   * @returns User row or undefined if not found
   */
  async findByEmail(email: string): Promise<UserRow | undefined> {
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    return user;
  }

  /**
   * Find a user by email including password (for authentication)
   * @param email - User email address
   * @returns User row with password or undefined if not found
   */
  async findByEmailWithPassword(email: string): Promise<UserRow | undefined> {
    // Same as findByEmail, but explicitly named for auth purposes
    return this.findByEmail(email);
  }

  /**
   * Check if a user exists with the given email
   * @param email - User email address
   * @returns true if user exists, false otherwise
   */
  async existsByEmail(email: string): Promise<boolean> {
    const [user] = await this.db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    return !!user;
  }

  /**
   * Create a new user
   * @param data - User data to insert
   * @returns Created user row
   */
  async create(data: UserInsert): Promise<UserRow> {
    const [newUser] = await this.db
      .insert(users)
      .values({
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        password: data.password,
        role: data.role || DEFAULT_USER_ROLE,
      })
      .returning();
    return newUser;
  }

  /**
   * Update a user by ID
   * @param id - User ID (number or bigint)
   * @param data - Partial user data to update
   * @returns Updated user row or undefined if not found
   */
  async update(
    id: number | bigint,
    data: UserInsert,
  ): Promise<UserRow | undefined> {
    const idBigInt = typeof id === 'number' ? BigInt(id) : id;
    const [updatedUser] = await this.db
      .update(users)
      .set({
        ...data,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(users.id, idBigInt))
      .returning();
    return updatedUser;
  }

  /**
   * Delete a user by ID
   * @param id - User ID (number or bigint)
   * @returns true if user was deleted, false if not found
   */
  async delete(id: number | bigint): Promise<boolean> {
    const idBigInt = typeof id === 'number' ? BigInt(id) : id;
    const result = await this.db
      .delete(users)
      .where(eq(users.id, idBigInt))
      .returning();
    return result.length > 0;
  }
}
