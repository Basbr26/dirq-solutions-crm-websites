#!/bin/bash
# Netlify Build Script - Force Clean Build
# This ensures no old cached dependencies interfere

set -e  # Exit on any error

echo "🧹 Cleaning all caches and build artifacts..."
rm -rf node_modules
rm -rf .vite
rm -rf dist
rm -rf .netlify/cache

echo "📦 Installing dependencies from lockfile..."
npm ci

echo "🏗️ Building application..."
NODE_OPTIONS='--max-old-space-size=4096' npm run build

echo "✅ Build complete!"
