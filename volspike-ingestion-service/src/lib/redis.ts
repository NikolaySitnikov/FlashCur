import { Redis } from 'ioredis'
import { createLogger } from '../lib/logger'

const logger = createLogger()

export function setupRedis(): Redis {
    const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
        maxRetriesPerRequest: 3,
        lazyConnect: true,
    })

    redis.on('connect', () => {
        logger.info('Redis client connected')
    })

    redis.on('error', (error) => {
        logger.error('Redis client error:', error)
    })

    return redis
}
