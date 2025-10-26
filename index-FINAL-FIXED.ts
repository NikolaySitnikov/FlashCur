import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger as honoLogger } from 'hono/logger'
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

// ============================================
// ROUTES
// ============================================

// Health check - CRITICAL for Railway to know server is ready
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

// 404 handler
app.notFound((c) => {
    return c.json({ error: 'Not Found' }, 404)
})

// Global error handler
app.onError((err, c) => {
    logger.error('Unhandled error:', err)
    return c.json({
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
    }, 500)
})

// ============================================
// SERVER SETUP - SINGLE SERVER FOR BOTH HONO AND SOCKET.IO
// ============================================

// Create ONE HTTP server that will handle both Hono and Socket.IO
const httpServer = createServer(async (req, res) => {
    try {
        // Convert Node.js request to Web API Request
        const url = new URL(req.url || '/', `http://${req.headers.host}`)
        
        const request = new Request(url, {
            method: req.method,
            headers: req.headers as Record<string, string>,
            body: ['GET', 'HEAD'].includes(req.method || 'GET') ? undefined : req,
        })

        // Get response from Hono
        const response = await app.fetch(request)

        // Convert Web API Response back to Node.js response
        res.writeHead(response.status, Object.fromEntries(response.headers))
        
        if (response.body) {
            const reader = response.body.getReader()
            
            const pump = async () => {
                try {
                    const { done, value } = await reader.read()
                    if (done) {
                        res.end()
                        return
                    }
                    res.write(value)
                    await pump()
                } catch (streamErr) {
                    logger.error('Stream error:', streamErr)
                    res.end()
                }
            }
            
            await pump()
        } else {
            res.end()
        }
    } catch (error) {
        logger.error('Request handler error:', error)
        res.writeHead(500, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({
            error: 'Internal Server Error',
            message: process.env.NODE_ENV === 'development' ? String(error) : 'Something went wrong'
        }))
    }
})

// ============================================
// SOCKET.IO SETUP
// ============================================

// Attach Socket.IO to the same HTTP server
const io = new SocketIOServer(httpServer, {
    cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:3000',
        credentials: true,
    },
    transports: ['websocket', 'polling'],
})

logger.info('✅ Socket.IO attached to HTTP server')

// Setup Redis adapter for Socket.IO scaling (if Redis is available)
if (process.env.REDIS_URL) {
    try {
        const pubClient = createClient({
            url: process.env.REDIS_URL,
            socket: process.env.REDIS_URL?.startsWith('rediss://') ? {
                tls: true,
                rejectUnauthorized: process.env.NODE_ENV === 'production' ? false : true
            } : undefined
        })
        const subClient = pubClient.duplicate()

        pubClient.on('error', (err) => {
            logger.error('Redis pub client error:', err)
        })

        subClient.on('error', (err) => {
            logger.error('Redis sub client error:', err)
        })

        // Connect to Redis
        Promise.all([
            pubClient.connect(),
            subClient.connect()
        ]).then(() => {
            io.adapter(createAdapter(pubClient, subClient))
            logger.info('✅ Socket.IO Redis adapter initialized')
        }).catch(err => {
            logger.error('⚠️  Redis adapter setup failed:', err)
            logger.info('Continuing with in-memory adapter')
        })
    } catch (error) {
        logger.error('⚠️  Redis setup error:', error)
        logger.info('Continuing with in-memory adapter')
    }
} else {
    logger.info('⚠️  No Redis URL provided, using in-memory adapter')
}

// Setup Socket.IO handlers
setupSocketHandlers(io, prisma, logger)

// Socket.IO connection logging
io.on('connection', (socket) => {
    logger.info(`Socket.IO client connected: ${socket.id}`)
    
    socket.on('disconnect', () => {
        logger.info(`Socket.IO client disconnected: ${socket.id}`)
    })
})

// ============================================
// GRACEFUL SHUTDOWN
// ============================================

process.on('SIGTERM', async () => {
    logger.info('SIGTERM received, shutting down gracefully...')
    io.close()
    httpServer.close()
    await prisma.$disconnect()
    logger.info('Shutdown complete')
    process.exit(0)
})

process.on('SIGINT', async () => {
    logger.info('SIGINT received, shutting down gracefully...')
    io.close()
    httpServer.close()
    await prisma.$disconnect()
    logger.info('Shutdown complete')
    process.exit(0)
})

// ============================================
// SERVER START
// ============================================

const port = Number(process.env.PORT) || 3001

httpServer.listen(port, '0.0.0.0', () => {
    logger.info(`🚀 VolSpike Backend running on port ${port}`)
    logger.info(`📊 Environment: ${process.env.NODE_ENV || 'development'}`)
    logger.info(`🔗 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`)
    logger.info(`✅ Server ready to accept requests`)
})

// Handle server errors
httpServer.on('error', (err) => {
    logger.error('Server error:', err)
    process.exit(1)
})

export default app
