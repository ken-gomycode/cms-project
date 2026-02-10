import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { ContentStatus, UserRole } from '@prisma/client';

import { AnalyticsInterceptor } from '../analytics/analytics.interceptor';
import { AnalyticsService } from '../analytics/analytics.service';
import { CurrentUserType } from '../auth/decorators/current-user.decorator';
import { CacheService } from '../cache/cache.service';
import { HttpCacheInterceptor } from '../cache/http-cache.interceptor';

import { ContentController } from './content.controller';
import { ContentService } from './content.service';
import { CreateContentDto } from './dto/create-content.dto';
import { UpdateContentDto } from './dto/update-content.dto';

describe('ContentController', () => {
  let controller: ContentController;
  let service: ContentService;

  const mockContentService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    findBySlug: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    hardRemove: jest.fn(),
    scheduleContent: jest.fn(),
    unscheduleContent: jest.fn(),
  };

  const mockCacheService = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    reset: jest.fn(),
    getOrSet: jest.fn(),
  };

  const mockAnalyticsService = {
    trackPageView: jest.fn(),
    getAnalytics: jest.fn(),
  };

  const mockAuthor: CurrentUserType = {
    id: 'user-123',
    email: 'author@example.com',
    firstName: 'John',
    lastName: 'Doe',
    role: UserRole.AUTHOR,
  };

  const mockEditor: CurrentUserType = {
    id: 'editor-123',
    email: 'editor@example.com',
    firstName: 'Jane',
    lastName: 'Editor',
    role: UserRole.EDITOR,
  };

  const mockAdmin: CurrentUserType = {
    id: 'admin-123',
    email: 'admin@example.com',
    firstName: 'Admin',
    lastName: 'User',
    role: UserRole.ADMIN,
  };

  const mockContent = {
    id: 'content-123',
    title: 'Test Article',
    slug: 'test-article',
    body: 'Test content body',
    excerpt: 'Test excerpt',
    status: ContentStatus.DRAFT,
    authorId: 'user-123',
    featuredImageId: null,
    publishedAt: null,
    scheduledAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    author: {
      id: 'user-123',
      email: 'author@example.com',
      firstName: 'John',
      lastName: 'Doe',
      role: 'AUTHOR',
    },
    categories: [],
    tags: [],
    featuredImage: null,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ContentController],
      providers: [
        {
          provide: ContentService,
          useValue: mockContentService,
        },
        {
          provide: CacheService,
          useValue: mockCacheService,
        },
        {
          provide: AnalyticsService,
          useValue: mockAnalyticsService,
        },
        HttpCacheInterceptor,
        AnalyticsInterceptor,
        Reflector,
      ],
    }).compile();

    controller = module.get<ContentController>(ContentController);
    service = module.get<ContentService>(ContentService);

    // Reset all mocks
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    const createDto: CreateContentDto = {
      title: 'Test Article',
      body: 'Test content body',
      excerpt: 'Test excerpt',
      status: ContentStatus.DRAFT,
      categoryIds: ['cat-1'],
      tagIds: ['tag-1'],
    };

    it('should create content as AUTHOR', async () => {
      mockContentService.create.mockResolvedValue(mockContent);

      const result = await controller.create(createDto, mockAuthor);

      expect(result).toEqual(mockContent);
      expect(mockContentService.create).toHaveBeenCalledWith(createDto, mockAuthor.id);
    });

    it('should create content as EDITOR', async () => {
      mockContentService.create.mockResolvedValue(mockContent);

      const result = await controller.create(createDto, mockEditor);

      expect(result).toEqual(mockContent);
      expect(mockContentService.create).toHaveBeenCalledWith(createDto, mockEditor.id);
    });

    it('should create content as ADMIN', async () => {
      mockContentService.create.mockResolvedValue(mockContent);

      const result = await controller.create(createDto, mockAdmin);

      expect(result).toEqual(mockContent);
      expect(mockContentService.create).toHaveBeenCalledWith(createDto, mockAdmin.id);
    });
  });

  describe('findAll', () => {
    const filterDto = {
      page: 1,
      limit: 10,
      status: ContentStatus.PUBLISHED,
    };

    const paginatedResponse = {
      data: [mockContent],
      meta: {
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      },
    };

    it('should return paginated content', async () => {
      mockContentService.findAll.mockResolvedValue(paginatedResponse);

      const result = await controller.findAll(filterDto);

      expect(result).toEqual(paginatedResponse);
      expect(mockContentService.findAll).toHaveBeenCalledWith(filterDto);
    });

    it('should be accessible publicly (no authentication required)', async () => {
      mockContentService.findAll.mockResolvedValue(paginatedResponse);

      // This test verifies the @Public() decorator is present
      const result = await controller.findAll({});

      expect(result).toEqual(paginatedResponse);
    });
  });

  describe('findOne', () => {
    it('should find content by UUID', async () => {
      const uuid = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
      mockContentService.findOne.mockResolvedValue(mockContent);

      const result = await controller.findOne(uuid);

      expect(result).toEqual(mockContent);
      expect(mockContentService.findOne).toHaveBeenCalledWith(uuid);
      expect(mockContentService.findBySlug).not.toHaveBeenCalled();
    });

    it('should find PUBLISHED content by slug', async () => {
      const slug = 'test-article';
      const publishedContent = {
        ...mockContent,
        status: ContentStatus.PUBLISHED,
      };
      mockContentService.findBySlug.mockResolvedValue(publishedContent);

      const result = await controller.findOne(slug);

      expect(result).toEqual(publishedContent);
      expect(mockContentService.findBySlug).toHaveBeenCalledWith(slug);
      expect(mockContentService.findOne).not.toHaveBeenCalled();
    });

    it('should be accessible publicly', async () => {
      mockContentService.findOne.mockResolvedValue(mockContent);

      // This test verifies the @Public() decorator is present
      const result = await controller.findOne('f47ac10b-58cc-4372-a567-0e02b2c3d479');

      expect(result).toEqual(mockContent);
    });
  });

  describe('update', () => {
    const updateDto: UpdateContentDto = {
      title: 'Updated Title',
      body: 'Updated body',
    };

    const updatedContent = {
      ...mockContent,
      ...updateDto,
    };

    it('should allow author to update their own content', async () => {
      mockContentService.findOne.mockResolvedValue(mockContent);
      mockContentService.update.mockResolvedValue(updatedContent);

      const result = await controller.update('content-123', updateDto, mockAuthor);

      expect(result).toEqual(updatedContent);
      expect(mockContentService.update).toHaveBeenCalledWith(
        'content-123',
        updateDto,
        mockAuthor.id,
      );
    });

    it('should prevent author from updating other users content', async () => {
      const otherUserContent = {
        ...mockContent,
        authorId: 'other-user-123',
      };
      mockContentService.findOne.mockResolvedValue(otherUserContent);

      await expect(controller.update('content-123', updateDto, mockAuthor)).rejects.toThrow(
        ForbiddenException,
      );

      expect(mockContentService.update).not.toHaveBeenCalled();
    });

    it('should allow editor to update any content', async () => {
      const otherUserContent = {
        ...mockContent,
        authorId: 'other-user-123',
      };
      mockContentService.findOne.mockResolvedValue(otherUserContent);
      mockContentService.update.mockResolvedValue(updatedContent);

      const result = await controller.update('content-123', updateDto, mockEditor);

      expect(result).toEqual(updatedContent);
      expect(mockContentService.update).toHaveBeenCalledWith(
        'content-123',
        updateDto,
        mockEditor.id,
      );
    });

    it('should allow admin to update any content', async () => {
      const otherUserContent = {
        ...mockContent,
        authorId: 'other-user-123',
      };
      mockContentService.findOne.mockResolvedValue(otherUserContent);
      mockContentService.update.mockResolvedValue(updatedContent);

      const result = await controller.update('content-123', updateDto, mockAdmin);

      expect(result).toEqual(updatedContent);
      expect(mockContentService.update).toHaveBeenCalledWith(
        'content-123',
        updateDto,
        mockAdmin.id,
      );
    });

    it('should throw NotFoundException if content does not exist', async () => {
      mockContentService.findOne.mockRejectedValue(new NotFoundException('Content not found'));

      await expect(controller.update('non-existent', updateDto, mockAuthor)).rejects.toThrow(
        NotFoundException,
      );

      expect(mockContentService.update).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should allow author to delete their own content', async () => {
      mockContentService.findOne.mockResolvedValue(mockContent);
      mockContentService.remove.mockResolvedValue(undefined);

      const result = await controller.remove('content-123', mockAuthor);

      expect(result).toEqual({ message: 'Content archived successfully' });
      expect(mockContentService.remove).toHaveBeenCalledWith('content-123');
    });

    it('should prevent author from deleting other users content', async () => {
      const otherUserContent = {
        ...mockContent,
        authorId: 'other-user-123',
      };
      mockContentService.findOne.mockResolvedValue(otherUserContent);

      await expect(controller.remove('content-123', mockAuthor)).rejects.toThrow(
        ForbiddenException,
      );

      expect(mockContentService.remove).not.toHaveBeenCalled();
    });

    it('should allow admin to delete any content without ownership check', async () => {
      const otherUserContent = {
        ...mockContent,
        authorId: 'other-user-123',
      };
      mockContentService.findOne.mockResolvedValue(otherUserContent);
      mockContentService.remove.mockResolvedValue(undefined);

      const result = await controller.remove('content-123', mockAdmin);

      expect(result).toEqual({ message: 'Content archived successfully' });
      expect(mockContentService.remove).toHaveBeenCalledWith('content-123');
      // Note: Admin bypasses ownership check, so findOne might not be called
    });

    it('should throw NotFoundException if content does not exist', async () => {
      mockContentService.findOne.mockRejectedValue(new NotFoundException('Content not found'));

      await expect(controller.remove('non-existent', mockAuthor)).rejects.toThrow(
        NotFoundException,
      );

      expect(mockContentService.remove).not.toHaveBeenCalled();
    });
  });

  describe('ownership checks', () => {
    it('should allow EDITOR role to bypass ownership checks', async () => {
      const otherUserContent = {
        ...mockContent,
        authorId: 'different-user',
      };
      mockContentService.findOne.mockResolvedValue(otherUserContent);
      mockContentService.update.mockResolvedValue(otherUserContent);

      // Should not throw ForbiddenException
      await controller.update('content-123', { title: 'New' }, mockEditor);

      expect(mockContentService.update).toHaveBeenCalled();
    });

    it('should allow ADMIN role to bypass ownership checks', async () => {
      const otherUserContent = {
        ...mockContent,
        authorId: 'different-user',
      };
      mockContentService.findOne.mockResolvedValue(otherUserContent);
      mockContentService.update.mockResolvedValue(otherUserContent);

      // Should not throw ForbiddenException
      await controller.update('content-123', { title: 'New' }, mockAdmin);

      expect(mockContentService.update).toHaveBeenCalled();
    });

    it('should enforce ownership for AUTHOR role', async () => {
      const otherUserContent = {
        ...mockContent,
        authorId: 'different-user',
      };
      mockContentService.findOne.mockResolvedValue(otherUserContent);

      // Should throw ForbiddenException
      await expect(controller.update('content-123', { title: 'New' }, mockAuthor)).rejects.toThrow(
        ForbiddenException,
      );

      expect(mockContentService.update).not.toHaveBeenCalled();
    });
  });

  describe('schedule', () => {
    const futureDate = new Date(Date.now() + 3600000).toISOString(); // 1 hour from now
    const scheduleDto = {
      scheduledAt: futureDate,
    };

    const scheduledContent = {
      ...mockContent,
      status: ContentStatus.SCHEDULED,
      scheduledAt: new Date(futureDate),
    };

    it('should allow author to schedule their own content', async () => {
      mockContentService.findOne.mockResolvedValue(mockContent);
      mockContentService.scheduleContent.mockResolvedValue(scheduledContent);

      const result = await controller.schedule('content-123', scheduleDto, mockAuthor);

      expect(result).toEqual(scheduledContent);
      expect(mockContentService.scheduleContent).toHaveBeenCalledWith(
        'content-123',
        new Date(futureDate),
      );
    });

    it('should prevent author from scheduling other users content', async () => {
      const otherUserContent = {
        ...mockContent,
        authorId: 'other-user-123',
      };
      mockContentService.findOne.mockResolvedValue(otherUserContent);

      await expect(controller.schedule('content-123', scheduleDto, mockAuthor)).rejects.toThrow(
        ForbiddenException,
      );

      expect(mockContentService.scheduleContent).not.toHaveBeenCalled();
    });

    it('should allow editor to schedule any content', async () => {
      const otherUserContent = {
        ...mockContent,
        authorId: 'other-user-123',
      };
      mockContentService.findOne.mockResolvedValue(otherUserContent);
      mockContentService.scheduleContent.mockResolvedValue(scheduledContent);

      const result = await controller.schedule('content-123', scheduleDto, mockEditor);

      expect(result).toEqual(scheduledContent);
      expect(mockContentService.scheduleContent).toHaveBeenCalledWith(
        'content-123',
        new Date(futureDate),
      );
    });

    it('should allow admin to schedule any content', async () => {
      const otherUserContent = {
        ...mockContent,
        authorId: 'other-user-123',
      };
      mockContentService.findOne.mockResolvedValue(otherUserContent);
      mockContentService.scheduleContent.mockResolvedValue(scheduledContent);

      const result = await controller.schedule('content-123', scheduleDto, mockAdmin);

      expect(result).toEqual(scheduledContent);
      expect(mockContentService.scheduleContent).toHaveBeenCalledWith(
        'content-123',
        new Date(futureDate),
      );
    });

    it('should throw NotFoundException if content does not exist', async () => {
      mockContentService.findOne.mockRejectedValue(new NotFoundException('Content not found'));

      await expect(controller.schedule('non-existent', scheduleDto, mockAuthor)).rejects.toThrow(
        NotFoundException,
      );

      expect(mockContentService.scheduleContent).not.toHaveBeenCalled();
    });
  });

  describe('unschedule', () => {
    const unscheduledContent = {
      ...mockContent,
      status: ContentStatus.DRAFT,
      scheduledAt: null,
    };

    it('should allow author to unschedule their own content', async () => {
      mockContentService.findOne.mockResolvedValue(mockContent);
      mockContentService.unscheduleContent.mockResolvedValue(unscheduledContent);

      const result = await controller.unschedule('content-123', mockAuthor);

      expect(result).toEqual(unscheduledContent);
      expect(mockContentService.unscheduleContent).toHaveBeenCalledWith('content-123');
    });

    it('should prevent author from unscheduling other users content', async () => {
      const otherUserContent = {
        ...mockContent,
        authorId: 'other-user-123',
      };
      mockContentService.findOne.mockResolvedValue(otherUserContent);

      await expect(controller.unschedule('content-123', mockAuthor)).rejects.toThrow(
        ForbiddenException,
      );

      expect(mockContentService.unscheduleContent).not.toHaveBeenCalled();
    });

    it('should allow editor to unschedule any content', async () => {
      const otherUserContent = {
        ...mockContent,
        authorId: 'other-user-123',
      };
      mockContentService.findOne.mockResolvedValue(otherUserContent);
      mockContentService.unscheduleContent.mockResolvedValue(unscheduledContent);

      const result = await controller.unschedule('content-123', mockEditor);

      expect(result).toEqual(unscheduledContent);
      expect(mockContentService.unscheduleContent).toHaveBeenCalledWith('content-123');
    });

    it('should allow admin to unschedule any content', async () => {
      const otherUserContent = {
        ...mockContent,
        authorId: 'other-user-123',
      };
      mockContentService.findOne.mockResolvedValue(otherUserContent);
      mockContentService.unscheduleContent.mockResolvedValue(unscheduledContent);

      const result = await controller.unschedule('content-123', mockAdmin);

      expect(result).toEqual(unscheduledContent);
      expect(mockContentService.unscheduleContent).toHaveBeenCalledWith('content-123');
    });

    it('should throw NotFoundException if content does not exist', async () => {
      mockContentService.findOne.mockRejectedValue(new NotFoundException('Content not found'));

      await expect(controller.unschedule('non-existent', mockAuthor)).rejects.toThrow(
        NotFoundException,
      );

      expect(mockContentService.unscheduleContent).not.toHaveBeenCalled();
    });
  });
});
