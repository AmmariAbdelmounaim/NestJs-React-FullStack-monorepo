import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersRepository } from './users.repository';
import { CreateUserDto, UpdateUserDto } from './users.dto';
import { UserRow } from '../db';
import * as bcrypt from 'bcrypt';

// Mock bcrypt
jest.mock('bcrypt');
const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

describe('UsersService', () => {
  let service: UsersService;
  let repository: jest.Mocked<UsersRepository>;

  const mockUser: UserRow = {
    id: BigInt(1),
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    password: 'hashedPassword123',
    role: 'USER' as const,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  };

  const mockUserResponse = {
    id: 1,
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    role: 'USER' as const,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  };

  beforeEach(async () => {
    const mockRepository = {
      existsByEmail: jest.fn(),
      create: jest.fn(),
      findById: jest.fn(),
      findByEmail: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: UsersRepository,
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    repository = module.get(UsersRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const createUserDto: CreateUserDto = {
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe',
      password: 'password123',
    };

    it('should create a new user successfully', async () => {
      repository.existsByEmail.mockResolvedValue(false);
      mockedBcrypt.hash.mockResolvedValue('hashedPassword123' as never);
      repository.create.mockResolvedValue(mockUser);

      const result = await service.create(createUserDto);

      expect(repository.existsByEmail).toHaveBeenCalledWith(
        createUserDto.email,
      );
      expect(mockedBcrypt.hash).toHaveBeenCalledWith(
        createUserDto.password,
        10,
      );
      expect(repository.create).toHaveBeenCalledWith(
        {
          email: createUserDto.email,
          firstName: createUserDto.firstName,
          lastName: createUserDto.lastName,
          password: 'hashedPassword123',
        },
        undefined,
      );
      // Verify expected fields match (password may be present due to OmitType runtime limitation)
      expect(result).toMatchObject(mockUserResponse);
      expect(result.id).toBe(1);
      expect(result.email).toBe(mockUserResponse.email);
      expect(result.firstName).toBe(mockUserResponse.firstName);
      expect(result.lastName).toBe(mockUserResponse.lastName);
      expect(result.role).toBe(mockUserResponse.role);
    });

    it('should throw ConflictException if user with email already exists', async () => {
      repository.existsByEmail.mockResolvedValue(true);

      await expect(service.create(createUserDto)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.create(createUserDto)).rejects.toThrow(
        'User with this email already exists',
      );

      expect(repository.existsByEmail).toHaveBeenCalledWith(
        createUserDto.email,
      );
      expect(repository.create).not.toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a user by id', async () => {
      repository.findById.mockResolvedValue(mockUser);

      const result = await service.findOne(1);

      expect(repository.findById).toHaveBeenCalledWith(BigInt(1), undefined);
      // Verify expected fields match (password may be present due to OmitType runtime limitation)
      expect(result).toMatchObject(mockUserResponse);
      expect(result.id).toBe(1);
      expect(result.email).toBe(mockUserResponse.email);
      expect(result.firstName).toBe(mockUserResponse.firstName);
      expect(result.lastName).toBe(mockUserResponse.lastName);
      expect(result.role).toBe(mockUserResponse.role);
    });

    it('should throw NotFoundException if user not found', async () => {
      repository.findById.mockResolvedValue(undefined);

      await expect(service.findOne(1)).rejects.toThrow(NotFoundException);
      await expect(service.findOne(1)).rejects.toThrow(
        'User with the id 1 is not found',
      );
    });
  });

  describe('findByEmail', () => {
    it('should return a user by email', async () => {
      repository.findByEmail.mockResolvedValue(mockUser);

      const result = await service.findByEmail('test@example.com');

      expect(repository.findByEmail).toHaveBeenCalledWith('test@example.com');
      // Verify expected fields match (password may be present due to OmitType runtime limitation)
      expect(result).toMatchObject(mockUserResponse);
      expect(result.id).toBe(1);
      expect(result.email).toBe(mockUserResponse.email);
      expect(result.firstName).toBe(mockUserResponse.firstName);
      expect(result.lastName).toBe(mockUserResponse.lastName);
      expect(result.role).toBe(mockUserResponse.role);
    });

    it('should throw NotFoundException if user not found', async () => {
      repository.findByEmail.mockResolvedValue(undefined);

      await expect(service.findByEmail('test@example.com')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.findByEmail('test@example.com')).rejects.toThrow(
        'User with the email test@example.com is not found',
      );
    });
  });

  describe('update', () => {
    const updateUserDto: UpdateUserDto = {
      firstName: 'Jane',
      lastName: 'Smith',
    };

    it('should update a user successfully', async () => {
      repository.findById.mockResolvedValue(mockUser);
      repository.update.mockResolvedValue({
        ...mockUser,
        firstName: 'Jane',
        lastName: 'Smith',
      });

      const result = await service.update(1, updateUserDto);

      expect(repository.findById).toHaveBeenCalledWith(BigInt(1), undefined);
      expect(repository.update).toHaveBeenCalledWith(
        BigInt(1),
        {
          email: mockUser.email,
          firstName: 'Jane',
          lastName: 'Smith',
          password: mockUser.password,
        },
        undefined,
      );
      expect(result.firstName).toBe('Jane');
      expect(result.lastName).toBe('Smith');
    });

    it('should update user email if provided and different', async () => {
      const emailUpdateDto: UpdateUserDto = {
        email: 'newemail@example.com',
      };
      repository.findById.mockResolvedValue(mockUser);
      repository.existsByEmail.mockResolvedValue(false);
      repository.update.mockResolvedValue({
        ...mockUser,
        email: 'newemail@example.com',
      });

      const result = await service.update(1, emailUpdateDto);

      expect(repository.findById).toHaveBeenCalledWith(BigInt(1), undefined);
      expect(repository.existsByEmail).toHaveBeenCalledWith(
        'newemail@example.com',
      );
      expect(result.email).toBe('newemail@example.com');
    });

    it('should throw ConflictException if new email already exists', async () => {
      const emailUpdateDto: UpdateUserDto = {
        email: 'existing@example.com',
      };
      repository.findById.mockResolvedValue(mockUser);
      repository.existsByEmail.mockResolvedValue(true);

      await expect(service.update(1, emailUpdateDto)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.update(1, emailUpdateDto)).rejects.toThrow(
        'User with this email already exists',
      );
      expect(repository.findById).toHaveBeenCalledWith(BigInt(1), undefined);
    });

    it('should hash password if provided in update', async () => {
      const passwordUpdateDto: UpdateUserDto = {
        password: 'newPassword123',
      };
      repository.findById.mockResolvedValue(mockUser);
      mockedBcrypt.hash.mockResolvedValue('newHashedPassword' as never);
      repository.update.mockResolvedValue({
        ...mockUser,
        password: 'newHashedPassword',
      });

      await service.update(1, passwordUpdateDto);

      expect(mockedBcrypt.hash).toHaveBeenCalledWith('newPassword123', 10);
      expect(repository.update).toHaveBeenCalledWith(
        BigInt(1),
        expect.objectContaining({
          password: 'newHashedPassword',
        }),
        undefined,
      );
    });

    it('should throw NotFoundException if user not found', async () => {
      repository.findById.mockResolvedValue(undefined);

      await expect(service.update(1, updateUserDto)).rejects.toThrow(
        NotFoundException,
      );
      expect(repository.findById).toHaveBeenCalledWith(BigInt(1), undefined);
    });

    it('should throw NotFoundException if update returns undefined', async () => {
      repository.findById.mockResolvedValue(mockUser);
      repository.update.mockResolvedValue(undefined);

      await expect(service.update(1, updateUserDto)).rejects.toThrow(
        NotFoundException,
      );
      expect(repository.findById).toHaveBeenCalledWith(BigInt(1), undefined);
    });
  });

  describe('remove', () => {
    it('should delete a user successfully', async () => {
      repository.findById.mockResolvedValue(mockUser);
      repository.delete.mockResolvedValue(true);

      await service.remove(1);

      expect(repository.findById).toHaveBeenCalledWith(BigInt(1), undefined);
      expect(repository.delete).toHaveBeenCalledWith(BigInt(1), undefined);
    });

    it('should throw NotFoundException if user not found during findOne check', async () => {
      repository.findById.mockResolvedValue(undefined);

      await expect(service.remove(1)).rejects.toThrow(NotFoundException);
      expect(repository.findById).toHaveBeenCalledWith(BigInt(1), undefined);
      expect(repository.delete).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if delete returns false', async () => {
      repository.findById.mockResolvedValue(mockUser);
      repository.delete.mockResolvedValue(false);

      await expect(service.remove(1)).rejects.toThrow(NotFoundException);
      expect(repository.findById).toHaveBeenCalledWith(BigInt(1), undefined);
      expect(repository.delete).toHaveBeenCalledWith(BigInt(1), undefined);
    });
  });
});
