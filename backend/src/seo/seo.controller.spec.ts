import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { UserRole } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { CreateSeoDto } from './dto/create-seo.dto';
import { SeoAnalyzerService } from './seo-analyzer.service';
import { SeoController } from './seo.controller';
import { SeoService } from './seo.service';

describe('SeoController', () => {
  let controller: SeoController;
  let seoService: SeoService;
  let seoAnalyzerService: SeoAnalyzerService;
  let prismaService: PrismaService;

  const mockSeoService = {
    createOrUpdate: jest.fn(),
    findByContentId: jest.fn(),
    remove: jest.fn(),
  };

  const mockSeoAnalyzerService = {
    analyze: jest.fn(),
  };

  const mockPrismaService = {
    content: {
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SeoController],
      providers: [
        {
          provide: SeoService,
          useValue: mockSeoService,
        },
        {
          provide: SeoAnalyzerService,
          useValue: mockSeoAnalyzerService,
        },
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    controller = module.get<SeoController>(SeoController);
    seoService = module.get<SeoService>(SeoService);
    seoAnalyzerService = module.get<SeoAnalyzerService>(SeoAnalyzerService);
    prismaService = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createOrUpdate', () => {
    const contentId = 'content-123';
    const authorId = 'author-123';
    const dto: CreateSeoDto = {
      metaTitle: 'Test Meta Title',
      metaDescription: 'Test meta description',
    };

    const mockSeoMetadata = {
      id: 'seo-123',
      contentId,
      ...dto,
      canonicalUrl: null,
      ogTitle: null,
      ogDescription: null,
      ogImage: null,
      robots: null,
      structuredData: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should create/update SEO metadata as content owner', async () => {
      const user = {
        id: authorId,
        email: 'author@example.com',
        firstName: 'John',
        lastName: 'Doe',
        role: UserRole.AUTHOR,
      };

      mockPrismaService.content.findUnique.mockResolvedValue({
        id: contentId,
        authorId,
      });
      mockSeoService.createOrUpdate.mockResolvedValue(mockSeoMetadata);

      const result = await controller.createOrUpdate(contentId, dto, user);

      expect(result).toEqual(mockSeoMetadata);
      expect(seoService.createOrUpdate).toHaveBeenCalledWith(contentId, dto);
    });

    it('should create/update SEO metadata as Editor', async () => {
      const user = {
        id: 'editor-123',
        email: 'editor@example.com',
        firstName: 'Jane',
        lastName: 'Editor',
        role: UserRole.EDITOR,
      };

      mockSeoService.createOrUpdate.mockResolvedValue(mockSeoMetadata);

      const result = await controller.createOrUpdate(contentId, dto, user);

      expect(result).toEqual(mockSeoMetadata);
      expect(prismaService.content.findUnique).not.toHaveBeenCalled();
    });

    it('should create/update SEO metadata as Admin', async () => {
      const user = {
        id: 'admin-123',
        email: 'admin@example.com',
        firstName: 'Admin',
        lastName: 'User',
        role: UserRole.ADMIN,
      };

      mockSeoService.createOrUpdate.mockResolvedValue(mockSeoMetadata);

      const result = await controller.createOrUpdate(contentId, dto, user);

      expect(result).toEqual(mockSeoMetadata);
      expect(prismaService.content.findUnique).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException if author is not owner', async () => {
      const user = {
        id: 'other-author-123',
        email: 'other@example.com',
        firstName: 'Other',
        lastName: 'Author',
        role: UserRole.AUTHOR,
      };

      mockPrismaService.content.findUnique.mockResolvedValue({
        id: contentId,
        authorId,
      });

      await expect(controller.createOrUpdate(contentId, dto, user)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw NotFoundException if content does not exist', async () => {
      const user = {
        id: authorId,
        email: 'author@example.com',
        firstName: 'John',
        lastName: 'Doe',
        role: UserRole.AUTHOR,
      };

      mockPrismaService.content.findUnique.mockResolvedValue(null);

      await expect(controller.createOrUpdate(contentId, dto, user)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findByContentId', () => {
    const contentId = 'content-123';

    it('should return SEO metadata for content', async () => {
      const mockSeoMetadata = {
        id: 'seo-123',
        contentId,
        metaTitle: 'Test Meta Title',
        metaDescription: 'Test description',
        canonicalUrl: null,
        ogTitle: null,
        ogDescription: null,
        ogImage: null,
        robots: null,
        structuredData: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockSeoService.findByContentId.mockResolvedValue(mockSeoMetadata);

      const result = await controller.findByContentId(contentId);

      expect(result).toEqual(mockSeoMetadata);
      expect(seoService.findByContentId).toHaveBeenCalledWith(contentId);
    });

    it('should throw NotFoundException if SEO metadata not found', async () => {
      mockSeoService.findByContentId.mockRejectedValue(
        new NotFoundException('SEO metadata not found'),
      );

      await expect(controller.findByContentId(contentId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    const contentId = 'content-123';
    const authorId = 'author-123';

    it('should delete SEO metadata as content owner', async () => {
      const user = {
        id: authorId,
        email: 'author@example.com',
        firstName: 'John',
        lastName: 'Doe',
        role: UserRole.AUTHOR,
      };

      mockPrismaService.content.findUnique.mockResolvedValue({
        id: contentId,
        authorId,
      });
      mockSeoService.remove.mockResolvedValue(undefined);

      const result = await controller.remove(contentId, user);

      expect(result).toEqual({ message: 'SEO metadata deleted successfully' });
      expect(seoService.remove).toHaveBeenCalledWith(contentId);
    });

    it('should delete SEO metadata as Editor', async () => {
      const user = {
        id: 'editor-123',
        email: 'editor@example.com',
        firstName: 'Jane',
        lastName: 'Editor',
        role: UserRole.EDITOR,
      };

      mockSeoService.remove.mockResolvedValue(undefined);

      const result = await controller.remove(contentId, user);

      expect(result).toEqual({ message: 'SEO metadata deleted successfully' });
      expect(prismaService.content.findUnique).not.toHaveBeenCalled();
    });

    it('should delete SEO metadata as Admin', async () => {
      const user = {
        id: 'admin-123',
        email: 'admin@example.com',
        firstName: 'Admin',
        lastName: 'User',
        role: UserRole.ADMIN,
      };

      mockSeoService.remove.mockResolvedValue(undefined);

      const result = await controller.remove(contentId, user);

      expect(result).toEqual({ message: 'SEO metadata deleted successfully' });
      expect(prismaService.content.findUnique).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException if author is not owner', async () => {
      const user = {
        id: 'other-author-123',
        email: 'other@example.com',
        firstName: 'Other',
        lastName: 'Author',
        role: UserRole.AUTHOR,
      };

      mockPrismaService.content.findUnique.mockResolvedValue({
        id: contentId,
        authorId,
      });

      await expect(controller.remove(contentId, user)).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if content does not exist', async () => {
      const user = {
        id: authorId,
        email: 'author@example.com',
        firstName: 'John',
        lastName: 'Doe',
        role: UserRole.AUTHOR,
      };

      mockPrismaService.content.findUnique.mockResolvedValue(null);

      await expect(controller.remove(contentId, user)).rejects.toThrow(NotFoundException);
    });
  });

  describe('analyze', () => {
    const contentId = 'content-123';

    it('should analyze SEO for content', async () => {
      const mockScore = {
        score: 85,
        checks: [
          {
            name: 'Meta Title Length',
            passed: true,
            message: 'Meta title length is optimal',
          },
          {
            name: 'Meta Description Length',
            passed: true,
            message: 'Meta description length is optimal',
          },
          {
            name: 'Content Word Count',
            passed: true,
            message: 'Content has sufficient word count',
          },
          {
            name: 'Content Structure (Headings)',
            passed: true,
            message: 'Content includes headings',
          },
          {
            name: 'Featured Image Alt Text',
            passed: false,
            message: 'Featured image is missing alt text',
          },
        ],
      };

      mockSeoAnalyzerService.analyze.mockResolvedValue(mockScore);

      const result = await controller.analyze(contentId);

      expect(result).toEqual(mockScore);
      expect(seoAnalyzerService.analyze).toHaveBeenCalledWith(contentId);
    });

    it('should throw NotFoundException if content does not exist', async () => {
      mockSeoAnalyzerService.analyze.mockRejectedValue(new NotFoundException('Content not found'));

      await expect(controller.analyze(contentId)).rejects.toThrow(NotFoundException);
    });

    it('should work for any authenticated user including subscribers', async () => {
      const mockScore = {
        score: 100,
        checks: [],
      };

      mockSeoAnalyzerService.analyze.mockResolvedValue(mockScore);

      const result = await controller.analyze(contentId);

      expect(result).toEqual(mockScore);
    });
  });
});
