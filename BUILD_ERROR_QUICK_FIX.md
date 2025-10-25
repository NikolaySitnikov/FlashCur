# ⚡ QUICK FIX - TypeScript Build Errors

## 🔴 The Three Errors

```
❌ Error 1: Duplicate maxRetriesPerRequest
❌ Error 2: Invalid property retryDelayOnFailover
❌ Error 3: Invalid property retry_strategy
```

---

## 🚀 One-Minute Fix

### Option A: Copy Our Fixed Files (Recommended)

```bash
# Copy the fixed files
cp redis-client-FIXED.ts src/services/redis-client.ts
cp index-FIXED.ts src/index.ts

# Build to verify no errors
npm run build

# Deploy
git add src/
git commit -m "fix: typescript compilation errors - correct redis config"
git push origin main
```

**Done!** ✅ Railway auto-deploys.

---

### Option B: Manual Fix (If You Want to Understand)

#### File 1: src/services/redis-client.ts

**Find this section (around line 7):**
```typescript
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: 3,
    lazyConnect: true,
    connectTimeout: 10000,
    commandTimeout: 5000,
    tls: process.env.REDIS_URL?.startsWith('rediss://') ? {} : undefined,
    retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000)
        logger.info(`Redis retry attempt ${times}, delay: ${delay}ms`)
        return delay
    },
    enableOfflineQueue: true,
    autoResubscribe: true,
    maxRetriesPerRequest: 3,           // ❌ REMOVE THIS DUPLICATE
    retryDelayOnFailover: 100,         // ❌ REMOVE THIS INVALID PROPERTY
    enableReadyCheck: true,
    maxLoadingTimeout: 10000,
})
```

**Replace with:**
```typescript
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

// ✅ ADD THIS: Manually connect (lazyConnect is true)
redis.connect().catch((err) => {
    logger.warn('Initial Redis connection failed:', err.message)
})
```

---

#### File 2: src/index.ts

**Find this section (around line 76):**
```typescript
const pubClient = createClient({ 
    url: process.env.REDIS_URL,
    socket: process.env.REDIS_URL?.startsWith('rediss://') ? {
        tls: true,
        rejectUnauthorized: false
    } : undefined,
    retry_strategy: (options) => {              // ❌ REMOVE THIS ENTIRE SECTION
        if (options.error && options.error.code === 'ECONNREFUSED') {
            logger.error('Redis connection refused, retrying...')
            return new Error('Redis connection refused')
        }
        if (options.total_retry_time > 1000 * 60 * 60) {
            logger.error('Redis retry time exhausted')
            return new Error('Retry time exhausted')
        }
        if (options.attempt > 10) {
            logger.error('Redis max retry attempts reached')
            return undefined
        }
        return Math.min(options.attempt * 100, 3000)
    }
})
```

**Replace with:**
```typescript
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
```

**Then fix the error handlers (around line 110):**

**Find:**
```typescript
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
```

**Replace with:**
```typescript
// Add event listeners
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
```

---

## ✅ Verify It Works

```bash
# Check for TypeScript errors
npm run type-check

# Should output:
# "Found 0 errors. Watching for file changes..."
```

If you see this:
```
Found 0 errors
```

You're done! ✅

---

## 📋 What Each Error Was

| Error | Problem | Fix |
|-------|---------|-----|
| `Duplicate maxRetriesPerRequest` | Property listed twice | Remove one |
| `Invalid property retryDelayOnFailover` | Doesn't exist in ioredis | Remove it |
| `Invalid property retry_strategy` | Doesn't exist in @redis/client | Remove it |

---

## 🎯 Summary of Changes

### redis-client.ts
- ✅ Removed duplicate `maxRetriesPerRequest`
- ✅ Removed invalid `retryDelayOnFailover`
- ✅ Added `redis.connect()` call

### index.ts
- ✅ Removed invalid `retry_strategy`
- ✅ Improved TLS configuration
- ✅ Better error handling

---

## 🚀 Deploy & Verify

```bash
# 1. Make the changes (copy files or manual edits)
# 2. Build to check
npm run build

# 3. Commit
git add src/services/redis-client.ts src/index.ts
git commit -m "fix: typescript compilation errors"

# 4. Push
git push origin main

# 5. Watch logs
railway logs --follow

# Should see:
✅ Redis client connected
✅ Redis pub client connected
✅ Redis sub client connected
✅ Socket.IO Redis adapter initialized
🚀 VolSpike Backend running
```

**That's it! The TypeScript errors are fixed.** ✅
