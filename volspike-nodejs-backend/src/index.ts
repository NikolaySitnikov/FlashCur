import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
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
app.use('*', logger())
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
const server = createServer((req, res) => {
    app.fetch(req, res)
})

// Initialize Socket.IO
const io = new SocketIOServer(server, {
    cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:3000',
        credentials: true,
    },
    transports: ['websocket', 'polling'],
})

// Setup Redis adapter for Socket.IO scaling
if (process.env.REDIS_URL) {
    const pubClient = createClient({ url: process.env.REDIS_URL })
    const subClient = pubClient.duplicate()

    Promise.all([pubClient.connect(), subClient.connect()]).then(() => {
        io.adapter(createAdapter(pubClient, subClient))
        logger.info('Socket.IO Redis adapter initialized')
    })
}

// Setup Socket.IO handlers
setupSocketHandlers(io, prisma, logger)

// Error handling
app.onError((err, c) => {
    logger.error('Unhandled error:', err)
    return c.json({
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
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
})

export default app
