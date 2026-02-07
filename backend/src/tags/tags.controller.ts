import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';

import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PaginatedResponseDto } from '../common/dto/paginated-response.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { CreateTagDto } from './dto/create-tag.dto';
import { UpdateTagDto } from './dto/update-tag.dto';
import { TagsService, TagWithCount } from './tags.service';

@Controller('tags')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TagsController {
  constructor(private readonly tagsService: TagsService) {}

  /**
   * Create a new tag
   * Protected: Editor+ role required
   */
  @Post()
  @Roles(UserRole.ADMIN, UserRole.EDITOR)
  async create(@Body() createTagDto: CreateTagDto) {
    return this.tagsService.create(createTagDto);
  }

  /**
   * Get all tags with pagination
   * Public endpoint
   */
  @Get()
  @Public()
  async findAll(@Query() query: PaginationQueryDto): Promise<PaginatedResponseDto<TagWithCount>> {
    return this.tagsService.findAll(query);
  }

  /**
   * Get a single tag by ID
   * Public endpoint
   */
  @Get(':id')
  @Public()
  async findOne(@Param('id') id: string): Promise<TagWithCount> {
    return this.tagsService.findOne(id);
  }

  /**
   * Update a tag
   * Protected: Editor+ role required
   */
  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.EDITOR)
  async update(@Param('id') id: string, @Body() updateTagDto: UpdateTagDto) {
    return this.tagsService.update(id, updateTagDto);
  }

  /**
   * Delete a tag
   * Protected: Admin only
   */
  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string): Promise<void> {
    return this.tagsService.remove(id);
  }
}
