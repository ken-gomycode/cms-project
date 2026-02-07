import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { UserRole } from '@prisma/client';

/**
 * Current User interface
 * Represents the authenticated user attached to the request
 */
export interface CurrentUserType {
  id: string;
  email: string;
  role: UserRole;
  firstName: string;
  lastName: string;
}

/**
 * CurrentUser decorator
 * Extracts the authenticated user from the request
 * Can be used to get the entire user object or a specific property
 *
 * @example
 * // Get entire user object
 * @Get('profile')
 * getProfile(@CurrentUser() user: CurrentUserType) { ... }
 *
 * // Get specific property
 * @Get('profile')
 * getProfile(@CurrentUser('id') userId: string) { ... }
 */
export const CurrentUser = createParamDecorator(
  (data: keyof CurrentUserType | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as CurrentUserType;

    // Return specific property if specified, otherwise return entire user
    return data ? user?.[data] : user;
  },
);
