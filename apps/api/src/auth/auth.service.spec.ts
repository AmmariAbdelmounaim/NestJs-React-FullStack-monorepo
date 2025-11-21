import { Test, TestingModule } from '@nestjs/testing';
import {
  UnauthorizedException,
  ServiceUnavailableException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { UsersRepository } from '../users/users.repository';
import { MembershipCardsService } from '../membership-cards/membership-cards.service';
import { MembershipCardsRepository } from '../membership-cards/membership-cards.repository';
import { LoginDto, RegisterDto } from './auth.dto';
import { UserRow } from '../db';
import { MembershipCardBaseDto } from '../membership-cards/membership-cards.dto';
import * as bcrypt from 'bcrypt';

// Mock bcrypt
jest.mock('bcrypt');
const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

describe('AuthService', () => {
  let service: AuthService;
  let usersService: jest.Mocked<UsersService>;
  let usersRepository: jest.Mocked<UsersRepository>;
  let membershipCardsService: jest.Mocked<MembershipCardsService>;
  let membershipCardsRepository: jest.Mocked<MembershipCardsRepository>;
  let jwtService: jest.Mocked<JwtService>;

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

  const mockMembershipCard: MembershipCardBaseDto = {
    id: 1,
    serialNumber: 'BB000000001',
    status: 'FREE' as const,
    userId: null,
    assignedAt: null,
    archivedAt: null,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  };

  const mockJwtToken = 'mock.jwt.token';

  beforeEach(async () => {
    const mockUsersService = {
      create: jest.fn(),
    };

    const mockUsersRepository = {
      findByEmail: jest.fn(),
    };

    const mockMembershipCardsService = {
      findFirstFree: jest.fn(),
    };

    const mockMembershipCardsRepository = {
      update: jest.fn(),
    };

    const mockJwtService = {
      sign: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: UsersRepository,
          useValue: mockUsersRepository,
        },
        {
          provide: MembershipCardsService,
          useValue: mockMembershipCardsService,
        },
        {
          provide: MembershipCardsRepository,
          useValue: mockMembershipCardsRepository,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get(UsersService);
    usersRepository = module.get(UsersRepository);
    membershipCardsService = module.get(MembershipCardsService);
    membershipCardsRepository = module.get(MembershipCardsRepository);
    jwtService = module.get(JwtService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('login', () => {
    const loginDto: LoginDto = {
      email: 'test@example.com',
      password: 'password123',
    };

    it('should successfully login with valid credentials', async () => {
      usersRepository.findByEmail.mockResolvedValue(mockUser);
      mockedBcrypt.compare.mockResolvedValue(true as never);
      jwtService.sign.mockReturnValue(mockJwtToken);

      const result = await service.login(loginDto);

      expect(usersRepository.findByEmail).toHaveBeenCalledWith(loginDto.email);
      expect(mockedBcrypt.compare).toHaveBeenCalledWith(
        loginDto.password,
        mockUser.password,
      );
      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: String(mockUser.id),
        email: mockUser.email,
        role: mockUser.role,
      });
      expect(result.accessToken).toBe(mockJwtToken);
      expect(result.user).toMatchObject({
        id: 1,
        email: mockUser.email,
        firstName: mockUser.firstName,
        lastName: mockUser.lastName,
        role: mockUser.role,
      });
    });

    it('should throw UnauthorizedException when user does not exist', async () => {
      usersRepository.findByEmail.mockResolvedValue(undefined);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.login(loginDto)).rejects.toThrow(
        'Invalid credentials',
      );

      expect(usersRepository.findByEmail).toHaveBeenCalledWith(loginDto.email);
      expect(mockedBcrypt.compare).not.toHaveBeenCalled();
      expect(jwtService.sign).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when password is incorrect', async () => {
      usersRepository.findByEmail.mockResolvedValue(mockUser);
      mockedBcrypt.compare.mockResolvedValue(false as never);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.login(loginDto)).rejects.toThrow(
        'Invalid credentials',
      );

      expect(usersRepository.findByEmail).toHaveBeenCalledWith(loginDto.email);
      expect(mockedBcrypt.compare).toHaveBeenCalledWith(
        loginDto.password,
        mockUser.password,
      );
      expect(jwtService.sign).not.toHaveBeenCalled();
    });

    it('should return user info without password', async () => {
      usersRepository.findByEmail.mockResolvedValue(mockUser);
      mockedBcrypt.compare.mockResolvedValue(true as never);
      jwtService.sign.mockReturnValue(mockJwtToken);

      const result = await service.login(loginDto);

      expect(result.user).not.toHaveProperty('password');
      expect(result.user).toMatchObject({
        id: 1,
        email: mockUser.email,
        firstName: mockUser.firstName,
        lastName: mockUser.lastName,
        role: mockUser.role,
      });
    });
  });

  describe('register', () => {
    const registerDto: RegisterDto = {
      email: 'newuser@example.com',
      firstName: 'Jane',
      lastName: 'Smith',
      password: 'password123',
    };

    it('should successfully register a new user when free membership card is available', async () => {
      membershipCardsService.findFirstFree.mockResolvedValue(
        mockMembershipCard,
      );
      usersService.create.mockResolvedValue(mockUserResponse);
      membershipCardsRepository.update.mockResolvedValue({
        id: BigInt(1),
        serialNumber: 'BB000000001',
        status: 'IN_USE' as const,
        userId: 1,
        assignedAt: '2024-01-01T00:00:00.000Z',
        archivedAt: null,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      });
      jwtService.sign.mockReturnValue(mockJwtToken);

      const result = await service.register(registerDto);

      expect(membershipCardsService.findFirstFree).toHaveBeenCalled();
      expect(usersService.create).toHaveBeenCalledWith(registerDto);
      expect(membershipCardsRepository.update).toHaveBeenCalledWith(
        BigInt(mockMembershipCard.id),
        expect.objectContaining({
          status: 'IN_USE',
          userId: mockUserResponse.id,
          assignedAt: expect.any(String),
        }),
        undefined,
      );
      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: String(mockUserResponse.id),
        email: mockUserResponse.email,
        role: mockUserResponse.role,
      });
      expect(result.accessToken).toBe(mockJwtToken);
      expect(result.user).toMatchObject({
        id: mockUserResponse.id,
        email: mockUserResponse.email,
        firstName: mockUserResponse.firstName,
        lastName: mockUserResponse.lastName,
        role: mockUserResponse.role,
      });
    });

    it('should throw ServiceUnavailableException when no free membership cards available', async () => {
      membershipCardsService.findFirstFree.mockResolvedValue(undefined);

      await expect(service.register(registerDto)).rejects.toThrow(
        ServiceUnavailableException,
      );
      await expect(service.register(registerDto)).rejects.toThrow(
        'No free membership cards available',
      );

      expect(membershipCardsService.findFirstFree).toHaveBeenCalled();
      expect(usersService.create).not.toHaveBeenCalled();
      expect(membershipCardsRepository.update).not.toHaveBeenCalled();
      expect(jwtService.sign).not.toHaveBeenCalled();
    });

    it('should throw ConflictException when email already exists', async () => {
      membershipCardsService.findFirstFree.mockResolvedValue(
        mockMembershipCard,
      );
      usersService.create.mockRejectedValue(
        new ConflictException('User with this email already exists'),
      );

      await expect(service.register(registerDto)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.register(registerDto)).rejects.toThrow(
        'User with this email already exists',
      );

      expect(membershipCardsService.findFirstFree).toHaveBeenCalled();
      expect(usersService.create).toHaveBeenCalledWith(registerDto);
      expect(membershipCardsRepository.update).not.toHaveBeenCalled();
      expect(jwtService.sign).not.toHaveBeenCalled();
    });

    it('should assign membership card atomically with user creation', async () => {
      membershipCardsService.findFirstFree.mockResolvedValue(
        mockMembershipCard,
      );
      usersService.create.mockResolvedValue(mockUserResponse);
      membershipCardsRepository.update.mockResolvedValue({
        id: BigInt(1),
        serialNumber: 'BB000000001',
        status: 'IN_USE' as const,
        userId: 1,
        assignedAt: '2024-01-01T00:00:00.000Z',
        archivedAt: null,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      });
      jwtService.sign.mockReturnValue(mockJwtToken);

      await service.register(registerDto);

      const findFirstFreeCallOrder = (
        membershipCardsService.findFirstFree as jest.Mock
      ).mock.invocationCallOrder[0];
      const createCallOrder = (usersService.create as jest.Mock).mock
        .invocationCallOrder[0];
      const updateCallOrder = (membershipCardsRepository.update as jest.Mock)
        .mock.invocationCallOrder[0];

      expect(findFirstFreeCallOrder).toBeLessThan(createCallOrder);
      expect(createCallOrder).toBeLessThan(updateCallOrder);
    });

    it('should generate JWT token after successful registration', async () => {
      membershipCardsService.findFirstFree.mockResolvedValue(
        mockMembershipCard,
      );
      usersService.create.mockResolvedValue(mockUserResponse);
      membershipCardsRepository.update.mockResolvedValue({
        id: BigInt(1),
        serialNumber: 'BB000000001',
        status: 'IN_USE' as const,
        userId: 1,
        assignedAt: '2024-01-01T00:00:00.000Z',
        archivedAt: null,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      });
      jwtService.sign.mockReturnValue(mockJwtToken);

      const result = await service.register(registerDto);

      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: String(mockUserResponse.id),
        email: mockUserResponse.email,
        role: mockUserResponse.role,
      });
      expect(result.accessToken).toBe(mockJwtToken);
    });

    it('should hash password before storing (via UsersService)', async () => {
      membershipCardsService.findFirstFree.mockResolvedValue(
        mockMembershipCard,
      );
      usersService.create.mockResolvedValue(mockUserResponse);
      membershipCardsRepository.update.mockResolvedValue({
        id: BigInt(1),
        serialNumber: 'BB000000001',
        status: 'IN_USE' as const,
        userId: 1,
        assignedAt: '2024-01-01T00:00:00.000Z',
        archivedAt: null,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      });
      jwtService.sign.mockReturnValue(mockJwtToken);

      await service.register(registerDto);

      expect(usersService.create).toHaveBeenCalledWith(registerDto);
    });

    it('should set default role to USER for new registrations', async () => {
      membershipCardsService.findFirstFree.mockResolvedValue(
        mockMembershipCard,
      );
      usersService.create.mockResolvedValue(mockUserResponse);
      membershipCardsRepository.update.mockResolvedValue({
        id: BigInt(1),
        serialNumber: 'BB000000001',
        status: 'IN_USE' as const,
        userId: 1,
        assignedAt: '2024-01-01T00:00:00.000Z',
        archivedAt: null,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      });
      jwtService.sign.mockReturnValue(mockJwtToken);

      const result = await service.register(registerDto);

      expect(result.user.role).toBe('USER');
      expect(jwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          role: 'USER',
        }),
      );
    });

    it('should verify membership card assignment details', async () => {
      membershipCardsService.findFirstFree.mockResolvedValue(
        mockMembershipCard,
      );
      usersService.create.mockResolvedValue(mockUserResponse);
      membershipCardsRepository.update.mockResolvedValue({
        id: BigInt(1),
        serialNumber: 'BB000000001',
        status: 'IN_USE' as const,
        userId: 1,
        assignedAt: '2024-01-01T00:00:00.000Z',
        archivedAt: null,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      });
      jwtService.sign.mockReturnValue(mockJwtToken);

      await service.register(registerDto);

      expect(membershipCardsRepository.update).toHaveBeenCalledWith(
        BigInt(mockMembershipCard.id),
        expect.objectContaining({
          status: 'IN_USE',
          userId: mockUserResponse.id,
          assignedAt: expect.any(String),
        }),
        undefined,
      );
    });

    it('should handle concurrent registration attempts when cards are limited', async () => {
      // First registration finds a card
      membershipCardsService.findFirstFree
        .mockResolvedValueOnce(mockMembershipCard)
        .mockResolvedValueOnce(undefined); // Second registration finds no card
      usersService.create.mockResolvedValue(mockUserResponse);
      membershipCardsRepository.update.mockResolvedValue({
        id: BigInt(1),
        serialNumber: 'BB000000001',
        status: 'IN_USE' as const,
        userId: 1,
        assignedAt: '2024-01-01T00:00:00.000Z',
        archivedAt: null,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      });
      jwtService.sign.mockReturnValue(mockJwtToken);

      // First registration succeeds
      const result1 = await service.register(registerDto);
      expect(result1).toBeDefined();
      expect(result1.accessToken).toBe(mockJwtToken);

      // Second registration fails
      await expect(service.register(registerDto)).rejects.toThrow(
        ServiceUnavailableException,
      );
      await expect(service.register(registerDto)).rejects.toThrow(
        'No free membership cards available',
      );
    });
  });
});
