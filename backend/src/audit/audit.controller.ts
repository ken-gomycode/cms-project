import { Controller, Get, Query, UseGuards } from '@nestjs/common';

import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

import { AuditService } from './audit.service';
import { QueryAuditLogsDto } from './dto/query-audit-logs.dto';

@Controller('audit-logs')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  /**
   * Get audit logs with pagination and filters
   * Only accessible by ADMIN users
   */
  @Get()
  @Roles('ADMIN')
  async findAll(@Query() query: QueryAuditLogsDto) {
    return this.auditService.findAll(query);
  }
}
