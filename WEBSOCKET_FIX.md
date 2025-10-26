# WebSocket & Token Error Fix

## Issues Found

### 1. "Invalid token" Error (Socket.io)
**Cause**: Socket.io authentication token is invalid or expired  
**Impact**: WebSocket connections fail, real-time data doesn't work  

### 2. Redis Connection Errors
**Cause**: Backend was trying to connect before Redis container was ready  
**Impact**: Caching doesn't work, performance degraded  
**Status**: ✅ Fixed - Redis is now connected

## How to Fix

### Step 1: Hard Refresh Browser
Do a **hard refresh** to clear cached tokens:
- **Mac**: `Cmd + Shift + R`
- **Windows/Linux**: `Ctrl + Shift + R`

This will force the app to get a new authentication token.

### Step 2: Check All Services
Make sure all services are running:

```bash
# Check Docker containers
docker ps

# Check backend
curl http://localhost:3001/health

# Check Redis
docker exec volspike-redis redis-cli ping
```

Expected output:
- PostgreSQL and Redis should be "Up"
- Backend should return: `{"status":"ok"...}`
- Redis should return: `PONG`

### Step 3: Check Browser Console
Open Developer Tools (F12) and check:
1. **Console tab**: Should have no errors
2. **Network tab**: Should show successful WebSocket connections (ws://)
3. **Application tab** → Cookies: Should have auth cookies

## Common Issues & Solutions

### "WebSocket connection failed"
**Cause**: Backend not running or Socket.io server not initialized  
**Solution**: 
1. Check backend is running: `curl http://localhost:3001/health`
2. Restart backend: `cd volspike-nodejs-backend && npm run dev`
3. Hard refresh browser

### "Invalid token" Error
**Cause**: Stale or expired authentication token  
**Solution**:
1. Hard refresh browser (Cmd+Shift+R)
2. If that doesn't work, clear browser cache:
   - Chrome: Settings → Privacy → Clear browsing data → Cached images and files
3. Reload page

### Redis Connection Errors
**Cause**: Redis container not running or misconfigured  
**Solution**:
```bash
# Start Redis
docker start volspike-redis

# Verify connection
docker exec volspike-redis redis-cli ping
# Should return: PONG
```

## Current Service Status

✅ **Frontend**: Running on http://localhost:3000  
✅ **Backend**: Running on http://localhost:3001  
✅ **PostgreSQL**: Running on localhost:5432  
✅ **Redis**: Running on localhost:6379  

## Verification

After hard refresh, you should see:
- ✅ Dashboard loads without errors
- ✅ No "Invalid token" errors in console
- ✅ WebSocket connects successfully (check Network tab)
- ✅ Market data loads
- ✅ Real-time updates work

## If Issues Persist

1. **Clear browser data completely**:
   - Chrome: Settings → Privacy → Clear browsing data → All time
2. **Restart all services**:
   ```bash
   # Stop everything
   ./stop-all.sh
   
   # Start everything
   ./start-all.sh
   ```
3. **Check logs**:
   - Frontend terminal: Should show successful page loads
   - Backend terminal: Should show Redis connected and WebSocket initialized

## Quick Reference

| Service | URL | Status Check |
|---------|-----|--------------|
| Frontend | http://localhost:3000 | Open in browser |
| Backend | http://localhost:3001/health | `curl http://localhost:3001/health` |
| PostgreSQL | localhost:5432 | `docker ps \| grep postgres` |
| Redis | localhost:6379 | `docker exec volspike-redis redis-cli ping` |

## Next Steps

1. Hard refresh browser (Cmd+Shift+R)
2. Open Developer Tools (F12) and check Console
3. Verify no errors
4. Test dashboard functionality
