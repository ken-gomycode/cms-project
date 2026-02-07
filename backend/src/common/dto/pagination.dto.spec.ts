import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { PaginatedResponseDto } from './paginated-response.dto';
import { PaginationQueryDto, SortOrder } from './pagination-query.dto';

describe('PaginationQueryDto', () => {
  it('should use default values when not provided', async () => {
    const dto = plainToInstance(PaginationQueryDto, {});
    const errors = await validate(dto);

    expect(errors.length).toBe(0);
    expect(dto.page).toBe(1);
    expect(dto.limit).toBe(10);
    expect(dto.sortOrder).toBe(SortOrder.DESC);
  });

  it('should accept valid values', async () => {
    const dto = plainToInstance(PaginationQueryDto, {
      page: '2',
      limit: '20',
      sortBy: 'createdAt',
      sortOrder: 'asc',
    });
    const errors = await validate(dto);

    expect(errors.length).toBe(0);
    expect(dto.page).toBe(2);
    expect(dto.limit).toBe(20);
    expect(dto.sortBy).toBe('createdAt');
    expect(dto.sortOrder).toBe(SortOrder.ASC);
  });

  it('should fail for invalid page (less than 1)', async () => {
    const dto = plainToInstance(PaginationQueryDto, { page: '0' });
    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('page');
  });

  it('should fail for invalid limit (less than 1)', async () => {
    const dto = plainToInstance(PaginationQueryDto, { limit: '0' });
    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('limit');
  });

  it('should fail for invalid sortOrder', async () => {
    const dto = plainToInstance(PaginationQueryDto, { sortOrder: 'invalid' });
    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('sortOrder');
  });
});

describe('PaginatedResponseDto', () => {
  it('should create response with correct structure', () => {
    const data = [{ id: 1 }, { id: 2 }];
    const response = new PaginatedResponseDto(data, 50, 2, 10);

    expect(response.data).toEqual(data);
    expect(response.meta.total).toBe(50);
    expect(response.meta.page).toBe(2);
    expect(response.meta.limit).toBe(10);
    expect(response.meta.totalPages).toBe(5);
  });

  it('should calculate totalPages correctly for non-divisible numbers', () => {
    const data = [{ id: 1 }];
    const response = new PaginatedResponseDto(data, 23, 1, 10);

    expect(response.meta.totalPages).toBe(3);
  });

  it('should handle single page', () => {
    const data = [{ id: 1 }];
    const response = new PaginatedResponseDto(data, 5, 1, 10);

    expect(response.meta.totalPages).toBe(1);
  });

  it('should handle empty results', () => {
    const data: any[] = [];
    const response = new PaginatedResponseDto(data, 0, 1, 10);

    expect(response.data).toEqual([]);
    expect(response.meta.total).toBe(0);
    expect(response.meta.totalPages).toBe(0);
  });
});
