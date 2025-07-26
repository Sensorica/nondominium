# nondominium Implementation Plan

## 1. Executive Summary

This plan details the phased implementation of the nondominium hApp, a decentralized, organization-agnostic resource management system built on Holochain and ValueFlows. The plan ensures progressive trust, embedded governance, and strict compliance with the requirements and technical specifications.

---

## 2. Implementation Principles

- **ValueFlows Compliance**: All data structures and flows adhere to the ValueFlows standard.
- **Agent-Centric Design**: All data and validation flows from the perspective of individual agents.
- [ ] Progressive Trust: Agents earn capabilities through validation (Simple → Accountable → Primary Accountable).
- **Embedded Governance**: Rules and access control are enforced at the resource and agent level.
- **Capability-Based Security**: All access is managed through Holochain capability tokens.

---

## 3. Implementation Phases

### Phase 1: Foundation Layer ✅ **COMPLETED**

#### 3.1 Agent Identity & Role System (`zome_person`) ✅ **COMPLETED**
- [x] Implement `Person` (public info) and `PrivateData` (private entry, PII).
- [x] Implement `Role` entry with validation metadata and links to validation receipts.
- [x] **Modular Architecture**: Refactored into `person.rs`, `private_data.rs`, `role.rs` modules
- [x] **Comprehensive Error Handling**: PersonError enum with detailed error types
- [x] Functions:
  - [x] `create_person()`, `store_private_data()`, `get_person()`, `get_all_people()`
  - [x] `assign_role()`, `update_role()`, `get_agent_roles()`, `get_all_roles()`
  - [x] **Testing**: Comprehensive test suite with foundation, integration, and scenario tests

#### 3.2 Resource Management (`zome_resource`) ✅ **COMPLETED**
- [x] Implement `ResourceSpecification` with embedded governance rules.
- [x] Implement `EconomicResource` with custodian tracking.
- [x] **Modular Architecture**: Refactored into `resource_specification.rs`, `economic_resource.rs`, `governance_rule.rs`
- [x] **Comprehensive Error Handling**: ResourceError enum with governance violation support
- [x] **Signal System**: Complete post-commit signal handling for DHT coordination
- [x] Functions:
  - [x] `create_resource_specification()`, `get_resource_specification()`, `get_all_resource_specifications()`
  - [x] `create_economic_resource()`, `get_economic_resource()`, `get_all_economic_resources()`
  - [x] `update_economic_resource()`, `transfer_custody()` (with governance enforcement)
  - [x] **Testing**: Comprehensive test suite with integration and scenario coverage

#### 3.3 Basic Validation Framework ⚠️ **GOVERNANCE ZOME INTEGRATION NEEDED**
- [ ] Cross-zome validation calls between resource and governance zomes
- [x] **Utils Crate**: Shared utilities for cross-zome functionality and standardized patterns
- [ ] Validation logic integration for resource creation and agent promotion

---

### Phase 2: Governance Layer ⚠️ **IN PROGRESS**

#### 3.4 Economic Event System (`zome_governance`) 🔄 **NEXT PRIORITY**
- [ ] **Integration Priority**: Cross-zome calls from resource zome to governance validation
- [ ] Implement `EconomicEvent`, `Commitment`, and `Claim` entries
- [ ] Functions:
  - [ ] `validate_new_resource()` (called from resource zome, peer validation schemes)
  - [ ] `validate_agent_identity()` (agent promotion workflow)
  - [ ] `log_economic_event()`, `propose_commitment()`, `claim_commitment()`
  - [ ] `check_validation_status()`, `get_validation_history()`

#### 3.5 Peer Validation & Promotion 🔄 **NEXT PRIORITY**
- [ ] **Critical Integration**: Connect resource creation with governance validation
- [ ] Implement validation workflows:
  - [ ] Resource validation (REQ-GOV-03, REQ-GOV-04) - **blocks resource finalization**
  - [ ] Specialized role validation (REQ-GOV-06) - **blocks role assignment**
  - [ ] Agent promotion (REQ-GOV-08) - **blocks capability escalation**
- [ ] Validation receipt linking and audit trail completion

---

### Phase 3: Access Control & Security

#### 3.6 Capability-Based Security
- [ ] Implement `general_access` and `restricted_access` tokens.
- [ ] Apply capability requirements to all zome functions.
- [ ] Implement capability grant/revoke and upgrade workflows.

#### 3.7 Membrane & Network Access
- [ ] Implement permissionless but trackable membrane.
- [ ] Agent joining validation and network access logging.

#### 3.8 Cross-Zome Coordination
- [ ] Ensure all transactional operations (e.g., custody transfer) are atomic and cross-zome consistent.
- [ ] Implement rollback mechanisms for failed operations.

