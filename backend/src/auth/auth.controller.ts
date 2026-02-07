import { Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { User } from '@prisma/client';

import { AuthResponse, AuthService } from './auth.service';
import { CurrentUser, CurrentUserType } from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';
import { LocalAuthGuard } from './guards/local-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Register a new user
   * Public endpoint - no authentication required
   * Rate limit: 3 requests per minute
   */
  @Public()
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @Post('register')
  async register(@Body() registerDto: RegisterDto): Promise<AuthResponse> {
    return this.authService.register(registerDto);
  }

  /**
   * Login with email and password
   * Uses LocalAuthGuard to validate credentials
   * Public endpoint - no authentication required
   * Rate limit: 5 requests per minute
   */
  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @UseGuards(LocalAuthGuard)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@CurrentUser() user: User): Promise<AuthResponse> {
    return this.authService.login(user);
  }

  /**
   * Refresh access token using refresh token
   * Implements token rotation for security
   * Public endpoint - no authentication required
   */
  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() refreshTokenDto: RefreshTokenDto): Promise<AuthResponse> {
    return this.authService.refreshTokens(refreshTokenDto.refreshToken);
  }

  /**
   * Logout user by revoking refresh token
   * Protected endpoint - requires authentication
   */
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Body() refreshTokenDto: RefreshTokenDto) {
    await this.authService.logout(refreshTokenDto.refreshToken);
  }

  /**
   * Get current authenticated user profile
   * Protected endpoint - requires authentication
   */
  @Get('me')
  async getMe(@CurrentUser() user: CurrentUserType) {
    return this.authService.getUserById(user.id);
  }
}
