import { Injectable, Logger } from '@nestjs/common';
import { ContentStatus, UserRole } from '@prisma/client';

import { CacheService } from '../cache/cache.service';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Analytics Service
 * Handles content view tracking and analytics reporting
 */
@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService,
  ) {}

  /**
   * Track a content view
   * Uses Redis set for IP deduplication to count unique visitors
   * @param contentId Content ID to track
   * @param ipAddress IP address of the visitor
   */
  async trackView(contentId: string, ipAddress: string): Promise<void> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Format date as YYYY-MM-DD for Redis key
      const dateKey = today.toISOString().split('T')[0];
      const redisKey = `analytics:views:${contentId}:${dateKey}:ips`;

      // Check if this IP has already been counted today
      const isUniqueVisitor = await this.cacheService.sismember(redisKey, ipAddress);

      // Add IP to the set for this content and date
      await this.cacheService.sadd(redisKey, ipAddress);

      // Set expiration to 30 days to clean up old data
      await this.cacheService.expire(redisKey, 30 * 24 * 60 * 60);

      // Upsert analytics record
      await this.prisma.analytics.upsert({
        where: {
          contentId_date: {
            contentId,
            date: today,
          },
        },
        update: {
          views: { increment: 1 },
          uniqueVisitors: isUniqueVisitor ? undefined : { increment: 1 },
        },
        create: {
          contentId,
          date: today,
          views: 1,
          uniqueVisitors: 1,
        },
      });

      this.logger.debug(`Tracked view for content ${contentId} from IP ${ipAddress}`);
    } catch (error) {
      this.logger.error(`Error tracking view for content ${contentId}: ${error.message}`);
      // Don't throw error - analytics should not break the main flow
    }
  }

  /**
   * Get analytics stats for a specific content
   * @param contentId Content ID
   * @param days Number of days to look back (default: 30)
   */
  async getContentStats(contentId: string, days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const analytics = await this.prisma.analytics.findMany({
      where: {
        contentId,
        date: {
          gte: startDate,
        },
      },
      orderBy: {
        date: 'desc',
      },
    });

    // Calculate totals
    const totalViews = analytics.reduce((sum, record) => sum + record.views, 0);
    const totalUniqueVisitors = analytics.reduce((sum, record) => sum + record.uniqueVisitors, 0);

    return {
      contentId,
      period: {
        days,
        startDate,
        endDate: new Date(),
      },
      totals: {
        views: totalViews,
        uniqueVisitors: totalUniqueVisitors,
      },
      dailyStats: analytics.map((record) => ({
        date: record.date,
        views: record.views,
        uniqueVisitors: record.uniqueVisitors,
      })),
    };
  }

  /**
   * Get top content by views
   * @param limit Number of results to return
   * @param days Number of days to look back (default: 30)
   */
  async getTopContent(limit: number = 10, days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    // Aggregate views by content
    const topContent = await this.prisma.analytics.groupBy({
      by: ['contentId'],
      where: {
        date: {
          gte: startDate,
        },
      },
      _sum: {
        views: true,
        uniqueVisitors: true,
      },
      orderBy: {
        _sum: {
          views: 'desc',
        },
      },
      take: limit,
    });

    // Fetch content details
    const contentIds = topContent.map((item) => item.contentId);
    const contents = await this.prisma.content.findMany({
      where: {
        id: {
          in: contentIds,
        },
      },
      select: {
        id: true,
        title: true,
        slug: true,
        status: true,
        publishedAt: true,
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    // Map content details to analytics
    const contentMap = new Map(contents.map((c) => [c.id, c]));

    return topContent.map((item) => ({
      content: contentMap.get(item.contentId),
      views: item._sum.views || 0,
      uniqueVisitors: item._sum.uniqueVisitors || 0,
    }));
  }

  /**
   * Get dashboard summary statistics
   * Includes content counts by status, role, and total views
   */
  async getDashboardSummary() {
    // Get content counts by status
    const contentByStatus = await this.prisma.content.groupBy({
      by: ['status'],
      _count: {
        id: true,
      },
    });

    // Get content counts by author role
    const contentByRole = await this.prisma.content.groupBy({
      by: ['authorId'],
      _count: {
        id: true,
      },
    });

    // Fetch authors with their roles
    const authorIds = contentByRole.map((item) => item.authorId);
    const authors = await this.prisma.user.findMany({
      where: {
        id: {
          in: authorIds,
        },
      },
      select: {
        id: true,
        role: true,
      },
    });

    // Map author IDs to roles
    const authorRoleMap = new Map(authors.map((a) => [a.id, a.role]));

    // Aggregate by role
    const roleStats: Record<UserRole, number> = {
      [UserRole.ADMIN]: 0,
      [UserRole.EDITOR]: 0,
      [UserRole.AUTHOR]: 0,
      [UserRole.SUBSCRIBER]: 0,
    };

    contentByRole.forEach((item) => {
      const role = authorRoleMap.get(item.authorId);
      if (role) {
        roleStats[role] += item._count.id;
      }
    });

    // Get total views (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    const viewsStats = await this.prisma.analytics.aggregate({
      where: {
        date: {
          gte: thirtyDaysAgo,
        },
      },
      _sum: {
        views: true,
        uniqueVisitors: true,
      },
    });

    // Get total views all time
    const allTimeStats = await this.prisma.analytics.aggregate({
      _sum: {
        views: true,
        uniqueVisitors: true,
      },
    });

    // Format status counts
    const statusCounts: Record<ContentStatus, number> = {
      [ContentStatus.DRAFT]: 0,
      [ContentStatus.PUBLISHED]: 0,
      [ContentStatus.ARCHIVED]: 0,
      [ContentStatus.SCHEDULED]: 0,
    };

    contentByStatus.forEach((item) => {
      statusCounts[item.status] = item._count.id;
    });

    return {
      contentByStatus: statusCounts,
      contentByRole: roleStats,
      views: {
        last30Days: {
          total: viewsStats._sum.views || 0,
          unique: viewsStats._sum.uniqueVisitors || 0,
        },
        allTime: {
          total: allTimeStats._sum.views || 0,
          unique: allTimeStats._sum.uniqueVisitors || 0,
        },
      },
      totalContent: contentByStatus.reduce((sum, item) => sum + item._count.id, 0),
    };
  }
}
