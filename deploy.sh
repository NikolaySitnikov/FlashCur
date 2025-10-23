#!/bin/bash
# VolSpike Deployment Script

echo "🚀 Starting VolSpike deployment..."

# Install dependencies
echo "📦 Installing dependencies..."
pip install -r requirements.production.txt

# Set environment
echo "🔧 Setting up environment..."
export FLASK_ENV=production

# Run database migrations
echo "🗄️ Running database migrations..."
python migrate_db_step1.py
python migrate_payments_db.py
python migrate_settings_db.py

# Start the application
echo "🌟 Starting VolSpike..."
gunicorn --bind 0.0.0.0:$PORT --workers 4 --timeout 120 app:app

echo "✅ VolSpike deployment complete!"
