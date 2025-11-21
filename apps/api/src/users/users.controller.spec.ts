import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UpdateUserDto, UserResponseDto } from './users.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { SelfOrAdminGuard } from '../auth/guards/self-or-admin.guard';

describe('UsersController', () => {
  let controller: UsersController;
  let service: jest.Mocked<UsersService>;

  const mockUserResponse: UserResponseDto = {
    id: 1,
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    role: 'USER' as const,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  };

  beforeEach(async () => {
    const mockService = {
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: mockService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .overrideGuard(SelfOrAdminGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<UsersController>(UsersController);
    service = module.get(UsersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getCurrentUser', () => {
    it('should return the current authenticated user', () => {
      const mockRequest = {
        user: mockUserResponse,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any;

      const result = controller.getCurrentUser(mockRequest);

      expect(result).toMatchObject(mockUserResponse);
      expect(result.id).toBe(1);
      expect(result.email).toBe('test@example.com');
      expect(result.firstName).toBe('John');
      expect(result.lastName).toBe('Doe');
      expect(result.role).toBe('USER');
    });
  });

  describe('findOne', () => {
    it('should return a user by id', async () => {
      service.findOne.mockResolvedValue(mockUserResponse);
      const mockRequest = {
        user: mockUserResponse,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any;

      const result = await controller.findOne(1, mockRequest);

      expect(service.findOne).toHaveBeenCalledWith(1, mockUserResponse);
      expect(result).toEqual(mockUserResponse);
    });
  });

  describe('update', () => {
    const updateUserDto: UpdateUserDto = {
      firstName: 'Jane',
      lastName: 'Smith',
    };

    it('should update a user successfully', async () => {
      const updatedUser = {
        ...mockUserResponse,
        ...updateUserDto,
      };
      service.update.mockResolvedValue(updatedUser);
      const mockRequest = {
        user: mockUserResponse,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any;

      const result = await controller.update(1, updateUserDto, mockRequest);

      expect(service.update).toHaveBeenCalledWith(
        1,
        updateUserDto,
        mockUserResponse,
      );
      expect(result).toEqual(updatedUser);
    });
  });

  describe('remove', () => {
    it('should delete a user successfully', async () => {
      service.remove.mockResolvedValue(undefined);
      const mockRequest = {
        user: mockUserResponse,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any;

      await controller.remove(1, mockRequest);

      expect(service.remove).toHaveBeenCalledWith(1, mockUserResponse);
    });
  });
});
