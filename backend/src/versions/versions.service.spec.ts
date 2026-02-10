import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ContentStatus, UserRole } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

import { VersionsService } from './versions.service';

describe('VersionsService', () => {
  let service: VersionsService;
  let prisma: PrismaService;

  const mockPrismaService = {
    content: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    contentVersion: {
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      aggregate: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    role: UserRole.AUTHOR,
  };

  const mockContent = {
    id: 'content-1',
    title: 'Test Content',
    slug: 'test-content',
    body: 'Test body',
    status: ContentStatus.PUBLISHED,
    authorId: 'user-1',
    featuredImageId: null,
    publishedAt: new Date(),
    scheduledAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    excerpt: null,
  };

  const mockVersion = {
    id: 'version-1',
    contentId: 'content-1',
    title: 'Test Content',
    body: 'Test body',
    versionNumber: 1,
    changeDescription: 'Initial creation',
    createdById: 'user-1',
    createdAt: new Date(),
    createdBy: mockUser,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VersionsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<VersionsService>(VersionsService);
    prisma = module.get<PrismaService>(PrismaService);

    // Reset mocks
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAllForContent', () => {
    it('should return paginated versions for content', async () => {
      const versions = [mockVersion];
      mockPrismaService.content.findUnique.mockResolvedValue(mockContent);
      mockPrismaService.contentVersion.findMany.mockResolvedValue(versions);
      mockPrismaService.contentVersion.count.mockResolvedValue(1);

      const result = await service.findAllForContent('content-1', 1, 10);

      expect(result.data).toEqual(versions);
      expect(result.meta.total).toBe(1);
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(10);
      expect(mockPrismaService.contentVersion.findMany).toHaveBeenCalledWith({
        where: { contentId: 'content-1' },
        skip: 0,
        take: 10,
        orderBy: { versionNumber: 'desc' },
        include: {
          createdBy: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              role: true,
            },
          },
        },
      });
    });

    it('should throw NotFoundException if content does not exist', async () => {
      mockPrismaService.content.findUnique.mockResolvedValue(null);

      await expect(service.findAllForContent('nonexistent', 1, 10)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should handle pagination correctly', async () => {
      mockPrismaService.content.findUnique.mockResolvedValue(mockContent);
      mockPrismaService.contentVersion.findMany.mockResolvedValue([]);
      mockPrismaService.contentVersion.count.mockResolvedValue(0);

      await service.findAllForContent('content-1', 2, 5);

      expect(mockPrismaService.contentVersion.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 5,
          take: 5,
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should return single version by ID', async () => {
      const versionWithContent = {
        ...mockVersion,
        content: {
          id: 'content-1',
          title: 'Test Content',
          slug: 'test-content',
          status: ContentStatus.PUBLISHED,
        },
      };
      mockPrismaService.contentVersion.findUnique.mockResolvedValue(versionWithContent);

      const result = await service.findOne('version-1');

      expect(result).toEqual(versionWithContent);
      expect(mockPrismaService.contentVersion.findUnique).toHaveBeenCalledWith({
        where: { id: 'version-1' },
        include: {
          createdBy: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              role: true,
            },
          },
          content: {
            select: {
              id: true,
              title: true,
              slug: true,
              status: true,
            },
          },
        },
      });
    });

    it('should throw NotFoundException if version does not exist', async () => {
      mockPrismaService.contentVersion.findUnique.mockResolvedValue(null);

      await expect(service.findOne('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('compareVersions', () => {
    it('should return both versions for comparison', async () => {
      const version1 = { ...mockVersion, versionNumber: 1 };
      const version2 = { ...mockVersion, versionNumber: 2, id: 'version-2' };

      mockPrismaService.content.findUnique.mockResolvedValue(mockContent);
      mockPrismaService.contentVersion.findUnique
        .mockResolvedValueOnce(version1)
        .mockResolvedValueOnce(version2);

      const result = await service.compareVersions('content-1', 1, 2);

      expect(result.version1).toEqual(version1);
      expect(result.version2).toEqual(version2);
    });

    it('should throw NotFoundException if content does not exist', async () => {
      mockPrismaService.content.findUnique.mockResolvedValue(null);

      await expect(service.compareVersions('nonexistent', 1, 2)).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if version1 does not exist', async () => {
      mockPrismaService.content.findUnique.mockResolvedValue(mockContent);
      mockPrismaService.contentVersion.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(mockVersion);

      await expect(service.compareVersions('content-1', 1, 2)).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if version2 does not exist', async () => {
      mockPrismaService.content.findUnique.mockResolvedValue(mockContent);
      mockPrismaService.contentVersion.findUnique
        .mockResolvedValueOnce(mockVersion)
        .mockResolvedValueOnce(null);

      await expect(service.compareVersions('content-1', 1, 2)).rejects.toThrow(NotFoundException);
    });
  });

  describe('rollback', () => {
    it('should rollback content to target version', async () => {
      const targetVersion = {
        ...mockVersion,
        versionNumber: 1,
        title: 'Old Title',
        body: 'Old Body',
      };
      const currentVersion = {
        ...mockVersion,
        versionNumber: 2,
        title: 'New Title',
        body: 'New Body',
      };
      const contentWithVersions = {
        ...mockContent,
        versions: [currentVersion],
      };
      const newVersion = {
        ...mockVersion,
        versionNumber: 3,
        title: 'Old Title',
        body: 'Old Body',
        changeDescription: 'Rolled back to version 1',
      };
      const updatedContent = {
        ...mockContent,
        title: 'Old Title',
        body: 'Old Body',
        versions: [newVersion],
        author: mockUser,
        categories: [],
        tags: [],
        featuredImage: null,
      };

      mockPrismaService.content.findUnique.mockResolvedValue(contentWithVersions);
      mockPrismaService.contentVersion.findUnique.mockResolvedValue(targetVersion);
      mockPrismaService.$transaction.mockImplementation((callback) =>
        callback({
          contentVersion: {
            aggregate: jest.fn().mockResolvedValue({ _max: { versionNumber: 2 } }),
            create: jest.fn().mockResolvedValue(newVersion),
          },
          content: {
            update: jest.fn().mockResolvedValue(updatedContent),
          },
        }),
      );

      const result = await service.rollback('content-1', 1, 'user-1');

      expect(result.title).toBe('Old Title');
      expect(result.body).toBe('Old Body');
    });

    it('should throw NotFoundException if content does not exist', async () => {
      mockPrismaService.content.findUnique.mockResolvedValue(null);

      await expect(service.rollback('nonexistent', 1, 'user-1')).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if target version does not exist', async () => {
      mockPrismaService.content.findUnique.mockResolvedValue({
        ...mockContent,
        versions: [mockVersion],
      });
      mockPrismaService.contentVersion.findUnique.mockResolvedValue(null);

      await expect(service.rollback('content-1', 99, 'user-1')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if trying to rollback to current version', async () => {
      const currentVersion = { ...mockVersion, versionNumber: 1 };
      mockPrismaService.content.findUnique.mockResolvedValue({
        ...mockContent,
        versions: [currentVersion],
      });
      mockPrismaService.contentVersion.findUnique.mockResolvedValue(currentVersion);

      await expect(service.rollback('content-1', 1, 'user-1')).rejects.toThrow(BadRequestException);
    });

    it('should create new version with incremented version number', async () => {
      const targetVersion = { ...mockVersion, versionNumber: 1 };
      const currentVersion = { ...mockVersion, versionNumber: 3 };
      const contentWithVersions = {
        ...mockContent,
        versions: [currentVersion],
      };

      mockPrismaService.content.findUnique.mockResolvedValue(contentWithVersions);
      mockPrismaService.contentVersion.findUnique.mockResolvedValue(targetVersion);

      const mockTxClient = {
        contentVersion: {
          aggregate: jest.fn().mockResolvedValue({ _max: { versionNumber: 3 } }),
          create: jest.fn().mockResolvedValue({
            ...targetVersion,
            versionNumber: 4,
            changeDescription: 'Rolled back to version 1',
          }),
        },
        content: {
          update: jest.fn().mockResolvedValue({
            ...mockContent,
            versions: [],
            author: mockUser,
            categories: [],
            tags: [],
            featuredImage: null,
          }),
        },
      };

      mockPrismaService.$transaction.mockImplementation((callback) => callback(mockTxClient));

      await service.rollback('content-1', 1, 'user-1');

      expect(mockTxClient.contentVersion.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            versionNumber: 4,
            changeDescription: 'Rolled back to version 1',
          }),
        }),
      );
    });
  });
});
