import { promises as fs } from 'fs';
import { join } from 'path';

import { Injectable, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Media } from '@prisma/client';
import { v2 as cloudinary } from 'cloudinary';
import * as sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';

import { PaginatedResponseDto } from '../common/dto/paginated-response.dto';
import { PrismaService } from '../prisma/prisma.service';

import { UpdateMediaDto } from './dto/update-media.dto';

@Injectable()
export class MediaService {
  private readonly uploadDir: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    // Set upload directory
    this.uploadDir = this.configService.get<string>('upload.dir') || './uploads';

    // Ensure upload directory exists
    this.ensureUploadDirExists();

    // Configure Cloudinary only if credentials are provided
    if (this.isCloudinaryConfigured()) {
      cloudinary.config({
        cloud_name: this.configService.get<string>('cloudinary.cloudName'),
        api_key: this.configService.get<string>('cloudinary.apiKey'),
        api_secret: this.configService.get<string>('cloudinary.apiSecret'),
      });
    }
  }

  /**
   * Check if Cloudinary is properly configured
   */
  private isCloudinaryConfigured(): boolean {
    const cloudName = this.configService.get<string>('cloudinary.cloudName');
    const apiKey = this.configService.get<string>('cloudinary.apiKey');
    const apiSecret = this.configService.get<string>('cloudinary.apiSecret');
    return !!(cloudName && apiKey && apiSecret);
  }

  /**
   * Ensure the upload directory exists
   */
  private async ensureUploadDirExists(): Promise<void> {
    try {
      await fs.access(this.uploadDir);
    } catch {
      await fs.mkdir(this.uploadDir, { recursive: true });
    }
  }

  /**
   * Save file to local storage
   */
  private async saveToLocal(
    file: Express.Multer.File,
    filename: string,
  ): Promise<{ url: string; path: string }> {
    const filepath = join(this.uploadDir, filename);
    await fs.writeFile(filepath, file.buffer);
    return {
      url: `/uploads/${filename}`,
      path: filepath,
    };
  }

  /**
   * Generate thumbnail for local image using sharp
   */
  private async generateLocalThumbnail(
    file: Express.Multer.File,
    filename: string,
  ): Promise<string | null> {
    if (!file.mimetype.startsWith('image/')) {
      return null;
    }

    try {
      const thumbnailFilename = `thumb-${filename}`;
      const thumbnailPath = join(this.uploadDir, thumbnailFilename);

      await sharp(file.buffer).resize(300, 300, { fit: 'cover' }).toFile(thumbnailPath);

      return `/uploads/${thumbnailFilename}`;
    } catch {
      return null;
    }
  }

  /**
   * Delete local file
   */
  private async deleteLocalFile(filename: string): Promise<void> {
    try {
      const filepath = join(this.uploadDir, filename);
      await fs.unlink(filepath);
    } catch {
      // File may not exist, ignore error
    }
  }

  /**
   * Upload a media file to Cloudinary (if configured) or local storage
   * Uses Cloudinary transformations for image thumbnails when available
   */
  async upload(file: Express.Multer.File, uploadedById: string, altText?: string): Promise<Media> {
    try {
      let filename: string;
      let url: string;
      let thumbnailUrl: string | null = null;

      if (this.isCloudinaryConfigured()) {
        // Use Cloudinary for upload
        const resourceType = file.mimetype.startsWith('image/')
          ? 'image'
          : file.mimetype.startsWith('video/')
            ? 'video'
            : 'raw';

        const uploadResult = await this.uploadToCloudinary(file.buffer, {
          folder: 'cms-media',
          resource_type: resourceType,
          public_id: `${Date.now()}-${file.originalname.split('.')[0]}`,
        });

        filename = uploadResult.public_id;
        url = uploadResult.secure_url;

        // Generate thumbnail URL using Cloudinary transformations for images
        if (file.mimetype.startsWith('image/')) {
          thumbnailUrl = url.replace('/upload/', '/upload/w_300,h_300,c_fill/');
        }
      } else {
        // Use local storage
        const uniqueId = uuidv4();
        const safeName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
        filename = `${Date.now()}-${uniqueId}-${safeName}`;

        const result = await this.saveToLocal(file, filename);
        url = result.url;

        // Generate thumbnail for images
        thumbnailUrl = await this.generateLocalThumbnail(file, filename);
      }

      // Save metadata to database
      const media = await this.prisma.media.create({
        data: {
          filename,
          originalName: file.originalname,
          mimeType: file.mimetype,
          size: file.size,
          url,
          thumbnailUrl,
          altText: altText || null,
          uploadedById,
        },
      });

      return media;
    } catch (error) {
      throw new InternalServerErrorException(`Failed to upload file: ${error.message}`);
    }
  }

  /**
   * Helper method to upload buffer to Cloudinary using stream
   * Wraps the stream-based upload in a Promise
   */
  private uploadToCloudinary(buffer: Buffer, options: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(options, (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      });
      stream.end(buffer);
    });
  }

  /**
   * Find all media with pagination and optional mimeType filter
   */
  async findAll(
    page: number = 1,
    limit: number = 10,
    mimeType?: string,
  ): Promise<PaginatedResponseDto<Media>> {
    const skip = (page - 1) * limit;

    const where = mimeType
      ? {
          mimeType: {
            startsWith: mimeType,
          },
        }
      : {};

    const [media, total] = await Promise.all([
      this.prisma.media.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
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
      }),
      this.prisma.media.count({ where }),
    ]);

    return new PaginatedResponseDto(media, total, page, limit);
  }

  /**
   * Find one media by ID
   */
  async findOne(id: string): Promise<Media> {
    const media = await this.prisma.media.findUnique({
      where: { id },
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

    if (!media) {
      throw new NotFoundException(`Media with ID ${id} not found`);
    }

    return media;
  }

  /**
   * Update media metadata (only altText)
   */
  async update(id: string, updateMediaDto: UpdateMediaDto): Promise<Media> {
    // Check if media exists
    await this.findOne(id);

    const media = await this.prisma.media.update({
      where: { id },
      data: {
        altText: updateMediaDto.altText,
      },
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

    return media;
  }

  /**
   * Remove media from Cloudinary or local storage and delete from database
   */
  async remove(id: string): Promise<Media> {
    const media = await this.findOne(id);

    try {
      // Check if file is stored locally (URL starts with /uploads/) or in Cloudinary
      if (media.url.startsWith('/uploads/')) {
        // Delete local file
        await this.deleteLocalFile(media.filename);

        // Delete thumbnail if exists
        if (media.thumbnailUrl && media.thumbnailUrl.startsWith('/uploads/')) {
          const thumbnailFilename = media.thumbnailUrl.replace('/uploads/', '');
          await this.deleteLocalFile(thumbnailFilename);
        }
      } else if (this.isCloudinaryConfigured()) {
        // Delete from Cloudinary using the public_id stored in filename field
        const resourceType = media.mimeType.startsWith('image/')
          ? 'image'
          : media.mimeType.startsWith('video/')
            ? 'video'
            : 'raw';

        await cloudinary.uploader.destroy(media.filename, {
          resource_type: resourceType,
        });
      }

      // Delete from database
      const deletedMedia = await this.prisma.media.delete({
        where: { id },
      });

      return deletedMedia;
    } catch (error) {
      throw new InternalServerErrorException(`Failed to delete media: ${error.message}`);
    }
  }
}
