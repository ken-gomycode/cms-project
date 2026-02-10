import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from '../prisma/prisma.service';

import { CreateSeoDto } from './dto/create-seo.dto';
import { SeoService } from './seo.service';

describe('SeoService', () => {
  let service: SeoService;
  let prisma: PrismaService;

  const mockPrismaService = {
    content: {
      findUnique: jest.fn(),
    },
    seoMetadata: {
      upsert: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SeoService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<SeoService>(SeoService);
    prisma = module.get<PrismaService>(PrismaService);

    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createOrUpdate', () => {
    const contentId = 'content-123';
    const mockContent = {
      id: contentId,
      title: 'Test Article Title',
      body: 'This is a test article body content with more than 160 characters to test auto-generation. Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
      excerpt: 'This is a test excerpt',
      slug: 'test-article',
    };

    it('should create SEO metadata with provided data', async () => {
      const dto: CreateSeoDto = {
        metaTitle: 'Custom Meta Title',
        metaDescription: 'Custom meta description for SEO',
        canonicalUrl: 'https://example.com/test',
        ogTitle: 'OG Title',
        ogDescription: 'OG Description',
        ogImage: 'https://example.com/image.jpg',
        robots: 'index, follow',
        structuredData: { '@type': 'Article' },
      };

      const mockSeoMetadata = {
        id: 'seo-123',
        contentId,
        ...dto,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.content.findUnique.mockResolvedValue(mockContent);
      mockPrismaService.seoMetadata.upsert.mockResolvedValue(mockSeoMetadata);

      const result = await service.createOrUpdate(contentId, dto);

      expect(prisma.content.findUnique).toHaveBeenCalledWith({
        where: { id: contentId },
      });
      expect(prisma.seoMetadata.upsert).toHaveBeenCalled();
      expect(result).toEqual(mockSeoMetadata);
    });

    it('should auto-generate metadata when not provided', async () => {
      const dto: CreateSeoDto = {};

      const mockSeoMetadata = {
        id: 'seo-123',
        contentId,
        metaTitle: 'Test Article Title',
        metaDescription: 'This is a test excerpt',
        canonicalUrl: null,
        ogTitle: null,
        ogDescription: null,
        ogImage: null,
        robots: null,
        structuredData: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.content.findUnique.mockResolvedValue(mockContent);
      mockPrismaService.seoMetadata.upsert.mockResolvedValue(mockSeoMetadata);

      const result = await service.createOrUpdate(contentId, dto);

      expect(prisma.content.findUnique).toHaveBeenCalled();
      expect(prisma.seoMetadata.upsert).toHaveBeenCalled();
      expect(result.metaTitle).toBeTruthy();
      expect(result.metaDescription).toBeTruthy();
    });

    it('should truncate long title to 60 chars', async () => {
      const longTitle =
        'This is a very long title that exceeds sixty characters and should be truncated';
      const contentWithLongTitle = {
        ...mockContent,
        title: longTitle,
      };

      const dto: CreateSeoDto = {};

      mockPrismaService.content.findUnique.mockResolvedValue(contentWithLongTitle);
      mockPrismaService.seoMetadata.upsert.mockImplementation((args) => {
        return Promise.resolve({
          id: 'seo-123',
          contentId,
          ...args.create,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      });

      const result = await service.createOrUpdate(contentId, dto);

      expect(result.metaTitle).toBeTruthy();
      expect(result.metaTitle!.length).toBeLessThanOrEqual(60);
      expect(result.metaTitle).toContain('...');
    });

    it('should truncate long description to 160 chars', async () => {
      const longBody =
        'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.';
      const contentWithLongBody = {
        ...mockContent,
        excerpt: null,
        body: longBody,
      };

      const dto: CreateSeoDto = {};

      mockPrismaService.content.findUnique.mockResolvedValue(contentWithLongBody);
      mockPrismaService.seoMetadata.upsert.mockImplementation((args) => {
        return Promise.resolve({
          id: 'seo-123',
          contentId,
          ...args.create,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      });

      const result = await service.createOrUpdate(contentId, dto);

      expect(result.metaDescription).toBeTruthy();
      expect(result.metaDescription!.length).toBeLessThanOrEqual(160);
      expect(result.metaDescription).toContain('...');
    });

    it('should throw NotFoundException if content does not exist', async () => {
      const dto: CreateSeoDto = {};

      mockPrismaService.content.findUnique.mockResolvedValue(null);

      await expect(service.createOrUpdate(contentId, dto)).rejects.toThrow(NotFoundException);
      await expect(service.createOrUpdate(contentId, dto)).rejects.toThrow(
        `Content with ID ${contentId} not found`,
      );
    });

    it('should update existing SEO metadata', async () => {
      const dto: CreateSeoDto = {
        metaTitle: 'Updated Meta Title',
      };

      const mockUpdatedSeoMetadata = {
        id: 'seo-123',
        contentId,
        metaTitle: 'Updated Meta Title',
        metaDescription: 'Original description',
        canonicalUrl: null,
        ogTitle: null,
        ogDescription: null,
        ogImage: null,
        robots: null,
        structuredData: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.content.findUnique.mockResolvedValue(mockContent);
      mockPrismaService.seoMetadata.upsert.mockResolvedValue(mockUpdatedSeoMetadata);

      const result = await service.createOrUpdate(contentId, dto);

      expect(result.metaTitle).toBe('Updated Meta Title');
    });
  });

  describe('findByContentId', () => {
    const contentId = 'content-123';

    it('should return SEO metadata for content', async () => {
      const mockContent = {
        id: contentId,
        title: 'Test',
      };

      const mockSeoMetadata = {
        id: 'seo-123',
        contentId,
        metaTitle: 'Test Meta Title',
        metaDescription: 'Test meta description',
        canonicalUrl: null,
        ogTitle: null,
        ogDescription: null,
        ogImage: null,
        robots: null,
        structuredData: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.content.findUnique.mockResolvedValue(mockContent);
      mockPrismaService.seoMetadata.findUnique.mockResolvedValue(mockSeoMetadata);

      const result = await service.findByContentId(contentId);

      expect(prisma.content.findUnique).toHaveBeenCalledWith({
        where: { id: contentId },
      });
      expect(prisma.seoMetadata.findUnique).toHaveBeenCalledWith({
        where: { contentId },
      });
      expect(result).toEqual(mockSeoMetadata);
    });

    it('should throw NotFoundException if content does not exist', async () => {
      mockPrismaService.content.findUnique.mockResolvedValue(null);

      await expect(service.findByContentId(contentId)).rejects.toThrow(NotFoundException);
      await expect(service.findByContentId(contentId)).rejects.toThrow(
        `Content with ID ${contentId} not found`,
      );
    });

    it('should throw NotFoundException if SEO metadata does not exist', async () => {
      const mockContent = {
        id: contentId,
        title: 'Test',
      };

      mockPrismaService.content.findUnique.mockResolvedValue(mockContent);
      mockPrismaService.seoMetadata.findUnique.mockResolvedValue(null);

      await expect(service.findByContentId(contentId)).rejects.toThrow(NotFoundException);
      await expect(service.findByContentId(contentId)).rejects.toThrow(
        `SEO metadata for content ${contentId} not found`,
      );
    });
  });

  describe('remove', () => {
    const contentId = 'content-123';

    it('should delete SEO metadata for content', async () => {
      const mockSeoMetadata = {
        id: 'seo-123',
        contentId,
        metaTitle: 'Test',
        metaDescription: 'Test',
      };

      mockPrismaService.seoMetadata.findUnique.mockResolvedValue(mockSeoMetadata);
      mockPrismaService.seoMetadata.delete.mockResolvedValue(mockSeoMetadata);

      await service.remove(contentId);

      expect(prisma.seoMetadata.findUnique).toHaveBeenCalledWith({
        where: { contentId },
      });
      expect(prisma.seoMetadata.delete).toHaveBeenCalledWith({
        where: { contentId },
      });
    });

    it('should throw NotFoundException if SEO metadata does not exist', async () => {
      mockPrismaService.seoMetadata.findUnique.mockResolvedValue(null);

      await expect(service.remove(contentId)).rejects.toThrow(NotFoundException);
      await expect(service.remove(contentId)).rejects.toThrow(
        `SEO metadata for content ${contentId} not found`,
      );
    });
  });
});
