import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from '../prisma/prisma.service';
import { SeoAnalyzerService } from './seo-analyzer.service';

describe('SeoAnalyzerService', () => {
  let service: SeoAnalyzerService;
  let prisma: PrismaService;

  const mockPrismaService = {
    content: {
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SeoAnalyzerService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<SeoAnalyzerService>(SeoAnalyzerService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('analyze', () => {
    const contentId = 'content-123';

    it('should return perfect score (100) for optimized content', async () => {
      const mockContent = {
        id: contentId,
        title: 'Test Article',
        body: `# Introduction\n\n${'Lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. '.repeat(30)}`,
        excerpt: 'Test excerpt',
        seoMetadata: {
          metaTitle: 'Optimal meta title with exactly 55 characters here',
          metaDescription:
            'This is an optimal meta description that falls within the recommended range of 150 to 160 characters for best SEO practices and search visibility today.',
        },
        featuredImage: {
          id: 'image-123',
          url: 'https://example.com/image.jpg',
          altText: 'Descriptive alt text',
        },
      };

      mockPrismaService.content.findUnique.mockResolvedValue(mockContent);

      const result = await service.analyze(contentId);

      expect(result.score).toBe(100);
      expect(result.checks).toHaveLength(5);
      expect(result.checks.every((check) => check.passed)).toBe(true);
    });

    it('should return low score for content with no SEO optimization', async () => {
      const mockContent = {
        id: contentId,
        title: 'Test',
        body: 'Short content without headings.',
        excerpt: null,
        seoMetadata: null,
        featuredImage: null,
      };

      mockPrismaService.content.findUnique.mockResolvedValue(mockContent);

      const result = await service.analyze(contentId);

      expect(result.score).toBeLessThan(50);
      expect(result.checks).toHaveLength(5);
      expect(result.checks.filter((check) => !check.passed).length).toBeGreaterThan(3);
    });

    it('should check metaTitle length correctly', async () => {
      const mockContent = {
        id: contentId,
        title: 'Test',
        body: `# Test\n\n${'word '.repeat(100)}`,
        seoMetadata: {
          metaTitle: 'Short',
          metaDescription:
            'This is an optimal meta description that falls within the recommended range of 150 to 160 characters for best SEO practices and maximum visibility.',
        },
        featuredImage: {
          altText: 'Alt text',
        },
      };

      mockPrismaService.content.findUnique.mockResolvedValue(mockContent);

      const result = await service.analyze(contentId);

      const titleCheck = result.checks.find((c) => c.name === 'Meta Title Length');
      expect(titleCheck).toBeDefined();
      expect(titleCheck?.passed).toBe(false);
      expect(titleCheck?.message).toContain('too short');
    });

    it('should check metaDescription length correctly', async () => {
      const mockContent = {
        id: contentId,
        title: 'Test',
        body: `# Test\n\n${'word '.repeat(100)}`,
        seoMetadata: {
          metaTitle: 'This is an optimal meta title with 55 characters!',
          metaDescription: 'Too short',
        },
        featuredImage: {
          altText: 'Alt text',
        },
      };

      mockPrismaService.content.findUnique.mockResolvedValue(mockContent);

      const result = await service.analyze(contentId);

      const descCheck = result.checks.find((c) => c.name === 'Meta Description Length');
      expect(descCheck).toBeDefined();
      expect(descCheck?.passed).toBe(false);
      expect(descCheck?.message).toContain('too short');
    });

    it('should check content word count correctly', async () => {
      const mockContent = {
        id: contentId,
        title: 'Test',
        body: `# Test\n\n${'word '.repeat(350)}`, // 350 words
        seoMetadata: {
          metaTitle: 'This is an optimal meta title with 55 characters!',
          metaDescription:
            'This is an optimal meta description that falls within the recommended range of 150 to 160 characters for best SEO practices and maximum visibility.',
        },
        featuredImage: {
          altText: 'Alt text',
        },
      };

      mockPrismaService.content.findUnique.mockResolvedValue(mockContent);

      const result = await service.analyze(contentId);

      const wordCountCheck = result.checks.find((c) => c.name === 'Content Word Count');
      expect(wordCountCheck).toBeDefined();
      expect(wordCountCheck?.passed).toBe(true);
      expect(wordCountCheck?.message).toMatch(/\d+/);
    });

    it('should detect markdown headings', async () => {
      const mockContent = {
        id: contentId,
        title: 'Test',
        body: `# Main Heading\n\n${'word '.repeat(100)}\n\n## Subheading\n\nMore content.`,
        seoMetadata: {
          metaTitle: 'This is an optimal meta title with 55 characters!',
          metaDescription:
            'This is an optimal meta description that falls within the recommended range of 150 to 160 characters for best SEO practices and maximum visibility.',
        },
        featuredImage: {
          altText: 'Alt text',
        },
      };

      mockPrismaService.content.findUnique.mockResolvedValue(mockContent);

      const result = await service.analyze(contentId);

      const headingsCheck = result.checks.find((c) => c.name === 'Content Structure (Headings)');
      expect(headingsCheck).toBeDefined();
      expect(headingsCheck?.passed).toBe(true);
    });

    it('should detect HTML headings', async () => {
      const mockContent = {
        id: contentId,
        title: 'Test',
        body: `<h1>Main Heading</h1><p>${'word '.repeat(100)}</p><h2>Subheading</h2>`,
        seoMetadata: {
          metaTitle: 'This is an optimal meta title with 55 characters!',
          metaDescription:
            'This is an optimal meta description that falls within the recommended range of 150 to 160 characters for best SEO practices and maximum visibility.',
        },
        featuredImage: {
          altText: 'Alt text',
        },
      };

      mockPrismaService.content.findUnique.mockResolvedValue(mockContent);

      const result = await service.analyze(contentId);

      const headingsCheck = result.checks.find((c) => c.name === 'Content Structure (Headings)');
      expect(headingsCheck).toBeDefined();
      expect(headingsCheck?.passed).toBe(true);
    });

    it('should check featured image alt text', async () => {
      const mockContent = {
        id: contentId,
        title: 'Test',
        body: `# Test\n\n${'word '.repeat(100)}`,
        seoMetadata: {
          metaTitle: 'This is an optimal meta title with 55 characters!',
          metaDescription:
            'This is an optimal meta description that falls within the recommended range of 150 to 160 characters for best SEO practices and maximum visibility.',
        },
        featuredImage: {
          url: 'https://example.com/image.jpg',
          altText: null,
        },
      };

      mockPrismaService.content.findUnique.mockResolvedValue(mockContent);

      const result = await service.analyze(contentId);

      const altTextCheck = result.checks.find((c) => c.name === 'Featured Image Alt Text');
      expect(altTextCheck).toBeDefined();
      expect(altTextCheck?.passed).toBe(false);
      expect(altTextCheck?.message).toContain('missing alt text');
    });

    it('should handle content with no featured image', async () => {
      const mockContent = {
        id: contentId,
        title: 'Test',
        body: `# Test\n\n${'word '.repeat(100)}`,
        seoMetadata: {
          metaTitle: 'This is an optimal meta title with 55 characters!',
          metaDescription:
            'This is an optimal meta description that falls within the recommended range of 150 to 160 characters for best SEO practices and maximum visibility.',
        },
        featuredImage: null,
      };

      mockPrismaService.content.findUnique.mockResolvedValue(mockContent);

      const result = await service.analyze(contentId);

      const altTextCheck = result.checks.find((c) => c.name === 'Featured Image Alt Text');
      expect(altTextCheck).toBeDefined();
      expect(altTextCheck?.passed).toBe(false);
      expect(altTextCheck?.message).toContain('No featured image');
    });

    it('should throw NotFoundException if content does not exist', async () => {
      mockPrismaService.content.findUnique.mockResolvedValue(null);

      await expect(service.analyze(contentId)).rejects.toThrow(NotFoundException);
      await expect(service.analyze(contentId)).rejects.toThrow(
        `Content with ID ${contentId} not found`,
      );
    });

    it('should handle HTML tags in word count calculation', async () => {
      const mockContent = {
        id: contentId,
        title: 'Test',
        body: `<h1>Test</h1><p>${'word '.repeat(350)}</p>`,
        seoMetadata: {
          metaTitle: 'This is an optimal meta title with 55 characters!',
          metaDescription:
            'This is an optimal meta description that falls within the recommended range of 150 to 160 characters for best SEO practices and maximum visibility.',
        },
        featuredImage: {
          altText: 'Alt text',
        },
      };

      mockPrismaService.content.findUnique.mockResolvedValue(mockContent);

      const result = await service.analyze(contentId);

      const wordCountCheck = result.checks.find((c) => c.name === 'Content Word Count');
      expect(wordCountCheck).toBeDefined();
      expect(wordCountCheck?.passed).toBe(true);
    });

    it('should handle metaTitle that is too long', async () => {
      const mockContent = {
        id: contentId,
        title: 'Test',
        body: `# Test\n\n${'word '.repeat(100)}`,
        seoMetadata: {
          metaTitle:
            'This is a very long meta title that exceeds the recommended 60 character limit',
          metaDescription:
            'This is an optimal meta description that falls within the recommended range of 150 to 160 characters for best SEO practices and maximum visibility.',
        },
        featuredImage: {
          altText: 'Alt text',
        },
      };

      mockPrismaService.content.findUnique.mockResolvedValue(mockContent);

      const result = await service.analyze(contentId);

      const titleCheck = result.checks.find((c) => c.name === 'Meta Title Length');
      expect(titleCheck).toBeDefined();
      expect(titleCheck?.passed).toBe(false);
      expect(titleCheck?.message).toContain('too long');
    });
  });
});
