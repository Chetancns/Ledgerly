# Security Guide for Ledgerly

## Overview

This document outlines security best practices, current security measures, and recommended improvements for the Ledgerly application.

## Table of Contents

- [Authentication & Authorization](#authentication--authorization)
- [Data Security](#data-security)
- [API Security](#api-security)
- [Frontend Security](#frontend-security)
- [Database Security](#database-security)
- [Deployment Security](#deployment-security)
- [Security Checklist](#security-checklist)
- [Vulnerability Response](#vulnerability-response)
- [Future Security Enhancements](#future-security-enhancements)

---

## Authentication & Authorization

### Current Implementation

✅ **Implemented:**
- JWT-based authentication
- HTTP-only cookies for token storage (prevents XSS)
- Refresh token rotation
- Password hashing (not stored in plain text)
- CSRF protection
- Secure cookie flags in production

### JWT Configuration

**Current Settings:**
```typescript
// Access token: 15 minutes expiry
// Refresh token: 7 days expiry
```

**Cookies:**
```typescript
{
  httpOnly: true,           // Prevents JavaScript access
  secure: true,             // HTTPS only (production)
  sameSite: 'lax',         // CSRF protection
  maxAge: 900000           // 15 minutes for access token
}
```

### Best Practices

1. **JWT Secret**
   - Must be at least 32 characters
   - Use cryptographically secure random generator
   - Never commit to version control
   - Rotate periodically (every 90 days recommended)

   ```bash
   # Generate secure secret
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

2. **Password Requirements**
   - Minimum 8 characters (consider increasing to 12)
   - Should include uppercase, lowercase, numbers, special characters
   - Implement password strength meter on frontend

3. **Token Management**
   - Access tokens should be short-lived (15 minutes)
   - Refresh tokens should be longer-lived (7 days)
   - Implement token blacklisting for logout
   - Rotate refresh tokens on each use

### Recommended Improvements

❌ **Not Implemented - HIGH PRIORITY:**

1. **Rate Limiting on Auth Endpoints**
   ```typescript
   // Prevent brute force attacks
   @Throttle(5, 60) // 5 requests per minute
   @Post('login')
   async login() { ... }
   ```

2. **Account Lockout**
   - Lock account after 5 failed login attempts
   - Require email verification to unlock
   - Implement exponential backoff

3. **Multi-Factor Authentication (MFA)**
   - TOTP-based 2FA
   - SMS backup codes
   - Email verification for sensitive actions

4. **Session Management**
   - Track active sessions
   - Allow users to view and revoke sessions
   - Automatic session timeout after inactivity

---

## Data Security

### Sensitive Data Handling

✅ **Currently Secure:**
- Passwords are hashed before storage
- Refresh tokens are hashed
- Database connections can use SSL

❌ **Needs Improvement:**

1. **Personal Information**
   - Consider encrypting PII (names, emails) at rest
   - Implement field-level encryption for sensitive data

2. **Financial Data**
   - Transaction amounts and descriptions are stored in plain text
   - Consider encryption for high-security requirements

3. **Data Retention**
   - Implement data retention policy
   - Automatic cleanup of old data
   - GDPR compliance (right to be forgotten)

### Encryption

**At Rest:**
```bash
# PostgreSQL encryption
# Enable SSL in database configuration
DB_SSL=true

# Consider full disk encryption at OS level
```

**In Transit:**
```nginx
# All production traffic should use HTTPS
ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers HIGH:!aNULL:!MD5;
```

---

## API Security

### Current Protection

✅ **Implemented:**
- CORS configuration
- CSRF token validation
- JWT validation on protected routes
- Input validation using class-validator

### Critical Missing Features

❌ **NOT IMPLEMENTED - CRITICAL:**

#### 1. Rate Limiting

**Impact**: Without rate limiting, the API is vulnerable to:
- Brute force attacks
- Denial of service
- API abuse
- Excessive AI API costs

**Implementation Required:**

```typescript
// app.module.ts
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';

@Module({
  imports: [
    ThrottlerModule.forRoot({
      ttl: 60,
      limit: 100, // 100 requests per minute
    }),
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
```

**Custom Limits per Endpoint:**

```typescript
// Different limits for different endpoints
@Throttle(5, 60) // 5 per minute
@Post('login')
async login() { ... }

@Throttle(10, 60) // 10 per minute
@Post('ai/parse-transaction')
async parseTransaction() { ... }

@Throttle(100, 60) // 100 per minute
@Get('transactions')
async getTransactions() { ... }
```

#### 2. Input Sanitization

**Current**: Basic validation exists
**Needed**: Comprehensive sanitization

```typescript
// Sanitize HTML to prevent XSS
import * as sanitizeHtml from 'sanitize-html';

@Transform(({ value }) => sanitizeHtml(value))
description: string;

// Prevent SQL injection (TypeORM helps, but be careful with raw queries)
// Never use string concatenation for queries
```

#### 3. API Versioning

```typescript
// Implement versioning for backward compatibility
@Controller('v1/transactions')
export class TransactionController { ... }
```

### Request Validation

**All DTOs should validate:**

```typescript
export class CreateTransactionDto {
  @IsNumber()
  @Min(0.01)
  @Max(999999999.99)
  amount: number;

  @IsEnum(['expense', 'income', 'savings', 'transfer'])
  type: string;

  @IsString()
  @MaxLength(500)
  @IsOptional()
  description?: string;

  @IsDateString()
  transactionDate: string;
}
```

---

## Frontend Security

### Current Measures

✅ **Implemented:**
- No sensitive data in localStorage
- HTTP-only cookies for tokens
- CSRF token in requests

### Vulnerabilities to Address

❌ **Missing:**

#### 1. Content Security Policy (CSP)

```typescript
// next.config.ts
const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: "default-src 'self'; script-src 'self' 'unsafe-eval'; style-src 'self' 'unsafe-inline';"
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY'
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin'
  }
];
```

#### 2. XSS Prevention

```typescript
// Sanitize user input before rendering
import DOMPurify from 'dompurify';

const cleanDescription = DOMPurify.sanitize(transaction.description);
```

#### 3. Dependency Security

```bash
# Regularly audit dependencies
npm audit

# Fix vulnerabilities
npm audit fix

# Consider using npm-check-updates
npx npm-check-updates
```

---

## Database Security

### Current Configuration

✅ **Good Practices:**
- Parameterized queries (TypeORM)
- Schema-level isolation
- User-specific data filtering

### Improvements Needed

❌ **Recommended:**

#### 1. Database User Permissions

```sql
-- Create application-specific database user
CREATE USER ledgerly_app WITH PASSWORD 'strong_password';

-- Grant only necessary permissions
GRANT CONNECT ON DATABASE ledgerly_prod TO ledgerly_app;
GRANT USAGE ON SCHEMA dbo TO ledgerly_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA dbo TO ledgerly_app;

-- Revoke dangerous permissions
REVOKE CREATE ON SCHEMA dbo FROM ledgerly_app;
```

#### 2. Row-Level Security

```sql
-- Ensure users can only access their own data
ALTER TABLE dbo.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_isolation ON dbo.transactions
  USING (userId = current_setting('app.current_user_id')::uuid);
```

#### 3. Audit Logging

```sql
-- Track all modifications
CREATE TABLE dbo.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name VARCHAR(100),
  operation VARCHAR(10),
  user_id UUID,
  old_data JSONB,
  new_data JSONB,
  timestamp TIMESTAMP DEFAULT NOW()
);
```

#### 4. Backup Encryption

```bash
# Encrypt backups
pg_dump ledgerly_prod | gpg --encrypt -r admin@example.com > backup.sql.gpg

# Decrypt when restoring
gpg --decrypt backup.sql.gpg | psql ledgerly_prod
```

---

## Deployment Security

### Production Checklist

✅ **Must Have:**

- [ ] HTTPS enabled (SSL/TLS certificates)
- [ ] Environment variables properly secured
- [ ] Database SSL enabled
- [ ] Firewall configured (only necessary ports open)
- [ ] Regular security updates applied
- [ ] Monitoring and alerting configured
- [ ] Backups encrypted and tested
- [ ] Rate limiting implemented
- [ ] Security headers configured
- [ ] CORS properly configured

### Environment Variables

**Never commit these to git:**

```bash
# Use .gitignore
echo ".env" >> .gitignore
echo ".env.local" >> .gitignore
echo ".env.production" >> .gitignore
```

**Use secret management:**

```bash
# Production: Use secret managers
# - AWS Secrets Manager
# - HashiCorp Vault
# - Azure Key Vault
# - GitHub Secrets (for CI/CD)
```

### Nginx Security Headers

```nginx
# Add security headers
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
add_header X-Frame-Options "DENY" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;

# Disable server version
server_tokens off;
```

---

## Security Checklist

### Development

- [ ] Never commit secrets or credentials
- [ ] Use environment variables for configuration
- [ ] Validate all user input
- [ ] Sanitize output to prevent XSS
- [ ] Use prepared statements (TypeORM handles this)
- [ ] Review dependencies for vulnerabilities
- [ ] Follow principle of least privilege
- [ ] Implement proper error handling (don't expose stack traces)

### Pre-Production

- [ ] Security audit completed
- [ ] Penetration testing performed
- [ ] Rate limiting implemented
- [ ] MFA implemented
- [ ] Backup strategy tested
- [ ] Monitoring configured
- [ ] Incident response plan documented
- [ ] Security headers configured

### Production

- [ ] HTTPS enforced
- [ ] Database backups encrypted
- [ ] Secrets in secret manager
- [ ] Firewall configured
- [ ] Regular security updates scheduled
- [ ] Monitoring and alerting active
- [ ] Access logs enabled
- [ ] Regular security audits scheduled

---

## Vulnerability Response

### Reporting Security Issues

**Do NOT open public GitHub issues for security vulnerabilities.**

Instead:
1. Email security concerns to: [Your Security Email]
2. Include detailed description and steps to reproduce
3. Allow reasonable time for fix before disclosure

### Response Process

1. **Acknowledgment**: Within 24 hours
2. **Assessment**: Within 48 hours
3. **Fix Development**: Prioritized based on severity
4. **Testing**: Thorough testing of fix
5. **Deployment**: Emergency deployment if critical
6. **Disclosure**: Public disclosure after fix deployed

### Severity Levels

- **Critical**: Immediate action (within 24 hours)
  - Remote code execution
  - Authentication bypass
  - Data breach

- **High**: Fix within 1 week
  - Privilege escalation
  - Significant data exposure

- **Medium**: Fix within 1 month
  - XSS vulnerabilities
  - CSRF vulnerabilities

- **Low**: Fix in next release
  - Information disclosure
  - Minor security improvements

---

## Future Security Enhancements

### Planned Improvements

#### Phase 1 (Critical - Implement Immediately)
1. **Rate Limiting**
   - Implement across all endpoints
   - Special limits for auth and AI endpoints

2. **Enhanced Monitoring**
   - Failed login attempt tracking
   - Suspicious activity detection
   - Real-time alerts

3. **Security Headers**
   - CSP implementation
   - All recommended headers

#### Phase 2 (High Priority)
1. **Multi-Factor Authentication**
   - TOTP-based 2FA
   - Backup codes

2. **Session Management**
   - Active session viewing
   - Remote session revocation

3. **Audit Logging**
   - All data modifications logged
   - User activity tracking

#### Phase 3 (Medium Priority)
1. **Data Encryption**
   - Field-level encryption for PII
   - Encrypted backups

2. **Advanced Threat Protection**
   - Web Application Firewall (WAF)
   - DDoS protection

3. **Compliance**
   - GDPR compliance features
   - SOC 2 compliance

---

## Security Tools

### Recommended Tools

1. **Dependency Scanning**
   ```bash
   npm audit
   npm install -g snyk
   snyk test
   ```

2. **Static Code Analysis**
   ```bash
   npm install -g eslint-plugin-security
   ```

3. **HTTPS Testing**
   - SSL Labs (https://www.ssllabs.com/ssltest/)

4. **Security Headers**
   - Security Headers (https://securityheaders.com/)

5. **OWASP ZAP**
   - Automated security testing

---

## Regular Security Tasks

### Daily
- Monitor access logs
- Check error logs for suspicious activity

### Weekly
- Review failed login attempts
- Check for dependency updates with vulnerabilities

### Monthly
- Run security scans
- Review and rotate credentials
- Update dependencies
- Review access permissions

### Quarterly
- Comprehensive security audit
- Penetration testing
- Update security documentation
- Security training for team

---

## Compliance

### GDPR Considerations

If handling EU user data:

1. **Data Access**
   - Users can request their data
   - Export in machine-readable format

2. **Right to be Forgotten**
   - Implement user data deletion
   - Cascade delete all related data

3. **Consent**
   - Clear privacy policy
   - Opt-in for data processing

4. **Data Minimization**
   - Only collect necessary data
   - Regular data cleanup

### Implementation

```typescript
// Export user data
@Get('export')
async exportData(@GetUser() user) {
  return this.userService.exportAllData(user.userId);
}

// Delete user account
@Delete('account')
async deleteAccount(@GetUser() user) {
  return this.userService.deleteAllData(user.userId);
}
```

---

## Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [NestJS Security Best Practices](https://docs.nestjs.com/security/authentication)
- [Next.js Security Headers](https://nextjs.org/docs/advanced-features/security-headers)
- [PostgreSQL Security](https://www.postgresql.org/docs/current/security.html)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)

---

**Last Updated**: 2024-01-15  
**Next Review**: 2024-04-15
