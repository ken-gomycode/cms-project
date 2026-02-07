import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

import { AnalyticsService } from './analytics.service';

/**
 * Analytics Interceptor
 * Automatically tracks content views for GET requests to content detail endpoints
 */
@Injectable()
export class AnalyticsInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AnalyticsInterceptor.name);

  constructor(private readonly analyticsService: AnalyticsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    // Only track successful GET requests
    if (request.method !== 'GET') {
      return next.handle();
    }

    return next.handle().pipe(
      tap(async (data) => {
        // Only track if response is successful (2xx)
        if (response.statusCode >= 200 && response.statusCode < 300) {
          // Extract content ID from response data
          const contentId = data?.id;

          if (contentId) {
            // Get IP address from request
            const ipAddress =
              request.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
              request.headers['x-real-ip'] ||
              request.connection?.remoteAddress ||
              request.socket?.remoteAddress ||
              'unknown';

            // Track view asynchronously (don't wait for it to complete)
            this.analyticsService.trackView(contentId, ipAddress).catch((error) => {
              this.logger.error(`Failed to track view for content ${contentId}: ${error.message}`);
            });
          }
        }
      }),
    );
  }
}
