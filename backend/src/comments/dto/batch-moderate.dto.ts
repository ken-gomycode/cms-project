import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsEnum, IsUUID } from 'class-validator';
import { CommentStatus } from '@prisma/client';

/**
 * DTO for batch moderating multiple comments
 * Allows updating status for multiple comments at once
 */
export class BatchModerateDto {
  @ApiProperty({
    description: 'Array of comment UUIDs',
    example: ['123e4567-e89b-12d3-a456-426614174000'],
    type: [String],
  })
  @IsArray()
  @IsUUID('4', { each: true })
  ids: string[];

  @ApiProperty({
    description: 'Comment moderation status',
    enum: CommentStatus,
    example: CommentStatus.APPROVED,
  })
  @IsEnum(CommentStatus)
  status: CommentStatus;
}
