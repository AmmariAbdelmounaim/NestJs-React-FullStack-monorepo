import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { UserRow } from '../../db';
import { UserResponseDto } from '../../users/users.dto';

interface AuthenticatedRequest {
  user: UserResponseDto;
  params: { id: string };
}

const ADMIN_ROLE: UserRow['role'] = 'ADMIN';

@Injectable()
export class SelfOrAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user: UserResponseDto = request.user;
    const requestedUserId = parseInt(request.params.id, 10);

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    if (user.role === ADMIN_ROLE) {
      return true;
    }

    if (Number(user.id) === requestedUserId) {
      return true;
    }

    throw new ForbiddenException("You're not authorized");
  }
}
