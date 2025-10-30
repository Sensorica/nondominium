# Governance in nondominium

## Overview

This document outlines the comprehensive governance system implemented in the nondominium project, built on Holochain and using ValueFlows vocabulary and patterns. The governance system spans across three zomes (`zome_person`, `zome_resource`, `zome_governance`) and provides the infrastructure for managing economic activities, validation, accountability, and reputation tracking in a decentralized sharing economy.

The governance system implements a complete agent lifecycle from Simple Agent through Accountable Agent to Primary Accountable Agent, with embedded governance rules, comprehensive validation schemes, structured Economic Processes, and a cryptographically-secured Private Participation Receipt (PPR) system for reputation tracking.

## Core Governance Concepts

### 1. REA Pattern (Resources, Events, Agents)

The governance system is built on the ValueFlows REA (Resource, Event, Agent) ontology:

- **Agents**: Individual persons with progressive capability levels (Simple → Accountable → Primary Accountable) who perform Economic Events affecting Economic Resources
- **Economic Events**: Actions using VfAction enum that produce, modify, use, or transfer Economic Resources within structured Economic Processes
- **Economic Resources**: Material and digital assets with embedded governance rules, managed lifecycle states, and custodian tracking
- **Economic Processes**: Structured activities (Use, Transport, Storage, Repair) that transform Economic Resources or provide ecosystem services with role-based access control

### 2. Multi-Layered Ontology

The governance system operates across three levels as defined in ValueFlows:

- **Knowledge Level**: Embedded governance rules, validation schemes, process requirements, and agent role definitions stored in ResourceSpecifications and process templates
- **Plan Level**: Commitments with VfAction types, process initiation requests, and validation workflows linking agents to future economic activities
- **Observation Level**: Completed Economic Events, fulfilled Claims, issued ValidationReceipts, and Private Participation Receipts (PPRs) providing cryptographically-signed reputation tracking

### 3. Agent Capability Progression

The governance system implements a progressive trust model through three agent types:

- **Simple Agent**: Entry-level with general capability token, can create Resources and make first transaction
- **Accountable Agent**: Validated agent with restricted capability token, can access Resources, validate others, and participate in specialized Economic Processes
- **Primary Accountable Agent (Custodian)**: Advanced agent with full capability token, holds physical custody of Resources, can validate role requests, and participate in dispute resolution

## Governance Structures

### 1. Validation System

The validation system implements comprehensive peer review and verification across all governance activities, supporting configurable validation schemes and role-based access control.

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

**Purpose**: Records validation decisions made by Accountable and Primary Accountable agents on resources, events, processes, agent promotions, and role assignments.

**Validation Types**:

- **resource_approval**: Validating new Resources during first access events
- **process_validation**: Validating Economic Process completions and outcomes
- **identity_verification**: Confirming agent identities for Simple Agent promotion
- **role_assignment**: Validating specialized role requests (Transport, Repair, Storage)
- **agent_promotion**: Validating Simple Agent promotion to Accountable Agent
- **end_of_life_validation**: Validating Resource end-of-life declarations

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

**Validation Schemes**:

- **"simple_majority"**: More than 50% of required validators must approve
- **"2-of-3"**: Exactly 2 out of 3 designated validators must approve
- **"N-of-M"**: N validators out of M designated validators must approve
- **"consensus"**: All required validators must approve

**Status Values**:

- **"pending"**: Validation in progress, awaiting validator responses
- **"approved"**: Sufficient validators have approved
- **"rejected"**: Validation failed or was explicitly rejected

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

**Purpose**: Links commitments to their fulfillment through economic events (public governance record).

**Governance Functions**:

- **Obligation Tracking**: Monitoring fulfillment of commitments
- **Reciprocal Claims**: Managing reciprocal obligations in exchanges
- **Dispute Resolution**: Supporting claims and counter-claims
- **Performance Measurement**: Tracking agent reliability and performance
- **PPR Generation**: Triggers automatic Private Participation Receipt issuance for reputation tracking

### 3. Economic Process Management

The governance system manages structured Economic Processes that provide ecosystem services with role-based access control and comprehensive validation.

#### EconomicProcess

```rust
pub struct EconomicProcess {
    pub process_type: String,
    pub name: String,
    pub description: Option<String>,
    pub required_role: String,
    pub inputs: Vec<ActionHash>,
    pub outputs: Vec<ActionHash>,
    pub started_by: AgentPubKey,
    pub started_at: Timestamp,
    pub completed_at: Option<Timestamp>,
    pub location: Option<String>,
    pub status: ProcessStatus,
}
```

