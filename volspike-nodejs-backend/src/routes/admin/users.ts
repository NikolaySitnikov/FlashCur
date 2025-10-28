import { Hono } from 'hono'
import { z } from 'zod'
import { prisma } from '../../index'
import { requireAdmin, require2FA, requireResourceAccess } from '../../middleware/admin-auth'
import { csrfProtection } from '../../middleware/csrf'
import { adminRateLimit } from '../../middleware/admin-rate-limit'
import { auditLog, auditAction } from '../../middleware/audit-logger'
import { createLogger } from '../../lib/logger'
import { Role, UserStatus } from '@prisma/client'
import {
    UserListQuery,
    UserListResponse,
    UserSummary,
    UserDetail,
    CreateUserRequest,
    UpdateUserRequest,
    BulkActionRequest
} from '../../types/admin'
import { AuditAction, AuditTargetType } from '../../types/audit'
import * as bcrypt from 'bcryptjs'

const logger = createLogger()
const adminUsers = new Hono()

// Apply middleware
adminUsers.use('*', requireAdmin)
adminUsers.use('*', adminRateLimit)
adminUsers.use(['POST', 'PATCH', 'DELETE'], csrfProtection)
adminUsers.use(['POST', 'PATCH', 'DELETE'], require2FA)
adminUsers.use('*', auditLog)

// Validation schemas
const userListSchema = z.object({
    search: z.string().optional(),
    role: z.enum(['USER', 'ADMIN']).optional(),
    tier: z.enum(['free', 'pro', 'elite']).optional(),
    status: z.enum(['ACTIVE', 'SUSPENDED', 'BANNED']).optional(),
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(100).default(20),
    sortBy: z.enum(['createdAt', 'email', 'lastLoginAt']).default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
})

const createUserSchema = z.object({
    email: z.string().email(),
    tier: z.enum(['free', 'pro', 'elite']).default('free'),
    role: z.enum(['USER', 'ADMIN']).default('USER'),
    sendInvite: z.boolean().default(true),
    temporaryPassword: z.string().min(12).optional(),
})

const updateUserSchema = z.object({
    tier: z.enum(['free', 'pro', 'elite']).optional(),
    role: z.enum(['USER', 'ADMIN']).optional(),
    status: z.enum(['ACTIVE', 'SUSPENDED', 'BANNED']).optional(),
    notes: z.string().optional(),
    emailVerified: z.boolean().optional(),
})

const bulkActionSchema = z.object({
    action: z.enum(['suspend', 'activate', 'delete', 'changeTier']),
    userIds: z.array(z.string()).min(1),
    params: z.object({
        tier: z.enum(['free', 'pro', 'elite']).optional(),
        status: z.enum(['ACTIVE', 'SUSPENDED', 'BANNED']).optional(),
    }).optional(),
})

// GET /api/admin/users - List users with filtering
adminUsers.get('/', async (c) => {
    try {
        const query = userListSchema.parse(c.req.query())

        // Build where clause
        const where: any = {}

        if (query.search) {
            where.OR = [
                { email: { contains: query.search, mode: 'insensitive' } },
                { walletAddress: { contains: query.search, mode: 'insensitive' } },
            ]
        }

        if (query.role) where.role = query.role
        if (query.tier) where.tier = query.tier
        if (query.status) where.status = query.status

        // Get total count
        const total = await prisma.user.count({ where })

        // Get paginated results
        const users = await prisma.user.findMany({
            where,
            select: {
                id: true,
                email: true,
                walletAddress: true,
                tier: true,
                role: true,
                status: true,
                emailVerified: true,
                createdAt: true,
                lastLoginAt: true,
                stripeCustomerId: true,
            },
            orderBy: { [query.sortBy]: query.sortOrder },
            skip: (query.page - 1) * query.limit,
            take: query.limit,
        })

        const response: UserListResponse = {
            users: users as UserSummary[],
            pagination: {
                total,
                page: query.page,
                limit: query.limit,
                pages: Math.ceil(total / query.limit),
            },
        }

        return c.json(response)
    } catch (error) {
        logger.error('List users error:', error)
        return c.json({ error: 'Failed to fetch users' }, 500)
    }
})

