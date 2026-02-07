import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

/**
 * DTO for comparing two content versions
 * Used in version comparison endpoint
 */
export class CompareVersionsDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  v1: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  v2: number;
}
