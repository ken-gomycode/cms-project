import { IsOptional, IsString } from 'class-validator';

export class UpdateMediaDto {
  @IsString()
  @IsOptional()
  altText?: string;
}
