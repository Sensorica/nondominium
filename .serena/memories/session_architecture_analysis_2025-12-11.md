# Nondominium Architecture Analysis Session
**Date**: 2025-12-11
**Session Type**: Architecture Review and Context Loading

## Project Overview

**nondominium** is a ValueFlows-compliant resource sharing Holochain application implementing distributed, agent-centric resource management with embedded governance.

### Architecture Summary

**Core Structure:**
- **3-zome hApp**: zome_person, zome_resource, zome_gouvernance
- **Technology Stack**:
  - Backend: Rust (Holochain HDK 0.5.3 / HDI 0.6.3) compiled to WASM
  - Frontend: Svelte 5.0 + TypeScript + Vite 6.2.5
  - Testing: Vitest 3.1.3 + @holochain/tryorama 0.18.2
  - Client: @holochain/client 0.19.0

### Zome Architecture

1. **zome_person**:
   - Agent identity, profiles, roles
   - Capability-based access control
   - Device management
   - Private data handling

2. **zome_resource**:
   - Resource specifications (ResourceSpecification)
   - Economic resource instances (EconomicResource)
   - Governance rules (GovernanceRule)
   - Resource state management (PendingValidation, Active, Maintenance, Retired, Reserved)

3. **zome_gouvernance**:
   - Commitments and economic events
   - Private Participation Receipts (PPRs) for reputation
   - Validation mechanisms
   - Governance rule enforcement

### Current Development Status

- **Phase 1 Complete**: Person management with role-based access control
- **Phase 2 In Progress**: Resource lifecycle and governance implementation
- **Recent Focus**: PPR system overhaul and device management enhancements

### Key Patterns Identified

1. **Entry Creation Pattern**:
   ```rust
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

2. **Privacy Model**:
   - Public Data: Person entries with name/avatar (discoverable)
   - Private Data: EncryptedProfile entries with PII (access-controlled)
   - Role Assignments: Linked to profiles with validation metadata

3. **Function Naming Convention**:
   - `create_[entry_type]`: Creates new entries with anchor links
   - `get_[entry_type]`: Retrieves entries by hash
   - `get_all_[entry_type]`: Discovery via anchor links
   - `update_[entry_type]`: Updates existing entries
   - `delete_[entry_type]`: Marks entries as deleted

### Testing Architecture

**4-Layer Strategy**:
1. Foundation Tests: Basic zome function calls and connectivity
2. Integration Tests: Cross-zome interactions and multi-agent scenarios
3. Scenario Tests: Complete user journeys and workflows
4. Performance Tests: Load and stress testing

**Configuration**:
- Timeout: 4 minutes for complex multi-agent scenarios
- Concurrency: Single fork execution for DHT consistency
- Agent Simulation: Supports 2+ distributed agents per test

### Development Environment

- Nix-based reproducible environment (required)
- bun package manager
- Multi-agent testing capabilities
- Holochain Playground integration

### Key Insights from Recent Commits

1. Recent focus on PPR (Private Participation Receipt) system
2. Device management enhancements with proper record versioning
3. Resource specification clarity improvements
4. ValueFlows integration progress

### Next Development Areas

1. Complete Phase 2 implementation:
   - Resource lifecycle management
   - Governance rule enforcement
   - PPR system integration

2. Testing enhancement:
   - Complete scenario test coverage
   - Performance testing implementation
   - Multi-agent stress testing

3. Documentation:
   - API documentation
   - User guides
   - Developer onboarding

## Session Notes

- The codebase follows Holochain best practices
- Strong separation of concerns between zomes
- ValueFlows compliance is a core design principle
- Embedded governance enables organization-agnostic resources
- The project aims to support a peer sharing economy without centralized platform control