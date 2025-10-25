# TypeScript Build Errors - Complete Fix Guide

## 🔴 The Three TypeScript Errors (And Their Fixes)

---

## Error #1: Duplicate `maxRetriesPerRequest` Property

### The Problem
```typescript
// ❌ BROKEN (in redis-client.ts)
const redis = new Redis(..., {
    maxRetriesPerRequest: 3,
    lazyConnect: true,
    connectTimeout: 10000,
    commandTimeout: 5000,
    tls: process.env.REDIS_URL?.startsWith('rediss://') ? {} : undefined,
    retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000)
        return delay
    },
    enableOfflineQueue: true,
    autoResubscribe: true,
    maxRetriesPerRequest: 3,  // ❌ DUPLICATE! Already defined above
    retryDelayOnFailover: 100, // ❌ INVALID PROPERTY NAME
    enableReadyCheck: true,
    maxLoadingTimeout: 10000,
})
```

**Error Message:**
```
error TS1117: An object literal cannot have multiple properties with the same name.
```

### The Fix
```typescript
// ✅ CORRECT (no duplicates)
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    // TLS configuration
    tls: process.env.REDIS_URL?.startsWith('rediss://') ? {} : undefined,

    // Connection settings
    maxRetriesPerRequest: 3,  // ✅ Listed once
    lazyConnect: true,
    connectTimeout: 10000,
    commandTimeout: 5000,

    // Retry strategy with exponential backoff
    retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000)
        return delay
    },

    // Connection resilience
    enableOfflineQueue: true,
    autoResubscribe: true,
    enableReadyCheck: true,
    maxLoadingTimeout: 10000,
})
```

