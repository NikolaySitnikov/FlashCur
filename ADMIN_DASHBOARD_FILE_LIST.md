# Admin Dashboard File List for Implementation

## 📁 Backend Files (volspike-nodejs-backend)

### New Route Files
```
src/routes/admin/
├── index.ts                 # Main admin routes aggregator
├── users.ts                 # User management endpoints
├── subscriptions.ts         # Subscription management endpoints
├── audit.ts                 # Audit log endpoints
├── metrics.ts               # System metrics endpoints
├── settings.ts              # Admin settings endpoints
└── auth.ts                  # Admin-specific auth endpoints
```

### New Middleware Files
```
src/middleware/
├── admin-auth.ts            # Admin role verification
├── csrf.ts                  # CSRF protection
├── ip-allowlist.ts         # IP restriction (optional)
├── audit-logger.ts         # Audit logging middleware
├── admin-rate-limit.ts     # Admin-specific rate limiting
└── two-factor.ts           # 2FA verification
```

### New Service Files
```
src/services/
├── admin/
│   ├── user-management.ts  # User CRUD operations
│   ├── subscription-sync.ts # Stripe subscription sync
│   ├── audit-service.ts    # Audit logging service
│   ├── metrics-service.ts  # System metrics collection
│   ├── invite-service.ts   # User invitation service
│   └── two-factor.ts       # 2FA implementation
```

### New Type Definitions
```
src/types/
├── admin.ts                 # Admin-specific types
├── audit.ts                 # Audit log types
└── rbac.ts                  # Role-based access types
```

### Modified Files (Backend)
```
prisma/schema.prisma         # Add new models and fields
src/index.ts                 # Add admin routes
src/lib/auth.ts             # Add role checking
src/services/email.ts       # Add admin email templates
```

### New Database Migration Files
```
prisma/migrations/
└── [timestamp]_add_admin_features/
    └── migration.sql        # SQL for new tables/columns
```

## 📁 Frontend Files (volspike-nextjs-frontend)

### New Route Files (App Router)
```
src/app/(admin)/
├── layout.tsx               # Admin layout with auth wrapper
├── admin/
│   ├── page.tsx            # Dashboard overview
│   ├── loading.tsx         # Loading state
│   ├── error.tsx           # Error boundary
│   │
│   ├── users/
│   │   ├── page.tsx        # Users list page
│   │   ├── loading.tsx     # Loading state
│   │   ├── new/
│   │   │   └── page.tsx    # Create user page
│   │   └── [id]/
│   │       ├── page.tsx    # User detail page
│   │       └── edit/
│   │           └── page.tsx # Edit user page
│   │
│   ├── subscriptions/
│   │   ├── page.tsx        # Subscriptions list
│   │   └── [id]/
│   │       └── page.tsx    # Subscription detail
│   │
│   ├── audit/
│   │   ├── page.tsx        # Audit logs
│   │   └── export/
│   │       └── page.tsx    # Export audit logs
│   │
│   ├── settings/
│   │   ├── page.tsx        # Admin settings
│   │   ├── security/
│   │   │   └── page.tsx    # Security settings
│   │   └── 2fa/
│   │       └── page.tsx    # 2FA setup
│   │
│   └── metrics/
│       └── page.tsx        # System metrics
```

