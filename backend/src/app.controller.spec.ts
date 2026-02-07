import { Test, TestingModule } from '@nestjs/testing';

import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let controller: AppController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    controller = module.get<AppController>(AppController);
  });

  describe('healthCheck', () => {
    it('should return health status', () => {
      const result = controller.healthCheck();
      expect(result).toHaveProperty('status', 'ok');
      expect(result).toHaveProperty('service', 'CMS API');
      expect(result).toHaveProperty('version', '1.0.0');
      expect(result).toHaveProperty('timestamp');
    });
  });
});
