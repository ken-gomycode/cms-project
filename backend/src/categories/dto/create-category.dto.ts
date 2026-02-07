import { IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateCategoryDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsUUID()
  @IsOptional()
  parentId?: string;
}
