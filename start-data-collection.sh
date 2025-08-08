#!/bin/bash
# Start TraderAI Data Collection Service

echo "🚀 Starting TraderAI Data Collection..."

# Check if backend is running
if ! curl -s http://localhost:3000/api/health > /dev/null; then
    echo "❌ Backend is not running. Please start it first."
    exit 1
fi

# Start the data collection service
echo "📊 Starting continuous data collection..."
npx ts-node src/scripts/start-data-collection.ts

# This script will run continuously
# Press Ctrl+C to stop