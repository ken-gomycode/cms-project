import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ContentStatus } from '@prisma/client';

import { CacheService } from '../cache/cache.service';
import { PrismaService } from '../prisma/prisma.service';
import { ContentService } from './content.service';
import { CreateContentDto } from './dto/create-content.dto';
import { UpdateContentDto } from './dto/update-content.dto';

describe('ContentService', () => {
  let service: ContentService;
  let prisma: PrismaService;

  const mockPrismaService = {
    content: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    contentVersion: {
      create: jest.fn(),
    },
    contentCategory: {
      createMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    contentTag: {
      createMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    category: {
      findMany: jest.fn(),
    },
    tag: {
      findMany: jest.fn(),
    },
    media: {
      findUnique: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockCacheService = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    reset: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContentService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: CacheService,
          useValue: mockCacheService,
        },
      ],
    }).compile();

    service = module.get<ContentService>(ContentService);
    prisma = module.get<PrismaService>(PrismaService);

    // Reset all mocks
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const authorId = 'user-123';
    const createDto: CreateContentDto = {
      title: 'Test Article',
      body: 'Test content body',
      excerpt: 'Test excerpt',
      status: ContentStatus.DRAFT,
      categoryIds: ['cat-1', 'cat-2'],
      tagIds: ['tag-1', 'tag-2'],
      featuredImageId: 'img-1',
    };

    const mockContent = {
      id: 'content-123',
      title: createDto.title,
      slug: 'test-article',
      body: createDto.body,
      excerpt: createDto.excerpt,
      status: createDto.status,
      authorId,
      featuredImageId: createDto.featuredImageId,
      publishedAt: null,
      scheduledAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      author: {
        id: authorId,
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        role: 'AUTHOR',
      },
      categories: [{ category: { id: 'cat-1', name: 'Category 1', slug: 'category-1' } }],
      tags: [{ tag: { id: 'tag-1', name: 'Tag 1', slug: 'tag-1' } }],
      featuredImage: {
        id: 'img-1',
        filename: 'test.jpg',
        url: '/uploads/test.jpg',
        thumbnailUrl: '/uploads/test-thumb.jpg',
        altText: 'Test image',
      },
    };

    it('should create content with unique slug', async () => {
      mockPrismaService.media.findUnique.mockResolvedValue({ id: 'img-1' });
      mockPrismaService.category.findMany.mockResolvedValue([{ id: 'cat-1' }, { id: 'cat-2' }]);
      mockPrismaService.tag.findMany.mockResolvedValue([{ id: 'tag-1' }, { id: 'tag-2' }]);

      // Mock transaction
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        const mockTx = {
          content: {
            create: jest.fn().mockResolvedValue({
              id: 'content-123',
              slug: 'test-article',
              ...createDto,
              authorId,
            }),
            findUnique: jest.fn().mockResolvedValue(mockContent),
          },
          contentVersion: {
            create: jest.fn().mockResolvedValue({}),
          },
          contentCategory: {
            createMany: jest.fn().mockResolvedValue({}),
          },
          contentTag: {
            createMany: jest.fn().mockResolvedValue({}),
          },
        };
        return callback(mockTx);
      });

      const result = await service.create(createDto, authorId);

      expect(result).toEqual(mockContent);
      expect(mockPrismaService.$transaction).toHaveBeenCalled();
    });

    it('should generate unique slug with suffix if slug exists', async () => {
      mockPrismaService.media.findUnique.mockResolvedValue({ id: 'img-1' });
      mockPrismaService.category.findMany.mockResolvedValue([{ id: 'cat-1' }, { id: 'cat-2' }]);
      mockPrismaService.tag.findMany.mockResolvedValue([{ id: 'tag-1' }, { id: 'tag-2' }]);

      // Mock slug existence check
      mockPrismaService.content.findUnique
        .mockResolvedValueOnce({ id: 'existing', slug: 'test-article' })
        .mockResolvedValueOnce(null);

      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        const mockTx = {
          content: {
            create: jest.fn().mockResolvedValue({
              id: 'content-123',
              slug: 'test-article-1',
              ...createDto,
              authorId,
            }),
            findUnique: jest.fn().mockResolvedValue({
              ...mockContent,
              slug: 'test-article-1',
            }),
          },
          contentVersion: {
            create: jest.fn().mockResolvedValue({}),
          },
          contentCategory: {
            createMany: jest.fn().mockResolvedValue({}),
          },
          contentTag: {
            createMany: jest.fn().mockResolvedValue({}),
          },
        };
        return callback(mockTx);
      });

      const result = await service.create(createDto, authorId);

      expect(result.slug).toBe('test-article-1');
    });

    it('should set publishedAt when status is PUBLISHED', async () => {
      const publishDto = { ...createDto, status: ContentStatus.PUBLISHED };

      mockPrismaService.media.findUnique.mockResolvedValue({ id: 'img-1' });
      mockPrismaService.category.findMany.mockResolvedValue([{ id: 'cat-1' }, { id: 'cat-2' }]);
      mockPrismaService.tag.findMany.mockResolvedValue([{ id: 'tag-1' }, { id: 'tag-2' }]);

      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        const mockTx = {
          content: {
            create: jest.fn().mockResolvedValue({
              id: 'content-123',
              ...publishDto,
              publishedAt: new Date(),
            }),
            findUnique: jest.fn().mockResolvedValue({
              ...mockContent,
              status: ContentStatus.PUBLISHED,
              publishedAt: new Date(),
            }),
          },
          contentVersion: {
            create: jest.fn().mockResolvedValue({}),
          },
          contentCategory: {
            createMany: jest.fn().mockResolvedValue({}),
          },
          contentTag: {
            createMany: jest.fn().mockResolvedValue({}),
          },
        };
        return callback(mockTx);
      });

      const result = await service.create(publishDto, authorId);

      expect(result.publishedAt).toBeDefined();
    });

    it('should throw NotFoundException if featured image does not exist', async () => {
      mockPrismaService.media.findUnique.mockResolvedValue(null);

      await expect(service.create(createDto, authorId)).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if categories do not exist', async () => {
      mockPrismaService.media.findUnique.mockResolvedValue({ id: 'img-1' });
      mockPrismaService.category.findMany.mockResolvedValue([{ id: 'cat-1' }]); // Only 1 instead of 2

      await expect(service.create(createDto, authorId)).rejects.toThrow(NotFoundException);
    });

    it('should create content version with "Initial creation" message', async () => {
      mockPrismaService.media.findUnique.mockResolvedValue({ id: 'img-1' });
      mockPrismaService.category.findMany.mockResolvedValue([{ id: 'cat-1' }, { id: 'cat-2' }]);
      mockPrismaService.tag.findMany.mockResolvedValue([{ id: 'tag-1' }, { id: 'tag-2' }]);

      const mockVersionCreate = jest.fn().mockResolvedValue({});

      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        const mockTx = {
          content: {
            create: jest.fn().mockResolvedValue({
              id: 'content-123',
              ...createDto,
            }),
            findUnique: jest.fn().mockResolvedValue(mockContent),
          },
          contentVersion: {
            create: mockVersionCreate,
          },
          contentCategory: {
            createMany: jest.fn().mockResolvedValue({}),
          },
          contentTag: {
            createMany: jest.fn().mockResolvedValue({}),
          },
        };
        return callback(mockTx);
      });

      await service.create(createDto, authorId);

      expect(mockVersionCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          versionNumber: 1,
          changeDescription: 'Initial creation',
          createdById: authorId,
        }),
      });
    });
  });

  describe('findAll', () => {
    const mockContents = [
      {
        id: 'content-1',
        title: 'Test 1',
        slug: 'test-1',
        body: 'Body 1',
        status: ContentStatus.PUBLISHED,
        author: {
          id: 'user-1',
          email: 'test@example.com',
          firstName: 'Test',
          lastName: 'User',
          role: 'AUTHOR',
        },
        categories: [],
        tags: [],
        featuredImage: null,
      },
    ];

    it('should return paginated content', async () => {
      mockPrismaService.content.findMany.mockResolvedValue(mockContents);
      mockPrismaService.content.count.mockResolvedValue(1);

      const result = await service.findAll({ page: 1, limit: 10 });

      expect(result.data).toEqual(mockContents);
      expect(result.meta.total).toBe(1);
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(10);
    });

    it('should filter by status', async () => {
      mockPrismaService.content.findMany.mockResolvedValue(mockContents);
      mockPrismaService.content.count.mockResolvedValue(1);

      await service.findAll({
        page: 1,
        limit: 10,
        status: ContentStatus.PUBLISHED,
      });

      expect(mockPrismaService.content.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: ContentStatus.PUBLISHED,
          }),
        }),
      );
    });

    it('should filter by authorId', async () => {
      mockPrismaService.content.findMany.mockResolvedValue(mockContents);
      mockPrismaService.content.count.mockResolvedValue(1);

      await service.findAll({
        page: 1,
        limit: 10,
        authorId: 'user-123',
      });

      expect(mockPrismaService.content.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            authorId: 'user-123',
          }),
        }),
      );
    });

    it('should filter by categoryId', async () => {
      mockPrismaService.content.findMany.mockResolvedValue(mockContents);
      mockPrismaService.content.count.mockResolvedValue(1);

      await service.findAll({
        page: 1,
        limit: 10,
        categoryId: 'cat-123',
      });

      expect(mockPrismaService.content.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            categories: {
              some: {
                categoryId: 'cat-123',
              },
            },
          }),
        }),
      );
    });

    it('should filter by tagId', async () => {
      mockPrismaService.content.findMany.mockResolvedValue(mockContents);
      mockPrismaService.content.count.mockResolvedValue(1);

      await service.findAll({
        page: 1,
        limit: 10,
        tagId: 'tag-123',
      });

      expect(mockPrismaService.content.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tags: {
              some: {
                tagId: 'tag-123',
              },
            },
          }),
        }),
      );
    });

    it('should filter by search term', async () => {
      mockPrismaService.content.findMany.mockResolvedValue(mockContents);
      mockPrismaService.content.count.mockResolvedValue(1);

      await service.findAll({
        page: 1,
        limit: 10,
        search: 'test query',
      });

      expect(mockPrismaService.content.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { title: { contains: 'test query', mode: 'insensitive' } },
              { body: { contains: 'test query', mode: 'insensitive' } },
            ],
          }),
        }),
      );
    });
  });

  describe('findOne', () => {
    const mockContent = {
      id: 'content-123',
      title: 'Test',
      slug: 'test',
      body: 'Body',
      author: {
        id: 'user-1',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        role: 'AUTHOR',
      },
      categories: [],
      tags: [],
      featuredImage: null,
    };

    it('should return content by id', async () => {
      mockPrismaService.content.findUnique.mockResolvedValue(mockContent);

      const result = await service.findOne('content-123');

      expect(result).toEqual(mockContent);
      expect(mockPrismaService.content.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'content-123' },
        }),
      );
    });

    it('should throw NotFoundException if content not found', async () => {
      mockPrismaService.content.findUnique.mockResolvedValue(null);

      await expect(service.findOne('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findBySlug', () => {
    const mockContent = {
      id: 'content-123',
      title: 'Test',
      slug: 'test',
      body: 'Body',
      status: ContentStatus.PUBLISHED,
      author: {
        id: 'user-1',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        role: 'AUTHOR',
      },
      categories: [],
      tags: [],
      featuredImage: null,
    };

    it('should return PUBLISHED content by slug', async () => {
      mockPrismaService.content.findUnique.mockResolvedValue(mockContent);

      const result = await service.findBySlug('test');

      expect(result).toEqual(mockContent);
    });

    it('should throw NotFoundException if content not found', async () => {
      mockPrismaService.content.findUnique.mockResolvedValue(null);

      await expect(service.findBySlug('non-existent')).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if content is not PUBLISHED', async () => {
      mockPrismaService.content.findUnique.mockResolvedValue({
        ...mockContent,
        status: ContentStatus.DRAFT,
      });

      await expect(service.findBySlug('test')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    const existingContent = {
      id: 'content-123',
      title: 'Original Title',
      slug: 'original-title',
      body: 'Original body',
      status: ContentStatus.DRAFT,
      authorId: 'user-123',
      versions: [
        {
          id: 'version-1',
          versionNumber: 1,
          title: 'Original Title',
          body: 'Original body',
        },
      ],
    };

    const updateDto: UpdateContentDto = {
      title: 'Updated Title',
      body: 'Updated body',
    };

    it('should update content and create new version', async () => {
      mockPrismaService.content.findUnique.mockResolvedValue(existingContent);

      const updatedContent = {
        ...existingContent,
        ...updateDto,
        slug: 'updated-title',
      };

      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        const mockTx = {
          content: {
            update: jest.fn().mockResolvedValue(updatedContent),
            findUnique: jest.fn().mockResolvedValue({
              ...updatedContent,
              author: {
                id: 'user-123',
                email: 'test@example.com',
                firstName: 'Test',
                lastName: 'User',
                role: 'AUTHOR',
              },
              categories: [],
              tags: [],
              featuredImage: null,
            }),
          },
          contentVersion: {
            create: jest.fn().mockResolvedValue({}),
          },
          contentCategory: {
            deleteMany: jest.fn().mockResolvedValue({}),
            createMany: jest.fn().mockResolvedValue({}),
          },
          contentTag: {
            deleteMany: jest.fn().mockResolvedValue({}),
            createMany: jest.fn().mockResolvedValue({}),
          },
        };
        return callback(mockTx);
      });

      const result = await service.update('content-123', updateDto, 'user-123');

      expect(result.title).toBe(updateDto.title);
      expect(mockPrismaService.$transaction).toHaveBeenCalled();
    });

    it('should regenerate slug if title changes', async () => {
      mockPrismaService.content.findUnique
        .mockResolvedValueOnce(existingContent)
        .mockResolvedValueOnce(null); // No existing content with new slug

      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        const mockTx = {
          content: {
            update: jest.fn().mockResolvedValue({
              ...existingContent,
              title: 'New Title',
              slug: 'new-title',
            }),
            findUnique: jest.fn().mockResolvedValue({
              id: 'content-123',
              title: 'New Title',
              slug: 'new-title',
              author: {},
              categories: [],
              tags: [],
              featuredImage: null,
            }),
          },
          contentVersion: {
            create: jest.fn().mockResolvedValue({}),
          },
          contentCategory: {
            deleteMany: jest.fn().mockResolvedValue({}),
            createMany: jest.fn().mockResolvedValue({}),
          },
          contentTag: {
            deleteMany: jest.fn().mockResolvedValue({}),
            createMany: jest.fn().mockResolvedValue({}),
          },
        };
        return callback(mockTx);
      });

      const result = await service.update('content-123', { title: 'New Title' }, 'user-123');

      expect(result.slug).toBe('new-title');
    });

    it('should set publishedAt when status changes to PUBLISHED', async () => {
      mockPrismaService.content.findUnique.mockResolvedValue(existingContent);

      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        const mockTx = {
          content: {
            update: jest.fn().mockResolvedValue({
              ...existingContent,
              status: ContentStatus.PUBLISHED,
              publishedAt: new Date(),
            }),
            findUnique: jest.fn().mockResolvedValue({
              id: 'content-123',
              status: ContentStatus.PUBLISHED,
              publishedAt: new Date(),
              author: {},
              categories: [],
              tags: [],
              featuredImage: null,
            }),
          },
          contentVersion: {
            create: jest.fn().mockResolvedValue({}),
          },
          contentCategory: {
            deleteMany: jest.fn().mockResolvedValue({}),
            createMany: jest.fn().mockResolvedValue({}),
          },
          contentTag: {
            deleteMany: jest.fn().mockResolvedValue({}),
            createMany: jest.fn().mockResolvedValue({}),
          },
        };
        return callback(mockTx);
      });

      const result = await service.update(
        'content-123',
        { status: ContentStatus.PUBLISHED },
        'user-123',
      );

      expect(result.publishedAt).toBeDefined();
    });

    it('should throw NotFoundException if content does not exist', async () => {
      mockPrismaService.content.findUnique.mockResolvedValue(null);

      await expect(service.update('non-existent', updateDto, 'user-123')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('should soft delete content by setting status to ARCHIVED', async () => {
      mockPrismaService.content.findUnique.mockResolvedValue({
        id: 'content-123',
        status: ContentStatus.PUBLISHED,
      });
      mockPrismaService.content.update.mockResolvedValue({
        id: 'content-123',
        status: ContentStatus.ARCHIVED,
      });

      await service.remove('content-123');

      expect(mockPrismaService.content.update).toHaveBeenCalledWith({
        where: { id: 'content-123' },
        data: { status: ContentStatus.ARCHIVED },
      });
    });

    it('should throw NotFoundException if content does not exist', async () => {
      mockPrismaService.content.findUnique.mockResolvedValue(null);

      await expect(service.remove('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('hardRemove', () => {
    it('should permanently delete content', async () => {
      mockPrismaService.content.findUnique.mockResolvedValue({
        id: 'content-123',
      });
      mockPrismaService.content.delete.mockResolvedValue({});

      await service.hardRemove('content-123');

      expect(mockPrismaService.content.delete).toHaveBeenCalledWith({
        where: { id: 'content-123' },
      });
    });

    it('should throw NotFoundException if content does not exist', async () => {
      mockPrismaService.content.findUnique.mockResolvedValue(null);

      await expect(service.hardRemove('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create with scheduledAt validation', () => {
    const authorId = 'user-123';

    it('should throw BadRequestException if status is SCHEDULED but scheduledAt is missing', async () => {
      const createDto: CreateContentDto = {
        title: 'Scheduled Post',
        body: 'Content',
        status: ContentStatus.SCHEDULED,
      };

      await expect(service.create(createDto, authorId)).rejects.toThrow(BadRequestException);
      await expect(service.create(createDto, authorId)).rejects.toThrow(
        'scheduledAt is required when status is SCHEDULED',
      );
    });

    it('should throw BadRequestException if status is SCHEDULED but scheduledAt is in the past', async () => {
      const pastDate = new Date(Date.now() - 60000).toISOString(); // 1 minute ago
      const createDto: CreateContentDto = {
        title: 'Scheduled Post',
        body: 'Content',
        status: ContentStatus.SCHEDULED,
        scheduledAt: pastDate,
      };

      await expect(service.create(createDto, authorId)).rejects.toThrow(BadRequestException);
      await expect(service.create(createDto, authorId)).rejects.toThrow(
        'scheduledAt must be a future date when status is SCHEDULED',
      );
    });

    it('should create scheduled content with future scheduledAt', async () => {
      const futureDate = new Date(Date.now() + 3600000).toISOString(); // 1 hour from now
      const createDto: CreateContentDto = {
        title: 'Scheduled Post',
        body: 'Content',
        status: ContentStatus.SCHEDULED,
        scheduledAt: futureDate,
      };

      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        const mockTx = {
          content: {
            create: jest.fn().mockResolvedValue({
              id: 'content-123',
              ...createDto,
              slug: 'scheduled-post',
            }),
            findUnique: jest.fn().mockResolvedValue({
              id: 'content-123',
              title: createDto.title,
              status: ContentStatus.SCHEDULED,
              scheduledAt: new Date(futureDate),
              author: {},
              categories: [],
              tags: [],
              featuredImage: null,
            }),
          },
          contentVersion: {
            create: jest.fn().mockResolvedValue({}),
          },
          contentCategory: {
            createMany: jest.fn().mockResolvedValue({}),
          },
          contentTag: {
            createMany: jest.fn().mockResolvedValue({}),
          },
        };
        return callback(mockTx);
      });

      const result = await service.create(createDto, authorId);

      expect(result.status).toBe(ContentStatus.SCHEDULED);
      expect(result.scheduledAt).toBeDefined();
    });
  });

  describe('update with scheduledAt validation', () => {
    const existingContent = {
      id: 'content-123',
      title: 'Original Title',
      slug: 'original-title',
      body: 'Original body',
      status: ContentStatus.DRAFT,
      authorId: 'user-123',
      versions: [],
    };

    it('should throw BadRequestException if updating to SCHEDULED but scheduledAt is missing', async () => {
      mockPrismaService.content.findUnique.mockResolvedValue(existingContent);

      const updateDto: UpdateContentDto = {
        status: ContentStatus.SCHEDULED,
      };

      await expect(service.update('content-123', updateDto, 'user-123')).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.update('content-123', updateDto, 'user-123')).rejects.toThrow(
        'scheduledAt is required when status is SCHEDULED',
      );
    });

    it('should throw BadRequestException if updating to SCHEDULED but scheduledAt is in the past', async () => {
      mockPrismaService.content.findUnique.mockResolvedValue(existingContent);

      const pastDate = new Date(Date.now() - 60000).toISOString();
      const updateDto: UpdateContentDto = {
        status: ContentStatus.SCHEDULED,
        scheduledAt: pastDate,
      };

      await expect(service.update('content-123', updateDto, 'user-123')).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.update('content-123', updateDto, 'user-123')).rejects.toThrow(
        'scheduledAt must be a future date when status is SCHEDULED',
      );
    });

    it('should update to SCHEDULED with future scheduledAt', async () => {
      mockPrismaService.content.findUnique.mockResolvedValue(existingContent);

      const futureDate = new Date(Date.now() + 3600000).toISOString();
      const updateDto: UpdateContentDto = {
        status: ContentStatus.SCHEDULED,
        scheduledAt: futureDate,
      };

      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        const mockTx = {
          content: {
            update: jest.fn().mockResolvedValue({
              ...existingContent,
              status: ContentStatus.SCHEDULED,
              scheduledAt: new Date(futureDate),
            }),
            findUnique: jest.fn().mockResolvedValue({
              id: 'content-123',
              status: ContentStatus.SCHEDULED,
              scheduledAt: new Date(futureDate),
              author: {},
              categories: [],
              tags: [],
              featuredImage: null,
            }),
          },
          contentVersion: {
            create: jest.fn().mockResolvedValue({}),
          },
          contentCategory: {
            deleteMany: jest.fn().mockResolvedValue({}),
            createMany: jest.fn().mockResolvedValue({}),
          },
          contentTag: {
            deleteMany: jest.fn().mockResolvedValue({}),
            createMany: jest.fn().mockResolvedValue({}),
          },
        };
        return callback(mockTx);
      });

      const result = await service.update('content-123', updateDto, 'user-123');

      expect(result.status).toBe(ContentStatus.SCHEDULED);
      expect(result.scheduledAt).toBeDefined();
    });
  });

  describe('scheduleContent', () => {
    const mockContent = {
      id: 'content-123',
      title: 'Test Content',
      status: ContentStatus.DRAFT,
    };

    it('should schedule content with future date', async () => {
      const futureDate = new Date(Date.now() + 3600000); // 1 hour from now

      mockPrismaService.content.findUnique.mockResolvedValue(mockContent);
      mockPrismaService.content.update.mockResolvedValue({
        ...mockContent,
        status: ContentStatus.SCHEDULED,
        scheduledAt: futureDate,
        author: {},
        categories: [],
        tags: [],
        featuredImage: null,
      });

      const result = await service.scheduleContent('content-123', futureDate);

      expect(result.status).toBe(ContentStatus.SCHEDULED);
      expect(mockPrismaService.content.update).toHaveBeenCalledWith({
        where: { id: 'content-123' },
        data: {
          status: ContentStatus.SCHEDULED,
          scheduledAt: futureDate,
        },
        include: expect.any(Object),
      });
    });

    it('should throw NotFoundException if content does not exist', async () => {
      mockPrismaService.content.findUnique.mockResolvedValue(null);

      const futureDate = new Date(Date.now() + 3600000);

      await expect(service.scheduleContent('non-existent', futureDate)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if scheduledAt is in the past', async () => {
      mockPrismaService.content.findUnique.mockResolvedValue(mockContent);

      const pastDate = new Date(Date.now() - 60000); // 1 minute ago

      await expect(service.scheduleContent('content-123', pastDate)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.scheduleContent('content-123', pastDate)).rejects.toThrow(
        'scheduledAt must be a future date',
      );
    });
  });

  describe('unscheduleContent', () => {
    it('should unschedule scheduled content', async () => {
      const scheduledContent = {
        id: 'content-123',
        title: 'Scheduled Content',
        status: ContentStatus.SCHEDULED,
        scheduledAt: new Date(Date.now() + 3600000),
      };

      mockPrismaService.content.findUnique.mockResolvedValue(scheduledContent);
      mockPrismaService.content.update.mockResolvedValue({
        ...scheduledContent,
        status: ContentStatus.DRAFT,
        scheduledAt: null,
        author: {},
        categories: [],
        tags: [],
        featuredImage: null,
      });

      const result = await service.unscheduleContent('content-123');

      expect(result.status).toBe(ContentStatus.DRAFT);
      expect(mockPrismaService.content.update).toHaveBeenCalledWith({
        where: { id: 'content-123' },
        data: {
          status: ContentStatus.DRAFT,
          scheduledAt: null,
        },
        include: expect.any(Object),
      });
    });

    it('should throw NotFoundException if content does not exist', async () => {
      mockPrismaService.content.findUnique.mockResolvedValue(null);

      await expect(service.unscheduleContent('non-existent')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if content is not scheduled', async () => {
      const draftContent = {
        id: 'content-123',
        status: ContentStatus.DRAFT,
      };

      mockPrismaService.content.findUnique.mockResolvedValue(draftContent);

      await expect(service.unscheduleContent('content-123')).rejects.toThrow(BadRequestException);
      await expect(service.unscheduleContent('content-123')).rejects.toThrow(
        'Content is not scheduled and cannot be unscheduled',
      );
    });
  });
});
