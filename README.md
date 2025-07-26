# Nondominium

A **ValueFlows-compliant resource sharing Holochain application** implementing distributed, agent-centric resource management with embedded governance.

## Overview

Nondominium is a 3-zome Holochain hApp that enables decentralized resource sharing through:

- **Agent identity management** with role-based access control
- **Resource lifecycle tracking** following ValueFlows standards
- **Embedded governance** for access and transfer rules
- **Capability-based security** using Holochain's native features

### Architecture

**Zome Structure:**

- `zome_person`: Agent profiles, roles, and capability-based access
- `zome_resource`: Resource specifications and lifecycle management
- `zome_gouvernance`: Commitments, economic events, and governance rules

**Technology Stack:**

- Backend: Rust (Holochain HDK/HDI 0.5.x-0.6.x) compiled to WASM
- Frontend: Svelte 5.0 + TypeScript + Vite 6.2.5
- Testing: Vitest 3.1.3 + @holochain/tryorama 0.18.2
- Client: @holochain/client 0.19.0

## Environment Setup

> **PREREQUISITE**: Set up the [Holochain development environment](https://developer.holochain.org/docs/install/).

Enter the nix shell by running this in the root folder of the repository:

```bash
nix develop              # Enter reproducible environment (REQUIRED)
bun install              # Install all dependencies
```

**⚠️ Run all commands from within the nix shell, otherwise they won't work.**

## Development Workflow

### Quick Start

```bash
bun run start           # Start 2-agent development network with UIs
```

This creates a network of 2 nodes with their respective UIs and the Holochain Playground for conductor introspection.

### Custom Network

```bash
AGENTS=3 bun run network    # Bootstrap custom agent network (replace 3 with desired count)
```

### Testing

```bash
bun run test                    # Run full test suite
npm run test:foundation         # Basic zome connectivity tests
npm run test:integration        # Multi-agent interaction tests
npm run test:scenarios          # Complete workflow simulations
npm run test:person             # Person management test suite
npm run test:debug              # Verbose test output
```

### Build Pipeline

```bash
bun run build:zomes     # Compile Rust zomes to WASM
bun run build:happ      # Package DNA into .happ bundle
bun run package         # Create final .webhapp distribution
```

### Individual Workspaces

```bash
bun run --filter ui start      # Frontend development server
bun run --filter tests test    # Backend test execution
```

## Data Model

### Core Principles

- **Agent-Centric**: All data tied to individual agents with public/private separation
- **ValueFlows Compliance**: EconomicResource, EconomicEvent, Commitment data structures
- **Privacy by Design**: Public profiles with encrypted private data
- **Capability-Based Security**: Role-based access using Holochain capability tokens

### Entry Patterns

All zomes follow consistent patterns for:

- `create_[entry_type]`: Creates entries with discovery anchor links
- `get_[entry_type]`: Retrieves entries by hash
- `get_all_[entry_type]`: Discovery via anchor traversal
- `update_[entry_type]`: Updates with validation
- `delete_[entry_type]`: Soft deletion marking

## Testing Architecture

**4-Layer Strategy:**

1. **Foundation**: Basic zome function calls and connectivity
2. **Integration**: Cross-zome interactions and multi-agent scenarios
3. **Scenarios**: Complete user journeys and workflows
4. **Performance**: Load and stress testing (planned)

**Test Configuration:**

- Timeout: 4 minutes for complex multi-agent scenarios
- Concurrency: Single fork execution for DHT consistency
- Agent Simulation: Supports 2+ distributed agents per test

## Distribution

To package the web happ:

```bash
bun run package
```

This generates:

- `nondominium.webhapp` in `workdir/` (for Holochain Launcher installation)
- `nondominium.happ` (subcomponent bundle)

## Development Status

- ✅ **Phase 1**: Person management with role-based access control
- 🔄 **Phase 2**: Resource lifecycle and governance implementation

## Documentation

### Project Documentation

- [Requirements](documentation/requirements.md) - Project goals and functional requirements
- [Specifications](documentation/specifications.md) - Detailed technical specifications
- [Implementation Plan](documentation/implementation_plan.md) - Development roadmap and phase breakdown
- [Governance](documentation/governance.md) - Governance model and decision-making processes
- [UI Architecture](documentation/ui_architecture.md) - Frontend architecture and design patterns
- [Testing Infrastructure](documentation/Testing_Infrastructure.md) - Testing strategy and framework details
- [ValueFlows Action Usage](documentation/VfAction_Usage.md) - ValueFlows implementation patterns

### Zome Documentation

- [Architecture Overview](documentation/zomes/architecture_overview.md) - Overall zome architecture and interactions
- [Person Zome](documentation/zomes/person_zome.md) - Agent identity and profile management
- [Resource Zome](documentation/zomes/resource_zome.md) - Resource lifecycle and management

## Technology Stack

- [Holochain](https://holochain.org/): Distributed application framework
- [NPM Workspaces](https://docs.npmjs.com/cli/v7/using-npm/workspaces/): Monorepo management
- [hc](https://github.com/holochain/holochain/tree/develop/crates/hc): Holochain CLI development tool
- [@holochain/tryorama](https://www.npmjs.com/package/@holochain/tryorama): Testing framework
- [@holochain/client](https://www.npmjs.com/package/@holochain/client): UI-to-Holochain client library
- [Holochain Playground](https://github.com/darksoil-studio/holochain-playground): Development introspection tools
- [ValueFlows](https://www.valuefflows.org/): Economic coordination ontology
