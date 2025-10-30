# Nondominium Project Documentation Index

**Generated**: 2025-10-30
**Version**: 2.0 (Capability-based Sharing & PPR System)
**Status**: Phase 2 Complete - Advanced Governance & Reputation System

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
bun run test            # Full test suite
bun run test:person     # Person management tests
bun run test:debug      # Verbose test output

# Build
bun run build:zomes     # Compile Rust zomes to WASM
bun run package         # Create .webhapp distribution
```

---

## 🏗️ Architecture Overview

### System Architecture
- **Framework**: Holochain HDK/HDI 0.5.x-0.6.x (Rust + WASM)
- **Frontend**: Svelte 5.0 + TypeScript + Vite 6.2.5
- **Testing**: Vitest 3.1.3 + @holochain/tryorama 0.18.2
- **Client**: @holochain/client 0.19.0

### Zome Structure
| Zome | Purpose | Key Features |
|------|---------|--------------|
| **[`zome_person`](documentation/zomes/person_zome.md)** | Agent identity & access control | • Agent profiles & roles<br>• Capability-based security<br>• Private data sharing workflows<br>• PPR integration & reputation tracking |
| **[`zome_resource`](documentation/zomes/resource_zome.md)** | Resource lifecycle management | • EconomicResource & EconomicEvent handling<br>• Four Economic Processes (Use/Transport/Storage/Repair)<br>• Resource specifications & state management |
| **[`zome_gouvernance`](documentation/zomes/governance_zome.md)** | Governance & commitment management | • Commitments & claims<br>• PPR issuance (14 categories)<br>• Multi-reviewer validation<br>• Agent promotion & capability progression |

### Key Concepts
- **🔐 Capability-Based Security**: Progressive trust model (Simple → Accountable → Primary Accountable Agent)
- **📋 Private Participation Receipts (PPRs)**: Cryptographic reputation tracking across 14 categories
- **🔄 Economic Processes**: Structured workflows (Use, Transport, Storage, Repair) with role-based access
- **🛡️ Private Data Sharing**: Request/grant workflows with field-level control and 7-day expiration

---

## 📚 Core Documentation

### Project Requirements & Design
| Document | Description | Status |
|----------|-------------|--------|
| **[Requirements](documentation/requirements/requirements.md)** | Complete PRD with objectives & goals | ✅ Complete |
| **[UI Architecture](documentation/requirements/ui_architecture.md)** | Frontend design patterns & component structure | ✅ Complete |
| **[UI Design](documentation/requirements/ui_design.md)** | User interface design specifications | ✅ Complete |
| **[PPR Security Implementation](documentation/requirements/PPR_Security_Implementation.md)** | Security model for reputation system | ✅ Complete |
| **[ValueFlows Action Usage](documentation/requirements/VfAction_Usage.md)** | ValueFlows standard implementation patterns | ✅ Complete |

### Technical Specifications
| Document | Description | Status |
|----------|-------------|--------|
| **[Architecture Overview](documentation/zomes/architecture_overview.md)** | Comprehensive system architecture & cross-zome integration | ✅ Complete |
| **[Implementation Plan](documentation/archives/implementation_plan.md)** | Development roadmap & phase breakdown | ✅ Complete |
| **[Implementation Status](documentation/archives/IMPLEMENTATION_STATUS.md)** | Current development progress & completion status | ✅ Complete |

### Testing & Infrastructure
| Document | Description | Status |
|----------|-------------|--------|
| **[Testing Infrastructure](documentation/Testing_Infrastructure.md)** | Complete testing strategy & framework details | ✅ Complete |
| **[Test Commands](documentation/TEST_COMMANDS.md)** | Test execution commands & development tips | ✅ Complete |

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
- `grant_private_data_access()` - Grant time-limited access (7-day expiration)
- `get_private_data()` - Retrieve authorized private data
- `revoke_private_data_access()` - Revoke granted permissions

**Role Management**
- `assign_role()` - Assign roles with validation metadata
- `get_agent_roles()` - Query current role assignments
- `validate_role_requirements()` - Check role qualification status

### Resource Zome API
**Resource Specification**
- `create_resource_specification()` - Define resource types and properties
- `get_resource_specification()` - Retrieve specification details
- `update_resource_specification()` - Modify specifications with validation

**Economic Resource Management**
- `create_economic_resource()` - Create resource instances with lifecycle tracking
- `get_economic_resource()` - Retrieve resource state and history
- `update_economic_resource()` - Update resource state with audit trail

**Economic Process Management**
- `initiate_use_process()` - Start Use process with role validation
- `initiate_transport_process()` - Start Transport process with custody tracking
- `initiate_storage_process()` - Start Storage process with location tracking
- `initiate_repair_process()` - Start Repair process with validation requirements

### Governance Zome API
**Commitment Management**
- `create_commitment()` - Create commitments with validation rules
- `get_commitment()` - Retrieve commitment details
- `fulfill_commitment()` - Mark commitments as fulfilled

**PPR System**
- `issue_ppr()` - Issue Private Participation Receipt (14 categories)
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
- **Capability-Based Sharing**: Complete request/grant workflows with 7-day expiration
- **PPR System**: 14-category reputation tracking with cryptographic signatures
- **Economic Processes**: Four structured processes (Use, Transport, Storage, Repair)
- **Multi-Reviewer Validation**: 2-of-3, N-of-M, and simple majority validation
- **Agent Promotion**: Progressive trust model with automatic advancement
- **Enhanced Security**: Field-level private data control with Economic Process integration

### 🔄 Current Development Focus
- **Performance Optimization**: PPR system performance under load
- **Advanced Governance**: Dispute resolution and conflict handling
- **UI Integration**: Complete frontend implementation for all features
- **Documentation**: API documentation completion and user guides

---

## 🔍 Advanced Features

### Private Participation Receipt (PPR) System
**14 PPR Categories:**
1. **ResourceContribution** - Resource creation and validation
2. **ResourceValidation** - Resource quality assessment
3. **UseService** - Use process participation
4. **TransportService** - Transport service provision
5. **StorageService** - Storage service provision
6. **RepairService** - Repair service provision
7. **ServiceValidation** - Service quality assessment
8. **CommitmentFulfillment** - Commitment completion tracking
9. **GovernanceParticipation** - Governance activity participation
10. **Custodianship** - Resource custody responsibilities
11. **DisputeResolution** - Conflict resolution participation
12. **CoordinationService** - Coordination activities
13. **Mentorship** - Knowledge sharing and guidance
14. **CommunityBuilding** - Community development activities

### Economic Processes with Role-Based Access
| Process | Description | Required Role | Key Features |
|---------|-------------|---------------|--------------|
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
├── PPR eligibility: All 14 categories
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

**Last Updated**: 2025-10-30
**Next Review**: 2025-11-30
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