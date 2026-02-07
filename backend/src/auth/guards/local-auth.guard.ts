import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Local Authentication Guard
 * Uses LocalStrategy for email/password authentication
 * Applied to login endpoints
 */
@Injectable()
export class LocalAuthGuard extends AuthGuard('local') {}
