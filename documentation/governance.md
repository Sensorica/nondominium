# Governance in nondominium

## Overview

This document outlines the governance system implemented in the nondominium project, built on Holochain and using ValueFlows vocabulary and patterns. The governance system is implemented in the `zome_gouvernance` zome and provides the infrastructure for managing economic activities, validation, and accountability in a decentralized sharing economy.

## Core Governance Concepts

### 1. REA Pattern (Resources, Events, Agents)

The governance system is built on the ValueFlows REA (Resource, Event, Agent) ontology:

- **Agents**: Individual persons who perform Economic Events affecting Economic Resources
- **Economic Events**: Actions that produce, modify, use, or transfer Economic Resources
- **Economic Resources**: Useful goods, services, knowledge, or any other value that agents agree to account for

### 2. Multi-Layered Ontology

The governance system operates across three levels as defined in ValueFlows:

- **Knowledge Level**: Policies, procedures, rules, and patterns (governance rules and validation schemes)
- **Plan Level**: Offers, requests, schedules, and promises (commitments and intents)
- **Observation Level**: What actually happened (events, claims, and their fulfillment)

## Governance Structures

### 1. Validation System

#### ValidationReceipt
```rust
pub struct ValidationReceipt {
    pub validator: AgentPubKey,
    pub validated_item: ActionHash,
    pub validation_type: String,
    pub approved: bool,
    pub notes: Option<String>,
    pub validated_at: Timestamp,
}
```

**Purpose**: Records validation decisions made by accountable agents on resources, events, or other agents.

**Governance Functions**:
- **Resource Approval**: Validating that resources meet quality and safety standards
- **Process Validation**: Ensuring processes follow agreed-upon protocols
- **Identity Verification**: Confirming agent identities and credentials
- **Compliance Checking**: Verifying adherence to governance rules

#### ResourceValidation
```rust
pub struct ResourceValidation {
    pub resource: ActionHash,
    pub validation_scheme: String,
    pub required_validators: u32,
    pub current_validators: u32,
    pub status: String,
    pub created_at: Timestamp,
    pub updated_at: Timestamp,
}
```

**Purpose**: Manages validation workflows for resources requiring multiple validators.

**Governance Functions**:
- **Multi-Signature Validation**: Requiring multiple validators for high-value resources
- **Validation Schemes**: Supporting different validation protocols (e.g., "2-of-3", "simple_majority")
- **Status Tracking**: Monitoring validation progress and outcomes

### 2. Economic Event Tracking

#### EconomicEvent
```rust
pub struct EconomicEvent {
    pub action: VfAction,
    pub provider: AgentPubKey,
    pub receiver: AgentPubKey,
    pub resource_inventoried_as: ActionHash,
    pub affects: ActionHash,
    pub resource_quantity: f64,
    pub event_time: Timestamp,
    pub note: Option<String>,
}
```

**Purpose**: Records all economic activities and resource flows in the system.

**Governance Functions**:
- **Audit Trail**: Complete record of all economic activities
- **Provenance Tracking**: Following resource flows forward and backward
- **Compliance Monitoring**: Ensuring activities follow governance rules
- **Performance Analysis**: Supporting accountability and transparency

### 3. Commitment and Claim System

#### Commitment
```rust
pub struct Commitment {
    pub action: VfAction,
    pub provider: AgentPubKey,
    pub receiver: AgentPubKey,
    pub resource_inventoried_as: Option<ActionHash>,
    pub resource_conforms_to: Option<ActionHash>,
    pub input_of: Option<ActionHash>,
    pub due_date: Timestamp,
    pub note: Option<String>,
    pub committed_at: Timestamp,
}
```

**Purpose**: Represents agreed-upon future actions between agents.

**Governance Functions**:
- **Contractual Agreements**: Formalizing promises between agents
- **Planning and Coordination**: Supporting operational planning
- **Accountability**: Creating clear expectations and obligations
- **Dispute Resolution**: Providing basis for conflict resolution

#### Claim
```rust
pub struct Claim {
    pub fulfills: ActionHash,
    pub fulfilled_by: ActionHash,
    pub claimed_at: Timestamp,
    pub note: Option<String>,
}
```

**Purpose**: Links commitments to their fulfillment through economic events.

**Governance Functions**:
- **Obligation Tracking**: Monitoring fulfillment of commitments
- **Reciprocal Claims**: Managing reciprocal obligations in exchanges
- **Dispute Resolution**: Supporting claims and counter-claims
- **Performance Measurement**: Tracking agent reliability and performance

## Agent Roles and Permissions

### 1. Simple Agent
- **Capabilities**: General capability token
- **Permissions**:
  - Search and discover nondominium resources
  - Create new nondominium resources
  - Complete identity verification
  - Make first transaction to become Accountable Agent

### 2. Accountable Agent
- **Capabilities**: Restricted capability token
- **Permissions**:
  - All Simple Agent permissions
  - Signal intent to access resources
  - Acquire specialized roles (Repair, Transport, Storage)
  - Validate other agents and resources
  - Participate in validation workflows

### 3. Primary Accountable Agent (Custodian)
- **Capabilities**: Full capability token
- **Permissions**:
  - All Accountable Agent permissions
  - Hold custody of material resources
  - Apply governance rules programmatically
  - Hold shared credentials with access conditions
  - Validate other agents for specialized roles

## Governance Rules and Validation

### 1. Access Control Rules
- **Permissionless Access**: Anyone can access resources under defined rules
- **Role-Based Access**: Different permissions based on agent roles
- **Validation Requirements**: Resources may require validation before access
- **Custody Transfer**: Rules for transferring resource custody between agents

