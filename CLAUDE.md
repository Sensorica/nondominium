# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Environment Setup

This is a Holochain application requiring a Nix development environment:

```bash
git submodule update --init --recursive  # Initialize hREA submodule (REQUIRED)
nix develop              # Enter reproducible environment (REQUIRED)
bun install              # Install all dependencies
```

**All commands must be run from within the nix shell.**

## Core Development Commands

### Development Workflow

```bash
bun run start            # Start 2-agent development network with UIs
bun run network          # Custom agent network: AGENTS=3 bun run network
bun run tests             # DEPRECATED: Tryorama TypeScript tests — see tests/DEPRECATED.md
```

### Build Pipeline

```bash
bun run build:zomes      # Compile Rust zomes to WASM
bun run build:happ       # Package DNA into .happ bundle
bun run package          # Create final .webhapp distribution
```

### Testing Commands

**Primary test suite: Sweettest (Rust)** in `dnas/nondominium/tests/`

```bash
# Prerequisites — must run before any test execution:
bun run build:happ

# Run all Sweettest tests
CARGO_TARGET_DIR=target/native-tests cargo test --package nondominium_sweettest

# Run a specific test module
CARGO_TARGET_DIR=target/native-tests cargo test --package nondominium_sweettest --test person
CARGO_TARGET_DIR=target/native-tests cargo test --package nondominium_sweettest --test misc

# Run a specific test function
CARGO_TARGET_DIR=target/native-tests cargo test --package nondominium_sweettest --test person person_create_populates_hrea_agent_hash
```

> **Deprecated:** `bun run tests` runs the legacy Tryorama (TypeScript) test suite. All tests in `tests/` are deprecated. New tests must be written in Sweettest. See `tests/DEPRECATED.md`.

**Test Development Tips**:

1. **Test Isolation**: Use `#[ignore]` on tests not yet ready, or filter by name with `cargo test <name>`.

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

- **Backend**: Rust (Holochain HDK ^0.6.0 / HDI ^0.7.0), WASM compilation target
- **Frontend**: Svelte 5.0 + TypeScript + Vite 6.2.5
- **Testing**: Sweettest (Rust, `holochain = "=0.6.0" features = ["test_utils"]`) — primary; Tryorama (TypeScript) deprecated
- **Client**: @holochain/client 0.19.0 for DHT interaction

### Data Model Foundations

- **Agent-Centric**: All data tied to individual agents with public/private separation
- **Capability-Based Security**: Role-based access using Holochain capability tokens
- **ValueFlows Compliance**: EconomicResource, EconomicEvent, Commitment data structures
- **Embedded Governance**: Resources contain governance rules for access/transfer

### Documentation (NDO & post-MVP integrations)

- **Normative NDO / capability requirements:** `documentation/requirements/ndo_prima_materia.md` (REQ-NDO-*, §6.6 Unyt, §6.7 Flowsta)
- **Master index:** `documentation/DOCUMENTATION_INDEX.md`
- **Integration stubs:** `documentation/requirements/post-mvp/unyt-integration.md`, `documentation/requirements/post-mvp/flowsta-integration.md`
- **Ontology archives:** `documentation/archives/resources.md`, `agent.md`, `governance.md`

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

### Primary: Sweettest (Rust)

All new tests are written in Sweettest (Rust) in `dnas/nondominium/tests/src/`.

```
dnas/nondominium/tests/src/
├── lib.rs                  # Module declarations
├── common/
│   └── conductors.rs       # Shared setup: setup_two_agents(), setup_dual_dna_two_agents()
├── misc/mod.rs             # Misc zome tests (ping)
└── person/mod.rs           # Person zome + hREA bridge tests
```

**Shared setup functions** (from `common::conductors`):
- `setup_two_agents()` — two conductors with nondominium DNA
- `setup_three_agents()` — three conductors with nondominium DNA
- `setup_dual_dna_two_agents()` — two conductors with nondominium + hREA DNAs (explicit role names)

**DHT sync** between agents: `await_consistency(&[&cell_a, &cell_b]).await.unwrap()`

### Deprecated: Tryorama (TypeScript)

Tests in `tests/` use Tryorama and are deprecated. See `tests/DEPRECATED.md` for migration status.

## Development Status

**Phase 1 (Complete)**: Person management with role-based access control
**Phase 2 (In Progress)**: Resource lifecycle and governance implementation, PPR system
- NDO Layer 0 (`NondominiumIdentity` identity anchor): complete (#80)

The codebase follows Holochain best practices with comprehensive testing, clear zome separation, and ValueFlows standard compliance.
