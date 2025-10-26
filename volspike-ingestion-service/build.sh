#!/bin/bash
# Railway build script for ingestion service
echo "🚀 Starting Railway build for VolSpike Ingestion Service"

# Check if dist folder exists
if [ -d "dist" ]; then
    echo "✅ dist/ folder found - using pre-compiled code"
    ls -la dist/
else
    echo "❌ dist/ folder not found - compiling TypeScript"
    npm run build
fi

echo "🎯 Build complete - ready for deployment"
