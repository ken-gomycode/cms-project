import { IsEnum } from 'class-validator';
import { CommentStatus } from '@prisma/client';

/**
 * DTO for moderating a single comment
 * Allows changing comment status (PENDING, APPROVED, REJECTED, SPAM)
 */
export class ModerateCommentDto {
  @IsEnum(CommentStatus)
  status: CommentStatus;
}