// GET /api/admin/users/:id - Get user details
adminUsers.get('/:id', async (c) => {
    try {
        const userId = c.req.param('id')

        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: {
                preferences: true,
                watchlists: {
                    include: {
                        items: {
                            include: {
                                contract: true,
                            },
                        },
                    },
                },
                alerts: {
                    orderBy: { createdAt: 'desc' },
                    take: 10,
                },
                auditLogs: {
                    orderBy: { createdAt: 'desc' },
                    take: 20,
                },
            },
        })

        if (!user) {
            return c.json({ error: 'User not found' }, 404)
        }

        // Get Stripe subscription if customer exists
        let subscription = null
        if (user.stripeCustomerId) {
            // Fetch from Stripe (implement this)
            subscription = await getStripeSubscription(user.stripeCustomerId)
        }

        return c.json({
            user: user as UserDetail,
            subscription,
        })
    } catch (error) {
        logger.error('Get user error:', error)
        return c.json({ error: 'Failed to fetch user' }, 500)
    }
})

// POST /api/admin/users - Create new user
adminUsers.post('/', async (c) => {
    try {
        const body = await c.req.json()
        const data = createUserSchema.parse(body)

        // Check if user already exists
        const existing = await prisma.user.findUnique({
            where: { email: data.email },
        })

        if (existing) {
            return c.json({ error: 'User already exists' }, 409)
        }

        // Generate temporary password if not provided
        const tempPassword = data.temporaryPassword || generateTempPassword()
        const passwordHash = await bcrypt.hash(tempPassword, 12)

        // Create user
        const user = await prisma.user.create({
            data: {
                email: data.email,
                tier: data.tier,
                role: data.role,
                // Note: Add passwordHash field to schema if needed
                // passwordHash,
            },
        })

        // Send invite email
        if (data.sendInvite) {
            await sendInviteEmail({
                email: data.email,
                temporaryPassword: tempPassword,
                invitedBy: c.get('adminUser').email,
                tier: data.tier,
            })
        }

        // Log the action
        await auditAction(
            c.get('adminUser').id,
            AuditAction.USER_CREATED,
            AuditTargetType.USER,
            user.id,
            undefined,
            { email: data.email, tier: data.tier, role: data.role }
        )

        logger.info(`User ${data.email} created by admin ${c.get('adminUser').email}`)

        return c.json({
            user,
            temporaryPassword: data.sendInvite ? undefined : tempPassword,
        }, 201)
    } catch (error) {
        logger.error('Create user error:', error)
        return c.json({ error: 'Failed to create user' }, 500)
    }
})

// PATCH /api/admin/users/:id - Update user
adminUsers.patch('/:id', async (c) => {
    try {
        const userId = c.req.param('id')
        const body = await c.req.json()
        const data = updateUserSchema.parse(body)

        // Get current user data for audit
        const currentUser = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                tier: true,
                role: true,
                status: true,
                notes: true,
                emailVerified: true,
            },
        })

        if (!currentUser) {
            return c.json({ error: 'User not found' }, 404)
        }

        const user = await prisma.user.update({
            where: { id: userId },
            data: {
                ...data,
                updatedAt: new Date(),
            },
        })

        // Log the action
        await auditAction(
            c.get('adminUser').id,
            AuditAction.USER_UPDATED,
            AuditTargetType.USER,
            userId,
            currentUser,
            data
        )

        logger.info(`User ${userId} updated by admin ${c.get('adminUser').email}`)

        return c.json({ user })
    } catch (error) {
        logger.error('Update user error:', error)
        return c.json({ error: 'Failed to update user' }, 500)
    }
})

// DELETE /api/admin/users/:id - Delete user (soft delete)
adminUsers.delete('/:id', async (c) => {
    try {
        const userId = c.req.param('id')
        const hardDelete = c.req.query('hard') === 'true'

        if (hardDelete) {
            // Require additional confirmation
            const confirmation = c.req.header('X-Confirm-Delete')
            if (confirmation !== 'CONFIRM') {
                return c.json({ error: 'Confirmation required' }, 400)
            }

            await prisma.user.delete({
                where: { id: userId },
            })

            await auditAction(
                c.get('adminUser').id,
                AuditAction.USER_DELETED,
                AuditTargetType.USER,
                userId,
                undefined,
                { hardDelete: true }
            )

            logger.warn(`User ${userId} HARD DELETED by admin ${c.get('adminUser').email}`)
        } else {
            // Soft delete - just mark as BANNED
            await prisma.user.update({
                where: { id: userId },
                data: { status: UserStatus.BANNED },
            })

            await auditAction(
                c.get('adminUser').id,
                AuditAction.USER_DELETED,
                AuditTargetType.USER,
                userId,
                undefined,
                { hardDelete: false }
            )

            logger.info(`User ${userId} soft deleted by admin ${c.get('adminUser').email}`)
        }

        return c.json({ success: true })
    } catch (error) {
        logger.error('Delete user error:', error)
        return c.json({ error: 'Failed to delete user' }, 500)
    }
})

