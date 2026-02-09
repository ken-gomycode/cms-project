import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

import { CurrentUser, CurrentUserType } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { CommentsService } from './comments.service';
import { BatchModerateDto } from './dto/batch-moderate.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { ModerateCommentDto } from './dto/moderate-comment.dto';

/**
 * Optional auth guard for public/protected routes
 * Allows both authenticated and unauthenticated access
 * but populates request.user if token is present
 */
import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  handleRequest(err: any, user: any) {
    // Return user if exists, otherwise null (don't throw error)
    return user || null;
  }
}

/**
 * Comments Controller
 * Handles all comment-related endpoints
 * Supports both authenticated and guest comments
 */
@ApiTags('comments')
@Controller('comments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  /**
   * Create a new comment
   * - Public: Guest users can comment with name/email
   * - Protected: Authenticated users comment with their account
   */
  @ApiOperation({
    summary: 'Create comment',
    description: 'Create a new comment. Supports both authenticated and guest users.',
  })
  @ApiBody({ type: CreateCommentDto })
  @ApiResponse({ status: 201, description: 'Comment created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @Post()
  @Public()
  @UseGuards(OptionalJwtAuthGuard)
  create(@Body() createCommentDto: CreateCommentDto, @CurrentUser() user?: CurrentUserType) {
    return this.commentsService.create(createCommentDto, user?.id);
  }

  /**
   * Get all comments for specific content
   * Public endpoint - returns nested comment tree
   * - Unauthenticated: see APPROVED comments only
   * - Editor+: see all comments
   */
  @ApiOperation({
    summary: 'Get comments for content',
    description: 'Get all comments for specific content. Returns nested comment tree.',
  })
  @ApiParam({ name: 'contentId', description: 'Content UUID' })
  @ApiResponse({ status: 200, description: 'Comments retrieved successfully' })
  @Get('content/:contentId')
  @Public()
  @UseGuards(OptionalJwtAuthGuard)
  findAllForContent(
    @Param('contentId') contentId: string,
    @Query() pagination: PaginationQueryDto,
    @CurrentUser() user?: CurrentUserType,
  ) {
    return this.commentsService.findAllForContent(
      contentId,
      {
        page: pagination.page,
        limit: pagination.limit,
      },
      user?.role,
    );
  }

  /**
   * Get all comments (Editor+ only)
   * Returns paginated list of all comments regardless of status
   */
  @ApiOperation({
    summary: 'Get all comments',
    description: 'Get all comments. Requires AUTHOR, EDITOR, or ADMIN role.',
  })
  @ApiResponse({ status: 200, description: 'Comments retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiBearerAuth('JWT-auth')
  @Get()
  @Roles(UserRole.ADMIN, UserRole.EDITOR, UserRole.AUTHOR)
  findAll(@Query() pagination: PaginationQueryDto) {
    // For now, return all comments with same logic as pending
    // Could be extended to support filtering by status, content, etc.
    return this.commentsService.findAllPending({
      page: pagination.page,
      limit: pagination.limit,
    });
  }

  /**
   * Get all pending comments (Editor+ only)
   * Returns paginated list of comments awaiting moderation
   */
  @ApiOperation({
    summary: 'Get pending comments',
    description: 'Get all pending comments awaiting moderation.',
  })
  @ApiResponse({ status: 200, description: 'Pending comments retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiBearerAuth('JWT-auth')
  @Get('pending')
  @Roles(UserRole.ADMIN, UserRole.EDITOR, UserRole.AUTHOR)
  findAllPending(@Query() pagination: PaginationQueryDto) {
    return this.commentsService.findAllPending({
      page: pagination.page,
      limit: pagination.limit,
    });
  }

  /**
   * Get single comment by ID
   */
  @ApiOperation({
    summary: 'Get comment by ID',
    description: 'Retrieve a single comment by its UUID.',
  })
  @ApiParam({ name: 'id', description: 'Comment UUID' })
  @ApiResponse({ status: 200, description: 'Comment retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Comment not found' })
  @Get(':id')
  @Public()
  findOne(@Param('id') id: string) {
    return this.commentsService.findOne(id);
  }

  /**
   * Moderate a single comment (Editor+ only)
   * Updates comment status
   */
  @ApiOperation({ summary: 'Moderate comment', description: 'Update comment moderation status.' })
  @ApiParam({ name: 'id', description: 'Comment UUID' })
  @ApiBody({ type: ModerateCommentDto })
  @ApiResponse({ status: 200, description: 'Comment moderated successfully' })
  @ApiResponse({ status: 404, description: 'Comment not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiBearerAuth('JWT-auth')
  @Patch(':id/moderate')
  @Roles(UserRole.ADMIN, UserRole.EDITOR, UserRole.AUTHOR)
  moderate(@Param('id') id: string, @Body() moderateCommentDto: ModerateCommentDto) {
    return this.commentsService.moderate(id, moderateCommentDto);
  }

  /**
   * Moderate multiple comments in batch (Editor+ only)
   * Updates status for all provided comment IDs
   */
  @ApiOperation({
    summary: 'Batch moderate comments',
    description: 'Moderate multiple comments in batch.',
  })
  @ApiBody({ type: BatchModerateDto })
  @ApiResponse({ status: 200, description: 'Comments moderated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiBearerAuth('JWT-auth')
  @Patch('batch-moderate')
  @Roles(UserRole.ADMIN, UserRole.EDITOR, UserRole.AUTHOR)
  moderateBatch(@Body() batchModerateDto: BatchModerateDto) {
    return this.commentsService.moderateBatch(batchModerateDto);
  }

  /**
   * Delete comment (Admin only)
   * Cascades to all child comments
   */
  @ApiOperation({
    summary: 'Delete comment',
    description: 'Delete a comment and all its children. Requires ADMIN role.',
  })
  @ApiParam({ name: 'id', description: 'Comment UUID' })
  @ApiResponse({ status: 200, description: 'Comment deleted successfully' })
  @ApiResponse({ status: 404, description: 'Comment not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiBearerAuth('JWT-auth')
  @Delete(':id')
  @Roles(UserRole.ADMIN)
  remove(@Param('id') id: string) {
    return this.commentsService.remove(id);
  }
}
