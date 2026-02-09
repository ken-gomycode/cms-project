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
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UpdateMediaDto } from './dto/update-media.dto';
import { UploadMediaDto } from './dto/upload-media.dto';
import { MediaService } from './media.service';

@ApiTags('media')
@ApiBearerAuth('JWT-auth')
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
  @ApiOperation({
    summary: 'Upload media file',
    description: 'Upload image, video, audio, or PDF file. Max size 10MB. Requires authentication.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'File to upload',
        },
        altText: {
          type: 'string',
          description: 'Alternative text for the media',
        },
      },
      required: ['file'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Media uploaded successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - invalid file or exceeds size limit',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing token',
  })
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
  @ApiOperation({
    summary: 'Get all media',
    description: 'Retrieve all media files with pagination and optional MIME type filtering.',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page' })
  @ApiQuery({
    name: 'mimeType',
    required: false,
    type: String,
    description: 'Filter by MIME type (e.g., image, video)',
  })
  @ApiResponse({
    status: 200,
    description: 'Media list retrieved successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing token',
  })
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
  @ApiOperation({
    summary: 'Get media by ID',
    description: 'Retrieve a single media file by its UUID.',
  })
  @ApiParam({
    name: 'id',
    description: 'Media UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Media retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Media not found',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing token',
  })
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.mediaService.findOne(id);
  }

  /**
   * Update media metadata (only altText)
   * PATCH /media/:id
   */
  @ApiOperation({
    summary: 'Update media metadata',
    description: 'Update media alternative text (altText).',
  })
  @ApiParam({
    name: 'id',
    description: 'Media UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiBody({ type: UpdateMediaDto })
  @ApiResponse({
    status: 200,
    description: 'Media updated successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Media not found',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing token',
  })
  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateMediaDto: UpdateMediaDto) {
    return this.mediaService.update(id, updateMediaDto);
  }

  /**
   * Delete media
   * DELETE /media/:id
   */
  @ApiOperation({
    summary: 'Delete media',
    description: 'Delete a media file permanently.',
  })
  @ApiParam({
    name: 'id',
    description: 'Media UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Media deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Media not found',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing token',
  })
  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.mediaService.remove(id);
  }
}
