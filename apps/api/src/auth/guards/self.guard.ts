import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { UserRow } from '../../db';

interface AuthenticatedRequest {
  user: UserRow;
  params: { id: string };
}

@Injectable()
export class SelfGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user: UserRow = request.user;
    const requestedUserId = parseInt(request.params.id, 10);

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // Check if user is accessing their own data
    // Convert BigInt to number for comparison
    if (Number(user.id) !== requestedUserId) {
      throw new ForbiddenException('You can only access your own data');
    }

    return true;
  }
}
