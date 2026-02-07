import { IsNotEmpty, IsString, MinLength } from 'class-validator';

/**
 * DTO for autocomplete suggestions
 */
export class SuggestQueryDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  q: string;
}
