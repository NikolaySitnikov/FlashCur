import { Hono } from 'hono'
import { requireAdmin } from '../../middleware/admin-auth'
import { csrfProtection } from '../../middleware/csrf'
import { adminRateLimit } from '../../middleware/admin-rate-limit'
import { auditLog } from '../../middleware/audit-logger'
import { adminUserRoutes } from './users'
import { adminSubscriptionRoutes } from './subscriptions'
import { adminAuditRoutes } from './audit'
import { adminMetricsRoutes } from './metrics'
import { adminSettingsRoutes } from './settings'

const adminRoutes = new Hono()

// Apply global middleware to all admin routes
adminRoutes.use('*', requireAdmin)
adminRoutes.use('*', adminRateLimit)
adminRoutes.use('*', auditLog)

// Mount sub-routes
adminRoutes.route('/users', adminUserRoutes)
adminRoutes.route('/subscriptions', adminSubscriptionRoutes)
adminRoutes.route('/audit', adminAuditRoutes)
adminRoutes.route('/metrics', adminMetricsRoutes)
adminRoutes.route('/settings', adminSettingsRoutes)

// Admin dashboard overview
adminRoutes.get('/', async (c) => {
    const user = c.get('adminUser')

    return c.json({
        message: 'Admin API is running',
        user: {
            id: user.id,
            email: user.email,
            role: user.role,
            tier: user.tier,
        },
        timestamp: new Date().toISOString(),
    })
})

// Admin health check
adminRoutes.get('/health', async (c) => {
    return c.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0',
    })
})

export { adminRoutes }
