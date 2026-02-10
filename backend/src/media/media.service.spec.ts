import { promises as fs } from 'fs';
import * as path from 'path';

import { NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import * as sharp from 'sharp';

import { PrismaService } from '../prisma/prisma.service';

import { MediaService } from './media.service';

jest.mock('fs', () => {
  const actualFs = jest.requireActual('fs');
  return {
    ...actualFs,
    promises: {
      writeFile: jest.fn(),
      unlink: jest.fn(),
    },
  };
});

jest.mock('sharp');

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-uuid-1234'),
}));

describe('MediaService', () => {
  let service: MediaService;
  let prisma: PrismaService;
  let configService: ConfigService;

  const mockPrismaService = {
    media: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
  };

  const mockConfigService = {
    get: jest.fn().mockImplementation((key: string) => {
      if (key === 'UPLOAD_DIR') return './uploads';
      if (key === 'MAX_FILE_SIZE') return 10485760;
      return null;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MediaService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<MediaService>(MediaService);
    prisma = module.get<PrismaService>(PrismaService);
    configService = module.get<ConfigService>(ConfigService);

    // Reset all mocks
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('upload', () => {
    const mockFile = {
      fieldname: 'file',
      originalname: 'test.jpg',
      encoding: '7bit',
      mimetype: 'image/jpeg',
      size: 1024,
      buffer: Buffer.from('test'),
      destination: '',
      filename: '',
      path: '',
    } as Express.Multer.File;

    const mockUserId = 'user-123';
    const mockMediaRecord = {
      id: 'media-123',
      filename: 'test-uuid.jpg',
      originalName: 'test.jpg',
      mimeType: 'image/jpeg',
      size: 1024,
      url: '/uploads/test-uuid-optimized.jpg',
      thumbnailUrl: '/uploads/test-uuid-thumb.jpg',
      altText: 'Test image',
      uploadedById: mockUserId,
      createdAt: new Date(),
    };

    beforeEach(() => {
      (fs.writeFile as jest.Mock).mockResolvedValue(undefined);
      mockPrismaService.media.create.mockResolvedValue(mockMediaRecord);

      // Mock sharp for image optimization
      const mockSharpInstance = {
        resize: jest.fn().mockReturnThis(),
        jpeg: jest.fn().mockReturnThis(),
        toFile: jest.fn().mockResolvedValue(undefined),
      };
      (sharp as unknown as jest.Mock).mockReturnValue(mockSharpInstance);
    });

    it('should upload a non-image file successfully', async () => {
      const pdfFile = {
        ...mockFile,
        originalname: 'document.pdf',
        mimetype: 'application/pdf',
      };

      const result = await service.upload(pdfFile, mockUserId, 'Test document');

      expect(fs.writeFile).toHaveBeenCalled();
      expect(mockPrismaService.media.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            originalName: 'document.pdf',
            mimeType: 'application/pdf',
            size: 1024,
            uploadedById: mockUserId,
            altText: 'Test document',
          }),
        }),
      );
      expect(result).toEqual(mockMediaRecord);
    });

    it('should upload an image file with optimization', async () => {
      const result = await service.upload(mockFile, mockUserId, 'Test image');

      expect(fs.writeFile).toHaveBeenCalled();
      expect(sharp).toHaveBeenCalled();
      expect(mockPrismaService.media.create).toHaveBeenCalled();
      expect(result).toEqual(mockMediaRecord);
    });

    it('should upload without altText', async () => {
      await service.upload(mockFile, mockUserId);

      expect(mockPrismaService.media.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            altText: null,
          }),
        }),
      );
    });

    it('should throw InternalServerErrorException on upload failure', async () => {
      (fs.writeFile as jest.Mock).mockRejectedValue(new Error('Write failed'));

      await expect(service.upload(mockFile, mockUserId)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('findAll', () => {
    const mockMedia = [
      {
        id: 'media-1',
        filename: 'file1.jpg',
        originalName: 'file1.jpg',
        mimeType: 'image/jpeg',
        size: 1024,
        url: '/uploads/file1.jpg',
        thumbnailUrl: '/uploads/file1-thumb.jpg',
        altText: null,
        uploadedById: 'user-1',
        createdAt: new Date(),
        uploadedBy: {
          id: 'user-1',
          email: 'user1@example.com',
          firstName: 'John',
          lastName: 'Doe',
        },
      },
    ];

    beforeEach(() => {
      mockPrismaService.media.findMany.mockResolvedValue(mockMedia);
      mockPrismaService.media.count.mockResolvedValue(1);
    });

    it('should return paginated media without filter', async () => {
      const result = await service.findAll(1, 10);

      expect(mockPrismaService.media.findMany).toHaveBeenCalledWith({
        where: {},
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          uploadedBy: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      expect(result.data).toEqual(mockMedia);
      expect(result.meta).toEqual({
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      });
    });

    it('should filter by mimeType', async () => {
      await service.findAll(1, 10, 'image');

      expect(mockPrismaService.media.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            mimeType: {
              startsWith: 'image',
            },
          },
        }),
      );
    });

    it('should handle pagination correctly', async () => {
      await service.findAll(2, 20);

      expect(mockPrismaService.media.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 20,
          take: 20,
        }),
      );
    });
  });

  describe('findOne', () => {
    const mockMedia = {
      id: 'media-123',
      filename: 'file.jpg',
      originalName: 'file.jpg',
      mimeType: 'image/jpeg',
      size: 1024,
      url: '/uploads/file.jpg',
      thumbnailUrl: '/uploads/file-thumb.jpg',
      altText: null,
      uploadedById: 'user-1',
      createdAt: new Date(),
      uploadedBy: {
        id: 'user-1',
        email: 'user1@example.com',
        firstName: 'John',
        lastName: 'Doe',
      },
    };

    it('should return media by id', async () => {
      mockPrismaService.media.findUnique.mockResolvedValue(mockMedia);

      const result = await service.findOne('media-123');

      expect(mockPrismaService.media.findUnique).toHaveBeenCalledWith({
        where: { id: 'media-123' },
        include: {
          uploadedBy: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });
      expect(result).toEqual(mockMedia);
    });

    it('should throw NotFoundException if media not found', async () => {
      mockPrismaService.media.findUnique.mockResolvedValue(null);

      await expect(service.findOne('invalid-id')).rejects.toThrow(NotFoundException);
      await expect(service.findOne('invalid-id')).rejects.toThrow(
        'Media with ID invalid-id not found',
      );
    });
  });

  describe('update', () => {
    const mockMedia = {
      id: 'media-123',
      filename: 'file.jpg',
      originalName: 'file.jpg',
      mimeType: 'image/jpeg',
      size: 1024,
      url: '/uploads/file.jpg',
      thumbnailUrl: '/uploads/file-thumb.jpg',
      altText: 'Updated alt text',
      uploadedById: 'user-1',
      createdAt: new Date(),
      uploadedBy: {
        id: 'user-1',
        email: 'user1@example.com',
        firstName: 'John',
        lastName: 'Doe',
      },
    };

    it('should update altText', async () => {
      mockPrismaService.media.findUnique.mockResolvedValue(mockMedia);
      mockPrismaService.media.update.mockResolvedValue(mockMedia);

      const result = await service.update('media-123', {
        altText: 'Updated alt text',
      });

      expect(mockPrismaService.media.update).toHaveBeenCalledWith({
        where: { id: 'media-123' },
        data: { altText: 'Updated alt text' },
        include: {
          uploadedBy: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });
      expect(result).toEqual(mockMedia);
    });

    it('should throw NotFoundException if media not found', async () => {
      mockPrismaService.media.findUnique.mockResolvedValue(null);

      await expect(service.update('invalid-id', { altText: 'Test' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    const mockImageMedia = {
      id: 'media-123',
      filename: 'file.jpg',
      originalName: 'file.jpg',
      mimeType: 'image/jpeg',
      size: 1024,
      url: '/uploads/file-optimized.jpg',
      thumbnailUrl: '/uploads/file-thumb.jpg',
      altText: null,
      uploadedById: 'user-1',
      createdAt: new Date(),
    };

    const mockPdfMedia = {
      ...mockImageMedia,
      filename: 'document.pdf',
      mimeType: 'application/pdf',
      url: '/uploads/document.pdf',
      thumbnailUrl: null,
    };

    beforeEach(() => {
      (fs.unlink as jest.Mock).mockResolvedValue(undefined);
    });

    it('should delete image media and all related files', async () => {
      mockPrismaService.media.findUnique.mockResolvedValue(mockImageMedia);
      mockPrismaService.media.delete.mockResolvedValue(mockImageMedia);

      const result = await service.remove('media-123');

      expect(fs.unlink).toHaveBeenCalledTimes(3); // Original, optimized, thumbnail
      expect(mockPrismaService.media.delete).toHaveBeenCalledWith({
        where: { id: 'media-123' },
      });
      expect(result).toEqual(mockImageMedia);
    });

    it('should delete non-image media', async () => {
      mockPrismaService.media.findUnique.mockResolvedValue(mockPdfMedia);
      mockPrismaService.media.delete.mockResolvedValue(mockPdfMedia);

      const result = await service.remove('media-123');

      expect(fs.unlink).toHaveBeenCalledTimes(1); // Only original file
      expect(mockPrismaService.media.delete).toHaveBeenCalledWith({
        where: { id: 'media-123' },
      });
      expect(result).toEqual(mockPdfMedia);
    });

    it('should throw NotFoundException if media not found', async () => {
      mockPrismaService.media.findUnique.mockResolvedValue(null);

      await expect(service.remove('invalid-id')).rejects.toThrow(NotFoundException);
    });

    it('should handle file deletion errors gracefully', async () => {
      mockPrismaService.media.findUnique.mockResolvedValue(mockImageMedia);
      mockPrismaService.media.delete.mockResolvedValue(mockImageMedia);
      (fs.unlink as jest.Mock).mockRejectedValue(new Error('File not found'));

      // Should not throw even if file deletion fails
      const result = await service.remove('media-123');
      expect(result).toEqual(mockImageMedia);
    });

    it('should throw InternalServerErrorException on database deletion failure', async () => {
      mockPrismaService.media.findUnique.mockResolvedValue(mockImageMedia);
      mockPrismaService.media.delete.mockRejectedValue(new Error('Database error'));

      await expect(service.remove('media-123')).rejects.toThrow(InternalServerErrorException);
    });
  });
});
