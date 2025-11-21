import { Injectable, Inject } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { users, createDatabase, UserRow, UserInsert } from '../db';
import { TransactionService } from '../db/transaction.service';

type Database = ReturnType<typeof createDatabase>;

@Injectable()
export class UsersRepository {
  constructor(
    @Inject('DB') private readonly db: Database,
    private readonly transactionService: TransactionService,
  ) {}

  async findById(
    id: bigint,
    rlsContext?: { userId?: string; userRole?: string },
  ): Promise<UserRow | undefined> {
    return await this.transactionService.withTransaction(async (tx) => {
      const [user] = await tx
        .select()
        .from(users)
        .where(eq(users.id, id))
        .limit(1);
      return user;
    }, rlsContext);
  }

  async findByEmail(
    email: string,
    rlsContext?: { userId?: string; userRole?: string },
  ): Promise<UserRow | undefined> {
    return await this.transactionService.withTransaction(async (tx) => {
      const [user] = await tx
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);
      return user;
    }, rlsContext);
  }

  async existsByEmail(
    email: string,
    rlsContext?: { userId?: string; userRole?: string },
  ): Promise<boolean> {
    return await this.transactionService.withTransaction(async (tx) => {
      const [user] = await this.db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, email))
        .limit(1);
      return !!user;
    }, rlsContext);
  }

  async create(
    data: UserInsert,
    rlsContext?: { userId?: string; userRole?: string },
  ): Promise<UserRow> {
    return await this.transactionService.withTransaction(async (tx) => {
      const [newUser] = await tx
        .insert(users)
        .values({
          email: data.email,
          firstName: data.firstName,
          lastName: data.lastName,
          password: data.password,
          role: data.role,
        })
        .returning();
      return newUser;
    }, rlsContext);
  }

  async update(
    id: bigint,
    data: UserInsert,
    rlsContext?: { userId?: string; userRole?: string },
  ): Promise<UserRow | undefined> {
    return await this.transactionService.withTransaction(async (tx) => {
      const [updatedUser] = await tx
        .update(users)
        .set({
          ...data,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(users.id, id))
        .returning();
      return updatedUser;
    }, rlsContext);
  }

  async delete(
    id: bigint,
    rlsContext?: { userId?: string; userRole?: string },
  ): Promise<boolean> {
    return await this.transactionService.withTransaction(async (tx) => {
      const result = await tx.delete(users).where(eq(users.id, id)).returning();
      return result.length > 0;
    }, rlsContext);
  }
}
