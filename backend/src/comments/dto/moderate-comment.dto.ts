import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { CommentStatus } from '@prisma/client';

/**
 * DTO for moderating a single comment
 * Allows changing comment status (PENDING, APPROVED, REJECTED, SPAM)
 */
export class ModerateCommentDto {
  @ApiProperty({
    description: 'Comment moderation status',
    enum: CommentStatus,
    example: CommentStatus.APPROVED,
  })
  @IsEnum(CommentStatus)
  status: CommentStatus;
}
