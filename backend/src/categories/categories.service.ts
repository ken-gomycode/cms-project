import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Category } from '@prisma/client';

import { slugify } from '../common/utils/slug.util';
import { PrismaService } from '../prisma/prisma.service';

import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

export interface CategoryWithCount extends Category {
  _count?: {
    contents: number;
  };
  children?: CategoryWithCount[];
}

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new category
   * Auto-generates slug from name
   * Validates parentId exists if provided
   */
  async create(dto: CreateCategoryDto): Promise<Category> {
    // Validate parent category exists if parentId is provided
    if (dto.parentId) {
      const parentExists = await this.prisma.category.findUnique({
        where: { id: dto.parentId },
      });

      if (!parentExists) {
        throw new NotFoundException(`Parent category with ID ${dto.parentId} not found`);
      }
    }

    // Generate slug from name
    const slug = slugify(dto.name);

    // Check if slug already exists
    const existingCategory = await this.prisma.category.findUnique({
      where: { slug },
    });

    if (existingCategory) {
      throw new BadRequestException(`Category with slug "${slug}" already exists`);
    }

    // Create category
    return this.prisma.category.create({
      data: {
        name: dto.name,
        slug,
        description: dto.description,
        parentId: dto.parentId,
      },
    });
  }

  /**
   * Get all categories as a tree structure
   * Includes content count for each category
   */
  async findAll(): Promise<CategoryWithCount[]> {
    // Get all categories with content count
    const allCategories = await this.prisma.category.findMany({
      include: {
        _count: {
          select: { contents: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    // Build tree structure (only root categories)
    return this.buildTree(allCategories, null);
  }

  /**
   * Get a single category by ID
   * Returns category with children array and content count
   */
  async findOne(id: string): Promise<CategoryWithCount> {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: {
        children: {
          include: {
            _count: {
              select: { contents: true },
            },
          },
        },
        _count: {
          select: { contents: true },
        },
      },
    });

    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    return category;
  }

  /**
   * Update a category
   * Regenerates slug if name changes
   * Validates parentId if provided
   */
  async update(id: string, dto: UpdateCategoryDto): Promise<Category> {
    // Check if category exists
    const existingCategory = await this.prisma.category.findUnique({
      where: { id },
    });

    if (!existingCategory) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    // Validate parent category exists if parentId is provided
    if (dto.parentId) {
      // Prevent setting category as its own parent
      if (dto.parentId === id) {
        throw new BadRequestException('Category cannot be its own parent');
      }

      const parentExists = await this.prisma.category.findUnique({
        where: { id: dto.parentId },
      });

      if (!parentExists) {
        throw new NotFoundException(`Parent category with ID ${dto.parentId} not found`);
      }

      // Prevent circular references (parent cannot be a descendant)
      const isDescendant = await this.isDescendant(id, dto.parentId);
      if (isDescendant) {
        throw new BadRequestException('Cannot set a descendant category as parent');
      }
    }

    // Generate new slug if name is being updated
    let slug = existingCategory.slug;
    if (dto.name && dto.name !== existingCategory.name) {
      slug = slugify(dto.name);

      // Check if new slug already exists
      const slugExists = await this.prisma.category.findUnique({
        where: { slug },
      });

      if (slugExists && slugExists.id !== id) {
        throw new BadRequestException(`Category with slug "${slug}" already exists`);
      }
    }

    // Update category
    return this.prisma.category.update({
      where: { id },
      data: {
        name: dto.name,
        slug,
        description: dto.description,
        parentId: dto.parentId,
      },
    });
  }

  /**
   * Delete a category
   * Prevents deletion if category has content
   */
  async remove(id: string): Promise<void> {
    // Check if category exists
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: {
        _count: {
          select: { contents: true },
        },
      },
    });

    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    // Prevent deletion if category has content
    if (category._count.contents > 0) {
      throw new BadRequestException(
        `Cannot delete category with ${category._count.contents} content item(s)`,
      );
    }

    // Delete category
    await this.prisma.category.delete({
      where: { id },
    });
  }

  /**
   * Build tree structure from flat array of categories
   * Recursively builds nested children
   */
  private buildTree(categories: CategoryWithCount[], parentId: string | null): CategoryWithCount[] {
    return categories
      .filter((cat) => cat.parentId === parentId)
      .map((cat) => ({
        ...cat,
        children: this.buildTree(categories, cat.id),
      }));
  }

  /**
   * Check if a category is a descendant of another category
   * Used to prevent circular references
   */
  private async isDescendant(ancestorId: string, descendantId: string): Promise<boolean> {
    const descendant = await this.prisma.category.findUnique({
      where: { id: descendantId },
    });

    if (!descendant || !descendant.parentId) {
      return false;
    }

    if (descendant.parentId === ancestorId) {
      return true;
    }

    return this.isDescendant(ancestorId, descendant.parentId);
  }
}
