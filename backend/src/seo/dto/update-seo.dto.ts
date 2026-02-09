import { PartialType } from '@nestjs/swagger';

import { CreateSeoDto } from './create-seo.dto';

/**
 * DTO for updating SEO metadata
 * Extends CreateSeoDto and makes all fields optional via PartialType
 */
export class UpdateSeoDto extends PartialType(CreateSeoDto) {}
