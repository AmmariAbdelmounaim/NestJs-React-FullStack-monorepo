import {
  Injectable,
  ConflictException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { mapDto } from '../utils/map-dto';
import * as bcrypt from 'bcrypt';
import { CreateUserDto, UpdateUserDto, UserResponseDto } from './users.dto';
import { UsersRepository } from './users.repository';
import { UserInsert, DEFAULT_USER_ROLE } from '../db';
import { WithErrorHandling } from '../utils/with-error-handling.decorator';

@Injectable()
export class UsersService {
  constructor(
    private readonly logger: Logger,
    private readonly usersRepository: UsersRepository,
  ) {}

  @WithErrorHandling('UsersService', 'create')
  async create(createUserDto: CreateUserDto): Promise<UserResponseDto> {
    // Check if user already exists
    const existingUser = await this.usersRepository.existsByEmail(
      createUserDto.email,
    );

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

    // Create user
    const newUser = await this.usersRepository.create({
      email: createUserDto.email,
      firstName: createUserDto.firstName,
      lastName: createUserDto.lastName,
      password: hashedPassword,
      role: DEFAULT_USER_ROLE,
    });
    return mapDto(UserResponseDto, {
      ...newUser,
      id: Number(newUser.id), // Convert BigInt to number
    });
  }

  @WithErrorHandling('UsersService', 'findOne')
  async findOne(id: number): Promise<UserResponseDto> {
    const user = await this.usersRepository.findById(id);

    if (!user) {
      throw new NotFoundException(`User with the id ${id} is not found`);
    }

    return mapDto(UserResponseDto, {
      ...user,
      id: Number(user.id), // Convert BigInt to number
    });
  }

  @WithErrorHandling('UsersService', 'findByEmail')
  async findByEmail(email: string): Promise<UserResponseDto> {
    const user = await this.usersRepository.findByEmail(email);
    if (!user) {
      throw new NotFoundException(`User with the email ${email} is not found`);
    }
    return mapDto(UserResponseDto, {
      ...user,
      id: Number(user.id), // Convert BigInt to number
    });
  }

  @WithErrorHandling('UsersService', 'update')
  async update(
    id: number,
    updateUserDto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    // Check if user exists (findOne already throws NotFoundException if not found)
    const existingUser = await this.usersRepository.findById(id);

    if (!existingUser) {
      throw new NotFoundException(`User with the id ${id} is not found`);
    }
    // If email is being updated, check for conflicts
    if (updateUserDto.email && updateUserDto.email !== existingUser.email) {
      const emailExists = await this.usersRepository.existsByEmail(
        updateUserDto.email,
      );

      if (emailExists) {
        throw new ConflictException('User with this email already exists');
      }
    }

    // Prepare update data
    const updateData: UserInsert = {
      email: existingUser.email,
      firstName: existingUser.firstName,
      lastName: existingUser.lastName,
      password: existingUser.password,
    };

    if (updateUserDto.email) updateData.email = updateUserDto.email;
    if (updateUserDto.firstName) updateData.firstName = updateUserDto.firstName;
    if (updateUserDto.lastName) updateData.lastName = updateUserDto.lastName;
    if (updateUserDto.password)
      updateData.password = await bcrypt.hash(updateUserDto.password, 10);

    // Update user
    const updatedUser = await this.usersRepository.update(id, updateData);

    if (!updatedUser) {
      throw new NotFoundException(`User with the id ${id} is not found`);
    }

    return mapDto(UserResponseDto, {
      ...updatedUser,
      id: Number(updatedUser.id), // Convert BigInt to number
    });
  }

  @WithErrorHandling('UsersService', 'remove')
  async remove(id: number): Promise<void> {
    // Check if user exists (findOne already throws NotFoundException if not found)
    await this.findOne(id);

    const deleted = await this.usersRepository.delete(id);
    if (!deleted) {
      throw new NotFoundException(`User with the id ${id} is not found`);
    }
  }
}
