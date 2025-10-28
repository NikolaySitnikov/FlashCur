import { Hono } from 'hono'
import { z } from 'zod'
import { prisma } from '../../index'
import { requireAdmin } from '../../middleware/admin-auth'
import { adminRateLimit } from '../../middleware/admin-rate-limit'
import { auditLog, getAuditLogs, getAuditLogStats } from '../../middleware/audit-logger'
import { createLogger } from '../../lib/logger'
import { AuditAction, AuditTargetType } from '../../types/audit'
import { AuditLogQuery, AuditLogResponse } from '../../types/admin'

const logger = createLogger()
const adminAudit = new Hono()

// Apply middleware
adminAudit.use('*', requireAdmin)
adminAudit.use('*', adminRateLimit)
adminAudit.use('*', auditLog)

// Validation schemas
const auditLogQuerySchema = z.object({
    actorUserId: z.string().optional(),
    action: z.string().optional(),
    targetType: z.string().optional(),
    targetId: z.string().optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(100).default(20),
    sortBy: z.enum(['createdAt', 'action', 'targetType']).default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
})

const exportSchema = z.object({
    format: z.enum(['csv', 'json', 'xlsx']).default('json'),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    actorUserId: z.string().optional(),
    action: z.string().optional(),
    targetType: z.string().optional(),
})

// GET /api/admin/audit - Get audit logs
adminAudit.get('/', async (c) => {
    try {
        const query = auditLogQuerySchema.parse(c.req.query())

        // Convert string dates to Date objects
        const processedQuery: AuditLogQuery = {
            ...query,
            startDate: query.startDate ? new Date(query.startDate) : undefined,
            endDate: query.endDate ? new Date(query.endDate) : undefined,
        }

        const result = await getAuditLogs(processedQuery)

        const response: AuditLogResponse = {
            logs: result.logs,
            pagination: result.pagination,
            filters: {
                applied: processedQuery,
                available: {
                    actions: Object.values(AuditAction),
                    targetTypes: Object.values(AuditTargetType),
                    actors: await getAvailableActors(),
                },
            },
        }

        return c.json(response)
    } catch (error) {
        logger.error('Get audit logs error:', error)
        return c.json({ error: 'Failed to fetch audit logs' }, 500)
    }
})

// GET /api/admin/audit/stats - Get audit log statistics
adminAudit.get('/stats', async (c) => {
    try {
        const days = parseInt(c.req.query('days') || '30')
        const stats = await getAuditLogStats(days)

        return c.json(stats)
    } catch (error) {
        logger.error('Get audit stats error:', error)
        return c.json({ error: 'Failed to fetch audit statistics' }, 500)
    }
})

