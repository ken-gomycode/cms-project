import { Test, TestingModule } from '@nestjs/testing';

import { AuditController } from './audit.controller';
import { AuditService } from './audit.service';
import { QueryAuditLogsDto } from './dto/query-audit-logs.dto';

describe('AuditController', () => {
  let controller: AuditController;
  let service: AuditService;

  const mockAuditService = {
    findAll: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuditController],
      providers: [
        {
          provide: AuditService,
          useValue: mockAuditService,
        },
      ],
    }).compile();

    controller = module.get<AuditController>(AuditController);
    service = module.get<AuditService>(AuditService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return paginated audit logs', async () => {
      const query: QueryAuditLogsDto = {
        page: 1,
        limit: 20,
      };

      const expectedResult = {
        data: [
          {
            id: 'log-1',
            action: 'CREATE',
            entity: 'CONTENT',
            entityId: 'content-1',
            userId: 'user-1',
            user: {
              id: 'user-1',
              email: 'admin@test.com',
              firstName: 'Admin',
              lastName: 'User',
            },
            details: {},
            ipAddress: '127.0.0.1',
            createdAt: new Date(),
          },
        ],
        pagination: {
          total: 1,
          page: 1,
          limit: 20,
          totalPages: 1,
        },
      };

      mockAuditService.findAll.mockResolvedValue(expectedResult);

      const result = await controller.findAll(query);

      expect(result).toEqual(expectedResult);
      expect(service.findAll).toHaveBeenCalledWith(query);
    });

    it('should pass filters to service', async () => {
      const query: QueryAuditLogsDto = {
        page: 1,
        limit: 10,
        userId: 'user-1',
        action: 'CREATE' as any,
        entity: 'CONTENT',
      };

      const expectedResult = {
        data: [],
        pagination: {
          total: 0,
          page: 1,
          limit: 10,
          totalPages: 0,
        },
      };

      mockAuditService.findAll.mockResolvedValue(expectedResult);

      await controller.findAll(query);

      expect(service.findAll).toHaveBeenCalledWith(query);
    });
  });
});
