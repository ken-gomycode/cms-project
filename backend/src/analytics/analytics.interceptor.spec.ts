import { ExecutionContext } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { of } from 'rxjs';

import { AnalyticsInterceptor } from './analytics.interceptor';
import { AnalyticsService } from './analytics.service';

describe('AnalyticsInterceptor', () => {
  let interceptor: AnalyticsInterceptor;
  let analyticsService: AnalyticsService;

  const mockAnalyticsService = {
    trackView: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsInterceptor,
        {
          provide: AnalyticsService,
          useValue: mockAnalyticsService,
        },
      ],
    }).compile();

    interceptor = module.get<AnalyticsInterceptor>(AnalyticsInterceptor);
    analyticsService = module.get<AnalyticsService>(AnalyticsService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(interceptor).toBeDefined();
  });

  describe('intercept', () => {
    it('should track view for successful GET request with content ID', (done) => {
      const contentId = 'content-123';
      const ipAddress = '192.168.1.1';

      const mockRequest = {
        method: 'GET',
        headers: {
          'x-forwarded-for': ipAddress,
        },
        connection: {},
      };

      const mockResponse = {
        statusCode: 200,
      };

      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
          getResponse: () => mockResponse,
        }),
      } as ExecutionContext;

      const mockCallHandler = {
        handle: () => of({ id: contentId, title: 'Test Content' }),
      };

      mockAnalyticsService.trackView.mockResolvedValue(undefined);

      interceptor.intercept(mockContext, mockCallHandler).subscribe({
        next: (data) => {
          expect(data).toEqual({ id: contentId, title: 'Test Content' });

          // Give async operation time to complete
          setTimeout(() => {
            expect(mockAnalyticsService.trackView).toHaveBeenCalledWith(contentId, ipAddress);
            done();
          }, 10);
        },
        error: done,
      });
    });

    it('should extract IP from x-real-ip header when x-forwarded-for is not available', (done) => {
      const contentId = 'content-123';
      const ipAddress = '10.0.0.1';

      const mockRequest = {
        method: 'GET',
        headers: {
          'x-real-ip': ipAddress,
        },
        connection: {},
      };

      const mockResponse = {
        statusCode: 200,
      };

      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
          getResponse: () => mockResponse,
        }),
      } as ExecutionContext;

      const mockCallHandler = {
        handle: () => of({ id: contentId }),
      };

      mockAnalyticsService.trackView.mockResolvedValue(undefined);

      interceptor.intercept(mockContext, mockCallHandler).subscribe({
        next: () => {
          setTimeout(() => {
            expect(mockAnalyticsService.trackView).toHaveBeenCalledWith(contentId, ipAddress);
            done();
          }, 10);
        },
        error: done,
      });
    });

    it('should use connection remote address as fallback', (done) => {
      const contentId = 'content-123';
      const ipAddress = '127.0.0.1';

      const mockRequest = {
        method: 'GET',
        headers: {},
        connection: {
          remoteAddress: ipAddress,
        },
      };

      const mockResponse = {
        statusCode: 200,
      };

      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
          getResponse: () => mockResponse,
        }),
      } as ExecutionContext;

      const mockCallHandler = {
        handle: () => of({ id: contentId }),
      };

      mockAnalyticsService.trackView.mockResolvedValue(undefined);

      interceptor.intercept(mockContext, mockCallHandler).subscribe({
        next: () => {
          setTimeout(() => {
            expect(mockAnalyticsService.trackView).toHaveBeenCalledWith(contentId, ipAddress);
            done();
          }, 10);
        },
        error: done,
      });
    });

    it('should not track view for non-GET requests', (done) => {
      const mockRequest = {
        method: 'POST',
        headers: {},
      };

      const mockResponse = {
        statusCode: 201,
      };

      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
          getResponse: () => mockResponse,
        }),
      } as ExecutionContext;

      const mockCallHandler = {
        handle: () => of({ id: 'content-123' }),
      };

      interceptor.intercept(mockContext, mockCallHandler).subscribe({
        next: () => {
          setTimeout(() => {
            expect(mockAnalyticsService.trackView).not.toHaveBeenCalled();
            done();
          }, 10);
        },
        error: done,
      });
    });

    it('should not track view when response status is not 2xx', (done) => {
      const mockRequest = {
        method: 'GET',
        headers: {},
        connection: {},
      };

      const mockResponse = {
        statusCode: 404,
      };

      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
          getResponse: () => mockResponse,
        }),
      } as ExecutionContext;

      const mockCallHandler = {
        handle: () => of({ message: 'Not found' }),
      };

      interceptor.intercept(mockContext, mockCallHandler).subscribe({
        next: () => {
          setTimeout(() => {
            expect(mockAnalyticsService.trackView).not.toHaveBeenCalled();
            done();
          }, 10);
        },
        error: done,
      });
    });

    it('should not track view when response has no content ID', (done) => {
      const mockRequest = {
        method: 'GET',
        headers: {},
        connection: {},
      };

      const mockResponse = {
        statusCode: 200,
      };

      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
          getResponse: () => mockResponse,
        }),
      } as ExecutionContext;

      const mockCallHandler = {
        handle: () => of({ title: 'Test Content' }), // No ID
      };

      interceptor.intercept(mockContext, mockCallHandler).subscribe({
        next: () => {
          setTimeout(() => {
            expect(mockAnalyticsService.trackView).not.toHaveBeenCalled();
            done();
          }, 10);
        },
        error: done,
      });
    });

    it('should handle tracking errors gracefully', (done) => {
      const contentId = 'content-123';

      const mockRequest = {
        method: 'GET',
        headers: {},
        connection: {
          remoteAddress: '127.0.0.1',
        },
      };

      const mockResponse = {
        statusCode: 200,
      };

      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
          getResponse: () => mockResponse,
        }),
      } as ExecutionContext;

      const mockCallHandler = {
        handle: () => of({ id: contentId }),
      };

      mockAnalyticsService.trackView.mockRejectedValue(new Error('Tracking failed'));

      // Should not throw error
      interceptor.intercept(mockContext, mockCallHandler).subscribe({
        next: (data) => {
          expect(data).toEqual({ id: contentId });
          done();
        },
        error: done,
      });
    });
  });
});
