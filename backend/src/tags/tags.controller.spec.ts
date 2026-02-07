import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { PaginatedResponseDto } from '../common/dto/paginated-response.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { CreateTagDto } from './dto/create-tag.dto';
import { UpdateTagDto } from './dto/update-tag.dto';
import { TagsController } from './tags.controller';
import { TagsService, TagWithCount } from './tags.service';

describe('TagsController', () => {
  let controller: TagsController;
  let service: TagsService;

  const mockTagsService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  const mockTag = {
    id: '1',
    name: 'JavaScript',
    slug: 'javascript',
    createdAt: new Date(),
  };

  const mockTagWithCount: TagWithCount = {
    ...mockTag,
    _count: { contents: 5 },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TagsController],
      providers: [
        {
          provide: TagsService,
          useValue: mockTagsService,
        },
      ],
    }).compile();

    controller = module.get<TagsController>(TagsController);
    service = module.get<TagsService>(TagsService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a tag', async () => {
      const createDto: CreateTagDto = {
        name: 'JavaScript',
      };

      mockTagsService.create.mockResolvedValue(mockTag);

      const result = await controller.create(createDto);

      expect(result).toEqual(mockTag);
      expect(service.create).toHaveBeenCalledWith(createDto);
    });

    it('should throw error for duplicate slug', async () => {
      const createDto: CreateTagDto = {
        name: 'JavaScript',
      };

      mockTagsService.create.mockRejectedValue(
        new BadRequestException('Tag with slug "javascript" already exists'),
      );

      await expect(controller.create(createDto)).rejects.toThrow(BadRequestException);
    });

    it('should throw error for duplicate name', async () => {
      const createDto: CreateTagDto = {
        name: 'JavaScript',
      };

      mockTagsService.create.mockRejectedValue(
        new BadRequestException('Tag with name "JavaScript" already exists'),
      );

      await expect(controller.create(createDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('findAll', () => {
    it('should return paginated tags', async () => {
      const query: PaginationQueryDto = {
        page: 1,
        limit: 10,
      };

      const mockResponse = new PaginatedResponseDto([mockTagWithCount], 1, 1, 10);

      mockTagsService.findAll.mockResolvedValue(mockResponse);

      const result = await controller.findAll(query);

      expect(result).toEqual(mockResponse);
      expect(service.findAll).toHaveBeenCalledWith(query);
      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });

    it('should return empty result when no tags exist', async () => {
      const query: PaginationQueryDto = {
        page: 1,
        limit: 10,
      };

      const mockResponse = new PaginatedResponseDto([], 0, 1, 10);

      mockTagsService.findAll.mockResolvedValue(mockResponse);

      const result = await controller.findAll(query);

      expect(result.data).toEqual([]);
      expect(result.meta.total).toBe(0);
    });
  });

  describe('findOne', () => {
    it('should return a tag by id', async () => {
      mockTagsService.findOne.mockResolvedValue(mockTagWithCount);

      const result = await controller.findOne('1');

      expect(result).toEqual(mockTagWithCount);
      expect(service.findOne).toHaveBeenCalledWith('1');
    });

    it('should throw NotFoundException for invalid id', async () => {
      mockTagsService.findOne.mockRejectedValue(
        new NotFoundException('Tag with ID invalid-id not found'),
      );

      await expect(controller.findOne('invalid-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update a tag', async () => {
      const updateDto: UpdateTagDto = {
        name: 'TypeScript',
      };

      const updatedTag = {
        ...mockTag,
        name: 'TypeScript',
        slug: 'typescript',
      };

      mockTagsService.update.mockResolvedValue(updatedTag);

      const result = await controller.update('1', updateDto);

      expect(result).toEqual(updatedTag);
      expect(service.update).toHaveBeenCalledWith('1', updateDto);
    });

    it('should throw NotFoundException for invalid id', async () => {
      const updateDto: UpdateTagDto = {
        name: 'TypeScript',
      };

      mockTagsService.update.mockRejectedValue(
        new NotFoundException('Tag with ID invalid-id not found'),
      );

      await expect(controller.update('invalid-id', updateDto)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for duplicate slug', async () => {
      const updateDto: UpdateTagDto = {
        name: 'TypeScript',
      };

      mockTagsService.update.mockRejectedValue(
        new BadRequestException('Tag with slug "typescript" already exists'),
      );

      await expect(controller.update('1', updateDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('remove', () => {
    it('should delete a tag', async () => {
      mockTagsService.remove.mockResolvedValue(undefined);

      await controller.remove('1');

      expect(service.remove).toHaveBeenCalledWith('1');
    });

    it('should throw NotFoundException for invalid id', async () => {
      mockTagsService.remove.mockRejectedValue(
        new NotFoundException('Tag with ID invalid-id not found'),
      );

      await expect(controller.remove('invalid-id')).rejects.toThrow(NotFoundException);
    });
  });
});
