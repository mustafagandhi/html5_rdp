#!/bin/bash

# Real Remote Desktop Agent Build Script
# Version: 1.0.0

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PRODUCT_NAME="Real Remote Desktop Agent"
PRODUCT_VERSION="1.0.0"
BUILD_DIR="target"
RELEASE_DIR="release"

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

# Function to check dependencies
check_dependencies() {
    print_status "Checking dependencies..."
    
    # Check if Rust is installed
    if ! command -v cargo &> /dev/null; then
        print_error "Rust is not installed. Please install Rust from https://rustup.rs/"
        exit 1
    fi
    
    # Check if target platforms are available
    if ! rustup target list | grep -q "x86_64-pc-windows-msvc"; then
        print_warning "Windows target not available. Installing..."
        rustup target add x86_64-pc-windows-msvc
    fi
    
}

# Function to clean build directory
clean_build() {
    print_status "Cleaning build directory..."
    rm -rf $BUILD_DIR
    rm -rf $RELEASE_DIR
    cargo clean
}

# Function to build for specific target
build_target() {
    local target=$1
    local platform=$2
    
    print_status "Building for $platform..."
    
    # Set environment variables for cross-compilation
    case $target in
        "x86_64-pc-windows-msvc")
            export CC_x86_64_pc_windows_msvc=x86_64-w64-mingw32-gcc
            ;;
    esac
    
    # Build with release profile
    cargo build --release --target $target
    
    # Create release directory
    mkdir -p $RELEASE_DIR/$platform
    
    # Copy binary
    cp $BUILD_DIR/$target/release/real-remote-desktop-agent $RELEASE_DIR/$platform/
    
    # Copy configuration files
    cp config.toml $RELEASE_DIR/$platform/
    cp README.md $RELEASE_DIR/$platform/
    cp LICENSE $RELEASE_DIR/$platform/
    
    print_success "Built for $platform"
}

# Function to build all targets
build_all() {
    print_status "Building for all platforms..."

    # Build for Windows
    build_target "x86_64-pc-windows-msvc" "windows-x86_64"

}

# Function to create installers
create_installers() {
    print_status "Creating installers..."
    
    # Create Windows installer
    if command -v makensis &> /dev/null; then
        print_status "Creating Windows installer..."
        cp -r $RELEASE_DIR/windows-x86_64/* installer/windows/
        cd installer/windows
        makensis installer.nsi
        cd ../..
        mv installer/windows/real-remote-desktop-agent-setup.exe $RELEASE_DIR/
    else
        print_warning "NSIS not found. Skipping Windows installer creation."
    fi
}

# Function to run tests
run_tests() {
    print_status "Running tests..."
    cargo test --release
    print_success "Tests completed"
}

# Function to run linting
run_lint() {
    print_status "Running linting..."
    cargo clippy --release -- -D warnings
    print_success "Linting completed"
}

# Function to check security
run_audit() {
    print_status "Running security audit..."
    cargo audit
    print_success "Security audit completed"
}

# Function to create checksums
create_checksums() {
    print_status "Creating checksums..."
    cd $RELEASE_DIR
    
    # Create SHA256 checksums
    find . -type f -name "real-remote-desktop-agent*" -exec sha256sum {} \; > checksums.sha256
    
    # Create MD5 checksums
    find . -type f -name "real-remote-desktop-agent*" -exec md5sum {} \; > checksums.md5
    
    cd ..
    print_success "Checksums created"
}

# Function to display build info
display_info() {
    print_success "Build completed successfully!"
    echo
    echo "Build Information:"
    echo "  Product: $PRODUCT_NAME $PRODUCT_VERSION"
    echo "  Build Directory: $BUILD_DIR"
    echo "  Release Directory: $RELEASE_DIR"
    echo
    echo "Available Platforms:"
    for platform in linux-x86_64 windows-x86_64 macos-x86_64; do
        if [ -d "$RELEASE_DIR/$platform" ]; then
            echo "  - $platform"
        fi
    done
    echo
    echo "Installers:"
    if [ -f "$RELEASE_DIR/real-remote-desktop-agent-linux-x86_64.run" ]; then
        echo "  - Linux: $RELEASE_DIR/real-remote-desktop-agent-linux-x86_64.run"
    fi
    if [ -f "$RELEASE_DIR/real-remote-desktop-agent-setup.exe" ]; then
        echo "  - Windows: $RELEASE_DIR/real-remote-desktop-agent-setup.exe"
    fi
    echo
}

# Function to show help
show_help() {
    echo "Real Remote Desktop Agent Build Script"
    echo "Usage: $0 [OPTION]"
    echo
    echo "Options:"
    echo "  clean       Clean build directory"
    echo "  test        Run tests"
    echo "  lint        Run linting"
    echo "  audit       Run security audit"
    echo "  linux       Build for Linux only"
    echo "  windows     Build for Windows only"
    echo "  macos       Build for macOS only"
    echo "  all         Build for all platforms (default)"
    echo "  installers  Create installers"
    echo "  checksums   Create checksums"
    echo "  help        Show this help message"
    echo
}

# Main function
main() {
    case "${1:-all}" in
        "clean")
            clean_build
            ;;
        "test")
            run_tests
            ;;
        "lint")
            run_lint
            ;;
        "audit")
            run_audit
            ;;
        "linux")
            check_dependencies
            build_target "x86_64-unknown-linux-gnu" "linux-x86_64"
            ;;
        "windows")
            check_dependencies
            build_target "x86_64-pc-windows-msvc" "windows-x86_64"
            ;;
        "macos")
            check_dependencies
            build_target "x86_64-apple-darwin" "macos-x86_64"
            ;;
        "all")
            check_dependencies
            clean_build
            run_lint
            run_tests
            build_all
            create_installers
            create_checksums
            display_info
            ;;
        "installers")
            create_installers
            ;;
        "checksums")
            create_checksums
            ;;
        "help"|"-h"|"--help")
            show_help
            ;;
        *)
            print_error "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
}

# Run main function
main "$@" 