import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, tap } from 'rxjs';

import { AuditService } from './audit.service';

/**
 * Interceptor that automatically logs audit trails for mutation operations
 * Logs POST, PATCH, PUT, and DELETE requests
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private readonly auditService: AuditService,
    private readonly reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const method = request.method;

    // Only log mutation operations
    const mutationMethods = ['POST', 'PATCH', 'PUT', 'DELETE'];
    if (!mutationMethods.includes(method)) {
      return next.handle();
    }

    const user = request.user;
    const userId = user?.id;
    const ipAddress = this.getClientIp(request);

    // Extract entity information from the route
    const entity = this.extractEntityName(request.route?.path || request.url);

    return next.handle().pipe(
      tap((response) => {
        // Determine the action based on HTTP method
        const action = this.mapMethodToAction(method);

        // Extract entity ID from response or request params
        const entityId = this.extractEntityId(request, response);

        // Build audit log details
        const details: any = {
          method,
          path: request.url,
          body: this.sanitizeBody(request.body),
          params: request.params,
          query: request.query,
        };

        // Log the audit entry asynchronously (fire and forget)
        this.auditService
          .createLog({
            userId,
            action,
            entity,
            entityId,
            details,
            ipAddress,
          })
          .catch((error) => {
            // Log error but don't fail the request
            console.error('Failed to create audit log:', error);
          });
      }),
    );
  }

  /**
   * Get client IP address from request
   */
  private getClientIp(request: any): string {
    return (
      request.headers['x-forwarded-for']?.split(',')[0] ||
      request.headers['x-real-ip'] ||
      request.connection?.remoteAddress ||
      request.socket?.remoteAddress ||
      request.ip
    );
  }

  /**
   * Extract entity name from route path
   */
  private extractEntityName(path: string): string {
    // Remove leading slash and extract first segment
    const segments = path.replace(/^\//, '').split('/');
    // Return first segment, capitalized
    return segments[0]?.toUpperCase() || 'UNKNOWN';
  }

  /**
   * Map HTTP method to audit action
   */
  private mapMethodToAction(method: string): string {
    const actionMap: Record<string, string> = {
      POST: 'CREATE',
      PATCH: 'UPDATE',
      PUT: 'UPDATE',
      DELETE: 'DELETE',
    };
    return actionMap[method] || method;
  }

  /**
   * Extract entity ID from request params or response
   */
  private extractEntityId(request: any, response: any): string | undefined {
    // Try to get ID from request params
    if (request.params?.id) {
      return request.params.id;
    }

    // Try to get ID from response
    if (response && typeof response === 'object') {
      return response.id || response.data?.id;
    }

    return undefined;
  }

  /**
   * Sanitize request body to remove sensitive information
   */
  private sanitizeBody(body: any): any {
    if (!body || typeof body !== 'object') {
      return body;
    }

    const sanitized = { ...body };
    const sensitiveFields = ['password', 'refreshToken', 'token', 'secret'];

    for (const field of sensitiveFields) {
      if (field in sanitized) {
        sanitized[field] = '[REDACTED]';
      }
    }

    return sanitized;
  }
}
