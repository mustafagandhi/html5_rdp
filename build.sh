#!/bin/bash

# Real Remote Desktop Platform Build Script
# This script builds the complete platform including agent, web client, and installer

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
AGENT_DIR="agent"
WEB_CLIENT_DIR="web-client"
INSTALLER_DIR="installer/windows"
OUTPUT_DIR="dist"
VERSION="1.0.0"

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check for Rust
    if ! command -v cargo &> /dev/null; then
        log_error "Rust is not installed. Please install Rust from https://rustup.rs/"
        exit 1
    fi
    
    # Check for Node.js
    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed. Please install Node.js from https://nodejs.org/"
        exit 1
    fi
    
    # Check for npm
    if ! command -v npm &> /dev/null; then
        log_error "npm is not installed. Please install npm"
        exit 1
    fi
    
    # Check for NSIS (Windows only)
    if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" ]]; then
        if ! command -v makensis &> /dev/null; then
            log_warning "NSIS is not installed. Installer will not be built."
        fi
    fi
    
    log_success "Prerequisites check completed"
}

# Build the agent
build_agent() {
    log_info "Building Real Remote Desktop Agent..."
    
    cd "$AGENT_DIR"
    
    # Clean previous builds
    log_info "Cleaning previous builds..."
    cargo clean
    
    # Build in release mode
    log_info "Building agent in release mode..."
    cargo build --release
    
    if [ $? -eq 0 ]; then
        log_success "Agent built successfully"
        
        # Copy binary to output directory
        mkdir -p "../$OUTPUT_DIR"
        cp "target/release/real-remote-desktop-agent.exe" "../$OUTPUT_DIR/"
        cp "config.toml" "../$OUTPUT_DIR/"
        
        log_success "Agent binary copied to $OUTPUT_DIR/"
    else
        log_error "Agent build failed"
        exit 1
    fi
    
    cd ..
}

# Build the web client
build_web_client() {
    log_info "Building Real Remote Desktop Web Client..."
    
    cd "$WEB_CLIENT_DIR"
    
    # Install dependencies
    log_info "Installing web client dependencies..."
    npm install
    
    # Build for production
    log_info "Building web client for production..."
    npm run build
    
    if [ $? -eq 0 ]; then
        log_success "Web client built successfully"
        
        # Copy built files to output directory
        mkdir -p "../$OUTPUT_DIR/web-client"
        cp -r "../dist/"* "../$OUTPUT_DIR/web-client/"
        
        log_success "Web client files copied to $OUTPUT_DIR/web-client/"
    else
        log_error "Web client build failed"
        exit 1
    fi
    
    cd ..
}

# Build the installer (Windows only)
build_installer() {
    if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" ]]; then
        log_info "Building Windows installer..."
        
        cd "$INSTALLER_DIR"
        
        if command -v makensis &> /dev/null; then
            makensis installer.nsi
            
            if [ $? -eq 0 ]; then
                log_success "Installer built successfully"
                
                # Copy installer to output directory
                mkdir -p "../../$OUTPUT_DIR"
                cp "RealRemoteDesktopAgent-Setup.exe" "../../$OUTPUT_DIR/"
                
                log_success "Installer copied to $OUTPUT_DIR/"
            else
                log_error "Installer build failed"
                exit 1
            fi
        else
            log_warning "NSIS not found, skipping installer build"
        fi
        
        cd ../..
    else
        log_info "Skipping installer build (not on Windows)"
    fi
}

# Run tests
run_tests() {
    log_info "Running tests..."
    
    # Test agent
    log_info "Testing agent..."
    cd "$AGENT_DIR"
    cargo test
    cd ..
    
    # Test web client
    log_info "Testing web client..."
    cd "$WEB_CLIENT_DIR"
    npm test
    cd ..
    
    log_success "All tests passed"
}

# Create distribution package
create_package() {
    log_info "Creating distribution package..."
    
    # Create package directory
    PACKAGE_DIR="$OUTPUT_DIR/real-remote-desktop-$VERSION"
    mkdir -p "$PACKAGE_DIR"
    
    # Copy agent files
    cp "$OUTPUT_DIR/real-remote-desktop-agent.exe" "$PACKAGE_DIR/"
    cp "$OUTPUT_DIR/config.toml" "$PACKAGE_DIR/"
    
    # Copy web client files
    mkdir -p "$PACKAGE_DIR/web-client"
    cp -r "$OUTPUT_DIR/web-client/"* "$PACKAGE_DIR/web-client/"
    
    # Copy installer if available
    if [ -f "$OUTPUT_DIR/RealRemoteDesktopAgent-Setup.exe" ]; then
        cp "$OUTPUT_DIR/RealRemoteDesktopAgent-Setup.exe" "$PACKAGE_DIR/"
    fi
    
    # Copy documentation
    cp "README.md" "$PACKAGE_DIR/"
    cp "LICENSE" "$PACKAGE_DIR/"
    cp -r "docs/" "$PACKAGE_DIR/" 2>/dev/null || true
    
    # Create package
    if command -v tar &> /dev/null; then
        tar -czf "$OUTPUT_DIR/real-remote-desktop-$VERSION.tar.gz" -C "$OUTPUT_DIR" "real-remote-desktop-$VERSION"
        log_success "Created package: $OUTPUT_DIR/real-remote-desktop-$VERSION.tar.gz"
    fi
    
    if command -v zip &> /dev/null; then
        cd "$OUTPUT_DIR"
        zip -r "real-remote-desktop-$VERSION.zip" "real-remote-desktop-$VERSION"
        cd ..
        log_success "Created package: $OUTPUT_DIR/real-remote-desktop-$VERSION.zip"
    fi
    
    log_success "Distribution package created"
}

# Main build process
main() {
    log_info "Starting Real Remote Desktop Platform build..."
    log_info "Version: $VERSION"
    
    # Check prerequisites
    check_prerequisites
    
    # Create output directory
    mkdir -p "$OUTPUT_DIR"
    
    # Build components
    build_agent
    build_web_client
    build_installer
    
    # Run tests
    run_tests
    
    # Create distribution package
    create_package
    
    log_success "Build completed successfully!"
    log_info "Output directory: $OUTPUT_DIR"
    log_info "To run the agent: cd $OUTPUT_DIR && ./real-remote-desktop-agent.exe"
    log_info "To serve the web client: cd $OUTPUT_DIR/web-client && python -m http.server 3000"
}

# Handle command line arguments
case "${1:-}" in
    "agent")
        check_prerequisites
        build_agent
        ;;
    "web-client")
        check_prerequisites
        build_web_client
        ;;
    "installer")
        check_prerequisites
        build_installer
        ;;
    "test")
        run_tests
        ;;
    "clean")
        log_info "Cleaning build artifacts..."
        rm -rf "$OUTPUT_DIR"
        cd "$AGENT_DIR" && cargo clean && cd ..
        cd "$WEB_CLIENT_DIR" && rm -rf node_modules dist && cd ..
        log_success "Clean completed"
        ;;
    "help"|"-h"|"--help")
        echo "Real Remote Desktop Platform Build Script"
        echo ""
        echo "Usage: $0 [command]"
        echo ""
        echo "Commands:"
        echo "  (no args)  Build everything"
        echo "  agent      Build only the agent"
        echo "  web-client Build only the web client"
        echo "  installer  Build only the installer"
        echo "  test       Run tests"
        echo "  clean      Clean build artifacts"
        echo "  help       Show this help"
        ;;
    *)
        main
        ;;
esac 