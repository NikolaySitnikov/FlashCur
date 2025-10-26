import { Hono } from 'hono'
import { z } from 'zod'
import { prisma } from '../index'
import { createLogger } from '../lib/logger'
import { User } from '../types'
import { getUser, requireUser } from '../lib/hono-extensions'
import { getMarketData } from '../services/binance-client'
import { getCachedMarketData } from '../services/redis-client'

const logger = createLogger()

const market = new Hono()

// Get market data with tier-based throttling
market.get('/data', async (c) => {
    try {
        // For development: allow unauthenticated access
        let user, tier = 'free'
        try {
            user = requireUser(c)
            tier = user?.tier || 'free'
        } catch (error) {
            // In development, use mock user if not authenticated
            if (process.env.NODE_ENV === 'development') {
                logger.info('Using mock user for market data (development mode)')
                user = { id: '1', email: 'dev@volspike.com', tier: 'free' } as any
                tier = 'free'
            } else {
                throw error
            }
        }

        // Get cached market data
        const marketData = await getCachedMarketData()

        if (!marketData || marketData.length === 0) {
            // Fallback to direct API call
            const freshData = await getMarketData()
            return c.json(freshData)
        }

        // Apply tier-based filtering
        let filteredData = marketData

        if (tier === 'free') {
            // Free tier: limit to top 50 by volume
            filteredData = marketData
                .sort((a: any, b: any) => b.volume24h - a.volume24h)
                .slice(0, 50)
        } else if (tier === 'pro') {
            // Pro tier: top 100 by volume
            filteredData = marketData
                .sort((a: any, b: any) => b.volume24h - a.volume24h)
                .slice(0, 100)
        }
        // Elite tier: all data

        logger.info(`Market data requested by ${user?.email} (${tier} tier)`)

        return c.json(filteredData)
    } catch (error) {
        logger.error('Market data error:', error)
        return c.json({ error: 'Failed to fetch market data' }, 500)
    }
})

// Get specific symbol data
market.get('/symbol/:symbol', async (c) => {
    try {
        const symbol = c.req.param('symbol')
        const user = requireUser(c)

        // Get symbol data from cache or database
        const symbolData = await getCachedMarketData(symbol)

        if (!symbolData) {
            return c.json({ error: 'Symbol not found' }, 404)
        }

        logger.info(`Symbol data requested for ${symbol} by ${user?.email}`)

        return c.json(symbolData)
    } catch (error) {
        logger.error('Symbol data error:', error)
        return c.json({ error: 'Failed to fetch symbol data' }, 500)
    }
})

// Get historical data for a symbol
market.get('/history/:symbol', async (c) => {
    try {
        const symbol = c.req.param('symbol')
        const timeframe = c.req.query('timeframe') || '1h'
        const limit = parseInt(c.req.query('limit') || '100')

        const user = requireUser(c)
        const tier = user?.tier || 'free'

        // Tier-based access control
        if (tier === 'free' && limit > 50) {
            return c.json({ error: 'Free tier limited to 50 data points' }, 403)
        }

        if (tier === 'pro' && limit > 200) {
            return c.json({ error: 'Pro tier limited to 200 data points' }, 403)
        }

        // Get contract ID
        const contract = await prisma.contract.findUnique({
            where: { symbol },
        })

        if (!contract) {
            return c.json({ error: 'Symbol not found' }, 404)
        }

        // Get historical data from database
        const history = await prisma.marketSnapshot.findMany({
            where: { contractId: contract.id },
            orderBy: { timestamp: 'desc' },
            take: limit,
        })

        logger.info(`Historical data requested for ${symbol} by ${user?.email}`)

        return c.json(history)
    } catch (error) {
        logger.error('Historical data error:', error)
        return c.json({ error: 'Failed to fetch historical data' }, 500)
    }
})

// Get volume spike alerts
market.get('/spikes', async (c) => {
    try {
        const user = requireUser(c)
        const tier = user?.tier || 'free'

        // Get recent alerts
        const alerts = await prisma.alert.findMany({
            where: { userId: user.id },
            orderBy: { createdAt: 'desc' },
            take: tier === 'free' ? 10 : tier === 'pro' ? 50 : 100,
            include: {
                contract: {
                    select: { symbol: true },
                },
            },
        })

        logger.info(`Volume spikes requested by ${user?.email} (${tier} tier)`)

        return c.json(alerts)
    } catch (error) {
        logger.error('Volume spikes error:', error)
        return c.json({ error: 'Failed to fetch volume spikes' }, 500)
    }
})

export { market as marketRoutes }
