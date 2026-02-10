import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';

import { MediaController } from './media.controller';
import { MediaService } from './media.service';

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-uuid-1234'),
}));

describe('MediaController', () => {
  let controller: MediaController;
  let mediaService: MediaService;

  const mockMediaService = {
    upload: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn().mockImplementation((key: string) => {
      if (key === 'MAX_FILE_SIZE') return 10485760; // 10MB
      return null;
    }),
  };

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    role: 'AUTHOR',
  };

  const mockMediaRecord = {
    id: 'media-123',
    filename: 'test-uuid.jpg',
    originalName: 'test.jpg',
    mimeType: 'image/jpeg',
    size: 1024,
    url: '/uploads/test-uuid-optimized.jpg',
    thumbnailUrl: '/uploads/test-uuid-thumb.jpg',
    altText: 'Test image',
    uploadedById: 'user-123',
    createdAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MediaController],
      providers: [
        {
          provide: MediaService,
          useValue: mockMediaService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    controller = module.get<MediaController>(MediaController);
    mediaService = module.get<MediaService>(MediaService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
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

    it('should upload a file successfully', async () => {
      mockMediaService.upload.mockResolvedValue(mockMediaRecord);

      const result = await controller.upload(mockFile, { altText: 'Test image' }, mockUser);

      expect(mockMediaService.upload).toHaveBeenCalledWith(mockFile, 'user-123', 'Test image');
      expect(result).toEqual(mockMediaRecord);
    });

    it('should upload a file without altText', async () => {
      mockMediaService.upload.mockResolvedValue(mockMediaRecord);

      await controller.upload(mockFile, {}, mockUser);

      expect(mockMediaService.upload).toHaveBeenCalledWith(mockFile, 'user-123', undefined);
    });

    it('should throw BadRequestException if file is missing', async () => {
      await expect(controller.upload(null as any, {}, mockUser)).rejects.toThrow(
        BadRequestException,
      );
      await expect(controller.upload(null as any, {}, mockUser)).rejects.toThrow(
        'File is required',
      );
    });

    it('should throw BadRequestException if file size exceeds limit', async () => {
      const largeFile = {
        ...mockFile,
        size: 11 * 1024 * 1024, // 11MB
      };

      await expect(controller.upload(largeFile, {}, mockUser)).rejects.toThrow(BadRequestException);
      await expect(controller.upload(largeFile, {}, mockUser)).rejects.toThrow(
        'File size exceeds maximum allowed size',
      );
    });

    it('should throw BadRequestException if file type is not allowed', async () => {
      const invalidFile = {
        ...mockFile,
        mimetype: 'application/x-executable',
      };

      await expect(controller.upload(invalidFile, {}, mockUser)).rejects.toThrow(
        BadRequestException,
      );
      await expect(controller.upload(invalidFile, {}, mockUser)).rejects.toThrow(
        'File type application/x-executable is not allowed',
      );
    });

    it('should accept allowed image types', async () => {
      const allowedTypes = [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/gif',
        'image/webp',
        'image/svg+xml',
      ];

      mockMediaService.upload.mockResolvedValue(mockMediaRecord);

      for (const mimeType of allowedTypes) {
        const file = { ...mockFile, mimetype: mimeType };
        await controller.upload(file, {}, mockUser);
        expect(mockMediaService.upload).toHaveBeenCalledWith(file, 'user-123', undefined);
      }
    });

    it('should accept allowed document and media types', async () => {
      const allowedTypes = [
        'application/pdf',
        'video/mp4',
        'video/webm',
        'audio/mpeg',
        'audio/wav',
      ];

      mockMediaService.upload.mockResolvedValue(mockMediaRecord);

      for (const mimeType of allowedTypes) {
        const file = { ...mockFile, mimetype: mimeType };
        await controller.upload(file, {}, mockUser);
        expect(mockMediaService.upload).toHaveBeenCalledWith(file, 'user-123', undefined);
      }
    });
  });

  describe('findAll', () => {
    const mockPaginatedResponse = {
      data: [mockMediaRecord],
      meta: {
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      },
    };

    it('should return paginated media with default pagination', async () => {
      mockMediaService.findAll.mockResolvedValue(mockPaginatedResponse);

      const result = await controller.findAll();

      expect(mockMediaService.findAll).toHaveBeenCalledWith(1, 10, undefined);
      expect(result).toEqual(mockPaginatedResponse);
    });

    it('should return paginated media with custom pagination', async () => {
      mockMediaService.findAll.mockResolvedValue(mockPaginatedResponse);

      await controller.findAll(2, 20);

      expect(mockMediaService.findAll).toHaveBeenCalledWith(2, 20, undefined);
    });

    it('should filter by mimeType', async () => {
      mockMediaService.findAll.mockResolvedValue(mockPaginatedResponse);

      await controller.findAll(1, 10, 'image');

      expect(mockMediaService.findAll).toHaveBeenCalledWith(1, 10, 'image');
    });

    it('should handle undefined pagination parameters', async () => {
      mockMediaService.findAll.mockResolvedValue(mockPaginatedResponse);

      await controller.findAll(undefined, undefined);

      expect(mockMediaService.findAll).toHaveBeenCalledWith(1, 10, undefined);
    });
  });

  describe('findOne', () => {
    it('should return a media record by id', async () => {
      mockMediaService.findOne.mockResolvedValue(mockMediaRecord);

      const result = await controller.findOne('media-123');

      expect(mockMediaService.findOne).toHaveBeenCalledWith('media-123');
      expect(result).toEqual(mockMediaRecord);
    });
  });

  describe('update', () => {
    it('should update media altText', async () => {
      const updatedMedia = {
        ...mockMediaRecord,
        altText: 'Updated alt text',
      };
      mockMediaService.update.mockResolvedValue(updatedMedia);

      const result = await controller.update('media-123', {
        altText: 'Updated alt text',
      });

      expect(mockMediaService.update).toHaveBeenCalledWith('media-123', {
        altText: 'Updated alt text',
      });
      expect(result).toEqual(updatedMedia);
    });

    it('should handle empty update DTO', async () => {
      mockMediaService.update.mockResolvedValue(mockMediaRecord);

      await controller.update('media-123', {});

      expect(mockMediaService.update).toHaveBeenCalledWith('media-123', {});
    });
  });

  describe('remove', () => {
    it('should delete a media record', async () => {
      mockMediaService.remove.mockResolvedValue(mockMediaRecord);

      const result = await controller.remove('media-123');

      expect(mockMediaService.remove).toHaveBeenCalledWith('media-123');
      expect(result).toEqual(mockMediaRecord);
    });
  });
});
