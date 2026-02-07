import {
  Controller,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';

import { CurrentUser, CurrentUserType } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PaginatedResponseDto } from '../common/dto/paginated-response.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { ContentService } from '../content/content.service';
import { CompareVersionsDto } from './dto/compare-versions.dto';
import { VersionsService, VersionWithRelations } from './versions.service';

/**
 * Versions Controller
 * Manages content version history, comparison, and rollback operations
 * All endpoints are protected and require authentication
 */
@Controller('content/:contentId/versions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class VersionsController {
  constructor(
    private readonly versionsService: VersionsService,
    private readonly contentService: ContentService,
  ) {}

  /**
   * Get all versions for a content
   * Protected - requires authentication
   * Returns paginated list of versions ordered by versionNumber DESC
   */
  @Get()
  async findAll(
    @Param('contentId') contentId: string,
    @Query() paginationDto: PaginationQueryDto,
  ): Promise<PaginatedResponseDto<VersionWithRelations>> {
    return this.versionsService.findAllForContent(
      contentId,
      paginationDto.page,
      paginationDto.limit,
    );
  }

  /**
   * Get single version by ID
   * Protected - requires authentication
   * Returns version with content and createdBy relations
   */
  @Get(':versionId')
  async findOne(
    @Param('contentId') contentId: string,
    @Param('versionId') versionId: string,
  ): Promise<VersionWithRelations> {
    const version = await this.versionsService.findOne(versionId);

    // Verify version belongs to the specified content
    if (version.contentId !== contentId) {
      throw new NotFoundException(`Version ${versionId} does not belong to content ${contentId}`);
    }

    return version;
  }

  /**
   * Compare two versions of the same content
   * Protected - requires authentication
   * Returns both version objects for frontend diff rendering
   */
  @Get('compare')
  async compareVersions(
    @Param('contentId') contentId: string,
    @Query() compareDto: CompareVersionsDto,
  ): Promise<{ version1: VersionWithRelations; version2: VersionWithRelations }> {
    return this.versionsService.compareVersions(contentId, compareDto.v1, compareDto.v2);
  }

  /**
   * Rollback content to a specific version
   * Protected - requires Editor+ role or content ownership
   * Creates new version and updates content
   */
  @Post(':versionNumber/rollback')
  async rollback(
    @Param('contentId') contentId: string,
    @Param('versionNumber') versionNumber: string,
    @CurrentUser() user: CurrentUserType,
  ): Promise<any> {
    // Parse version number
    const targetVersionNumber = parseInt(versionNumber, 10);
    if (isNaN(targetVersionNumber) || targetVersionNumber < 1) {
      throw new NotFoundException('Invalid version number');
    }

    // Check ownership/permissions
    await this.checkRollbackPermission(contentId, user);

    return this.versionsService.rollback(contentId, targetVersionNumber, user.id);
  }

  /**
   * Check if user has permission to rollback content
   * Editors and Admins can rollback any content
   * Authors can only rollback their own content
   */
  private async checkRollbackPermission(contentId: string, user: CurrentUserType): Promise<void> {
    // Editors and Admins can rollback any content
    if (user.role === UserRole.EDITOR || user.role === UserRole.ADMIN) {
      return;
    }

    // For Authors, check ownership
    try {
      const content = await this.contentService.findOne(contentId);

      if (content.authorId !== user.id) {
        throw new ForbiddenException('You do not have permission to rollback this content');
      }
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new ForbiddenException('You do not have permission to rollback this content');
    }
  }
}