### New Component Files
```
src/components/admin/
├── layout/
│   ├── admin-header.tsx    # Admin header with user info
│   ├── admin-sidebar.tsx   # Navigation sidebar
│   ├── admin-footer.tsx    # Admin footer
│   └── breadcrumbs.tsx     # Breadcrumb navigation
│
├── users/
│   ├── users-table.tsx     # Users data table
│   ├── user-form.tsx       # Create/edit user form
│   ├── user-detail.tsx     # User detail view
│   ├── user-filters.tsx    # Search and filters
│   ├── user-actions.tsx    # Bulk action buttons
│   └── user-invite-modal.tsx # Invite user modal
│
├── subscriptions/
│   ├── subscription-list.tsx    # Subscription list
│   ├── subscription-detail.tsx  # Subscription details
│   ├── stripe-sync-button.tsx   # Sync with Stripe
│   └── refund-modal.tsx        # Process refund modal
│
├── audit/
│   ├── audit-log-table.tsx     # Audit log display
│   ├── audit-filters.tsx       # Filter audit logs
│   ├── audit-detail-modal.tsx  # View log details
│   └── audit-export.tsx        # Export functionality
│
├── dashboard/
│   ├── stats-cards.tsx         # Overview statistics
│   ├── recent-activity.tsx     # Recent admin actions
│   ├── user-growth-chart.tsx   # User growth visualization
│   └── revenue-chart.tsx       # Revenue metrics
│
├── security/
│   ├── two-factor-setup.tsx    # 2FA setup flow
│   ├── ip-allowlist.tsx        # IP management
│   ├── session-list.tsx        # Active sessions
│   └── security-alerts.tsx     # Security notifications
│
└── common/
    ├── confirm-dialog.tsx       # Confirmation modal
    ├── data-table.tsx          # Reusable data table
    ├── pagination.tsx          # Pagination controls
    ├── search-input.tsx        # Search component
    └── status-badge.tsx        # User/subscription status
```

### New Hook Files
```
src/hooks/admin/
├── use-admin-auth.ts       # Admin authentication hook
├── use-users.ts            # User management hooks
├── use-audit.ts            # Audit log hooks
├── use-metrics.ts          # Metrics data hooks
├── use-subscriptions.ts    # Subscription hooks
└── use-admin-socket.ts     # Real-time admin updates
```

### New Utility Files
```
src/lib/admin/
├── permissions.ts          # Permission checking utilities
├── validators.ts           # Form validation schemas
├── formatters.ts           # Data formatting helpers
├── constants.ts            # Admin constants
└── api-client.ts          # Admin API client
```

### New Type Definition Files
```
src/types/
├── admin.d.ts             # Admin TypeScript types
├── audit.d.ts             # Audit log types
└── stripe-admin.d.ts      # Stripe admin types
```

### Modified Files (Frontend)
```
src/lib/auth.ts            # Add admin role checking
src/middleware.ts          # Add admin route protection
src/components/header.tsx  # Add admin indicator
next.config.js             # Add admin-specific configs
```

### New UI Component Files (shadcn/ui extensions)
```
src/components/ui/admin/
├── data-table-advanced.tsx    # Advanced table features
├── command-palette.tsx        # Admin command palette
├── multi-select.tsx           # Multi-select component
├── date-range-picker.tsx      # Date range selection
├── export-button.tsx          # Export functionality
└── metric-card.tsx           # Metric display card
```

## 📁 Shared/Configuration Files

### New Environment Variables
```
# Add to both .env files
ADMIN_EMAIL_WHITELIST=
ADMIN_IP_WHITELIST=
ADMIN_SESSION_DURATION=
ADMIN_2FA_ISSUER=
CSRF_SECRET=
AUDIT_LOG_RETENTION_DAYS=
SENDGRID_ADMIN_INVITE_TEMPLATE_ID=
SENDGRID_USER_CREATED_TEMPLATE_ID=
SENDGRID_SECURITY_ALERT_TEMPLATE_ID=
```

### New Test Files
```
tests/
├── backend/
│   ├── admin/
│   │   ├── auth.test.ts          # Admin auth tests
│   │   ├── users.test.ts         # User management tests
│   │   ├── audit.test.ts         # Audit logging tests
│   │   └── security.test.ts      # Security tests
│   └── integration/
│       └── admin-flow.test.ts    # E2E admin flow
│
└── frontend/
    ├── admin/
    │   ├── components.test.tsx   # Component tests
    │   ├── pages.test.tsx        # Page tests
    │   └── hooks.test.ts         # Hook tests
    └── e2e/
        └── admin.spec.ts          # E2E admin tests
```

