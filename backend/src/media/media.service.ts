import { Injectable, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Media } from '@prisma/client';
import { promises as fs } from 'fs';
import * as path from 'path';
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
    this.uploadDir = this.configService.get<string>('UPLOAD_DIR') || './uploads';
  }

  /**
   * Upload a media file and save metadata to database
   * Handles image optimization with Sharp if file is an image
   */
  async upload(file: Express.Multer.File, uploadedById: string, altText?: string): Promise<Media> {
    try {
      // Generate unique filename with UUID prefix
      const fileExtension = path.extname(file.originalname);
      const filename = `${uuidv4()}${fileExtension}`;
      const filePath = path.join(this.uploadDir, filename);

      // Save original file
      await fs.writeFile(filePath, file.buffer);

      // Initialize media metadata
      let url = `/uploads/${filename}`;
      let thumbnailUrl: string | null = null;

      // Check if file is an image and optimize
      if (file.mimetype.startsWith('image/')) {
        const optimizedResult = await this.optimizeImage(filename, file.buffer);
        url = optimizedResult.url;
        thumbnailUrl = optimizedResult.thumbnailUrl;
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
   * Optimize image by creating thumbnail and optimized version
   * Returns updated URLs
   */
  private async optimizeImage(
    filename: string,
    buffer: Buffer,
  ): Promise<{ url: string; thumbnailUrl: string }> {
    try {
      const baseFilename = path.parse(filename).name;
      const thumbnailFilename = `${baseFilename}-thumb.jpg`;
      const optimizedFilename = `${baseFilename}-optimized.jpg`;

      const thumbnailPath = path.join(this.uploadDir, thumbnailFilename);
      const optimizedPath = path.join(this.uploadDir, optimizedFilename);

      // Generate thumbnail: 300x300
      await sharp(buffer)
        .resize(300, 300, {
          fit: 'cover',
          position: 'center',
        })
        .jpeg({ quality: 80 })
        .toFile(thumbnailPath);

      // Generate optimized version: max 1920px width/height, quality 80
      await sharp(buffer)
        .resize(1920, 1920, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .jpeg({ quality: 80 })
        .toFile(optimizedPath);

      return {
        url: `/uploads/${optimizedFilename}`,
        thumbnailUrl: `/uploads/${thumbnailFilename}`,
      };
    } catch (error) {
      throw new InternalServerErrorException(`Failed to optimize image: ${error.message}`);
    }
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
   * Remove media from database and delete files from filesystem
   */
  async remove(id: string): Promise<Media> {
    const media = await this.findOne(id);

    try {
      // Delete files from filesystem
      const filesToDelete: string[] = [path.join(this.uploadDir, media.filename)];

      // If image, also delete optimized and thumbnail versions
      if (media.mimeType.startsWith('image/')) {
        const baseFilename = path.parse(media.filename).name;
        filesToDelete.push(
          path.join(this.uploadDir, `${baseFilename}-optimized.jpg`),
          path.join(this.uploadDir, `${baseFilename}-thumb.jpg`),
        );
      }

      // Delete files (ignore errors if files don't exist)
      await Promise.allSettled(
        filesToDelete.map((filePath) =>
          fs.unlink(filePath).catch(() => {
            // File might not exist, ignore error
          }),
        ),
      );

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
