import {
  Injectable,
  UnauthorizedException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { mapDto } from '../utils/map-dto';
import * as bcrypt from 'bcrypt';
import { JwtPayload } from './strategies/jwt.strategy';
import { AuthResponseDto, LoginDto, RegisterDto } from './auth.dto';
import { UsersRepository } from '../users/users.repository';
import { WithErrorHandling } from '../utils/with-error-handling.decorator';
import { MembershipCardsService } from '../membership-cards/membership-cards.service';
import { MembershipCardsRepository } from '../membership-cards/membership-cards.repository';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private usersRepository: UsersRepository,
    private membershipCardsService: MembershipCardsService,
    private membershipCardsRepository: MembershipCardsRepository,
    private jwtService: JwtService,
  ) {}

  @WithErrorHandling('AuthService', 'login')
  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.usersRepository.findByEmail(loginDto.email);

    // Verify user exists and password is valid
    if (!user || !(await bcrypt.compare(loginDto.password, user.password))) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Generate JWT token
    // Convert bigint to string for JWT payload (JSON doesn't support bigint)
    const payload: JwtPayload = {
      sub: String(user.id),
      email: user.email,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload);

    return mapDto(AuthResponseDto, {
      accessToken,
      user: {
        id: Number(user.id),
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
    });
  }

  @WithErrorHandling('AuthService', 'register')
  async register(registerDto: RegisterDto): Promise<AuthResponseDto> {
    const freeMembershipCard =
      await this.membershipCardsService.findFirstFree();

    if (!freeMembershipCard) {
      throw new ServiceUnavailableException(
        'No free membership cards available',
      );
    }
    // Create user
    const user = await this.usersService.create(registerDto);
    // Mark membership card as in use and give it the id user id etc
    await this.membershipCardsRepository.update(freeMembershipCard.id, {
      status: 'IN_USE',
      userId: Number(user.id),
      assignedAt: new Date().toISOString(),
    });

    const payload: JwtPayload = {
      sub: String(user.id),
      email: user.email,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload);

    return mapDto(AuthResponseDto, {
      accessToken,
      user: {
        id: Number(user.id),
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
    });
  }
}
