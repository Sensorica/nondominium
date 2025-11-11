#!/bin/bash

# sync_integrity_coordinator.sh - Ensure integrity/coordinator layer consistency
# Usage: ./sync_integrity_coordinator.sh <zome_name>

set -e

ZOME_NAME=$1
PROJECT_ROOT=$(pwd)
ZOMES_DIR="$PROJECT_ROOT/dnas/nondominium/zomes"

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
    echo -e "${BLUE}[SYNC]${NC} $1"
}

# Check if integrity and coordinator layers are consistent
check_entry_consistency() {
    local integrity_dir="$ZOMES_DIR/integrity/zome_$ZOME_NAME/src"
    local coordinator_dir="$ZOMES_DIR/coordinator/zome_$ZOME_NAME/src"

    log_step "Checking entry type consistency..."

    if [ ! -d "$integrity_dir" ]; then
        log_error "Integrity zome not found: $integrity_dir"
        return 1
    fi

    if [ ! -d "$coordinator_dir" ]; then
        log_error "Coordinator zome not found: $coordinator_dir"
        return 1
    fi

    # Extract entry types from integrity layer
    local integrity_entries=$(grep -h "pub enum.*{" "$integrity_dir"/*.rs 2>/dev/null | grep -v "impl\|fn\|use\|#" | head -10)

    # Check if coordinator imports integrity types
    local has_import=$(grep -h "use zome_${ZOME_NAME}_integrity" "$coordinator_dir"/*.rs 2>/dev/null || echo "")

    if [ -z "$has_import" ]; then
        log_warn "Coordinator zome doesn't import integrity types"
        log_info "Add this line to coordinator lib.rs:"
        log_info "  use zome_${ZOME_NAME}_integrity::*;"
    else
        log_info "✅ Integrity types imported in coordinator"
    fi

    # Check for matching function calls
    log_info "Entry types defined in integrity layer:"
    echo "$integrity_entries" | while read -r line; do
        if [ -n "$line" ]; then
            log_info "  $line"
        fi
    done
}

# Check extern function consistency
check_extern_functions() {
    local integrity_dir="$ZOMES_DIR/integrity/zome_$ZOME_NAME/src"
    local coordinator_dir="$ZOMES_DIR/coordinator/zome_$ZOME_NAME/src"

    log_step "Checking extern function consistency..."

    # Find extern functions in integrity layer
    local integrity_externs=$(grep -h "#\[hdk_extern\]" "$integrity_dir"/*.rs 2>/dev/null | wc -l)
    local coordinator_calls=$(grep -h "call_integrity\|call_remote" "$coordinator_dir"/*.rs 2>/dev/null | wc -l)

    log_info "Integrity extern functions: $integrity_externs"
    log_info "Cross-zome calls in coordinator: $coordinator_calls"

    if [ "$integrity_externs" -gt 0 ] && [ "$coordinator_calls" -eq 0 ]; then
        log_warn "Integrity layer has extern functions but coordinator doesn't call them"
    fi
}

# Check link type consistency
check_link_consistency() {
    local integrity_dir="$ZOMES_DIR/integrity/zome_$ZOME_NAME/src"
    local coordinator_dir="$ZOMES_DIR/coordinator/zome_$ZOME_NAME/src"

    log_step "Checking link type consistency..."

    # Find LinkTypes in integrity
    local integrity_links=$(grep -h "pub enum LinkTypes" "$integrity_dir"/*.rs 2>/dev/null)

    if [ -n "$integrity_links" ]; then
        log_info "✅ LinkTypes defined in integrity layer"

        # Check if coordinator uses link types
        local coordinator_link_usage=$(grep -h "LinkTypes::" "$coordinator_dir"/*.rs 2>/dev/null || echo "")

        if [ -n "$coordinator_link_usage" ]; then
            log_info "✅ Coordinator uses LinkTypes"
        else
            log_warn "Coordinator doesn't use LinkTypes"
        fi
    else
        log_warn "No LinkTypes defined in integrity layer"
    fi
}

# Check validation function consistency
check_validation_consistency() {
    local integrity_dir="$ZOMES_DIR/integrity/zome_$ZOME_NAME/src"
    local coordinator_dir="$ZOMES_DIR/coordinator/zome_$ZOME_NAME/src"

    log_step "Checking validation function consistency..."

    # Check for validation patterns
    local validation_patterns=$(grep -h "validate_\|entry_def\|entry_validation" "$integrity_dir"/*.rs 2>/dev/null || echo "")

    if [ -n "$validation_patterns" ]; then
        log_info "✅ Validation patterns found in integrity layer"
    else
        log_warn "No validation patterns found in integrity layer"
        log_info "Consider adding entry validation functions"
    fi
}

# Generate synchronization report
generate_sync_report() {
    local integrity_dir="$ZOMES_DIR/integrity/zome_$ZOME_NAME/src"
    local coordinator_dir="$ZOMES_DIR/coordinator/zome_$ZOME_NAME/src"

    log_step "Generating synchronization report..."

    local report_file="$PROJECT_ROOT/sync_report_${ZOME_NAME}.md"

    cat > "$report_file" << EOF
# Integrity/Coordinator Sync Report: $ZOME_NAME

Generated: $(date)

## Structure Analysis

### Integrity Layer: $([ -d "$integrity_dir" ] && echo "✅ Found" || echo "❌ Missing")
### Coordinator Layer: $([ -d "$coordinator_dir" ] && echo "✅ Found" || echo "❌ Missing")

## Files Found

### Integrity Files:
$(ls -la "$integrity_dir"/*.rs 2>/dev/null | sed 's/^/  /' || echo "  No files found")

### Coordinator Files:
$(ls -la "$coordinator_dir"/*.rs 2>/dev/null | sed 's/^/  /' || echo "  No files found")

## Recommendations

1. Ensure all entry types are defined in integrity layer
2. Import integrity types in coordinator layer
3. Use consistent LinkTypes across both layers
4. Implement proper validation in integrity layer
5. Test cross-zome function calls

## Next Steps

Run './scripts/validate_entry.sh $ZOME_NAME' to check entry patterns
Run 'bun run build:zomes' to compile both layers
Run 'bun run tests' to verify integration
EOF

    log_info "Sync report generated: $report_file"
}

# Main synchronization logic
main() {
    if [ -z "$ZOME_NAME" ]; then
        log_error "Zome name is required"
        echo "Usage: $0 <zome_name>"
        exit 1
    fi

    log_info "Synchronizing integrity/coordinator layers for: $ZOME_NAME"

    # Check if zome exists
    local integrity_dir="$ZOMES_DIR/integrity/zome_$ZOME_NAME"
    local coordinator_dir="$ZOMES_DIR/coordinator/zome_$ZOME_NAME"

    if [ ! -d "$integrity_dir" ] && [ ! -d "$coordinator_dir" ]; then
        log_error "Zome '$ZOME_NAME' not found in either integrity or coordinator layers"
        exit 1
    fi

    # Run consistency checks
    check_entry_consistency
    check_extern_functions
    check_link_consistency
    check_validation_consistency
    generate_sync_report

    log_info "🎉 Synchronization analysis completed!"
    log_info "Review the sync report and any warnings above."

    # Suggest next actions
    log_info "Suggested next steps:"
    log_info "1. Address any inconsistencies found in the analysis"
    log_info "2. Run './scripts/validate_entry.sh $ZOME_NAME' for pattern validation"
    log_info "3. Build with './scripts/build_wasm.sh release $ZOME_NAME'"
    log_info "4. Test integration with the testing suite"
}

# Run main function
main "$@"