import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

/**
 * DTO for comparing two content versions
 * Used in version comparison endpoint
 */
export class CompareVersionsDto {
  @ApiProperty({ description: 'First version number to compare', example: 1, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  v1: number;

  @ApiProperty({ description: 'Second version number to compare', example: 2, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  v2: number;
}
