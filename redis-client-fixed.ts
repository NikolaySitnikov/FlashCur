import { Redis } from 'ioredis'
import { createLogger } from '../lib/logger'

const logger = createLogger()

// Initialize Redis client with retry strategy and resilience
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    // TLS configuration
    tls: process.env.REDIS_URL?.startsWith('rediss://') ? {} : undefined,

    // Connection settings
    maxRetriesPerRequest: 3,
    lazyConnect: true,
    connectTimeout: 10000,
    commandTimeout: 5000,

    // Retry strategy with exponential backoff
    retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000)
        logger.info(`Redis retry attempt ${times}, delay: ${delay}ms`)
        return delay
    },

    // Connection resilience
    enableOfflineQueue: true,
    autoResubscribe: true,
    enableReadyCheck: true,
    maxLoadingTimeout: 10000,
})

// Manually connect (lazyConnect is true)
redis.connect().catch((err) => {
    logger.warn('Initial Redis connection failed:', err.message)
})

redis.on('connect', () => {
    logger.info('✅ Redis client connected')
})

redis.on('error', (error) => {
    logger.error('Redis client error:', error)
    // Don't crash the app on Redis errors
})

redis.on('close', () => {
    logger.warn('Redis client connection closed')
})

redis.on('reconnecting', () => {
    logger.info('Redis client reconnecting...')
})

// Cache keys
const CACHE_KEYS = {
    MARKET_DATA: 'market:data',
    MARKET_SYMBOL: (symbol: string) => `market:symbol:${symbol}`,
    USER_PREFS: (userId: string) => `user:prefs:${userId}`,
    RATE_LIMIT: (userId: string, window: number) => `rate_limit:${userId}:${window}`,
}

// Cache TTLs (in seconds)
const CACHE_TTL = {
    MARKET_DATA: 15, // 15 seconds for market data
    USER_PREFS: 3600, // 1 hour for user preferences
    RATE_LIMIT: 900, // 15 minutes for rate limiting
}

export async function getCachedMarketData(symbol?: string): Promise<any> {
    try {
        if (redis.status !== 'ready') {
            return null
        }

        if (symbol) {
            const data = await redis.get(CACHE_KEYS.MARKET_SYMBOL(symbol))
            return data ? JSON.parse(data) : null
        } else {
            const data = await redis.get(CACHE_KEYS.MARKET_DATA)
            return data ? JSON.parse(data) : null
        }
    } catch (error) {
        logger.error('Error getting cached market data:', error)
        return null
    }
}

export async function setCachedMarketData(data: any, symbol?: string): Promise<void> {
    try {
        if (redis.status !== 'ready') {
            return
        }

        if (symbol) {
            await redis.setex(
                CACHE_KEYS.MARKET_SYMBOL(symbol),
                CACHE_TTL.MARKET_DATA,
                JSON.stringify(data)
            )
        } else {
            await redis.setex(
                CACHE_KEYS.MARKET_DATA,
                CACHE_TTL.MARKET_DATA,
                JSON.stringify(data)
            )
        }
    } catch (error) {
        logger.error('Error setting cached market data:', error)
    }
}

export async function getCachedUserPreferences(userId: string): Promise<any> {
    try {
        if (redis.status !== 'ready') {
            return null
        }

        const data = await redis.get(CACHE_KEYS.USER_PREFS(userId))
        return data ? JSON.parse(data) : null
    } catch (error) {
        logger.error('Error getting cached user preferences:', error)
        return null
    }
}

export async function setCachedUserPreferences(userId: string, prefs: any): Promise<void> {
    try {
        if (redis.status !== 'ready') {
            return
        }

        await redis.setex(
            CACHE_KEYS.USER_PREFS(userId),
            CACHE_TTL.USER_PREFS,
            JSON.stringify(prefs)
        )
    } catch (error) {
        logger.error('Error setting cached user preferences:', error)
    }
}

export async function publishMarketUpdate(data: any): Promise<void> {
    try {
        if (redis.status !== 'ready') {
            return
        }

        await redis.publish('market:updates', JSON.stringify(data))
    } catch (error) {
        logger.error('Error publishing market update:', error)
    }
}

export async function publishAlert(alert: any): Promise<void> {
    try {
        if (redis.status !== 'ready') {
            return
        }

        await redis.publish('alerts:new', JSON.stringify(alert))
    } catch (error) {
        logger.error('Error publishing alert:', error)
    }
}

export async function subscribeToMarketUpdates(callback: (data: any) => void): Promise<void> {
    try {
        if (redis.status !== 'ready') {
            logger.warn('Cannot subscribe - Redis not connected')
            return
        }

        const subscriber = redis.duplicate()
        await subscriber.subscribe('market:updates')

        subscriber.on('message', (channel, message) => {
            if (channel === 'market:updates') {
                try {
                    const data = JSON.parse(message)
                    callback(data)
                } catch (error) {
                    logger.error('Error parsing market update message:', error)
                }
            }
        })
    } catch (error) {
        logger.error('Error subscribing to market updates:', error)
    }
}

export async function subscribeToAlerts(callback: (alert: any) => void): Promise<void> {
    try {
        if (redis.status !== 'ready') {
            logger.warn('Cannot subscribe - Redis not connected')
            return
        }

        const subscriber = redis.duplicate()
        await subscriber.subscribe('alerts:new')

        subscriber.on('message', (channel, message) => {
            if (channel === 'alerts:new') {
                try {
                    const alert = JSON.parse(message)
                    callback(alert)
                } catch (error) {
                    logger.error('Error parsing alert message:', error)
                }
            }
        })
    } catch (error) {
        logger.error('Error subscribing to alerts:', error)
    }
}

export async function incrementRateLimit(userId: string, window: number): Promise<number> {
    try {
        if (redis.status !== 'ready') {
            return 0
        }

        const key = CACHE_KEYS.RATE_LIMIT(userId, window)
        const current = await redis.incr(key)

        if (current === 1) {
            await redis.expire(key, CACHE_TTL.RATE_LIMIT)
        }

        return current
    } catch (error) {
        logger.error('Error incrementing rate limit:', error)
        return 0
    }
}

export async function getRateLimit(userId: string, window: number): Promise<number> {
    try {
        if (redis.status !== 'ready') {
            return 0
        }

        const key = CACHE_KEYS.RATE_LIMIT(userId, window)
        const current = await redis.get(key)
        return current ? parseInt(current) : 0
    } catch (error) {
        logger.error('Error getting rate limit:', error)
        return 0
    }
}

export { redis }
