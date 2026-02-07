import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';

import { CacheModule } from './cache.module';
import { CacheService } from './cache.service';

describe('CacheModule', () => {
  let module: TestingModule;

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
  });

  it('should compile module', async () => {
    mockConfigService.get.mockReturnValue('redis://localhost:6379');

    module = await Test.createTestingModule({
      imports: [CacheModule],
      providers: [
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    expect(module).toBeDefined();
  });

  it('should provide CacheService', async () => {
    mockConfigService.get.mockReturnValue('redis://localhost:6379');

    module = await Test.createTestingModule({
      imports: [CacheModule],
      providers: [
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    const cacheService = module.get<CacheService>(CacheService);
    expect(cacheService).toBeDefined();
  });

  it('should handle missing Redis URL', async () => {
    mockConfigService.get.mockReturnValue(undefined);

    module = await Test.createTestingModule({
      imports: [CacheModule],
      providers: [
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    expect(module).toBeDefined();
    const cacheService = module.get<CacheService>(CacheService);
    expect(cacheService).toBeDefined();
  });
});
