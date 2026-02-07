import { SetMetadata } from '@nestjs/common';
import { UserRole } from '@prisma/client';

/**
 * Roles decorator
 * Specifies which roles are allowed to access a route
 * Used with RolesGuard for role-based access control
 *
 * @example
 * @Roles(UserRole.ADMIN, UserRole.EDITOR)
 * @Get('admin')
 * adminOnly() { ... }
 */
export const ROLES_KEY = 'roles';
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
