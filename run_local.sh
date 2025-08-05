#!/bin/bash

# HTML5 RDP - Local Development Setup Script
# This script sets up and runs the HTML5 RDP application locally

set -e  # Exit on any error

echo "🚀 HTML5 RDP - Setting up local development environment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Node.js is installed
check_node() {
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js 18+ first."
        exit 1
    fi
    
    NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        print_error "Node.js version 18+ is required. Current version: $(node --version)"
        exit 1
    fi
    
    print_success "Node.js version: $(node --version)"
}

# Check if npm is installed
check_npm() {
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed. Please install npm first."
        exit 1
    fi
    
    print_success "npm version: $(npm --version)"
}

# Install dependencies for a component
install_deps() {
    local component=$1
    local component_path=$2
    
    print_status "Installing dependencies for $component..."
    
    if [ ! -d "$component_path" ]; then
        print_error "Directory $component_path does not exist"
        exit 1
    fi
    
    cd "$component_path"
    
    if [ -f "package.json" ]; then
        npm install
        print_success "Dependencies installed for $component"
    else
        print_warning "No package.json found in $component_path"
    fi
    
    cd - > /dev/null
}

# Build a component
build_component() {
    local component=$1
    local component_path=$2
    
    print_status "Building $component..."
    
    cd "$component_path"
    
    if [ -f "package.json" ]; then
        if npm run build &> /dev/null; then
            print_success "$component built successfully"
        else
            print_error "Failed to build $component"
            exit 1
        fi
    else
        print_warning "No package.json found in $component_path"
    fi
    
    cd - > /dev/null
}

# Start backend server
start_backend() {
    print_status "Starting backend server on port 4000..."
    
    cd backend
    
    # Start backend in background
    npm run dev &
    BACKEND_PID=$!
    
    # Wait a moment for server to start
    sleep 3
    
    # Check if backend is running
    if curl -s http://localhost:4000/health > /dev/null; then
        print_success "Backend server started successfully on port 4000"
    else
        print_error "Failed to start backend server"
        exit 1
    fi
    
    cd - > /dev/null
}

# Start frontend server
start_frontend() {
    print_status "Starting frontend server on port 3000..."
    
    cd frontend
    
    # Start frontend in background
    npm run dev &
    FRONTEND_PID=$!
    
    # Wait a moment for server to start
    sleep 5
    
    # Check if frontend is running
    if curl -s http://localhost:3000 > /dev/null; then
        print_success "Frontend server started successfully on port 3000"
    else
        print_error "Failed to start frontend server"
        exit 1
    fi
    
    cd - > /dev/null
}

# Open browser
open_browser() {
    print_status "Opening browser to HTML5 RDP..."
    
    # Detect OS and open browser
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        open http://localhost:3000
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux
        if command -v xdg-open &> /dev/null; then
            xdg-open http://localhost:3000
        elif command -v gnome-open &> /dev/null; then
            gnome-open http://localhost:3000
        else
            print_warning "Could not automatically open browser. Please navigate to http://localhost:3000"
        fi
    elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]]; then
        # Windows
        start http://localhost:3000
    else
        print_warning "Could not automatically open browser. Please navigate to http://localhost:3000"
    fi
}

# Cleanup function
cleanup() {
    print_status "Shutting down servers..."
    
    if [ ! -z "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null || true
        print_success "Backend server stopped"
    fi
    
    if [ ! -z "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID 2>/dev/null || true
        print_success "Frontend server stopped"
    fi
    
    print_success "Cleanup complete"
}

# Set up signal handlers
trap cleanup EXIT
trap cleanup SIGINT
trap cleanup SIGTERM

# Main execution
main() {
    print_status "Starting HTML5 RDP setup..."
    
    # Check prerequisites
    check_node
    check_npm
    
    # Install dependencies
    install_deps "backend" "backend"
    install_deps "frontend" "frontend"
    
    # Build components
    build_component "backend" "backend"
    build_component "frontend" "frontend"
    
    # Start servers
    start_backend
    start_frontend
    
    # Open browser
    open_browser
    
    print_success "HTML5 RDP is now running!"
    print_status "Frontend: http://localhost:3000"
    print_status "Backend: http://localhost:4000"
    print_status "Press Ctrl+C to stop all servers"
    
    # Wait for user to stop
    wait
}

# Run main function
main "$@" 