## 📁 Documentation Files

### New Documentation
```
docs/
├── admin/
│   ├── README.md              # Admin overview
│   ├── USER_GUIDE.md          # User manual
│   ├── API_REFERENCE.md       # API documentation
│   ├── SECURITY.md            # Security procedures
│   └── DEPLOYMENT.md          # Deployment guide
```

## 🔧 Implementation Order

### Phase 1: Core Infrastructure
1. `prisma/schema.prisma` - Update database schema
2. `src/types/admin.ts` - Define types
3. `src/middleware/admin-auth.ts` - Create auth middleware
4. `src/routes/admin/index.ts` - Setup admin routes

### Phase 2: User Management
1. `src/routes/admin/users.ts` - User endpoints
2. `src/services/admin/user-management.ts` - User logic
3. `src/app/(admin)/admin/users/page.tsx` - User UI
4. `src/components/admin/users/*` - User components

### Phase 3: Subscription Management
1. `src/routes/admin/subscriptions.ts` - Subscription endpoints
2. `src/services/admin/subscription-sync.ts` - Stripe sync
3. `src/app/(admin)/admin/subscriptions/page.tsx` - Subscription UI
4. `src/components/admin/subscriptions/*` - Subscription components

### Phase 4: Audit & Security
1. `src/middleware/audit-logger.ts` - Audit middleware
2. `src/services/admin/audit-service.ts` - Audit service
3. `src/services/admin/two-factor.ts` - 2FA implementation
4. `src/app/(admin)/admin/audit/page.tsx` - Audit UI

### Phase 5: Testing & Polish
1. All test files
2. Documentation files
3. UI polish and optimization

## 📝 File Templates

### Backend Route Template
```typescript
// src/routes/admin/[resource].ts
import { Hono } from 'hono'
import { z } from 'zod'
import { requireAdmin } from '@/middleware/admin-auth'
import { auditLog } from '@/middleware/audit-logger'
import { csrfProtection } from '@/middleware/csrf'

const router = new Hono()

// Apply middleware
router.use('*', requireAdmin)
router.use('*', csrfProtection)
router.use('*', auditLog)

// Define routes...
export default router
```

### Frontend Page Template
```typescript
// src/app/(admin)/admin/[resource]/page.tsx
import { Metadata } from 'next'
import { requireAdmin } from '@/lib/admin/permissions'

export const metadata: Metadata = {
  title: 'Resource Management - Admin',
  description: 'Manage resources'
}

export default async function AdminResourcePage() {
  await requireAdmin()
  
  return (
    <div className="container mx-auto p-6">
      {/* Page content */}
    </div>
  )
}
```

## 🚀 Deployment Files

### Docker Configuration
```
docker/
├── Dockerfile.admin        # Admin-specific Docker image
└── docker-compose.admin.yml # Admin services compose
```

### CI/CD Configuration
```
.github/workflows/
├── admin-tests.yml         # Admin test pipeline
└── admin-deploy.yml        # Admin deployment pipeline
```

## 📊 Total File Count

- **New Backend Files**: 28
- **New Frontend Files**: 65
- **Modified Files**: 10
- **Test Files**: 14
- **Documentation Files**: 5
- **Configuration Files**: 4

**Total Files to Create/Modify**: 126 files

## 🎯 Critical Path Files

These files MUST be implemented first:

1. `prisma/schema.prisma` - Database schema
2. `src/middleware/admin-auth.ts` - Authentication
3. `src/routes/admin/index.ts` - Route setup
4. `src/app/(admin)/layout.tsx` - Admin layout
5. `src/lib/admin/permissions.ts` - Permission system

---
*This file list provides complete coverage for the admin dashboard implementation*
*Estimated Development Time: 4 weeks (1 developer) or 2 weeks (2 developers)*
