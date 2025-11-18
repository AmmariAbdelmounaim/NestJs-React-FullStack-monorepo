import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { UserResponseDto } from '../../users/users.dto';

interface AuthenticatedRequest {
  user: UserResponseDto;
  params: { id: string };
}

@Injectable()
export class SelfGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user: UserResponseDto = request.user;
    const requestedUserId = parseInt(request.params.id, 10);

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // Check if user is accessing their own data
    if (user.id !== requestedUserId) {
      throw new ForbiddenException('You can only access your own data');
    }

    return true;
  }
}
