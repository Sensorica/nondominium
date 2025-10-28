#!/bin/bash

# validate_entry.sh - Entry validation pattern checker for nondominium
# Usage: ./validate_entry.sh <zome_name>

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
    echo -e "${BLUE}[CHECK]${NC} $1"
}

# Validation checks
validate_agent_pubkey() {
    local file=$1
    log_step "Checking agent_pubkey field usage..."

    if grep -q "agent_pub_key: agent_info()?.agent_initial_pubkey" "$file"; then
        log_info "✅ Proper agent_pubkey pattern found"
    else
        log_warn "Missing agent_pubkey: agent_info()?.agent_initial_pubkey pattern"
    fi
}

validate_created_at() {
    local file=$1
    log_step "Checking created_at field usage..."

    if grep -q "created_at: sys_time()?," "$file"; then
        log_info "✅ Proper created_at pattern found"
    else
        log_warn "Missing created_at: sys_time()? pattern"
    fi
}

validate_create_entry_pattern() {
    local file=$1
    log_step "Checking create_entry patterns..."

    if grep -q "create_entry(&EntryTypes::" "$file"; then
        log_info "✅ create_entry with EntryTypes found"
    else
        log_warn "Missing create_entry with EntryTypes pattern"
    fi

    if grep -q "create_link(" "$file"; then
        log_info "✅ create_link patterns found"
    else
        log_warn "Missing create_link patterns for discovery"
    fi
}

validate_error_handling() {
    local file=$1
    log_step "Checking error handling patterns..."

    if grep -q "impl From<.*Error> for WasmError" "$file"; then
        log_info "✅ WasmError conversion found"
    else
        log_warn "Missing WasmError conversion"
    fi

    if grep -q "wasm_error!" "$file"; then
        log_info "✅ wasm_error! macro usage found"
    else
        log_warn "Missing wasm_error! macro usage"
    fi
}

validate_path_anchors() {
    local file=$1
    log_step "Checking path anchor patterns..."

    if grep -q 'Path::from("' "$file"; then
        log_info "✅ Path anchor patterns found"
    else
        log_warn "Missing Path::from patterns for discovery anchors"
    fi
}

validate_nondominium_patterns() {
    local file=$1
    log_step "Checking nondominium-specific patterns..."

    # Check for ValueFlows compliance hints
    if grep -q -i "economic_resource\|economic_event\|commitment" "$file"; then
        log_info "✅ ValueFlows concepts detected"
    fi

    # Check for capability patterns
    if grep -q -i "capability\|role\|permission" "$file"; then
        log_info "✅ Capability-based patterns detected"
    fi

    # Check for private data patterns
    if grep -q -i "private\|encrypted\|access" "$file"; then
        log_info "✅ Private data patterns detected"
    fi
}

validate_function_naming() {
    local file=$1
    log_step "Checking function naming conventions..."

    local good_patterns=0
    local total_functions=0

    # Count create_ functions
    local create_count=$(grep -c "fn create_" "$file" || true)
    total_functions=$((total_functions + create_count))
    if [ $create_count -gt 0 ]; then
        log_info "✅ Found $create_count create_ functions"
        good_patterns=$((good_patterns + create_count))
    fi

    # Count get_ functions
    local get_count=$(grep -c "fn get_" "$file" || true)
    total_functions=$((total_functions + get_count))
    if [ $get_count -gt 0 ]; then
        log_info "✅ Found $get_count get_ functions"
        good_patterns=$((good_patterns + get_count))
    fi

    # Count update_ functions
    local update_count=$(grep -c "fn update_" "$file" || true)
    total_functions=$((total_functions + update_count))
    if [ $update_count -gt 0 ]; then
        log_info "✅ Found $update_count update_ functions"
        good_patterns=$((good_patterns + update_count))
    fi

    # Count delete_ functions
    local delete_count=$(grep -c "fn delete_" "$file" || true)
    total_functions=$((total_functions + delete_count))
    if [ $delete_count -gt 0 ]; then
        log_info "✅ Found $delete_count delete_ functions"
        good_patterns=$((good_patterns + delete_count))
    fi

    if [ $total_functions -gt 0 ]; then
        local percentage=$(( (good_patterns * 100) / total_functions ))
        log_info "Function naming compliance: $percentage% ($good_patterns/$total_functions)"
    fi
}

# Main validation logic
main() {
    if [ -z "$ZOME_NAME" ]; then
        log_error "Zome name is required"
        echo "Usage: $0 <zome_name>"
        exit 1
    fi

    log_info "Validating zome: $ZOME_NAME"
    log_info "Checking for nondominium development patterns..."

    # Find all relevant source files
    local zome_files=()

    # Integrity zome
    local integrity_dir="$ZOMES_DIR/integrity/zome_$ZOME_NAME/src"
    if [ -d "$integrity_dir" ]; then
        for file in "$integrity_dir"/*.rs; do
            if [ -f "$file" ]; then
                zome_files+=("$file")
            fi
        done
    fi

    # Coordinator zome
    local coordinator_dir="$ZOMES_DIR/coordinator/zome_$ZOME_NAME/src"
    if [ -d "$coordinator_dir" ]; then
        for file in "$coordinator_dir"/*.rs; do
            if [ -f "$file" ]; then
                zome_files+=("$file")
            fi
        done
    fi

    if [ ${#zome_files[@]} -eq 0 ]; then
        log_error "No source files found for zome: $ZOME_NAME"
        exit 1
    fi

    # Run validations on each file
    for file in "${zome_files[@]}"; do
        log_info "Validating file: $(basename "$file")"

        validate_agent_pubkey "$file"
        validate_created_at "$file"
        validate_create_entry_pattern "$file"
        validate_error_handling "$file"
        validate_path_anchors "$file"
        validate_nondominium_patterns "$file"
        validate_function_naming "$file"

        echo ""
    done

    log_info "🎉 Validation completed!"
    log_info "Review any warnings above and consider implementing the suggested patterns."
    log_info "Refer to references/entry_creation_patterns.md for detailed guidance."
}

# Run main function
main "$@"