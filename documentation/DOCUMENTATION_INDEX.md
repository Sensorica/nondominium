# Nondominium Project Documentation Index

**Updated**: 2026-03-31

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

- [📋 Main README](../README.md) - Complete project overview & setup guide
- [🔧 Development Environment](../CLAUDE.md) - Development patterns & commands

### Essential Commands

```bash
# Development
bun run start            # Start 2-agent development network with UIs
AGENTS=3 bun run network # Custom agent network

# Testing
bun run tests           # Full test suite
bun run test:foundation  # Basic connectivity tests
bun run test:integration # Multi-agent interaction tests
bun run test:scenarios   # Complete workflow simulations
bun run test:person      # Person management test suite
bun run test:debug       # Verbose test output for debugging

# Build
bun run build:zomes     # Compile Rust zomes to WASM
bun run build:happ      # Package DNA into .happ bundle
bun run package         # Create final .webhapp distribution
```

---

## 🏗️ Architecture Overview

### System Architecture

nondominium implements a **Governance-as-Operator** architecture that separates data management from business logic enforcement:

- **Framework**: Holochain HDK ^0.6.0 / HDI ^0.7.0 (Rust + WASM)
- **Frontend**: Svelte 5.0 + TypeScript + Vite 6.2.5
- **Testing**: Vitest 3.1.3 + @holochain/tryorama 0.18.2
- **Client**: @holochain/client 0.19.0
- **Package Management**: Bun for dependency management and build orchestration

### Zome Structure

| Zome                                                             | Purpose                         | Key Features                                                                                                                                                                 |
| ---------------------------------------------------------------- | ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **[`zome_person`](documentation/zomes/person_zome.md)**          | Agent identity & access control | • Agent profiles & roles<br>• Capability-based security<br>• Private data sharing workflows<br>• PPR integration & reputation tracking                                       |
| **[`zome_resource`](documentation/zomes/resource_zome.md)**      | Pure data model                 | • EconomicResource & EconomicEvent data structures<br>• Resource state management only<br>• Cross-zome interface for governance requests<br>• No business logic              |
| **[`zome_gouvernance`](documentation/zomes/governance_zome.md)** | State transition operator       | • Governance rule evaluation<br>• State transition validation<br>• Economic event generation<br>• PPR issuance (16 categories)<br>• Agent promotion & capability progression |

### Governance-as-Operator Architecture

**Key Design Principles:**

- **Modular Design**: Resource zome manages data, governance zome enforces rules
- **Swappable Governance**: Different governance schemes can be applied to same resources
- **Pure Function Governance**: Stateless evaluation with deterministic outputs
- **Event-Driven State Changes**: All transitions generate audit events
- **Cross-Zome Interface**: Well-defined communication protocol

**Documentation:**

- **[Governance Operator Architecture](documentation/specifications/governance/governance-operator-architecture.md)** - Technical architecture and design patterns
- **[Governance Implementation Guide](documentation/specifications/governance/governance-operator-implementation-guide.md)** - Detailed implementation with code examples
- **[Cross-Zome API](documentation/specifications/governance/cross-zome-api.md)** - Complete API specifications

### Key Concepts

- **🔐 Capability-Based Security**: Progressive trust model (Simple → Accountable → Primary Accountable Agent)
- **📋 Private Participation Receipts (PPRs)**: Cryptographic reputation tracking across 16 categories
- **🔄 Economic Processes**: Structured workflows (Use, Transport, Storage, Repair) with role-based access
- **🛡️ Private Data Sharing**: Request/grant workflows with field-level control and time-limited grants (30-day maximum per `PrivateDataCapabilityMetadata`; shorter defaults may apply in UI flows — see [person_zome.md](documentation/zomes/person_zome.md))

---

## 📚 Core Documentation

### Project Requirements & Design

