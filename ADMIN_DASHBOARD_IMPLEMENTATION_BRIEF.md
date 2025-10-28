# Admin Dashboard Implementation Brief for VolSpike

## Executive Summary
This document provides a complete implementation guide for building a secure, admin-only dashboard for volspike.com. The dashboard will enable administrators to manage users, monitor system health, control subscriptions, and maintain platform security.

## Architecture Overview

### Technology Stack
- **Frontend**: Next.js 15+ (App Router), TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Node.js with Hono framework, TypeScript, Prisma ORM
- **Database**: PostgreSQL with TimescaleDB extension
- **Authentication**: NextAuth.js v5 with role-based access control (RBAC)
- **Real-time**: Direct Binance WebSocket (client-side)
- **Security**: JWT tokens, CSRF protection, rate limiting, audit logging

### Access Model
- **URL Structure**: `/admin/*` routes with server-side protection
- **Authentication**: Existing NextAuth.js setup extended with RBAC
- **Authorization**: Role-based (ADMIN, USER) with tier system (FREE, PRO, ELITE)
- **Session Policy**: Shorter session duration for admin accounts

## Data Model Extensions

### 1. User Model Enhancements
```prisma
model User {
  // Existing fields...
  role              Role      @default(USER)  // New: enum Role { USER, ADMIN }
  status            UserStatus @default(ACTIVE) // New: enum UserStatus { ACTIVE, SUSPENDED, BANNED }
  notes             String?    // New: Admin notes
  lastLoginAt       DateTime?  // New: Track last login
  loginAttempts     Int       @default(0) // New: Failed login counter
  lockedUntil       DateTime?  // New: Account lockout
  ipAddress         String?    // New: Last known IP
  userAgent         String?    // New: Last known user agent
  twoFactorEnabled  Boolean   @default(false) // New: 2FA status
  twoFactorSecret   String?    // New: 2FA secret (encrypted)
}
```

### 2. Audit Log Model
```prisma
model AuditLog {
  id           String   @id @default(cuid())
  actorUserId  String
  actor        User     @relation(fields: [actorUserId], references: [id])
  action       String   // e.g., "USER_CREATED", "USER_UPDATED", "SUBSCRIPTION_MODIFIED"
  targetType   String   // e.g., "USER", "SUBSCRIPTION", "SETTINGS"
  targetId     String?
  oldValues    Json?    // Previous state
  newValues    Json?    // New state
  metadata     Json?    // Additional context (IP, user agent, etc.)
  createdAt    DateTime @default(now())
  
  @@index([actorUserId, createdAt])
  @@index([targetType, targetId])
  @@map("audit_logs")
}
```

### 3. Admin Session Model
```prisma
model AdminSession {
  id           String   @id @default(cuid())
  userId       String
  user         User     @relation(fields: [userId], references: [id])
  token        String   @unique
  ipAddress    String
  userAgent    String
  expiresAt    DateTime
  createdAt    DateTime @default(now())
  
  @@index([userId, expiresAt])
  @@map("admin_sessions")
}
```

## Backend Implementation

### API Endpoints Structure

#### Admin User Management
- `GET /api/admin/users` - List all users with pagination/filtering
- `GET /api/admin/users/:id` - Get user details
- `POST /api/admin/users` - Create new user
- `PATCH /api/admin/users/:id` - Update user (role, tier, status)
- `DELETE /api/admin/users/:id` - Delete user (soft delete)
- `POST /api/admin/users/:id/suspend` - Suspend user
- `POST /api/admin/users/:id/reset-password` - Force password reset

#### Subscription Management
- `GET /api/admin/subscriptions` - List all subscriptions
- `POST /api/admin/users/:id/stripe/sync` - Sync Stripe data
- `DELETE /api/admin/users/:id/stripe/subscription` - Cancel subscription
- `POST /api/admin/users/:id/stripe/refund` - Process refund