**Process Types & Role Requirements**:

- **Use**: Core nondominium process accessible to all Accountable Agents
- **Transport**: Material Resource movement between locations (requires Transport role)
- **Storage**: Temporary Resource custody until new Agent requests access (requires Storage role)
- **Repair**: Resource maintenance and restoration, may change Resource state (requires Repair role)

**Process Status Values**:

- **Planned**: Process is planned but not yet started
- **InProgress**: Process is currently active
- **Completed**: Process finished successfully with validation
- **Suspended**: Process temporarily paused
- **Cancelled**: Process cancelled before completion
- **Failed**: Process failed to complete successfully

**Governance Functions**:

- **Role Enforcement**: Only agents with appropriate roles can initiate specialized processes
- **Process Chaining**: Agents with multiple roles can chain actions (transport → repair → transport)
- **State Management**: Proper Resource state transitions based on process type
- **Validation Requirements**: Process completion validation according to process-specific criteria

### 4. Private Participation Receipt (PPR) System

The governance system implements a comprehensive reputation tracking mechanism through cryptographically-signed Private Participation Receipts stored as private entries.

#### PrivateParticipationClaim

```rust
pub struct PrivateParticipationClaim {
    // Standard ValueFlows fields
    pub fulfills: ActionHash,
    pub fulfilled_by: ActionHash,
    pub claimed_at: Timestamp,

    // PPR-specific extensions
    pub claim_type: ParticipationClaimType,
    pub counterparty: AgentPubKey,
    pub performance_metrics: PerformanceMetrics,
    pub bilateral_signature: CryptographicSignature,
    pub interaction_context: String,
    pub role_context: Option<String>,
    pub resource_reference: Option<ActionHash>,
}
```

**PPR Issuance Categories**:

**Genesis Role - Network Entry**:

- **ResourceContribution**: Receipt for successfully creating and validating a Resource
- **NetworkValidation**: Receipt for performing validation duties

**Core Usage Role - Custodianship**:

- **ResponsibleTransfer**: Receipt for properly transferring Resource custody
- **CustodyAcceptance**: Receipt for accepting Resource custody responsibly

**Intermediate Roles - Specialized Services**:

- **ServiceCommitmentAccepted**: Receipt for accepting service commitments (Transport, Repair, Storage)
- **GoodFaithTransfer**: Receipt for transferring Resource in good faith for service
- **ServiceFulfillmentCompleted**: Receipt for completing services successfully
- **MaintenanceFulfillment, StorageFulfillment, TransportFulfillment**: Service-specific completion receipts

**Network Governance**:

- **DisputeResolutionParticipation**: Receipt for constructive participation in conflict resolution
- **GovernanceCompliance**: Receipt for consistent adherence to governance protocols

**Resource End-of-Life**:

- **EndOfLifeDeclaration**: Receipt for declaring Resource end-of-life
- **EndOfLifeValidation**: Receipt for validating Resource end-of-life (enhanced security)

**PPR Governance Principles**:

- **Bi-directional Issuance**: Every economic interaction generates exactly 2 receipts between participating agents
- **Cryptographic Integrity**: All receipts are cryptographically signed for authenticity
- **Privacy Preservation**: Stored as Holochain private entries accessible only to owning agent
- **Performance Tracking**: Quantitative metrics (timeliness, quality, reliability, communication scores)
- **Reputation Derivation**: Agents can calculate and selectively share reputation summaries

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

## Economic Processes (VfAction)

The governance system supports the following Nondominium-specific processes:

- **Use**: This is the core Nondominium process, a Resource is used by agents acording to its rules and in accordance to the network governance.
- **Transport**: A material Economic Resource is moved from one location to another. The process is only accessible by Agents that hold credencials (capability tokens) for the Transport role. The Economic Resource is unchanged by the process.
- **Storage**: A material Economic Resource is placed in storage until a new Accountable Agent request access. The process is only accessible by Agents that hold credencials (capability tokens) for the Storage role. The Economic Resource is unchanged by the process.
- **Repair**: A material Economic Resource is repaired. The Economic Resource is changed by the process, perhaps from a broken state to a working/functional state.

These processes apply to material Economic Resources and are seen as part of ecosystem services, provided by agents in intermediate roles, gated by their credencials.

## Dispute Resolution

Resolve disputes at the edge of the network, among agents that have interacted in the past and are about to interact. Avoid the creation of super users or admin roles. Disputes arise during custodian transfer events, for example when a Resource is stolen (made unavailable) by an agent, i.e. when a current custodian doesn't fulfill its role and responsibility vis avi the Nondominium Resource.

