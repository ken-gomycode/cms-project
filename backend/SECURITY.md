# Security Features

This document outlines the security features implemented in the CMS backend.

## Rate Limiting

The application uses `@nestjs/throttler` to implement rate limiting at multiple levels:

### Global Rate Limit
- **Limit**: 60 requests per minute per IP
- **TTL**: 60 seconds
- **Applies to**: All endpoints by default

### Auth Endpoint Rate Limits
Stricter rate limits are applied to authentication endpoints to prevent brute-force attacks:

- **Login**: 5 requests per minute
- **Register**: 3 requests per minute

To override rate limits on specific endpoints, use the `@Throttle()` decorator:
```typescript
@Throttle({ default: { limit: 5, ttl: 60000 } })
```

## Security Headers

The application uses `helmet` middleware to set security-related HTTP headers:

- **Content Security Policy (CSP)**: Restricts resource loading
- **HSTS**: Enforces HTTPS connections (1 year max-age)
- **X-Content-Type-Options**: Prevents MIME type sniffing
- **X-XSS-Protection**: Enables browser XSS protection
- **Referrer-Policy**: Controls referrer information

## CORS Protection

Cross-Origin Resource Sharing (CORS) is configured to:
- Allow requests only from the configured `FRONTEND_URL`
- Enable credentials (cookies, authorization headers)
- Allow specific HTTP methods: GET, POST, PUT, PATCH, DELETE, OPTIONS
- Allow specific headers: Content-Type, Authorization, X-CSRF-Token

## CSRF Protection

Cross-Site Request Forgery (CSRF) protection is implemented using `csurf`:
- CSRF tokens are generated for each session
- Tokens are stored in HTTP-only cookies
- Tokens must be included in mutation requests (POST, PUT, PATCH, DELETE)
- In production, CSRF cookies are sent only over HTTPS

**Important**: Frontend applications must include the CSRF token in the `X-CSRF-Token` header for mutation requests.

## Input Sanitization

All user input is automatically sanitized using the `SanitizationPipe` to prevent XSS attacks:

### What Gets Sanitized
- All string inputs from request bodies, query parameters, and route parameters
- Nested objects and arrays are recursively sanitized

### Sanitization Rules
- Dangerous HTML tags are removed: `<script>`, `<iframe>`, etc.
- Event handlers are stripped: `onerror`, `onclick`, etc.
- Dangerous protocols are blocked: `javascript:`, `data:`
- Null bytes are removed
- Whitespace is trimmed

### Allowed HTML Tags
The following safe HTML tags are allowed:
- Text formatting: `<b>`, `<i>`, `<em>`, `<strong>`
- Links: `<a>` (with href, title, target attributes)
- Structure: `<p>`, `<br>`, `<ul>`, `<ol>`, `<li>`, `<blockquote>`
- Code: `<code>`, `<pre>`

### Example XSS Attacks Prevented
```javascript
// Input: <script>alert('XSS')</script>Hello
// Output: Hello

// Input: <img src=x onerror=alert(1)>
// Output: (empty string)

// Input: <a href="javascript:alert(1)">Click</a>
// Output: Click (link removed)
```

## Audit Logging

All mutation operations (POST, PATCH, PUT, DELETE) are automatically logged to the `AuditLog` table.

### What Gets Logged
- **userId**: ID of the authenticated user (if authenticated)
- **action**: CREATE, UPDATE, or DELETE
- **entity**: The resource being modified (e.g., CONTENT, USER)
- **entityId**: ID of the specific entity
- **details**: Request details including method, path, body, params, query
- **ipAddress**: Client IP address
- **createdAt**: Timestamp

### Sensitive Data Protection
The following fields are automatically redacted from audit logs:
- password
- refreshToken
- token
- secret

### Audit Log API
Admin users can retrieve audit logs:

```
GET /audit-logs?page=1&limit=20
GET /audit-logs?userId=user-id
GET /audit-logs?action=CREATE
GET /audit-logs?entity=CONTENT
GET /audit-logs?entityId=content-id
GET /audit-logs?ipAddress=127.0.0.1
```

## Environment Variables

Required security-related environment variables:

```env
FRONTEND_URL=http://localhost:5173  # Frontend URL for CORS
NODE_ENV=production                 # Set to 'production' for HTTPS-only cookies
```

## Best Practices

1. **Always use HTTPS in production** to protect data in transit
2. **Regularly review audit logs** for suspicious activity
3. **Keep dependencies up to date** to patch security vulnerabilities
4. **Use strong JWT secrets** and rotate them periodically
5. **Monitor rate limit violations** to detect potential attacks
6. **Validate and sanitize all user input** even with automatic sanitization
7. **Use parameterized queries** to prevent SQL injection (Prisma does this automatically)

## Security Testing

Security features are covered by comprehensive unit and integration tests:

- `sanitization.pipe.spec.ts`: XSS prevention tests
- `audit.service.spec.ts`: Audit logging tests
- `audit.controller.spec.ts`: Audit API tests
- `security.e2e-spec.ts`: Integration tests for rate limiting and sanitization
- `audit.e2e-spec.ts`: Integration tests for audit logging

Run security tests:
```bash
npm test -- "audit|sanitization"
```

## Reporting Security Issues

If you discover a security vulnerability, please email security@example.com instead of using the issue tracker.