### 2. Validation Schemes
- **Simple Validation**: Single validator approval
- **Multi-Signature**: Multiple validators required
- **Majority Rule**: Simple majority of validators
- **Consensus**: All validators must approve

### 3. Governance Rule Types
- **Access Requirements**: Who can access resources and under what conditions
- **Usage Limits**: Restrictions on how resources can be used
- **Transfer Conditions**: Rules for transferring resources between agents
- **Maintenance Obligations**: Requirements for resource maintenance and care

### 4. Role-Specific Validation Rules

Agents seeking to acquire specialized roles such as **Transport**, **Repair**, and **Storage** must undergo additional validation, as defined in the nondominium governance model ([Sensorica nondominium](https://www.sensorica.co/environment/hrea-demo-for-nrp-cas/nondominium)):

- **Eligibility**: Only Accountable Agents or Primary Accountable Agents may request these roles.
- **Validation Process**:
  1. The agent submits a request to acquire a specialized role (Transport, Repair, or Storage).
  2. The request is reviewed by one or more existing Primary Accountable Agents who already hold the relevant role.
  3. The reviewing agents validate the applicant's credentials, history, and, if required, their identity and prior actions.
  4. Upon successful validation, a ValidationReceipt is issued, and the role is granted to the agent.
  5. The system may require a minimum number of validators (e.g., 2-of-3 or majority) depending on the resource or process sensitivity.
- **Criteria for Validation**:
  - Demonstrated trustworthiness and accountability (e.g., successful prior transactions, positive validation history)
  - Sufficient knowledge or credentials for the requested role
  - Compliance with any additional governance rules or obligations (e.g., maintenance standards for Storage, safety for Transport)
- **Revocation**: Roles can be revoked if the agent violates governance rules, as determined by a validation process involving other Primary Accountable Agents.

These validation rules ensure that only qualified and trusted agents can access and perform critical roles, supporting the self-governance, capture resistance, and accountability principles of the nondominium system.

## Economic Actions (VfAction)

The governance system supports almost all ValueFlows economic actions:

### Standard ValueFlows Actions
- **Transfer**: Transfer ownership/custody
- **Move**: Move resources between locations
- **Use**: Use resources without consuming
- **Produce**: Create/produce new resources
- **Work**: Apply work/labor to resources
- **Modify**: Modify existing resources
- **Combine**: Combine multiple resources
- **Separate**: Separate resources into multiple
- **Raise**: Increase resource quantity/value
- **Lower**: Decrease resource quantity/value
- **Cite**: Reference or cite resources
- **Accept**: Accept delivery or responsibility

### nondominium-Specific Actions
- **InitialTransfer**: First transfer by a Simple Agent
- **AccessForUse**: Request access to use a resource
- **TransferCustody**: Transfer custody (nondominium specific)

## Governance Workflows

### 1. Resource Creation and Validation
1. Simple Agent creates new nondominium resource
2. Resource enters "pending_validation" state
3. Accountable Agents validate resource
4. Resource becomes available for access

### 2. Access Request and Approval
1. Accountable Agent signals intent to access resource
2. Primary Accountable Agent (custodian) reviews request
3. Governance rules are applied programmatically
4. Access is granted or denied based on rules and validation

### 3. Custody Transfer
1. Current custodian initiates transfer
2. New custodian accepts responsibility
3. Transfer event is recorded
4. Links are updated to reflect new custody

### 4. Validation Workflows
1. Resource requires validation
2. Validation scheme determines required validators
3. Validators review and approve/reject
4. Validation status is updated
5. Resource becomes available or rejected

## Implementation Details

### 1. Zome Structure
The governance system is implemented in `zome_gouvernance` with the following components:

- **Entry Types**: ValidationReceipt, EconomicEvent, Commitment, Claim, ResourceValidation
- **Link Types**: Various link types for connecting governance entities
- **Functions**: CRUD operations for all governance entities

### 2. Integration with Other Zomes
- **zome_person**: Agent identity and role management
- **zome_resource**: Resource specification and economic resource management
- **Cross-zome validation**: Governance rules applied across all zomes

### 3. Security and Privacy
- **Capability-based security**: Access control through capability tokens
- **Pseudonymity**: Agent identities can be pseudonymous
- **Private entries**: Sensitive information (such as user identity and PII) is stored as Holochain private entries in the agent's source chain, not as encrypted blobs on the DHT. See [Holochain Private Entries](https://developer.holochain.org/build/entries/).
- **Audit trails**: All actions are recorded for accountability

## Governance Principles

### 1. Decentralized Authority
- No single point of control
- Governance distributed among network participants
- Rules embedded in digital substrate

### 2. Transparency and Accountability
- All actions recorded and auditable
- Clear validation and approval processes
- Public governance rules and procedures

### 3. Inclusive Participation
- Permissionless access under defined rules
- Multiple agent roles and capabilities
- Stakeholder-driven governance

### 4. Capture Resistance
- Resources cannot be monopolized
- Governance rules prevent capture
- Distributed validation and approval

### 5. Scalable and Flexible
- Governance rules can be customized per resource
- Support for different validation schemes
- Extensible action and role system

## Future Enhancements

### Phase 2 Enhancements
- Advanced governance rule engine
- Automated validation workflows
- Dispute resolution mechanisms
- Performance metrics and reputation systems

### Phase 3 Enhancements
- Cross-network governance
- Advanced role hierarchies
- Automated compliance checking
- Integration with external governance systems

## References

- [ValueFlows Core Concepts](https://www.valueflo.ws/introduction/core/)
- [ValueFlows Governance Patterns](https://www.valueflo.ws/concepts/flows/)
- [nondominium Project Documentation](https://www.sensorica.co/environment/hrea-demo-for-nrp-cas/nondominium)
- [Holochain Governance Documentation](https://developer.holochain.org/) 