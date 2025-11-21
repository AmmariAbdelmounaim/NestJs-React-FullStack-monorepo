import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtStrategy, JwtPayload } from './jwt.strategy';
import { UsersRepository } from '../../users/users.repository';
import { UserRow } from '../../db';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let usersRepository: jest.Mocked<UsersRepository>;

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

  beforeEach(async () => {
    const mockUsersRepository = {
      findById: jest.fn(),
    };

    const mockConfigService = {
      get: jest.fn((key: string) => {
        if (key === 'JWT_SECRET') {
          return 'test-secret';
        }
        return undefined;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        {
          provide: UsersRepository,
          useValue: mockUsersRepository,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
    usersRepository = module.get(UsersRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validate', () => {
    const mockPayload: JwtPayload = {
      sub: '1',
      email: 'test@example.com',
      role: 'USER' as const,
    };

    it('should validate JWT token and return user', async () => {
      usersRepository.findById.mockResolvedValue(mockUser);

      const result = await strategy.validate(mockPayload);

      expect(usersRepository.findById).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockUser);
    });

    it('should throw UnauthorizedException when user not found', async () => {
      usersRepository.findById.mockResolvedValue(undefined);

      await expect(strategy.validate(mockPayload)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(strategy.validate(mockPayload)).rejects.toThrow(
        'User not found',
      );

      expect(usersRepository.findById).toHaveBeenCalledWith(1);
    });

    it('should handle different user roles', async () => {
      const adminUser: UserRow = {
        ...mockUser,
        role: 'ADMIN' as const,
      };
      const adminPayload: JwtPayload = {
        sub: '1',
        email: 'admin@example.com',
        role: 'ADMIN' as const,
      };
      usersRepository.findById.mockResolvedValue(adminUser);

      const result = await strategy.validate(adminPayload);

      expect(result.role).toBe('ADMIN');
      expect(usersRepository.findById).toHaveBeenCalledWith(1);
    });
  });
});