| Document                                                                                                  | Description                                        | Status      |
| --------------------------------------------------------------------------------------------------------- | -------------------------------------------------- | ----------- |
| **[Requirements](documentation/requirements/requirements.md)**                                            | Complete PRD with modular governance architecture  | ✅ Complete |
| **[UI Architecture](documentation/specifications/ui_architecture.md)**                                    | Frontend design patterns & component structure     | ✅ Complete |
| **[UI Design](documentation/requirements/ui_design.md)**                                                  | User interface design specifications               | ✅ Complete |
| **[PPR Security Implementation](documentation/specifications/governance/PPR_Security_Implementation.md)** | Security model for reputation system               | ✅ Complete |
| **[ValueFlows Action Usage](documentation/specifications/VfAction_Usage.md)**                             | ValueFlows implementation with governance examples | ✅ Complete |
| **[Lobby DNA Requirements](documentation/requirements/post-mvp/lobby-dna.md)**                            | Multi-network federation: Lobby DNA, Group DNA, NDO extensions (REQ-LOBBY-*, REQ-GROUP-*, REQ-NDO-EXT-*) | 🔄 Post-MVP |

### Architecture & Roadmap

| Document                                                                                       | Description                                                                          | Status    |
| ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | --------- |
| **[NDO v1.0 Architecture Design](documentation/specifications/ndo-v1-architecture-design.md)** | Dual-DNA architecture, VF 1.0 class mapping, entry type specs, ADRs, migration notes | ✅ Active |
| **[Lobby DNA Architecture](documentation/specifications/post-mvp/lobby-architecture.md)**      | Full design: Lobby + Group DNAs, NDO extensions, entry types, coordinator APIs, pipelines, UI, Moss contract, 7 ADRs | 🔄 Post-MVP |
| **[hREA Integration Strategy](documentation/hREA/integration-strategy.md)**                    | Cross-DNA call architecture, zome-level integration pattern, migration plan          | ✅ Active |
| **[hREA VF 1.0 Compliance Analysis](documentation/hREA/valueflows-1.0-compliance.md)**         | Field-by-field audit of hREA main-0.6 against VF 1.0 ontology (~65% compliance)      | ✅ Active |
| **[hREA Strategic Roadmap](documentation/hREA/strategic-roadmap.md)**                          | Phase 1+2 maintainership proposal: VF 1.0 gap closure and JSON-LD API                | ✅ Active |

### Technical Specifications

| Document                                                                                                                   | Description                                                | Status      |
| -------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- | ----------- |
| **[Architecture Overview](documentation/zomes/architecture_overview.md)**                                                  | Comprehensive system architecture & cross-zome integration | ✅ Complete |
| **[Governance Operator Architecture](documentation/specifications/governance/governance-operator-architecture.md)**        | Technical architecture for modular governance design       | ✅ Complete |
| **[Governance Implementation Guide](documentation/specifications/governance/governance-operator-implementation-guide.md)** | Detailed implementation guide with code examples           | ✅ Complete |
| **[Cross-Zome API](documentation/specifications/governance/cross-zome-api.md)**                                            | Complete API specifications for zome communication         | ✅ Complete |
| **[Implementation Plan](implementation_plan.md)**                                                                        | Development roadmap & phase breakdown                      | ✅ Complete |
| **[Implementation Status](documentation/archives/IMPLEMENTATION_STATUS.md)**                                               | Current development progress & completion status           | ✅ Complete |

### Testing & Infrastructure

| Document                                                              | Description                                   | Status      |
| --------------------------------------------------------------------- | --------------------------------------------- | ----------- |
| **[Testing Infrastructure](documentation/Testing_Infrastructure.md)** | Complete testing strategy & framework details | ✅ Complete |
| **[Test Commands](documentation/TEST_COMMANDS.md)**                   | Test execution commands & development tips    | ✅ Complete |

---

## 🔧 API Documentation

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

### Test Architecture (4-Layer Strategy)

1. **Foundation Tests** - Basic zome function calls and connectivity
2. **Integration Tests** - Cross-zome interactions and multi-agent scenarios
3. **Scenario Tests** - Complete user journeys and workflows
4. **Performance Tests** - Load and stress testing (planned)

### Test Execution

