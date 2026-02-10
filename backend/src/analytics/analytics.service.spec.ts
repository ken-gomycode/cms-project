import { Test, TestingModule } from '@nestjs/testing';
import { ContentStatus, UserRole } from '@prisma/client';

import { CacheService } from '../cache/cache.service';
import { PrismaService } from '../prisma/prisma.service';

import { AnalyticsService } from './analytics.service';

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let prismaService: PrismaService;
  let cacheService: CacheService;

  const mockPrismaService = {
    analytics: {
      upsert: jest.fn(),
      findMany: jest.fn(),
      groupBy: jest.fn(),
      aggregate: jest.fn(),
    },
    content: {
      findMany: jest.fn(),
      groupBy: jest.fn(),
    },
    user: {
      findMany: jest.fn(),
    },
  };

  const mockCacheService = {
    sismember: jest.fn(),
    sadd: jest.fn(),
    expire: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: CacheService,
          useValue: mockCacheService,
        },
      ],
    }).compile();

    service = module.get<AnalyticsService>(AnalyticsService);
    prismaService = module.get<PrismaService>(PrismaService);
    cacheService = module.get<CacheService>(CacheService);

    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('trackView', () => {
    const contentId = 'content-123';
    const ipAddress = '192.168.1.1';
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    it('should track a new view with unique visitor', async () => {
      mockCacheService.sismember.mockResolvedValue(false); // New IP
      mockCacheService.sadd.mockResolvedValue(1);
      mockCacheService.expire.mockResolvedValue(true);
      mockPrismaService.analytics.upsert.mockResolvedValue({
        id: 'analytics-1',
        contentId,
        views: 1,
        uniqueVisitors: 1,
        date: today,
        createdAt: new Date(),
      });

      await service.trackView(contentId, ipAddress);

      // Verify Redis operations
      expect(mockCacheService.sismember).toHaveBeenCalledWith(
        expect.stringContaining(`analytics:views:${contentId}`),
        ipAddress,
      );
      expect(mockCacheService.sadd).toHaveBeenCalledWith(
        expect.stringContaining(`analytics:views:${contentId}`),
        ipAddress,
      );
      expect(mockCacheService.expire).toHaveBeenCalledWith(
        expect.stringContaining(`analytics:views:${contentId}`),
        30 * 24 * 60 * 60,
      );

      // Verify database operation
      expect(mockPrismaService.analytics.upsert).toHaveBeenCalledWith({
        where: {
          contentId_date: {
            contentId,
            date: expect.any(Date),
          },
        },
        update: {
          views: { increment: 1 },
          uniqueVisitors: { increment: 1 },
        },
        create: {
          contentId,
          date: expect.any(Date),
          views: 1,
          uniqueVisitors: 1,
        },
      });
    });

    it('should track a view without incrementing unique visitor for returning IP', async () => {
      mockCacheService.sismember.mockResolvedValue(true); // Existing IP
      mockCacheService.sadd.mockResolvedValue(0);
      mockCacheService.expire.mockResolvedValue(true);
      mockPrismaService.analytics.upsert.mockResolvedValue({
        id: 'analytics-1',
        contentId,
        views: 2,
        uniqueVisitors: 1,
        date: today,
        createdAt: new Date(),
      });

      await service.trackView(contentId, ipAddress);

      // Verify database operation - should NOT increment uniqueVisitors
      expect(mockPrismaService.analytics.upsert).toHaveBeenCalledWith({
        where: {
          contentId_date: {
            contentId,
            date: expect.any(Date),
          },
        },
        update: {
          views: { increment: 1 },
          uniqueVisitors: undefined,
        },
        create: {
          contentId,
          date: expect.any(Date),
          views: 1,
          uniqueVisitors: 1,
        },
      });
    });

    it('should not throw error when tracking fails', async () => {
      mockCacheService.sismember.mockRejectedValue(new Error('Redis error'));

      // Should not throw
      await expect(service.trackView(contentId, ipAddress)).resolves.not.toThrow();
    });
  });

  describe('getContentStats', () => {
    const contentId = 'content-123';

    it('should return content stats for specified period', async () => {
      const mockAnalytics = [
        {
          id: '1',
          contentId,
          views: 100,
          uniqueVisitors: 50,
          date: new Date('2024-01-10'),
          createdAt: new Date(),
        },
        {
          id: '2',
          contentId,
          views: 150,
          uniqueVisitors: 75,
          date: new Date('2024-01-09'),
          createdAt: new Date(),
        },
      ];

      mockPrismaService.analytics.findMany.mockResolvedValue(mockAnalytics);

      const result = await service.getContentStats(contentId, 30);

      expect(result).toEqual({
        contentId,
        period: {
          days: 30,
          startDate: expect.any(Date),
          endDate: expect.any(Date),
        },
        totals: {
          views: 250,
          uniqueVisitors: 125,
        },
        dailyStats: [
          {
            date: new Date('2024-01-10'),
            views: 100,
            uniqueVisitors: 50,
          },
          {
            date: new Date('2024-01-09'),
            views: 150,
            uniqueVisitors: 75,
          },
        ],
      });

      expect(mockPrismaService.analytics.findMany).toHaveBeenCalledWith({
        where: {
          contentId,
          date: {
            gte: expect.any(Date),
          },
        },
        orderBy: {
          date: 'desc',
        },
      });
    });

    it('should return empty stats when no analytics data exists', async () => {
      mockPrismaService.analytics.findMany.mockResolvedValue([]);

      const result = await service.getContentStats(contentId, 30);

      expect(result.totals.views).toBe(0);
      expect(result.totals.uniqueVisitors).toBe(0);
      expect(result.dailyStats).toEqual([]);
    });
  });

  describe('getTopContent', () => {
    it('should return top content by views', async () => {
      const mockGroupBy = [
        {
          contentId: 'content-1',
          _sum: { views: 500, uniqueVisitors: 250 },
        },
        {
          contentId: 'content-2',
          _sum: { views: 300, uniqueVisitors: 150 },
        },
      ];

      const mockContents = [
        {
          id: 'content-1',
          title: 'Popular Post',
          slug: 'popular-post',
          status: ContentStatus.PUBLISHED,
          publishedAt: new Date(),
          author: {
            id: 'user-1',
            firstName: 'John',
            lastName: 'Doe',
            email: 'john@example.com',
          },
        },
        {
          id: 'content-2',
          title: 'Another Post',
          slug: 'another-post',
          status: ContentStatus.PUBLISHED,
          publishedAt: new Date(),
          author: {
            id: 'user-2',
            firstName: 'Jane',
            lastName: 'Smith',
            email: 'jane@example.com',
          },
        },
      ];

      mockPrismaService.analytics.groupBy.mockResolvedValue(mockGroupBy);
      mockPrismaService.content.findMany.mockResolvedValue(mockContents);

      const result = await service.getTopContent(10, 30);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        content: mockContents[0],
        views: 500,
        uniqueVisitors: 250,
      });
      expect(result[1]).toEqual({
        content: mockContents[1],
        views: 300,
        uniqueVisitors: 150,
      });

      expect(mockPrismaService.analytics.groupBy).toHaveBeenCalledWith({
        by: ['contentId'],
        where: {
          date: {
            gte: expect.any(Date),
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
        take: 10,
      });
    });

    it('should return empty array when no analytics data exists', async () => {
      mockPrismaService.analytics.groupBy.mockResolvedValue([]);
      mockPrismaService.content.findMany.mockResolvedValue([]);

      const result = await service.getTopContent(10, 30);

      expect(result).toEqual([]);
    });
  });

  describe('getDashboardSummary', () => {
    it('should return comprehensive dashboard statistics', async () => {
      const mockContentByStatus = [
        { status: ContentStatus.PUBLISHED, _count: { id: 10 } },
        { status: ContentStatus.DRAFT, _count: { id: 5 } },
        { status: ContentStatus.ARCHIVED, _count: { id: 2 } },
      ];

      const mockContentByRole = [
        { authorId: 'user-1', _count: { id: 8 } },
        { authorId: 'user-2', _count: { id: 6 } },
        { authorId: 'user-3', _count: { id: 3 } },
      ];

      const mockAuthors = [
        { id: 'user-1', role: UserRole.ADMIN },
        { id: 'user-2', role: UserRole.EDITOR },
        { id: 'user-3', role: UserRole.AUTHOR },
      ];

      const mockViewsStats = {
        _sum: { views: 1000, uniqueVisitors: 500 },
      };

      const mockAllTimeStats = {
        _sum: { views: 5000, uniqueVisitors: 2500 },
      };

      mockPrismaService.content.groupBy
        .mockResolvedValueOnce(mockContentByStatus)
        .mockResolvedValueOnce(mockContentByRole);
      mockPrismaService.user.findMany.mockResolvedValue(mockAuthors);
      mockPrismaService.analytics.aggregate
        .mockResolvedValueOnce(mockViewsStats)
        .mockResolvedValueOnce(mockAllTimeStats);

      const result = await service.getDashboardSummary();

      expect(result).toEqual({
        contentByStatus: {
          [ContentStatus.DRAFT]: 5,
          [ContentStatus.PUBLISHED]: 10,
          [ContentStatus.ARCHIVED]: 2,
          [ContentStatus.SCHEDULED]: 0,
        },
        contentByRole: {
          [UserRole.ADMIN]: 8,
          [UserRole.EDITOR]: 6,
          [UserRole.AUTHOR]: 3,
          [UserRole.SUBSCRIBER]: 0,
        },
        views: {
          last30Days: {
            total: 1000,
            unique: 500,
          },
          allTime: {
            total: 5000,
            unique: 2500,
          },
        },
        totalContent: 17,
      });
    });
  });
});
