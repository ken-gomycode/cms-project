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
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
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

@ApiTags('tags')
@Controller('tags')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TagsController {
  constructor(private readonly tagsService: TagsService) {}

  /**
   * Create a new tag
   * Protected: Editor+ role required
   */
  @ApiOperation({
    summary: 'Create tag',
    description: 'Create a new tag. Requires EDITOR or ADMIN role.',
  })
  @ApiBody({ type: CreateTagDto })
  @ApiResponse({ status: 201, description: 'Tag created successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiBearerAuth('JWT-auth')
  @Post()
  @Roles(UserRole.ADMIN, UserRole.EDITOR)
  async create(@Body() createTagDto: CreateTagDto) {
    return this.tagsService.create(createTagDto);
  }

  /**
   * Get all tags with pagination
   * Public endpoint
   */
  @ApiOperation({
    summary: 'Get all tags',
    description: 'Retrieve all tags with pagination and content count. Public endpoint.',
  })
  @ApiResponse({ status: 200, description: 'Tags retrieved successfully' })
  @Get()
  @Public()
  async findAll(@Query() query: PaginationQueryDto): Promise<PaginatedResponseDto<TagWithCount>> {
    return this.tagsService.findAll(query);
  }

  /**
   * Get a single tag by ID
   * Public endpoint
   */
  @ApiOperation({
    summary: 'Get tag by ID',
    description: 'Retrieve a single tag with content count. Public endpoint.',
  })
  @ApiParam({ name: 'id', description: 'Tag UUID' })
  @ApiResponse({ status: 200, description: 'Tag retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Tag not found' })
  @Get(':id')
  @Public()
  async findOne(@Param('id') id: string): Promise<TagWithCount> {
    return this.tagsService.findOne(id);
  }

  /**
   * Update a tag
   * Protected: Editor+ role required
   */
  @ApiOperation({
    summary: 'Update tag',
    description: 'Update tag details. Requires EDITOR or ADMIN role.',
  })
  @ApiParam({ name: 'id', description: 'Tag UUID' })
  @ApiBody({ type: UpdateTagDto })
  @ApiResponse({ status: 200, description: 'Tag updated successfully' })
  @ApiResponse({ status: 404, description: 'Tag not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiBearerAuth('JWT-auth')
  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.EDITOR)
  async update(@Param('id') id: string, @Body() updateTagDto: UpdateTagDto) {
    return this.tagsService.update(id, updateTagDto);
  }

  /**
   * Delete a tag
   * Protected: Admin only
   */
  @ApiOperation({
    summary: 'Delete tag',
    description: 'Delete a tag. Requires ADMIN role.',
  })
  @ApiParam({ name: 'id', description: 'Tag UUID' })
  @ApiResponse({ status: 204, description: 'Tag deleted successfully' })
  @ApiResponse({ status: 404, description: 'Tag not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiBearerAuth('JWT-auth')
  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string): Promise<void> {
    return this.tagsService.remove(id);
  }
}
