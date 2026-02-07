import { IsOptional, IsString } from 'class-validator';

/**
 * DTO for updating user's own profile
 * Limited to safe fields that users can modify themselves
 */
export class UpdateProfileDto {
  @IsString()
  @IsOptional()
  firstName?: string;

  @IsString()
  @IsOptional()
  lastName?: string;

  @IsString()
  @IsOptional()
  avatar?: string;
}
