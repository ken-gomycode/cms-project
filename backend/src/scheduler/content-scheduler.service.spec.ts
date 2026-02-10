import { Test, TestingModule } from '@nestjs/testing';
import { ContentStatus } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

import { ContentSchedulerService } from './content-scheduler.service';

describe('ContentSchedulerService', () => {
  let service: ContentSchedulerService;
  let prisma: PrismaService;

  const mockPrismaService = {
    content: {
      findMany: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContentSchedulerService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<ContentSchedulerService>(ContentSchedulerService);
    prisma = module.get<PrismaService>(PrismaService);

    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('publishScheduledContent', () => {
    it('should publish scheduled content when scheduledAt <= now', async () => {
      const pastDate = new Date(Date.now() - 60000); // 1 minute ago
      const scheduledContent = [
        {
          id: 'content-1',
          title: 'Scheduled Post 1',
          scheduledAt: pastDate,
        },
        {
          id: 'content-2',
          title: 'Scheduled Post 2',
          scheduledAt: pastDate,
        },
      ];

      mockPrismaService.content.findMany.mockResolvedValue(scheduledContent);
      mockPrismaService.content.update.mockResolvedValue({});

      await service.publishScheduledContent();

      // Verify findMany was called with correct filter
      expect(mockPrismaService.content.findMany).toHaveBeenCalledWith({
        where: {
          status: ContentStatus.SCHEDULED,
          scheduledAt: {
            lte: expect.any(Date),
          },
        },
        select: {
          id: true,
          title: true,
          scheduledAt: true,
        },
      });

      // Verify update was called for each content
      expect(mockPrismaService.content.update).toHaveBeenCalledTimes(2);
      expect(mockPrismaService.content.update).toHaveBeenCalledWith({
        where: { id: 'content-1' },
        data: {
          status: ContentStatus.PUBLISHED,
          publishedAt: expect.any(Date),
        },
      });
      expect(mockPrismaService.content.update).toHaveBeenCalledWith({
        where: { id: 'content-2' },
        data: {
          status: ContentStatus.PUBLISHED,
          publishedAt: expect.any(Date),
        },
      });
    });

    it('should do nothing when no scheduled content is found', async () => {
      mockPrismaService.content.findMany.mockResolvedValue([]);

      await service.publishScheduledContent();

      expect(mockPrismaService.content.findMany).toHaveBeenCalledTimes(1);
      expect(mockPrismaService.content.update).not.toHaveBeenCalled();
    });

    it('should continue processing other content if one fails', async () => {
      const pastDate = new Date(Date.now() - 60000);
      const scheduledContent = [
        {
          id: 'content-1',
          title: 'Scheduled Post 1',
          scheduledAt: pastDate,
        },
        {
          id: 'content-2',
          title: 'Scheduled Post 2',
          scheduledAt: pastDate,
        },
      ];

      mockPrismaService.content.findMany.mockResolvedValue(scheduledContent);
      mockPrismaService.content.update
        .mockRejectedValueOnce(new Error('Database error'))
        .mockResolvedValueOnce({});

      await service.publishScheduledContent();

      // Verify both updates were attempted
      expect(mockPrismaService.content.update).toHaveBeenCalledTimes(2);
    });

    it('should handle errors in findMany gracefully', async () => {
      mockPrismaService.content.findMany.mockRejectedValue(new Error('Database error'));

      // Should not throw
      await expect(service.publishScheduledContent()).resolves.not.toThrow();

      expect(mockPrismaService.content.update).not.toHaveBeenCalled();
    });
  });

  describe('triggerScheduledContentCheck', () => {
    it('should manually publish scheduled content and return count', async () => {
      mockPrismaService.content.updateMany.mockResolvedValue({ count: 3 });

      const result = await service.triggerScheduledContentCheck();

      expect(result).toBe(3);
      expect(mockPrismaService.content.updateMany).toHaveBeenCalledWith({
        where: {
          status: ContentStatus.SCHEDULED,
          scheduledAt: {
            lte: expect.any(Date),
          },
        },
        data: {
          status: ContentStatus.PUBLISHED,
          publishedAt: expect.any(Date),
        },
      });
    });

    it('should return 0 when no content to publish', async () => {
      mockPrismaService.content.updateMany.mockResolvedValue({ count: 0 });

      const result = await service.triggerScheduledContentCheck();

      expect(result).toBe(0);
      expect(mockPrismaService.content.updateMany).toHaveBeenCalledTimes(1);
    });
  });
});
