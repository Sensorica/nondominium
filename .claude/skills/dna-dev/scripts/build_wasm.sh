#!/bin/bash

# build_wasm.sh - WASM compilation with error handling and optimization
# Usage: ./build_wasm.sh [release|debug] [zome_name]

set -e

BUILD_TYPE=${1:-release}
TARGET_ZOME=$2
PROJECT_ROOT=$(pwd)

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# Validate build type
if [ "$BUILD_TYPE" != "release" ] && [ "$BUILD_TYPE" != "debug" ]; then
    log_error "Invalid build type: $BUILD_TYPE"
    log_error "Valid types: release, debug"
    exit 1
fi

# Check if we're in a Holochain project
if [ ! -f "Cargo.toml" ] || [ ! -d "dnas" ]; then
    log_error "Not in a Holochain project directory"
    log_error "Please run this script from the nondominium project root"
    exit 1
fi

# Build function
build_zomes() {
    local build_flag=""
    if [ "$BUILD_TYPE" = "release" ]; then
        build_flag="--release"
        log_step "Building zomes in RELEASE mode with optimizations"
    else
        log_step "Building zomes in DEBUG mode"
    fi

    log_info "Starting WASM compilation for target wasm32-unknown-unknown"

    # Show compilation progress
    log_step "Compiling Rust code to WASM..."

    if [ -n "$TARGET_ZOME" ]; then
        log_info "Building specific zome: $TARGET_ZOME"
        cargo build $build_flag --target wasm32-unknown-unknown -p "zome_$TARGET_ZOME"
    else
        log_info "Building all zomes"
        cargo build $build_flag --target wasm32-unknown-unknown
    fi

    log_info "✅ WASM compilation completed successfully!"

    # Show compiled files
    if [ "$BUILD_TYPE" = "release" ]; then
        WASM_DIR="target/wasm32-unknown-unknown/release"
    else
        WASM_DIR="target/wasm32-unknown-unknown/debug"
    fi

    log_step "Generated WASM files:"
    find "$WASM_DIR" -name "*.wasm" -exec ls -lh {} \; | while read -r line; do
        log_info "  $line"
    done

    # Calculate total WASM size
    total_size=$(find "$WASM_DIR" -name "*.wasm" -exec du -ch {} + | grep total$ | cut -f1)
    log_info "Total WASM bundle size: $total_size"
}

# Optimization suggestions
optimize_check() {
    if [ "$BUILD_TYPE" = "release" ]; then
        log_step "Checking optimization opportunities..."

        # Check for large WASM files
        find "$WASM_DIR" -name "*.wasm" -exec ls -l {} \; | while read -r line; do
            size=$(echo "$line" | awk '{print $5}')
            file=$(echo "$line" | awk '{print $9}')

            if [ "$size" -gt 1048576 ]; then # > 1MB
                log_warn "Large WASM file detected: $(basename "$file") ($(( size / 1024 ))KB)"
                log_warn "Consider:"
                log_warn "  - Removing unused dependencies"
                log_warn "  - Using wee_alloc for memory allocation"
                log_warn "  - Enabling LTO (Link Time Optimization)"
            fi
        done
    fi
}

# Pre-build checks
pre_build_checks() {
    log_step "Running pre-build checks..."

    # Check Rust toolchain
    if ! command -v rustc &> /dev/null; then
        log_error "Rust toolchain not found. Please install Rust."
        exit 1
    fi

    # Check WASM target
    if ! rustup target list --installed | grep -q "wasm32-unknown-unknown"; then
        log_info "Installing WASM target..."
        rustup target add wasm32-unknown-unknown
    fi

    # Check for common issues
    if grep -r "dbg!" dnas/ > /dev/null 2>&1; then
        log_warn "Found dbg! macros in code. These will be removed in release builds."
    fi

    log_info "✅ Pre-build checks passed"
}

# Main execution
log_info "Starting Holochain WASM build process"
log_info "Build type: $BUILD_TYPE"
if [ -n "$TARGET_ZOME" ]; then
    log_info "Target zome: $TARGET_ZOME"
fi

pre_build_checks
build_zomes
optimize_check

log_info "🎉 Build process completed successfully!"

# Next steps
log_info "Next steps:"
if [ "$BUILD_TYPE" = "release" ]; then
    log_info "1. Run 'bun run build:happ' to package your hApp"
else
    log_info "1. Test your zomes with 'bun run tests'"
    log_info "2. Use 'bun run build:happ' for production build"
fi

log_info "2. Start your development network with 'bun run start'"