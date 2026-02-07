import { PartialType } from '@nestjs/mapped-types';

import { CreateSeoDto } from './create-seo.dto';

/**
 * DTO for updating SEO metadata
 * Extends CreateSeoDto and makes all fields optional via PartialType
 */
export class UpdateSeoDto extends PartialType(CreateSeoDto) {}
