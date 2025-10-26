#!/bin/bash

# VolSpike Startup Script
# This script starts all required services for local development

set -e

echo "🚀 Starting VolSpike Development Environment..."
echo ""

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Docker is not running. Please start Docker Desktop.${NC}"
    exit 1
fi

# Start Docker services
echo -e "${BLUE}📦 Starting Docker containers (PostgreSQL & Redis)...${NC}"
docker-compose up -d

# Wait for database to be ready
echo -e "${BLUE}⏳ Waiting for database to be ready...${NC}"
sleep 3

# Check if backend is already running
if lsof -Pi :3001 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Backend is already running on port 3001${NC}"
else
    echo -e "${BLUE}🔧 Starting Backend...${NC}"
    cd volspike-nodejs-backend
    npm run dev > ../backend.log 2>&1 &
    BACKEND_PID=$!
    echo $BACKEND_PID > ../backend.pid
    cd ..
    sleep 2
fi

# Check if frontend is already running
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Frontend is already running on port 3000${NC}"
else
    echo -e "${BLUE}🎨 Starting Frontend...${NC}"
    cd volspike-nextjs-frontend
    npm run dev > ../frontend.log 2>&1 &
    FRONTEND_PID=$!
    echo $FRONTEND_PID > ../frontend.pid
    cd ..
    sleep 3
fi

echo ""
echo -e "${GREEN}✅ All services are starting!${NC}"
echo ""
echo "📊 Service Status:"
echo "  • PostgreSQL: http://localhost:5432"
echo "  • Redis: http://localhost:6379"
echo "  • Backend API: http://localhost:3001"
echo "  • Frontend: http://localhost:3000"
echo ""
echo "🔑 Test Credentials:"
echo "  Email: test-free@example.com"
echo "  Password: password123"
echo ""
echo "📝 Logs:"
echo "  Backend: tail -f backend.log"
echo "  Frontend: tail -f frontend.log"
echo ""
echo "🛑 To stop all services: ./stop-all.sh"
echo ""
echo "🌐 Open http://localhost:3000 in your browser"
echo ""
