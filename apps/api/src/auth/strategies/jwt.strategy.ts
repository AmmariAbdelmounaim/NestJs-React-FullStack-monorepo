import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UserRole } from '../../db';
import { UsersRepository } from '../../users/users.repository';

export interface JwtPayload {
  sub: string; // JWT payloads are JSON, so bigint must be string
  email: string;
  role: UserRole;
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
    const user = await this.usersRepository.findById(Number(userId));
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    return user;
  }
}
