import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseIntPipe,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UpdateMediaDto } from './dto/update-media.dto';
import { UploadMediaDto } from './dto/upload-media.dto';
import { MediaService } from './media.service';

@Controller('media')
@UseGuards(JwtAuthGuard)
export class MediaController {
  private readonly maxFileSize: number;
  private readonly allowedMimeTypes: string[] = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    'application/pdf',
    'video/mp4',
    'video/webm',
    'audio/mpeg',
    'audio/wav',
  ];

  constructor(
    private readonly mediaService: MediaService,
    private readonly configService: ConfigService,
  ) {
    this.maxFileSize = this.configService.get<number>('MAX_FILE_SIZE') || 10485760; // 10MB default
  }

  /**
   * Upload a media file
   * POST /media/upload
   */
  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Body() uploadMediaDto: UploadMediaDto,
    @CurrentUser() user: any,
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    // Validate file size
    if (file.size > this.maxFileSize) {
      throw new BadRequestException(
        `File size exceeds maximum allowed size of ${this.maxFileSize} bytes`,
      );
    }

    // Validate MIME type
    if (!this.allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `File type ${file.mimetype} is not allowed. Allowed types: ${this.allowedMimeTypes.join(', ')}`,
      );
    }

    return this.mediaService.upload(file, user.id, uploadMediaDto.altText);
  }

  /**
   * Get all media with pagination and optional mimeType filter
   * GET /media?page=1&limit=10&mimeType=image
   */
  @Get()
  async findAll(
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('mimeType') mimeType?: string,
  ) {
    return this.mediaService.findAll(page || 1, limit || 10, mimeType);
  }

  /**
   * Get a single media by ID
   * GET /media/:id
   */
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.mediaService.findOne(id);
  }

  /**
   * Update media metadata (only altText)
   * PATCH /media/:id
   */
  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateMediaDto: UpdateMediaDto) {
    return this.mediaService.update(id, updateMediaDto);
  }

  /**
   * Delete media
   * DELETE /media/:id
   */
  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.mediaService.remove(id);
  }
}
