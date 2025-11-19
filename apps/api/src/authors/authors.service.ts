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
  async create(createAuthorDto: CreateAuthorDto): Promise<AuthorResponseDto> {
    // Create author
    const newAuthor = await this.authorsRepository.create(createAuthorDto);
    return mapDto(AuthorResponseDto, {
      ...newAuthor,
      id: Number(newAuthor.id), // Convert BigInt to number
    });
  }

  @WithErrorHandling('AuthorsService', 'findAll')
  async findAll(): Promise<AuthorResponseDto[]> {
    const authors = await this.authorsRepository.findAll();
    return authors.map((author) =>
      mapDto(AuthorResponseDto, {
        ...author,
        id: Number(author.id), // Convert BigInt to number
      }),
    );
  }

  @WithErrorHandling('AuthorsService', 'findOne')
  async findOne(id: number): Promise<AuthorResponseDto> {
    const author = await this.authorsRepository.findById(id);

    if (!author) {
      throw new NotFoundException(`Author with the id ${id} is not found`);
    }

    return mapDto(AuthorResponseDto, {
      ...author,
      id: Number(author.id), // Convert BigInt to number
    });
  }

  @WithErrorHandling('AuthorsService', 'findByBookId')
  async findByBookId(bookId: number): Promise<AuthorResponseDto[]> {
    const authors = await this.authorsRepository.findByBookId(bookId);
    return authors.map((author) =>
      mapDto(AuthorResponseDto, {
        ...author,
        id: Number(author.id), // Convert BigInt to number
      }),
    );
  }

  @WithErrorHandling('AuthorsService', 'findBooksByAuthorId')
  async findBooksByAuthorId(authorId: number): Promise<AuthorWithBooksDto> {
    // Check if author exists
    const author = await this.authorsRepository.findById(authorId);

    if (!author) {
      throw new NotFoundException(
        `Author with the id ${authorId} is not found`,
      );
    }

    // Get books written by this author
    const books = await this.authorsRepository.findBooksByAuthorId(authorId);
    const authorResponse = mapDto(AuthorResponseDto, {
      ...author,
      id: Number(author.id), // Convert BigInt to number
    });

    // Convert books to plain objects (not DTOs yet) so @Type() can transform them
    const booksPlain = books.map((book) => ({
      ...book,
      id: Number(book.id), // Convert BigInt to number
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
  ): Promise<AuthorResponseDto> {
    // Check if author exists
    const existingAuthor = await this.authorsRepository.findById(id);

    if (!existingAuthor) {
      throw new NotFoundException(`Author with the id ${id} is not found`);
    }

    // Prepare update data
    const updateData: Partial<AuthorInsert> = {};

    if (updateAuthorDto.firstName !== undefined)
      updateData.firstName = updateAuthorDto.firstName;
    if (updateAuthorDto.lastName !== undefined)
      updateData.lastName = updateAuthorDto.lastName;
    if (updateAuthorDto.birthDate !== undefined)
      updateData.birthDate = updateAuthorDto.birthDate;
    if (updateAuthorDto.deathDate !== undefined)
      updateData.deathDate = updateAuthorDto.deathDate;

    // Update author
    const updatedAuthor = await this.authorsRepository.update(id, updateData);

    if (!updatedAuthor) {
      throw new NotFoundException(`Author with the id ${id} is not found`);
    }

    return mapDto(AuthorResponseDto, {
      ...updatedAuthor,
      id: Number(updatedAuthor.id), // Convert BigInt to number
    });
  }

  @WithErrorHandling('AuthorsService', 'remove')
  async remove(id: number): Promise<void> {
    // Check if author exists (findOne already throws NotFoundException if not found)
    await this.findOne(id);

    const deleted = await this.authorsRepository.delete(id);
    if (!deleted) {
      throw new NotFoundException(`Author with the id ${id} is not found`);
    }
  }
}
