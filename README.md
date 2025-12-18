# Nondominium

![Nondominium logo](nondominium.png)

A **ValueFlows-compliant resource sharing Holochain application** implementing distributed, agent-centric resource management with embedded governance.

## Executive Summary
**nondominium** is a foundational infrastructure project aimed at enabling a new class of Resources that are *organization-agnostic*, *uncapturable*, and *natively collaborative*. These Resources are governed not by platforms or centralized authorities, but through embedded rules, transparent peer validation, and a comprehensive reputation system.

The project's central goal is to support a ***peer sharing economy***, overcoming the structural flaws of centralized platforms (centralization of power, censorship, unsuitable regulations).

Built on the Holochain framework and using the ValueFlows standard, nondominium allows any Agent to interact with these Resources in a permissionless but accountable environment, with automatic reputation tracking through Private Participation Receipts (PPRs).


## Overview

Nondominium is a 3-zome Holochain hApp that enables decentralized resource sharing through:

- **Agent identity management** with role-based access control
- **Resource lifecycle tracking** following ValueFlows standards
- **Embedded governance** for access and transfer rules
- **Capability-based security** using Holochain's native features

### Architecture

**Governance-as-Operator Design:**

nondominium implements a modular governance-as-operator architecture that separates data management from business logic enforcement:

- **`zome_person`**: Agent identity, profiles, roles, and capability-based access control
- **`zome_resource`**: Pure data model for resource specifications and lifecycle management (state only)
- **`zome_gouvernance`**: State transition operator that evaluates governance rules and validates changes

**Key Architecture Benefits:**
- **Modularity**: Governance rules can be modified without changing resource data structures
- **Swappability**: Different governance schemes can be applied to the same resource types
- **Testability**: Governance logic can be unit tested independently of data management
- **Separation of Concerns**: Clear boundaries between data persistence and business rule enforcement

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

- [Requirements](documentation/requirements/requirements.md) - Project goals and functional requirements
- [Specifications](documentation/specifications/specifications.md) - Detailed technical specifications
- [Governance Operator Architecture](documentation/specifications/governance/governance-operator-architecture.md) - Modular governance design patterns
- [Governance Implementation Guide](documentation/specifications/governance/governance-operator-implementation-guide.md) - Implementation details with code examples
- [Cross-Zome API](documentation/specifications/governance/cross-zome-api.md) - API specifications for zome communication
- [UI Architecture](documentation/specifications/ui_architecture.md) - Frontend architecture and design patterns
- [Testing Infrastructure](documentation/Testing_Infrastructure.md) - Testing strategy and framework details
- [ValueFlows Action Usage](documentation/specifications/VfAction_Usage.md) - ValueFlows implementation patterns with governance examples
- [API Reference](documentation/API_REFERENCE.md) - Complete API documentation
- [Documentation Index](documentation/DOCUMENTATION_INDEX.md) - Comprehensive documentation guide

### Zome Documentation

- [Architecture Overview](documentation/zomes/architecture_overview.md) - Overall zome architecture and interactions
- [Person Zome](documentation/zomes/person_zome.md) - Agent identity and profile management
- [Resource Zome](documentation/zomes/resource_zome.md) - Resource lifecycle and management
- [Governance Zome](documentation/zomes/governance_zome.md) - Governance rules and implementation

### Governance & Security

**Governance Architecture:**
- [Governance Operator Architecture](documentation/specifications/governance/governance-operator-architecture.md) - Modular governance design patterns
- [Governance Implementation Guide](documentation/specifications/governance/governance-operator-implementation-guide.md) - Implementation details with code examples
- [Cross-Zome API](documentation/specifications/governance/cross-zome-api.md) - API specifications for zome communication
- [Governance Model](documentation/specifications/governance/governance.md) - Legacy governance model and decision-making processes

**Reputation & Security:**
- [Private Participation Receipts](documentation/specifications/governance/private-participation-receipt.md) - PPR system documentation
- [PPR Security Implementation](documentation/specifications/governance/PPR_Security_Implementation.md) - Security implementation for PPR system

### Applications & Use Cases

- [Artcoin Integration](documentation/Applications/Nondominium_Artcoin.md) - Artcoin application integration
- [User Stories](documentation/Applications/user-story/) - Complete user journey scenarios

### Additional Resources

- [hREA Integration Strategy](documentation/hREA-integration-strategy.md) - hREA integration planning
- [Resource Transport Flow Protocol](documentation/specifications/resource-transport-flow-protocol.md) - Resource transport specifications
- [Tiki Integration Specifications](documentation/specifications/tiki-integration-specifications.md) - Tiki platform integration

## Technology Stack

- [Holochain](https://holochain.org/): Distributed application framework
- [NPM Workspaces](https://docs.npmjs.com/cli/v7/using-npm/workspaces/): Monorepo management
- [hc](https://github.com/holochain/holochain/tree/develop/crates/hc): Holochain CLI development tool
- [@holochain/tryorama](https://www.npmjs.com/package/@holochain/tryorama): Testing framework
- [@holochain/client](https://www.npmjs.com/package/@holochain/client): UI-to-Holochain client library
- [Holochain Playground](https://github.com/darksoil-studio/holochain-playground): Development introspection tools
- [ValueFlows](https://www.valuefflows.org/): Economic coordination ontology
