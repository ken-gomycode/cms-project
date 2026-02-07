import { Test, TestingModule } from '@nestjs/testing';
import { ContentStatus, UserRole } from '@prisma/client';

import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';

describe('AnalyticsController', () => {
  let controller: AnalyticsController;
  let service: AnalyticsService;

  const mockAnalyticsService = {
    getContentStats: jest.fn(),
    getTopContent: jest.fn(),
    getDashboardSummary: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AnalyticsController],
      providers: [
        {
          provide: AnalyticsService,
          useValue: mockAnalyticsService,
        },
      ],
    }).compile();

    controller = module.get<AnalyticsController>(AnalyticsController);
    service = module.get<AnalyticsService>(AnalyticsService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getContentStats', () => {
    it('should return content statistics with default days', async () => {
      const contentId = 'content-123';
      const mockStats = {
        contentId,
        period: {
          days: 30,
          startDate: new Date(),
          endDate: new Date(),
        },
        totals: {
          views: 500,
          uniqueVisitors: 250,
        },
        dailyStats: [
          {
            date: new Date(),
            views: 100,
            uniqueVisitors: 50,
          },
        ],
      };

      mockAnalyticsService.getContentStats.mockResolvedValue(mockStats);

      const result = await controller.getContentStats(contentId, 30);

      expect(result).toEqual(mockStats);
      expect(mockAnalyticsService.getContentStats).toHaveBeenCalledWith(contentId, 30);
    });

    it('should return content statistics with custom days', async () => {
      const contentId = 'content-123';
      const days = 7;
      const mockStats = {
        contentId,
        period: {
          days,
          startDate: new Date(),
          endDate: new Date(),
        },
        totals: {
          views: 100,
          uniqueVisitors: 50,
        },
        dailyStats: [],
      };

      mockAnalyticsService.getContentStats.mockResolvedValue(mockStats);

      const result = await controller.getContentStats(contentId, days);

      expect(result).toEqual(mockStats);
      expect(mockAnalyticsService.getContentStats).toHaveBeenCalledWith(contentId, days);
    });
  });

  describe('getTopContent', () => {
    it('should return top content with default parameters', async () => {
      const mockTopContent = [
        {
          content: {
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
          views: 1000,
          uniqueVisitors: 500,
        },
        {
          content: {
            id: 'content-2',
            title: 'Second Post',
            slug: 'second-post',
            status: ContentStatus.PUBLISHED,
            publishedAt: new Date(),
            author: {
              id: 'user-2',
              firstName: 'Jane',
              lastName: 'Smith',
              email: 'jane@example.com',
            },
          },
          views: 800,
          uniqueVisitors: 400,
        },
      ];

      mockAnalyticsService.getTopContent.mockResolvedValue(mockTopContent);

      const result = await controller.getTopContent(10, 30);

      expect(result).toEqual(mockTopContent);
      expect(mockAnalyticsService.getTopContent).toHaveBeenCalledWith(10, 30);
    });

    it('should return top content with custom parameters', async () => {
      const limit = 5;
      const days = 7;
      const mockTopContent = [
        {
          content: {
            id: 'content-1',
            title: 'Top Post',
            slug: 'top-post',
            status: ContentStatus.PUBLISHED,
            publishedAt: new Date(),
            author: {
              id: 'user-1',
              firstName: 'John',
              lastName: 'Doe',
              email: 'john@example.com',
            },
          },
          views: 500,
          uniqueVisitors: 250,
        },
      ];

      mockAnalyticsService.getTopContent.mockResolvedValue(mockTopContent);

      const result = await controller.getTopContent(limit, days);

      expect(result).toEqual(mockTopContent);
      expect(mockAnalyticsService.getTopContent).toHaveBeenCalledWith(limit, days);
    });

    it('should return empty array when no top content exists', async () => {
      mockAnalyticsService.getTopContent.mockResolvedValue([]);

      const result = await controller.getTopContent(10, 30);

      expect(result).toEqual([]);
      expect(mockAnalyticsService.getTopContent).toHaveBeenCalledWith(10, 30);
    });
  });

  describe('getDashboardSummary', () => {
    it('should return dashboard summary statistics', async () => {
      const mockSummary = {
        contentByStatus: {
          [ContentStatus.DRAFT]: 5,
          [ContentStatus.PUBLISHED]: 10,
          [ContentStatus.ARCHIVED]: 2,
          [ContentStatus.SCHEDULED]: 1,
        },
        contentByRole: {
          [UserRole.ADMIN]: 8,
          [UserRole.EDITOR]: 6,
          [UserRole.AUTHOR]: 4,
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
        totalContent: 18,
      };

      mockAnalyticsService.getDashboardSummary.mockResolvedValue(mockSummary);

      const result = await controller.getDashboardSummary();

      expect(result).toEqual(mockSummary);
      expect(mockAnalyticsService.getDashboardSummary).toHaveBeenCalled();
    });

    it('should return summary with zero values when no data exists', async () => {
      const mockSummary = {
        contentByStatus: {
          [ContentStatus.DRAFT]: 0,
          [ContentStatus.PUBLISHED]: 0,
          [ContentStatus.ARCHIVED]: 0,
          [ContentStatus.SCHEDULED]: 0,
        },
        contentByRole: {
          [UserRole.ADMIN]: 0,
          [UserRole.EDITOR]: 0,
          [UserRole.AUTHOR]: 0,
          [UserRole.SUBSCRIBER]: 0,
        },
        views: {
          last30Days: {
            total: 0,
            unique: 0,
          },
          allTime: {
            total: 0,
            unique: 0,
          },
        },
        totalContent: 0,
      };

      mockAnalyticsService.getDashboardSummary.mockResolvedValue(mockSummary);

      const result = await controller.getDashboardSummary();

      expect(result).toEqual(mockSummary);
      expect(mockAnalyticsService.getDashboardSummary).toHaveBeenCalled();
    });
  });
});
