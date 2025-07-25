# Nondominium Implementation Plan

## 1. Executive Summary

This document outlines the implementation strategy for the Nondominium hApp, a foundational infrastructure for organization-agnostic, capture-resistant resources built on Holochain using ValueFlows standards. The implementation follows a phased approach, prioritizing core functionality and progressive capability enhancement.

## 2. Implementation Philosophy

Based on the [Nondominium project documentation](https://www.sensorica.co/environment/hrea-demo-for-nrp-cas/nondominium), our implementation adheres to these core principles:

- **Agent-Centric Design**: All data and validation flows from the perspective of individual agents
- **Progressive Trust**: Simple Agents → Accountable Agents → Primary Accountable Agents through validation
- **Embedded Governance**: Rules and access control built into the resource substrate itself
- **ValueFlows Compliance**: Ensuring interoperability with other economic coordination systems

## 3. Implementation Phases

### Phase 1: Foundation Layer (Core Infrastructure)
**Duration**: 2-3 weeks  
**Priority**: Critical  
**Dependencies**: None

#### 3.1 Agent Identity System (`zome_person`)
- [ ] **Person Entry Type**
  - [ ] Define `Person` struct with `name`, `avatar_url`
  - [ ] Implement validation rules for person creation
  - [ ] Add anchor links for agent discovery (`AllPeople -> Person`)

- [ ] **Private Identity Storage**
  - [ ] Define `PrivateAgentData` entry type as a Holochain private entry (see https://developer.holochain.org/build/entries/)
  - [ ] Link private data to public profiles

- [ ] **Role System Foundation**
  - [ ] Define `Role` entry type with validation metadata
  - [ ] Implement role assignment validation (Accountable Agents only)
  - [ ] Create role query functions

- [ ] **Core Functions**
  - [ ] `create_person()` - Public profile creation
  - [ ] `store_private_data()` - PII storage as a private entry
  - [ ] `get_agent_profile()` - Profile retrieval
  - [ ] `get_all_agents()` - Network discovery

#### 3.2 Resource Management (`zome_resource`)
- [ ] **Resource Specification System**
  - [ ] Define `ResourceSpecification` entry type
  - [ ] Implement governance rules storage in spec
  - [ ] Add validation for spec creation (restricted to Accountable Agents)

- [ ] **Economic Resource Tracking**
  - [ ] Define `EconomicResource` entry type with custodian tracking
  - [ ] Implement resource-to-spec validation
  - [ ] Add custodian transfer logic

- [ ] **Core Functions**
  - [ ] `create_resource_spec()` - Define new resource types
  - [ ] `create_economic_resource()` - Instantiate resources
  - [ ] `get_all_resource_specs()` - Discovery
  - [ ] `get_resources_by_spec()` - Filtered discovery
  - [ ] `get_my_resources()` - Personal inventory

#### 3.3 Basic Validation Framework
- [ ] **Validation Infrastructure**
  - [ ] Implement basic entry validation in all integrity zomes
  - [ ] Set up cross-zome validation calls
  - [ ] Create validation receipt system

### Phase 2: Governance Layer (Economic Events & Validation)
**Duration**: 3-4 weeks  
**Priority**: High  
**Dependencies**: Phase 1 complete

#### 3.4 Economic Event System (`zome_gouvernance`)
- [ ] **Event Tracking**
  - [ ] Define `EconomicEvent` entry type
  - [ ] Implement action validation ("transfer-custody", "use", "produce")
  - [ ] Link events to resources and agents

- [ ] **Commitment/Claim Protocol**
  - [ ] Define `Commitment` entry type for future intentions
  - [ ] Define `Claim` entry type for commitment fulfillment
  - [ ] Implement commitment-claim validation logic

- [ ] **Core Functions**
  - [ ] `log_economic_event()` - Record completed actions
  - [ ] `propose_commitment()` - Signal future intentions
  - [ ] `claim_commitment()` - Fulfill commitments

#### 3.5 Peer Validation System
- [ ] **Resource Validation**
  - [ ] `validate_new_resource()` - Peer validation for new resources
  - [ ] Implement 2-of-3 validation logic for resource approval
  - [ ] Create validation status tracking

- [ ] **Process Event Validation**
  - [ ] `validate_process_event()` - Validate Storage/Repair/Transport events
  - [ ] Implement role-based validation rules
  - [ ] Create process-specific validation logic

- [ ] **Agent Identity Validation**
  - [ ] `validate_agent_identity()` - Validate Simple Agent → Accountable Agent promotion
  - [ ] Implement private profile verification
  - [ ] Create validation receipt system

### Phase 3: Access Control & Security Layer
**Duration**: 2-3 weeks  
**Priority**: High  
**Dependencies**: Phase 2 complete

#### 3.6 Capability-Based Security
- [ ] **Capability Token System**
  - [ ] Implement `general_access` token for Simple Agents
  - [ ] Implement `restricted_access` token for Accountable Agents
  - [ ] Create capability grant/revoke functions

- [ ] **Function-Level Security**
  - [ ] Apply capability requirements to all zome functions
  - [ ] Implement capability validation in coordinator zomes
  - [ ] Create capability upgrade workflow

- [ ] **Membrane Implementation**
  - [ ] Design permissionless but trackable membrane
  - [ ] Implement agent joining validation
  - [ ] Create network access logging

#### 3.7 Cross-Zome Coordination
- [ ] **Transaction Integrity**
  - [ ] Implement `transfer_custody()` with automatic event logging
  - [ ] Create atomic operations across zomes
  - [ ] Add rollback mechanisms for failed operations

- [ ] **Signal System**
  - [ ] Implement real-time updates for resource changes
  - [ ] Create notification system for commitment proposals
  - [ ] Add event broadcasting for validation requests

### Phase 4: Advanced Features & Optimization
**Duration**: 3-4 weeks  
**Priority**: Medium  
**Dependencies**: Phase 3 complete

#### 3.8 Advanced Governance Features
- [ ] **Multi-Signature Validation**
  - [ ] Implement N-of-M validation schemes
  - [ ] Create validator selection algorithms
  - [ ] Add reputation-based validation weighting

- [ ] **Process Specification System**
  - [ ] Define workflow templates for common processes
  - [ ] Implement input/output resource mapping
  - [ ] Create process execution tracking

- [ ] **Resource Lifecycle Management**
  - [ ] Add resource state tracking (active, maintenance, retired)
  - [ ] Implement automatic maintenance scheduling
  - [ ] Create resource degradation models

#### 3.9 Performance & Scalability
- [ ] **DHT Optimization**
  - [ ] Implement efficient anchor strategies
  - [ ] Create distributed query mechanisms
  - [ ] Add caching for frequently accessed data

- [ ] **Validation Optimization**
  - [ ] Implement lazy validation for non-critical operations
  - [ ] Create validation queue management
  - [ ] Add parallel validation processing

## 4. Technical Implementation Strategy

### 4.1 Development Methodology
- **Test-Driven Development**: Write tests before implementation
- **Incremental Integration**: Continuous integration between zomes
- **Documentation-First**: Update specs before coding changes

### 4.2 Quality Assurance
- **Unit Testing**: Individual function testing in each zome
- **Integration Testing**: Cross-zome interaction validation
- **Network Testing**: Multi-agent scenarios with validation

### 4.3 Code Organization
```
dnas/nondominium/zomes/
├── integrity/
│   ├── zome_person/         # Agent identity & roles
│   ├── zome_resource/       # Resource specifications & instances
│   └── zome_gouvernance/    # Events, commitments, validation
└── coordinator/
    ├── zome_person/         # Identity management functions
    ├── zome_resource/       # Resource management functions
    └── zome_gouvernance/    # Governance & validation functions
```

## 5. Risk Mitigation

### 5.1 Technical Risks
- **Cross-Zome Dependencies**: Mitigated by careful interface design and testing
- **Validation Complexity**: Addressed through modular validation functions
- **Performance Bottlenecks**: Handled via incremental optimization and monitoring

### 5.2 Governance Risks
- **Validation Gaming**: Prevented through reputation systems and stake requirements
- **Resource Disputes**: Resolved through transparent validation history
- **Access Control Bypass**: Mitigated by capability token validation

## 6. Success Metrics

### 6.1 Functional Metrics
- [ ] Simple Agent can create and transfer first resource
- [ ] Accountable Agent can validate resources and events
- [ ] Primary Accountable Agent can manage resource custody
- [ ] All validation workflows function correctly

### 6.2 Performance Metrics
- [ ] Resource creation: < 2 seconds
- [ ] Validation completion: < 10 seconds
- [ ] Network discovery: < 5 seconds
- [ ] Cross-zome calls: < 1 second

### 6.3 Security Metrics
- [ ] No unauthorized capability escalation
- [ ] All sensitive data properly stored as private entries
- [ ] Validation cannot be bypassed
- [ ] Resource ownership is immutable

## 7. Future Roadmap

### Post-MVP Enhancements
- **UI Integration**: Web-based interface for resource management
- **Mobile Support**: Native mobile apps for resource access
- **Interoperability**: Integration with other ValueFlows systems
- **Analytics**: Resource usage and network health dashboards
- **Governance Evolution**: Community-driven rule changes

## 8. Implementation Notes

### 8.1 Key Design Decisions
- **Three-Zome Architecture**: Separation of concerns for maintainability
- **Progressive Trust Model**: Earned capabilities through validation
- **Embedded Governance**: Rules stored with resources, not centrally

### 8.2 Compliance Considerations
- **ValueFlows Alignment**: All data structures map to ValueFlows vocabulary
- **Nondominium Principles**: Resources remain organization-agnostic and capture-resistant
- **Holochain Best Practices**: Proper use of validation, links, and capabilities

This implementation plan ensures the Nondominium hApp will fulfill its vision of creating truly decentralized, commons-based resource management while maintaining the technical rigor required for a production system. 