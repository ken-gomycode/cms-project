import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, IsUUID } from 'class-validator';

/**
 * DTO for creating a new comment
 * Supports both authenticated users (authorId from token) and guest users (authorName/authorEmail)
 */
export class CreateCommentDto {
  @ApiProperty({ description: 'Comment body text', example: 'This is a great article!' })
  @IsString()
  body: string;

  @ApiProperty({
    description: 'Content UUID to comment on',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID('4')
  contentId: string;

  @ApiProperty({
    description: 'Parent comment UUID for nested replies',
    example: '123e4567-e89b-12d3-a456-426614174001',
    required: false,
  })
  @IsOptional()
  @IsUUID('4')
  parentId?: string;

  @ApiProperty({
    description: 'Author name for guest comments',
    example: 'John Doe',
    required: false,
  })
  @IsOptional()
  @IsString()
  authorName?: string;

  @ApiProperty({
    description: 'Author email for guest comments',
    example: 'john@example.com',
    required: false,
  })
  @IsOptional()
  @IsEmail()
  authorEmail?: string;
}
