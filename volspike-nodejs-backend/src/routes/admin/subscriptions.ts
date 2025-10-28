import { Hono } from 'hono'
import { z } from 'zod'
import { prisma } from '../../index'
import { requireAdmin, require2FA } from '../../middleware/admin-auth'
import { csrfProtection } from '../../middleware/csrf'
import { adminRateLimit } from '../../middleware/admin-rate-limit'
import { auditLog, auditAction } from '../../middleware/audit-logger'
import { createLogger } from '../../lib/logger'
import { AuditAction, AuditTargetType } from '../../types/audit'
import { SubscriptionSummary, StripeSyncRequest } from '../../types/admin'

const logger = createLogger()
const adminSubscriptions = new Hono()

// Apply middleware
adminSubscriptions.use('*', requireAdmin)
adminSubscriptions.use('*', adminRateLimit)
adminSubscriptions.use(['POST', 'PATCH', 'DELETE'], csrfProtection)
adminSubscriptions.use(['POST', 'PATCH', 'DELETE'], require2FA)
adminSubscriptions.use('*', auditLog)

// Validation schemas
const subscriptionListSchema = z.object({
    status: z.string().optional(),
    tier: z.enum(['free', 'pro', 'elite']).optional(),
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(100).default(20),
    sortBy: z.enum(['createdAt', 'updatedAt', 'email']).default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
})

const stripeSyncSchema = z.object({
    userId: z.string(),
    forceSync: z.boolean().default(false),
})

const refundSchema = z.object({
    amount: z.number().min(0).optional(),
    reason: z.string().optional(),
    refundApplicationFee: z.boolean().default(false),
})

// GET /api/admin/subscriptions - List all subscriptions
adminSubscriptions.get('/', async (c) => {
    try {
        const query = subscriptionListSchema.parse(c.req.query())

        // Build where clause
        const where: any = {}

        if (query.status) {
            where.stripeCustomerId = { not: null }
            // Add status filtering based on Stripe data
        }

        if (query.tier) {
            where.tier = query.tier
        }

        // Get total count
        const total = await prisma.user.count({ where })

        // Get paginated results
        const users = await prisma.user.findMany({
            where,
            select: {
                id: true,
                email: true,
                tier: true,
                stripeCustomerId: true,
                createdAt: true,
                updatedAt: true,
            },
            orderBy: { [query.sortBy]: query.sortOrder },
            skip: (query.page - 1) * query.limit,
            take: query.limit,
        })

        // Fetch Stripe subscription data for each user
        const subscriptions: SubscriptionSummary[] = []

        for (const user of users) {
            if (user.stripeCustomerId) {
                const subscription = await getStripeSubscriptionData(user.stripeCustomerId)
                if (subscription) {
                    subscriptions.push({
                        id: subscription.id,
                        userId: user.id,
                        userEmail: user.email,
                        stripeCustomerId: user.stripeCustomerId,
                        stripeSubscriptionId: subscription.id,
                        stripePriceId: subscription.items?.data[0]?.price?.id,
                        status: subscription.status,
                        currentPeriodStart: new Date(subscription.current_period_start * 1000),
                        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
                        cancelAtPeriodEnd: subscription.cancel_at_period_end,
                        createdAt: new Date(subscription.created * 1000),
                        updatedAt: new Date(subscription.updated * 1000),
                    })
                }
            }
        }

        return c.json({
            subscriptions,
            pagination: {
                total,
                page: query.page,
                limit: query.limit,
                pages: Math.ceil(total / query.limit),
            },
        })
    } catch (error) {
        logger.error('List subscriptions error:', error)
        return c.json({ error: 'Failed to fetch subscriptions' }, 500)
    }
})

// GET /api/admin/subscriptions/:id - Get subscription details
adminSubscriptions.get('/:id', async (c) => {
    try {
        const subscriptionId = c.req.param('id')

        // Get subscription from Stripe
        const subscription = await getStripeSubscriptionById(subscriptionId)

        if (!subscription) {
            return c.json({ error: 'Subscription not found' }, 404)
        }

        // Get user data
        const user = await prisma.user.findFirst({
            where: { stripeCustomerId: subscription.customer },
        })

        return c.json({
            subscription,
            user: user ? {
                id: user.id,
                email: user.email,
                tier: user.tier,
            } : null,
        })
    } catch (error) {
        logger.error('Get subscription error:', error)
        return c.json({ error: 'Failed to fetch subscription' }, 500)
    }
})

// POST /api/admin/subscriptions/:userId/sync - Sync Stripe data
adminSubscriptions.post('/:userId/sync', async (c) => {
    try {
        const userId = c.req.param('userId')
        const body = await c.req.json()
        const data = stripeSyncSchema.parse({ ...body, userId })

        const user = await prisma.user.findUnique({
            where: { id: userId },
        })

        if (!user) {
            return c.json({ error: 'User not found' }, 404)
        }

        if (!user.stripeCustomerId) {
            return c.json({ error: 'User has no Stripe customer ID' }, 400)
        }

        // Sync subscription data
        const subscription = await syncStripeSubscription(user.stripeCustomerId)

        if (subscription) {
            // Update user tier based on subscription
            const tier = determineTierFromPriceId(subscription.items?.data[0]?.price?.id)

            await prisma.user.update({
                where: { id: userId },
                data: { tier },
            })

            await auditAction(
                c.get('adminUser').id,
                AuditAction.SUBSCRIPTION_UPDATED,
                AuditTargetType.SUBSCRIPTION,
                subscription.id,
                { tier: user.tier },
                { tier, subscriptionId: subscription.id }
            )

            return c.json({
                success: true,
                subscription,
                updatedTier: tier,
            })
        } else {
            return c.json({ error: 'No active subscription found' }, 404)
        }
    } catch (error) {
        logger.error('Sync subscription error:', error)
        return c.json({ error: 'Failed to sync subscription' }, 500)
    }
})

