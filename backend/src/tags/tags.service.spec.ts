import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTagDto } from './dto/create-tag.dto';
import { UpdateTagDto } from './dto/update-tag.dto';
import { TagsService } from './tags.service';

describe('TagsService', () => {
  let service: TagsService;
  let prisma: PrismaService;

  const mockPrismaService = {
    tag: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TagsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<TagsService>(TagsService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createDto: CreateTagDto = {
      name: 'JavaScript',
    };

    it('should create a tag with auto-generated slug', async () => {
      const mockTag = {
        id: '1',
        name: 'JavaScript',
        slug: 'javascript',
        createdAt: new Date(),
      };

      mockPrismaService.tag.findUnique
        .mockResolvedValueOnce(null) // slug check
        .mockResolvedValueOnce(null); // name check
      mockPrismaService.tag.create.mockResolvedValue(mockTag);

      const result = await service.create(createDto);

      expect(result).toEqual(mockTag);
      expect(prisma.tag.create).toHaveBeenCalledWith({
        data: {
          name: 'JavaScript',
          slug: 'javascript',
        },
      });
    });

    it('should throw error if slug already exists', async () => {
      const existingTag = {
        id: '1',
        slug: 'javascript',
        name: 'JavaScript',
      };

      mockPrismaService.tag.findUnique.mockResolvedValue(existingTag);

      await expect(service.create(createDto)).rejects.toThrow(BadRequestException);
      await expect(service.create(createDto)).rejects.toThrow(
        'Tag with slug "javascript" already exists',
      );
    });

    it('should throw error if name already exists', async () => {
      const existingTag = {
        id: '1',
        slug: 'javascript',
        name: 'JavaScript',
      };

      mockPrismaService.tag.findUnique
        .mockResolvedValueOnce(null) // slug check passes
        .mockResolvedValueOnce(existingTag); // name check fails

      await expect(service.create(createDto)).rejects.toThrow(
        'Tag with name "JavaScript" already exists',
      );
    });
  });

  describe('findAll', () => {
    it('should return paginated tags with content count', async () => {
      const query: PaginationQueryDto = {
        page: 1,
        limit: 10,
      };

      const mockTags = [
        {
          id: '1',
          name: 'JavaScript',
          slug: 'javascript',
          createdAt: new Date(),
          _count: { contents: 5 },
        },
        {
          id: '2',
          name: 'TypeScript',
          slug: 'typescript',
          createdAt: new Date(),
          _count: { contents: 3 },
        },
      ];

      mockPrismaService.tag.count.mockResolvedValue(2);
      mockPrismaService.tag.findMany.mockResolvedValue(mockTags);

      const result = await service.findAll(query);

      expect(result.data).toEqual(mockTags);
      expect(result.meta).toEqual({
        total: 2,
        page: 1,
        limit: 10,
        totalPages: 1,
      });
      expect(prisma.tag.findMany).toHaveBeenCalledWith({
        skip: 0,
        take: 10,
        orderBy: { name: 'asc' },
        include: {
          _count: {
            select: { contents: true },
          },
        },
      });
    });

    it('should handle pagination correctly', async () => {
      const query: PaginationQueryDto = {
        page: 2,
        limit: 5,
      };

      mockPrismaService.tag.count.mockResolvedValue(15);
      mockPrismaService.tag.findMany.mockResolvedValue([]);

      const result = await service.findAll(query);

      expect(prisma.tag.findMany).toHaveBeenCalledWith({
        skip: 5,
        take: 5,
        orderBy: { name: 'asc' },
        include: {
          _count: {
            select: { contents: true },
          },
        },
      });
      expect(result.meta.totalPages).toBe(3);
    });
  });

  describe('findOne', () => {
    it('should return a tag with content count', async () => {
      const mockTag = {
        id: '1',
        name: 'JavaScript',
        slug: 'javascript',
        createdAt: new Date(),
        _count: { contents: 5 },
      };

      mockPrismaService.tag.findUnique.mockResolvedValue(mockTag);

      const result = await service.findOne('1');

      expect(result).toEqual(mockTag);
      expect(prisma.tag.findUnique).toHaveBeenCalledWith({
        where: { id: '1' },
        include: {
          _count: {
            select: { contents: true },
          },
        },
      });
    });

    it('should throw NotFoundException if tag does not exist', async () => {
      mockPrismaService.tag.findUnique.mockResolvedValue(null);

      await expect(service.findOne('invalid-id')).rejects.toThrow(NotFoundException);
      await expect(service.findOne('invalid-id')).rejects.toThrow(
        'Tag with ID invalid-id not found',
      );
    });
  });

  describe('update', () => {
    const existingTag = {
      id: '1',
      name: 'JavaScript',
      slug: 'javascript',
      createdAt: new Date(),
    };

    it('should update tag and regenerate slug when name changes', async () => {
      const updateDto: UpdateTagDto = {
        name: 'TypeScript',
      };

      const updatedTag = {
        ...existingTag,
        name: 'TypeScript',
        slug: 'typescript',
      };

      mockPrismaService.tag.findUnique
        .mockResolvedValueOnce(existingTag) // tag exists check
        .mockResolvedValueOnce(null) // slug check
        .mockResolvedValueOnce(null); // name check
      mockPrismaService.tag.update.mockResolvedValue(updatedTag);

      const result = await service.update('1', updateDto);

      expect(result).toEqual(updatedTag);
      expect(prisma.tag.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: {
          name: 'TypeScript',
          slug: 'typescript',
        },
      });
    });

    it('should return existing tag if name is not provided', async () => {
      const updateDto: UpdateTagDto = {};

      mockPrismaService.tag.findUnique.mockResolvedValue(existingTag);

      const result = await service.update('1', updateDto);

      expect(result).toEqual(existingTag);
      expect(prisma.tag.update).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if tag does not exist', async () => {
      const updateDto: UpdateTagDto = {
        name: 'TypeScript',
      };

      mockPrismaService.tag.findUnique.mockResolvedValue(null);

      await expect(service.update('invalid-id', updateDto)).rejects.toThrow(NotFoundException);
    });

    it('should throw error if updated slug already exists', async () => {
      const updateDto: UpdateTagDto = {
        name: 'TypeScript',
      };

      const conflictingTag = {
        id: '2',
        slug: 'typescript',
        name: 'TypeScript',
      };

      mockPrismaService.tag.findUnique
        .mockResolvedValueOnce(existingTag) // tag exists check
        .mockResolvedValueOnce(conflictingTag); // slug check fails

      await expect(service.update('1', updateDto)).rejects.toThrow(BadRequestException);
    });

    it('should throw error if updated name already exists', async () => {
      const updateDto: UpdateTagDto = {
        name: 'TypeScript',
      };

      const conflictingTag = {
        id: '2',
        slug: 'typescript',
        name: 'TypeScript',
      };

      mockPrismaService.tag.findUnique
        .mockResolvedValueOnce(existingTag) // tag exists check
        .mockResolvedValueOnce(null) // slug check passes
        .mockResolvedValueOnce(conflictingTag); // name check fails

      await expect(service.update('1', updateDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('remove', () => {
    it('should delete a tag', async () => {
      const mockTag = {
        id: '1',
        name: 'JavaScript',
        slug: 'javascript',
        createdAt: new Date(),
      };

      mockPrismaService.tag.findUnique.mockResolvedValue(mockTag);
      mockPrismaService.tag.delete.mockResolvedValue(mockTag);

      await service.remove('1');

      expect(prisma.tag.delete).toHaveBeenCalledWith({
        where: { id: '1' },
      });
    });

    it('should throw NotFoundException if tag does not exist', async () => {
      mockPrismaService.tag.findUnique.mockResolvedValue(null);

      await expect(service.remove('invalid-id')).rejects.toThrow(NotFoundException);
      await expect(service.remove('invalid-id')).rejects.toThrow(
        'Tag with ID invalid-id not found',
      );
      expect(prisma.tag.delete).not.toHaveBeenCalled();
    });
  });
});