- Any Accountable Agent makes a request to access a Resource listed as available.
- The current Custodian of the said Resource is non responsive.
- The said Accountable Agent raises a red flag, which triggers a dispute resolution process.
- The Resource metadata can be access to reveal its past custodian transfers (transactions).
- The last agents, up to the last fourth, that have interacted in the past with the current Custodian are notified to participate in the dispute resolution process. All these agents must have access to the current Custodian private data, which allows them to physically locate the person in the role of current Custodian. This can trigger legal procedures, since the current Custodian has committed to legal obligations (contract) when has acquired the Resource. At least one of the said agents can pursue the dispute resolution process.
- If none of these agents want to pursue the dispute resolution process their profile is marked as having missed to fulfill their responsibility of defending or protecting the Nondomonium network, which is a data entry in their reputation metadata.

## Governance Workflows

### 1. Resource Creation and Validation

1. Simple or Accountable Agent creates new nondominium resource
2. Resource enters "pending_validation" state
3. Accountable Agents validate resource
4. Resource becomes available for access

### 2. Access Request and Approval

1. Accountable Agent signals intent to access resource
2. Primary Accountable Agent (custodian) reviews request
3. Governance rules are applied programmatically
4. Access is granted or denied based on rules and validation

### 3. Custody Transfer

1. Current Primary Accountable Agent (custodian) initiates transfer
2. New custodian accepts responsibility
3. Transfer event is recorded
4. Links are updated to reflect new custody

### 4. Validation Workflows

1. Resource requires validation
2. Validation scheme determines required validators
3. Validators review and approve/reject
4. Validation status is updated
5. Resource becomes available or rejected

### 5. Agent Onboarding and Progression

#### Simple Agent to Accountable Agent Promotion

1. Simple Agent creates their first nondominium Resource with embedded governance rules
2. Simple Agent initiates first transaction (Initial Transfer) to interested Accountable Agent
3. Receiving Accountable Agent validates both the Resource and the Simple Agent's identity (private entry access)
4. Upon successful validation:
   - ValidationReceipt issued for both Resource and Agent promotion
   - Simple Agent promoted to Accountable Agent with restricted capability token
   - Bi-directional PPRs issued (ResourceContribution + NetworkValidation)
5. Resource state changes from "pending_validation" to "validated"

#### Specialized Role Acquisition

1. Accountable Agent requests specialized role (Transport, Repair, Storage)
2. Request reviewed by existing Primary Accountable Agents holding the relevant role
3. Validators assess credentials, history, and compliance with role requirements
4. ValidationReceipt issued upon approval, role granted
5. PPRs issued for validation participation

### 6. Economic Process Workflows

#### Process Initiation and Completion

1. Accountable Agent with appropriate role initiates Economic Process
2. Commitment created with specific VfAction and process details
3. Process status tracked (Planned → InProgress → Completed)
4. Process completion validated according to process-specific requirements
5. Economic Event recorded upon completion
6. Claim created linking Commitment to Economic Event
7. Bi-directional PPRs automatically issued based on process type

#### Process Chaining Example (Transport + Repair)

1. Agent with Transport + Repair roles creates single Commitment for chained actions
2. Process initiated: receive → transport → repair → transport → deliver
3. Internal process status updates managed by executing agent
4. Final delivery triggers completion validation
5. Bi-directional PPRs issued: "Transport + Repair fulfillment completed" + "custody acceptance"

### 7. Resource End-of-Life Management

1. Agent declares Resource end-of-life with evidence documentation
2. Multiple expert validators required (minimum 2-3, depending on Resource value)
3. Past custodians notified, challenge period initiated (7-14 days)
4. Expert validators review evidence and Resource condition
5. If no challenges raised, Resource moved to final disposal/storage
6. Enhanced PPRs issued with strict validation requirements
7. Resource state updated to "decommissioned"

### 8. Dispute Resolution

