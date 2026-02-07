import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';

import { AnalyticsInterceptor } from '../analytics/analytics.interceptor';
import { CurrentUser, CurrentUserType } from '../auth/decorators/current-user.decorator';
import { HttpCacheInterceptor, HttpCacheTTL } from '../cache/http-cache.interceptor';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PaginatedResponseDto } from '../common/dto/paginated-response.dto';
import { ContentService, ContentWithRelations } from './content.service';
import { ContentFilterDto } from './dto/content-filter.dto';
import { CreateContentDto } from './dto/create-content.dto';
import { ScheduleContentDto } from './dto/schedule-content.dto';
import { UpdateContentDto } from './dto/update-content.dto';

/**
 * Content Controller
 * Manages content (articles/posts) CRUD operations
 * Implements role-based access control and ownership checks
 */
@Controller('content')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ContentController {
  constructor(private readonly contentService: ContentService) {}

  /**
   * Create new content
   * Protected: Editor+ roles can create content
   */
  @Post()
  @Roles(UserRole.EDITOR, UserRole.ADMIN, UserRole.AUTHOR)
  async create(
    @Body() createContentDto: CreateContentDto,
    @CurrentUser() user: CurrentUserType,
  ): Promise<ContentWithRelations> {
    return this.contentService.create(createContentDto, user.id);
  }

  /**
   * Get all content with pagination and filters
   * Public endpoint - accessible to all
   * Cached for 60 seconds
   */
  @Get()
  @Public()
  @UseInterceptors(HttpCacheInterceptor)
  @HttpCacheTTL(60000)
  async findAll(
    @Query() filterDto: ContentFilterDto,
  ): Promise<PaginatedResponseDto<ContentWithRelations>> {
    return this.contentService.findAll(filterDto);
  }

  /**
   * Get single content by ID or slug
   * Public endpoint - if slug, only returns PUBLISHED content
   * If UUID, returns any content (but still public)
   * Tracks analytics via AnalyticsInterceptor
   * Cached for 60 seconds
   */
  @Get(':idOrSlug')
  @Public()
  @UseInterceptors(HttpCacheInterceptor, AnalyticsInterceptor)
  @HttpCacheTTL(60000)
  async findOne(@Param('idOrSlug') idOrSlug: string): Promise<ContentWithRelations> {
    // Check if parameter is UUID (simple check for UUID format)
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug);

    if (isUuid) {
      return this.contentService.findOne(idOrSlug);
    } else {
      // Treat as slug - only return PUBLISHED content
      return this.contentService.findBySlug(idOrSlug);
    }
  }

  /**
   * Update content
   * Protected: Must be owner or Editor+ role
   */
  @Patch(':id')
  @Roles(UserRole.AUTHOR, UserRole.EDITOR, UserRole.ADMIN)
  async update(
    @Param('id') id: string,
    @Body() updateContentDto: UpdateContentDto,
    @CurrentUser() user: CurrentUserType,
  ): Promise<ContentWithRelations> {
    // Check ownership
    await this.checkOwnership(id, user);

    return this.contentService.update(id, updateContentDto, user.id);
  }

  /**
   * Delete content (soft delete)
   * Protected: Must be owner or Admin role
   */
  @Delete(':id')
  @Roles(UserRole.AUTHOR, UserRole.EDITOR, UserRole.ADMIN)
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserType,
  ): Promise<{ message: string }> {
    // Check ownership - Admins can delete any content
    if (user.role !== UserRole.ADMIN) {
      await this.checkOwnership(id, user);
    }

    await this.contentService.remove(id);

    return { message: 'Content archived successfully' };
  }

  /**
   * Schedule content for future publishing
   * Protected: Must be owner or Editor+ role
   */
  @Post(':id/schedule')
  @Roles(UserRole.AUTHOR, UserRole.EDITOR, UserRole.ADMIN)
  async schedule(
    @Param('id') id: string,
    @Body() scheduleDto: ScheduleContentDto,
    @CurrentUser() user: CurrentUserType,
  ): Promise<ContentWithRelations> {
    // Check ownership
    await this.checkOwnership(id, user);

    return this.contentService.scheduleContent(id, new Date(scheduleDto.scheduledAt));
  }

  /**
   * Unschedule content
   * Protected: Must be owner or Editor+ role
   */
  @Post(':id/unschedule')
  @Roles(UserRole.AUTHOR, UserRole.EDITOR, UserRole.ADMIN)
  async unschedule(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserType,
  ): Promise<ContentWithRelations> {
    // Check ownership
    await this.checkOwnership(id, user);

    return this.contentService.unscheduleContent(id);
  }

  /**
   * Check if user owns the content or has Editor+ role
   * Throws ForbiddenException if user doesn't have permission
   */
  private async checkOwnership(contentId: string, user: CurrentUserType): Promise<void> {
    // Editors and Admins can edit any content
    if (user.role === UserRole.EDITOR || user.role === UserRole.ADMIN) {
      return;
    }

    // For Authors, check ownership
    try {
      const content = await this.contentService.findOne(contentId);

      if (content.authorId !== user.id) {
        throw new ForbiddenException('You do not have permission to modify this content');
      }
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new ForbiddenException('You do not have permission to modify this content');
    }
  }
}
