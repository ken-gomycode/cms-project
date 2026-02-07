import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from '../prisma/prisma.service';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

describe('CategoriesService', () => {
  let service: CategoriesService;
  let prisma: PrismaService;

  const mockPrismaService = {
    category: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoriesService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<CategoriesService>(CategoriesService);
    prisma = module.get<PrismaService>(PrismaService);

    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createDto: CreateCategoryDto = {
      name: 'Technology',
      description: 'Tech articles',
    };

    it('should create a category with auto-generated slug', async () => {
      const mockCategory = {
        id: '1',
        name: 'Technology',
        slug: 'technology',
        description: 'Tech articles',
        parentId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.category.findUnique.mockResolvedValue(null);
      mockPrismaService.category.create.mockResolvedValue(mockCategory);

      const result = await service.create(createDto);

      expect(result).toEqual(mockCategory);
      expect(prisma.category.create).toHaveBeenCalledWith({
        data: {
          name: 'Technology',
          slug: 'technology',
          description: 'Tech articles',
          parentId: undefined,
        },
      });
    });

    it('should validate parent category exists', async () => {
      const dtoWithParent: CreateCategoryDto = {
        name: 'Web Development',
        parentId: 'parent-id',
      };

      mockPrismaService.category.findUnique.mockResolvedValue(null);

      await expect(service.create(dtoWithParent)).rejects.toThrow(NotFoundException);
      await expect(service.create(dtoWithParent)).rejects.toThrow(
        'Parent category with ID parent-id not found',
      );
    });

    it('should create category with valid parent', async () => {
      const dtoWithParent: CreateCategoryDto = {
        name: 'Web Development',
        parentId: 'parent-id',
      };

      const mockParent = { id: 'parent-id', slug: 'technology' };
      const mockCategory = {
        id: '2',
        name: 'Web Development',
        slug: 'web-development',
        description: null,
        parentId: 'parent-id',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.category.findUnique
        .mockResolvedValueOnce(mockParent)
        .mockResolvedValueOnce(null);
      mockPrismaService.category.create.mockResolvedValue(mockCategory);

      const result = await service.create(dtoWithParent);

      expect(result).toEqual(mockCategory);
    });

    it('should throw error if slug already exists', async () => {
      const existingCategory = {
        id: '1',
        slug: 'technology',
        name: 'Technology',
      };

      mockPrismaService.category.findUnique.mockResolvedValue(existingCategory);

      await expect(service.create(createDto)).rejects.toThrow(BadRequestException);
      await expect(service.create(createDto)).rejects.toThrow(
        'Category with slug "technology" already exists',
      );
    });
  });

  describe('findAll', () => {
    it('should return categories as tree structure', async () => {
      const mockCategories = [
        {
          id: '1',
          name: 'Technology',
          slug: 'technology',
          description: null,
          parentId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          _count: { contents: 5 },
        },
        {
          id: '2',
          name: 'Web Development',
          slug: 'web-development',
          description: null,
          parentId: '1',
          createdAt: new Date(),
          updatedAt: new Date(),
          _count: { contents: 3 },
        },
      ];

      mockPrismaService.category.findMany.mockResolvedValue(mockCategories);

      const result = await service.findAll();

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('1');
      expect(result[0].children).toHaveLength(1);
      expect(result[0].children?.[0]?.id).toBe('2');
    });

    it('should return empty array when no categories exist', async () => {
      mockPrismaService.category.findMany.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return a category with children and count', async () => {
      const mockCategory = {
        id: '1',
        name: 'Technology',
        slug: 'technology',
        description: null,
        parentId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        children: [],
        _count: { contents: 5 },
      };

      mockPrismaService.category.findUnique.mockResolvedValue(mockCategory);

      const result = await service.findOne('1');

      expect(result).toEqual(mockCategory);
    });

    it('should throw NotFoundException if category does not exist', async () => {
      mockPrismaService.category.findUnique.mockResolvedValue(null);

      await expect(service.findOne('invalid-id')).rejects.toThrow(NotFoundException);
      await expect(service.findOne('invalid-id')).rejects.toThrow(
        'Category with ID invalid-id not found',
      );
    });
  });

  describe('update', () => {
    const updateDto: UpdateCategoryDto = {
      name: 'Updated Technology',
    };

    const existingCategory = {
      id: '1',
      name: 'Technology',
      slug: 'technology',
      description: null,
      parentId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should update category and regenerate slug when name changes', async () => {
      const updatedCategory = {
        ...existingCategory,
        name: 'Updated Technology',
        slug: 'updated-technology',
      };

      mockPrismaService.category.findUnique
        .mockResolvedValueOnce(existingCategory)
        .mockResolvedValueOnce(null);
      mockPrismaService.category.update.mockResolvedValue(updatedCategory);

      const result = await service.update('1', updateDto);

      expect(result).toEqual(updatedCategory);
      expect(prisma.category.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: {
          name: 'Updated Technology',
          slug: 'updated-technology',
          description: undefined,
          parentId: undefined,
        },
      });
    });

    it('should throw NotFoundException if category does not exist', async () => {
      mockPrismaService.category.findUnique.mockResolvedValue(null);

      await expect(service.update('invalid-id', updateDto)).rejects.toThrow(NotFoundException);
    });

    it('should prevent category from being its own parent', async () => {
      mockPrismaService.category.findUnique.mockResolvedValue(existingCategory);

      await expect(service.update('1', { parentId: '1' })).rejects.toThrow(BadRequestException);
      await expect(service.update('1', { parentId: '1' })).rejects.toThrow(
        'Category cannot be its own parent',
      );
    });

    it('should validate parent exists when updating parentId', async () => {
      mockPrismaService.category.findUnique
        .mockResolvedValueOnce(existingCategory)
        .mockResolvedValueOnce(null);

      await expect(service.update('1', { parentId: 'invalid-parent' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw error if updated slug already exists', async () => {
      const conflictingCategory = {
        id: '2',
        slug: 'updated-technology',
      };

      mockPrismaService.category.findUnique
        .mockResolvedValueOnce(existingCategory)
        .mockResolvedValueOnce(conflictingCategory);

      await expect(service.update('1', updateDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('remove', () => {
    it('should delete category if it has no content', async () => {
      const mockCategory = {
        id: '1',
        name: 'Technology',
        slug: 'technology',
        description: null,
        parentId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        _count: { contents: 0 },
      };

      mockPrismaService.category.findUnique.mockResolvedValue(mockCategory);
      mockPrismaService.category.delete.mockResolvedValue(mockCategory);

      await service.remove('1');

      expect(prisma.category.delete).toHaveBeenCalledWith({
        where: { id: '1' },
      });
    });

    it('should throw NotFoundException if category does not exist', async () => {
      mockPrismaService.category.findUnique.mockResolvedValue(null);

      await expect(service.remove('invalid-id')).rejects.toThrow(NotFoundException);
    });

    it('should prevent deletion if category has content', async () => {
      const mockCategory = {
        id: '1',
        name: 'Technology',
        slug: 'technology',
        description: null,
        parentId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        _count: { contents: 5 },
      };

      mockPrismaService.category.findUnique.mockResolvedValue(mockCategory);

      await expect(service.remove('1')).rejects.toThrow(BadRequestException);
      await expect(service.remove('1')).rejects.toThrow(
        'Cannot delete category with 5 content item(s)',
      );
      expect(prisma.category.delete).not.toHaveBeenCalled();
    });
  });
});
