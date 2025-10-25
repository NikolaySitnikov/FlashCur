import { Queue } from 'bullmq'
import { Redis } from 'ioredis'
import { createLogger } from '../lib/logger'

const logger = createLogger()

export function setupBullMQ(redis: Redis) {
    // Alert processing queue
    const alertQueue = new Queue('alerts', {
        connection: redis,
        defaultJobOptions: {
            removeOnComplete: 100,
            removeOnFail: 50,
            attempts: 3,
            backoff: {
                type: 'exponential',
                delay: 2000,
            },
        },
    })

    // Market data processing queue
    const marketDataQueue = new Queue('market-data', {
        connection: redis,
        defaultJobOptions: {
            removeOnComplete: 100,
            removeOnFail: 50,
            attempts: 3,
            backoff: {
                type: 'exponential',
                delay: 2000,
            },
        },
    })

    // Queue event listeners
    alertQueue.on('error', (error) => {
        logger.error('Alert queue error:', error)
    })

    marketDataQueue.on('error', (error) => {
        logger.error('Market data queue error:', error)
    })

    logger.info('BullMQ queues initialized')

    return {
        alertQueue,
        marketDataQueue,
    }
}
