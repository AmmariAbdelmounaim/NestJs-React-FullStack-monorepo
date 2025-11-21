import { Injectable, NotFoundException } from '@nestjs/common';
import { mapDto } from '../utils/map-dto';
import {
  CreateAuthorDto,
  UpdateAuthorDto,
  AuthorResponseDto,
  AuthorWithBooksDto,
} from './authors.dto';
import { AuthorInsert } from '../db';
import { AuthorsRepository } from './authors.repository';
import { WithErrorHandling } from '../utils/with-error-handling.decorator';

@Injectable()
export class AuthorsService {
  constructor(private readonly authorsRepository: AuthorsRepository) {}

  @WithErrorHandling('AuthorsService', 'create')
  async create(
    createAuthorDto: CreateAuthorDto,
    currentUser?: { id: number; role: string },
  ): Promise<AuthorResponseDto> {
    const rlsContext = currentUser
      ? { userId: currentUser.id.toString(), userRole: currentUser.role }
      : undefined;

    const newAuthor = await this.authorsRepository.create(
      createAuthorDto,
      rlsContext,
    );
    return mapDto(AuthorResponseDto, {
      ...newAuthor,
      id: Number(newAuthor.id),
    });
  }

  @WithErrorHandling('AuthorsService', 'findAll')
  async findAll(): Promise<AuthorResponseDto[]> {
    const authors = await this.authorsRepository.findAll();
    return authors.map((author) =>
      mapDto(AuthorResponseDto, {
        ...author,
        id: Number(author.id),
      }),
    );
  }

  @WithErrorHandling('AuthorsService', 'findOne')
  async findOne(id: number): Promise<AuthorResponseDto> {
    const author = await this.authorsRepository.findById(BigInt(id));

    if (!author) {
      throw new NotFoundException(`Author with the id ${id} is not found`);
    }

    return mapDto(AuthorResponseDto, {
      ...author,
      id: Number(author.id),
    });
  }

  @WithErrorHandling('AuthorsService', 'findByBookId')
  async findByBookId(bookId: number): Promise<AuthorResponseDto[]> {
    const authors = await this.authorsRepository.findByBookId(bookId);
    return authors.map((author) =>
      mapDto(AuthorResponseDto, {
        ...author,
        id: Number(author.id),
      }),
    );
  }

  @WithErrorHandling('AuthorsService', 'findBooksByAuthorId')
  async findBooksByAuthorId(authorId: number): Promise<AuthorWithBooksDto> {
    const author = await this.authorsRepository.findById(BigInt(authorId));

    if (!author) {
      throw new NotFoundException(
        `Author with the id ${authorId} is not found`,
      );
    }

    const books = await this.authorsRepository.findBooksByAuthorId(authorId);

    const authorResponse = mapDto(AuthorResponseDto, {
      ...author,
      id: Number(author.id),
    });

    const booksPlain = books.map((book) => ({
      ...book,
      id: Number(book.id),
    }));

    const authorWithBooks = mapDto(AuthorWithBooksDto, {
      ...authorResponse,
      books: booksPlain,
    });
    return authorWithBooks;
  }

  @WithErrorHandling('AuthorsService', 'update')
  async update(
    id: number,
    updateAuthorDto: UpdateAuthorDto,
    currentUser?: { id: number; role: string },
  ): Promise<AuthorResponseDto> {
    const existingAuthor = await this.authorsRepository.findById(BigInt(id));

    if (!existingAuthor) {
      throw new NotFoundException(`Author with the id ${id} is not found`);
    }

    const updateData: Partial<AuthorInsert> = {};

    if (updateAuthorDto.firstName !== undefined)
      updateData.firstName = updateAuthorDto.firstName;
    if (updateAuthorDto.lastName !== undefined)
      updateData.lastName = updateAuthorDto.lastName;
    if (updateAuthorDto.birthDate !== undefined)
      updateData.birthDate = updateAuthorDto.birthDate;
    if (updateAuthorDto.deathDate !== undefined)
      updateData.deathDate = updateAuthorDto.deathDate;

    const rlsContext = currentUser
      ? { userId: currentUser.id.toString(), userRole: currentUser.role }
      : undefined;

    // Update author
    const updatedAuthor = await this.authorsRepository.update(
      BigInt(id),
      updateData,
      rlsContext,
    );

    if (!updatedAuthor) {
      throw new NotFoundException(`Author with the id ${id} is not found`);
    }

    return mapDto(AuthorResponseDto, {
      ...updatedAuthor,
      id: Number(updatedAuthor.id),
    });
  }

  @WithErrorHandling('AuthorsService', 'remove')
  async remove(
    id: number,
    currentUser?: { id: number; role: string },
  ): Promise<void> {
    await this.findOne(id);

    const rlsContext = currentUser
      ? { userId: currentUser.id.toString(), userRole: currentUser.role }
      : undefined;

    const deleted = await this.authorsRepository.delete(BigInt(id), rlsContext);
    if (!deleted) {
      throw new NotFoundException(`Author with the id ${id} is not found`);
    }
  }
}
