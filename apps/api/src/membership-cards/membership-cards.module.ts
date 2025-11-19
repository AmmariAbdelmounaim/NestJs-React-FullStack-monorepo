import { Module } from '@nestjs/common';
import { MembershipCardsService } from './membership-cards.service';
import { MembershipCardsRepository } from './membership-cards.repository';

@Module({
  providers: [MembershipCardsRepository, MembershipCardsService],
  exports: [MembershipCardsService, MembershipCardsRepository],
})
export class MembershipCardsModule {}