---

### Phase 4: Advanced Features & Optimization

#### 3.9 Advanced Governance & Validation
- [ ] Implement N-of-M and reputation-based validation schemes.
- [ ] Add validator selection and weighting algorithms.
- [ ] Implement advanced dispute resolution and audit trails.

#### 3.10 Performance & Scalability
- [ ] Optimize DHT anchor strategies and distributed queries.
- [ ] Implement caching and parallel validation processing.

---

## 4. Quality Assurance

- **Test-Driven Development**: Write tests before implementation.
- **Incremental Integration**: Continuous integration between zomes.
- **Documentation-First**: Update specs before coding changes.
- **Unit, Integration, and Network Testing**: Validate all workflows, especially validation and promotion.

---

## 5. Risk Mitigation

- **Cross-Zome Dependencies**: Mitigated by interface design and testing.
- **Validation Complexity**: Addressed through modular validation functions.
- **Performance Bottlenecks**: Handled via incremental optimization and monitoring.
- **Validation Gaming**: Prevented through multi-reviewer schemes and audit trails.

---

## 6. Success Metrics

### Phase 1 Achievements ✅
- [x] **Person Management**: Complete agent identity system with public/private data separation
- [x] **Resource Management**: Full resource specification and economic resource lifecycle
- [x] **Modular Architecture**: Clean separation of concerns across both zomes
- [x] **Comprehensive Testing**: Foundation, integration, and scenario test coverage
- [x] **Error Handling**: Robust error types and proper DHT signal handling

### Phase 2 Targets 🎯
- [ ] **Cross-Zome Integration**: Resource creation triggers governance validation
- [ ] **Validation Workflows**: All validation and promotion workflows operational
- [ ] **Capability-Based Security**: Role-based access control enforcement
- [ ] **Agent Progression**: Simple → Accountable → Primary Accountable promotion paths
- [ ] **Audit Trail**: Complete validation receipt and governance rule tracking

---

## 7. UI Development Plan 🎨 **READY FOR IMPLEMENTATION**

### Current Frontend Status
- **Base Setup**: Svelte 5.0 + TypeScript + Vite 6.2.5 development environment
- **Holochain Client**: @holochain/client 0.19.0 integration ready
- **Architecture Foundation**: Prepared for 7-layer Effect-TS architecture

### Phase 1: Foundation UI 🚀 **NEXT PHASE**
- [ ] **SvelteKit Migration**: Convert from vanilla Svelte to full-stack framework
- [ ] **TailwindCSS Integration**: Add utility-first styling with design system
- [ ] **Effect-TS Integration**: Functional programming layer for complex async state
- [ ] **HolochainClientService**: Type-safe DHT connection with error handling

### Phase 2: Service Layer Architecture 🏗️
- [ ] **PersonService**: Complete CRUD operations for Person + PrivateData entries
- [ ] **ResourceService**: Resource specification and economic resource management
- [ ] **RoleService**: Role assignment with capability-based access control
- [ ] **Error Context System**: Comprehensive error types matching backend zomes

### Phase 3: Store Architecture (Effect-TS) 📊
- [ ] **PersonStore**: Agent profiles + community directory with search/filter
- [ ] **ResourceStore**: Resource specifications + economic resources + custody tracking
- [ ] **RoleStore**: Role assignments + capability checking + permissions matrix
- [ ] **ValidationStore**: Governance workflows + validation status tracking

### Phase 4: UI Components & Pages 🖼️
- [ ] **Person Management**: Profile creation, community directory, role assignment
- [ ] **Resource Management**: Specification creation, resource tracking, custody transfer
- [ ] **Governance Interface**: Validation workflows, approval processes, audit trails
- [ ] **Role-Based UI**: Dynamic permission-based component rendering

### UI Architecture Benefits
- **Backend Integration**: Direct mapping to completed person + resource zomes
- **Type Safety**: End-to-end type safety from Rust entries to UI components  
- **Governance Ready**: Architecture supports Phase 2 validation workflows
- **Progressive Enhancement**: Can demonstrate Phase 1 features immediately

---

## 8. Roadmap & Future Enhancements

- **Mobile Interface**: Progressive Web App capabilities
- **Interoperability**: Integration with other ValueFlows systems
- **Analytics**: Resource usage and network health dashboards
- **Governance Evolution**: Community-driven rule changes and advanced role hierarchies

---

This plan ensures the nondominium hApp will fulfill its vision of decentralized, commons-based resource management, with robust governance and validation at every layer, in strict alignment with the requirements and technical specifications. 