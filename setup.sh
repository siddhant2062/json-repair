#!/bin/bash

# JSON Repair - Automated Setup Script
# This script automates the setup process for first-time users

set -e  # Exit on error

echo "=========================================="
echo "  JSON Repair - Automated Setup"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to print colored output
print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_info() {
    echo -e "ℹ $1"
}

# Check if Node.js is installed
echo "Step 1: Checking prerequisites..."
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed"
    echo "Please install Node.js (>=18.x) from https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node -v)
print_success "Node.js found: $NODE_VERSION"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    print_error "npm is not installed"
    exit 1
fi

NPM_VERSION=$(npm -v)
print_success "npm found: v$NPM_VERSION"

echo ""

# Clean existing installation if present
if [ -d "node_modules" ]; then
    print_warning "Existing node_modules found. Cleaning up..."
    rm -rf node_modules
    print_success "Cleaned node_modules"
fi

if [ -d ".next" ]; then
    rm -rf .next
    print_success "Cleaned .next build directory"
fi

echo ""

# Install dependencies
echo "Step 2: Installing dependencies..."
print_info "This may take a few minutes..."
npm install

if [ $? -eq 0 ]; then
    print_success "Dependencies installed successfully"
else
    print_error "Failed to install dependencies"
    exit 1
fi

echo ""

# macOS-specific fixes
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "Step 3: Applying macOS-specific fixes..."
    
    # Remove quarantine attributes
    print_info "Removing macOS quarantine attributes..."
    xattr -r -d com.apple.quarantine node_modules 2>/dev/null || true
    print_success "Quarantine attributes removed"
    
    # Set file descriptor limit
    print_info "Setting file descriptor limit..."
    ulimit -n 10240
    print_success "File descriptor limit set to 10240"
    
    echo ""
    print_success "macOS-specific optimizations applied"
else
    echo "Step 3: Skipping macOS-specific fixes (not needed on this OS)"
fi

echo ""
echo "=========================================="
print_success "Setup completed successfully!"
echo "=========================================="
echo ""
echo "To start the development server, run:"
echo ""

if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "  ./start-dev.sh    (Recommended - Handles all macOS fixes automatically)"
    echo "  npm run dev       (Manual mode - may require ulimit/xattr fixes)"
else
    echo "  npm run dev"
fi

echo ""
echo "Then open your browser to: http://localhost:3002"
echo ""
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "💡 Tip: Always use './start-dev.sh' on macOS to avoid common issues!"
fi
echo ""
echo "For more information, see:"
echo "  - README.md - Quick start guide"
echo "  - RCA.md - Technical details and troubleshooting"
echo "  - INSTALLATION.md - Detailed installation guide"
echo ""

