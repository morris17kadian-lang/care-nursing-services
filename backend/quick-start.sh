#!/bin/bash

# 876 Nurses Email Service - Quick Setup Script
# This script helps you set up the Gmail API backend quickly

echo ""
echo "🏥 876 Nurses Email Service Setup"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check if in backend directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the backend directory"
    echo "   cd backend && ./quick-start.sh"
    exit 1
fi

# Step 1: Install dependencies
echo "📦 Step 1: Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo "✅ Dependencies installed"
echo ""

# Step 2: Setup .env file
echo "🔐 Step 2: Setting up environment file..."

if [ -f ".env" ]; then
    echo "⚠️  .env file already exists. Backup created as .env.backup"
    cp .env .env.backup
fi

cp .env.example .env
echo "✅ .env file created"
echo ""

# Step 3: Guide user through configuration
echo "📝 Step 3: Configuration"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "You need to configure the following in your .env file:"
echo ""
echo "1. Generate a secure API key:"
echo "   Suggested: $(openssl rand -base64 32)"
echo ""
echo "2. Get Gmail OAuth credentials from Google Cloud Console:"
echo "   https://console.cloud.google.com/"
echo ""
echo "   Follow these steps:"
echo "   a. Create a new project: '876 Nurses App'"
echo "   b. Enable Gmail API"
echo "   c. Configure OAuth consent screen"
echo "   d. Create OAuth 2.0 Client ID (Web application)"
echo "   e. Add redirect URI: http://localhost:3000/auth/google/callback"
echo "   f. Download credentials and copy Client ID & Secret"
echo ""
echo "3. After adding credentials to .env, run:"
echo "   npm run setup-oauth"
echo "   This will get your refresh token"
echo ""
echo "4. Add the refresh token to .env"
echo ""
echo "5. Test your setup:"
echo "   npm run test your-email@example.com"
echo ""
echo "6. Start the server:"
echo "   npm run dev"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Ask if user wants to open .env file
read -p "Open .env file now for editing? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    # Try to detect editor
    if command -v code &> /dev/null; then
        code .env
    elif command -v nano &> /dev/null; then
        nano .env
    elif command -v vim &> /dev/null; then
        vim .env
    else
        echo "Please edit .env file manually"
    fi
fi

echo ""
echo "📚 Need detailed instructions? Check README.md"
echo ""
echo "Next steps:"
echo "1. Edit .env with your credentials"
echo "2. Run: npm run setup-oauth"
echo "3. Run: npm run test your-email@example.com"
echo "4. Run: npm run dev"
echo ""
