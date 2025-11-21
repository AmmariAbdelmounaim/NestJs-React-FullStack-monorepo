import { SetMetadata } from '@nestjs/common';
import { UserRow } from '../../db';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: UserRow['role'][]) =>
  SetMetadata(ROLES_KEY, roles);
