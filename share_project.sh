#!/bin/bash

echo "🌐 Starting VolumeFunding FlashCur with ngrok tunnel..."
echo "================================================"
echo ""
echo "This will allow anyone to access your project via a public URL"
echo ""

# Check if ngrok is installed
if ! command -v ngrok &> /dev/null; then
    echo "❌ ngrok is not installed!"
    echo ""
    echo "📥 To install ngrok:"
    echo "   1. Visit: https://ngrok.com/download"
    echo "   2. Or install via Homebrew: brew install ngrok/ngrok/ngrok"
    echo "   3. Sign up for free at: https://dashboard.ngrok.com/signup"
    echo "   4. Run: ngrok config add-authtoken YOUR_TOKEN"
    echo ""
    exit 1
fi

echo "✅ ngrok found!"
echo ""

# Check if port 8081 is already in use
if lsof -Pi :8081 -sTCP:LISTEN -t >/dev/null ; then
    echo "⚠️  Port 8081 is already in use. Stopping existing process..."
    lsof -ti:8081 | xargs kill -9 2>/dev/null
    sleep 2
    echo "✅ Port 8081 freed!"
fi

echo ""
echo "🚀 Starting Flask app on port 8081..."
echo ""

# Start Flask app in background
cd "$(dirname "$0")"
python3 app.py &
FLASK_PID=$!

# Wait for Flask to start
echo "⏳ Waiting for Flask to start..."
sleep 5

# Check if Flask is running
if ! ps -p $FLASK_PID > /dev/null; then
    echo "❌ Flask failed to start!"
    exit 1
fi

echo "✅ Flask is running (PID: $FLASK_PID)"
echo ""

# Check if ngrok is already running
if pgrep -x "ngrok" > /dev/null; then
    echo "⚠️  Existing ngrok session found. Stopping it..."
    pkill -9 ngrok
    sleep 2
    echo "✅ Old ngrok session closed!"
    echo ""
fi

echo "🌍 Starting ngrok tunnel..."
echo ""

# Start ngrok
ngrok http 8081

# Cleanup on exit
echo ""
echo "🛑 Shutting down..."
kill $FLASK_PID 2>/dev/null
echo "✅ Cleanup complete"

