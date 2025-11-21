import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
  Request,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiNotFoundResponse,
  ApiForbiddenResponse,
  ApiCreatedResponse,
} from '@nestjs/swagger';
import { LoansService } from './loans.service';
import { CreateLoanDto, LoanResponseDto } from './loans.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ForbiddenException } from '@nestjs/common';
import { UserResponseDto } from '../users/users.dto';

@ApiTags('loans')
@Controller('loans')
export class LoansController {
  constructor(private readonly loansService: LoansService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('USER')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Create a new loan',
    description:
      'Borrow a book. Only users with USER role can create loans. Users can only borrow books that are not currently loaned.',
  })
  @ApiCreatedResponse({
    description: 'Loan successfully created',
    type: LoanResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiForbiddenResponse({
    description: 'Forbidden - USER role required to create loans',
  })
  @ApiBadRequestResponse({
    description: 'Book is already loaned or invalid input data',
  })
  @ApiNotFoundResponse({
    description: 'Book not found',
  })
  create(
    @Body() createLoanDto: CreateLoanDto,
    @Request() req: Request & { user: UserResponseDto },
  ): Promise<LoanResponseDto> {
    return this.loansService.create(createLoanDto, req.user.id, req.user);
  }

  @Post(':id/return')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('USER')
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Return a loaned book',
    description:
      'Return a book. Only users with USER role can return loans. The loan status will be set to RETURNED or LATE based on the due date. Users can only return their own loans.',
  })
  @ApiParam({
    name: 'id',
    description: 'Loan ID',
    type: Number,
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Book successfully returned',
    type: LoanResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiForbiddenResponse({
    description: 'Forbidden - USER role required to return loans',
  })
  @ApiNotFoundResponse({
    description: 'Loan not found',
  })
  @ApiBadRequestResponse({
    description: 'Loan is already returned',
  })
  async returnLoan(
    @Param('id', ParseIntPipe) loanId: number,
    @Request() req: Request & { user: UserResponseDto },
  ): Promise<LoanResponseDto> {
    return this.loansService.returnLoan(loanId, req.user.id, req.user);
  }

  @Get('my')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('USER')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get my ongoing loans',
    description:
      'Retrieve all ongoing loans for the current authenticated user. Only available to users with USER role.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of user ongoing loans retrieved successfully',
    type: [LoanResponseDto],
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiForbiddenResponse({
    description: 'Forbidden - USER role required',
  })
  findMyOngoingLoans(
    @Request() req: Request & { user: UserResponseDto },
  ): Promise<LoanResponseDto[]> {
    return this.loansService.findOngoing(Number(req.user.id), req.user);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get all ongoing loans (Admin only)',
    description:
      'Retrieve all ongoing loans regardless of user. This operation is restricted to users with ADMIN role only.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of all ongoing loans retrieved successfully',
    type: [LoanResponseDto],
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiForbiddenResponse({
    description: 'Forbidden - Admin role required',
  })
  findAllOngoing(
    @Request() req: Request & { user: UserResponseDto },
  ): Promise<LoanResponseDto[]> {
    return this.loansService.findOngoing(undefined, req.user);
  }

  @Get('search')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Search loans by user or book (Admin only)',
    description:
      'Search loans by user ID or book ID. This operation is restricted to users with ADMIN role only. Provide either userId or bookId query parameter.',
  })
  @ApiQuery({
    name: 'userId',
    description: 'User ID to search loans for',
    type: Number,
    required: false,
    example: 1,
  })
  @ApiQuery({
    name: 'bookId',
    description: 'Book ID to search loans for',
    type: Number,
    required: false,
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'List of loans matching the search criteria',
    type: [LoanResponseDto],
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiForbiddenResponse({
    description: 'Forbidden - Admin role required',
  })
  @ApiBadRequestResponse({
    description: 'Either userId or bookId query parameter is required',
  })
  searchLoans(
    @Request() req: Request & { user: UserResponseDto },
    @Query('userId', new ParseIntPipe({ optional: true })) userId?: number,
    @Query('bookId', new ParseIntPipe({ optional: true })) bookId?: number,
  ): Promise<LoanResponseDto[]> {
    if (userId) {
      return this.loansService.findByUserId(userId, req.user);
    }
    if (bookId) {
      return this.loansService.findByBookId(bookId, req.user);
    }
    throw new ForbiddenException(
      'Either userId or bookId query parameter is required',
    );
  }
}
