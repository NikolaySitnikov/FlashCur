#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# Step 1: Pro Tier Prep - Installation Script
# ═══════════════════════════════════════════════════════════════

echo "🚀 Installing Pro Tier dependencies..."
echo ""

# Install Python packages
echo "📦 Installing Python packages from requirements.txt..."
pip install -r requirements.txt

if [ $? -ne 0 ]; then
    echo "❌ Failed to install packages!"
    exit 1
fi

echo ""
echo "✅ All packages installed successfully!"
echo ""

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp env.example .env
    echo "✅ .env file created (edit with your API keys when ready)"
else
    echo "ℹ️  .env file already exists (skipping)"
fi

echo ""
echo "📁 Creating instance directory for database..."
mkdir -p instance
echo "✅ Instance directory created"

echo ""
echo "🔄 Running database migration..."
python migrate_db_step1.py

if [ $? -ne 0 ]; then
    echo "❌ Migration failed!"
    exit 1
fi

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "✅ Step 1 installation complete!"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "Next steps:"
echo "  1. Review env.example and update .env with real keys (optional for dev)"
echo "  2. Run: python app.py"
echo "  3. Follow testing instructions in STEP1_PRO_TIER_PREP.md"
echo ""

