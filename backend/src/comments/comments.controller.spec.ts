import { Test, TestingModule } from '@nestjs/testing';
import { CommentStatus, ContentStatus, UserRole } from '@prisma/client';

import { CurrentUserType } from '../auth/decorators/current-user.decorator';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { PrismaService } from '../prisma/prisma.service';
import { CommentsController } from './comments.controller';
import { CommentsService } from './comments.service';
import { BatchModerateDto } from './dto/batch-moderate.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { ModerateCommentDto } from './dto/moderate-comment.dto';

describe('CommentsController', () => {
  let controller: CommentsController;
  let service: CommentsService;

  const mockCommentsService = {
    create: jest.fn(),
    findAllForContent: jest.fn(),
    findAllPending: jest.fn(),
    findOne: jest.fn(),
    moderate: jest.fn(),
    moderateBatch: jest.fn(),
    remove: jest.fn(),
  };

  const mockUser: CurrentUserType = {
    id: 'user-id',
    email: 'user@example.com',
    role: UserRole.EDITOR,
    firstName: 'John',
    lastName: 'Doe',
  };

  const mockComment = {
    id: 'comment-id',
    body: 'Test comment',
    contentId: 'content-id',
    authorId: 'user-id',
    authorName: null,
    authorEmail: null,
    parentId: null,
    status: CommentStatus.PENDING,
    createdAt: new Date(),
    updatedAt: new Date(),
    author: {
      id: 'user-id',
      email: 'user@example.com',
      firstName: 'John',
      lastName: 'Doe',
    },
    content: {
      id: 'content-id',
      title: 'Test Content',
      slug: 'test-content',
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CommentsController],
      providers: [
        {
          provide: CommentsService,
          useValue: mockCommentsService,
        },
      ],
    }).compile();

    controller = module.get<CommentsController>(CommentsController);
    service = module.get<CommentsService>(CommentsService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    const createDto: CreateCommentDto = {
      body: 'Test comment',
      contentId: 'content-id',
      authorName: 'Guest User',
      authorEmail: 'guest@example.com',
    };

    it('should create a comment for authenticated user', async () => {
      mockCommentsService.create.mockResolvedValue(mockComment);

      const result = await controller.create(createDto, mockUser);

      expect(result).toEqual(mockComment);
      expect(service.create).toHaveBeenCalledWith(createDto, mockUser.id);
    });

    it('should create a guest comment without user', async () => {
      const guestComment = {
        ...mockComment,
        authorId: null,
        authorName: 'Guest User',
        authorEmail: 'guest@example.com',
        author: null,
      };
      mockCommentsService.create.mockResolvedValue(guestComment);

      const result = await controller.create(createDto, undefined);

      expect(result).toEqual(guestComment);
      expect(service.create).toHaveBeenCalledWith(createDto, undefined);
    });

    it('should create a reply comment with parentId', async () => {
      const replyDto = { ...createDto, parentId: 'parent-comment-id' };
      const replyComment = { ...mockComment, parentId: 'parent-comment-id' };
      mockCommentsService.create.mockResolvedValue(replyComment);

      const result = await controller.create(replyDto, mockUser);

      expect(result).toEqual(replyComment);
      expect(service.create).toHaveBeenCalledWith(replyDto, mockUser.id);
    });
  });

  describe('findAllForContent', () => {
    const contentId = 'content-id';
    const pagination: PaginationQueryDto = {
      page: 1,
      limit: 10,
    };

    const mockPaginatedResponse = {
      data: [mockComment],
      meta: {
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      },
    };

    it('should return paginated comments for content (authenticated user)', async () => {
      mockCommentsService.findAllForContent.mockResolvedValue(mockPaginatedResponse);

      const result = await controller.findAllForContent(contentId, pagination, mockUser);

      expect(result).toEqual(mockPaginatedResponse);
      expect(service.findAllForContent).toHaveBeenCalledWith(
        contentId,
        { page: 1, limit: 10 },
        mockUser.role,
      );
    });

    it('should return approved comments only for public users', async () => {
      const approvedComment = {
        ...mockComment,
        status: CommentStatus.APPROVED,
      };
      const publicResponse = {
        data: [approvedComment],
        meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
      };

      mockCommentsService.findAllForContent.mockResolvedValue(publicResponse);

      const result = await controller.findAllForContent(contentId, pagination, undefined);

      expect(result).toEqual(publicResponse);
      expect(service.findAllForContent).toHaveBeenCalledWith(
        contentId,
        { page: 1, limit: 10 },
        undefined,
      );
    });

    it('should return nested comments structure', async () => {
      const nestedComment = {
        ...mockComment,
        children: [
          {
            ...mockComment,
            id: 'child-comment-id',
            parentId: 'comment-id',
          },
        ],
      };

      const nestedResponse = {
        data: [nestedComment],
        meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
      };

      mockCommentsService.findAllForContent.mockResolvedValue(nestedResponse);

      const result = await controller.findAllForContent(contentId, pagination, mockUser);

      expect(result.data[0].children).toBeDefined();
      expect(result.data[0].children).toHaveLength(1);
    });
  });

  describe('findAll', () => {
    const pagination: PaginationQueryDto = {
      page: 1,
      limit: 10,
    };

    const mockPaginatedResponse = {
      data: [mockComment],
      meta: {
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      },
    };

    it('should return all comments for Editor', async () => {
      mockCommentsService.findAllPending.mockResolvedValue(mockPaginatedResponse);

      const result = await controller.findAll(pagination);

      expect(result).toEqual(mockPaginatedResponse);
      expect(service.findAllPending).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
      });
    });
  });

  describe('findAllPending', () => {
    const pagination: PaginationQueryDto = {
      page: 1,
      limit: 10,
    };

    const mockPendingResponse = {
      data: [mockComment],
      meta: {
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      },
    };

    it('should return pending comments for Editor', async () => {
      mockCommentsService.findAllPending.mockResolvedValue(mockPendingResponse);

      const result = await controller.findAllPending(pagination);

      expect(result).toEqual(mockPendingResponse);
      expect(service.findAllPending).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
      });
    });

    it('should handle pagination parameters', async () => {
      const customPagination: PaginationQueryDto = {
        page: 2,
        limit: 20,
      };

      mockCommentsService.findAllPending.mockResolvedValue({
        data: [],
        meta: { total: 0, page: 2, limit: 20, totalPages: 0 },
      });

      await controller.findAllPending(customPagination);

      expect(service.findAllPending).toHaveBeenCalledWith({
        page: 2,
        limit: 20,
      });
    });
  });

  describe('findOne', () => {
    it('should return a single comment', async () => {
      mockCommentsService.findOne.mockResolvedValue(mockComment);

      const result = await controller.findOne('comment-id');

      expect(result).toEqual(mockComment);
      expect(service.findOne).toHaveBeenCalledWith('comment-id');
    });
  });

  describe('moderate', () => {
    const moderateDto: ModerateCommentDto = {
      status: CommentStatus.APPROVED,
    };

    it('should moderate a comment to APPROVED', async () => {
      const approvedComment = { ...mockComment, status: CommentStatus.APPROVED };
      mockCommentsService.moderate.mockResolvedValue(approvedComment);

      const result = await controller.moderate('comment-id', moderateDto);

      expect(result).toEqual(approvedComment);
      expect(service.moderate).toHaveBeenCalledWith('comment-id', moderateDto);
    });

    it('should moderate a comment to REJECTED', async () => {
      const rejectedDto: ModerateCommentDto = {
        status: CommentStatus.REJECTED,
      };
      const rejectedComment = { ...mockComment, status: CommentStatus.REJECTED };
      mockCommentsService.moderate.mockResolvedValue(rejectedComment);

      const result = await controller.moderate('comment-id', rejectedDto);

      expect(result).toEqual(rejectedComment);
      expect(service.moderate).toHaveBeenCalledWith('comment-id', rejectedDto);
    });

    it('should moderate a comment to SPAM', async () => {
      const spamDto: ModerateCommentDto = {
        status: CommentStatus.SPAM,
      };
      const spamComment = { ...mockComment, status: CommentStatus.SPAM };
      mockCommentsService.moderate.mockResolvedValue(spamComment);

      const result = await controller.moderate('comment-id', spamDto);

      expect(result).toEqual(spamComment);
      expect(service.moderate).toHaveBeenCalledWith('comment-id', spamDto);
    });
  });

  describe('moderateBatch', () => {
    const batchDto: BatchModerateDto = {
      ids: ['comment-1', 'comment-2', 'comment-3'],
      status: CommentStatus.APPROVED,
    };

    it('should moderate multiple comments at once', async () => {
      mockCommentsService.moderateBatch.mockResolvedValue({ count: 3 });

      const result = await controller.moderateBatch(batchDto);

      expect(result).toEqual({ count: 3 });
      expect(service.moderateBatch).toHaveBeenCalledWith(batchDto);
    });

    it('should handle batch rejection', async () => {
      const rejectDto: BatchModerateDto = {
        ids: ['comment-1', 'comment-2'],
        status: CommentStatus.REJECTED,
      };
      mockCommentsService.moderateBatch.mockResolvedValue({ count: 2 });

      const result = await controller.moderateBatch(rejectDto);

      expect(result).toEqual({ count: 2 });
      expect(service.moderateBatch).toHaveBeenCalledWith(rejectDto);
    });

    it('should handle empty batch', async () => {
      const emptyDto: BatchModerateDto = {
        ids: [],
        status: CommentStatus.APPROVED,
      };
      mockCommentsService.moderateBatch.mockResolvedValue({ count: 0 });

      const result = await controller.moderateBatch(emptyDto);

      expect(result).toEqual({ count: 0 });
    });
  });

  describe('remove', () => {
    it('should delete a comment', async () => {
      mockCommentsService.remove.mockResolvedValue(undefined);

      const result = await controller.remove('comment-id');

      expect(result).toBeUndefined();
      expect(service.remove).toHaveBeenCalledWith('comment-id');
    });

    it('should cascade delete children comments', async () => {
      mockCommentsService.remove.mockResolvedValue(undefined);

      await controller.remove('parent-comment-id');

      expect(service.remove).toHaveBeenCalledWith('parent-comment-id');
      // Service handles the cascade logic
    });
  });
});
