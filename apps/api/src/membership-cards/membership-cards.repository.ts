import { Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import {
  membershipCards,
  MembershipCardRow,
  MembershipCardInsert,
} from '../db';
import { TransactionService } from '../db/transaction.service';

@Injectable()
export class MembershipCardsRepository {
  constructor(private readonly transactionService: TransactionService) {}

  async findById(
    id: bigint,
    rlsContext?: { userId?: string; userRole?: string },
  ): Promise<MembershipCardRow | undefined> {
    return await this.transactionService.withTransaction(async (tx) => {
      const [card] = await tx
        .select()
        .from(membershipCards)
        .where(eq(membershipCards.id, id))
        .limit(1);
      return card;
    }, rlsContext);
  }

  async findBySerialNumber(
    serialNumber: string,
    rlsContext?: { userId?: string; userRole?: string },
  ): Promise<MembershipCardRow | undefined> {
    return await this.transactionService.withTransaction(async (tx) => {
      const [card] = await tx
        .select()
        .from(membershipCards)
        .where(eq(membershipCards.serialNumber, serialNumber))
        .limit(1);
      return card;
    }, rlsContext);
  }

  async existsBySerialNumber(
    serialNumber: string,
    rlsContext?: { userId?: string; userRole?: string },
  ): Promise<boolean> {
    return await this.transactionService.withTransaction(async (tx) => {
      const [card] = await tx
        .select({ id: membershipCards.id })
        .from(membershipCards)
        .where(eq(membershipCards.serialNumber, serialNumber))
        .limit(1);
      return !!card;
    }, rlsContext);
  }

  async create(
    data: MembershipCardInsert,
    rlsContext?: { userId?: string; userRole?: string },
  ): Promise<MembershipCardRow> {
    return await this.transactionService.withTransaction(async (tx) => {
      const [newCard] = await tx
        .insert(membershipCards)
        .values({
          serialNumber: data.serialNumber,
          status: data.status,
          userId: data.userId,
          assignedAt: data.assignedAt,
          archivedAt: data.archivedAt,
        })
        .returning();
      return newCard;
    }, rlsContext);
  }

  async update(
    id: bigint,
    data: Partial<MembershipCardInsert>,
    rlsContext?: { userId?: string; userRole?: string },
  ): Promise<MembershipCardRow | undefined> {
    return await this.transactionService.withTransaction(async (tx) => {
      const [updatedCard] = await tx
        .update(membershipCards)
        .set({
          ...data,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(membershipCards.id, id))
        .returning();
      return updatedCard;
    }, rlsContext);
  }

  async delete(
    id: bigint,
    rlsContext?: { userId?: string; userRole?: string },
  ): Promise<boolean> {
    return await this.transactionService.withTransaction(async (tx) => {
      const result = await tx
        .delete(membershipCards)
        .where(eq(membershipCards.id, id))
        .returning();
      return result.length > 0;
    }, rlsContext);
  }

  async findFirstFree(rlsContext?: {
    userId?: string;
    userRole?: string;
  }): Promise<MembershipCardRow | undefined> {
    return await this.transactionService.withTransaction(async (tx) => {
      const [card] = await tx
        .select()
        .from(membershipCards)
        .where(eq(membershipCards.status, 'FREE'))
        .limit(1);
      return card;
    }, rlsContext);
  }
}
