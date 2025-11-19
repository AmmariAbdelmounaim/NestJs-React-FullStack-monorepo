import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiNotFoundResponse,
  ApiForbiddenResponse,
  ApiCreatedResponse,
} from '@nestjs/swagger';
import { AuthorsService } from './authors.service';
import {
  CreateAuthorDto,
  UpdateAuthorDto,
  AuthorResponseDto,
  AuthorWithBooksDto,
} from './authors.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('authors')
@Controller('authors')
export class AuthorsController {
  constructor(private readonly authorsService: AuthorsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Create a new author',
    description:
      'Create a new author. This operation is restricted to users with ADMIN role only.',
  })
  @ApiCreatedResponse({
    description: 'Author successfully created',
    type: AuthorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiForbiddenResponse({
    description: 'Forbidden - Admin role required to create authors',
  })
  @ApiBadRequestResponse({
    description: 'Invalid input data',
  })
  create(@Body() createAuthorDto: CreateAuthorDto): Promise<AuthorResponseDto> {
    return this.authorsService.create(createAuthorDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get all authors',
    description:
      'Retrieve a list of all authors. This operation is restricted to users with ADMIN role only.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of authors retrieved successfully',
    type: [AuthorResponseDto],
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiForbiddenResponse({
    description: 'Forbidden - Admin role required to list all authors',
  })
  findAll(): Promise<AuthorResponseDto[]> {
    return this.authorsService.findAll();
  }

  @Get('by-book/:bookId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get authors by book ID',
    description:
      'Retrieve all authors who wrote a specific book. Requires authentication.',
  })
  @ApiParam({
    name: 'bookId',
    description: 'Book ID',
    type: Number,
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Authors found and returned successfully',
    type: [AuthorResponseDto],
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiNotFoundResponse({
    description: 'Book not found',
  })
  findByBookId(
    @Param('bookId', ParseIntPipe) bookId: number,
  ): Promise<AuthorResponseDto[]> {
    return this.authorsService.findByBookId(bookId);
  }

  @Get(':id/books')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get books written by an author',
    description:
      'Retrieve all books written by a specific author. Requires authentication.',
  })
  @ApiParam({
    name: 'id',
    description: 'Author ID',
    type: Number,
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Author and books found and returned successfully',
    type: AuthorWithBooksDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiNotFoundResponse({
    description: 'Author not found',
  })
  async findBooksByAuthorId(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<AuthorWithBooksDto> {
    return this.authorsService.findBooksByAuthorId(id);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get author by ID',
    description:
      'Get author information by ID including all books written by this author. Requires authentication.',
  })
  @ApiParam({
    name: 'id',
    description: 'Author ID',
    type: Number,
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Author found and returned successfully with books',
    type: AuthorWithBooksDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiNotFoundResponse({
    description: 'Author not found',
  })
  findOne(@Param('id', ParseIntPipe) id: number): Promise<AuthorWithBooksDto> {
    return this.authorsService.findBooksByAuthorId(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Update author by ID',
    description:
      'Update author information by ID. This operation is restricted to users with ADMIN role only.',
  })
  @ApiParam({
    name: 'id',
    description: 'Author ID',
    type: Number,
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Author successfully updated',
    type: AuthorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiForbiddenResponse({
    description: 'Forbidden - Admin role required to update authors',
  })
  @ApiNotFoundResponse({
    description: 'Author not found',
  })
  @ApiBadRequestResponse({
    description: 'Invalid input data',
  })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateAuthorDto: UpdateAuthorDto,
  ): Promise<AuthorResponseDto> {
    return this.authorsService.update(id, updateAuthorDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Delete author by ID',
    description:
      'Delete an author by ID. This operation is restricted to users with ADMIN role only.',
  })
  @ApiParam({
    name: 'id',
    description: 'Author ID',
    type: Number,
    example: 1,
  })
  @ApiResponse({
    status: 204,
    description: 'Author successfully deleted',
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiForbiddenResponse({
    description: 'Forbidden - Admin role required to delete authors',
  })
  @ApiNotFoundResponse({
    description: 'Author not found',
  })
  remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.authorsService.remove(id);
  }
}
