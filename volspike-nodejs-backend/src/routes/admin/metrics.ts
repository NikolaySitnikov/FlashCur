import { Hono } from 'hono'
import { z } from 'zod'
import { prisma } from '../../index'
import { requireAdmin } from '../../middleware/admin-auth'
import { adminRateLimit } from '../../middleware/admin-rate-limit'
import { auditLog } from '../../middleware/audit-logger'
import { createLogger } from '../../lib/logger'
import { SystemMetrics } from '../../types/admin'

const logger = createLogger()
const adminMetrics = new Hono()

// Apply middleware
adminMetrics.use('*', requireAdmin)
adminMetrics.use('*', adminRateLimit)
adminMetrics.use('*', auditLog)

// Validation schemas
const metricsQuerySchema = z.object({
    period: z.enum(['7d', '30d', '90d', '1y']).default('30d'),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
})

// GET /api/admin/metrics - Get system metrics
adminMetrics.get('/', async (c) => {
    try {
        const query = metricsQuerySchema.parse(c.req.query())

        const [totalUsers, activeUsers, usersByTier, totalRevenue, recentSignups, failedLogins, adminSessions] = await Promise.all([
            prisma.user.count(),
            getActiveUsers(query.period),
            getUsersByTier(),
            getTotalRevenue(query.period),
            getRecentSignups(query.period),
            getFailedLogins(query.period),
            getAdminSessions(query.period),
        ])

        const metrics: SystemMetrics = {
            totalUsers,
            activeUsers,
            usersByTier,
            totalRevenue,
            recentSignups,
            failedLogins,
            adminSessions,
        }

        return c.json(metrics)
    } catch (error) {
        logger.error('Get system metrics error:', error)
        return c.json({ error: 'Failed to fetch system metrics' }, 500)
    }
})

// GET /api/admin/metrics/users - Get user metrics
adminMetrics.get('/users', async (c) => {
    try {
        const query = metricsQuerySchema.parse(c.req.query())

        const [
            totalUsers,
            newUsers,
            activeUsers,
            usersByTier,
            usersByStatus,
            userGrowth,
            topUsers,
        ] = await Promise.all([
            prisma.user.count(),
            getNewUsers(query.period),
            getActiveUsers(query.period),
            getUsersByTier(),
            getUsersByStatus(),
            getUserGrowth(query.period),
            getTopUsers(query.period),
        ])

        return c.json({
            totalUsers,
            newUsers,
            activeUsers,
            usersByTier,
            usersByStatus,
            userGrowth,
            topUsers,
        })
    } catch (error) {
        logger.error('Get user metrics error:', error)
        return c.json({ error: 'Failed to fetch user metrics' }, 500)
    }
})

// GET /api/admin/metrics/revenue - Get revenue metrics
adminMetrics.get('/revenue', async (c) => {
    try {
        const query = metricsQuerySchema.parse(c.req.query())

        const [
            totalRevenue,
            monthlyRecurringRevenue,
            revenueByTier,
            revenueGrowth,
            topCustomers,
        ] = await Promise.all([
            getTotalRevenue(query.period),
            getMonthlyRecurringRevenue(),
            getRevenueByTier(),
            getRevenueGrowth(query.period),
            getTopCustomers(query.period),
        ])

        return c.json({
            totalRevenue,
            monthlyRecurringRevenue,
            revenueByTier,
            revenueGrowth,
            topCustomers,
        })
    } catch (error) {
        logger.error('Get revenue metrics error:', error)
        return c.json({ error: 'Failed to fetch revenue metrics' }, 500)
    }
})

// GET /api/admin/metrics/activity - Get activity metrics
adminMetrics.get('/activity', async (c) => {
    try {
        const query = metricsQuerySchema.parse(c.req.query())

        const [
            totalLogins,
            failedLogins,
            adminActions,
            securityEvents,
            activityByDay,
            topActions,
        ] = await Promise.all([
            getTotalLogins(query.period),
            getFailedLogins(query.period),
            getAdminActions(query.period),
            getSecurityEvents(query.period),
            getActivityByDay(query.period),
            getTopActions(query.period),
        ])

        return c.json({
            totalLogins,
            failedLogins,
            adminActions,
            securityEvents,
            activityByDay,
            topActions,
        })
    } catch (error) {
        logger.error('Get activity metrics error:', error)
        return c.json({ error: 'Failed to fetch activity metrics' }, 500)
    }
})

// GET /api/admin/metrics/health - Get system health metrics
adminMetrics.get('/health', async (c) => {
    try {
        const [
            databaseStatus,
            apiResponseTime,
            errorRate,
            activeConnections,
            memoryUsage,
            diskUsage,
        ] = await Promise.all([
            checkDatabaseHealth(),
            getAPIResponseTime(),
            getErrorRate(),
            getActiveConnections(),
            getMemoryUsage(),
            getDiskUsage(),
        ])

        return c.json({
            databaseStatus,
            apiResponseTime,
            errorRate,
            activeConnections,
            memoryUsage,
            diskUsage,
            timestamp: new Date().toISOString(),
        })
    } catch (error) {
        logger.error('Get health metrics error:', error)
        return c.json({ error: 'Failed to fetch health metrics' }, 500)
    }
})

// Helper functions
function getPeriodDates(period: string): { start: Date; end: Date } {
    const end = new Date()
    const start = new Date()

    switch (period) {
        case '7d':
            start.setDate(end.getDate() - 7)
            break
        case '30d':
            start.setDate(end.getDate() - 30)
            break
        case '90d':
            start.setDate(end.getDate() - 90)
            break
        case '1y':
            start.setFullYear(end.getFullYear() - 1)
            break
    }

    return { start, end }
}

