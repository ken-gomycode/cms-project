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
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';

import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Public } from '../auth/decorators/public.decorator';
import { CategoriesService, CategoryWithCount } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Controller('categories')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  /**
   * Create a new category
   * Protected: Editor+ role required
   */
  @Post()
  @Roles(UserRole.ADMIN, UserRole.EDITOR)
  async create(@Body() createCategoryDto: CreateCategoryDto) {
    return this.categoriesService.create(createCategoryDto);
  }

  /**
   * Get all categories as tree structure
   * Public endpoint
   */
  @Get()
  @Public()
  async findAll(): Promise<CategoryWithCount[]> {
    return this.categoriesService.findAll();
  }

  /**
   * Get a single category by ID
   * Public endpoint
   */
  @Get(':id')
  @Public()
  async findOne(@Param('id') id: string): Promise<CategoryWithCount> {
    return this.categoriesService.findOne(id);
  }

  /**
   * Update a category
   * Protected: Editor+ role required
   */
  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.EDITOR)
  async update(@Param('id') id: string, @Body() updateCategoryDto: UpdateCategoryDto) {
    return this.categoriesService.update(id, updateCategoryDto);
  }

  /**
   * Delete a category
   * Protected: Admin only
   */
  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string): Promise<void> {
    return this.categoriesService.remove(id);
  }
}
