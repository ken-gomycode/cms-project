import { PartialType } from '@nestjs/mapped-types';
import { CreateContentDto } from './create-content.dto';

/**
 * DTO for updating content
 * All fields are optional (partial)
 */
export class UpdateContentDto extends PartialType(CreateContentDto) {}
