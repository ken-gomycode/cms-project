import { Injectable } from '@nestjs/common';
import { AuditLog, Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

import { QueryAuditLogsDto } from './dto/query-audit-logs.dto';

export interface CreateAuditLogParams {
  userId?: string;
  action: string;
  entity: string;
  entityId?: string;
  details?: Prisma.JsonValue;
  ipAddress?: string;
}

export interface PaginatedAuditLogs {
  data: AuditLog[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create an audit log entry
   */
  async createLog(params: CreateAuditLogParams): Promise<AuditLog> {
    return this.prisma.auditLog.create({
      data: {
        userId: params.userId,
        action: params.action,
        entity: params.entity,
        entityId: params.entityId,
        details: params.details as Prisma.InputJsonValue,
        ipAddress: params.ipAddress,
      },
    });
  }

  /**
   * Retrieve paginated audit logs with optional filters
   */
  async findAll(query: QueryAuditLogsDto): Promise<PaginatedAuditLogs> {
    const { page = 1, limit = 20, userId, action, entity, entityId, ipAddress } = query;

    const where: Prisma.AuditLogWhereInput = {};

    if (userId) {
      where.userId = userId;
    }

    if (action) {
      where.action = action;
    }

    if (entity) {
      where.entity = entity;
    }

    if (entityId) {
      where.entityId = entityId;
    }

    if (ipAddress) {
      where.ipAddress = ipAddress;
    }

    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get audit logs for a specific entity
   */
  async findByEntity(entity: string, entityId: string): Promise<AuditLog[]> {
    return this.prisma.auditLog.findMany({
      where: {
        entity,
        entityId,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Get audit logs for a specific user
   */
  async findByUser(userId: string): Promise<AuditLog[]> {
    return this.prisma.auditLog.findMany({
      where: {
        userId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }
}