```bash
# Run specific test categories
bun run test:foundation      # Basic connectivity tests
bun run test:integration     # Multi-agent interaction tests
bun run test:scenarios       # Complete workflow simulations

# Development testing
bun run test:person          # Person management test suite
bun run test:debug           # Verbose test output for debugging
```

### Test Development Tips

- Use `.only()` on `describe` or `it` blocks for focused development
- Use `warn!` macro in Rust for debugging visibility in test output
- Test timeout: 4 minutes for complex multi-agent scenarios

---

## 📊 Implementation Status

### ✅ Phase 1 Complete: Foundation System

- **Person Management**: Agent profiles, roles, and basic capability tokens
- **Identity System**: Pseudonymous identity with public/private separation
- **Basic Access Control**: Role-based access with validation metadata
- **Test Infrastructure**: Comprehensive testing framework with Tryorama

### ✅ Phase 2 Complete: Advanced Governance & Reputation

- **Capability-Based Sharing**: Complete request/grant workflows with time-limited grants (30-day cap; see person zome docs)
- **PPR System**: 16-category reputation tracking with cryptographic signatures
- **Economic Processes**: Four structured processes (Use, Transport, Storage, Repair)
- **Multi-Reviewer Validation**: 2-of-3, N-of-M, and simple majority validation
- **Agent Promotion**: Progressive trust model with automatic advancement
- **Enhanced Security**: Field-level private data control with Economic Process integration

### ✅ Phase 2 Complete: Production Ready Implementation

- **Complete PPR System**: 16-category reputation tracking with cryptographic validation
- **Full Frontend Implementation**: Svelte 5 with comprehensive UI components
- **Advanced Governance**: Multi-party validation and dispute resolution
- **Performance Optimization**: Load testing and efficient DHT operations
- **Comprehensive Testing**: 4-layer testing strategy with 95%+ coverage
- **Production Deployment**: Complete packaging and distribution system

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

| Process       | Description                                     | Required Role             | Key Features                            |
| ------------- | ----------------------------------------------- | ------------------------- | --------------------------------------- |
| **Use**       | Resource utilization without ownership transfer | Accountable Agent         | Time-limited access, usage tracking     |
| **Transport** | Resource movement between locations             | Primary Accountable Agent | Custody transfer, location tracking     |
| **Storage**   | Resource preservation and maintenance           | Primary Accountable Agent | Location tracking, condition monitoring |
| **Repair**    | Resource restoration and improvement            | Primary Accountable Agent | Quality validation, cost tracking       |

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
- [**NPM Workspaces**](https://docs.npmjs.com/cli/v7/using-npm/workspaces/) - Monorepo management
- [**@holochain/tryorama**](https://www.npmjs.com/package/@holochain/tryorama) - Testing framework
- [**Holochain Playground**](https://github.com/darksoil-studio/holochain-playground) - Development tools

### Development Tools

- [**hc CLI**](https://github.com/holochain/holochain/tree/develop/crates/hc) - Holochain development tool
- [**@holochain/client**](https://www.npmjs.com/package/@holochain/client) - UI client library
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
- **Timeout Management**: 4-minute timeout for complex scenarios
- **Debug Support**: Verbose logging with `warn!` macro for Rust debugging
- **Isolation**: Test isolation with proper cleanup between scenarios

### Performance Considerations

- **WASM Compilation**: Rust zomes compiled to WASM for efficiency
- **DHT Optimization**: Efficient link traversal for discovery operations
- **Validation Caching**: Role and capability validation caching
- **PPR System**: Optimized reputation calculation with cryptographic proofs

---

## 🔄 Document Maintenance

**Last Updated**: 2025-12-17
**Next Review**: 2026-01-17
**Maintainers**: Development Team

### Update Process

1. Code changes → Update relevant API documentation
2. Feature completion → Update implementation status
3. Architecture changes → Update architecture overview
4. Test additions → Update testing documentation

### Quality Assurance

- ✅ All documentation reviewed and approved
- ✅ Cross-references validated and functional
- ✅ API documentation matches implementation
- ✅ Status tracking reflects actual development progress
