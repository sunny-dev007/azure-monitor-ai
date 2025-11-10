#!/bin/bash

# Backend Restart Script
# Run this after switching environments

echo "🔄 Restarting Backend Server for New Environment"
echo "================================================"
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_status() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if .env exists
if [ ! -f ".env" ]; then
    print_error ".env file not found!"
    exit 1
fi

# Show current environment
print_status "Current .env configuration:"
echo ""
grep "AZURE_TENANT_ID=" .env
grep "AZURE_CLIENT_ID=" .env
grep "AZURE_SUBSCRIPTION_ID=" .env
echo ""

# Find and kill existing backend process
print_status "Stopping existing backend server..."
pkill -f "node.*server.js" 2>/dev/null && print_success "Backend stopped" || print_warning "No backend process found"

# Wait a moment
sleep 2

# Start backend
print_status "Starting backend server with new environment..."
echo ""

# Start in background
node server.js > /tmp/backend-restart.log 2>&1 &
BACKEND_PID=$!

echo "Backend starting with PID: $BACKEND_PID"
sleep 3

# Check if it started
if kill -0 $BACKEND_PID 2>/dev/null; then
    print_success "Backend server started successfully!"
    echo ""
    print_status "Server running on http://localhost:5000"
    echo ""
    
    # Test health endpoint
    print_status "Testing health endpoint..."
    sleep 2
    curl -s http://localhost:5000/api/health | head -5
    echo ""
    echo ""
    
    print_success "✅ Backend restart complete!"
    echo ""
    print_status "Next steps:"
    echo "  1. Wait 30 seconds for full initialization"
    echo "  2. Refresh your browser at http://localhost:3000"
    echo "  3. Go to Dashboard to verify new environment"
    echo ""
    print_status "To view backend logs:"
    echo "  tail -f /tmp/backend-restart.log"
    echo ""
else
    print_error "Backend failed to start!"
    echo ""
    print_status "Check logs:"
    echo "  tail -20 /tmp/backend-restart.log"
    exit 1
fi