// GET /api/admin/audit/export - Export audit logs
adminAudit.get('/export', async (c) => {
    try {
        const query = exportSchema.parse(c.req.query())

        // Build query for export
        const exportQuery: AuditLogQuery = {
            startDate: query.startDate ? new Date(query.startDate) : undefined,
            endDate: query.endDate ? new Date(query.endDate) : undefined,
            actorUserId: query.actorUserId,
            action: query.action as AuditAction,
            targetType: query.targetType as AuditTargetType,
            page: 1,
            limit: 10000, // Large limit for export
        }

        const result = await getAuditLogs(exportQuery)

        // Generate export data based on format
        let exportData: any
        let contentType: string
        let filename: string

        switch (query.format) {
            case 'csv':
                exportData = generateCSV(result.logs)
                contentType = 'text/csv'
                filename = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`
                break

            case 'xlsx':
                exportData = generateXLSX(result.logs)
                contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                filename = `audit-logs-${new Date().toISOString().split('T')[0]}.xlsx`
                break

            case 'json':
            default:
                exportData = JSON.stringify(result.logs, null, 2)
                contentType = 'application/json'
                filename = `audit-logs-${new Date().toISOString().split('T')[0]}.json`
                break
        }

        // Set response headers
        c.header('Content-Type', contentType)
        c.header('Content-Disposition', `attachment; filename="${filename}"`)

        return c.text(exportData)
    } catch (error) {
        logger.error('Export audit logs error:', error)
        return c.json({ error: 'Failed to export audit logs' }, 500)
    }
})

// GET /api/admin/audit/:id - Get specific audit log entry
adminAudit.get('/:id', async (c) => {
    try {
        const logId = c.req.param('id')

        const log = await prisma.auditLog.findUnique({
            where: { id: logId },
            include: {
                actor: {
                    select: {
                        id: true,
                        email: true,
                        role: true,
                    },
                },
            },
        })

        if (!log) {
            return c.json({ error: 'Audit log not found' }, 404)
        }

        return c.json(log)
    } catch (error) {
        logger.error('Get audit log error:', error)
        return c.json({ error: 'Failed to fetch audit log' }, 500)
    }
})

// GET /api/admin/audit/user/:userId - Get audit logs for specific user
adminAudit.get('/user/:userId', async (c) => {
    try {
        const userId = c.req.param('userId')
        const query = auditLogQuerySchema.parse(c.req.query())

        const processedQuery: AuditLogQuery = {
            ...query,
            actorUserId: userId,
            startDate: query.startDate ? new Date(query.startDate) : undefined,
            endDate: query.endDate ? new Date(query.endDate) : undefined,
        }

        const result = await getAuditLogs(processedQuery)

        return c.json(result)
    } catch (error) {
        logger.error('Get user audit logs error:', error)
        return c.json({ error: 'Failed to fetch user audit logs' }, 500)
    }
})

// GET /api/admin/audit/search - Search audit logs
adminAudit.get('/search', async (c) => {
    try {
        const searchTerm = c.req.query('q')
        const query = auditLogQuerySchema.parse(c.req.query())

        if (!searchTerm) {
            return c.json({ error: 'Search term required' }, 400)
        }

        // Build search query
        const where: any = {
            OR: [
                { action: { contains: searchTerm, mode: 'insensitive' } },
                { targetType: { contains: searchTerm, mode: 'insensitive' } },
                { targetId: { contains: searchTerm, mode: 'insensitive' } },
            ],
        }

        // Add date filters
        if (query.startDate || query.endDate) {
            where.createdAt = {}
            if (query.startDate) {
                where.createdAt.gte = new Date(query.startDate)
            }
            if (query.endDate) {
                where.createdAt.lte = new Date(query.endDate)
            }
        }

        const page = query.page || 1
        const limit = query.limit || 20
        const skip = (page - 1) * limit

        const [logs, total] = await Promise.all([
            prisma.auditLog.findMany({
                where,
                include: {
                    actor: {
                        select: {
                            id: true,
                            email: true,
                            role: true,
                        },
                    },
                },
                orderBy: { [query.sortBy]: query.sortOrder },
                skip,
                take: limit,
            }),
            prisma.auditLog.count({ where }),
        ])

        return c.json({
            logs,
            pagination: {
                total,
                page,
                limit,
                pages: Math.ceil(total / limit),
            },
            searchTerm,
        })
    } catch (error) {
        logger.error('Search audit logs error:', error)
        return c.json({ error: 'Failed to search audit logs' }, 500)
    }
})

// Helper functions
async function getAvailableActors(): Promise<Array<{ id: string; email: string }>> {
    const actors = await prisma.user.findMany({
        where: {
            auditLogs: {
                some: {},
            },
        },
        select: {
            id: true,
            email: true,
        },
        distinct: ['id'],
    })

    return actors
}

function generateCSV(logs: any[]): string {
    const headers = [
        'ID',
        'Actor Email',
        'Action',
        'Target Type',
        'Target ID',
        'Created At',
        'IP Address',
        'User Agent',
    ]

    const rows = logs.map(log => [
        log.id,
        log.actor.email,
        log.action,
        log.targetType,
        log.targetId || '',
        log.createdAt,
        log.metadata?.ip || '',
        log.metadata?.userAgent || '',
    ])

    const csvContent = [headers, ...rows]
        .map(row => row.map(field => `"${field}"`).join(','))
        .join('\n')

    return csvContent
}

function generateXLSX(logs: any[]): string {
    // This would need to be implemented with a library like xlsx
    // For now, return CSV format
    return generateCSV(logs)
}

export { adminAudit as adminAuditRoutes }
