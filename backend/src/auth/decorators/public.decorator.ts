import { SetMetadata } from '@nestjs/common';

/**
 * Public route decorator
 * Marks a route as public, bypassing JWT authentication
 * Used with JwtAuthGuard to allow access without authentication
 */
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
