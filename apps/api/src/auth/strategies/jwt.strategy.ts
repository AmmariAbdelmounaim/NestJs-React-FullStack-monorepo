import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UserRow } from '../../db';
import { UsersRepository } from '../../users/users.repository';
import { mapDto } from '../../utils/map-dto';
import { UserResponseDto } from '../../users/users.dto';

export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRow['role'];
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private usersRepository: UsersRepository,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') as string,
    });
  }

  async validate(payload: JwtPayload) {
    const userId = BigInt(payload.sub);
    const user = await this.usersRepository.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    return mapDto(UserResponseDto, {
      ...user,
      id: Number(user.id),
    });
  }
}