async function getActiveUsers(period: string): Promise<number> {
    const { start } = getPeriodDates(period)

    return await prisma.user.count({
        where: {
            lastLoginAt: {
                gte: start,
            },
        },
    })
}

async function getUsersByTier(): Promise<Array<{ tier: string; count: number }>> {
    const result = await prisma.user.groupBy({
        by: ['tier'],
        _count: true,
    })

    return result.map(item => ({
        tier: item.tier,
        count: item._count,
    }))
}

async function getUsersByStatus(): Promise<Array<{ status: string; count: number }>> {
    const result = await prisma.user.groupBy({
        by: ['status'],
        _count: true,
    })

    return result.map(item => ({
        status: item.status,
        count: item._count,
    }))
}

async function getNewUsers(period: string): Promise<number> {
    const { start } = getPeriodDates(period)

    return await prisma.user.count({
        where: {
            createdAt: {
                gte: start,
            },
        },
    })
}

async function getRecentSignups(period: string): Promise<number> {
    const { start } = getPeriodDates(period)

    return await prisma.user.count({
        where: {
            createdAt: {
                gte: start,
            },
        },
    })
}

async function getTotalRevenue(period: string): Promise<number> {
    // This would need to be implemented with actual Stripe data
    // For now, return 0
    return 0
}

async function getMonthlyRecurringRevenue(): Promise<number> {
    // This would need to be implemented with actual Stripe data
    return 0
}

async function getRevenueByTier(): Promise<Record<string, number>> {
    // This would need to be implemented with actual Stripe data
    return {
        free: 0,
        pro: 0,
        elite: 0,
    }
}

async function getRevenueGrowth(period: string): Promise<Array<{ date: string; revenue: number }>> {
    // This would need to be implemented with actual Stripe data
    return []
}

async function getTopCustomers(period: string): Promise<Array<{ email: string; revenue: number }>> {
    // This would need to be implemented with actual Stripe data
    return []
}

async function getFailedLogins(period: string): Promise<number> {
    const { start } = getPeriodDates(period)

    return await prisma.auditLog.count({
        where: {
            action: 'LOGIN_FAILURE',
            createdAt: {
                gte: start,
            },
        },
    })
}

async function getTotalLogins(period: string): Promise<number> {
    const { start } = getPeriodDates(period)

    return await prisma.auditLog.count({
        where: {
            action: 'ADMIN_LOGIN',
            createdAt: {
                gte: start,
            },
        },
    })
}

async function getAdminActions(period: string): Promise<number> {
    const { start } = getPeriodDates(period)

    return await prisma.auditLog.count({
        where: {
            action: {
                in: ['USER_CREATED', 'USER_UPDATED', 'USER_DELETED', 'SUBSCRIPTION_UPDATED'],
            },
            createdAt: {
                gte: start,
            },
        },
    })
}

async function getSecurityEvents(period: string): Promise<number> {
    const { start } = getPeriodDates(period)

    return await prisma.auditLog.count({
        where: {
            action: 'SECURITY_EVENT',
            createdAt: {
                gte: start,
            },
        },
    })
}

async function getAdminSessions(period: string): Promise<number> {
    const { start } = getPeriodDates(period)

    return await prisma.adminSession.count({
        where: {
            createdAt: {
                gte: start,
            },
        },
    })
}

async function getUserGrowth(period: string): Promise<Array<{ date: string; count: number }>> {
    const { start, end } = getPeriodDates(period)

    // This would need to be implemented with proper date grouping
    // For now, return empty array
    return []
}

async function getActivityByDay(period: string): Promise<Array<{ date: string; count: number }>> {
    const { start, end } = getPeriodDates(period)

    // This would need to be implemented with proper date grouping
    return []
}

async function getTopActions(period: string): Promise<Array<{ action: string; count: number }>> {
    const { start } = getPeriodDates(period)

    const result = await prisma.auditLog.groupBy({
        by: ['action'],
        where: {
            createdAt: {
                gte: start,
            },
        },
        _count: true,
        orderBy: {
            _count: {
                action: 'desc',
            },
        },
        take: 10,
    })

    return result.map(item => ({
        action: item.action,
        count: item._count,
    }))
}

async function checkDatabaseHealth(): Promise<{ status: string; responseTime: number }> {
    const start = Date.now()

    try {
        await prisma.user.count()
        const responseTime = Date.now() - start

        return {
            status: 'healthy',
            responseTime,
        }
    } catch (error) {
        return {
            status: 'unhealthy',
            responseTime: Date.now() - start,
        }
    }
}

async function getAPIResponseTime(): Promise<number> {
    // This would need to be implemented with actual API monitoring
    return 0
}

async function getErrorRate(): Promise<number> {
    // This would need to be implemented with actual error tracking
    return 0
}

async function getActiveConnections(): Promise<number> {
    // This would need to be implemented with actual connection monitoring
    return 0
}

async function getMemoryUsage(): Promise<{ used: number; total: number; percentage: number }> {
    // This would need to be implemented with actual memory monitoring
    return {
        used: 0,
        total: 0,
        percentage: 0,
    }
}

async function getDiskUsage(): Promise<{ used: number; total: number; percentage: number }> {
    // This would need to be implemented with actual disk monitoring
    return {
        used: 0,
        total: 0,
        percentage: 0,
    }
}

export { adminMetrics as adminMetricsRoutes }
