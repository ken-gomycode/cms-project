import { IsEmail, IsOptional, IsString, IsUUID } from 'class-validator';

/**
 * DTO for creating a new comment
 * Supports both authenticated users (authorId from token) and guest users (authorName/authorEmail)
 */
export class CreateCommentDto {
  @IsString()
  body: string;

  @IsUUID('4')
  contentId: string;

  @IsOptional()
  @IsUUID('4')
  parentId?: string;

  @IsOptional()
  @IsString()
  authorName?: string;

  @IsOptional()
  @IsEmail()
  authorEmail?: string;
}
