import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ContentStatus, UserRole } from '@prisma/client';

import { CurrentUserType } from '../auth/decorators/current-user.decorator';
import { ContentService } from '../content/content.service';

import { VersionsController } from './versions.controller';
import { VersionsService } from './versions.service';

describe('VersionsController', () => {
  let controller: VersionsController;
  let versionsService: VersionsService;
  let contentService: ContentService;

  const mockVersionsService = {
    findAllForContent: jest.fn(),
    findOne: jest.fn(),
    compareVersions: jest.fn(),
    rollback: jest.fn(),
  };

  const mockContentService = {
    findOne: jest.fn(),
  };

  const mockAuthorUser: CurrentUserType = {
    id: 'user-1',
    email: 'author@example.com',
    firstName: 'John',
    lastName: 'Doe',
    role: UserRole.AUTHOR,
  };

  const mockEditorUser: CurrentUserType = {
    id: 'user-2',
    email: 'editor@example.com',
    firstName: 'Jane',
    lastName: 'Smith',
    role: UserRole.EDITOR,
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
    author: {
      id: 'user-1',
      email: 'author@example.com',
      firstName: 'John',
      lastName: 'Doe',
      role: UserRole.AUTHOR,
    },
    categories: [],
    tags: [],
    featuredImage: null,
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
    createdBy: {
      id: 'user-1',
      email: 'author@example.com',
      firstName: 'John',
      lastName: 'Doe',
      role: UserRole.AUTHOR,
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [VersionsController],
      providers: [
        {
          provide: VersionsService,
          useValue: mockVersionsService,
        },
        {
          provide: ContentService,
          useValue: mockContentService,
        },
      ],
    }).compile();

    controller = module.get<VersionsController>(VersionsController);
    versionsService = module.get<VersionsService>(VersionsService);
    contentService = module.get<ContentService>(ContentService);

    // Reset mocks
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return paginated versions for content', async () => {
      const paginatedResult = {
        data: [mockVersion],
        meta: {
          total: 1,
          page: 1,
          limit: 10,
          totalPages: 1,
        },
      };
      mockVersionsService.findAllForContent.mockResolvedValue(paginatedResult);

      const result = await controller.findAll('content-1', {
        page: 1,
        limit: 10,
      });

      expect(result).toEqual(paginatedResult);
      expect(mockVersionsService.findAllForContent).toHaveBeenCalledWith('content-1', 1, 10);
    });

    it('should handle pagination parameters', async () => {
      const paginatedResult = {
        data: [],
        meta: {
          total: 0,
          page: 2,
          limit: 5,
          totalPages: 0,
        },
      };
      mockVersionsService.findAllForContent.mockResolvedValue(paginatedResult);

      await controller.findAll('content-1', { page: 2, limit: 5 });

      expect(mockVersionsService.findAllForContent).toHaveBeenCalledWith('content-1', 2, 5);
    });
  });

  describe('findOne', () => {
    it('should return single version by ID', async () => {
      mockVersionsService.findOne.mockResolvedValue(mockVersion);

      const result = await controller.findOne('content-1', 'version-1');

      expect(result).toEqual(mockVersion);
      expect(mockVersionsService.findOne).toHaveBeenCalledWith('version-1');
    });

    it('should throw NotFoundException if version does not belong to content', async () => {
      const wrongVersion = { ...mockVersion, contentId: 'other-content' };
      mockVersionsService.findOne.mockResolvedValue(wrongVersion);

      await expect(controller.findOne('content-1', 'version-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('compareVersions', () => {
    it('should return both versions for comparison', async () => {
      const comparison = {
        version1: { ...mockVersion, versionNumber: 1 },
        version2: { ...mockVersion, versionNumber: 2, id: 'version-2' },
      };
      mockVersionsService.compareVersions.mockResolvedValue(comparison);

      const result = await controller.compareVersions('content-1', {
        v1: 1,
        v2: 2,
      });

      expect(result).toEqual(comparison);
      expect(mockVersionsService.compareVersions).toHaveBeenCalledWith('content-1', 1, 2);
    });
  });

  describe('rollback', () => {
    it('should allow editor to rollback any content', async () => {
      const updatedContent = { ...mockContent };
      mockVersionsService.rollback.mockResolvedValue(updatedContent);
      mockContentService.findOne.mockResolvedValue(mockContent);

      const result = await controller.rollback('content-1', '1', mockEditorUser);

      expect(result).toEqual(updatedContent);
      expect(mockVersionsService.rollback).toHaveBeenCalledWith('content-1', 1, 'user-2');
    });

    it('should allow author to rollback their own content', async () => {
      const updatedContent = { ...mockContent };
      mockVersionsService.rollback.mockResolvedValue(updatedContent);
      mockContentService.findOne.mockResolvedValue(mockContent);

      const result = await controller.rollback('content-1', '1', mockAuthorUser);

      expect(result).toEqual(updatedContent);
      expect(mockContentService.findOne).toHaveBeenCalledWith('content-1');
    });

    it('should throw ForbiddenException if author tries to rollback others content', async () => {
      const otherContent = { ...mockContent, authorId: 'other-user' };
      mockContentService.findOne.mockResolvedValue(otherContent);

      await expect(controller.rollback('content-1', '1', mockAuthorUser)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw NotFoundException for invalid version number', async () => {
      await expect(controller.rollback('content-1', 'invalid', mockAuthorUser)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException for negative version number', async () => {
      await expect(controller.rollback('content-1', '0', mockAuthorUser)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should not check ownership for editor role', async () => {
      const updatedContent = { ...mockContent };
      mockVersionsService.rollback.mockResolvedValue(updatedContent);

      await controller.rollback('content-1', '1', mockEditorUser);

      expect(mockContentService.findOne).not.toHaveBeenCalled();
    });

    it('should allow admin to rollback any content', async () => {
      const adminUser: CurrentUserType = {
        ...mockAuthorUser,
        role: UserRole.ADMIN,
      };
      const updatedContent = { ...mockContent };
      mockVersionsService.rollback.mockResolvedValue(updatedContent);

      await controller.rollback('content-1', '1', adminUser);

      expect(mockContentService.findOne).not.toHaveBeenCalled();
    });

    it('should propagate NotFoundException from service', async () => {
      mockContentService.findOne.mockResolvedValue(mockContent);
      mockVersionsService.rollback.mockRejectedValue(new NotFoundException('Version not found'));

      await expect(controller.rollback('content-1', '1', mockAuthorUser)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should handle content not found during ownership check', async () => {
      mockContentService.findOne.mockRejectedValue(new NotFoundException('Content not found'));

      await expect(controller.rollback('content-1', '1', mockAuthorUser)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should convert other errors during ownership check to ForbiddenException', async () => {
      mockContentService.findOne.mockRejectedValue(new Error('Database error'));

      await expect(controller.rollback('content-1', '1', mockAuthorUser)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
});
