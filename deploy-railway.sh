#!/bin/bash

# VolSpike Railway Deployment Script
# Run this after enabling Static Outbound IP

echo "🚀 VolSpike Railway Deployment Script"
echo "====================================="

# Check if railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI not found. Install with: npm install -g @railway/cli"
    exit 1
fi

echo "📋 Pre-deployment checklist:"
echo "1. ✅ Static Outbound IP enabled for VolSpike-backend"
echo "2. ✅ Static Outbound IP enabled for VolSpike-ingestion"
echo "3. ✅ Redis token regenerated in Upstash"
echo "4. ✅ Environment variables updated"
echo ""
read -p "Press Enter to continue with deployment..."

echo ""
echo "🔄 Redeploying services..."

# Redeploy backend
echo "Deploying VolSpike-backend..."
railway redeploy -s VolSpike-backend

if [ $? -eq 0 ]; then
    echo "✅ VolSpike-backend deployed successfully"
else
    echo "❌ VolSpike-backend deployment failed"
    exit 1
fi

# Redeploy ingestion service
echo "Deploying VolSpike-ingestion..."
railway redeploy -s VolSpike-ingestion

if [ $? -eq 0 ]; then
    echo "✅ VolSpike-ingestion deployed successfully"
else
    echo "❌ VolSpike-ingestion deployment failed"
    exit 1
fi

echo ""
echo "⏳ Waiting for services to start..."
sleep 30

echo ""
echo "🧪 Testing connectivity..."

# Test Binance HTTP connectivity
echo "Testing Binance HTTP connectivity..."
railway run -s VolSpike-ingestion -- node -e "
require('axios').get('https://fapi.binance.com/fapi/v1/ticker/24hr')
  .then(() => console.log('✅ Binance HTTP: OK'))
  .catch(e => console.error('❌ Binance HTTP:', e.code || e.message))
"

# Test health endpoint
echo "Testing health endpoint..."
HEALTH_RESPONSE=$(railway run -s VolSpike-backend -- curl -s https://volspike-backend-production.up.railway.app/api/market/health 2>/dev/null)

if echo "$HEALTH_RESPONSE" | grep -q '"status":"ok"'; then
    echo "✅ Health endpoint: OK"
else
    echo "❌ Health endpoint: Failed"
    echo "Response: $HEALTH_RESPONSE"
fi

# Test market data endpoint
echo "Testing market data endpoint..."
MARKET_RESPONSE=$(railway run -s VolSpike-backend -- curl -s https://volspike-backend-production.up.railway.app/api/market/data 2>/dev/null)

if echo "$MARKET_RESPONSE" | grep -q '"data"'; then
    echo "✅ Market data endpoint: OK"
else
    echo "❌ Market data endpoint: Failed"
    echo "Response: $MARKET_RESPONSE"
fi

echo ""
echo "📊 Monitoring logs (Ctrl+C to stop)..."
echo "Backend logs:"
railway logs -s VolSpike-backend -f &
BACKEND_PID=$!

echo "Ingestion logs:"
railway logs -s VolSpike-ingestion -f &
INGESTION_PID=$!

# Wait for user to stop
wait

# Cleanup
kill $BACKEND_PID $INGESTION_PID 2>/dev/null

echo ""
echo "🎉 Deployment complete!"
echo ""
echo "Next steps:"
echo "1. Visit https://volspike.com to test the frontend"
echo "2. Check browser console for WebSocket connections"
echo "3. Monitor Railway logs for any issues"
echo "4. Test tier functionality (Free/Pro/Elite)"