#### Audit & Monitoring
- `GET /api/admin/audit` - Get audit logs
- `GET /api/admin/metrics` - System metrics
- `GET /api/admin/health` - Detailed health check

#### Admin Settings
- `GET /api/admin/me` - Admin profile
- `POST /api/admin/2fa/enable` - Enable 2FA
- `POST /api/admin/2fa/verify` - Verify 2FA code

### Security Middleware Stack

```typescript
// Execution order for admin routes
1. CORS → 2. Rate Limiting → 3. Session Validation → 
4. Role Check → 5. CSRF → 6. IP Allowlist → 7. Audit Logger
```

## Frontend Implementation

### Route Structure
```
app/
├── (admin)/
│   ├── layout.tsx              # Admin layout with auth check
│   ├── admin/
│   │   ├── page.tsx            # Dashboard overview
│   │   ├── users/
│   │   │   ├── page.tsx        # Users list
│   │   │   ├── new/page.tsx   # Create user
│   │   │   └── [id]/page.tsx  # User details
│   │   ├── subscriptions/
│   │   │   └── page.tsx        # Subscriptions management
│   │   ├── audit/
│   │   │   └── page.tsx        # Audit logs
│   │   ├── settings/
│   │   │   └── page.tsx        # Admin settings
│   │   └── loading.tsx         # Loading states
```

### Key Components

#### 1. Users Table Component
```typescript
interface UsersTableProps {
  users: User[]
  onSort: (field: string) => void
  onFilter: (filters: UserFilters) => void
  onBulkAction: (action: string, userIds: string[]) => void
}
```

#### 2. User Detail Component
```typescript
interface UserDetailProps {
  user: User
  subscription?: StripeSubscription
  auditLogs: AuditLog[]
  onUpdate: (updates: Partial<User>) => void
  onAction: (action: UserAction) => void
}
```

#### 3. Audit Log Component
```typescript
interface AuditLogProps {
  logs: AuditLog[]
  onFilter: (filters: AuditFilters) => void
  onExport: () => void
}
```

## Security Implementation

### 1. Authentication Flow
```mermaid
User → Login → Check Role → 
  ├─ ADMIN → Generate Admin Token → Admin Dashboard
  └─ USER → Regular Token → User Dashboard
```

### 2. CSRF Protection
- Generate token on session creation
- Validate on all mutations
- Rotate tokens periodically

### 3. Rate Limiting Rules
```typescript
const adminRateLimits = {
  login: { window: 15 * 60 * 1000, max: 5 },
  api: { window: 1 * 60 * 1000, max: 100 },
  mutation: { window: 1 * 60 * 1000, max: 20 }
}
```

### 4. IP Allowlist (Optional)
```typescript
const allowedIPs = process.env.ADMIN_IP_WHITELIST?.split(',') || []
```

### 5. Two-Factor Authentication
- TOTP-based (Google Authenticator compatible)
- Backup codes generation
- Recovery process

## Email Templates

### 1. Admin Invite Email
```html
Subject: Admin Access Granted - VolSpike
Content: Welcome link, temporary password, security instructions
```

### 2. User Created by Admin
```html
Subject: Welcome to VolSpike
Content: Account details, password setup link
```

### 3. Suspicious Activity Alert
```html
Subject: Security Alert - Unusual Admin Activity
Content: Activity details, IP address, action required
```

## Implementation Phases

### Phase 1: Foundation (Week 1)
- [ ] Database schema updates
- [ ] Basic RBAC implementation
- [ ] Admin middleware stack
- [ ] Audit logging system

### Phase 2: User Management (Week 2)
- [ ] User CRUD operations
- [ ] Search and filtering
- [ ] Bulk actions
- [ ] Email invitations

### Phase 3: Subscription Management (Week 3)
- [ ] Stripe integration
- [ ] Subscription sync
- [ ] Manual adjustments
- [ ] Refund processing

