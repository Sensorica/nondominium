# nondominium - System Architecture

## Overview
This document contains the system architecture specifications for the nondominium Holochain application, extracted from the main technical specifications document.

## Holochain DNA and Zome Structure

The hApp is composed of three distinct zomes, providing separation of concerns and enhanced modularity:

- **`zome_person`**: Handles agent identity, profiles, roles, and reputation
- **`zome_resource`**: Manages the lifecycle of Economic Resources and their Specifications
- **`zome_governance`**: Implements the logic for Commitments, Claims, and PPR issuance

## Guiding Principles

### Valueflows Compliance
Data structures adhere to the Valueflows standard for economic resource tracking.

### Agent-Centricity
All data is created and validated from the perspective of the individual agent.

### Capability-Based Security
Access and permissions are managed through Holochain's capability token mechanism.

## Security and Validation Architecture

### Capability Tokens
- **Simple Agents**: Receive general capability tokens
- **Accountable Agents**: Receive restricted capability tokens after first validated transaction

### Validation Logic by Zome

#### `zome_person` Integrity Zome
- Validates that only Accountable Agents can assign Roles
- Ensures specialized roles (Transport, Repair, Storage) require validation by existing Primary Accountable Agents
- Validates promotion from Simple Agent to Accountable Agent requires validation

#### `zome_resource` Integrity Zome
- Ensures a resource cannot be created without a valid ResourceSpecification
- Enforces embedded governance rules
- Ensures new resources start in 'pending validation' state and are set to 'validated' upon successful peer review
- Validates that Economic Processes can only be initiated by agents with appropriate roles

#### `zome_governance` Integrity Zome
- Ensures a Claim matches its Commitment
- Validates all validation receipts for authenticity
- Supports configurable validation schemes (e.g., 2-of-3, N-of-M reviewers)

### Cross-Zome Validation
- Functions call other zomes to maintain transactional integrity
- Example: `transfer_custody` must create a valid EconomicEvent and enforce governance rules
- Example: `initiate_economic_process` must validate agent roles across zomes

## Key Business Rules

### First Resource Requirement
- Simple Agents must create at least one resource before accessing others
- Implemented through the `check_first_resource_requirement` function

### Process Role Enforcement
- Economic Processes enforce role-based access control
- Specialized processes (Transport, Repair, Storage) require agents to hold appropriate validated credentials
- Use processes are accessible to all Accountable Agents

### Private Participation Receipt (PPR) Validation
- PPR issuance is automatically triggered for every completed economic interaction
- Bi-directional receipt generation ensures both agents receive appropriate participation claims
- Cryptographic signature validation ensures authenticity and prevents manipulation
- Performance metrics are validated to be within acceptable ranges
- End-of-life declarations require multiple validator participation receipts

## ValueFlows Integration

### REA Model Implementation
- **Resources**: Economic resources that can be shared and used
- **Events**: Economic actions that affect resource state
- **Agents**: Participants in economic interactions

### Standard Actions Support
- Supports all relevant ValueFlows actions with nondominium-specific extensions
- Implements Transfer, Use, Produce, InitialTransfer, AccessForUse, TransferCustody actions

### Multi-Layer Ontology
- **Knowledge Layer**: Plans and specifications
- **Plan Layer**: Commitments and intended actions
- **Observation Layer**: Economic events and actual outcomes

## Data Integrity Architecture

### Entry Validation
- Comprehensive validation logic in integrity zomes
- Type checking and business rule enforcement
- Cross-reference validation between related entries

### Link Management
- Proper linking between related entries across zomes
- Anchor-based discovery patterns
- Metadata preservation in link tags

### State Management
- Resource and process state tracking with proper transitions
- Validation of state changes according to business rules
- Audit trail maintenance for all state modifications

## Privacy Architecture

### Private Entry Storage
- Personal identification information stored as Holochain private entries
- Private Participation Receipts stored privately while enabling reputation derivation
- Agents control what private information to share and with whom

### Selective Disclosure
- Granular control over private data sharing
- Capability-based access to private information
- Cryptographic proof mechanisms without data exposure

## Network Architecture

### Membrane Validation
- DNA membrane controls network entry
- Permissionless access for Proof of Concept with validation hooks
- Configurable entry requirements for production deployment

### Dispute Resolution
- Edge-based dispute resolution involving recent interaction partners
- Reputation-based dispute weighting
- Cryptographic evidence preservation

### Consensus Mechanisms
- Validation scheme support (simple majority, 2-of-3, N-of-M)
- Role-gated validation for critical operations
- Automated validation workflows where possible

## Performance Considerations

### Scalability Design
- Distributed validation to prevent bottlenecks
- Efficient DHT query patterns
- Optimized link traversal for discovery operations

### Resource Management
- Efficient private entry storage and retrieval
- Optimized reputation calculation algorithms
- Minimal data replication requirements

### Network Efficiency
- Batch operations where possible
- Compressed data structures
- Efficient cross-zome communication patterns