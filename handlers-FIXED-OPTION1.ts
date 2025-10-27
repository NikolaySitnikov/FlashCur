import { Server as SocketIOServer, Socket } from 'socket.io'
import { PrismaClient } from '@prisma/client'
import { createLogger } from '../lib/logger'
import { getCachedMarketData, publishMarketUpdate } from '../services/redis-client'

const logger = createLogger()

interface AuthenticatedSocket extends Socket {
    userId?: string
    userEmail?: string
    userTier?: string
}

export function setupSocketHandlers(
    io: SocketIOServer,
    prisma: PrismaClient,
    logger: any
) {
    // Authentication middleware
    io.use(async (socket: AuthenticatedSocket, next) => {
        try {
            const token = socket.handshake.auth.token

            if (!token) {
                logger.error('Socket auth failed: token missing')
                return next(new Error('Authentication required: token missing'))
            }

            logger.info(`Socket auth attempt with token: ${token.substring(0, 30)}...`)

            // For development: allow mock tokens without database lookup
            if (process.env.NODE_ENV === 'development' && token.startsWith('mock-token-')) {
                // Extract email from mock token: mock-token-user@example.com-123456789
                const emailMatch = token.match(/mock-token-(.+?)-\d+$/)
                const mockEmail = emailMatch ? emailMatch[1] : 'dev@local'
                socket.userEmail = mockEmail
                socket.userId = 'dev-user-1'
                socket.userTier = 'free'
                logger.info(`✅ Mock token authenticated: ${mockEmail}`)
                return next()
            }

            // Production: token is the user's email - look up user by email
            logger.info(`Looking up user with email: ${token}`)

            const user = await prisma.user.findUnique({
                where: { email: token },
                select: {
                    id: true,
                    email: true,
                    tier: true,
                    refreshInterval: true,
                },
            })

            if (!user) {
                logger.error(`Socket auth failed: user with email "${token}" not found in database`)
                return next(new Error(`Invalid token: user not found`))
            }

            socket.userId = user.id
            socket.userEmail = user.email
            socket.userTier = user.tier
            logger.info(`✅ Socket authenticated for user ${user.email} (ID: ${user.id}, Tier: ${user.tier})`)
            next()
        } catch (error) {
            logger.error('Socket authentication error:', error)
            next(new Error(`Authentication failed: ${error instanceof Error ? error.message : 'unknown error'}`))
        }
    })

    io.on('connection', (socket: AuthenticatedSocket) => {
        const userId = socket.userId!
        const userEmail = socket.userEmail!
        const userTier = socket.userTier!

        logger.info(`✅ WebSocket connected: ${userEmail} (ID: ${userId}, Tier: ${userTier}) - Socket ID: ${socket.id}`)

        // Join user to tier-based room
        socket.join(`tier-${userTier}`)
        socket.join(`user-${userId}`)

        // Handle symbol subscriptions
        socket.on('subscribe-symbol', async (symbol: string) => {
            try {
                socket.join(`symbol-${symbol}`)
                logger.info(`User ${userEmail} subscribed to ${symbol}`)

                // Send current data for the symbol
                const symbolData = await getCachedMarketData(symbol)
                if (symbolData) {
                    socket.emit('symbol-data', symbolData)
                }
            } catch (error) {
                logger.error(`Error subscribing to symbol ${symbol}:`, error)
                socket.emit('error', { message: `Failed to subscribe to ${symbol}` })
            }
        })

        socket.on('unsubscribe-symbol', (symbol: string) => {
            socket.leave(`symbol-${symbol}`)
            logger.info(`User ${userEmail} unsubscribed from ${symbol}`)
        })

        // Handle watchlist subscriptions
        socket.on('subscribe-watchlist', async (watchlistId: string) => {
            try {
                // Verify user owns the watchlist
                const watchlist = await prisma.watchlist.findFirst({
                    where: {
                        id: watchlistId,
                        userId: userId,
                    },
                    include: {
                        items: {
                            include: {
                                contract: true,
                            },
                        },
                    },
                })

                if (!watchlist) {
                    logger.warn(`User ${userEmail} attempted to subscribe to non-existent watchlist ${watchlistId}`)
                    socket.emit('error', { message: 'Watchlist not found' })
                    return
                }

                socket.join(`watchlist-${watchlistId}`)
                logger.info(`User ${userEmail} subscribed to watchlist ${watchlistId}`)

                // Send current data for all symbols in watchlist
                for (const item of watchlist.items) {
                    const symbolData = await getCachedMarketData(item.contract.symbol)
                    if (symbolData) {
                        socket.emit('symbol-data', symbolData)
                    }
                }
            } catch (error) {
                logger.error(`Error subscribing to watchlist ${watchlistId}:`, error)
                socket.emit('error', { message: 'Failed to subscribe to watchlist' })
            }
        })

        // Handle tier-based refresh requests
        socket.on('request-refresh', async () => {
            try {
                const tier = userTier
                let refreshInterval: number

                switch (tier) {
                    case 'free':
                        refreshInterval = 15 * 60 * 1000 // 15 minutes
                        break
                    case 'pro':
                        refreshInterval = 5 * 60 * 1000 // 5 minutes
                        break
                    case 'elite':
                        refreshInterval = 30 * 1000 // 30 seconds
                        break
                    default:
                        refreshInterval = 15 * 60 * 1000
                }

                // Send refresh interval to client
                socket.emit('refresh-interval', { interval: refreshInterval })

                // Send current market data
                const marketData = await getCachedMarketData()
                if (marketData) {
                    socket.emit('market-update', marketData)
                }
            } catch (error) {
                logger.error(`Error handling refresh request for ${userEmail}:`, error)
            }
        })

        // Handle disconnect
        socket.on('disconnect', (reason) => {
            logger.info(`User ${userEmail} disconnected: ${reason}`)
        })

        // Send initial data based on tier
        socket.emit('connected', {
            userId: userId,
            email: userEmail,
            tier: userTier,
            refreshInterval: getRefreshInterval(userTier),
        })

        // Send current market data
        getCachedMarketData().then(data => {
            if (data) {
                socket.emit('market-update', data)
            }
        }).catch(err => {
            logger.error(`Error sending initial market data to ${userEmail}:`, err)
        })
    })

    // Broadcast market updates to all connected clients
    setInterval(async () => {
        try {
            const marketData = await getCachedMarketData()
            if (marketData) {
                // Broadcast to all connected clients
                io.emit('market-update', marketData)

                // Publish to Redis for other services
                await publishMarketUpdate(marketData)
            }
        } catch (error) {
            logger.error('Error broadcasting market update:', error)
        }
    }, 5000) // Broadcast every 5 seconds

    // Handle alert broadcasting
    io.on('alert-triggered', async (alert: any) => {
        try {
            // Broadcast to all users subscribed to the symbol
            io.to(`symbol-${alert.symbol}`).emit('alert-triggered', alert)

            // Broadcast to tier-based rooms
            if (alert.tier) {
                io.to(`tier-${alert.tier}`).emit('alert-triggered', alert)
            }

            logger.info(`Alert broadcasted for ${alert.symbol}`)
        } catch (error) {
            logger.error('Error broadcasting alert:', error)
        }
    })
}

function getRefreshInterval(tier: string): number {
    switch (tier) {
        case 'free':
            return 15 * 60 * 1000 // 15 minutes
        case 'pro':
            return 5 * 60 * 1000 // 5 minutes
        case 'elite':
            return 30 * 1000 // 30 seconds
        default:
            return 15 * 60 * 1000
    }
}
