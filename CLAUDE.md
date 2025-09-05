# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Environment Setup

This is a Holochain application requiring a Nix development environment:

```bash
nix develop              # Enter reproducible environment (REQUIRED)
bun install              # Install all dependencies
```

**All commands must be run from within the nix shell.**

## Core Development Commands

### Development Workflow

```bash
bun run start            # Start 2-agent development network with UIs
bun run network          # Custom agent network: AGENTS=3 bun run network
bun run test             # Run full test suite (foundation, integration, scenarios)
```

### Build Pipeline

```bash
bun run build:zomes      # Compile Rust zomes to WASM
bun run build:happ       # Package DNA into .happ bundle
bun run package          # Create final .webhapp distribution
```

### Testing Commands

**Running specific test files**: Use `bun run test` followed by the test file path or pattern.

**Test Development Tips**:

1. **Test Isolation**: Use `.only()` on `describe` or `it` blocks to run specific tests during development:

```typescript
describe.only('specific test suite', () => { ... })  // Run only this suite
it.only('specific test', async () => { ... })       // Run only this test
test.only('specific test', async () => { ... })       // Run only this test
```

2. **Rust Debugging**: Use the `warn!` macro in Rust zome functions to log debugging information that will appear in test output:

```rust
warn!("Debug info: variable = {:?}", some_variable);
warn!("Checkpoint reached in function_name");
warn!("Processing entry: {}", entry_hash);
```

The `warn!` macro output is visible in the test console, making it invaluable for debugging complex Holochain interactions and understanding execution flow during test development.

### Individual Workspace Commands

```bash
bun run --filter ui start          # Frontend development server
bun run --filter tests test        # Backend test execution
```

## Architecture Overview

nondominium is a **3-zome Holochain hApp** implementing ValueFlows-compliant resource sharing:

### Zome Architecture

- **`zome_person`**: Agent identity, profiles, roles, capability-based access
- **`zome_resource`**: Resource specifications and lifecycle management
- **`zome_gouvernance`**: Commitments, claims, economic events, governance rules, PPR system

### Technology Stack

- **Backend**: Rust (Holochain HDK 0.5.3 / HDI 0.6.3), WASM compilation target
- **Frontend**: Svelte 5.0 + TypeScript + Vite 6.2.5
- **Testing**: Vitest 3.1.3 + @holochain/tryorama 0.18.2
- **Client**: @holochain/client 0.19.0 for DHT interaction

### Data Model Foundations

- **Agent-Centric**: All data tied to individual agents with public/private separation
- **Capability-Based Security**: Role-based access using Holochain capability tokens
- **ValueFlows Compliance**: EconomicResource, EconomicEvent, Commitment data structures
- **Embedded Governance**: Resources contain governance rules for access/transfer

## Key Development Patterns

### Entry Creation Pattern

```rust
// All zomes follow this pattern for creating entries
let entry = EntryType {
    field: value,
    agent_pub_key: agent_info.agent_initial_pubkey,
    created_at: sys_time()?,
};
let hash = create_entry(EntryTypes::EntryType(entry.clone()))?;

// Create discovery anchor links
let path = Path::from("anchor_name");
create_link(path.path_entry_hash()?, hash.clone(), LinkTypes::AnchorType, LinkTag::new("tag"))?;
```

### Privacy Model

- **Public Data**: `Person` entries with name/avatar (discoverable)
- **Private Data**: `EncryptedProfile` entries with PII (access-controlled)
- **Role Assignments**: Linked to profiles with validation metadata in link tags

### Function Naming Convention

- `create_[entry_type]`: Creates new entries with anchor links
- `get_[entry_type]`: Retrieves entries by hash
- `get_all_[entry_type]`: Discovery via anchor links
- `update_[entry_type]`: Updates existing entries
- `delete_[entry_type]`: Marks entries as deleted

## Test Architecture

### 4-Layer Testing Strategy

1. **Foundation Tests**: Basic zome function calls and connectivity
2. **Integration Tests**: Cross-zome interactions and multi-agent scenarios
3. **Scenario Tests**: Complete user journeys and workflows
4. **Performance Tests**: Load and stress testing (in progress for PPR system)

### Test Configuration

- **Timeout**: 4 minutes for complex multi-agent scenarios
- **Concurrency**: Single fork execution for DHT consistency
- **Agent Simulation**: Supports 2+ distributed agents per test

### Test File Organization

Tests are organized by zome and functionality:

- `tests/src/nondominium/person/`: Person zome tests
- `tests/src/nondominium/resource/`: Resource zome tests
- `tests/src/nondominium/governance/`: Governance zome tests
- `tests/src/nondominium/governance/ppr-system/`: PPR system tests

## Development Status

**Phase 1 (Complete)**: Person management with role-based access control
**Phase 2 (In Progress)**: Resource lifecycle and governance implementation, PPR system

The codebase follows Holochain best practices with comprehensive testing, clear zome separation, and ValueFlows standard compliance.
