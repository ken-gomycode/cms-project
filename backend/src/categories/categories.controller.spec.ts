import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { UserRole } from '@prisma/client';

import { CategoriesController } from './categories.controller';
import { CategoriesService, CategoryWithCount } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

describe('CategoriesController', () => {
  let controller: CategoriesController;
  let service: CategoriesService;

  const mockCategoriesService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  const mockCategory = {
    id: '1',
    name: 'Technology',
    slug: 'technology',
    description: 'Tech articles',
    parentId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockCategoryWithCount: CategoryWithCount = {
    ...mockCategory,
    _count: { contents: 5 },
    children: [],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CategoriesController],
      providers: [
        {
          provide: CategoriesService,
          useValue: mockCategoriesService,
        },
      ],
    }).compile();

    controller = module.get<CategoriesController>(CategoriesController);
    service = module.get<CategoriesService>(CategoriesService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a category', async () => {
      const createDto: CreateCategoryDto = {
        name: 'Technology',
        description: 'Tech articles',
      };

      mockCategoriesService.create.mockResolvedValue(mockCategory);

      const result = await controller.create(createDto);

      expect(result).toEqual(mockCategory);
      expect(service.create).toHaveBeenCalledWith(createDto);
    });

    it('should throw error for invalid parent', async () => {
      const createDto: CreateCategoryDto = {
        name: 'Technology',
        parentId: 'invalid-id',
      };

      mockCategoriesService.create.mockRejectedValue(
        new NotFoundException('Parent category with ID invalid-id not found'),
      );

      await expect(controller.create(createDto)).rejects.toThrow(NotFoundException);
    });

    it('should throw error for duplicate slug', async () => {
      const createDto: CreateCategoryDto = {
        name: 'Technology',
      };

      mockCategoriesService.create.mockRejectedValue(
        new BadRequestException('Category with slug "technology" already exists'),
      );

      await expect(controller.create(createDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('findAll', () => {
    it('should return all categories as tree structure', async () => {
      const mockTree: CategoryWithCount[] = [
        {
          ...mockCategory,
          _count: { contents: 5 },
          children: [
            {
              id: '2',
              name: 'Web Dev',
              slug: 'web-dev',
              description: null,
              parentId: '1',
              createdAt: new Date(),
              updatedAt: new Date(),
              _count: { contents: 3 },
              children: [],
            },
          ],
        },
      ];

      mockCategoriesService.findAll.mockResolvedValue(mockTree);

      const result = await controller.findAll();

      expect(result).toEqual(mockTree);
      expect(service.findAll).toHaveBeenCalled();
      expect(result[0].children).toHaveLength(1);
    });

    it('should return empty array when no categories exist', async () => {
      mockCategoriesService.findAll.mockResolvedValue([]);

      const result = await controller.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return a category by id', async () => {
      mockCategoriesService.findOne.mockResolvedValue(mockCategoryWithCount);

      const result = await controller.findOne('1');

      expect(result).toEqual(mockCategoryWithCount);
      expect(service.findOne).toHaveBeenCalledWith('1');
    });

    it('should throw NotFoundException for invalid id', async () => {
      mockCategoriesService.findOne.mockRejectedValue(
        new NotFoundException('Category with ID invalid-id not found'),
      );

      await expect(controller.findOne('invalid-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update a category', async () => {
      const updateDto: UpdateCategoryDto = {
        name: 'Updated Technology',
      };

      const updatedCategory = {
        ...mockCategory,
        name: 'Updated Technology',
        slug: 'updated-technology',
      };

      mockCategoriesService.update.mockResolvedValue(updatedCategory);

      const result = await controller.update('1', updateDto);

      expect(result).toEqual(updatedCategory);
      expect(service.update).toHaveBeenCalledWith('1', updateDto);
    });

    it('should throw NotFoundException for invalid id', async () => {
      const updateDto: UpdateCategoryDto = {
        name: 'Updated',
      };

      mockCategoriesService.update.mockRejectedValue(
        new NotFoundException('Category with ID invalid-id not found'),
      );

      await expect(controller.update('invalid-id', updateDto)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for circular reference', async () => {
      const updateDto: UpdateCategoryDto = {
        parentId: '1',
      };

      mockCategoriesService.update.mockRejectedValue(
        new BadRequestException('Cannot set a descendant category as parent'),
      );

      await expect(controller.update('1', updateDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('remove', () => {
    it('should delete a category', async () => {
      mockCategoriesService.remove.mockResolvedValue(undefined);

      await controller.remove('1');

      expect(service.remove).toHaveBeenCalledWith('1');
    });

    it('should throw NotFoundException for invalid id', async () => {
      mockCategoriesService.remove.mockRejectedValue(
        new NotFoundException('Category with ID invalid-id not found'),
      );

      await expect(controller.remove('invalid-id')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if category has content', async () => {
      mockCategoriesService.remove.mockRejectedValue(
        new BadRequestException('Cannot delete category with 5 content item(s)'),
      );

      await expect(controller.remove('1')).rejects.toThrow(BadRequestException);
    });
  });
});
