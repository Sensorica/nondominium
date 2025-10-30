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

## 3. Data Structures (Integrity Zome Entries)

### 3.1. `zome_person` Entries

#### 3.1.1. `AgentProfile`

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

### 3.2. `zome_resource` Entries

#### 3.2.1. `ResourceSpecification`

A template for a class of nondominium resources.

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

A concrete instance of a nondominium resource.

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

## 4. Zome Functions (Coordinator Zomes)

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
- `validate_new_resource(resource_hash: ActionHash, validation_scheme: String) -> ValidationReceipt`: Peer-validates a newly created nondominium Resource. Fulfills `REQ-USER-A-07` and `REQ-GOV-02`. Supports configurable validation schemes (`REQ-GOV-04`).
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
  - The system supports configurable validation schemes (e.g., 2-of-3, N-of-M reviewers) for nondominium Resource approval per REQ-GOV-06 (Multi-Reviewer Validation).
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
