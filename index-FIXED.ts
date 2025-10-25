import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger as honoLogger } from 'hono/logger'
import { serve } from '@hono/node-server'
import { createServer } from 'http'
import { Server as SocketIOServer } from 'socket.io'
import { createAdapter } from '@socket.io/redis-adapter'
import { createClient } from 'redis'
import { PrismaClient } from '@prisma/client'
import { createLogger } from './lib/logger'
import { authMiddleware } from './middleware/auth'
import { rateLimitMiddleware } from './middleware/rate-limit'
import { authRoutes } from './routes/auth'
import { marketRoutes } from './routes/market'
import { watchlistRoutes } from './routes/watchlist'
import { alertRoutes } from './routes/alerts'
import { paymentRoutes } from './routes/payments'
import { setupSocketHandlers } from './websocket/handlers'

// Initialize Prisma
export const prisma = new PrismaClient()

// Initialize logger
const logger = createLogger()

// Create Hono app
const app = new Hono()

// Middleware
app.use('*', honoLogger())
app.use('*', cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
}))

// Health check
app.get('/health', (c) => {
    return c.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0'
    })
})

// API routes
app.route('/api/auth', authRoutes)
app.route('/api/market', marketRoutes)
app.route('/api/watchlist', watchlistRoutes)
app.route('/api/alerts', alertRoutes)
app.route('/api/payments', paymentRoutes)

// Protected routes (require authentication)
app.use('/api/protected/*', authMiddleware)
app.use('/api/protected/*', rateLimitMiddleware)

// Create HTTP server
const server = createServer(async (req, res) => {
    try {
        const response = await app.fetch(req as any, res as any)
        return response
    } catch (error) {
        logger.error('Server error:', error)
        res.statusCode = 500
        res.end('Internal Server Error')
    }
})

// Initialize Socket.IO
const io = new SocketIOServer(server, {
    cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:3000',
        credentials: true,
    },
    transports: ['websocket', 'polling'],
})

// Setup Redis adapter for Socket.IO scaling (optional)
if (process.env.REDIS_URL) {
    try {
        logger.info(`Setting up Redis adapter with URL: ${process.env.REDIS_URL.split('@')[1]}`)

        // Build Redis client config
        const redisConfig: any = {
            url: process.env.REDIS_URL,
            // Socket configuration for TLS
            ...(process.env.REDIS_URL.startsWith('rediss://') && {
                socket: {
                    tls: true,
                    rejectUnauthorized: process.env.NODE_ENV === 'production',
                },
            }),
        }

        const pubClient = createClient(redisConfig)
        const subClient = pubClient.duplicate()

        // Add error handlers
        pubClient.on('error', (err) => {
            logger.error('Redis pub client error:', err.message || err)
        })

        subClient.on('error', (err) => {
            logger.error('Redis sub client error:', err.message || err)
        })

        pubClient.on('connect', () => {
            logger.info('✅ Redis pub client connected')
        })

        subClient.on('connect', () => {
            logger.info('✅ Redis sub client connected')
        })

        // Connect clients
        Promise.all([
            pubClient.connect().catch((err) => {
                logger.error('Redis pub client connection failed:', err.message || err)
                throw err
            }),
            subClient.connect().catch((err) => {
                logger.error('Redis sub client connection failed:', err.message || err)
                throw err
            }),
        ])
            .then(() => {
                io.adapter(createAdapter(pubClient, subClient))
                logger.info('✅ Socket.IO Redis adapter initialized successfully')
            })
            .catch((err) => {
                logger.error(
                    '❌ Redis adapter setup failed, running without Redis:',
                    err.message || err
                )
                logger.warn('Socket.IO will use in-memory storage (single instance only)')
            })
    } catch (error) {
        logger.error('Redis setup error:', error)
        logger.warn('Continuing without Redis adapter')
    }
} else {
    logger.warn('⚠️  No REDIS_URL provided, Socket.IO using in-memory storage')
}

// Setup Socket.IO handlers
setupSocketHandlers(io, prisma, logger)

// Error handling
app.onError((err, c) => {
    logger.error('Unhandled error:', err)
    return c.json({
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong',
    }, 500)
})

// Graceful shutdown
process.on('SIGTERM', async () => {
    logger.info('SIGTERM received, shutting down gracefully')
    await prisma.$disconnect()
    process.exit(0)
})

process.on('SIGINT', async () => {
    logger.info('SIGINT received, shutting down gracefully')
    await prisma.$disconnect()
    process.exit(0)
})

// Start server
const port = process.env.PORT || 3001
server.listen(port, () => {
    logger.info(`🚀 VolSpike Backend running on port ${port}`)
    logger.info(`📊 Environment: ${process.env.NODE_ENV || 'development'}`)
    logger.info(`🔗 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`)
    
    if (process.env.REDIS_URL) {
        const isTLS = process.env.REDIS_URL.startsWith('rediss://')
        logger.info(`✅ Redis configured: TLS ${isTLS ? 'enabled' : 'disabled'}`)
    }
})

export default app
