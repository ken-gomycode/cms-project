import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Tag } from '@prisma/client';

import { PaginatedResponseDto } from '../common/dto/paginated-response.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { slugify } from '../common/utils/slug.util';
import { PrismaService } from '../prisma/prisma.service';

import { CreateTagDto } from './dto/create-tag.dto';
import { UpdateTagDto } from './dto/update-tag.dto';

export interface TagWithCount extends Tag {
  _count?: {
    contents: number;
  };
}

@Injectable()
export class TagsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new tag
   * Auto-generates slug from name
   * Checks uniqueness
   */
  async create(dto: CreateTagDto): Promise<Tag> {
    // Generate slug from name
    const slug = slugify(dto.name);

    // Check if tag with this slug already exists
    const existingTag = await this.prisma.tag.findUnique({
      where: { slug },
    });

    if (existingTag) {
      throw new BadRequestException(`Tag with slug "${slug}" already exists`);
    }

    // Check if tag with this name already exists
    const existingName = await this.prisma.tag.findUnique({
      where: { name: dto.name },
    });

    if (existingName) {
      throw new BadRequestException(`Tag with name "${dto.name}" already exists`);
    }

    // Create tag
    return this.prisma.tag.create({
      data: {
        name: dto.name,
        slug,
      },
    });
  }

  /**
   * Get all tags with pagination
   * Includes content count for each tag
   */
  async findAll(query: PaginationQueryDto): Promise<PaginatedResponseDto<TagWithCount>> {
    const { page = 1, limit = 10, sortBy = 'name', sortOrder = 'asc' } = query;
    const skip = (page - 1) * limit;

    // Build orderBy clause
    const orderBy = { [sortBy]: sortOrder };

    // Get total count
    const total = await this.prisma.tag.count();

    // Get paginated tags with content count
    const tags = await this.prisma.tag.findMany({
      skip,
      take: limit,
      orderBy,
      include: {
        _count: {
          select: { contents: true },
        },
      },
    });

    return new PaginatedResponseDto(tags, total, page, limit);
  }

  /**
   * Get a single tag by ID
   * Returns tag with content count
   */
  async findOne(id: string): Promise<TagWithCount> {
    const tag = await this.prisma.tag.findUnique({
      where: { id },
      include: {
        _count: {
          select: { contents: true },
        },
      },
    });

    if (!tag) {
      throw new NotFoundException(`Tag with ID ${id} not found`);
    }

    return tag;
  }

  /**
   * Update a tag
   * Regenerates slug if name changes
   */
  async update(id: string, dto: UpdateTagDto): Promise<Tag> {
    // Check if tag exists
    const existingTag = await this.prisma.tag.findUnique({
      where: { id },
    });

    if (!existingTag) {
      throw new NotFoundException(`Tag with ID ${id} not found`);
    }

    // If name is not being updated, just return the existing tag
    if (!dto.name) {
      return existingTag;
    }

    // Generate new slug from updated name
    const slug = slugify(dto.name);

    // Check if new slug already exists (but not for this tag)
    const slugExists = await this.prisma.tag.findUnique({
      where: { slug },
    });

    if (slugExists && slugExists.id !== id) {
      throw new BadRequestException(`Tag with slug "${slug}" already exists`);
    }

    // Check if new name already exists (but not for this tag)
    const nameExists = await this.prisma.tag.findUnique({
      where: { name: dto.name },
    });

    if (nameExists && nameExists.id !== id) {
      throw new BadRequestException(`Tag with name "${dto.name}" already exists`);
    }

    // Update tag
    return this.prisma.tag.update({
      where: { id },
      data: {
        name: dto.name,
        slug,
      },
    });
  }

  /**
   * Delete a tag
   * Cascade handled by Prisma (ContentTag relations will be deleted)
   */
  async remove(id: string): Promise<void> {
    // Check if tag exists
    const tag = await this.prisma.tag.findUnique({
      where: { id },
    });

    if (!tag) {
      throw new NotFoundException(`Tag with ID ${id} not found`);
    }

    // Delete tag (cascade will handle ContentTag relations)
    await this.prisma.tag.delete({
      where: { id },
    });
  }
}