**What changed:**
- Removed duplicate `maxRetriesPerRequest`
- Removed invalid `retryDelayOnFailover` property (doesn't exist in ioredis)
- Kept only valid ioredis properties

---

## Error #2: Invalid Property `retryDelayOnFailover`

### The Problem
```typescript
// ❌ BROKEN
retryDelayOnFailover: 100,  // This property doesn't exist in ioredis!
```

**Error Message:**
```
error TS2769: No overload matches this call.
Object literal may only specify known properties, and 'retryDelayOnFailover' does not exist in type 'RedisOptions'.
```

### Why It's Wrong
The ioredis library doesn't have a `retryDelayOnFailover` property. The valid properties are:
- `retryStrategy` - Custom logic for retry delays ✅
- `maxRetriesPerRequest` - Max retries per request ✅
- `enableOfflineQueue` - Queue requests during reconnect ✅

### The Fix
```typescript
// ✅ CORRECT (use retryStrategy instead)
retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000)
    return delay
}
```

**What this does:**
- Called on each failed connection attempt
- `times` = number of attempts so far
- Returns delay in milliseconds
- `Math.min(times * 50, 2000)` = exponential backoff (50ms, 100ms, 150ms... capped at 2000ms)

---

## Error #3: Invalid Property `retry_strategy` for Socket.IO Adapter

### The Problem
```typescript
// ❌ BROKEN (in index.ts)
const pubClient = createClient({ 
    url: process.env.REDIS_URL,
    socket: process.env.REDIS_URL?.startsWith('rediss://') ? {
        tls: true,
        rejectUnauthorized: false
    } : undefined,
    retry_strategy: (options) => {  // ❌ INVALID PROPERTY!
        if (options.error && options.error.code === 'ECONNREFUSED') {
            return new Error('Redis connection refused')
        }
        return Math.min(options.attempt * 100, 3000)
    }
})
```

**Error Message:**
```
error TS2353: Object literal may only specify known properties, and 'retry_strategy' does not exist in type 'RedisClientOptions'.
```

### Why It's Wrong
The `@redis/client` library (used for Socket.IO) doesn't have a `retry_strategy` property at the config level. Retry logic is built-in and automatic - you can't customize it with config options.

### The Fix
```typescript
// ✅ CORRECT (remove retry_strategy, use socket config)
const pubClient = createClient({
    url: process.env.REDIS_URL,
    socket: process.env.REDIS_URL.startsWith('rediss://') ? {
        tls: true,
        rejectUnauthorized: process.env.NODE_ENV === 'production',
    } : undefined,
    // ✅ No retry_strategy - @redis/client handles retries automatically
})
```

**What this uses:**
- `socket.tls` - Enable TLS for rediss:// URLs
- `socket.rejectUnauthorized` - Validate certificates in production
- Built-in retry logic (no configuration needed)

---

## 📊 Comparison: ioredis vs @redis/client

| Feature | ioredis (redis-client.ts) | @redis/client (index.ts) |
|---------|--------------------------|-------------------------|
| Retry customization | ✅ `retryStrategy` function | ❌ Automatic (no config) |
| Offline queue | ✅ `enableOfflineQueue` | ✅ Automatic |
| Auto-resubscribe | ✅ `autoResubscribe` | ✅ Automatic |
| TLS config | ✅ `tls: {}` | ✅ `socket.tls: true` |
| Ready check | ✅ `enableReadyCheck` | ❌ Automatic |

**Key difference:** ioredis gives you more control, @redis/client automates more things.

---

## 🚀 Implementation Steps

### Step 1: Fix redis-client.ts

**Find:** The Redis initialization in `src/services/redis-client.ts`

**Replace:** Lines 7-27 with this:

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

// Manually connect (lazyConnect is true)
redis.connect().catch((err) => {
    logger.warn('Initial Redis connection failed:', err.message)
})
```

**Key changes:**
- ✅ Removed duplicate `maxRetriesPerRequest`
- ✅ Removed invalid `retryDelayOnFailover`
- ✅ Added `redis.connect()` call
- ✅ Kept all valid properties

---

### Step 2: Fix index.ts

**Find:** The Redis adapter setup in `src/index.ts` (around line 76-110)

**Replace:** With this:

```typescript
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
```

**Key changes:**
- ✅ Removed invalid `retry_strategy` property
- ✅ Moved TLS config to `socket` object with spread operator
- ✅ Added proper error handling
- ✅ Added connection status logging

---

## ✅ Verification Steps

### Step 1: TypeScript Check
```bash
npm run type-check

# Should show:
# "Found 0 errors. Watching for file changes..."
```

### Step 2: Build
```bash
npm run build

# Should complete without errors
```

### Step 3: Commit and Push
```bash
git add src/services/redis-client.ts src/index.ts
git commit -m "fix: correct TypeScript configuration for Redis clients"
git push origin main
```

### Step 4: Deploy
Railway will auto-deploy. Check logs:
```bash
railway logs --follow

# Should see:
✅ Redis client connected
✅ Redis pub client connected
✅ Redis sub client connected
✅ Socket.IO Redis adapter initialized
🚀 VolSpike Backend running
```

---

## 🎯 What Was Wrong vs What's Right

### Wrong (Your Code)
```typescript
// ioredis
retryDelayOnFailover: 100,  // Invalid property
maxRetriesPerRequest: 3,
// ... more config ...
maxRetriesPerRequest: 3,  // Duplicate!

// Socket.IO adapter
retry_strategy: (options) => { ... }  // Invalid property
```

### Right (Fixed Code)
```typescript
// ioredis
retryStrategy: (times) => {  // Correct property name
    return Math.min(times * 50, 2000)
}
maxRetriesPerRequest: 3,  // Listed once

// Socket.IO adapter
socket: {
    tls: true,
    rejectUnauthorized: true,
}
// No retry_strategy - it's automatic
```

---

## 📚 Reference: Valid ioredis Properties

```typescript
const redis = new Redis({
    // Connection
    host: 'localhost',
    port: 6379,
    url: 'redis://...',
    password: 'password',
    
    // TLS
    tls: {} or false,
    
    // Timeouts
    connectTimeout: 10000,
    commandTimeout: 5000,
    lazyConnect: true,
    
    // Retries
    maxRetriesPerRequest: 3,
    retryStrategy: (times) => { ... },
    
    // Offline behavior
    enableOfflineQueue: true,
    enableReadyCheck: true,
    
    // Auto-recovery
    autoResubscribe: true,
    maxLoadingTimeout: 10000,
    
    // Cluster
    retryDelayOnClusterDown: 300,  // ✅ Valid (for clusters)
    // NOT retryDelayOnFailover ❌
})
```

---

## 🚨 Common Mistakes to Avoid

```typescript
// ❌ DON'T DO THIS
retry_strategy: { ... }        // Snake case - wrong library
retryDelayOnFailover: 100       // Property doesn't exist
maxRetriesPerRequest: 3         // Listed twice
socket.tls: true, tls: {}      // Both specified

// ✅ DO THIS INSTEAD
retryStrategy: (times) => { }   // Camel case - ioredis
// Don't use retryDelayOnFailover
maxRetriesPerRequest: 3         // Listed once
socket: { tls: true }           // One way only
```

---

## Summary

| Error | Cause | Fix |
|-------|-------|-----|
| Duplicate property | Listed property twice | Remove duplicate |
| `retryDelayOnFailover` | Wrong property name | Use `retryStrategy` instead |
| `retry_strategy` | Wrong library syntax | Remove it (automatic in @redis/client) |

All three errors are now fixed in the provided files:
- [redis-client-FIXED.ts](redis-client-FIXED.ts)
- [index-FIXED.ts](index-FIXED.ts)
