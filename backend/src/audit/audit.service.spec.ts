import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from '../prisma/prisma.service';

import { AuditService } from './audit.service';
import { QueryAuditLogsDto } from './dto/query-audit-logs.dto';

describe('AuditService', () => {
  let service: AuditService;
  let prisma: PrismaService;

  const mockPrismaService = {
    auditLog: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<AuditService>(AuditService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createLog', () => {
    it('should create an audit log entry', async () => {
      const auditLogData = {
        userId: 'user-1',
        action: 'CREATE',
        entity: 'CONTENT',
        entityId: 'content-1',
        details: { title: 'Test Content' },
        ipAddress: '127.0.0.1',
      };

      const expectedResult = {
        id: 'log-1',
        createdAt: new Date(),
        ...auditLogData,
      };

      mockPrismaService.auditLog.create.mockResolvedValue(expectedResult);

      const result = await service.createLog(auditLogData);

      expect(result).toEqual(expectedResult);
      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: auditLogData,
      });
    });

    it('should create audit log without optional fields', async () => {
      const auditLogData = {
        action: 'DELETE',
        entity: 'CONTENT',
      };

      const expectedResult = {
        id: 'log-2',
        createdAt: new Date(),
        userId: null,
        entityId: null,
        details: null,
        ipAddress: null,
        ...auditLogData,
      };

      mockPrismaService.auditLog.create.mockResolvedValue(expectedResult);

      const result = await service.createLog(auditLogData);

      expect(result).toEqual(expectedResult);
    });

    it('should handle complex details object', async () => {
      const complexDetails = {
        oldValue: { title: 'Old Title', status: 'DRAFT' },
        newValue: { title: 'New Title', status: 'PUBLISHED' },
        changes: ['title', 'status'],
      };

      const auditLogData = {
        userId: 'user-1',
        action: 'UPDATE',
        entity: 'CONTENT',
        entityId: 'content-1',
        details: complexDetails,
        ipAddress: '192.168.1.1',
      };

      const expectedResult = {
        id: 'log-3',
        createdAt: new Date(),
        ...auditLogData,
      };

      mockPrismaService.auditLog.create.mockResolvedValue(expectedResult);

      const result = await service.createLog(auditLogData);

      expect(result.details).toEqual(complexDetails);
    });
  });

  describe('findAll', () => {
    it('should return paginated audit logs', async () => {
      const query: QueryAuditLogsDto = {
        page: 1,
        limit: 20,
      };

      const mockLogs = [
        {
          id: 'log-1',
          action: 'CREATE',
          entity: 'CONTENT',
          entityId: 'content-1',
          userId: 'user-1',
          user: {
            id: 'user-1',
            email: 'test@test.com',
            firstName: 'John',
            lastName: 'Doe',
          },
        },
      ];

      mockPrismaService.auditLog.findMany.mockResolvedValue(mockLogs);
      mockPrismaService.auditLog.count.mockResolvedValue(1);

      const result = await service.findAll(query);

      expect(result.data).toEqual(mockLogs);
      expect(result.pagination).toEqual({
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      });
    });

    it('should filter by userId', async () => {
      const query: QueryAuditLogsDto = {
        userId: 'user-1',
        page: 1,
        limit: 20,
      };

      mockPrismaService.auditLog.findMany.mockResolvedValue([]);
      mockPrismaService.auditLog.count.mockResolvedValue(0);

      await service.findAll(query);

      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: 'user-1',
          }),
        }),
      );
    });

    it('should filter by action', async () => {
      const query: QueryAuditLogsDto = {
        action: 'CREATE' as any,
        page: 1,
        limit: 20,
      };

      mockPrismaService.auditLog.findMany.mockResolvedValue([]);
      mockPrismaService.auditLog.count.mockResolvedValue(0);

      await service.findAll(query);

      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            action: 'CREATE',
          }),
        }),
      );
    });

    it('should filter by entity', async () => {
      const query: QueryAuditLogsDto = {
        entity: 'CONTENT',
        page: 1,
        limit: 20,
      };

      mockPrismaService.auditLog.findMany.mockResolvedValue([]);
      mockPrismaService.auditLog.count.mockResolvedValue(0);

      await service.findAll(query);

      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            entity: 'CONTENT',
          }),
        }),
      );
    });

    it('should filter by entityId', async () => {
      const query: QueryAuditLogsDto = {
        entityId: 'content-1',
        page: 1,
        limit: 20,
      };

      mockPrismaService.auditLog.findMany.mockResolvedValue([]);
      mockPrismaService.auditLog.count.mockResolvedValue(0);

      await service.findAll(query);

      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            entityId: 'content-1',
          }),
        }),
      );
    });

    it('should filter by ipAddress', async () => {
      const query: QueryAuditLogsDto = {
        ipAddress: '127.0.0.1',
        page: 1,
        limit: 20,
      };

      mockPrismaService.auditLog.findMany.mockResolvedValue([]);
      mockPrismaService.auditLog.count.mockResolvedValue(0);

      await service.findAll(query);

      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            ipAddress: '127.0.0.1',
          }),
        }),
      );
    });

    it('should handle pagination correctly', async () => {
      const query: QueryAuditLogsDto = {
        page: 2,
        limit: 10,
      };

      mockPrismaService.auditLog.findMany.mockResolvedValue([]);
      mockPrismaService.auditLog.count.mockResolvedValue(25);

      const result = await service.findAll(query);

      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10,
          take: 10,
        }),
      );

      expect(result.pagination).toEqual({
        total: 25,
        page: 2,
        limit: 10,
        totalPages: 3,
      });
    });

    it('should order by createdAt descending', async () => {
      const query: QueryAuditLogsDto = {
        page: 1,
        limit: 20,
      };

      mockPrismaService.auditLog.findMany.mockResolvedValue([]);
      mockPrismaService.auditLog.count.mockResolvedValue(0);

      await service.findAll(query);

      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: {
            createdAt: 'desc',
          },
        }),
      );
    });
  });

  describe('findByEntity', () => {
    it('should return audit logs for specific entity', async () => {
      const mockLogs = [
        {
          id: 'log-1',
          action: 'CREATE',
          entity: 'CONTENT',
          entityId: 'content-1',
          user: {
            id: 'user-1',
            email: 'test@test.com',
            firstName: 'John',
            lastName: 'Doe',
          },
        },
      ];

      mockPrismaService.auditLog.findMany.mockResolvedValue(mockLogs);

      const result = await service.findByEntity('CONTENT', 'content-1');

      expect(result).toEqual(mockLogs);
      expect(prisma.auditLog.findMany).toHaveBeenCalledWith({
        where: {
          entity: 'CONTENT',
          entityId: 'content-1',
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
    });
  });

  describe('findByUser', () => {
    it('should return audit logs for specific user', async () => {
      const mockLogs = [
        {
          id: 'log-1',
          action: 'CREATE',
          entity: 'CONTENT',
          userId: 'user-1',
        },
      ];

      mockPrismaService.auditLog.findMany.mockResolvedValue(mockLogs);

      const result = await service.findByUser('user-1');

      expect(result).toEqual(mockLogs);
      expect(prisma.auditLog.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
    });
  });
});
