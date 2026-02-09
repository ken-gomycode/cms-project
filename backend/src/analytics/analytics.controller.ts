import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AnalyticsService } from './analytics.service';

/**
 * Analytics Controller
 * Provides endpoints for analytics and reporting
 * Protected - Only accessible to Editor+ roles
 */
@ApiTags('analytics')
@ApiBearerAuth('JWT-auth')
@Controller('analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.EDITOR, UserRole.ADMIN)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  /**
   * Get analytics for a specific content
   * GET /analytics/content/:contentId
   */
  @ApiOperation({
    summary: 'Get content analytics',
    description: 'Get analytics stats for specific content. Requires EDITOR or ADMIN role.',
  })
  @ApiParam({ name: 'contentId', description: 'Content UUID' })
  @ApiQuery({
    name: 'days',
    required: false,
    type: Number,
    description: 'Number of days to analyze',
    example: 30,
  })
  @ApiResponse({ status: 200, description: 'Analytics retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @Get('content/:contentId')
  async getContentStats(
    @Param('contentId') contentId: string,
    @Query('days', new DefaultValuePipe(30), ParseIntPipe) days: number,
  ) {
    return this.analyticsService.getContentStats(contentId, days);
  }

  /**
   * Get top content by views
   * GET /analytics/top-content
   */
  @ApiOperation({
    summary: 'Get top content',
    description: 'Get top content by views. Requires EDITOR or ADMIN role.',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of results',
    example: 10,
  })
  @ApiQuery({
    name: 'days',
    required: false,
    type: Number,
    description: 'Number of days to analyze',
    example: 30,
  })
  @ApiResponse({ status: 200, description: 'Top content retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @Get('top-content')
  async getTopContent(
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('days', new DefaultValuePipe(30), ParseIntPipe) days: number,
  ) {
    return this.analyticsService.getTopContent(limit, days);
  }

  /**
   * Get dashboard summary statistics
   * GET /analytics/dashboard
   */
  @ApiOperation({
    summary: 'Get dashboard summary',
    description: 'Get overall dashboard analytics summary. Requires EDITOR or ADMIN role.',
  })
  @ApiResponse({ status: 200, description: 'Dashboard summary retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @Get('dashboard')
  async getDashboardSummary() {
    return this.analyticsService.getDashboardSummary();
  }
}
