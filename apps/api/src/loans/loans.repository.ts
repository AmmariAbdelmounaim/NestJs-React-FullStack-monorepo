import { Injectable } from '@nestjs/common';
import { eq, and, isNull } from 'drizzle-orm';
import { loans, LoanRow, LoanInsert } from '../db';
import { TransactionService } from '../db/transaction.service';

@Injectable()
export class LoansRepository {
  constructor(
    private readonly transactionService: TransactionService,
  ) {}

  async findById(
    id: bigint,
    rlsContext?: { userId?: string; userRole?: string },
  ): Promise<LoanRow | undefined> {
    return await this.transactionService.withTransaction(async (tx) => {
      const [loan] = await tx
        .select()
        .from(loans)
        .where(eq(loans.id, id))
        .limit(1);
      return loan;
    }, rlsContext);
  }

  async findAll(rlsContext?: {
    userId?: string;
    userRole?: string;
  }): Promise<LoanRow[]> {
    return await this.transactionService.withTransaction(async (tx) => {
      return await tx.select().from(loans);
    }, rlsContext);
  }

  async findByUserId(
    userId: number,
    rlsContext?: { userId?: string; userRole?: string },
  ): Promise<LoanRow[]> {
    return await this.transactionService.withTransaction(async (tx) => {
      return await tx.select().from(loans).where(eq(loans.userId, userId));
    }, rlsContext);
  }

  async findByBookId(
    bookId: number,
    rlsContext?: { userId?: string; userRole?: string },
  ): Promise<LoanRow[]> {
    return await this.transactionService.withTransaction(async (tx) => {
      return await tx.select().from(loans).where(eq(loans.bookId, bookId));
    }, rlsContext);
  }

  async findOngoing(rlsContext?: {
    userId?: string;
    userRole?: string;
  }): Promise<LoanRow[]> {
    return await this.transactionService.withTransaction(async (tx) => {
      return await tx.select().from(loans).where(isNull(loans.returnedAt));
    }, rlsContext);
  }

  async findOngoingByUserId(
    userId: number,
    rlsContext?: { userId?: string; userRole?: string },
  ): Promise<LoanRow[]> {
    return await this.transactionService.withTransaction(async (tx) => {
      return await tx
        .select()
        .from(loans)
        .where(and(eq(loans.userId, userId), isNull(loans.returnedAt)));
    }, rlsContext);
  }

  async findOngoingByBookId(
    bookId: number,
    rlsContext?: { userId?: string; userRole?: string },
  ): Promise<LoanRow | undefined> {
    return await this.transactionService.withTransaction(async (tx) => {
      const [loan] = await tx
        .select()
        .from(loans)
        .where(and(eq(loans.bookId, bookId), isNull(loans.returnedAt)))
        .limit(1);
      return loan;
    }, rlsContext);
  }

  async isBookLoaned(
    bookId: number,
    rlsContext?: { userId?: string; userRole?: string },
  ): Promise<boolean> {
    return await this.transactionService.withTransaction(async (tx) => {
      const [ongoingLoan] = await tx
        .select()
        .from(loans)
        .where(and(eq(loans.bookId, bookId), isNull(loans.returnedAt)))
        .limit(1);
      return !!ongoingLoan;
    }, rlsContext);
  }

  async create(
    data: LoanInsert,
    rlsContext?: { userId?: string; userRole?: string },
  ): Promise<LoanRow> {
    return await this.transactionService.withTransaction(async (tx) => {
      const [newLoan] = await tx.insert(loans).values(data).returning();
      return newLoan;
    }, rlsContext);
  }

  async update(
    id: bigint,
    data: Partial<LoanInsert>,
    rlsContext?: { userId?: string; userRole?: string },
  ): Promise<LoanRow | undefined> {
    return await this.transactionService.withTransaction(async (tx) => {
      const [updatedLoan] = await tx
        .update(loans)
        .set({
          ...data,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(loans.id, id))
        .returning();
      return updatedLoan;
    }, rlsContext);
  }
}
