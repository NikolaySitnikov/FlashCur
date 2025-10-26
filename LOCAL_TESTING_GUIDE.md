# Local Testing Guide for VolSpike

This guide will help you run and test the VolSpike application on your local machine.

## Prerequisites

- Node.js 18+ installed
- PostgreSQL (or Docker for database)
- Redis (or Docker for Redis)

## Quick Start (Development Mode)

### 1. Start Database and Redis

Using Docker Compose (recommended):
```bash
cd /Users/nikolaysitnikov/Documents/Documents_Nik_MacBook/Everyday\ Life/AI/VolumeFunding/VolSpike
docker-compose up -d
```

Or manually:
```bash
# PostgreSQL
docker run -d --name volspike-postgres \
  -e POSTGRES_DB=volspike \
  -e POSTGRES_USER=volspike \
  -e POSTGRES_PASSWORD=volspike_password \
  -p 5432:5432 \
  timescale/timescaledb:latest-pg15

# Redis
docker run -d --name volspike-redis \
  -p 6379:6379 \
  redis:7-alpine
```

### 2. Setup Backend

```bash
cd volspike-nodejs-backend

# Install dependencies
npm install

# Copy and configure environment
cp env.example .env
# Edit .env with your database credentials

# Setup database
npx prisma generate
npx prisma db push

# Start backend server
npm run dev
```

Backend should be running at: `http://localhost:3001`

### 3. Setup Frontend

```bash
cd volspike-nextjs-frontend

# Install dependencies
npm install

# Copy and configure environment
cp env.example .env.local
# Edit .env.local with your configuration

# Start frontend server
npm run dev
```

Frontend should be running at: `http://localhost:3000`

### 4. Test Credentials

#### Email/Password Login
- **Email**: `test@volspike.com`
- **Password**: `password`

OR

- **Email**: `test-free@example.com`
- **Password**: `password123`

#### Wallet Connection
- Connect with MetaMask, WalletConnect, or any supported wallet

## Testing the Login Flow

### Expected Behavior

1. **Visit**: `http://localhost:3000`
2. **See**: Login page with email/password form and wallet connection button
3. **Enter credentials**: 
   - Email: `test@volspike.com` or `test-free@example.com`
   - Password: `password` or `password123`
4. **Click**: "🚀 Sign In" button
5. **Expected**: Redirected to dashboard showing market data

### Troubleshooting

#### Issue: Login doesn't redirect to dashboard

**Fix**: Check that:
1. NextAuth API route is working: `http://localhost:3000/api/auth/session`
2. Check browser console for errors
3. Check terminal output for server errors

#### Issue: "Invalid email or password" error

**Fix**: 
- Verify you're using the correct credentials (see above)
- Check browser console for authentication errors
- Check backend logs for errors

#### Issue: Database connection errors

**Fix**:
```bash
# Verify PostgreSQL is running
docker ps | grep postgres

# Check database connection
cd volspike-nodejs-backend
npx prisma db push
```

#### Issue: Redis connection errors

**Fix**:
```bash
# Verify Redis is running
docker ps | grep redis

# Test Redis connection
redis-cli ping
# Should return: PONG
```

## Testing Dashboard Features

After successful login, you should see:

1. **Market Data Table**: Real-time Binance perpetual futures data
2. **Volume Spike Alerts**: Notifications for unusual volume
3. **User Profile**: Your tier (Free/Pro/Elite) and settings
4. **Real-time Updates**: WebSocket connection for live data

## Environment Variables

### Frontend (.env.local)

```bash
# NextAuth
NEXTAUTH_URL=http://localhost:3000
AUTH_SECRET=your-secret-key-generate-with-openssl-rand-hex-32

# API
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_WS_URL=ws://localhost:3001

# Web3
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your-walletconnect-project-id
```

### Backend (.env)

```bash
# Database
DATABASE_URL=postgresql://volspike:volspike_password@localhost:5432/volspike

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-jwt-secret

# API
PORT=3001
NODE_ENV=development

# Frontend URL
FRONTEND_URL=http://localhost:3000
```

## Generate AUTH_SECRET

```bash
openssl rand -hex 32
```

Copy the output and add it to `.env.local` as `AUTH_SECRET`.

## Testing Workflow

### Complete Test Flow

1. **Start Services**
   ```bash
   # Terminal 1: Backend
   cd volspike-nodejs-backend && npm run dev
   
   # Terminal 2: Frontend
   cd volspike-nextjs-frontend && npm run dev
   
   # Terminal 3: Database/Redis (if not using docker-compose)
   docker-compose up
   ```

2. **Open Browser**: `http://localhost:3000`

3. **Login**: Use credentials above

4. **Verify Dashboard**: Should see market data

5. **Test Real-time**: Watch for WebSocket updates (check network tab)

6. **Test Tier Features**: Different tiers have different refresh intervals

## Common Issues

### Issue: "Internal Server Error" on login

**Solution**:
- Check `.env.local` has proper `AUTH_SECRET`
- Restart frontend server: `npm run dev`
- Clear browser cookies and try again

### Issue: Dashboard shows "Loading..." forever

**Solution**:
- Check backend is running: `curl http://localhost:3001/health`
- Check WebSocket connection in browser console
- Verify Redis is running

### Issue: "Module not found" errors

**Solution**:
```bash
# Reinstall dependencies
cd volspike-nextjs-frontend
rm -rf node_modules package-lock.json
npm install
```

## Next Steps

After successful local testing:

1. Test different user tiers (Free/Pro/Elite)
2. Test wallet connection flow
3. Test real-time data updates
4. Test alerts and notifications
5. Test payment integration (requires Stripe test keys)

## Need Help?

- Check logs: Both frontend and backend terminals will show errors
- Browser console: Check for client-side errors
- Network tab: Check API calls and responses
- Database: Use Prisma Studio to inspect data: `npx prisma studio`

## Production Deployment

For production deployment, see:
- `README_NEW_STACK.md` for architecture details
- `AGENTS.md` for project overview
- `docker-compose.yml` for production setup
