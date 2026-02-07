import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { User, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PaginatedResponseDto } from '../common/dto/paginated-response.dto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

/**
 * User entity without password field
 * Used for safe external representation
 */
export type UserWithoutPassword = Omit<User, 'password'>;

/**
 * Service for managing user accounts
 * Handles CRUD operations, password hashing, and user queries
 */
@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Creates a new user with hashed password
   * @throws ConflictException if email already exists
   */
  async create(dto: CreateUserDto): Promise<UserWithoutPassword> {
    // Check if email already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    // Create user
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        password: hashedPassword,
        firstName: dto.firstName,
        lastName: dto.lastName,
        role: dto.role || UserRole.SUBSCRIBER,
      },
    });

    // Return user without password
    return this.excludePassword(user);
  }

  /**
   * Retrieves all users with pagination and filtering
   * @param page - Page number (default: 1)
   * @param limit - Items per page (default: 10)
   * @param role - Filter by user role (optional)
   * @param isActive - Filter by active status (optional)
   */
  async findAll(
    page: number = 1,
    limit: number = 10,
    role?: UserRole,
    isActive?: boolean,
  ): Promise<PaginatedResponseDto<UserWithoutPassword>> {
    // Build filter conditions
    const where: any = {};
    if (role !== undefined) {
      where.role = role;
    }
    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    // Calculate skip for pagination
    const skip = (page - 1) * limit;

    // Execute queries in parallel
    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    // Exclude passwords from all users
    const usersWithoutPasswords = users.map((user) => this.excludePassword(user));

    return new PaginatedResponseDto(usersWithoutPasswords, total, page, limit);
  }

  /**
   * Finds a single user by ID
   * @throws NotFoundException if user doesn't exist
   */
  async findOne(id: string): Promise<UserWithoutPassword> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return this.excludePassword(user);
  }

  /**
   * Finds a user by email
   * Returns user with password (for authentication purposes)
   * Returns null if user doesn't exist
   */
  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  /**
   * Updates a user
   * @throws NotFoundException if user doesn't exist
   * @throws ConflictException if email already exists for another user
   */
  async update(id: string, dto: UpdateUserDto): Promise<UserWithoutPassword> {
    // Check if user exists
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    // Check email uniqueness if email is being updated
    if (dto.email && dto.email !== user.email) {
      const existingUser = await this.prisma.user.findUnique({
        where: { email: dto.email },
      });

      if (existingUser) {
        throw new ConflictException('Email already exists');
      }
    }

    // Prepare update data
    const updateData: any = { ...dto };

    // Hash password if being updated
    if (dto.password) {
      updateData.password = await bcrypt.hash(dto.password, 10);
    }

    // Update user
    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: updateData,
    });

    return this.excludePassword(updatedUser);
  }

  /**
   * Updates a user's profile (limited fields)
   * @throws NotFoundException if user doesn't exist
   */
  async updateProfile(id: string, dto: UpdateProfileDto): Promise<UserWithoutPassword> {
    // Check if user exists
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    // Update user with limited fields
    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: dto,
    });

    return this.excludePassword(updatedUser);
  }

  /**
   * Soft deletes a user by setting isActive to false
   * @throws NotFoundException if user doesn't exist
   */
  async remove(id: string): Promise<UserWithoutPassword> {
    // Check if user exists
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    // Soft delete - set isActive to false
    const deletedUser = await this.prisma.user.update({
      where: { id },
      data: { isActive: false },
    });

    return this.excludePassword(deletedUser);
  }

  /**
   * Helper method to exclude password from user object
   */
  private excludePassword(user: User): UserWithoutPassword {
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }
}
