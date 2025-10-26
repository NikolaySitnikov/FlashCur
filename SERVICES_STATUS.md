# VolSpike Services Status Guide

## Current Issue
You're seeing "Error loading market data" and WebSocket errors because some services aren't running.

## Required Services

### ✅ Currently Running
1. **Frontend** - http://localhost:3000 (Running)
2. **Backend API** - http://localhost:3001 (Running)

### ❌ Not Running
3. **Docker/Database** - PostgreSQL and Redis need Docker Desktop
4. **WebSocket Connection** - Depends on backend being fully initialized

## How to Fix

### Step 1: Start Docker Desktop
1. Open **Docker Desktop** application on your Mac
2. Wait for it to fully start (whale icon in menu bar should be steady)
3. Then run:

```bash
cd /Users/nikolaysitnikov/Documents/Documents_Nik_MacBook/Everyday\ Life/AI/VolumeFunding/VolSpike
docker-compose up -d
```

### Step 2: Verify Services
```bash
# Check Docker containers
docker ps

# Check backend health
curl http://localhost:3001/health

# Check frontend
curl http://localhost:3000
```

### Step 3: Refresh Browser
- Open http://localhost:3000
- Hard refresh (Cmd+Shift+R)
- The "Error loading market data" should disappear

## Quick Commands

### Start Everything
```bash
# Make sure Docker Desktop is running first!
cd /Users/nikolaysitnikov/Documents/Documents_Nik_MacBook/Everyday\ Life/AI/VolumeFunding/VolSpike
./start-all.sh
```

### Stop Everything
```bash
./stop-all.sh
```

### Check Service Status
```bash
# Frontend
curl -s http://localhost:3000 | head -5

# Backend
curl -s http://localhost:3001/health

# Docker containers
docker ps
```

## Service Ports

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **WebSocket**: ws://localhost:3001
- **PostgreSQL**: localhost:5432
- **Redis**: localhost:6379

## Troubleshooting

### "Error loading market data"
**Cause**: Backend can't connect to database or Redis  
**Solution**: Start Docker Desktop and run `docker-compose up -d`

### WebSocket errors in console
**Cause**: Backend WebSocket server not initialized  
**Solution**: Make sure Docker is running and backend has database access

### "Connection refused" errors
**Cause**: A required service isn't running  
**Solution**: Check all services with the commands above

## Expected Behavior

Once all services are running:
- ✅ Dashboard loads without errors
- ✅ Market data table displays data
- ✅ WebSocket connects successfully
- ✅ Real-time updates work
- ✅ No console errors

## Current Status

```
Frontend:     ✅ Running on port 3000
Backend:      ✅ Running on port 3001
PostgreSQL:   ❌ Not running (needs Docker)
Redis:        ❌ Not running (needs Docker)
WebSocket:    ⚠️  Waiting for database connection
```
