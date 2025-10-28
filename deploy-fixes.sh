#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== VolSpike Admin Routes Fix Deployment ===${NC}"
echo ""

# Backend directory path
BACKEND_DIR="/Users/nikolaysitnikov/Documents/Documents_Nik_MacBook/Everyday Life/AI/VolumeFunding/VolSpike/volspike-nodejs-backend"

# Check if backend directory exists
if [ ! -d "$BACKEND_DIR" ]; then
    echo -e "${RED}Error: Backend directory not found at:${NC}"
    echo "$BACKEND_DIR"
    exit 1
fi

echo -e "${YELLOW}Backing up existing files...${NC}"

# Create backup directory
BACKUP_DIR="$BACKEND_DIR/backup_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

# Backup existing files
cp -r "$BACKEND_DIR/src/routes/admin" "$BACKUP_DIR/admin_routes_backup" 2>/dev/null || true
cp "$BACKEND_DIR/src/middleware/admin-auth.ts" "$BACKUP_DIR/admin-auth.ts.backup" 2>/dev/null || true

echo -e "${GREEN}Backup created at: $BACKUP_DIR${NC}"
echo ""

echo -e "${YELLOW}Deploying fixed files...${NC}"

# Copy fixed admin routes
echo "Copying admin routes index..."
cp /home/claude/fixed-admin-index.ts "$BACKEND_DIR/src/routes/admin/index.ts"

echo "Copying admin users routes..."
cp /home/claude/fixed-users.ts "$BACKEND_DIR/src/routes/admin/users.ts"

echo "Copying admin subscriptions routes..."
cp /home/claude/fixed-subscriptions.ts "$BACKEND_DIR/src/routes/admin/subscriptions.ts"

echo "Copying admin audit routes..."
cp /home/claude/fixed-audit.ts "$BACKEND_DIR/src/routes/admin/audit.ts"

echo "Copying admin metrics routes..."
cp /home/claude/fixed-metrics.ts "$BACKEND_DIR/src/routes/admin/metrics.ts"

echo "Copying admin settings routes..."
cp /home/claude/fixed-settings.ts "$BACKEND_DIR/src/routes/admin/settings.ts"

echo "Copying admin auth middleware..."
cp /home/claude/fixed-admin-auth.ts "$BACKEND_DIR/src/middleware/admin-auth.ts"

echo ""
echo -e "${GREEN}=== Deployment Complete! ===${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Navigate to the backend directory:"
echo "   cd \"$BACKEND_DIR\""
echo ""
echo "2. Restart the backend server:"
echo "   npm run dev"
echo ""
echo "3. Test the admin endpoints:"
echo "   - Health check: curl http://localhost:3001/api/admin/health"
echo "   - Login as admin and get JWT token"
echo "   - Test users endpoint: curl -H \"Authorization: Bearer [TOKEN]\" http://localhost:3001/api/admin/users"
echo ""
echo -e "${GREEN}The admin routes should now be working!${NC}"
echo ""
echo -e "${YELLOW}Note: Some features are simplified placeholders:${NC}"
echo "- Stripe integration (subscriptions, payments)"
echo "- 2FA implementation"
echo "- Password reset emails"
echo "- Advanced audit logging"
echo ""
echo "These can be implemented gradually as needed."
