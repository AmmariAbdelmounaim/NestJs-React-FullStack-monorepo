import { Injectable } from '@nestjs/common';
import { MembershipCardsRepository } from './membership-cards.repository';
import { WithErrorHandling } from '../utils/with-error-handling.decorator';
import { MembershipCardBaseDto } from './membership-cards.dto';
import { mapDto } from '../utils/map-dto';

@Injectable()
export class MembershipCardsService {
  constructor(
    private readonly membershipCardsRepository: MembershipCardsRepository,
  ) {}

  @WithErrorHandling('MembershipCardsService', 'findFreeMembershipCard')
  async findFirstFree(): Promise<MembershipCardBaseDto | undefined> {
    const card = await this.membershipCardsRepository.findFirstFree();

    if (!card) return undefined;

    return mapDto(MembershipCardBaseDto, {
      ...card,
      id: Number(card.id),
    });
  }

  @WithErrorHandling('MembershipCardsService', 'assignToUser')
  async assignToUser(
    cardId: number,
    userId: number,
    currentUser?: { id: number; role: string },
  ): Promise<MembershipCardBaseDto | undefined> {
    const rlsContext = currentUser
      ? { userId: currentUser.id.toString(), userRole: currentUser.role }
      : undefined;

    const updatedCard = await this.membershipCardsRepository.update(
      BigInt(cardId),
      {
        status: 'IN_USE',
        userId,
        assignedAt: new Date().toISOString(),
      },
      rlsContext,
    );

    if (updatedCard) {
      return mapDto(MembershipCardBaseDto, {
        ...updatedCard,
        id: Number(updatedCard.id),
      });
    }

    return undefined;
  }
}
