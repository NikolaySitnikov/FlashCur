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

// Health check - MUST be before other middleware that requires auth
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
// HTTP SERVER - NO serve() FROM @hono/node-server
// ============================================

// Create a single HTTP server manually
const httpServer = createServer(async (req, res) => {
    try {
        // Parse URL
        const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`)
        
        // Create Web API Request
        const request = new Request(url, {
            method: req.method,
            headers: req.headers as Record<string, string>,
            // Only pass body for non-GET/HEAD requests
            body: ['GET', 'HEAD', 'DELETE'].includes(req.method || '') ? undefined : req,
        })

        // Call Hono's fetch
        const response = await app.fetch(request)

        // Write status and headers
        res.writeHead(response.status, Object.fromEntries(response.headers))
        
        // Stream body
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
                    if (!res.writableEnded) {
                        res.end()
                    }
                }
            }
            
            await pump()
        } else {
            res.end()
        }
    } catch (error) {
        logger.error('Request error:', error)
        if (!res.writableEnded) {
            res.writeHead(500, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({
                error: 'Internal Server Error',
                message: process.env.NODE_ENV === 'development' ? String(error) : undefined
            }))
        }
    }
})

// ============================================
// SOCKET.IO SETUP
// ============================================

const io = new SocketIOServer(httpServer, {
    cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:3000',
        credentials: true,
    },
    transports: ['websocket', 'polling'],
})

logger.info('✅ Socket.IO attached to HTTP server')

// Setup Socket.IO handlers first
setupSocketHandlers(io, prisma, logger)

// Connection logging
io.on('connection', (socket) => {
    logger.info(`Socket.IO connected: ${socket.id}`)
    socket.on('disconnect', () => {
        logger.info(`Socket.IO disconnected: ${socket.id}`)
    })
})

// ============================================
// REDIS ADAPTER
// ============================================

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
            logger.error('Redis pub error:', err)
        })

        subClient.on('error', (err) => {
            logger.error('Redis sub error:', err)
        })

        Promise.all([
            pubClient.connect(),
            subClient.connect()
        ]).then(() => {
            io.adapter(createAdapter(pubClient, subClient))
            logger.info('✅ Redis adapter initialized')
        }).catch(err => {
            logger.warn('⚠️  Redis adapter failed, using in-memory:', err.message)
        })
    } catch (error) {
        logger.warn('⚠️  Redis setup error:', error)
    }
} else {
    logger.info('ℹ️  No Redis URL, using in-memory adapter')
}

// ============================================
// ERROR HANDLERS
// ============================================

httpServer.on('error', (err) => {
    logger.error('Server error:', err)
    process.exit(1)
})

// ============================================
// GRACEFUL SHUTDOWN
// ============================================

const shutdown = async (signal: string) => {
    logger.info(`\n${signal} received, shutting down...`)
    
    io.close()
    
    await new Promise<void>((resolve) => {
        httpServer.close(() => {
            logger.info('HTTP server closed')
            resolve()
        })
    })
    
    await prisma.$disconnect()
    logger.info('Prisma disconnected')
    logger.info('Shutdown complete')
    process.exit(0)
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))

// ============================================
// START SERVER
// ============================================

const port = Number(process.env.PORT) || 3001
const host = '0.0.0.0'

httpServer.listen(port, host, () => {
    logger.info(`🚀 VolSpike Backend running on ${host}:${port}`)
    logger.info(`📊 Environment: ${process.env.NODE_ENV || 'development'}`)
    logger.info(`🔗 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`)
    logger.info(`✅ Server ready to accept requests`)
})

export default app