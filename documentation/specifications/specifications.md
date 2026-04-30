# nondominium - Technical Specifications

## 1. Introduction

### 1.1 Purpose

This document provides the detailed technical specifications for the nondominium Holochain application (hApp). It is based on the requirements outlined in `requirements.md` and the architecture described in the nondominium project document. It is intended for Holochain developers.

### 1.2 Guiding Principles

- **Valueflows Compliance**: Data structures will adhere to the Valueflows standard.
- **Agent-Centricity**: All data is created and validated from the perspective of the individual agent.
- **Capability-Based Security**: Access and permissions will be managed through Holochain's capability token mechanism.

## 2. Holochain DNA and Zome Structure

As per the project's architectural description, the hApp will be composed of three distinct zomes. This separation of concerns will enhance modularity and clarity.

- **`zome_person`**: Handles agent identity, profiles, and roles.
- **`zome_resource`**: Manages the lifecycle of Economic Resources and their Specifications.
- **`zome_governance`**: Implements the logic for Commitments, Claims, and other governance-related actions.

## 3. Governance-as-Operator Architecture Overview

### 3.1 Architecture Principle

The nondominium system implements a **governance-as-operator** architecture where:

- **Resource Zome** operates as a **pure data model** responsible for resource specifications, economic resources, and data persistence
- **Governance Zome** operates as a **state transition operator** responsible for evaluating governance rules, validating state changes, and generating economic events

This separation enables independent evolution of data structures and governance rules while maintaining clear interfaces and responsibilities.

### 3.2 Cross-Zome Interface

The primary interface between zomes follows the governance operator pattern:

```rust
// Resource zome requests state transition
#[hdk_extern]
pub fn request_resource_transition(
    request: GovernanceTransitionRequest,
) -> ExternResult<GovernanceTransitionResult>;

// Governance zome evaluates and decides
#[hdk_extern]
pub fn evaluate_state_transition(
    request: GovernanceTransitionRequest,
) -> ExternResult<GovernanceTransitionResult>;
```

### 3.3 Data Flow Pattern

1. **State Change Request**: Resource zome receives agent request
2. **Governance Evaluation**: Cross-zome call to governance zome for decision
3. **State Application**: Resource zome applies approved changes
4. **Event Generation**: Economic events generated for audit trail

## 4. Data Structures (Integrity Zome Entries)

### 4.1. `zome_person` Entries

#### 4.1.1. `AgentProfile`

Stores public-facing information about an agent.

- **Fields**:
  - `agent_pub_key: AgentPubKey`: The public key of the agent.
  - `name: String`: The agent's chosen public name/pseudonym.
  - `avatar_url: Option<String>`
- **Links**:
  - `AllAgents -> AgentProfile`: Anchor for discovering all agent profiles.

#### 3.1.2. `PrivateProfile`

