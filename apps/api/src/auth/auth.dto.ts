import { ApiProperty, OmitType, PickType } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { IsString, IsNotEmpty, ValidateNested } from 'class-validator';
import { UserBaseDto } from '../users/users.dto';

export class UserInfoDto extends OmitType(UserBaseDto, [
  'createdAt',
  'updatedAt',
  'password',
] as const) {}

export class AuthResponseDto {
  @ApiProperty({
    description: 'JWT access token',
    example:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwiaWF0IjoxNjE2MjM5MDIyfQ...',
    type: String,
  })
  @Expose()
  @IsString()
  @IsNotEmpty()
  accessToken!: string;

  @ApiProperty({
    description: 'User information',
    type: UserInfoDto,
  })
  @Expose()
  @Type(() => UserInfoDto)
  @ValidateNested()
  user!: UserInfoDto;
}

export class LoginDto extends PickType(UserBaseDto, [
  'email',
  'password',
] as const) {}

export class RegisterDto extends PickType(UserBaseDto, [
  'email',
  'firstName',
  'lastName',
  'password',
] as const) {}