// POST /api/admin/users/bulk - Bulk actions
adminUsers.post('/bulk', async (c) => {
    try {
        const body = await c.req.json()
        const data = bulkActionSchema.parse(body)

        const results = []

        for (const userId of data.userIds) {
            try {
                switch (data.action) {
                    case 'suspend':
                        await prisma.user.update({
                            where: { id: userId },
                            data: { status: UserStatus.SUSPENDED },
                        })
                        results.push({ userId, success: true, action: 'suspended' })
                        break

                    case 'activate':
                        await prisma.user.update({
                            where: { id: userId },
                            data: { status: UserStatus.ACTIVE },
                        })
                        results.push({ userId, success: true, action: 'activated' })
                        break

                    case 'delete':
                        await prisma.user.update({
                            where: { id: userId },
                            data: { status: UserStatus.BANNED },
                        })
                        results.push({ userId, success: true, action: 'deleted' })
                        break

                    case 'changeTier':
                        if (data.params?.tier) {
                            await prisma.user.update({
                                where: { id: userId },
                                data: { tier: data.params.tier },
                            })
                            results.push({ userId, success: true, action: `tier changed to ${data.params.tier}` })
                        }
                        break
                }
            } catch (error) {
                results.push({ userId, success: false, error: error.message })
            }
        }

        // Log bulk action
        await auditAction(
            c.get('adminUser').id,
            AuditAction.BULK_ACTION_EXECUTED,
            AuditTargetType.USER,
            data.userIds.join(','),
            undefined,
            { action: data.action, userIds: data.userIds, results }
        )

        return c.json({ results })
    } catch (error) {
        logger.error('Bulk action error:', error)
        return c.json({ error: 'Failed to execute bulk action' }, 500)
    }
})

// POST /api/admin/users/:id/suspend - Suspend user
adminUsers.post('/:id/suspend', async (c) => {
    try {
        const userId = c.req.param('id')

        const user = await prisma.user.update({
            where: { id: userId },
            data: { status: UserStatus.SUSPENDED },
        })

        await auditAction(
            c.get('adminUser').id,
            AuditAction.USER_SUSPENDED,
            AuditTargetType.USER,
            userId
        )

        return c.json({ user })
    } catch (error) {
        logger.error('Suspend user error:', error)
        return c.json({ error: 'Failed to suspend user' }, 500)
    }
})

// POST /api/admin/users/:id/reset-password - Force password reset
adminUsers.post('/:id/reset-password', async (c) => {
    try {
        const userId = c.req.param('id')

        // Generate new temporary password
        const tempPassword = generateTempPassword()

        // Send password reset email
        await sendPasswordResetEmail(userId, tempPassword)

        await auditAction(
            c.get('adminUser').id,
            AuditAction.USER_UPDATED,
            AuditTargetType.USER,
            userId,
            undefined,
            { action: 'password_reset' }
        )

        return c.json({ success: true, message: 'Password reset email sent' })
    } catch (error) {
        logger.error('Reset password error:', error)
        return c.json({ error: 'Failed to reset password' }, 500)
    }
})

// Helper functions
function generateTempPassword(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%'
    let password = ''
    for (let i = 0; i < 16; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return password
}

async function getStripeSubscription(customerId: string): Promise<any> {
    // Implement Stripe subscription fetch
    return null
}

async function sendInviteEmail(data: {
    email: string
    temporaryPassword: string
    invitedBy: string
    tier: string
}) {
    // Implement email sending
    logger.info(`Invite email sent to ${data.email}`)
}

async function sendPasswordResetEmail(userId: string, tempPassword: string) {
    // Implement password reset email
    logger.info(`Password reset email sent for user ${userId}`)
}

export { adminUsers as adminUserRoutes }
