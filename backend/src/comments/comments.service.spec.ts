import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { CommentStatus, ContentStatus, UserRole } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { CommentsService } from './comments.service';
import { BatchModerateDto } from './dto/batch-moderate.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { ModerateCommentDto } from './dto/moderate-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';

describe('CommentsService', () => {
  let service: CommentsService;
  let prisma: PrismaService;

  const mockPrismaService = {
    comment: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
    },
    content: {
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommentsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<CommentsService>(CommentsService);
    prisma = module.get<PrismaService>(PrismaService);

    // Reset all mocks before each test to clear queued return values
    jest.resetAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createDto: CreateCommentDto = {
      body: 'Test comment',
      contentId: 'content-id',
      authorName: 'John Doe',
      authorEmail: 'john@example.com',
    };

    const mockContent = {
      id: 'content-id',
      title: 'Test Content',
      status: ContentStatus.PUBLISHED,
    };

    const mockComment = {
      id: 'comment-id',
      body: 'Test comment',
      contentId: 'content-id',
      authorId: null,
      authorName: 'John Doe',
      authorEmail: 'john@example.com',
      status: CommentStatus.PENDING,
      createdAt: new Date(),
      updatedAt: new Date(),
      content: {
        id: 'content-id',
        title: 'Test Content',
        slug: 'test-content',
      },
    };

    it('should create a guest comment with authorName and authorEmail', async () => {
      mockPrismaService.content.findUnique.mockResolvedValue(mockContent);
      mockPrismaService.comment.create.mockResolvedValue(mockComment);

      const result = await service.create(createDto);

      expect(result).toEqual(mockComment);
      expect(prisma.content.findUnique).toHaveBeenCalledWith({
        where: { id: createDto.contentId },
      });
      expect(prisma.comment.create).toHaveBeenCalledWith({
        data: {
          body: createDto.body,
          contentId: createDto.contentId,
          parentId: undefined,
          authorId: null,
          authorName: createDto.authorName,
          authorEmail: createDto.authorEmail,
          status: CommentStatus.PENDING,
        },
        include: expect.any(Object),
      });
    });

    it('should create an authenticated user comment', async () => {
      const authenticatedComment = {
        ...mockComment,
        authorId: 'user-id',
        authorName: null,
        authorEmail: null,
        author: {
          id: 'user-id',
          email: 'user@example.com',
          firstName: 'Jane',
          lastName: 'Smith',
        },
      };

      mockPrismaService.content.findUnique.mockResolvedValue(mockContent);
      mockPrismaService.comment.create.mockResolvedValue(authenticatedComment);

      const result = await service.create(createDto, 'user-id');

      expect(result).toEqual(authenticatedComment);
      expect(prisma.comment.create).toHaveBeenCalledWith({
        data: {
          body: createDto.body,
          contentId: createDto.contentId,
          parentId: undefined,
          authorId: 'user-id',
          authorName: null,
          authorEmail: null,
          status: CommentStatus.PENDING,
        },
        include: expect.any(Object),
      });
    });

    it('should throw BadRequestException if guest comment missing authorName', async () => {
      const invalidDto = { ...createDto, authorName: undefined };

      await expect(service.create(invalidDto)).rejects.toThrow(BadRequestException);
      await expect(service.create(invalidDto)).rejects.toThrow(
        'Guest comments require authorName and authorEmail',
      );
    });

    it('should throw BadRequestException if guest comment missing authorEmail', async () => {
      const invalidDto = { ...createDto, authorEmail: undefined };

      await expect(service.create(invalidDto)).rejects.toThrow(BadRequestException);
      await expect(service.create(invalidDto)).rejects.toThrow(
        'Guest comments require authorName and authorEmail',
      );
    });

    it('should throw NotFoundException if content not found', async () => {
      mockPrismaService.content.findUnique.mockResolvedValue(null);

      await expect(service.create(createDto)).rejects.toThrow(NotFoundException);
      await expect(service.create(createDto)).rejects.toThrow(
        `Content with ID ${createDto.contentId} not found`,
      );
    });

    it('should throw BadRequestException if content is not PUBLISHED', async () => {
      const draftContent = { ...mockContent, status: ContentStatus.DRAFT };
      mockPrismaService.content.findUnique.mockResolvedValue(draftContent);

      await expect(service.create(createDto)).rejects.toThrow(BadRequestException);
      await expect(service.create(createDto)).rejects.toThrow(
        'Comments can only be added to published content',
      );
    });

    it('should validate parent comment exists', async () => {
      const dtoWithParent = { ...createDto, parentId: 'parent-id' };
      const mockParent = {
        id: 'parent-id',
        contentId: 'content-id',
      };

      mockPrismaService.content.findUnique.mockResolvedValue(mockContent);
      mockPrismaService.comment.findUnique.mockResolvedValue(mockParent);
      mockPrismaService.comment.create.mockResolvedValue(mockComment);

      await service.create(dtoWithParent);

      expect(prisma.comment.findUnique).toHaveBeenCalledWith({
        where: { id: dtoWithParent.parentId },
      });
    });

    it('should throw NotFoundException if parent comment not found', async () => {
      const dtoWithParent = { ...createDto, parentId: 'invalid-parent' };

      mockPrismaService.content.findUnique.mockResolvedValue(mockContent);
      mockPrismaService.comment.findUnique.mockResolvedValue(null);

      await expect(service.create(dtoWithParent)).rejects.toThrow(NotFoundException);
      await expect(service.create(dtoWithParent)).rejects.toThrow(
        `Parent comment with ID ${dtoWithParent.parentId} not found`,
      );
    });

    it('should throw BadRequestException if parent belongs to different content', async () => {
      const dtoWithParent = { ...createDto, parentId: 'parent-id' };
      const invalidParent = {
        id: 'parent-id',
        contentId: 'different-content-id',
      };

      mockPrismaService.content.findUnique.mockResolvedValue(mockContent);
      mockPrismaService.comment.findUnique.mockResolvedValue(invalidParent);

      await expect(service.create(dtoWithParent)).rejects.toThrow(BadRequestException);
      await expect(service.create(dtoWithParent)).rejects.toThrow(
        'Parent comment must belong to the same content',
      );
    });
  });

  describe('findAllForContent', () => {
    const contentId = 'content-id';
    const mockTopLevelComments = [
      {
        id: 'comment-1',
        body: 'Comment 1',
        contentId,
        parentId: null,
        status: CommentStatus.APPROVED,
        createdAt: new Date(),
        author: null,
        content: {
          id: contentId,
          title: 'Test',
          slug: 'test',
        },
      },
    ];

    it('should return paginated top-level comments for public users', async () => {
      mockPrismaService.comment.findMany
        .mockResolvedValueOnce(mockTopLevelComments)
        .mockResolvedValueOnce([]); // No children
      mockPrismaService.comment.count.mockResolvedValue(1);

      const result = await service.findAllForContent(contentId, {
        page: 1,
        limit: 10,
      });

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(10);

      // Should filter by APPROVED status for public
      expect(prisma.comment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: CommentStatus.APPROVED,
          }),
        }),
      );
    });

    it('should return all comments for Editor role', async () => {
      mockPrismaService.comment.findMany
        .mockResolvedValueOnce(mockTopLevelComments)
        .mockResolvedValueOnce([]);
      mockPrismaService.comment.count.mockResolvedValue(1);

      await service.findAllForContent(contentId, { page: 1, limit: 10 }, UserRole.EDITOR);

      // Should not filter by status for Editor
      expect(prisma.comment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.not.objectContaining({
            status: expect.anything(),
          }),
        }),
      );
    });

    it('should return nested comments (tree structure)', async () => {
      const mockChildren = [
        {
          id: 'comment-2',
          body: 'Reply',
          contentId,
          parentId: 'comment-1',
          status: CommentStatus.APPROVED,
          createdAt: new Date(),
          author: null,
          content: {
            id: contentId,
            title: 'Test',
            slug: 'test',
          },
        },
      ];

      mockPrismaService.comment.findMany
        .mockResolvedValueOnce(mockTopLevelComments)
        .mockResolvedValueOnce(mockChildren)
        .mockResolvedValueOnce([]); // No grandchildren
      mockPrismaService.comment.count.mockResolvedValue(1);

      const result = await service.findAllForContent(contentId, {
        page: 1,
        limit: 10,
      });

      expect(result.data[0].children).toHaveLength(1);
      expect(result.data[0].children?.[0].id).toBe('comment-2');
    });

    it('should use default pagination values', async () => {
      mockPrismaService.comment.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
      mockPrismaService.comment.count.mockResolvedValue(0);

      const result = await service.findAllForContent(contentId);

      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(10);
    });
  });

  describe('findAllPending', () => {
    const mockPendingComments = [
      {
        id: 'comment-1',
        body: 'Pending comment',
        status: CommentStatus.PENDING,
        author: null,
        content: {
          id: 'content-id',
          title: 'Test',
          slug: 'test',
        },
      },
    ];

    it('should return paginated pending comments', async () => {
      // Use Promise.all since service calls both in parallel
      mockPrismaService.comment.findMany.mockResolvedValue(mockPendingComments);
      mockPrismaService.comment.count.mockResolvedValue(1);

      const result = await service.findAllPending({ page: 1, limit: 10 });

      expect(result.data).toEqual(mockPendingComments);
      expect(result.meta.total).toBe(1);
      expect(prisma.comment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: CommentStatus.PENDING },
        }),
      );
    });

    it('should use default pagination values', async () => {
      mockPrismaService.comment.findMany.mockResolvedValue([]);
      mockPrismaService.comment.count.mockResolvedValue(0);

      const result = await service.findAllPending();

      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(10);
    });
  });

  describe('findOne', () => {
    const mockComment = {
      id: 'comment-id',
      body: 'Test comment',
      author: {
        id: 'user-id',
        email: 'user@example.com',
        firstName: 'John',
        lastName: 'Doe',
      },
      content: {
        id: 'content-id',
        title: 'Test',
        slug: 'test',
      },
    };

    it('should return a comment by ID', async () => {
      mockPrismaService.comment.findUnique.mockResolvedValue(mockComment);

      const result = await service.findOne('comment-id');

      expect(result).toEqual(mockComment);
      expect(prisma.comment.findUnique).toHaveBeenCalledWith({
        where: { id: 'comment-id' },
        include: expect.any(Object),
      });
    });

    it('should throw NotFoundException if comment not found', async () => {
      mockPrismaService.comment.findUnique.mockResolvedValue(null);

      await expect(service.findOne('invalid-id')).rejects.toThrow(NotFoundException);
      await expect(service.findOne('invalid-id')).rejects.toThrow(
        'Comment with ID invalid-id not found',
      );
    });
  });

  describe('update', () => {
    const updateDto: UpdateCommentDto = {
      body: 'Updated comment',
    };

    const mockComment = {
      id: 'comment-id',
      body: 'Updated comment',
      author: null,
      content: {
        id: 'content-id',
        title: 'Test',
        slug: 'test',
      },
    };

    it('should update a comment body', async () => {
      mockPrismaService.comment.findUnique.mockResolvedValue({
        id: 'comment-id',
      });
      mockPrismaService.comment.update.mockResolvedValue(mockComment);

      const result = await service.update('comment-id', updateDto);

      expect(result).toEqual(mockComment);
      expect(prisma.comment.update).toHaveBeenCalledWith({
        where: { id: 'comment-id' },
        data: { body: updateDto.body },
        include: expect.any(Object),
      });
    });

    it('should throw NotFoundException if comment not found', async () => {
      mockPrismaService.comment.findUnique.mockResolvedValue(null);

      await expect(service.update('invalid-id', updateDto)).rejects.toThrow(NotFoundException);
    });
  });

  describe('moderate', () => {
    const moderateDto: ModerateCommentDto = {
      status: CommentStatus.APPROVED,
    };

    const mockComment = {
      id: 'comment-id',
      status: CommentStatus.APPROVED,
      author: null,
      content: {
        id: 'content-id',
        title: 'Test',
        slug: 'test',
      },
    };

    it('should update comment status', async () => {
      mockPrismaService.comment.findUnique.mockResolvedValue({
        id: 'comment-id',
      });
      mockPrismaService.comment.update.mockResolvedValue(mockComment);

      const result = await service.moderate('comment-id', moderateDto);

      expect(result).toEqual(mockComment);
      expect(prisma.comment.update).toHaveBeenCalledWith({
        where: { id: 'comment-id' },
        data: { status: CommentStatus.APPROVED },
        include: expect.any(Object),
      });
    });

    it('should throw NotFoundException if comment not found', async () => {
      mockPrismaService.comment.findUnique.mockResolvedValue(null);

      await expect(service.moderate('invalid-id', moderateDto)).rejects.toThrow(NotFoundException);
    });
  });

  describe('moderateBatch', () => {
    const batchDto: BatchModerateDto = {
      ids: ['comment-1', 'comment-2', 'comment-3'],
      status: CommentStatus.APPROVED,
    };

    it('should update multiple comments status', async () => {
      mockPrismaService.comment.updateMany.mockResolvedValue({ count: 3 });

      const result = await service.moderateBatch(batchDto);

      expect(result).toEqual({ count: 3 });
      expect(prisma.comment.updateMany).toHaveBeenCalledWith({
        where: {
          id: { in: batchDto.ids },
        },
        data: {
          status: CommentStatus.APPROVED,
        },
      });
    });

    it('should return count of updated comments', async () => {
      mockPrismaService.comment.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.moderateBatch({
        ids: ['comment-1'],
        status: CommentStatus.REJECTED,
      });

      expect(result.count).toBe(1);
    });
  });

  describe('remove', () => {
    it('should delete a comment and its children', async () => {
      const mockComment = {
        id: 'comment-id',
        children: [],
      };

      mockPrismaService.comment.findUnique.mockResolvedValue(mockComment);
      mockPrismaService.comment.findMany.mockResolvedValue([]);
      mockPrismaService.comment.delete.mockResolvedValue(mockComment);

      await service.remove('comment-id');

      expect(prisma.comment.delete).toHaveBeenCalledWith({
        where: { id: 'comment-id' },
      });
    });

    it('should recursively delete children comments', async () => {
      const mockParent = {
        id: 'parent-id',
        children: [{ id: 'child-id' }],
      };

      mockPrismaService.comment.findUnique.mockResolvedValue(mockParent);
      mockPrismaService.comment.findMany
        .mockResolvedValueOnce([{ id: 'child-id' }])
        .mockResolvedValueOnce([]);
      mockPrismaService.comment.delete.mockResolvedValue({});

      await service.remove('parent-id');

      expect(prisma.comment.delete).toHaveBeenCalledTimes(2);
      expect(prisma.comment.delete).toHaveBeenCalledWith({
        where: { id: 'child-id' },
      });
      expect(prisma.comment.delete).toHaveBeenCalledWith({
        where: { id: 'parent-id' },
      });
    });

    it('should throw NotFoundException if comment not found', async () => {
      mockPrismaService.comment.findUnique.mockResolvedValue(null);

      await expect(service.remove('invalid-id')).rejects.toThrow(NotFoundException);
      await expect(service.remove('invalid-id')).rejects.toThrow(
        'Comment with ID invalid-id not found',
      );
    });
  });
});
