import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { mapDto } from '../utils/map-dto';
import { CreateLoanDto, LoanResponseDto, LoanStatus } from './loans.dto';
import { LoansRepository, LoanInsert } from './loans.repository';
import { BooksRepository } from '../books/books.repository';
import { WithErrorHandling } from '../utils/with-error-handling.decorator';

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
  ): Promise<LoanResponseDto> {
    // Check if book exists
    const book = await this.booksRepository.findById(createLoanDto.bookId);
    if (!book) {
      throw new NotFoundException(
        `Book with id ${createLoanDto.bookId} not found`,
      );
    }

    // Check if book is already loaned (has an ongoing loan)
    const isLoaned = await this.loansRepository.isBookLoaned(
      createLoanDto.bookId,
    );
    if (isLoaned) {
      throw new BadRequestException(
        `Book with id ${createLoanDto.bookId} is already loaned`,
      );
    }

    // Calculate due date (default to 21 days from now if not provided)
    const dueAt =
      createLoanDto.dueAt ||
      new Date(
        Date.now() + DEFAULT_LOAN_DAYS * 24 * 60 * 60 * 1000,
      ).toISOString();

    // Create loan
    const loanData: LoanInsert = {
      userId,
      bookId: createLoanDto.bookId,
      status: LoanStatus.ONGOING,
      dueAt,
    };

    const newLoan = await this.loansRepository.create(loanData);
    return mapDto(LoanResponseDto, {
      ...newLoan,
      status: newLoan.status as LoanStatus,
      id: Number(newLoan.id),
      userId: Number(newLoan.userId),
      bookId: Number(newLoan.bookId),
      dueAt: newLoan.dueAt ?? undefined,
      returnedAt: newLoan.returnedAt ?? undefined,
    });
  }

  @WithErrorHandling('LoansService', 'returnLoan')
  async returnLoan(loanId: number): Promise<LoanResponseDto> {
    // Find the loan
    const loan = await this.loansRepository.findById(loanId);
    if (!loan) {
      throw new NotFoundException(`Loan with id ${loanId} not found`);
    }

    // Check if loan is already returned
    if (loan.returnedAt) {
      throw new BadRequestException(
        `Loan with id ${loanId} is already returned`,
      );
    }

    // Determine status based on due date
    const now = new Date();
    const dueDate = loan.dueAt ? new Date(loan.dueAt) : null;
    const isLate = dueDate && now > dueDate;

    // Update loan
    const updatedLoan = await this.loansRepository.update(loanId, {
      status: isLate ? LoanStatus.LATE : LoanStatus.RETURNED,
      returnedAt: now.toISOString(),
    });

    if (!updatedLoan) {
      throw new NotFoundException(`Loan with id ${loanId} not found`);
    }

    return mapDto(LoanResponseDto, {
      ...updatedLoan,
      id: Number(updatedLoan.id),
      userId: Number(updatedLoan.userId),
      bookId: Number(updatedLoan.bookId),
      status: updatedLoan.status as LoanStatus,
      dueAt: updatedLoan.dueAt ?? undefined,
      returnedAt: updatedLoan.returnedAt ?? undefined,
    });
  }

  @WithErrorHandling('LoansService', 'findOngoing')
  async findOngoing(userId?: number): Promise<LoanResponseDto[]> {
    const loans = !userId
      ? await this.loansRepository.findOngoing()
      : await this.loansRepository.findOngoingByUserId(userId);
    return loans.map((loan) =>
      mapDto(LoanResponseDto, {
        ...loan,
        id: Number(loan.id),
        userId: Number(loan.userId),
        bookId: Number(loan.bookId),
        status: loan.status as LoanStatus,
        dueAt: loan.dueAt ?? undefined,
        returnedAt: loan.returnedAt ?? undefined,
      }),
    );
  }

  @WithErrorHandling('LoansService', 'findByUserId')
  async findByUserId(userId: number): Promise<LoanResponseDto[]> {
    const userLoans = await this.loansRepository.findByUserId(userId);
    return userLoans.map((loan) =>
      mapDto(LoanResponseDto, {
        ...loan,
        id: Number(loan.id),
        userId: Number(loan.userId),
        bookId: Number(loan.bookId),
        status: loan.status as LoanStatus,
        dueAt: loan.dueAt ?? undefined,
        returnedAt: loan.returnedAt ?? undefined,
      }),
    );
  }

  @WithErrorHandling('LoansService', 'findByBookId')
  async findByBookId(bookId: number): Promise<LoanResponseDto[]> {
    const bookLoans = await this.loansRepository.findByBookId(bookId);
    return bookLoans.map((loan) =>
      mapDto(LoanResponseDto, {
        ...loan,
        id: Number(loan.id),
        userId: Number(loan.userId),
        bookId: Number(loan.bookId),
        status: loan.status as LoanStatus,
        dueAt: loan.dueAt ?? undefined,
        returnedAt: loan.returnedAt ?? undefined,
      }),
    );
  }

  @WithErrorHandling('LoansService', 'findMyLoans')
  async findMyLoans(userId: number): Promise<LoanResponseDto[]> {
    // Return all loans for the user (both ongoing and returned)
    const userLoans = await this.loansRepository.findByUserId(userId);
    return userLoans.map((loan) =>
      mapDto(LoanResponseDto, {
        ...loan,
        id: Number(loan.id),
        userId: Number(loan.userId),
        bookId: Number(loan.bookId),
        status: loan.status as LoanStatus,
        dueAt: loan.dueAt ?? undefined,
        returnedAt: loan.returnedAt ?? undefined,
      }),
    );
  }

  @WithErrorHandling('LoansService', 'findOne')
  async findOne(id: number): Promise<LoanResponseDto> {
    const loan = await this.loansRepository.findById(id);

    if (!loan) {
      throw new NotFoundException(`Loan with id ${id} not found`);
    }

    return mapDto(LoanResponseDto, {
      ...loan,
      id: Number(loan.id),
      userId: Number(loan.userId),
      bookId: Number(loan.bookId),
      status: loan.status as LoanStatus,
      dueAt: loan.dueAt ?? undefined,
      returnedAt: loan.returnedAt ?? undefined,
    });
  }
}
