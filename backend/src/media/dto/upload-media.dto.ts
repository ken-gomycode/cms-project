import { IsOptional, IsString } from 'class-validator';

export class UploadMediaDto {
  @IsString()
  @IsOptional()
  altText?: string;
}
