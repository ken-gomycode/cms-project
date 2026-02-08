import { Injectable, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Media } from '@prisma/client';
import { v2 as cloudinary } from 'cloudinary';

import { PaginatedResponseDto } from '../common/dto/paginated-response.dto';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateMediaDto } from './dto/update-media.dto';

@Injectable()
export class MediaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    // Configure Cloudinary
    cloudinary.config({
      cloud_name: this.configService.get<string>('CLOUDINARY_CLOUD_NAME'),
      api_key: this.configService.get<string>('CLOUDINARY_API_KEY'),
      api_secret: this.configService.get<string>('CLOUDINARY_API_SECRET'),
    });
  }

  /**
   * Upload a media file to Cloudinary and save metadata to database
   * Uses Cloudinary transformations for image thumbnails
   */
  async upload(file: Express.Multer.File, uploadedById: string, altText?: string): Promise<Media> {
    try {
      // Determine resource type for Cloudinary
      const resourceType = file.mimetype.startsWith('image/')
        ? 'image'
        : file.mimetype.startsWith('video/')
          ? 'video'
          : 'raw';

      // Upload to Cloudinary
      const uploadResult = await this.uploadToCloudinary(file.buffer, {
        folder: 'cms-media',
        resource_type: resourceType,
        public_id: `${Date.now()}-${file.originalname.split('.')[0]}`,
      });

      // Store Cloudinary public_id as filename for later deletion
      const filename = uploadResult.public_id;
      const url = uploadResult.secure_url;

      // Generate thumbnail URL using Cloudinary transformations for images
      let thumbnailUrl: string | null = null;
      if (file.mimetype.startsWith('image/')) {
        // Replace /upload/ with /upload/w_300,h_300,c_fill/ for thumbnail
        thumbnailUrl = url.replace('/upload/', '/upload/w_300,h_300,c_fill/');
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
   * Remove media from Cloudinary and delete from database
   */
  async remove(id: string): Promise<Media> {
    const media = await this.findOne(id);

    try {
      // Delete from Cloudinary using the public_id stored in filename field
      // Determine resource type for deletion
      const resourceType = media.mimeType.startsWith('image/')
        ? 'image'
        : media.mimeType.startsWith('video/')
          ? 'video'
          : 'raw';

      await cloudinary.uploader.destroy(media.filename, {
        resource_type: resourceType,
      });

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
