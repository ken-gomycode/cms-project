import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UploadMediaDto {
  @ApiProperty({
    description: 'Alternative text for the media file',
    example: 'A beautiful sunset over the ocean',
    required: false,
  })
  @IsString()
  @IsOptional()
  altText?: string;
}
