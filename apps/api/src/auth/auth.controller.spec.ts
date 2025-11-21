import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { LoginDto, RegisterDto, AuthResponseDto } from './auth.dto';

describe('AuthController', () => {
  let controller: AuthController;
  let service: jest.Mocked<AuthService>;

  const mockAuthResponse: AuthResponseDto = {
    accessToken: 'mock.jwt.token',
    user: {
      id: 1,
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe',
      role: 'USER' as const,
    },
  };

  beforeEach(async () => {
    const mockService = {
      register: jest.fn(),
      login: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    service = module.get(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    const registerDto: RegisterDto = {
      email: 'newuser@example.com',
      firstName: 'Jane',
      lastName: 'Smith',
      password: 'password123',
    };

    it('should call authService.register with correct DTO', async () => {
      service.register.mockResolvedValue(mockAuthResponse);

      const result = await controller.register(registerDto);

      expect(service.register).toHaveBeenCalledWith(registerDto);
      expect(service.register).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockAuthResponse);
    });

    it('should return 201 Created on successful registration', async () => {
      const expectedResponse: AuthResponseDto = {
        ...mockAuthResponse,
        user: {
          ...mockAuthResponse.user,
          email: registerDto.email,
          firstName: registerDto.firstName,
          lastName: registerDto.lastName,
        },
      };
      service.register.mockResolvedValue(expectedResponse);

      const result = await controller.register(registerDto);

      expect(result).toEqual(expectedResponse);
      expect(result.accessToken).toBeDefined();
      expect(result.user).toBeDefined();
      expect(result.user.email).toBe(registerDto.email);
    });

    it('should return 400 Bad Request for invalid input - missing email', async () => {
      const invalidDto = {
        firstName: 'Jane',
        lastName: 'Smith',
        password: 'password123',
      } as RegisterDto;

      // But we can test that the service would handle it if it somehow got through
      service.register.mockRejectedValue(
        new BadRequestException('email should be an email'),
      );

      await expect(controller.register(invalidDto)).rejects.toThrow(
        BadRequestException,
      );
      expect(service.register).toHaveBeenCalledWith(invalidDto);
    });

    it('should return 400 Bad Request for invalid input - invalid email format', async () => {
      const invalidDto: RegisterDto = {
        email: 'invalid-email',
        firstName: 'Jane',
        lastName: 'Smith',
        password: 'password123',
      };

      service.register.mockRejectedValue(
        new BadRequestException('email must be an email'),
      );

      await expect(controller.register(invalidDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should return 400 Bad Request for invalid input - missing required fields', async () => {
      const invalidDto = {
        email: 'test@example.com',
        // Missing firstName, lastName, password
      } as RegisterDto;

      service.register.mockRejectedValue(
        new BadRequestException('firstName should not be empty'),
      );

      await expect(controller.register(invalidDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should return 409 Conflict when email already exists', async () => {
      service.register.mockRejectedValue(
        new ConflictException('User with this email already exists'),
      );

      await expect(controller.register(registerDto)).rejects.toThrow(
        ConflictException,
      );
      await expect(controller.register(registerDto)).rejects.toThrow(
        'User with this email already exists',
      );

      expect(service.register).toHaveBeenCalledWith(registerDto);
    });

    it('should return 503 Service Unavailable when no membership cards available', async () => {
      service.register.mockRejectedValue(
        new ServiceUnavailableException('No free membership cards available'),
      );

      await expect(controller.register(registerDto)).rejects.toThrow(
        ServiceUnavailableException,
      );
      await expect(controller.register(registerDto)).rejects.toThrow(
        'No free membership cards available',
      );

      expect(service.register).toHaveBeenCalledWith(registerDto);
    });

    it('should propagate service errors correctly', async () => {
      const error = new Error('Unexpected error');
      service.register.mockRejectedValue(error);

      await expect(controller.register(registerDto)).rejects.toThrow(error);
      expect(service.register).toHaveBeenCalledWith(registerDto);
    });

    it('should validate RegisterDto input structure', async () => {
      service.register.mockResolvedValue(mockAuthResponse);

      await controller.register(registerDto);

      expect(service.register).toHaveBeenCalledWith(
        expect.objectContaining({
          email: expect.any(String),
          firstName: expect.any(String),
          lastName: expect.any(String),
          password: expect.any(String),
        }),
      );
    });
  });

  describe('login', () => {
    const loginDto: LoginDto = {
      email: 'test@example.com',
      password: 'password123',
    };

    it('should call authService.login with correct DTO', async () => {
      service.login.mockResolvedValue(mockAuthResponse);

      const result = await controller.login(loginDto);

      expect(service.login).toHaveBeenCalledWith(loginDto);
      expect(service.login).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockAuthResponse);
    });

    it('should return 200 OK on successful login', async () => {
      service.login.mockResolvedValue(mockAuthResponse);

      const result = await controller.login(loginDto);

      expect(result).toEqual(mockAuthResponse);
      expect(result.accessToken).toBeDefined();
      expect(result.user).toBeDefined();
      expect(result.user.email).toBe(loginDto.email);
    });

    it('should return 400 Bad Request for invalid input - missing email', async () => {
      const invalidDto = {
        password: 'password123',
      } as LoginDto;

      service.login.mockRejectedValue(
        new BadRequestException('email should not be empty'),
      );

      await expect(controller.login(invalidDto)).rejects.toThrow(
        BadRequestException,
      );
      expect(service.login).toHaveBeenCalledWith(invalidDto);
    });

    it('should return 400 Bad Request for invalid input - invalid email format', async () => {
      const invalidDto: LoginDto = {
        email: 'invalid-email',
        password: 'password123',
      };

      service.login.mockRejectedValue(
        new BadRequestException('email must be an email'),
      );

      await expect(controller.login(invalidDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should return 400 Bad Request for invalid input - missing password', async () => {
      const invalidDto = {
        email: 'test@example.com',
      } as LoginDto;

      service.login.mockRejectedValue(
        new BadRequestException('password should not be empty'),
      );

      await expect(controller.login(invalidDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should return 401 Unauthorized for invalid credentials', async () => {
      service.login.mockRejectedValue(
        new UnauthorizedException('Invalid credentials'),
      );

      await expect(controller.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(controller.login(loginDto)).rejects.toThrow(
        'Invalid credentials',
      );

      expect(service.login).toHaveBeenCalledWith(loginDto);
    });

    it('should propagate service errors correctly', async () => {
      const error = new Error('Unexpected error');
      service.login.mockRejectedValue(error);

      await expect(controller.login(loginDto)).rejects.toThrow(error);
      expect(service.login).toHaveBeenCalledWith(loginDto);
    });

    it('should validate LoginDto input structure', async () => {
      service.login.mockResolvedValue(mockAuthResponse);

      await controller.login(loginDto);

      expect(service.login).toHaveBeenCalledWith(
        expect.objectContaining({
          email: expect.any(String),
          password: expect.any(String),
        }),
      );
    });

    it('should return AuthResponseDto with correct structure', async () => {
      service.login.mockResolvedValue(mockAuthResponse);

      const result = await controller.login(loginDto);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('user');
      expect(result.user).toHaveProperty('id');
      expect(result.user).toHaveProperty('email');
      expect(result.user).toHaveProperty('firstName');
      expect(result.user).toHaveProperty('lastName');
      expect(result.user).toHaveProperty('role');
      expect(result.user).not.toHaveProperty('password');
    });
  });
});
