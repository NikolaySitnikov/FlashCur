# VolSpike Backend Fix Guide

## 🔴 Root Cause Identified

Your backend **IS receiving requests** (as shown in logs: `<-- GET h`), but it's **crashing with unhandled errors**. The issue is in `src/index.ts`:

```typescript
const server = createServer(async (req, res) => {
    try {
        const response = await app.fetch(req as any, res as any)  // ❌ PROBLEM HERE
        return response
    }
    // ...
})
```

### Why This Fails:
1. `app.fetch()` expects a Web API `Request` object, NOT Node.js `req`/`res`
2. You're passing Node.js request/response to a method that doesn't understand them
3. This causes the fetch to fail, triggering your error handler but losing the response properly
4. Each request crashes with "Unhandled error" and returns 500

---

## ✅ The Fix

Replace your entire `src/index.ts` with this corrected version:

```typescript
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

// Health check endpoint
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

// Error handling
app.onError((err, c) => {
    logger.error('Unhandled error:', err)
    return c.json({
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
    }, 500)
})

// Create HTTP server that serves both Hono and Socket.IO
const server = createServer(async (req, res) => {
    try {
        // Convert Node.js request to Web API Request
        const url = new URL(req.url || '/', `http://${req.headers.host}`)
        const request = new Request(url, {
            method: req.method,
            headers: req.headers as any,
            body: req.method !== 'GET' && req.method !== 'HEAD' ? req : undefined,
        })

        // Get Hono response
        const response = await app.fetch(request)

        // Convert Web API Response to Node.js response
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
                } catch (err) {
                    logger.error('Stream error:', err)
                    res.end()
                }
            }
            await pump()
        } else {
            res.end()
        }
    } catch (error) {
        logger.error('Server error:', error)
        res.writeHead(500, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ 
            error: 'Internal Server Error',
            message: process.env.NODE_ENV === 'development' ? String(error) : 'Something went wrong'
        }))
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
        const pubClient = createClient({ 
            url: process.env.REDIS_URL,
            socket: process.env.REDIS_URL?.startsWith('rediss://') ? {
                tls: true,
                rejectUnauthorized: process.env.NODE_ENV === 'production' ? false : true
            } : undefined
        })
        const subClient = pubClient.duplicate()

        // Add error handlers
        pubClient.on('error', (err) => {
            logger.error('Redis pub client error:', err)
        })

        subClient.on('error', (err) => {
            logger.error('Redis sub client error:', err)
        })

        // Connect with timeout
        Promise.all([
            pubClient.connect().catch(err => logger.error('Redis pub connect error:', err)),
            subClient.connect().catch(err => logger.error('Redis sub connect error:', err))
        ]).then(() => {
            io.adapter(createAdapter(pubClient, subClient))
            logger.info('Socket.IO Redis adapter initialized')
        }).catch(err => {
            logger.error('Redis adapter setup failed:', err)
            logger.info('Continuing without Redis adapter')
        })
    } catch (error) {
        logger.error('Redis setup error:', error)
        logger.info('Continuing without Redis adapter')
    }
} else {
    logger.info('No Redis URL provided, skipping Redis adapter')
}

// Setup Socket.IO handlers
setupSocketHandlers(io, prisma, logger)

// Socket.IO connection handler
io.on('connection', (socket) => {
    logger.info(`Socket.IO client connected: ${socket.id}`)
})

// Graceful shutdown
process.on('SIGTERM', async () => {
    logger.info('SIGTERM received, shutting down gracefully')
    io.close()
    server.close()
    await prisma.$disconnect()
    process.exit(0)
})

process.on('SIGINT', async () => {
    logger.info('SIGINT received, shutting down gracefully')
    io.close()
    server.close()
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
```

---

## 🔑 Key Changes Explained

### 1. **Request/Response Conversion**
```typescript
// Convert Node.js request to Web API Request
const url = new URL(req.url || '/', `http://${req.headers.host}`)
const request = new Request(url, {
    method: req.method,
    headers: req.headers as any,
    body: req.method !== 'GET' && req.method !== 'HEAD' ? req : undefined,
})

// Get Hono response (now works correctly!)
const response = await app.fetch(request)
```

### 2. **Proper Response Handling**
```typescript
// Write headers
res.writeHead(response.status, Object.fromEntries(response.headers))

// Stream body if exists
if (response.body) {
    const reader = response.body.getReader()
    // ... pump data
} else {
    res.end()
}
```

### 3. **Better Error Handling**
- Catches errors at the server level
- Returns proper JSON error responses
- Doesn't lose the response

---

## 📋 Deployment Steps

1. **Update your `src/index.ts`** with the corrected code above
2. **Rebuild the application**:
   ```bash
   npm run build
   ```
3. **Test locally first**:
   ```bash
   npm run start
   # Then in another terminal:
   curl http://localhost:3001/health
   ```
4. **Redeploy to Railway**:
   - Push changes to git
   - Railway will automatically redeploy

---

## ✅ What You Should See After Fix

**Before (failing logs):**
```
<-- GET h
Unhandled error:
--> GET h 500 3ms
```

**After (working logs):**
```
🚀 VolSpike Backend running on port 3001
📊 Environment: production
🔗 Frontend URL: https://volspike.com
```

And the health check will work:
```bash
$ curl https://volspike-production.up.railway.app/health
{"status":"ok","timestamp":"2025-10-25T...","version":"1.0.0"}
```

---

## 🧪 Testing After Deployment

```bash
# Test health endpoint
curl https://volspike-production.up.railway.app/health

# Test with your frontend
curl -X GET https://volspike-production.up.railway.app/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN"

# Check Railway logs
railway logs -s volspike-production
```

---

## 📚 Why This Happened

Hono's `app.fetch()` is designed for deployment on edge runtimes (Cloudflare Workers, Deno, etc.) that use Web APIs. When using Node.js with `createServer()`, you need to manually convert between Node.js and Web API standards. Your original code was trying to pass Node.js objects to a Web API method, which caused the crashes.

---

## 🆘 If Issues Persist

1. Check Railway logs: `railway logs -s volspike-production`
2. Verify environment variables are set in Railway
3. Ensure port 3001 is exposed (it should be automatically)
4. Check that Prisma client can connect to your database

Let me know if this fixes your issue!
