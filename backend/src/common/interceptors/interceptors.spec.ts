import { CallHandler, ExecutionContext, Logger } from '@nestjs/common';
import { of, throwError } from 'rxjs';

import { LoggingInterceptor } from './logging.interceptor';
import { TransformInterceptor } from './transform.interceptor';

describe('LoggingInterceptor', () => {
  let interceptor: LoggingInterceptor;
  let mockExecutionContext: ExecutionContext;
  let mockCallHandler: CallHandler;

  beforeEach(() => {
    interceptor = new LoggingInterceptor();
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();

    mockExecutionContext = {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: () => ({
          method: 'GET',
          url: '/test',
        }),
        getResponse: () => ({
          statusCode: 200,
        }),
      }),
    } as any;

    mockCallHandler = {
      handle: jest.fn(),
    };
  });

  it('should be defined', () => {
    expect(interceptor).toBeDefined();
  });

  it('should log successful requests', (done) => {
    mockCallHandler.handle = jest.fn().mockReturnValue(of({ data: 'test' }));

    interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
      complete: () => {
        expect(Logger.prototype.log).toHaveBeenCalledWith(expect.stringContaining('GET /test 200'));
        done();
      },
    });
  });

  it('should log error requests', (done) => {
    mockCallHandler.handle = jest
      .fn()
      .mockReturnValue(throwError(() => ({ status: 404, message: 'Not found' })));

    interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
      error: () => {
        expect(Logger.prototype.error).toHaveBeenCalledWith(
          expect.stringContaining('GET /test 404'),
        );
        done();
      },
    });
  });
});

describe('TransformInterceptor', () => {
  let interceptor: TransformInterceptor<any>;
  let mockExecutionContext: ExecutionContext;
  let mockCallHandler: CallHandler;

  beforeEach(() => {
    interceptor = new TransformInterceptor();

    mockExecutionContext = {
      switchToHttp: jest.fn().mockReturnValue({
        getResponse: () => ({
          statusCode: 200,
        }),
      }),
    } as any;

    mockCallHandler = {
      handle: jest.fn(),
    };
  });

  it('should be defined', () => {
    expect(interceptor).toBeDefined();
  });

  it('should transform response with data, statusCode, and timestamp', (done) => {
    const testData = { id: 1, name: 'test' };
    mockCallHandler.handle = jest.fn().mockReturnValue(of(testData));

    interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
      next: (response) => {
        expect(response).toHaveProperty('data', testData);
        expect(response).toHaveProperty('statusCode', 200);
        expect(response).toHaveProperty('timestamp');
        expect(typeof response.timestamp).toBe('string');
        done();
      },
    });
  });
});
