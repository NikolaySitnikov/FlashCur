import { Hono } from 'hono'
import { z } from 'zod'
import { prisma } from '../index'
import { createLogger } from '../lib/logger'
import { User } from '../types'
import { getUser, requireUser } from '../lib/hono-extensions'

const logger = createLogger()

const watchlist = new Hono()

// Validation schemas
const createWatchlistSchema = z.object({
    name: z.string().min(1).max(100),
})

const addToWatchlistSchema = z.object({
    symbol: z.string().min(1),
})

// Get user's watchlists
watchlist.get('/', async (c) => {
    try {
        const user = requireUser(c)

        const watchlists = await prisma.watchlist.findMany({
            where: { userId: user.id },
            include: {
                items: {
                    include: {
                        contract: {
                            select: { symbol: true, isActive: true },
                        },
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        })

        logger.info(`Watchlists requested by ${user?.email}`)

        return c.json(watchlists)
    } catch (error) {
        logger.error('Get watchlists error:', error)
        return c.json({ error: 'Failed to fetch watchlists' }, 500)
    }
})

// Create new watchlist
watchlist.post('/', async (c) => {
    try {
        const user = requireUser(c)
        const body = await c.req.json()
        const { name } = createWatchlistSchema.parse(body)

        const watchlist = await prisma.watchlist.create({
            data: {
                name,
                userId: user.id,
            },
            include: {
                items: {
                    include: {
                        contract: {
                            select: { symbol: true, isActive: true },
                        },
                    },
                },
            },
        })

        logger.info(`Watchlist "${name}" created by ${user?.email}`)

        return c.json(watchlist)
    } catch (error) {
        logger.error('Create watchlist error:', error)
        return c.json({ error: 'Failed to create watchlist' }, 500)
    }
})

// Get specific watchlist
watchlist.get('/:id', async (c) => {
    try {
        const user = requireUser(c)
        const watchlistId = c.req.param('id')

        const watchlist = await prisma.watchlist.findFirst({
            where: {
                id: watchlistId,
                userId: user.id,
            },
            include: {
                items: {
                    include: {
                        contract: {
                            select: { symbol: true, isActive: true },
                        },
                    },
                },
            },
        })

        if (!watchlist) {
            return c.json({ error: 'Watchlist not found' }, 404)
        }

        logger.info(`Watchlist ${watchlistId} requested by ${user?.email}`)

        return c.json(watchlist)
    } catch (error) {
        logger.error('Get watchlist error:', error)
        return c.json({ error: 'Failed to fetch watchlist' }, 500)
    }
})

// Add symbol to watchlist
watchlist.post('/:id/symbols', async (c) => {
    try {
        const user = requireUser(c)
        const watchlistId = c.req.param('id')
        const body = await c.req.json()
        const { symbol } = addToWatchlistSchema.parse(body)

        // Verify watchlist ownership
        const watchlist = await prisma.watchlist.findFirst({
            where: {
                id: watchlistId,
                userId: user.id,
            },
        })

        if (!watchlist) {
            return c.json({ error: 'Watchlist not found' }, 404)
        }

        // Get or create contract
        let contract = await prisma.contract.findUnique({
            where: { symbol },
        })

        if (!contract) {
            contract = await prisma.contract.create({
                data: {
                    symbol,
                    precision: 2, // Default precision
                },
            })
        }

        // Add to watchlist
        const watchlistItem = await prisma.watchlistItem.create({
            data: {
                watchlistId,
                contractId: contract.id,
            },
            include: {
                contract: {
                    select: { symbol: true, isActive: true },
                },
            },
        })

        logger.info(`Symbol ${symbol} added to watchlist ${watchlistId} by ${user?.email}`)

        return c.json(watchlistItem)
    } catch (error) {
        logger.error('Add symbol error:', error)
        return c.json({ error: 'Failed to add symbol to watchlist' }, 500)
    }
})

// Remove symbol from watchlist
watchlist.delete('/:id/symbols/:symbol', async (c) => {
    try {
        const user = requireUser(c)
        const watchlistId = c.req.param('id')
        const symbol = c.req.param('symbol')

        // Get contract
        const contract = await prisma.contract.findUnique({
            where: { symbol },
        })

        if (!contract) {
            return c.json({ error: 'Symbol not found' }, 404)
        }

        // Verify watchlist ownership and remove item
        const deleted = await prisma.watchlistItem.deleteMany({
            where: {
                watchlistId,
                contractId: contract.id,
                watchlist: {
                    userId: user.id,
                },
            },
        })

        if (deleted.count === 0) {
            return c.json({ error: 'Symbol not found in watchlist' }, 404)
        }

        logger.info(`Symbol ${symbol} removed from watchlist ${watchlistId} by ${user?.email}`)

        return c.json({ success: true })
    } catch (error) {
        logger.error('Remove symbol error:', error)
        return c.json({ error: 'Failed to remove symbol from watchlist' }, 500)
    }
})

// Delete watchlist
watchlist.delete('/:id', async (c) => {
    try {
        const user = requireUser(c)
        const watchlistId = c.req.param('id')

        const deleted = await prisma.watchlist.deleteMany({
            where: {
                id: watchlistId,
                userId: user.id,
            },
        })

        if (deleted.count === 0) {
            return c.json({ error: 'Watchlist not found' }, 404)
        }

        logger.info(`Watchlist ${watchlistId} deleted by ${user?.email}`)

        return c.json({ success: true })
    } catch (error) {
        logger.error('Delete watchlist error:', error)
        return c.json({ error: 'Failed to delete watchlist' }, 500)
    }
})

export { watchlist as watchlistRoutes }
