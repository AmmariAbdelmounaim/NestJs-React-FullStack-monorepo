import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { mapDto } from '../utils/map-dto';
import { CreateLoanDto, LoanResponseDto } from './loans.dto';
import { LoansRepository } from './loans.repository';
import { BooksRepository } from '../books/books.repository';
import { WithErrorHandling } from '../utils/with-error-handling.decorator';
import { LoanInsert } from '../db';

const DEFAULT_LOAN_DAYS = 21;

@Injectable()
export class LoansService {
  constructor(
    private readonly loansRepository: LoansRepository,
    private readonly booksRepository: BooksRepository,
  ) {}

  @WithErrorHandling('LoansService', 'create')
  async create(
    createLoanDto: CreateLoanDto,
    userId: number,
    currentUser?: { id: number; role: string },
  ): Promise<LoanResponseDto> {
    const book = await this.booksRepository.findById(
      BigInt(createLoanDto.bookId),
    );
    if (!book) {
      throw new NotFoundException(
        `Book with id ${createLoanDto.bookId} not found`,
      );
    }

    const isLoaned = await this.loansRepository.isBookLoaned(
      createLoanDto.bookId,
    );
    if (isLoaned) {
      throw new BadRequestException(
        `Book with id ${createLoanDto.bookId} is already loaned`,
      );
    }

    const dueAt =
      createLoanDto.dueAt ||
      new Date(
        Date.now() + DEFAULT_LOAN_DAYS * 24 * 60 * 60 * 1000,
      ).toISOString();

    const loanData: LoanInsert = {
      userId,
      bookId: createLoanDto.bookId,
      status: 'ONGOING',
      dueAt,
    };

    const rlsContext = currentUser
      ? { userId: currentUser.id.toString(), userRole: currentUser.role }
      : undefined;

    const newLoan = await this.loansRepository.create(loanData, rlsContext);
    return mapDto(LoanResponseDto, {
      ...newLoan,
      status: newLoan.status,
      id: Number(newLoan.id),
      userId: newLoan.userId,
      bookId: newLoan.bookId,
      dueAt: newLoan.dueAt,
      returnedAt: newLoan.returnedAt,
    });
  }

  @WithErrorHandling('LoansService', 'returnLoan')
  async returnLoan(
    loanId: number,
    userId: number,
    currentUser?: { id: number; role: string },
  ): Promise<LoanResponseDto> {
    const rlsContext = currentUser
      ? { userId: currentUser.id.toString(), userRole: currentUser.role }
      : undefined;

    // Find the loan
    const loan = await this.loansRepository.findById(BigInt(loanId), rlsContext);

    if (!loan) {
      throw new NotFoundException(`Loan with id ${loanId} not found`);
    }

    if (loan.returnedAt) {
      throw new BadRequestException(
        `Loan with id ${loanId} is already returned`,
      );
    }

    if (userId !== loan.userId) {
      throw new ForbiddenException('You can only return your own loans');
    }

    // Determine status based on due date
    const now = new Date();
    const dueDate = loan.dueAt ? new Date(loan.dueAt) : null;
    const isLate = dueDate && now > dueDate;

    // Update loan
    const updatedLoan = await this.loansRepository.update(
      BigInt(loanId),
      {
        status: isLate ? 'LATE' : 'RETURNED',
        returnedAt: now.toISOString(),
      },
      rlsContext,
    );

    if (!updatedLoan) {
      throw new NotFoundException(`Loan with id ${loanId} not found`);
    }

    return mapDto(LoanResponseDto, {
      ...updatedLoan,
      id: Number(updatedLoan.id),
      userId: updatedLoan.userId,
      bookId: updatedLoan.bookId,
      status: updatedLoan.status,
      dueAt: updatedLoan.dueAt,
      returnedAt: updatedLoan.returnedAt,
    });
  }

  @WithErrorHandling('LoansService', 'findOngoing')
  async findOngoing(
    userId?: number,
    currentUser?: { id: number; role: string },
  ): Promise<LoanResponseDto[]> {
    const rlsContext = currentUser
      ? { userId: currentUser.id.toString(), userRole: currentUser.role }
      : undefined;

    const loans = !userId
      ? await this.loansRepository.findOngoing(rlsContext)
      : await this.loansRepository.findOngoingByUserId(userId, rlsContext);

    return loans.map((loan) =>
      mapDto(LoanResponseDto, {
        ...loan,
        id: Number(loan.id),
        userId: loan.userId,
        bookId: loan.bookId,
        status: loan.status,
        dueAt: loan.dueAt,
        returnedAt: loan.returnedAt,
      }),
    );
  }

  @WithErrorHandling('LoansService', 'findByUserId')
  async findByUserId(
    userId: number,
    currentUser?: { id: number; role: string },
  ): Promise<LoanResponseDto[]> {
    const rlsContext = currentUser
      ? { userId: currentUser.id.toString(), userRole: currentUser.role }
      : undefined;

    const userLoans = await this.loansRepository.findByUserId(
      userId,
      rlsContext,
    );
    return userLoans.map((loan) =>
      mapDto(LoanResponseDto, {
        ...loan,
        id: Number(loan.id),
        userId: loan.userId,
        bookId: loan.bookId,
        status: loan.status,
        dueAt: loan.dueAt,
        returnedAt: loan.returnedAt,
      }),
    );
  }

  @WithErrorHandling('LoansService', 'findByBookId')
  async findByBookId(
    bookId: number,
    currentUser?: { id: number; role: string },
  ): Promise<LoanResponseDto[]> {
    const rlsContext = currentUser
      ? { userId: currentUser.id.toString(), userRole: currentUser.role }
      : undefined;

    const bookLoans = await this.loansRepository.findByBookId(bookId, rlsContext);

    return bookLoans.map((loan) =>
      mapDto(LoanResponseDto, {
        ...loan,
        id: Number(loan.id),
        userId: loan.userId,
        bookId: loan.bookId,
        status: loan.status,
        dueAt: loan.dueAt,
        returnedAt: loan.returnedAt,
      }),
    );
  }

  @WithErrorHandling('LoansService', 'findMyLoans')
  async findMyLoans(
    userId: number,
    currentUser?: { id: number; role: string },
  ): Promise<LoanResponseDto[]> {
    const rlsContext = currentUser
      ? { userId: currentUser.id.toString(), userRole: currentUser.role }
      : undefined;

    const userLoans = await this.loansRepository.findByUserId(
      userId,
      rlsContext,
    );

    return userLoans.map((loan) =>
      mapDto(LoanResponseDto, {
        ...loan,
        id: Number(loan.id),
        userId: loan.userId,
        bookId: loan.bookId,
        status: loan.status,
        dueAt: loan.dueAt,
        returnedAt: loan.returnedAt,
      }),
    );
  }

  @WithErrorHandling('LoansService', 'findOne')
  async findOne(
    id: number,
    currentUser?: { id: number; role: string },
  ): Promise<LoanResponseDto> {
    const rlsContext = currentUser
      ? { userId: currentUser.id.toString(), userRole: currentUser.role }
      : undefined;

    const loan = await this.loansRepository.findById(BigInt(id), rlsContext);

    if (!loan) {
      throw new NotFoundException(`Loan with id ${id} not found`);
    }

    return mapDto(LoanResponseDto, {
      ...loan,
      id: Number(loan.id),
      userId: loan.userId,
      bookId: loan.bookId,
      status: loan.status,
      dueAt: loan.dueAt,
      returnedAt: loan.returnedAt,
    });
  }
}
