#!/bin/bash

# Render Build Script for ER-EMR Backend
# This script installs dependencies including emergentintegrations

set -e  # Exit on error

echo "🚀 Starting Render build for ER-EMR Backend..."

# Upgrade pip
echo "📦 Upgrading pip..."
pip install --upgrade pip

# Install emergentintegrations from custom index FIRST
echo "🔧 Installing emergentintegrations..."
pip install emergentintegrations --extra-index-url https://d33sy5i8bnduwe.cloudfront.net/simple/

# Install all other requirements (use requirements-render.txt if exists, otherwise requirements.txt)
if [ -f "requirements-render.txt" ]; then
    echo "📚 Installing requirements from requirements-render.txt..."
    pip install -r requirements-render.txt
else
    echo "📚 Installing requirements from requirements.txt..."
    pip install -r requirements.txt
fi

echo "✅ Build completed successfully!"
echo "📋 Installed packages:"
pip list | grep -E "emergentintegrations|fastapi|motor|openai"
