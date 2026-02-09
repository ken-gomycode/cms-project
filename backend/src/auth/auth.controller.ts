import { Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { User } from '@prisma/client';

import { AuthResponse, AuthService } from './auth.service';
import { CurrentUser, CurrentUserType } from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';
import { LocalAuthGuard } from './guards/local-auth.guard';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Register a new user
   * Public endpoint - no authentication required
   * Rate limit: 3 requests per minute
   */
  @ApiOperation({
    summary: 'Register a new user',
    description:
      'Create a new user account with email, password, and name. Rate limited to 3 requests per minute.',
  })
  @ApiBody({ type: RegisterDto })
  @ApiResponse({
    status: 201,
    description: 'User successfully registered and JWT tokens returned',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input or email already exists',
  })
  @ApiResponse({
    status: 429,
    description: 'Too many requests - rate limit exceeded',
  })
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
  @ApiOperation({
    summary: 'Login user',
    description:
      'Authenticate user with email and password. Returns JWT access and refresh tokens. Rate limited to 5 requests per minute.',
  })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 200,
    description: 'User successfully authenticated and JWT tokens returned',
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid credentials',
  })
  @ApiResponse({
    status: 429,
    description: 'Too many requests - rate limit exceeded',
  })
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
  @ApiOperation({
    summary: 'Refresh access token',
    description:
      'Get new access and refresh tokens using a valid refresh token. Implements token rotation for security.',
  })
  @ApiBody({ type: RefreshTokenDto })
  @ApiResponse({
    status: 200,
    description: 'Tokens successfully refreshed',
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid or expired refresh token',
  })
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
  @ApiOperation({
    summary: 'Logout user',
    description: 'Revoke the refresh token to log out the user.',
  })
  @ApiBody({ type: RefreshTokenDto })
  @ApiResponse({
    status: 204,
    description: 'Successfully logged out',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing token',
  })
  @ApiBearerAuth('JWT-auth')
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Body() refreshTokenDto: RefreshTokenDto) {
    await this.authService.logout(refreshTokenDto.refreshToken);
  }

  /**
   * Get current authenticated user profile
   * Protected endpoint - requires authentication
   */
  @ApiOperation({
    summary: 'Get current user profile',
    description: 'Retrieve the profile information of the currently authenticated user.',
  })
  @ApiResponse({
    status: 200,
    description: 'User profile retrieved successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing token',
  })
  @ApiBearerAuth('JWT-auth')
  @Get('me')
  async getMe(@CurrentUser() user: CurrentUserType) {
    return this.authService.getUserById(user.id);
  }
}
