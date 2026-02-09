import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

/**
 * DTO for autocomplete suggestions
 */
export class SuggestQueryDto {
  @ApiProperty({
    description: 'Search query for suggestions (minimum 2 characters)',
    example: 'java',
    minLength: 2,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  q: string;
}
