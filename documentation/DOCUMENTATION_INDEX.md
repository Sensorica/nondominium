# Nondominium Project Documentation Index

**Updated**: 2026-05-04

---

## 🎯 Project Overview

**Nondominium** is a ValueFlows-compliant Holochain application implementing distributed, agent-centric resource management with embedded governance, capability-based security, and cryptographically-secured reputation tracking through Private Participation Receipts (PPRs).

### Quick Navigation

- [Getting Started](#-getting-started) - Development setup & quick start
- [Architecture](#-architecture-overview) - System design & zome interactions
- [API Documentation](#-api-documentation) - Complete function reference
- [Testing](#-testing-infrastructure) - Test strategy & execution
- [Implementation Status](#-implementation-status) - Current development progress

---

## 🚀 Getting Started

### Prerequisites & Setup

```bash
nix develop              # Enter reproducible environment (REQUIRED)
bun install              # Install dependencies
```

**Key Documentation:**

- [🎯 TELOS](TELOS.md) - Project vision, mission, philosophy, and AI operating principles
- [📋 Main README](../README.md) - Complete project overview & setup guide
- [🔧 Development Environment](../CLAUDE.md) - Development patterns & commands

### Essential Commands

```bash
# Development
bun run start            # Start 2-agent development network with UIs
AGENTS=3 bun run network # Custom agent network

# Testing — Sweettest (Rust, primary)
bun run build:happ
CARGO_TARGET_DIR=target/native-tests cargo test --package nondominium_sweettest
CARGO_TARGET_DIR=target/native-tests cargo test --package nondominium_sweettest --test person
CARGO_TARGET_DIR=target/native-tests cargo test --package nondominium_sweettest -- --nocapture

# Build
bun run build:zomes     # Compile Rust zomes to WASM
bun run build:happ      # Package DNA into .happ bundle
bun run package         # Create final .webhapp distribution
```

> **Note**: Tryorama (TypeScript) tests in `tests/` are **deprecated**. All new tests use Sweettest (Rust). See `tests/DEPRECATED.md`.

---

## 🏗️ Architecture Overview

### System Architecture

nondominium implements a **Governance-as-Operator** architecture that separates data management from business logic enforcement:

- **Framework**: Holochain HDK ^0.6.0 / HDI ^0.7.0 (Rust + WASM)
- **Frontend**: Svelte 5.0 + TypeScript + Vite 6.2.5
- **Testing**: Sweettest (Rust, primary) — Tryorama (TypeScript) deprecated
- **Client**: @holochain/client 0.19.0
- **Package Management**: Bun for dependency management and build orchestration

### Zome Structure

| Zome | Purpose | Key Features |
| --- | --- | --- |
| **[`zome_person`](zomes/person_zome.md)** | Agent identity & access control | Agent profiles & roles, capability-based security, private data sharing workflows, PPR integration & reputation tracking |
| **[`zome_resource`](zomes/resource_zome.md)** | Pure data model | EconomicResource & EconomicEvent data structures, resource state management only, cross-zome interface for governance requests, no business logic |
| **[`zome_gouvernance`](zomes/governance_zome.md)** | State transition operator | Governance rule evaluation, state transition validation, economic event generation, PPR issuance (16 categories), agent promotion & capability progression |

### Governance-as-Operator Architecture

**Key Design Principles:**

- **Modular Design**: Resource zome manages data, governance zome enforces rules
- **Swappable Governance**: Different governance schemes can be applied to same resources
- **Pure Function Governance**: Stateless evaluation with deterministic outputs
- **Event-Driven State Changes**: All transitions generate audit events
- **Cross-Zome Interface**: Well-defined communication protocol

**Documentation:**

- **[Governance Operator Architecture](specifications/governance/governance-operator-architecture.md)** - Technical architecture and design patterns
- **[Governance Implementation Guide](specifications/governance/governance-operator-implementation-guide.md)** - Detailed implementation with code examples
- **[Cross-Zome API](specifications/governance/cross-zome-api.md)** - Complete API specifications

### Key Concepts

- **🔐 Capability-Based Security**: Progressive trust model (Simple → Accountable → Primary Accountable Agent)
- **📋 Private Participation Receipts (PPRs)**: Cryptographic reputation tracking across 16 categories
- **🔄 Economic Processes**: Structured workflows (Use, Transport, Storage, Repair) with role-based access
- **🛡️ Private Data Sharing**: Request/grant workflows with field-level control and time-limited grants (30-day maximum per `PrivateDataCapabilityMetadata`; shorter defaults may apply in UI flows — see [person_zome.md](zomes/person_zome.md))

---

## 📚 Core Documentation

### Project Requirements

| Document | Description | Status |
| --- | --- | --- |
| **[Requirements](requirements/requirements.md)** | Complete PRD with modular governance architecture | ✅ Complete |
| **[NDO Prima Materia](requirements/ndo_prima_materia.md)** | NDO v1.0 normative requirements (REQ-NDO-*, capability slots, Unyt/Flowsta integration, three-layer model) | ✅ Active |
| **[Agent Ontology](requirements/agent.md)** | Agent types, affiliation spectrum, identity model, OVN forward map | ✅ Active |
| **[Resources Ontology](requirements/resources.md)** | Resource types, property regimes, governance model, OVN forward map | ✅ Active |
| **[Governance Ontology](requirements/governance.md)** | Governance architecture, OVN patterns, governance equation, forward map | ✅ Active |
| **[UI Design](requirements/ui_design.md)** | User interface design specifications (source of truth for UI conflicts) | ✅ Complete |

### Architecture & Roadmap

| Document | Description | Status |
| --- | --- | --- |
| **[NDO v1.0 Architecture Design](specifications/ndo-v1-architecture-design.md)** | Dual-DNA architecture, VF 1.0 class mapping, entry type specs, ADRs, migration notes | ✅ Active |
| **[Lobby DNA Architecture](specifications/post-mvp/lobby-architecture.md)** | Full design: Lobby + Group DNAs, NDO extensions, entry types, coordinator APIs, Moss contract, 7 ADRs | 🔄 Post-MVP |
| **[hREA Integration Strategy](hREA/integration-strategy.md)** | Cross-DNA call architecture, zome-level integration pattern, migration plan | ✅ Active |
| **[hREA VF 1.0 Compliance Analysis](hREA/valueflows-1.0-compliance.md)** | Field-by-field audit of hREA main-0.6 against VF 1.0 ontology (~65% compliance) | ✅ Active |
| **[hREA Strategic Roadmap](hREA/strategic-roadmap.md)** | Phase 1+2 maintainership proposal: VF 1.0 gap closure and JSON-LD API | ✅ Active |

### Technical Specifications

| Document | Description | Status |
| --- | --- | --- |
| **[Technical Specifications](specifications/specifications.md)** | Detailed data structures, zome functions, cross-zome interfaces | ✅ Complete |
| **[Architecture Overview](zomes/architecture_overview.md)** | Comprehensive system architecture & cross-zome integration | ✅ Complete |
| **[Governance Operator Architecture](specifications/governance/governance-operator-architecture.md)** | Technical architecture for modular governance design | ✅ Complete |
| **[Governance Implementation Guide](specifications/governance/governance-operator-implementation-guide.md)** | Detailed implementation guide with code examples | ✅ Complete |
| **[Cross-Zome API](specifications/governance/cross-zome-api.md)** | Complete API specifications for zome communication | ✅ Complete |
| **[PPR Security Implementation](specifications/governance/PPR_Security_Implementation.md)** | Security model for reputation system | ✅ Complete |
| **[Private Participation Receipts](specifications/governance/private-participation-receipt.md)** | PPR system full specification | ✅ Complete |
| **[Governance Model (Legacy)](specifications/governance/governance.md)** | Legacy governance model and decision-making processes | 📦 Reference |
| **[UI Architecture](specifications/ui_architecture.md)** | Frontend design patterns & component structure | ✅ Complete |
| **[ValueFlows Action Usage](specifications/VfAction_Usage.md)** | ValueFlows implementation with governance examples | ✅ Complete |
| **[Protocol Bridge Specifications](specifications/protocol-bridge-specifications.md)** | Bun Protocol Bridge architecture for platform integration (Tiki, Odoo) | ✅ Complete |
| **[API Reference](API_REFERENCE.md)** | Complete function reference across all zomes | ✅ Complete |
| **[Implementation Plan](implementation_plan.md)** | Development roadmap & phase breakdown | ✅ Complete |
| **[Implementation Status](IMPLEMENTATION_STATUS.md)** | Current development progress & completion status | ✅ Current |

### Post-MVP Requirements

| Document | Description | Status |
| --- | --- | --- |
| **[Lobby DNA Requirements](requirements/post-mvp/lobby-dna.md)** | Multi-network federation: Lobby DNA, Group DNA, NDO extensions (REQ-LOBBY-*, REQ-GROUP-*, REQ-NDO-EXT-*) | 🔄 Post-MVP |
| **[Unyt Integration](requirements/post-mvp/unyt-integration.md)** | Economic settlement, Smart Agreements, RAVE proofs, PPR↔RAVE provenance | 🔄 Post-MVP |
| **[Flowsta Integration](requirements/post-mvp/flowsta-integration.md)** | Cross-app identity (IsSamePersonEntry, FlowstaIdentity, DID, key recovery) | 🔄 Post-MVP |
| **[Versioning](requirements/post-mvp/versioning.md)** | DAG-based version graph, fork/merge/repair relations, contribution propagation | 🔄 Post-MVP |
| **[Digital Resource Integrity](requirements/post-mvp/digital-resource-integrity.md)** | Cryptographic integrity verification, Merkle tree, composable architecture | 🔄 Post-MVP |
| **[Many-to-Many Flows](requirements/post-mvp/many-to-many-flows.md)** | Multi-custodian custody, shared ownership, resource pools | 🔄 Post-MVP |
| **[Resource Transport Flow Protocol](requirements/post-mvp/resource-transport-flow-protocol.md)** | Resource transport specifications | 🔄 Post-MVP |
| **[ValueFlows DSL](requirements/post-mvp/valueflows-dsl.md)** | Domain-specific language for governance rule authoring | 🔄 Post-MVP |
| **[Complete Resource Specification](requirements/post-mvp/complete-resource-specification.md)** | Extended resource specification with full property model | 🔄 Post-MVP |

### Testing & Infrastructure

| Document | Description | Status |
| --- | --- | --- |
| **[Testing Infrastructure](Testing_Infrastructure.md)** | Complete testing strategy & framework details | ✅ Complete |
| **[Test Commands](TEST_COMMANDS.md)** | Test execution commands & development tips | ✅ Complete |

### Applications & Use Cases

| Document | Description |
| --- | --- |
| **[Artcoin Integration](Applications/nondominium_artcoin.md)** | Artcoin application integration |
| **[User Story — Artcoin](Applications/user-story/user-story-artcoin.md)** | Complete Artcoin user journey |
| **[User Story — Art Distribution](Applications/user-story/user-story-art-distribution.md)** | Art distribution scenario |
| **[User Story — Art Production](Applications/user-story/user-story-art-production.md)** | Art production scenario |
| **[User Story — ERP Bridge](Applications/user-story/user-story-ERP-bridge.md)** | ERP bridge integration scenario |
| **[User Story — Food Basket](Applications/user-story/user-story-food-basket.md)** | Food basket sharing scenario |
| **[User Story — Material Peer Production](Applications/user-story/user-story-material-peer-production.md)** | Material peer production scenario |
| **[User Story — Open Science](Applications/user-story/user-story-open-science.md)** | Open science commons scenario |

---

## 🔧 API Documentation

Full reference: **[API Reference](API_REFERENCE.md)**

### Person Zome API

**Core Identity & Access Management**

- `create_person()` - Create agent profile with discovery anchors
- `get_person()` - Retrieve profile by hash
- `get_all_persons()` - Discover all agents via anchor traversal
- `update_person()` - Update profile with validation
- `delete_person()` - Soft deletion with cleanup

**Capability & Security**

- `create_capability_token()` - Issue capability tokens with role restrictions
- `get_agent_capability_level()` - Query current trust level
- `promote_agent_capability()` - Advance trust based on PPR milestones

**Private Data Sharing**

- `request_private_data_access()` - Request access to specific fields
- `grant_private_data_access()` - Grant time-limited access (subject to 30-day maximum enforced in capability metadata)
- `get_private_data()` - Retrieve authorized private data
- `revoke_private_data_access()` - Revoke granted permissions

**Role Management**

- `assign_role()` - Assign roles with validation metadata
- `get_agent_roles()` - Query current role assignments
- `validate_role_requirements()` - Check role qualification status

### Resource Zome API (Data Model Only)

**Resource Specification Management**

- `create_resource_specification()` - Define resource types and properties
- `get_resource_specification()` - Retrieve specification details
- `get_all_resource_specifications()` - Discover all specifications
- `update_resource_specification()` - Modify specifications with validation

**Economic Resource Management**

- `create_economic_resource()` - Create resource instances with initial state
- `get_economic_resource()` - Retrieve resource current state and history
- `get_economic_resource_with_state()` - Retrieve resource with full state transitions
- `update_economic_resource_state()` - Update resource state (requires governance approval)
- `get_my_resources()` - Discover resources where calling agent is custodian
- `get_resources_by_specification()` - Find resources conforming to specification
- `get_resources_by_state()` - Query resources by current state

**Cross-Zome State Transitions**

- `request_resource_transition()` - Request state change through governance evaluation
- `batch_state_transitions()` - Process multiple state transitions efficiently

### Governance Zome API (State Transition Operator)

**State Transition Evaluation**

- `evaluate_state_transition()` - Evaluate governance rules for state changes
- `get_applicable_rules()` - Retrieve governance rules for resource/action
- `evaluate_rule()` - Evaluate individual governance rule
- `check_agent_permissions()` - Verify agent has required permissions
- `get_agent_roles()` - Retrieve agent's current role assignments

**Economic Event Generation**

- `generate_economic_event()` - Create audit events for state transitions
- `validate_transition_chain()` - Validate sequence of state changes
- `get_transition_history()` - Retrieve complete audit trail

**Governance Rule Management**

- `create_governance_rule()` - Create new governance rules
- `update_governance_rule()` - Modify existing rules
- `get_governance_rules()` - Retrieve applicable rules

**Legacy Commitment Management (PPR System)**

- `create_commitment()` - Create commitments with validation rules
- `get_commitment()` - Retrieve commitment details
- `fulfill_commitment()` - Mark commitments as fulfilled

**PPR System**

- `issue_ppr()` - Issue Private Participation Receipt (16 categories)
- `get_ppr_summary()` - Retrieve reputation summary across categories
- `validate_ppr_eligibility()` - Check qualification requirements
- `derive_reputation_score()` - Calculate cryptographic reputation metrics

**Multi-Reviewer Validation**

- `create_validation_workflow()` - Set up validation (2-of-3, N-of-M, simple_majority)
- `submit_validation_review()` - Submit validation assessments
- `check_validation_consensus()` - Determine validation outcomes

**Agent Promotion**

- `evaluate_agent_promotion()` - Assess readiness for capability advancement
- `promote_to_accountable_agent()` - Promote based on transaction validation
- `promote_to_primary_accountable_agent()` - Promote based on PPR milestones

---

## 🧪 Testing Infrastructure

### Test Architecture

All new tests use **Sweettest (Rust)** in `dnas/nondominium/tests/src/`. Tryorama (TypeScript) tests in `tests/` are deprecated.

```bash
# Prerequisites
bun run build:happ

# Run all tests
CARGO_TARGET_DIR=target/native-tests cargo test --package nondominium_sweettest

# Run a specific module
CARGO_TARGET_DIR=target/native-tests cargo test --package nondominium_sweettest --test person

# Verbose output
CARGO_TARGET_DIR=target/native-tests cargo test --package nondominium_sweettest -- --nocapture
```

### Shared Setup Utilities

- `setup_two_agents()` — two conductors with nondominium DNA
- `setup_three_agents()` — three conductors with nondominium DNA
- `setup_dual_dna_two_agents()` — two conductors with nondominium + hREA DNAs

### Development Tips

- Use `warn!` macro in Rust zome functions to log debugging information visible in test output
- Use `#[ignore]` on tests not yet ready for execution
- DHT sync between agents: `await_consistency_20_s(&[&cell_a, &cell_b]).await.unwrap()`

---

## 📊 Implementation Status

### ✅ Phase 1 Complete: Foundation System

- **Person Management**: Agent profiles, roles, and basic capability tokens
- **Identity System**: Pseudonymous identity with public/private separation
- **Basic Access Control**: Role-based access with validation metadata
- **hREA Bridge**: Person/ReaAgent bridge for ValueFlows compliance

### ✅ MVP Complete: Advanced Governance & UI

- **Capability-Based Sharing**: Complete request/grant workflows with time-limited grants (30-day cap)
- **PPR System**: 16-category reputation tracking with cryptographic signatures
- **Economic Processes**: Four structured processes (Use, Transport, Storage, Repair)
- **Multi-Reviewer Validation**: 2-of-3, N-of-M, and simple majority validation
- **Agent Promotion**: Progressive trust model with automatic advancement
- **NDO Layer 0**: `NondominiumIdentity` permanent identity anchor with lifecycle transitions
- **MVP UI**: Lobby → Group → NDO three-level hierarchy, NDO creation, lifecycle browser, fork friction modal

### 🔄 Phase 2 (In Progress): Economic Processes & PPR Generation

- Economic processes (Use/Transport/Storage/Repair) backend
- PPR receipt generation from Commitment/Claim/Event cycles
- Governance-as-operator full implementation
- Agent promotion workflows

### 📋 Post-MVP

- Group DNA backend, NDO cell cloning
- PPR reputation UI
- Unyt/Flowsta integrations
- Collective agent types, affiliation spectrum

---

## 🔍 Advanced Features

### Private Participation Receipt (PPR) System

**16 PPR Categories:**

**Genesis Roles (Network Entry):**

1. **ResourceCreation** - Recognition for successful resource contributions
2. **ResourceValidation** - Credit for network validation activities

**Core Usage Roles (Custodianship):** 3. **CustodyTransfer** - Outgoing custodian recognition 4. **CustodyAcceptance** - Incoming custodian validation

**Intermediate Roles (Specialized Services):** 5. **MaintenanceCommitmentAccepted** - Maintenance agreement recognition 6. **MaintenanceFulfillmentCompleted** - Maintenance service completion 7. **StorageCommitmentAccepted** - Storage service agreement 8. **StorageFulfillmentCompleted** - Storage service completion 9. **TransportCommitmentAccepted** - Transport service agreement 10. **TransportFulfillmentCompleted** - Transport service completion 11. **GoodFaithTransfer** - Trust-based transfer recognition

**Network Governance:** 12. **DisputeResolutionParticipation** - Constructive conflict resolution 13. **ValidationActivity** - Ongoing validation duties 14. **RuleCompliance** - Consistent governance adherence

**Resource End-of-Life:** 15. **EndOfLifeDeclaration** - Responsible lifecycle management 16. **EndOfLifeValidation** - Expert validation services

### Economic Processes with Role-Based Access

| Process | Description | Required Role | Key Features |
| --- | --- | --- | --- |
| **Use** | Resource utilization without ownership transfer | Accountable Agent | Time-limited access, usage tracking |
| **Transport** | Resource movement between locations | Primary Accountable Agent | Custody transfer, location tracking |
| **Storage** | Resource preservation and maintenance | Primary Accountable Agent | Location tracking, condition monitoring |
| **Repair** | Resource restoration and improvement | Primary Accountable Agent | Quality validation, cost tracking |

### Progressive Trust Model

```
Simple Agent (member)
├── General capability token
├── Can create resources & make first transaction
├── PPR eligibility: ResourceContribution upon validation
└── Promotion: First validated transaction → Accountable Agent

Accountable Agent (stewardship)
├── Restricted capability token
├── Can access resources & validate others
├── PPR eligibility: Service processes & validation
└── Promotion: PPR milestones + role validation → Primary Agent

Primary Accountable Agent (coordination/governance)
├── Full capability token
├── Can hold custody & validate specialized roles
├── PPR eligibility: All 16 categories
└── Advanced: Dispute resolution & end-of-life validation
```

---

## 🔗 External References

### Technology Stack

- [**Holochain**](https://holochain.org/) - Distributed application framework
- [**ValueFlows**](https://www.valueflows.org/) - Economic coordination ontology
- [**hREA**](https://github.com/h-REA/hREA/) - Holochain implementation of ValueFlows
- [**@holochain/client**](https://www.npmjs.com/package/@holochain/client) - UI client library
- [**Holochain Playground**](https://github.com/darksoil-studio/holochain-playground) - Development tools

### Development Tools

- [**hc CLI**](https://github.com/holochain/holochain/tree/develop/crates/hc) - Holochain development tool
- [**Svelte**](https://svelte.dev/) - Frontend framework
- [**Vite**](https://vitejs.dev/) - Build tool and development server

---

## 📝 Development Notes

### Code Patterns

- **Entry Creation**: All zomes follow consistent create/get/update/delete patterns
- **Anchor Links**: Discovery anchors for all major entry types
- **Validation**: Comprehensive validation with role-based access control
- **Privacy**: Public/private data separation with capability-based access

### Testing Patterns

- **Multi-Agent**: All tests support 2+ distributed agents
- **DHT Sync**: Use `await_consistency_20_s` with the timeout wrapper
- **Debug Support**: Verbose logging with `warn!` macro for Rust debugging
- **Isolation**: Test isolation with proper cleanup between scenarios

### Performance Considerations

- **WASM Compilation**: Rust zomes compiled to WASM for efficiency
- **DHT Optimization**: Efficient link traversal for discovery operations
- **Validation Caching**: Role and capability validation caching
- **PPR System**: Optimized reputation calculation with cryptographic proofs

---

## 🔄 Document Maintenance

**Last Updated**: 2026-05-04
**Maintainers**: Development Team

### Update Process

1. Code changes → Update relevant API documentation
2. Feature completion → Update implementation status
3. Architecture changes → Update architecture overview
4. Test additions → Update testing documentation
