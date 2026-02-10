import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { User, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

import { PrismaService } from '../prisma/prisma.service';

import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let configService: ConfigService;

  const mockUser: User = {
    id: 'user-id',
    email: 'test@example.com',
    password: 'hashed-password',
    firstName: 'John',
    lastName: 'Doe',
    role: UserRole.SUBSCRIBER,
    avatar: null,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    refreshToken: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockJwtService = {
    sign: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get<PrismaService>(PrismaService);
    jwtService = module.get<JwtService>(JwtService);
    configService = module.get<ConfigService>(ConfigService);

    // Default config values
    mockConfigService.get.mockImplementation((key: string) => {
      const config: Record<string, string> = {
        'jwt.secret': 'test-secret',
        'jwt.expiration': '15m',
        'jwt.refreshExpiration': '7d',
      };
      return config[key];
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should successfully register a new user', async () => {
      const registerDto: RegisterDto = {
        email: 'newuser@example.com',
        password: 'password123',
        firstName: 'Jane',
        lastName: 'Smith',
      };

      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.user.create.mockResolvedValue({
        ...mockUser,
        email: registerDto.email,
        firstName: registerDto.firstName,
        lastName: registerDto.lastName,
      });
      mockJwtService.sign.mockReturnValue('access-token');
      mockPrismaService.refreshToken.create.mockResolvedValue({
        id: 'token-id',
        token: 'refresh-token',
        userId: mockUser.id,
        expiresAt: new Date(),
        createdAt: new Date(),
        revokedAt: null,
      });

      jest.spyOn(bcrypt, 'hash').mockImplementation(() => Promise.resolve('hashed-password'));

      const result = await service.register(registerDto);

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.user).not.toHaveProperty('password');
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: registerDto.email },
      });
      expect(bcrypt.hash).toHaveBeenCalledWith(registerDto.password, 12);
    });

    it('should throw BadRequestException if user already exists', async () => {
      const registerDto: RegisterDto = {
        email: 'existing@example.com',
        password: 'password123',
        firstName: 'Jane',
        lastName: 'Smith',
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      await expect(service.register(registerDto)).rejects.toThrow(BadRequestException);
      await expect(service.register(registerDto)).rejects.toThrow(
        'User with this email already exists',
      );
    });
  });

  describe('validateUser', () => {
    it('should return user when credentials are valid', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      jest.spyOn(bcrypt, 'compare').mockImplementation(() => Promise.resolve(true));

      const result = await service.validateUser('test@example.com', 'password123');

      expect(result).toEqual(mockUser);
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
    });

    it('should return null when user does not exist', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      const result = await service.validateUser('nonexistent@example.com', 'password123');

      expect(result).toBeNull();
    });

    it('should return null when password is invalid', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      jest.spyOn(bcrypt, 'compare').mockImplementation(() => Promise.resolve(false));

      const result = await service.validateUser('test@example.com', 'wrongpassword');

      expect(result).toBeNull();
    });

    it('should throw UnauthorizedException when user is not active', async () => {
      const inactiveUser = { ...mockUser, isActive: false };
      mockPrismaService.user.findUnique.mockResolvedValue(inactiveUser);
      jest.spyOn(bcrypt, 'compare').mockImplementation(() => Promise.resolve(true));

      await expect(service.validateUser('test@example.com', 'password123')).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.validateUser('test@example.com', 'password123')).rejects.toThrow(
        'Account is deactivated',
      );
    });
  });

  describe('login', () => {
    it('should return user and tokens', async () => {
      mockJwtService.sign.mockReturnValue('access-token');
      mockPrismaService.refreshToken.create.mockResolvedValue({
        id: 'token-id',
        token: 'refresh-token',
        userId: mockUser.id,
        expiresAt: new Date(),
        createdAt: new Date(),
        revokedAt: null,
      });

      const result = await service.login(mockUser);

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.user).not.toHaveProperty('password');
      expect(result.accessToken).toBe('access-token');
    });
  });

  describe('refreshTokens', () => {
    it('should refresh tokens successfully', async () => {
      const refreshToken = 'valid-refresh-token';
      const storedToken = {
        id: 'token-id',
        token: refreshToken,
        userId: mockUser.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        createdAt: new Date(),
        revokedAt: null,
        user: mockUser,
      };

      mockPrismaService.refreshToken.findUnique.mockResolvedValue(storedToken);
      mockPrismaService.refreshToken.update.mockResolvedValue({
        ...storedToken,
        revokedAt: new Date(),
      });
      mockPrismaService.refreshToken.create.mockResolvedValue({
        id: 'new-token-id',
        token: 'new-refresh-token',
        userId: mockUser.id,
        expiresAt: new Date(),
        createdAt: new Date(),
        revokedAt: null,
      });
      mockJwtService.sign.mockReturnValue('new-access-token');

      const result = await service.refreshTokens(refreshToken);

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(mockPrismaService.refreshToken.update).toHaveBeenCalledWith({
        where: { id: storedToken.id },
        data: { revokedAt: expect.any(Date) },
      });
    });

    it('should throw UnauthorizedException when token is not found', async () => {
      mockPrismaService.refreshToken.findUnique.mockResolvedValue(null);

      await expect(service.refreshTokens('invalid-token')).rejects.toThrow(UnauthorizedException);
      await expect(service.refreshTokens('invalid-token')).rejects.toThrow('Invalid refresh token');
    });

    it('should throw UnauthorizedException when token is revoked', async () => {
      const revokedToken = {
        id: 'token-id',
        token: 'revoked-token',
        userId: mockUser.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        createdAt: new Date(),
        revokedAt: new Date(),
        user: mockUser,
      };

      mockPrismaService.refreshToken.findUnique.mockResolvedValue(revokedToken);

      await expect(service.refreshTokens('revoked-token')).rejects.toThrow(UnauthorizedException);
      await expect(service.refreshTokens('revoked-token')).rejects.toThrow(
        'Refresh token has been revoked',
      );
    });

    it('should throw UnauthorizedException when token is expired', async () => {
      const expiredToken = {
        id: 'token-id',
        token: 'expired-token',
        userId: mockUser.id,
        expiresAt: new Date(Date.now() - 1000), // Already expired
        createdAt: new Date(),
        revokedAt: null,
        user: mockUser,
      };

      mockPrismaService.refreshToken.findUnique.mockResolvedValue(expiredToken);

      await expect(service.refreshTokens('expired-token')).rejects.toThrow(UnauthorizedException);
      await expect(service.refreshTokens('expired-token')).rejects.toThrow(
        'Refresh token has expired',
      );
    });

    it('should throw UnauthorizedException when user is not active', async () => {
      const inactiveUser = { ...mockUser, isActive: false };
      const storedToken = {
        id: 'token-id',
        token: 'valid-token',
        userId: mockUser.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        createdAt: new Date(),
        revokedAt: null,
        user: inactiveUser,
      };

      mockPrismaService.refreshToken.findUnique.mockResolvedValue(storedToken);

      await expect(service.refreshTokens('valid-token')).rejects.toThrow(UnauthorizedException);
      await expect(service.refreshTokens('valid-token')).rejects.toThrow('Account is deactivated');
    });
  });

  describe('logout', () => {
    it('should revoke refresh token successfully', async () => {
      const refreshToken = 'valid-token';
      const storedToken = {
        id: 'token-id',
        token: refreshToken,
        userId: mockUser.id,
        expiresAt: new Date(),
        createdAt: new Date(),
        revokedAt: null,
      };

      mockPrismaService.refreshToken.findUnique.mockResolvedValue(storedToken);
      mockPrismaService.refreshToken.update.mockResolvedValue({
        ...storedToken,
        revokedAt: new Date(),
      });

      await service.logout(refreshToken);

      expect(mockPrismaService.refreshToken.update).toHaveBeenCalledWith({
        where: { id: storedToken.id },
        data: { revokedAt: expect.any(Date) },
      });
    });

    it('should throw UnauthorizedException when token is not found', async () => {
      mockPrismaService.refreshToken.findUnique.mockResolvedValue(null);

      await expect(service.logout('invalid-token')).rejects.toThrow(UnauthorizedException);
      await expect(service.logout('invalid-token')).rejects.toThrow('Invalid refresh token');
    });
  });

  describe('getUserById', () => {
    it('should return user without password', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.getUserById(mockUser.id);

      expect(result).not.toHaveProperty('password');
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('email');
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: mockUser.id },
      });
    });

    it('should throw UnauthorizedException when user is not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.getUserById('nonexistent-id')).rejects.toThrow(UnauthorizedException);
      await expect(service.getUserById('nonexistent-id')).rejects.toThrow('User not found');
    });
  });
});
