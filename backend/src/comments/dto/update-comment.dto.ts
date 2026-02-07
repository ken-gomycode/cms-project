import { IsString } from 'class-validator';

/**
 * DTO for updating a comment
 * Only the comment body can be updated
 */
export class UpdateCommentDto {
  @IsString()
  body: string;
}
