import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Comment, CommentStatus, ContentStatus, UserRole } from '@prisma/client';

import { PaginatedResponseDto } from '../common/dto/paginated-response.dto';
import { PrismaService } from '../prisma/prisma.service';

import { BatchModerateDto } from './dto/batch-moderate.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { ModerateCommentDto } from './dto/moderate-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';

/**
 * Comment with relations
 */
export interface CommentWithRelations extends Comment {
  author?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  } | null;
  content: {
    id: string;
    title: string;
    slug: string;
  };
  children?: CommentWithRelations[];
}

/**
 * Pagination options for comments
 */
export interface CommentPaginationOptions {
  page?: number;
  limit?: number;
}

@Injectable()
export class CommentsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new comment
   * - Authenticated users: attach authorId, ignore authorName/authorEmail
   * - Guest users: require authorName and authorEmail
   * - Initial status: PENDING
   * - Validates contentId exists and is PUBLISHED
   * - Validates parentId if provided
   */
  async create(dto: CreateCommentDto, authenticatedUserId?: string): Promise<CommentWithRelations> {
    // If user is authenticated, use their ID and ignore guest fields
    // If not authenticated, require guest name and email
    if (!authenticatedUserId) {
      if (!dto.authorName || !dto.authorEmail) {
        throw new BadRequestException('Guest comments require authorName and authorEmail');
      }
    }

    // Validate content exists and is PUBLISHED
    const content = await this.prisma.content.findUnique({
      where: { id: dto.contentId },
    });

    if (!content) {
      throw new NotFoundException(`Content with ID ${dto.contentId} not found`);
    }

    if (content.status !== ContentStatus.PUBLISHED) {
      throw new BadRequestException('Comments can only be added to published content');
    }

    // Validate parent comment if provided
    if (dto.parentId) {
      const parentComment = await this.prisma.comment.findUnique({
        where: { id: dto.parentId },
      });

      if (!parentComment) {
        throw new NotFoundException(`Parent comment with ID ${dto.parentId} not found`);
      }

      // Parent comment must belong to the same content
      if (parentComment.contentId !== dto.contentId) {
        throw new BadRequestException('Parent comment must belong to the same content');
      }
    }

    // Create comment
    const comment = await this.prisma.comment.create({
      data: {
        body: dto.body,
        contentId: dto.contentId,
        parentId: dto.parentId,
        authorId: authenticatedUserId || null,
        authorName: authenticatedUserId ? null : dto.authorName,
        authorEmail: authenticatedUserId ? null : dto.authorEmail,
        status: CommentStatus.PENDING,
      },
      include: {
        author: authenticatedUserId
          ? {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
              },
            }
          : false,
        content: {
          select: {
            id: true,
            title: true,
            slug: true,
          },
        },
      },
    });

    return comment as CommentWithRelations;
  }

  /**
   * Find all comments for a specific content
   * Returns nested structure (organized by parentId)
   * - Public users: see APPROVED comments only
   * - Editor+ role: see all comments
   */
  async findAllForContent(
    contentId: string,
    options: CommentPaginationOptions = {},
    userRole?: UserRole,
  ): Promise<PaginatedResponseDto<CommentWithRelations>> {
    const page = options.page || 1;
    const limit = options.limit || 10;
    const skip = (page - 1) * limit;

    // Determine which statuses to show based on user role
    const statusFilter =
      userRole === UserRole.ADMIN || userRole === UserRole.EDITOR || userRole === UserRole.AUTHOR
        ? undefined // Show all statuses
        : { status: CommentStatus.APPROVED }; // Only show approved for public

    // Get top-level comments (no parent) with pagination
    const [topLevelComments, total] = await Promise.all([
      this.prisma.comment.findMany({
        where: {
          contentId,
          parentId: null,
          ...statusFilter,
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          author: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
          content: {
            select: {
              id: true,
              title: true,
              slug: true,
            },
          },
        },
      }),
      this.prisma.comment.count({
        where: {
          contentId,
          parentId: null,
          ...statusFilter,
        },
      }),
    ]);

    // For each top-level comment, recursively fetch children
    const commentsWithChildren = await Promise.all(
      topLevelComments.map((comment) => this.fetchCommentWithChildren(comment, statusFilter)),
    );

    return new PaginatedResponseDto(
      commentsWithChildren as CommentWithRelations[],
      total,
      page,
      limit,
    );
  }

  /**
   * Recursively fetch all child comments
   */
  private async fetchCommentWithChildren(
    comment: any,
    statusFilter: any,
  ): Promise<CommentWithRelations> {
    const children = await this.prisma.comment.findMany({
      where: {
        parentId: comment.id,
        ...statusFilter,
      },
      orderBy: { createdAt: 'asc' },
      include: {
        author: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        content: {
          select: {
            id: true,
            title: true,
            slug: true,
          },
        },
      },
    });

    // Recursively fetch children for each child
    const childrenWithNested = await Promise.all(
      children.map((child) => this.fetchCommentWithChildren(child, statusFilter)),
    );

    return {
      ...comment,
      children: childrenWithNested,
    } as CommentWithRelations;
  }

  /**
   * Find all pending comments (Editor+ only)
   * Returns paginated list of comments with PENDING status
   */
  async findAllPending(
    options: CommentPaginationOptions = {},
  ): Promise<PaginatedResponseDto<CommentWithRelations>> {
    const page = options.page || 1;
    const limit = options.limit || 10;
    const skip = (page - 1) * limit;

    const [comments, total] = await Promise.all([
      this.prisma.comment.findMany({
        where: { status: CommentStatus.PENDING },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          author: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
          content: {
            select: {
              id: true,
              title: true,
              slug: true,
            },
          },
        },
      }),
      this.prisma.comment.count({
        where: { status: CommentStatus.PENDING },
      }),
    ]);

    return new PaginatedResponseDto(comments as CommentWithRelations[], total, page, limit);
  }

  /**
   * Find single comment by ID
   * Returns comment with content and author relations
   */
  async findOne(id: string): Promise<CommentWithRelations> {
    const comment = await this.prisma.comment.findUnique({
      where: { id },
      include: {
        author: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        content: {
          select: {
            id: true,
            title: true,
            slug: true,
          },
        },
      },
    });

    if (!comment) {
      throw new NotFoundException(`Comment with ID ${id} not found`);
    }

    return comment as CommentWithRelations;
  }

  /**
   * Update comment body
   */
  async update(id: string, dto: UpdateCommentDto): Promise<CommentWithRelations> {
    const existingComment = await this.prisma.comment.findUnique({
      where: { id },
    });

    if (!existingComment) {
      throw new NotFoundException(`Comment with ID ${id} not found`);
    }

    const comment = await this.prisma.comment.update({
      where: { id },
      data: { body: dto.body },
      include: {
        author: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        content: {
          select: {
            id: true,
            title: true,
            slug: true,
          },
        },
      },
    });

    return comment as CommentWithRelations;
  }

  /**
   * Moderate single comment (Editor+ only)
   * Updates comment status
   */
  async moderate(id: string, dto: ModerateCommentDto): Promise<CommentWithRelations> {
    const existingComment = await this.prisma.comment.findUnique({
      where: { id },
    });

    if (!existingComment) {
      throw new NotFoundException(`Comment with ID ${id} not found`);
    }

    const comment = await this.prisma.comment.update({
      where: { id },
      data: { status: dto.status },
      include: {
        author: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        content: {
          select: {
            id: true,
            title: true,
            slug: true,
          },
        },
      },
    });

    return comment as CommentWithRelations;
  }

  /**
   * Moderate multiple comments in batch (Editor+ only)
   * Updates status for all comments with provided IDs
   */
  async moderateBatch(dto: BatchModerateDto): Promise<{ count: number }> {
    const result = await this.prisma.comment.updateMany({
      where: {
        id: { in: dto.ids },
      },
      data: {
        status: dto.status,
      },
    });

    return { count: result.count };
  }

  /**
   * Delete comment and all its children (Admin only)
   * Cascades to child comments due to self-relation
   */
  async remove(id: string): Promise<void> {
    const comment = await this.prisma.comment.findUnique({
      where: { id },
      include: {
        children: true,
      },
    });

    if (!comment) {
      throw new NotFoundException(`Comment with ID ${id} not found`);
    }

    // Prisma will cascade delete children due to onDelete in schema
    // But we need to manually handle the self-relation cascade
    await this.deleteCommentRecursively(id);
  }

  /**
   * Recursively delete comment and all its children
   */
  private async deleteCommentRecursively(id: string): Promise<void> {
    // Find all direct children
    const children = await this.prisma.comment.findMany({
      where: { parentId: id },
      select: { id: true },
    });

    // Recursively delete each child
    for (const child of children) {
      await this.deleteCommentRecursively(child.id);
    }

    // Delete the comment itself
    await this.prisma.comment.delete({
      where: { id },
    });
  }
}
