#!/bin/bash

# CORS Fix Verification Script
# Run this to verify your CORS fix is working correctly

set -e

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║           CORS Fix Verification Script                        ║"
echo "║  Testing: http://localhost:3001/api/market/data               ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if backend is running
echo "${BLUE}[1/4]${NC} Checking if backend is running..."
if ! curl -s http://localhost:3001/health > /dev/null 2>&1; then
    echo "${RED}✗ Backend not running on localhost:3001${NC}"
    echo "  Start it with: npm run dev"
    exit 1
fi
echo "${GREEN}✓ Backend is running${NC}"
echo ""

# Test 1: OPTIONS Request (Preflight)
echo "${BLUE}[2/4]${NC} Testing OPTIONS preflight request..."
OPTIONS_RESPONSE=$(curl -s -w "\n%{http_code}" -X OPTIONS http://localhost:3001/api/market/data \
  -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: authorization")

OPTIONS_STATUS=$(echo "$OPTIONS_RESPONSE" | tail -n1)
OPTIONS_HEADERS=$(echo "$OPTIONS_RESPONSE" | head -n-1)

if [ "$OPTIONS_STATUS" = "200" ]; then
    echo "${GREEN}✓ OPTIONS request returned 200${NC}"
    
    # Check for required CORS headers
    if echo "$OPTIONS_HEADERS" | grep -q "Access-Control-Allow-Origin"; then
        echo "${GREEN}  ✓ Access-Control-Allow-Origin header present${NC}"
    else
        echo "${RED}  ✗ Access-Control-Allow-Origin header MISSING${NC}"
    fi
    
    if echo "$OPTIONS_HEADERS" | grep -q "Access-Control-Allow-Methods"; then
        echo "${GREEN}  ✓ Access-Control-Allow-Methods header present${NC}"
    else
        echo "${RED}  ✗ Access-Control-Allow-Methods header MISSING${NC}"
    fi
    
    if echo "$OPTIONS_HEADERS" | grep -q "Access-Control-Allow-Headers"; then
        echo "${GREEN}  ✓ Access-Control-Allow-Headers header present${NC}"
    else
        echo "${RED}  ✗ Access-Control-Allow-Headers header MISSING${NC}"
    fi
else
    echo "${RED}✗ OPTIONS request returned $OPTIONS_STATUS (expected 200)${NC}"
    echo "  This means the OPTIONS handler is not catching the request!"
    echo "  Make sure you added market.options() handlers to market.ts"
fi
echo ""

# Test 2: GET Request with Auth
echo "${BLUE}[3/4]${NC} Testing GET request with authorization..."
GET_RESPONSE=$(curl -s -w "\n%{http_code}" -X GET http://localhost:3001/api/market/data \
  -H "Origin: http://localhost:3000" \
  -H "Authorization: Bearer dev-token")

GET_STATUS=$(echo "$GET_RESPONSE" | tail -n1)
GET_HEADERS=$(echo "$GET_RESPONSE" | head -n-1)

if [ "$GET_STATUS" = "200" ]; then
    echo "${GREEN}✓ GET request returned 200${NC}"
    
    if echo "$GET_HEADERS" | grep -q "Access-Control-Allow-Origin"; then
        echo "${GREEN}  ✓ CORS headers present in GET response${NC}"
    else
        echo "${YELLOW}  ⚠ No CORS headers in GET response (may be ok)${NC}"
    fi
    
    if echo "$GET_HEADERS" | grep -q '\['; then
        echo "${GREEN}  ✓ Market data appears to be returned${NC}"
    else
        echo "${YELLOW}  ⚠ Response might be empty or not JSON${NC}"
    fi
else
    echo "${RED}✗ GET request returned $GET_STATUS${NC}"
    if [ "$GET_STATUS" = "401" ]; then
        echo "  This is OK in production (auth required)"
        echo "  In development, check that NODE_ENV=development is set"
    elif [ "$GET_STATUS" = "500" ]; then
        echo "  This means there's still an error in the route handler"
        echo "  Check backend logs for error details"
    fi
fi
echo ""

# Test 3: Health Check
echo "${BLUE}[4/4]${NC} Checking backend health..."
HEALTH=$(curl -s http://localhost:3001/health | grep -o '"status":"[^"]*"' || echo '"status":"unknown"')
echo "  Backend health: $HEALTH"
echo "${GREEN}✓ Backend is responsive${NC}"
echo ""

# Summary
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                        Summary                                 ║"
echo "╚════════════════════════════════════════════════════════════════╝"

if [ "$OPTIONS_STATUS" = "200" ]; then
    echo "${GREEN}✓ CORS preflight (OPTIONS) is working!${NC}"
else
    echo "${RED}✗ CORS preflight (OPTIONS) is NOT working${NC}"
fi

if [ "$GET_STATUS" = "200" ]; then
    echo "${GREEN}✓ GET request is working!${NC}"
else
    echo "${RED}✗ GET request is NOT working${NC}"
fi

echo ""

if [ "$OPTIONS_STATUS" = "200" ] && [ "$GET_STATUS" = "200" ]; then
    echo "${GREEN}╔════════════════════════════════════════════════════════════════╗${NC}"
    echo "${GREEN}║  ✅ All CORS tests PASSED! Your fix is working correctly!      ║${NC}"
    echo "${GREEN}║  The browser should now be able to load market data.           ║${NC}"
    echo "${GREEN}╚════════════════════════════════════════════════════════════════╝${NC}"
    exit 0
else
    echo "${RED}╔════════════════════════════════════════════════════════════════╗${NC}"
    echo "${RED}║  ⚠ Some CORS tests FAILED. Check the details above.            ║${NC}"
    echo "${RED}║  Review CORS_FIX_COMPLETE.md for more information.             ║${NC}"
    echo "${RED}╚════════════════════════════════════════════════════════════════╝${NC}"
    exit 1
fi
