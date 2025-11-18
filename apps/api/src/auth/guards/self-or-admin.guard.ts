import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { UserResponseDto } from '../../users/users.dto';
import { UserRole, USER_ROLES } from '../../db';

interface AuthenticatedRequest {
  user: UserResponseDto;
  params: { id: string };
}

const ADMIN_ROLE: UserRole = USER_ROLES[0]; // 'ADMIN'

@Injectable()
export class SelfOrAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user: UserResponseDto = request.user;
    const requestedUserId = parseInt(request.params.id, 10);

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // Admin can access any user
    if (user.role === ADMIN_ROLE) {
      return true;
    }

    // Regular users can only access their own data
    if (user.id === requestedUserId) {
      return true;
    }

    throw new ForbiddenException('You can only access your own data');
  }
}
