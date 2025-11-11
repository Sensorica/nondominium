#!/bin/bash

# package_happ.sh - hApp packaging and distribution workflow
# Usage: ./package_happ.sh [dev|production]

set -e

BUILD_TYPE=${1:-dev}
PROJECT_ROOT=$(pwd)
WORKDIR="$PROJECT_ROOT/dnas/nondominium/workdir"

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

# Pre-package checks
pre_package_checks() {
    log_step "Running pre-package checks..."

    # Check if we're in the right directory
    if [ ! -f "package.json" ] || [ ! -d "dnas/nondominium" ]; then
        log_error "Not in the nondominium project root"
        exit 1
    fi

    # Check if WASM files exist
    local wasm_count=$(find target/wasm32-unknown-unknown/release -name "*.wasm" 2>/dev/null | wc -l)
    if [ "$wasm_count" -eq 0 ]; then
        log_warn "No WASM files found in release directory"
        log_info "Building WASM files first..."
        ./scripts/build_wasm.sh release
    else
        log_info "Found $wasm_count WASM files ready for packaging"
    fi

    # Check workdir structure
    if [ ! -d "$WORKDIR" ]; then
        log_error "Workdir not found at $WORKDIR"
        exit 1
    fi

    log_info "✅ Pre-package checks passed"
}

# Package DNA
package_dna() {
    log_step "Packaging DNA bundle..."

    cd "$PROJECT_ROOT"

    # Use the project's npm script for packaging
    if npm run build:happ; then
        log_info "✅ DNA packaging completed successfully"
    else
        log_error "DNA packaging failed"
        exit 1
    fi

    # Check if .happ file was created
    local happ_file="$WORKDIR/nondominium.happ"
    if [ -f "$happ_file" ]; then
        local size=$(ls -lh "$happ_file" | awk '{print $5}')
        log_info "Created hApp bundle: $happ_file (size: $size)"
    else
        log_error "hApp bundle not found after packaging"
        exit 1
    fi
}

# Create webhapp (if UI exists)
create_webhapp() {
    if [ -d "ui" ] && [ -f "package.json" ]; then
        log_step "Creating webhapp bundle..."

        cd "$PROJECT_ROOT"

        # Build UI first
        log_info "Building UI..."
        npm run --filter ui package

        # Create webhapp
        if npm run package; then
            log_info "✅ webhapp bundle created successfully"
        else
            log_warn "webhapp creation failed, but DNA bundle is ready"
        fi
    else
        log_info "No UI directory found, skipping webhapp creation"
    fi
}

# Verify package contents
verify_package() {
    log_step "Verifying package contents..."

    local happ_file="$WORKDIR/nondominium.happ"
    if [ -f "$happ_file" ]; then
        log_info "hApp bundle contents:"

        # Use hc to inspect the bundle if available
        if command -v hc &> /dev/null; then
            hc app info "$happ_file" 2>/dev/null || log_warn "Could not inspect hApp bundle details"
        else
            log_info "Install Holochain CLI (hc) for detailed bundle inspection"
        fi

        # Show file info
        ls -lh "$happ_file"
    fi
}

# Distribution preparation
prepare_distribution() {
    if [ "$BUILD_TYPE" = "production" ]; then
        log_step "Preparing for production distribution..."

        local dist_dir="$PROJECT_ROOT/dist"
        mkdir -p "$dist_dir"

        # Copy bundles to dist directory
        cp "$WORKDIR/nondominium.happ" "$dist_dir/" 2>/dev/null || log_warn "Could not copy hApp bundle"

        local webhapp_file="$WORKDIR/nondominium.webhapp"
        if [ -f "$webhapp_file" ]; then
            cp "$webhapp_file" "$dist_dir/" 2>/dev/null || log_warn "Could not copy webhApp bundle"
        fi

        # Create version info
        cat > "$dist_dir/VERSION.txt" << EOF
nondominium hApp Bundle
====================
Build Date: $(date)
Build Type: production
Git Commit: $(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
Git Branch: $(git branch --show-current 2>/dev/null || echo "unknown")

Bundle Files:
- nondominium.happ: Holochain DNA bundle
$(if [ -f "$webhapp_file" ]; then echo "- nondominium.webhapp: Web hApp bundle with UI"; fi)

Installation:
1. Use 'hc spin -n 2 nondominium.happ' for local testing
2. Use 'hc launch' for production deployment
3. For webhApp, use a compatible launcher that supports UI bundles
EOF

        log_info "Distribution files prepared in dist/ directory"
    fi
}

# Main execution
main() {
    log_info "Starting hApp packaging process"
    log_info "Build type: $BUILD_TYPE"

    if [ "$BUILD_TYPE" != "dev" ] && [ "$BUILD_TYPE" != "production" ]; then
        log_error "Invalid build type: $BUILD_TYPE"
        log_error "Valid types: dev, production"
        exit 1
    fi

    # Check for nix environment
    if [ -z "$IN_NIX_SHELL" ]; then
        log_warn "Not in Nix shell. Consider running 'nix develop' for proper environment"
    fi

    pre_package_checks
    package_dna
    create_webhapp
    verify_package
    prepare_distribution

    log_info "🎉 hApp packaging completed successfully!"

    # Show next steps
    log_info "Next steps:"
    log_info "1. Test your hApp: hc spin -n 2 dnas/nondominium/workdir/nondominium.happ"
    log_info "2. Start development network: bun run start"
    if [ "$BUILD_TYPE" = "production" ]; then
        log_info "3. Find production bundles in dist/ directory"
    fi
}

# Run main function
main "$@"