- **Description**: Stores an agent's private Personal Identifiable Information (PII) as a Holochain private entry in the agent's source chain. The agent can grant access to this data on a case-by-case basis (see https://developer.holochain.org/build/entries/).
- `private_data: ...` (fields like legal name, address, email, photo ID hash)
- **Links**:
  - `AgentProfile -> PrivateProfile`: Links the public profile to the private data.

#### 3.1.3. `Role`

Defines a specific role an agent can have (e.g., `User`, `Repair`, `Transport`, `Storage`).

- **Fields**:
  - `role_name: String`
  - `validated_by: Option<AgentPubKey>`: The Accountable or Primary Accountable Agent who validated the role assignment (fulfills REQ-GOV-06).
  - `validation_receipt: Option<ActionHash>`: Link to the ValidationReceipt for this role assignment.
- **Links**:
  - `AgentProfile -> Role`: Assigns a role to an agent. This link's tag could hold validation info (e.g., who validated the role).

### 4.2. `zome_resource` Entries

#### 3.2.1. `ResourceSpecification`

A template for a class of resources.

- **Fields**:
  - `name: String`
  - `description: String`
  - `image_url: Option<String>`
  - `governance_rules: Vec<GovernanceRule>`: Embedded rules for resource access and management. Fulfills `REQ-GOV-06`.
- **Links**:
  - `AllResourceSpecifications -> ResourceSpecification`: Anchor for discovery.

#### 3.2.2. `GovernanceRule`

A rule embedded within a ResourceSpecification that defines how resources can be accessed and managed.

- **Fields**:
  - `rule_type: String`: e.g., "access_requirement", "usage_limit", "transfer_conditions"
  - `rule_data: String`: JSON-encoded rule parameters
  - `enforced_by: Option<AgentRole>`: Role required to enforce this rule

#### 3.2.3. `EconomicResource`

A concrete instance of a resource.

- **Fields**:
  - `conforms_to: ActionHash`: Link to the `ResourceSpecification`.
  - `quantity: f64`
  - `unit: String`
  - `custodian: AgentPubKey`: The Primary Accountable Agent holding the resource.
- **Links**:
  - `ResourceSpecification -> EconomicResource`: Find all resources of a type.
  - `AgentProfile -> EconomicResource` (as Custodian): Link to the agent currently holding it. Tag: "custodian".

#### 3.2.4. `EconomicProcess`

Represents structured activities that transform Economic Resources or provide ecosystem services in the nondominium network.

- **Fields**:
  - `process_type: String`: The type of process ("Use", "Transport", "Storage", "Repair")
  - `name: String`: Human-readable name for the process instance
  - `description: Option<String>`: Optional description of the specific process
  - `required_role: String`: Agent role required to initiate this process
  - `inputs: Vec<ActionHash>`: Links to EconomicResources that are inputs to the process
  - `outputs: Vec<ActionHash>`: Links to EconomicResources that are outputs from the process
  - `started_by: AgentPubKey`: Agent who initiated the process
  - `started_at: Timestamp`: When the process was initiated
  - `completed_at: Option<Timestamp>`: When the process was completed (None if ongoing)
  - `location: Option<String>`: Physical or logical location where process occurs
  - `status: ProcessStatus`: Current status of the process

- **Links**:
  - `AllEconomicProcesses -> EconomicProcess`: Discovery anchor for all processes
  - `AgentProfile -> EconomicProcess`: Processes initiated by an agent
  - `EconomicResource -> EconomicProcess`: Link resources to processes that use them
  - `EconomicProcess -> EconomicEvent`: Events that occur within a process

#### 3.2.5. `ProcessStatus`

Enumeration representing the current state of an Economic Process.

- **Values**:
  - `Planned`: Process is planned but not yet started
  - `InProgress`: Process is currently active
  - `Completed`: Process has finished successfully
  - `Suspended`: Process is temporarily paused
  - `Cancelled`: Process was cancelled before completion
  - `Failed`: Process failed to complete successfully

### 3.3. `zome_governance` Entries

#### 3.3.1. `EconomicEvent`

Records a consummated action on a resource.

- **Fields**:
  - `action: VfAction`: ValueFlows action enum (e.g., Transfer, Use, Produce, InitialTransfer, AccessForUse, TransferCustody)
  - `provider: AgentPubKey`
  - `receiver: AgentPubKey`
  - `resource_inventoried_as: ActionHash`: Link to the `EconomicResource`
  - `affects: ActionHash`: Link to the `EconomicResource` that is affected
  - `resource_quantity: f64`: Quantity of resource affected by the event
  - `event_time: Timestamp`: When the event occurred
  - `note: Option<String>`: Optional notes about the event
- **Links**:
  - `EconomicResource -> EconomicEvent`: History of events for a resource
  - `EconomicProcess -> EconomicEvent`: Events that occur within a process context

#### 3.3.2. `Commitment`

An intention to perform an `EconomicEvent`.

- **Fields**:
  - `action: VfAction`: The intended ValueFlows action (e.g., AccessForUse, Transfer, Use)
  - `provider: AgentPubKey`
  - `receiver: AgentPubKey`
  - `resource_inventoried_as: Option<ActionHash>`: Link to specific resource if applicable
  - `resource_conforms_to: Option<ActionHash>`: Link to ResourceSpecification if general
  - `input_of: Option<ActionHash>`: Optional link to an EconomicProcess
  - `due_date: Timestamp`
  - `note: Option<String>`: Optional commitment notes
  - `committed_at: Timestamp`: When the commitment was made
- **Links**:
  - `AgentProfile -> Commitment`: Agent's outgoing/incoming commitments
  - `EconomicProcess -> Commitment`: Commitments related to a process

#### 3.3.3. `Claim`

Fulfills a `Commitment` (public governance record).

- **Fields**:
  - `fulfills: ActionHash`: Link to the `Commitment`
  - `fulfilled_by: ActionHash`: Link to the resulting `EconomicEvent`
  - `claimed_at: Timestamp`: When the claim was created
  - `note: Option<String>`: Optional notes about the claim fulfillment
- **Links**:
  - `Commitment -> Claim`: Shows a commitment has been actioned
- **Note**: This is the public governance record. Private Participation Receipts (PPRs) are generated alongside Claims to track reputation privately.

#### 3.3.4. `ValidationReceipt`

Records validation of resources, events, or agent promotions by Accountable Agents.

- **Fields**:
  - `validator: AgentPubKey`: The agent performing the validation
  - `validated_item: ActionHash`: Link to the item being validated (Resource, Event, Role, or Agent promotion)
  - `validation_type: String`: e.g., "resource_approval", "process_validation", "identity_verification", "role_assignment", "agent_promotion"
  - `approved: bool`: Whether the validation was approved or rejected
  - `notes: Option<String>`: Optional validation notes
- **Links**:
  - `ValidatedItem -> ValidationReceipt`: Track all validations for an item

#### 3.3.5. `ResourceValidation`

Tracks the overall validation status of a resource requiring peer review.

- **Fields**:
  - `resource: ActionHash`: Link to the `EconomicResource` being validated
  - `validation_scheme: String`: e.g., "2-of-3", "simple_majority"
  - `required_validators: u32`: Number of validators needed
  - `current_validators: u32`: Number of validators who have responded
  - `status: String`: "pending", "approved", "rejected"
- **Links**:
  - `EconomicResource -> ResourceValidation`: One validation per resource

#### 3.3.6. `PrivateParticipationClaim` (Private Entry)

A cryptographically signed receipt stored as a private entry that extends the ValueFlows Claim structure to track agent reliability and form the foundation for the reputation system.

- **Fields**:
  - `fulfills: ActionHash`: Link to the Commitment fulfilled (standard ValueFlows)
  - `fulfilled_by: ActionHash`: Link to the resulting EconomicEvent (standard ValueFlows)
  - `claimed_at: Timestamp`: When the claim was created (standard ValueFlows)
  - `claim_type: ParticipationClaimType`: Type of participation being claimed
  - `counterparty: AgentPubKey`: The other agent involved in the bi-directional receipt
  - `performance_metrics: PerformanceMetrics`: Quantitative measures of performance
  - `bilateral_signature: CryptographicSignature`: Cryptographic proof of mutual agreement
  - `interaction_context: String`: Context of the interaction (e.g., "resource_creation", "custody_transfer", "maintenance_service")
  - `role_context: Option<String>`: Specific role context if applicable (e.g., "Transport", "Repair", "Storage")
  - `resource_reference: Option<ActionHash>`: Link to the resource involved in the interaction

- **Privacy**: Stored as Holochain private entry accessible only to the owning agent
- **Links**: None (private entries are not linked in DHT for privacy preservation)

#### 3.3.7. `ParticipationClaimType`

Enumeration defining the types of participation claims that can be issued.

- **Values**:
  - `ResourceContribution`: Receipt for successfully creating and getting a resource validated
  - `NetworkValidation`: Receipt for performing validation duties
  - `ResponsibleTransfer`: Receipt for properly transferring resource custody
  - `CustodyAcceptance`: Receipt for accepting resource custody responsibly
  - `ServiceCommitmentAccepted`: Receipt for accepting a service commitment
  - `GoodFaithTransfer`: Receipt for transferring resource in good faith for service
  - `ServiceFulfillmentCompleted`: Receipt for completing a service successfully
  - `MaintenanceFulfillment`: Receipt for completing maintenance service
  - `StorageFulfillment`: Receipt for completing storage service
  - `TransportFulfillment`: Receipt for completing transport service
  - `EndOfLifeDeclaration`: Receipt for declaring resource end-of-life
  - `EndOfLifeValidation`: Receipt for validating resource end-of-life
  - `DisputeResolutionParticipation`: Receipt for constructive dispute resolution participation
  - `GovernanceCompliance`: Receipt for consistent adherence to governance protocols

#### 3.3.8. `PerformanceMetrics`

Quantitative measures of agent performance in economic interactions.

- **Fields**:
  - `timeliness_score: f64`: How promptly the agent fulfilled commitments (0.0-1.0)
  - `quality_score: f64`: Quality of service provided (0.0-1.0)
  - `reliability_score: f64`: Consistency and dependability (0.0-1.0)
  - `communication_score: f64`: Effectiveness of communication (0.0-1.0)
  - `completion_rate: f64`: Percentage of commitments successfully completed
  - `resource_condition_maintained: Option<bool>`: Whether resource condition was maintained (for service roles)
  - `additional_metrics: Option<String>`: JSON-encoded additional context-specific metrics

#### 3.3.9. `CryptographicSignature`

Cryptographic proof of mutual agreement between agents in bi-directional receipt issuance.

- **Fields**:
  - `signer: AgentPubKey`: Agent who created the signature
  - `signature: Signature`: Cryptographic signature of the receipt data
  - `signed_data_hash: ActionHash`: Hash of the data that was signed
  - `signature_algorithm: String`: Algorithm used for signing (e.g., "Ed25519")
  - `created_at: Timestamp`: When the signature was created

#### 3.3.10. `ReputationSummary`

Aggregated reputation metrics derived from an agent's Private Participation Claims.

- **Fields**:
  - `agent: AgentPubKey`: The agent whose reputation is summarized
  - `total_interactions: u32`: Total number of completed economic interactions
  - `average_timeliness: f64`: Average timeliness score across all interactions
  - `average_quality: f64`: Average quality score across all interactions
  - `average_reliability: f64`: Average reliability score across all interactions
  - `average_communication: f64`: Average communication score across all interactions
  - `completion_rate: f64`: Overall percentage of commitments successfully completed
  - `role_performance: std::collections::HashMap<String, RolePerformance>`: Performance breakdown by role
  - `recent_activity: Vec<RecentInteraction>`: Summary of recent interactions (last 30 days)
  - `calculated_at: Timestamp`: When this summary was calculated

#### 3.3.11. `RolePerformance`

Performance metrics for a specific role.

- **Fields**:
  - `role_name: String`: The role (e.g., "Transport", "Repair", "Storage")
  - `interaction_count: u32`: Number of interactions in this role
  - `average_performance: f64`: Average performance score for this role
  - `specialization_score: f64`: How specialized/expert the agent is in this role
  - `last_activity: Timestamp`: Most recent activity in this role

#### 3.3.12. `RecentInteraction`

Summary of a recent economic interaction for reputation display.

- **Fields**:
  - `interaction_type: String`: Type of interaction (e.g., "custody_transfer", "repair_service")
  - `counterparty: AgentPubKey`: The other agent involved
  - `performance_score: f64`: Overall performance in this interaction
  - `interaction_date: Timestamp`: When the interaction occurred
  - `resource_involved: Option<ActionHash>`: Resource that was involved, if applicable

#### 3.3.13. `ProcessValidationRequirements`

Defines validation requirements for a specific Economic Process type.

- **Fields**:
  - `process_type: String`: The type of process (e.g., "Use", "Transport", "Repair", "Storage")
  - `required_role: Option<String>`: Role required to initiate this process
  - `minimum_validators: u32`: Minimum number of validators required
  - `validation_scheme: String`: Validation scheme to use (e.g., "simple_majority", "2-of-3")
  - `completion_validation_required: bool`: Whether completion needs separate validation
  - `performance_thresholds: PerformanceThresholds`: Minimum performance thresholds
  - `special_requirements: Vec<String>`: Any special requirements for this process type

#### 3.3.14. `PerformanceThresholds`

Minimum performance thresholds for process validation.

- **Fields**:
  - `minimum_timeliness: f64`: Minimum acceptable timeliness score
  - `minimum_quality: f64`: Minimum acceptable quality score
  - `minimum_reliability: f64`: Minimum acceptable reliability score
  - `minimum_communication: f64`: Minimum acceptable communication score
  - `minimum_completion_rate: f64`: Minimum acceptable completion rate

## 5. Cross-Zome Interface Types

### 5.1 Governance Transition Request

Interface for requesting state changes from the governance zome:

```rust
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct GovernanceTransitionRequest {
    /// The action the requesting agent wants to perform
    pub action: VfAction,
    /// Current state of the resource being modified
    pub resource: EconomicResource,
    /// Agent requesting the state change
    pub requesting_agent: AgentPubKey,
    /// Additional context for the transition
    pub context: TransitionContext,
}
```

### 5.2 Transition Context

Additional context information for state transitions:

```rust
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct TransitionContext {
    /// Target location for transport/move actions
    pub target_location: Option<String>,
    /// Quantity change for produce/consume actions
    pub quantity_change: Option<f64>,
    /// Target custodian for transfer actions
    pub target_custodian: Option<AgentPubKey>,
    /// Process notes and observations
    pub process_notes: Option<String>,
    /// Associated economic process if applicable
    pub process_context: Option<ActionHash>,
}
```

### 5.3 Governance Transition Result

Result structure returned by the governance zome:

```rust
#[derive(Serialize, Deserialize, Debug)]
pub struct GovernanceTransitionResult {
    /// Whether the transition was approved
    pub success: bool,
    /// Updated resource state (if approved)
    pub new_resource_state: Option<EconomicResource>,
    /// Generated economic event for audit trail
    pub economic_event: Option<EconomicEvent>,
    /// Validation receipts from governance evaluation
    pub validation_receipts: Vec<ValidationReceipt>,
    /// Detailed reasons for rejection (if applicable)
    pub rejection_reasons: Option<Vec<String>>,
    /// Required next steps or additional validation needed
    pub next_steps: Option<Vec<String>>,
}
```

## 6. Zome Functions (Coordinator Zomes)

### 4.1. `zome_person` Functions

- `create_profile(name: String, avatar: Option<String>, private_profile: ...) -> Record`
- `get_my_profile() -> (Record, Record)`
- `get_agent_profile(agent: AgentPubKey) -> Option<Record>`
- `assign_role(agent: AgentPubKey, role: String) -> ActionHash` (Requires validation by Accountable Agent; for specialized roles, must follow REQ-GOV-06 validation process)
- `promote_agent_to_accountable(simple_agent: AgentPubKey, private_profile_hash: ActionHash) -> ValidationReceipt`: Promotes a Simple Agent to Accountable Agent status after successful validation (REQ-GOV-08).
- `get_my_participation_claims() -> Vec<PrivateParticipationClaim>`: Returns all private participation receipts for the calling agent.
  - **Capability**: `general_access`
- `get_reputation_summary() -> ReputationSummary`: Calculates and returns aggregated reputation metrics based on participation claims.
  - **Capability**: `general_access`
- `get_participation_claims_by_type(claim_type: ParticipationClaimType) -> Vec<PrivateParticipationClaim>`: Returns participation claims filtered by type.
  - **Capability**: `general_access`

### 4.2. `zome_resource` Functions

- `create_resource_spec(name: String, description: String, governance_rules: Vec<GovernanceRule>) -> Record`: Creates a new resource specification with embedded governance rules. Fulfills `REQ-GOV-06`.
  - **Capability**: `restricted_access` (Only Accountable Agents can define new resource types)
- `create_economic_resource(spec_hash: ActionHash, quantity: f64, unit: String) -> Record`: Creates a new Economic Resource. This is the first step for a Simple Agent (`REQ-USER-S-05`). Automatically triggers validation process (`REQ-GOV-02`).
  - **Capability**: `general_access`
- `get_all_resource_specs() -> Vec<Record>`: Discovery function for all resource specifications.
  - **Capability**: `general_access`
- `get_resources_by_spec(spec_hash: ActionHash) -> Vec<Record>`: Filtered discovery by specification.
  - **Capability**: `general_access`
- `get_my_resources() -> Vec<Record>`: Returns resources where the calling agent is the custodian.
  - **Capability**: `general_access`
- `transfer_custody(resource_hash: ActionHash, new_custodian: AgentPubKey) -> Record`: Transfers custody and creates an `EconomicEvent` via cross-zome call to `zome_governance`. Enforces governance rules (`REQ-GOV-07`).
  - **Capability**: `restricted_access`
- `check_first_resource_requirement(agent: AgentPubKey) -> bool`: Checks if an agent has created at least one resource. Fulfills `REQ-GOV-01`.
  - **Capability**: `general_access`
- `initiate_economic_process(process_type: String, resource_hashes: Vec<ActionHash>, location: Option<String>) -> Record`: Initiates an Economic Process (Use, Transport, Storage, Repair). Validates agent has required role for the process type.
  - **Capability**: `restricted_access` (Role-gated: requires specific credentials for Transport, Repair, Storage)
- `complete_economic_process(process_hash: ActionHash, output_resources: Vec<ActionHash>) -> Record`: Completes an Economic Process and records any resource changes.
  - **Capability**: `restricted_access`
- `get_active_processes() -> Vec<Record>`: Returns all active processes initiated by the calling agent.
  - **Capability**: `general_access`
- `get_process_by_resource(resource_hash: ActionHash) -> Vec<Record>`: Returns all processes that have used a specific resource.
  - **Capability**: `general_access`

### 4.3. `zome_governance` Functions

- `propose_commitment(action: VfAction, resource_hash: ActionHash, provider: AgentPubKey, due: Timestamp) -> Record`: Creates a future intention to act on a resource.
  - **Capability**: `restricted_access`
- `accept_commitment(commitment_hash: ActionHash) -> Record`: Accepts a proposed commitment.
  - **Capability**: `restricted_access`
- `claim_commitment(commitment_hash: ActionHash, resource_id: ActionHash) -> Record`: Fulfills a commitment and creates the corresponding `EconomicEvent`.
  - **Capability**: `restricted_access`
- `log_initial_transfer(resource_hash: ActionHash, receiver: AgentPubKey, quantity: f64) -> Record`: A simplified function for a `Simple Agent`'s first transaction (`REQ-USER-S-07`). This triggers the validation process for Simple Agent promotion (`REQ-GOV-02`).
  - **Capability**: `general_access`
- `validate_new_resource(resource_hash: ActionHash, validation_scheme: String) -> ValidationReceipt`: Peer-validates a newly created Resource. Fulfills `REQ-USER-A-07` and `REQ-GOV-02`. Supports configurable validation schemes (`REQ-GOV-04`).
  - **Capability**: `restricted_access`
- `validate_process_event(event_hash: ActionHash) -> ValidationReceipt`: Validates an event related to a core process (e.g., Storage, Repair). Fulfills `REQ-USER-A-08` and `REQ-GOV-05`.
  - **Capability**: `restricted_access`
- `validate_agent_identity(simple_agent: AgentPubKey, private_profile_hash: ActionHash) -> ValidationReceipt`: Validates a Simple Agent's identity information and their first resource transfer, potentially promoting them to Accountable Agent status. Full validation requires access to the agent's private entry. Fulfills REQ-GOV-08.
  - **Capability**: `restricted_access`
- `check_validation_status(resource_hash: ActionHash) -> ResourceValidation`: Returns the current validation status of a resource.
  - **Capability**: `general_access`
- `get_validation_history(item_hash: ActionHash) -> Vec<ValidationReceipt>`: Returns all validation receipts for a given item.
  - **Capability**: `general_access`
- `validate_process_completion(process_hash: ActionHash) -> ValidationReceipt`: Validates that an Economic Process was completed according to its specifications and governance rules.
  - **Capability**: `restricted_access`
- `get_process_validation_requirements(process_type: String) -> ProcessValidationRequirements`: Returns the validation requirements for a specific process type.
  - **Capability**: `general_access`
- `issue_participation_receipts(commitment_hash: ActionHash, event_hash: ActionHash, counterparty: AgentPubKey, performance_metrics: PerformanceMetrics) -> (ActionHash, ActionHash)`: Issues bi-directional Private Participation Claims for both agents involved in an economic interaction. Returns the action hashes of both receipts.
  - **Capability**: `restricted_access`
- `sign_participation_claim(claim_hash: ActionHash, signature: CryptographicSignature) -> Record`: Adds cryptographic signature to a participation claim to complete the bi-directional receipt process.
  - **Capability**: `general_access`
- `validate_participation_claim_signature(claim_hash: ActionHash) -> bool`: Validates the cryptographic signature of a participation claim.
  - **Capability**: `general_access`

## 5. Security and Validation

- **Capability Tokens**: Zome functions will be protected by capability grants. `Simple Agents` get a general token. `Accountable Agents` get a restricted token after their first validated transaction (`REQ-SEC-01`).
- **Validation Logic**:
  - The `zome_person` integrity zome will validate that only an Accountable Agent can assign a `Role`, and that specialized roles (Transport, Repair, Storage) require validation by existing Primary Accountable Agents per REQ-GOV-04 (Specialized Role Validation).
  - The `zome_person` integrity zome will validate that promotion from Simple Agent to Accountable Agent requires validation by an Accountable or Primary Accountable Agent, following the process in REQ-GOV-03 (Agent Validation).
  - The `zome_resource` integrity zome ensures a resource cannot be created without a valid `ResourceSpecification` and enforces embedded governance rules (`REQ-GOV-07`).
  - The `zome_resource` integrity zome ensures that new resources start in a 'pending validation' state and are set to 'validated' upon successful peer review, as described in REQ-GOV-02 (Resource Validation).
  - The `zome_governance` integrity zome ensures a `Claim` matches its `Commitment` and validates all validation receipts for authenticity.
  - The system supports configurable validation schemes (e.g., 2-of-3, N-of-M reviewers) for Resource approval per REQ-GOV-06 (Multi-Reviewer Validation).
  - Certain types of validation are restricted to Agents with specific Roles per REQ-GOV-05 (Role-Gated Validation).
  - The `zome_resource` integrity zome validates that Economic Processes can only be initiated by agents with appropriate roles (Transport, Repair, Storage processes require specific credentials).
  - Economic Process validation ensures that:
    - Only agents with required roles can initiate specific process types
    - Process inputs and outputs are properly linked to existing Economic Resources
    - Process completion triggers appropriate Economic Events
    - Resource state changes are validated according to process type (e.g., Repair may change resource state, Transport preserves state)
- **Cross-Zome Calls**: Functions will call other zomes to maintain transactional integrity (e.g., `transfer_custody` must create a valid `EconomicEvent` and enforce governance rules, `initiate_economic_process` must validate agent roles across zomes).
- **First Resource Requirement**: The system enforces that Simple Agents must create at least one resource before accessing others (`REQ-GOV-01`), implemented through the `check_first_resource_requirement` function.
- **Process Role Enforcement**: Economic Processes enforce role-based access control where specialized processes (Transport, Repair, Storage) require agents to hold appropriate validated credentials, while Use processes are accessible to all Accountable Agents.
- **Private Participation Receipt (PPR) Validation**:
  - PPR issuance is automatically triggered for every completed economic interaction that involves a Commitment-Claim-Event cycle
  - Bi-directional receipt generation ensures both agents receive appropriate participation claims
  - Cryptographic signature validation ensures authenticity and prevents manipulation
  - Performance metrics are validated to be within acceptable ranges (0.0-1.0 for scores)
  - PPR claim types must correspond to the actual economic action performed
  - End-of-life declarations require multiple validator participation receipts with enhanced security measures
  - Private entry storage ensures receipt privacy while maintaining auditability for the owning agent

## 6. Future Development: Architecture Specifications for P2P and Organizational Contexts

### 6.1 Overview

This section specifies the technical architecture for supporting two distinct deployment contexts:

- **Pure P2P Context**: Individual humans directly using Nondominium
- **Organizational Context**: Organizations accessing Nondominium through bridge services (ERP, Tiki, etc.)

These specifications correspond to the future development requirements defined in `REQ-FUT-*` series.

### 6.2 Identity & Delegation Architecture

#### 6.2.1 Organizational Agent Identity

**SPEC-FUT-ID-01: Organizational Agent Entry**

New entry type for representing organizational agents:

```rust
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct OrganizationalAgent {
    /// Unique identifier for the organization
    pub org_id: AgentPubKey,
    /// Human-readable organization name
    pub org_name: String,
    /// Legal entity information (optional)
    pub legal_entity_info: Option<LegalEntityInfo>,
    /// Organization type (e.g., "cooperative", "corporation", "nonprofit")
    pub org_type: String,
    /// Root signing authority for the organization
    pub root_authority: AgentPubKey,
    /// Active delegation policy
    pub delegation_policy: DelegationPolicy,
    /// Created timestamp
    pub created_at: Timestamp,
}
```

**SPEC-FUT-ID-02: Delegation Entry**

Entry type for employee/member delegations:

```rust
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Delegation {
    /// The organizational agent granting delegation
    pub delegator: AgentPubKey,
    /// The employee/member receiving delegation
    pub delegate: AgentPubKey,
    /// Scoped capabilities (e.g., ["Transport", "Use"])
    pub capabilities: Vec<String>,
    /// Monetary or quantity limits (optional)
    pub limits: Option<DelegationLimits>,
    /// Expiry timestamp (optional, None = no expiry)
    pub expires_at: Option<Timestamp>,
    /// Status: "active", "revoked", "expired"
    pub status: DelegationStatus,
    /// Created timestamp
    pub created_at: Timestamp,
    /// Revoked timestamp (if applicable)
    pub revoked_at: Option<Timestamp>,
}
```

**SPEC-FUT-ID-03: Delegation Limits**

```rust
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct DelegationLimits {
    /// Maximum transaction value
    pub max_value: Option<f64>,
    /// Maximum resource quantity
    pub max_quantity: Option<f64>,
    /// Allowed resource types
    pub allowed_resource_specs: Option<Vec<ActionHash>>,
    /// Geographic restrictions
    pub geographic_limits: Option<Vec<String>>,
}
```

**SPEC-FUT-ID-04: Delegation Validation**

```rust
#[hdk_extern]
pub fn validate_delegation(delegation_hash: ActionHash, action: VfAction) -> ExternResult<bool> {
    // Check delegation status (active/revoked/expired)
    // Verify capability scope includes requested action
    // Validate limits are not exceeded
    // Return authorization result
}
```

#### 6.2.2 Delegation Zome Functions

**SPEC-FUT-ID-05: Delegation Management Functions**

```rust
// Create delegation for employee/member
#[hdk_extern]
pub fn create_delegation(
    delegate: AgentPubKey,
    capabilities: Vec<String>,
    limits: Option<DelegationLimits>,
    expires_at: Option<Timestamp>
) -> ExternResult<ActionHash>;

// Revoke delegation immediately
#[hdk_extern]
pub fn revoke_delegation(delegation_hash: ActionHash) -> ExternResult<()>;

// Get all active delegations for an organization
#[hdk_extern]
pub fn get_active_delegations(org_agent: AgentPubKey) -> ExternResult<Vec<Delegation>>;

// Check if delegate has specific capability
#[hdk_extern]
pub fn check_delegation_capability(
    delegate: AgentPubKey,
    capability: String
) -> ExternResult<bool>;
```

### 6.3 Organizational Reputation Architecture

#### 6.3.1 Organizational PPR Aggregation

**SPEC-FUT-REP-01: Organizational Participation Claim**

Extended PPR structure for organizational context:

```rust
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct OrganizationalParticipationClaim {
    /// Standard PPR fields
    pub base_claim: PrivateParticipationClaim,
    /// The delegate who performed the action
    pub performed_by: Option<AgentPubKey>,
    /// Internal attribution hash (for org audit)
    pub internal_attribution: Option<Hash>,
    /// Whether this was an organizational or personal action
    pub action_context: ActionContext,
}
```

**SPEC-FUT-REP-02: Reputation Aggregation**

```rust
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct OrganizationalReputationSummary {
    /// The organizational agent
    pub org_agent: AgentPubKey,
    /// Standard reputation metrics (external view)
    pub external_reputation: ReputationSummary,
    /// Internal attribution by delegate (private)
    pub delegate_performance: HashMap<AgentPubKey, ReputationSummary>,
    /// Aggregate organizational metrics
    pub org_metrics: OrganizationalMetrics,
}
```

**SPEC-FUT-REP-03: Organizational Metrics**

```rust
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct OrganizationalMetrics {
    /// Total active delegates
    pub active_delegates: u32,
    /// Organizational transaction volume
    pub transaction_volume: u32,
    /// Organizational reliability score
    pub org_reliability: f64,
    /// Resource pool size
    pub resource_pool_size: u32,
}
```

#### 6.3.2 Reputation Functions

**SPEC-FUT-REP-04: Organizational Reputation Functions**

```rust
// Get organizational reputation (external view)
#[hdk_extern]
pub fn get_organizational_reputation(org_agent: AgentPubKey) -> ExternResult<OrganizationalReputationSummary>;

// Get delegate performance (organizational admin only)
#[hdk_extern]
pub fn get_delegate_performance(
    org_agent: AgentPubKey,
    delegate: AgentPubKey
) -> ExternResult<ReputationSummary>;

// Issue organizational PPR with internal attribution
#[hdk_extern]
pub fn issue_organizational_ppr(
    commitment_hash: ActionHash,
    event_hash: ActionHash,
    performed_by: AgentPubKey,
    performance_metrics: PerformanceMetrics
) -> ExternResult<ActionHash>;
```

### 6.4 Bridge Service Architecture

#### 6.4.1 Node.js Bridge Service Specification

**SPEC-FUT-BRG-01: Bridge Service Core Architecture**

The bridge service acts as a RESTful interface between organizational systems (ERP, Tiki) and Holochain:

```
Organizational System (PHP/Python) <--HTTP/JSON--> Node.js Bridge <--WebSocket--> Holochain Conductor
```

**Components:**
- **REST API Layer**: Express.js or Fastify for HTTP endpoints
- **Holochain Client**: `@holochain/client` for WebSocket communication
- **Cache Layer**: Redis for frequently accessed data
- **Queue Layer**: Bull/BullMQ for async operations
- **Signal Handler**: Real-time event forwarding to organizational systems

**SPEC-FUT-BRG-02: Bridge Service Data Structures**

```typescript
// Bridge configuration
interface BridgeConfig {
  adminWsUrl: string;        // Holochain Admin WebSocket URL
  appWsUrl: string;          // Holochain App WebSocket URL
  appId: string;             // Nondominium hApp ID
  redisUrl: string;          // Redis connection URL
  orgWebhookUrl: string;     // Organizational system webhook endpoint
  webhookSecret: string;     // HMAC signature secret
  cacheEnabled: boolean;     // Enable/disable caching
  cacheTTL: number;          // Cache time-to-live (seconds)
}

// Bridge request format
interface BridgeRequest {
  dna_hash: string;          // Nondominium DNA hash
  agent_key: string;         // Organizational agent key
  zome: string;              // Target zome name
  function: string;          // Target function name
  payload: any;              // Function payload
  delegate?: string;         // Optional delegate agent key
}

// Bridge response format
interface BridgeResponse {
  success: boolean;
  data?: any;
  error?: string;
  cached?: boolean;
  timestamp: number;
}
```

**SPEC-FUT-BRG-03: Bridge REST API Endpoints**

Core endpoints that organizational systems interact with:

```typescript
// Resource management
POST   /api/resources
GET    /api/resources/search
GET    /api/resources/:hash
POST   /api/resources/:hash/use
DELETE /api/resources/:hash

// Transaction management
POST   /api/commitments
GET    /api/commitments/:hash
POST   /api/events
GET    /api/events/by-resource/:resource_hash

// Reputation queries
GET    /api/reputation/:agent_id/summary
GET    /api/reputation/:agent_id/receipts

// Batch operations
POST   /api/batch

// Organizational management
POST   /api/org/delegations
DELETE /api/org/delegations/:hash
GET    /api/org/delegations/active
GET    /api/org/reputation

// Health and monitoring
GET    /health
GET    /metrics
```

**SPEC-FUT-BRG-04: Signal Forwarding**

Real-time signal forwarding from Holochain to organizational systems:

```typescript
// Signal handler
class SignalForwarder {
  async handleSignal(signal: HolochainSignal): Promise<void> {
    // Transform Holochain signal to organizational format
    const orgEvent = this.transformSignal(signal);
    
    // POST to organizational webhook
    await this.postToWebhook(orgEvent);
  }
  
  private transformSignal(signal: HolochainSignal): OrganizationalEvent {
    return {
      type: signal.data.type,
      payload: signal.data.payload,
      timestamp: Date.now(),
      signature: this.generateHMAC(signal)
    };
  }
}
```

#### 6.4.2 Organizational System Integration

**SPEC-FUT-BRG-05: PHP Client Library**

PHP library for Tiki and similar systems:

```php
class NondominiumClient {
    private $bridge_url;
    private $org_agent_key;
    private $delegate_key;
    
    public function __construct($bridge_url, $org_agent_key, $delegate_key = null);
    
    // Resource operations
    public function createResource($spec_hash, $quantity, $unit);
    public function searchResources($query = null);
    public function initiateUse($resource_hash, $receiver, $start_time, $end_time);
    
    // Batch operations
    public function batchOperations($operations);
    
    // Reputation queries
    public function getOrganizationalReputation();
    public function getDelegatePerformance($delegate_agent);
    
    // Delegation management
    public function createDelegation($delegate, $capabilities, $limits = null);
    public function revokeDelegation($delegation_hash);
}
```

**SPEC-FUT-BRG-06: Python Client Library**

Python library for ERPLibre/Odoo:

```python
class NondominiumBridgeClient:
    def __init__(self, bridge_url: str, org_agent_key: str, delegate_key: str = None):
        self.bridge_url = bridge_url
        self.org_agent_key = org_agent_key
        self.delegate_key = delegate_key
    
    # Resource operations
    def create_resource(self, spec_hash: str, quantity: float, unit: str) -> dict:
        pass
    
    def search_resources(self, query: str = None) -> list:
        pass
    
    # Batch operations
    def batch_operations(self, operations: list) -> list:
        pass
    
    # Webhook handling
    def handle_signal(self, signal: dict) -> None:
        pass
```

### 6.5 Organizational Governance Architecture

#### 6.5.1 Policy-Driven Governance

**SPEC-FUT-GOV-01: Organizational Governance Policy**

```rust
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct OrganizationalGovernancePolicy {
    /// Organization this policy applies to
    pub org_agent: AgentPubKey,
    /// Automated approval rules
    pub approval_rules: Vec<ApprovalRule>,
    /// Multi-signature requirements
    pub multisig_requirements: Vec<MultiSigRequirement>,
    /// Policy version
    pub version: String,
    /// Policy effective date
    pub effective_at: Timestamp,
}
```

**SPEC-FUT-GOV-02: Approval Rule**

```rust
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct ApprovalRule {
    /// Rule name
    pub name: String,
    /// Conditions for automatic approval
    pub conditions: Vec<Condition>,
    /// Actions this rule applies to
    pub applies_to: Vec<VfAction>,
    /// Whether approval is automatic or manual
    pub auto_approve: bool,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Condition {
    pub field: String,           // e.g., "resource_value", "borrower_reputation"
    pub operator: Operator,      // e.g., "greater_than", "less_than", "equals"
    pub value: String,           // Comparison value
}
```

**SPEC-FUT-GOV-03: Multi-Signature Requirement**

```rust
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct MultiSigRequirement {
    /// Transaction types requiring multi-sig
    pub transaction_types: Vec<String>,
    /// Minimum number of signatures required
    pub min_signatures: u32,
    /// Required roles for signers
    pub required_roles: Vec<String>,
    /// Value threshold for triggering multi-sig
    pub value_threshold: Option<f64>,
}
```

#### 6.5.2 Governance Functions

**SPEC-FUT-GOV-04: Organizational Governance Functions**

```rust
// Set organizational governance policy
#[hdk_extern]
pub fn set_governance_policy(policy: OrganizationalGovernancePolicy) -> ExternResult<ActionHash>;

// Evaluate approval request against policy
#[hdk_extern]
pub fn evaluate_approval_request(
    action: VfAction,
    context: ApprovalContext
) -> ExternResult<ApprovalDecision>;

// Initiate multi-signature transaction
#[hdk_extern]
pub fn initiate_multisig_transaction(
    action: VfAction,
    resource_hash: ActionHash,
    required_signers: Vec<AgentPubKey>
) -> ExternResult<ActionHash>;

// Sign multi-signature transaction
#[hdk_extern]
pub fn sign_multisig_transaction(
    transaction_hash: ActionHash,
    signature: CryptographicSignature
) -> ExternResult<()>;

// Check multi-signature completion
#[hdk_extern]
pub fn check_multisig_status(transaction_hash: ActionHash) -> ExternResult<MultiSigStatus>;
```

### 6.6 Device & Session Management

#### 6.6.1 Session Management Architecture

**SPEC-FUT-DEV-01: Session Entry**

```rust
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct OrganizationalSession {
    /// Session identifier
    pub session_id: String,
    /// Organizational agent
    pub org_agent: AgentPubKey,
    /// Delegate agent for this session
    pub delegate: AgentPubKey,
    /// Device identifier
    pub device_id: String,
    /// Session creation time
    pub created_at: Timestamp,
    /// Session expiry time
    pub expires_at: Timestamp,
    /// Session status
    pub status: SessionStatus,
    /// OAuth/SSO token reference (hashed)
    pub auth_token_hash: Option<Hash>,
}
```

**SPEC-FUT-DEV-02: Device Registration**

```rust
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct RegisteredDevice {
    /// Device identifier
    pub device_id: String,
    /// Organization this device belongs to
    pub org_agent: AgentPubKey,
    /// Device type (e.g., "tablet", "mobile", "workstation")
    pub device_type: String,
    /// Whether device is shared or personal
    pub is_shared: bool,
    /// Registered delegates for this device
    pub authorized_delegates: Vec<AgentPubKey>,
    /// Device registration time
    pub registered_at: Timestamp,
    /// Device status
    pub status: DeviceStatus,
}
```

#### 6.6.2 Session Functions

**SPEC-FUT-DEV-03: Session Management Functions**

```rust
// Create organizational session
#[hdk_extern]
pub fn create_session(
    delegate: AgentPubKey,
    device_id: String,
    auth_token_hash: Option<Hash>
) -> ExternResult<String>; // Returns session_id

// Validate active session
#[hdk_extern]
pub fn validate_session(session_id: String) -> ExternResult<bool>;

// Terminate session
#[hdk_extern]
pub fn terminate_session(session_id: String) -> ExternResult<()>;

// Map OAuth token to Holochain capability
#[hdk_extern]
pub fn map_oauth_to_capability(
    oauth_token_hash: Hash,
    delegate: AgentPubKey
) -> ExternResult<CapabilityGrant>;

// Register organizational device
#[hdk_extern]
pub fn register_device(
    device_id: String,
    device_type: String,
    is_shared: bool
) -> ExternResult<ActionHash>;

// Revoke device access remotely
#[hdk_extern]
pub fn revoke_device_access(device_id: String) -> ExternResult<()>;
```

### 6.7 Custody vs Ownership Architecture

#### 6.7.1 Organizational Resource Ownership

**SPEC-FUT-OWN-01: Extended Resource Entry**

```rust
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct OrganizationalEconomicResource {
    /// Standard resource fields
    pub base_resource: EconomicResource,
    /// Owner (may differ from custodian in org context)
    pub owner: AgentPubKey,
    /// Current physical location
    pub location: Option<LocationInfo>,
    /// Internal organizational tracking ID
    pub internal_id: Option<String>,
    /// Legal contract attachment (hashed)
    pub contract_hash: Option<Hash>,
}
```

**SPEC-FUT-OWN-02: Location Tracking**

```rust
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct LocationInfo {
    /// Location type (e.g., "warehouse", "service_truck", "customer_site")
    pub location_type: String,
    /// Location identifier
    pub location_id: String,
    /// Geographic coordinates (optional)
    pub coordinates: Option<(f64, f64)>,
    /// Updated timestamp
    pub updated_at: Timestamp,
}
```

**SPEC-FUT-OWN-03: Internal Transfer Event**

```rust
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct InternalTransferEvent {
    /// Resource being transferred
    pub resource: ActionHash,
    /// Organization owning the resource
    pub organization: AgentPubKey,
    /// Previous custodian (employee)
    pub from_custodian: AgentPubKey,
    /// New custodian (employee)
    pub to_custodian: AgentPubKey,
    /// Previous location
    pub from_location: Option<LocationInfo>,
    /// New location
    pub to_location: Option<LocationInfo>,
    /// Transfer timestamp
    pub transferred_at: Timestamp,
    /// Does NOT trigger ownership change
    pub is_internal: bool,
}
```

#### 6.7.2 Ownership Functions

**SPEC-FUT-OWN-04: Organizational Ownership Functions**

```rust
// Internal custody transfer (within organization)
#[hdk_extern]
pub fn internal_custody_transfer(
    resource_hash: ActionHash,
    new_custodian: AgentPubKey,
    new_location: Option<LocationInfo>
) -> ExternResult<ActionHash>;

// Update resource location without custody change
#[hdk_extern]
pub fn update_resource_location(
    resource_hash: ActionHash,
    location: LocationInfo
) -> ExternResult<()>;

// Attach legal contract to commitment
#[hdk_extern]
pub fn attach_contract(
    commitment_hash: ActionHash,
    contract_hash: Hash
) -> ExternResult<()>;

// Reconcile organizational inventory
#[hdk_extern]
pub fn reconcile_inventory(
    org_agent: AgentPubKey,
    inventory_snapshot: Vec<ResourceInventoryItem>
) -> ExternResult<ReconciliationReport>;
```

### 6.8 Architecture Modularity Specifications

**SPEC-FUT-ARCH-01: Context Detection**

The system should automatically detect operational context:

```rust
#[derive(Serialize, Deserialize, Debug, Clone)]
pub enum AgentContext {
    PureP2P,                              // Individual human agent
    Organizational(OrganizationalAgent),  // Organizational agent
    Delegate(AgentPubKey, AgentPubKey),  // Delegate acting for organization
}

// Determine agent context
#[hdk_extern]
pub fn get_agent_context(agent: AgentPubKey) -> ExternResult<AgentContext>;
```

**SPEC-FUT-ARCH-02: Pluggable Governance**

Governance logic should be modular and swappable:

```rust
pub trait GovernanceModule {
    fn evaluate_action(&self, action: VfAction, context: ActionContext) -> Result<ApprovalDecision>;
    fn get_validation_requirements(&self, action: VfAction) -> ValidationRequirements;
}

// P2P Governance Module
pub struct P2PGovernanceModule;
impl GovernanceModule for P2PGovernanceModule { /* ... */ }

// Organizational Governance Module
pub struct OrganizationalGovernanceModule;
impl GovernanceModule for OrganizationalGovernanceModule { /* ... */ }
```

**SPEC-FUT-ARCH-03: Unified Reputation Framework**

Reputation calculation should work across contexts:

```rust
pub trait ReputationCalculator {
    fn calculate_reputation(&self, agent: AgentPubKey) -> Result<ReputationSummary>;
    fn aggregate_pprs(&self, claims: Vec<PrivateParticipationClaim>) -> PerformanceMetrics;
}

// Works for both P2P and organizational agents
#[hdk_extern]
pub fn calculate_unified_reputation(agent: AgentPubKey) -> ExternResult<ReputationSummary> {
    let context = get_agent_context(agent)?;
    let calculator = match context {
        AgentContext::PureP2P => P2PReputationCalculator::new(),
        AgentContext::Organizational(_) => OrganizationalReputationCalculator::new(),
        AgentContext::Delegate(org, _) => OrganizationalReputationCalculator::new(),
    };
    calculator.calculate_reputation(agent)
}
```

### 6.9 Deployment Specifications

**SPEC-FUT-DEPLOY-01: Docker Compose Architecture**

Standard deployment for organizational integration:

```yaml
services:
  holochain:
    image: holochain/holochain:latest
    ports:
      - "8000:8000"  # Admin WebSocket
      - "8888:8888"  # App WebSocket
  
  bridge:
    build: ./bridge-service
    environment:
      - HC_ADMIN_WS_URL=ws://holochain:8000
      - HC_APP_WS_URL=ws://holochain:8888
      - REDIS_URL=redis://redis:6379
    depends_on:
      - holochain
      - redis
  
  redis:
    image: redis:7-alpine
  
  organizational_system:
    # ERP, Tiki, or other organizational platform
    depends_on:
      - bridge
```

**SPEC-FUT-DEPLOY-02: Bridge Service Health Monitoring**

```typescript
interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  holochain: {
    connected: boolean;
    latency: number;
  };
  redis: {
    connected: boolean;
    memory_usage: number;
  };
  queue: {
    jobs_pending: number;
    jobs_failed: number;
  };
  uptime: number;
  version: string;
}

// Health check endpoint
GET /health -> HealthStatus
```

### 6.10 Implementation Priorities

**Phase 1 (Current)**: Pure P2P implementation
- Focus: Individual agents, direct custody, simple governance

**Phase 2 (Near-term Future Development)**:
- Delegation pattern (SPEC-FUT-ID-01 through SPEC-FUT-ID-05)
- Organizational reputation (SPEC-FUT-REP-01 through SPEC-FUT-REP-04)
- Basic bridge service (SPEC-FUT-BRG-01 through SPEC-FUT-BRG-03)

**Phase 3 (Long-term Future Development)**:
- Multi-signature governance (SPEC-FUT-GOV-01 through SPEC-FUT-GOV-04)
- Session & device management (SPEC-FUT-DEV-01 through SPEC-FUT-DEV-03)
- Full organizational features (custody vs ownership, policy automation)

### 6.11 Migration Strategy

**SPEC-FUT-MIGRATE-01: Backward Compatibility**

New organizational features must not break existing P2P functionality:
- P2P agents can interact with organizational agents seamlessly
- Core ValueFlows data structures remain unchanged
- Organizational features are additive, not breaking changes

**SPEC-FUT-MIGRATE-02: Data Migration**

When transitioning from P2P-only to organizational support:
- Existing PPRs remain valid and portable
- Existing resources can be claimed by organizations
- Agent identities can be promoted to organizational agents
