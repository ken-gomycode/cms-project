import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { SeoMetadata, UserRole } from '@prisma/client';

import { CurrentUser, CurrentUserType } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSeoDto } from './dto/create-seo.dto';
import { SeoScoreDto } from './dto/seo-score.dto';
import { SeoAnalyzerService } from './seo-analyzer.service';
import { SeoService } from './seo.service';

/**
 * SEO Controller
 * Manages SEO metadata for content with role-based access control
 * Provides SEO analysis and scoring functionality
 */
@Controller('content/:contentId/seo')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SeoController {
  constructor(
    private readonly seoService: SeoService,
    private readonly seoAnalyzerService: SeoAnalyzerService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Create or update SEO metadata for content
   * Protected: Editor+ roles or content owner
   */
  @Put()
  @Roles(UserRole.AUTHOR, UserRole.EDITOR, UserRole.ADMIN)
  async createOrUpdate(
    @Param('contentId') contentId: string,
    @Body() createSeoDto: CreateSeoDto,
    @CurrentUser() user: CurrentUserType,
  ): Promise<SeoMetadata> {
    // Check ownership
    await this.checkOwnership(contentId, user);

    return this.seoService.createOrUpdate(contentId, createSeoDto);
  }

  /**
   * Get SEO metadata for content
   * Public endpoint - accessible to all
   */
  @Get()
  @Public()
  async findByContentId(@Param('contentId') contentId: string): Promise<SeoMetadata> {
    return this.seoService.findByContentId(contentId);
  }

  /**
   * Delete SEO metadata for content
   * Protected: Editor+ roles or content owner
   */
  @Delete()
  @Roles(UserRole.AUTHOR, UserRole.EDITOR, UserRole.ADMIN)
  async remove(
    @Param('contentId') contentId: string,
    @CurrentUser() user: CurrentUserType,
  ): Promise<{ message: string }> {
    // Check ownership
    await this.checkOwnership(contentId, user);

    await this.seoService.remove(contentId);

    return { message: 'SEO metadata deleted successfully' };
  }

  /**
   * Analyze SEO quality for content
   * Protected: Any authenticated user can analyze
   * Returns SEO score and detailed check results
   */
  @Post('analyze')
  @Roles(UserRole.AUTHOR, UserRole.EDITOR, UserRole.ADMIN, UserRole.SUBSCRIBER)
  async analyze(@Param('contentId') contentId: string): Promise<SeoScoreDto> {
    return this.seoAnalyzerService.analyze(contentId);
  }

  /**
   * Check if user owns the content or has Editor+ role
   * Throws ForbiddenException if user doesn't have permission
   */
  private async checkOwnership(contentId: string, user: CurrentUserType): Promise<void> {
    // Editors and Admins can edit any content's SEO
    if (user.role === UserRole.EDITOR || user.role === UserRole.ADMIN) {
      return;
    }

    // For Authors, check ownership
    try {
      const content = await this.prisma.content.findUnique({
        where: { id: contentId },
        select: { authorId: true },
      });

      if (!content) {
        throw new NotFoundException(`Content with ID ${contentId} not found`);
      }

      if (content.authorId !== user.id) {
        throw new ForbiddenException(
          'You do not have permission to modify SEO metadata for this content',
        );
      }
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      if (error instanceof ForbiddenException) {
        throw error;
      }
      throw new ForbiddenException(
        'You do not have permission to modify SEO metadata for this content',
      );
    }
  }
}
