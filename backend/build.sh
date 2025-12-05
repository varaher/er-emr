#!/bin/bash

# Render Build Script for ER-EMR Backend
# This script installs dependencies including emergentintegrations

set -e  # Exit on error

echo "🚀 Starting Render build for ER-EMR Backend..."

# Upgrade pip
echo "📦 Upgrading pip..."
pip install --upgrade pip

# Install emergentintegrations from custom index
echo "🔧 Installing emergentintegrations..."
pip install emergentintegrations --extra-index-url https://d33sy5i8bnduwe.cloudfront.net/simple/

# Install all other requirements
echo "📚 Installing requirements from requirements.txt..."
pip install -r requirements.txt

echo "✅ Build completed successfully!"
