import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import * as request from 'supertest';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

describe('UsersController', () => {
  let app: INestApplication;
  let usersService: UsersService;

  const mockUserWithoutPassword = {
    id: '1',
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    role: UserRole.SUBSCRIBER,
    avatar: null,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockUsersService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    updateProfile: jest.fn(),
    remove: jest.fn(),
  };

  // Mock guards to bypass authentication for testing and inject user
  const mockJwtAuthGuard = {
    canActivate: jest.fn((context) => {
      const request = context.switchToHttp().getRequest();
      // Inject mock user into request for @CurrentUser() decorator
      request.user = {
        id: '1',
        email: 'test@example.com',
        role: UserRole.SUBSCRIBER,
        firstName: 'John',
        lastName: 'Doe',
      };
      return true;
    }),
  };

  const mockRolesGuard = {
    canActivate: jest.fn(() => true),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockJwtAuthGuard)
      .overrideGuard(RolesGuard)
      .useValue(mockRolesGuard)
      .compile();

    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    usersService = module.get<UsersService>(UsersService);

    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('POST /users', () => {
    const createUserDto = {
      email: 'test@example.com',
      password: 'password123',
      firstName: 'John',
      lastName: 'Doe',
      role: UserRole.SUBSCRIBER,
    };

    it('should create a new user', async () => {
      mockUsersService.create.mockResolvedValue(mockUserWithoutPassword);

      const response = await request(app.getHttpServer())
        .post('/users')
        .send(createUserDto)
        .expect(201);

      expect(mockUsersService.create).toHaveBeenCalledWith(createUserDto);
      expect(response.body).toEqual(
        expect.objectContaining({
          id: '1',
          email: 'test@example.com',
          firstName: 'John',
          lastName: 'Doe',
        }),
      );
      expect(response.body).not.toHaveProperty('password');
    });

    it('should validate required fields', async () => {
      await request(app.getHttpServer()).post('/users').send({}).expect(400);

      expect(mockUsersService.create).not.toHaveBeenCalled();
    });

    it('should validate email format', async () => {
      await request(app.getHttpServer())
        .post('/users')
        .send({ ...createUserDto, email: 'invalid-email' })
        .expect(400);

      expect(mockUsersService.create).not.toHaveBeenCalled();
    });

    it('should validate password minimum length', async () => {
      await request(app.getHttpServer())
        .post('/users')
        .send({ ...createUserDto, password: 'short' })
        .expect(400);

      expect(mockUsersService.create).not.toHaveBeenCalled();
    });

    it('should validate role enum', async () => {
      await request(app.getHttpServer())
        .post('/users')
        .send({ ...createUserDto, role: 'INVALID_ROLE' })
        .expect(400);

      expect(mockUsersService.create).not.toHaveBeenCalled();
    });

    it('should accept valid roles', async () => {
      mockUsersService.create.mockResolvedValue({
        ...mockUserWithoutPassword,
        role: UserRole.ADMIN,
      });

      await request(app.getHttpServer())
        .post('/users')
        .send({ ...createUserDto, role: UserRole.ADMIN })
        .expect(201);

      expect(mockUsersService.create).toHaveBeenCalled();
    });
  });

  describe('GET /users', () => {
    it('should return paginated users', async () => {
      const paginatedResponse = {
        data: [mockUserWithoutPassword],
        meta: {
          total: 1,
          page: 1,
          limit: 10,
          totalPages: 1,
        },
      };

      mockUsersService.findAll.mockResolvedValue(paginatedResponse);

      const response = await request(app.getHttpServer()).get('/users').expect(200);

      expect(mockUsersService.findAll).toHaveBeenCalledWith(1, 10, undefined, undefined);
      expect(response.body).toMatchObject({
        data: expect.any(Array),
        meta: paginatedResponse.meta,
      });
      expect(response.body.data[0].email).toBe('test@example.com');
    });

    it('should handle pagination parameters', async () => {
      const paginatedResponse = {
        data: [mockUserWithoutPassword],
        meta: {
          total: 25,
          page: 2,
          limit: 5,
          totalPages: 5,
        },
      };

      mockUsersService.findAll.mockResolvedValue(paginatedResponse);

      await request(app.getHttpServer()).get('/users?page=2&limit=5').expect(200);

      expect(mockUsersService.findAll).toHaveBeenCalledWith(2, 5, undefined, undefined);
    });

    it('should filter by role', async () => {
      const paginatedResponse = {
        data: [{ ...mockUserWithoutPassword, role: UserRole.ADMIN }],
        meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
      };

      mockUsersService.findAll.mockResolvedValue(paginatedResponse);

      await request(app.getHttpServer()).get(`/users?role=${UserRole.ADMIN}`).expect(200);

      expect(mockUsersService.findAll).toHaveBeenCalledWith(1, 10, UserRole.ADMIN, undefined);
    });

    it('should filter by isActive', async () => {
      const paginatedResponse = {
        data: [mockUserWithoutPassword],
        meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
      };

      mockUsersService.findAll.mockResolvedValue(paginatedResponse);

      await request(app.getHttpServer()).get('/users?isActive=true').expect(200);

      expect(mockUsersService.findAll).toHaveBeenCalledWith(1, 10, undefined, true);
    });
  });

  describe('GET /users/profile', () => {
    it('should return current user profile', async () => {
      mockUsersService.findOne.mockResolvedValue(mockUserWithoutPassword);

      const response = await request(app.getHttpServer()).get('/users/profile').expect(200);

      expect(mockUsersService.findOne).toHaveBeenCalledWith('1');
      expect(response.body).not.toHaveProperty('password');
    });
  });

  describe('PATCH /users/profile', () => {
    const updateProfileDto = {
      firstName: 'Jane',
      avatar: 'https://example.com/avatar.jpg',
    };

    it('should update current user profile', async () => {
      const updatedUser = { ...mockUserWithoutPassword, ...updateProfileDto };
      mockUsersService.updateProfile.mockResolvedValue(updatedUser);

      const response = await request(app.getHttpServer())
        .patch('/users/profile')
        .send(updateProfileDto)
        .expect(200);

      expect(response.body.firstName).toBe('Jane');
      expect(response.body).not.toHaveProperty('password');
    });

    it('should validate update profile DTO', async () => {
      await request(app.getHttpServer())
        .patch('/users/profile')
        .send({ invalidField: 'value' })
        .expect(400);

      expect(mockUsersService.updateProfile).not.toHaveBeenCalled();
    });

    it('should allow updating individual fields', async () => {
      const updatedUser = {
        ...mockUserWithoutPassword,
        firstName: 'UpdatedName',
      };
      mockUsersService.updateProfile.mockResolvedValue(updatedUser);

      await request(app.getHttpServer())
        .patch('/users/profile')
        .send({ firstName: 'UpdatedName' })
        .expect(200);

      expect(mockUsersService.updateProfile).toHaveBeenCalled();
    });
  });

  describe('GET /users/:id', () => {
    it('should return a user by ID', async () => {
      mockUsersService.findOne.mockResolvedValue(mockUserWithoutPassword);

      const response = await request(app.getHttpServer()).get('/users/1').expect(200);

      expect(mockUsersService.findOne).toHaveBeenCalledWith('1');
      expect(response.body).toEqual(
        expect.objectContaining({
          id: '1',
          email: 'test@example.com',
        }),
      );
      expect(response.body).not.toHaveProperty('password');
    });
  });

  describe('PATCH /users/:id', () => {
    const updateUserDto = {
      firstName: 'Jane',
      lastName: 'Smith',
      role: UserRole.EDITOR,
    };

    it('should update a user', async () => {
      const updatedUser = { ...mockUserWithoutPassword, ...updateUserDto };
      mockUsersService.update.mockResolvedValue(updatedUser);

      const response = await request(app.getHttpServer())
        .patch('/users/1')
        .send(updateUserDto)
        .expect(200);

      expect(mockUsersService.update).toHaveBeenCalledWith('1', updateUserDto);
      expect(response.body.firstName).toBe('Jane');
      expect(response.body.role).toBe(UserRole.EDITOR);
      expect(response.body).not.toHaveProperty('password');
    });

    it('should validate update DTO', async () => {
      await request(app.getHttpServer())
        .patch('/users/1')
        .send({ email: 'invalid-email' })
        .expect(400);

      expect(mockUsersService.update).not.toHaveBeenCalled();
    });

    it('should allow partial updates', async () => {
      mockUsersService.update.mockResolvedValue(mockUserWithoutPassword);

      await request(app.getHttpServer())
        .patch('/users/1')
        .send({ firstName: 'UpdatedName' })
        .expect(200);

      expect(mockUsersService.update).toHaveBeenCalledWith('1', {
        firstName: 'UpdatedName',
      });
    });

    it('should validate password length if provided', async () => {
      await request(app.getHttpServer()).patch('/users/1').send({ password: 'short' }).expect(400);

      expect(mockUsersService.update).not.toHaveBeenCalled();
    });
  });

  describe('DELETE /users/:id', () => {
    it('should soft delete a user', async () => {
      mockUsersService.remove.mockResolvedValue({
        ...mockUserWithoutPassword,
        isActive: false,
      });

      const response = await request(app.getHttpServer()).delete('/users/1').expect(200);

      expect(mockUsersService.remove).toHaveBeenCalledWith('1');
      expect(response.body).toEqual({
        message: 'User successfully deleted',
      });
    });
  });
});