// DELETE /api/admin/subscriptions/:userId/subscription - Cancel subscription
adminSubscriptions.delete('/:userId/subscription', async (c) => {
    try {
        const userId = c.req.param('userId')

        const user = await prisma.user.findUnique({
            where: { id: userId },
        })

        if (!user) {
            return c.json({ error: 'User not found' }, 404)
        }

        if (!user.stripeCustomerId) {
            return c.json({ error: 'User has no Stripe customer ID' }, 400)
        }

        // Cancel subscription in Stripe
        const subscription = await cancelStripeSubscription(user.stripeCustomerId)

        if (subscription) {
            // Update user tier to free
            await prisma.user.update({
                where: { id: userId },
                data: { tier: 'free' },
            })

            await auditAction(
                c.get('adminUser').id,
                AuditAction.SUBSCRIPTION_CANCELLED,
                AuditTargetType.SUBSCRIPTION,
                subscription.id,
                { tier: user.tier },
                { tier: 'free', subscriptionId: subscription.id }
            )

            return c.json({
                success: true,
                subscription,
                message: 'Subscription cancelled successfully',
            })
        } else {
            return c.json({ error: 'No active subscription found' }, 404)
        }
    } catch (error) {
        logger.error('Cancel subscription error:', error)
        return c.json({ error: 'Failed to cancel subscription' }, 500)
    }
})

// POST /api/admin/subscriptions/:userId/refund - Process refund
adminSubscriptions.post('/:userId/refund', async (c) => {
    try {
        const userId = c.req.param('userId')
        const body = await c.req.json()
        const data = refundSchema.parse(body)

        const user = await prisma.user.findUnique({
            where: { id: userId },
        })

        if (!user) {
            return c.json({ error: 'User not found' }, 404)
        }

        if (!user.stripeCustomerId) {
            return c.json({ error: 'User has no Stripe customer ID' }, 400)
        }

        // Process refund in Stripe
        const refund = await processStripeRefund(user.stripeCustomerId, data)

        if (refund) {
            await auditAction(
                c.get('adminUser').id,
                AuditAction.SUBSCRIPTION_REFUNDED,
                AuditTargetType.SUBSCRIPTION,
                refund.id,
                undefined,
                {
                    refundId: refund.id,
                    amount: refund.amount,
                    reason: data.reason,
                }
            )

            return c.json({
                success: true,
                refund,
                message: 'Refund processed successfully',
            })
        } else {
            return c.json({ error: 'Failed to process refund' }, 500)
        }
    } catch (error) {
        logger.error('Process refund error:', error)
        return c.json({ error: 'Failed to process refund' }, 500)
    }
})

// GET /api/admin/subscriptions/metrics - Subscription metrics
adminSubscriptions.get('/metrics', async (c) => {
    try {
        const [
            totalSubscriptions,
            activeSubscriptions,
            cancelledSubscriptions,
            revenueByTier,
            monthlyRecurringRevenue,
        ] = await Promise.all([
            getTotalSubscriptions(),
            getActiveSubscriptions(),
            getCancelledSubscriptions(),
            getRevenueByTier(),
            getMonthlyRecurringRevenue(),
        ])

        return c.json({
            totalSubscriptions,
            activeSubscriptions,
            cancelledSubscriptions,
            revenueByTier,
            monthlyRecurringRevenue,
        })
    } catch (error) {
        logger.error('Get subscription metrics error:', error)
        return c.json({ error: 'Failed to fetch metrics' }, 500)
    }
})

// Helper functions
async function getStripeSubscriptionData(customerId: string): Promise<any> {
    // Implement Stripe API call to get subscription
    // This is a placeholder - implement actual Stripe integration
    return null
}

async function getStripeSubscriptionById(subscriptionId: string): Promise<any> {
    // Implement Stripe API call to get subscription by ID
    return null
}

async function syncStripeSubscription(customerId: string): Promise<any> {
    // Implement Stripe subscription sync
    return null
}

async function cancelStripeSubscription(customerId: string): Promise<any> {
    // Implement Stripe subscription cancellation
    return null
}

async function processStripeRefund(customerId: string, refundData: any): Promise<any> {
    // Implement Stripe refund processing
    return null
}

function determineTierFromPriceId(priceId: string): 'free' | 'pro' | 'elite' {
    // Map Stripe price IDs to tiers
    // This should be configured based on your Stripe setup
    if (priceId?.includes('pro')) return 'pro'
    if (priceId?.includes('elite')) return 'elite'
    return 'free'
}

async function getTotalSubscriptions(): Promise<number> {
    return await prisma.user.count({
        where: { stripeCustomerId: { not: null } },
    })
}

async function getActiveSubscriptions(): Promise<number> {
    // This would need to be implemented with actual Stripe data
    return 0
}

async function getCancelledSubscriptions(): Promise<number> {
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

async function getMonthlyRecurringRevenue(): Promise<number> {
    // This would need to be implemented with actual Stripe data
    return 0
}

export { adminSubscriptions as adminSubscriptionRoutes }
