import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
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
@Controller('analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.EDITOR, UserRole.ADMIN)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  /**
   * Get analytics for a specific content
   * GET /analytics/content/:contentId
   */
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
  @Get('dashboard')
  async getDashboardSummary() {
    return this.analyticsService.getDashboardSummary();
  }
}
