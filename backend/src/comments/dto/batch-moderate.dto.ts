import { IsArray, IsEnum, IsUUID } from 'class-validator';
import { CommentStatus } from '@prisma/client';

/**
 * DTO for batch moderating multiple comments
 * Allows updating status for multiple comments at once
 */
export class BatchModerateDto {
  @IsArray()
  @IsUUID('4', { each: true })
  ids: string[];

  @IsEnum(CommentStatus)
  status: CommentStatus;
}