### Phase 4: Security & Polish (Week 4)
- [ ] 2FA implementation
- [ ] IP allowlisting
- [ ] Rate limiting refinement
- [ ] UI/UX polish
- [ ] Testing & documentation

## Testing Strategy

### 1. Unit Tests
- RBAC middleware
- Audit logging
- Input validation
- Stripe sync logic

### 2. Integration Tests
- Admin authentication flow
- User management operations
- Subscription modifications
- Audit trail accuracy

### 3. Security Tests
- Permission bypass attempts
- CSRF validation
- Rate limiting effectiveness
- SQL injection prevention

## Deployment Checklist

### Environment Variables
```env
# Admin Configuration
ADMIN_EMAIL_WHITELIST=admin@volspike.com,support@volspike.com
ADMIN_IP_WHITELIST=xxx.xxx.xxx.xxx/32
ADMIN_SESSION_DURATION=1800000 # 30 minutes
ADMIN_2FA_ISSUER=VolSpike Admin

# Security
CSRF_SECRET=<generate-strong-secret>
AUDIT_LOG_RETENTION_DAYS=90

# SendGrid Templates
SENDGRID_ADMIN_INVITE_TEMPLATE_ID=d-xxxxx
SENDGRID_USER_CREATED_TEMPLATE_ID=d-xxxxx
SENDGRID_SECURITY_ALERT_TEMPLATE_ID=d-xxxxx
```

### Database Migrations
1. Backup existing database
2. Run Prisma migrations
3. Seed admin users
4. Verify audit log creation

### Security Hardening
1. Enable HTTPS only
2. Configure CSP headers
3. Set secure cookie flags
4. Enable rate limiting
5. Configure fail2ban (optional)

## Monitoring & Alerts

### Key Metrics
- Failed admin login attempts
- Unusual activity patterns
- Bulk operation frequency
- API response times
- Error rates

### Alert Triggers
- Multiple failed login attempts
- Bulk user deletions
- Subscription modifications
- Off-hours admin access
- New IP address access

## Documentation Requirements

### 1. Admin User Guide
- Login process
- User management
- Subscription handling
- Security features

### 2. API Documentation
- Endpoint specifications
- Request/response formats
- Error codes
- Rate limits

### 3. Security Procedures
- Incident response
- Access management
- Audit review process
- Backup procedures

## Success Criteria

### Functional Requirements
- ✓ Admin can view all users
- ✓ Admin can create/edit/delete users
- ✓ Admin can manage subscriptions
- ✓ All actions are audited
- ✓ Email notifications work

### Security Requirements
- ✓ RBAC properly enforced
- ✓ No unauthorized access possible
- ✓ CSRF protection active
- ✓ Rate limiting functional
- ✓ Audit trail complete

### Performance Requirements
- ✓ User list loads < 2 seconds
- ✓ Search returns < 1 second
- ✓ Bulk operations < 5 seconds
- ✓ No blocking UI operations

## Risk Mitigation

### Potential Risks
1. **Privilege Escalation**: Mitigated by strict RBAC and audit logging
2. **Data Breach**: Mitigated by encryption and access controls
3. **Service Disruption**: Mitigated by rate limiting and monitoring
4. **Compliance Issues**: Mitigated by audit trails and data retention policies

## Maintenance Plan

### Regular Tasks
- Weekly: Review audit logs for anomalies
- Monthly: Update admin access list
- Quarterly: Security audit
- Yearly: Penetration testing

### Update Procedures
1. Test in staging environment
2. Schedule maintenance window
3. Backup production database
4. Deploy with rollback plan
5. Verify functionality
6. Monitor for issues

## Conclusion

This admin dashboard implementation will provide VolSpike with comprehensive user management capabilities while maintaining the highest security standards. The phased approach ensures steady progress with minimal risk to existing operations.

---
*Last Updated: October 2025*
*Version: 1.0.0*
*Status: Ready for Implementation*
