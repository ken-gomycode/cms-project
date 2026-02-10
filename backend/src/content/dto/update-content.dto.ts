import { PartialType } from '@nestjs/swagger';

import { CreateContentDto } from './create-content.dto';

/**
 * DTO for updating content
 * All fields are optional (partial)
 */
export class UpdateContentDto extends PartialType(CreateContentDto) {}
