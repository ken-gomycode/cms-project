import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHealthStatus() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'CMS API',
      version: '1.0.0',
    };
  }
}