1. Accountable Agent requests access to available Resource
2. Current custodian becomes non-responsive or refuses access improperly
3. Requesting agent raises dispute flag
4. System identifies last four agents who interacted with current custodian
5. Past interaction partners notified (must have custodian's private data access)
6. At least one past partner must pursue dispute resolution
7. Failure to participate impacts reputation through negative PPR entries
8. Resolution process can trigger legal procedures based on custodian contracts

## Implementation Details

### 1. Zome Structure

The governance system spans across three integrated zomes:

#### `zome_person`

- **Entry Types**: Person, PrivatePersonData, PersonRole, DataAccessGrant, DataAccessRequest
- **Functions**: Agent identity management, role assignment, reputation tracking, private data sharing
- **Capabilities**: PPR storage and retrieval, reputation summary calculation

#### `zome_resource`

- **Entry Types**: ResourceSpecification, EconomicResource, GovernanceRule, EconomicProcess, ProcessStatus
- **Functions**: Resource lifecycle management, process initiation and completion, embedded rule enforcement
- **Capabilities**: Process chaining, role-based access control, state management

#### `zome_governance`

- **Entry Types**: ValidationReceipt, EconomicEvent, Commitment, Claim, ResourceValidation, PrivateParticipationClaim
- **Functions**: Validation workflows, PPR issuance, cross-zome validation, dispute resolution support
- **Capabilities**: Multi-signature validation, cryptographic signature verification, reputation derivation

### 2. Cross-Zome Integration

- **Role Validation**: `zome_person` validates agent roles before `zome_resource` allows process initiation
- **Governance Enforcement**: `zome_resource` calls `zome_governance` for validation and PPR issuance
- **Identity Verification**: `zome_governance` accesses `zome_person` private entries for agent validation
- **Transactional Integrity**: All economic interactions span multiple zomes with atomic operations

### 3. Security and Privacy

- **Capability-based security**: Progressive access control through capability tokens (general → restricted → full)
- **Role-based access control**: Economic Processes enforce specialized role requirements with validated credentials
- **Private entries**: Sensitive information (PII, PPRs) stored as Holochain private entries in agent's source chain
- **Cryptographic integrity**: All PPRs cryptographically signed for authenticity and non-repudiation
- **Selective disclosure**: Agents control sharing of private data and reputation summaries
- **Audit trails**: Complete record of all economic activities, validations, and governance actions
- **End-of-life security**: Enhanced validation requirements prevent resource theft through false end-of-life claims

## Governance Principles

### 1. Decentralized Authority

- No single point of control or super-users in the network
- Governance distributed among network participants through progressive trust model
- Rules embedded in ResourceSpecifications and enforced programmatically
- Edge-based dispute resolution involving recent interaction partners

### 2. Transparency and Accountability

- All economic activities recorded as Economic Events with complete audit trails
- Public governance rules and validation schemes machine-readable and transparent
- Clear validation processes with cryptographically-signed ValidationReceipts
- Comprehensive reputation tracking through Private Participation Receipts

### 3. Inclusive Participation

- Permissionless entry under defined governance rules (Simple Agent level)
- Progressive capability model enabling advancement through validated participation
- Multiple specialized roles supporting diverse ecosystem services
- Stakeholder-driven governance through peer validation and role-based access

### 4. Capture Resistance

- Resources cannot be monopolized due to embedded governance rules
- Distributed validation prevents capture by single actors
- End-of-life security measures prevent resource theft
- Multi-reviewer validation schemes ensure no single point of failure

### 5. Privacy-Preserving Accountability

- Private Participation Receipts enable reputation without compromising privacy
- Selective disclosure allows agents to control information sharing
- Cryptographic signatures ensure authenticity while preserving autonomy
- Private entries protect sensitive information while enabling governance

### 6. Process-Aware Governance

- Structured Economic Processes with role-based access control
- Process chaining enables complex service delivery
- State management ensures proper Resource lifecycle tracking
- Performance metrics support quality assurance and continuous improvement

## Future Enhancements

### Phase 2 Enhancements (Building on Current Foundation)

- **Advanced Governance Rule Engine**: Conditional logic and smart contract-like governance rules
- **Automated Validation Workflows**: AI-assisted validation and anomaly detection
- **Enhanced Dispute Resolution**: Formal mediation protocols and reputation-weighted resolution
- **Cross-Network Resource Sharing**: Federation with other nondominium networks
- **Economic Incentive Mechanisms**: Value accounting and contribution-based incentives

### Phase 3 Enhancements (Advanced Network Features)

- **Integration with External Governance**: Legal system integration and compliance frameworks
- **Advanced Reputation Algorithms**: Machine learning-based trust prediction and recommendation systems
- **Scalable Validation Schemes**: Optimized validation for large-scale networks
- **Multi-Network Identity**: Cross-platform agent identity and reputation portability
- **Automated Compliance Checking**: Real-time governance rule compliance monitoring

## References

- [ValueFlows Core Concepts](https://www.valueflo.ws/introduction/core/)
- [ValueFlows Governance Patterns](https://www.valueflo.ws/concepts/flows/)
- [nondominium Project Documentation](https://www.sensorica.co/environment/hrea-demo-for-nrp-cas/nondominium)
- [Holochain Governance Documentation](https://developer.holochain.org/)
