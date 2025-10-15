# nondominium - API Specifications

## Overview
This document contains the API specifications for the nondominium Holochain application, extracted from the main technical specifications document.

## `zome_person` API Functions

### Profile Management

#### `create_profile`
```rust
create_profile(
    name: String,
    avatar: Option<String>,
    private_profile: PrivateProfileData
) -> Record
```
Creates a new agent profile with public and private components.

#### `get_my_profile`
```rust
get_my_profile() -> (Record, Record)
```
Returns both public and private profile records for the calling agent.

#### `get_agent_profile`
```rust
get_agent_profile(agent: AgentPubKey) -> Option<Record>
```
Retrieves public profile information for a specific agent.

### Role Management

#### `assign_role`
```rust
assign_role(agent: AgentPubKey, role: String) -> ActionHash
```
Assigns a role to an agent. Requires validation by Accountable Agent.
*Capability: restricted_access*

#### `promote_agent_to_accountable`
```rust
promote_agent_to_accountable(
    simple_agent: AgentPubKey,
    private_profile_hash: ActionHash
) -> ValidationReceipt
```
Promotes a Simple Agent to Accountable Agent status after successful validation.
*Capability: restricted_access*

### Reputation System

#### `get_my_participation_claims`
```rust
get_my_participation_claims() -> Vec<PrivateParticipationClaim>
```
Returns all private participation receipts for the calling agent.
*Capability: general_access*

#### `get_reputation_summary`
```rust
get_reputation_summary() -> ReputationSummary
```
Calculates and returns aggregated reputation metrics based on participation claims.
*Capability: general_access*

#### `get_participation_claims_by_type`
```rust
get_participation_claims_by_type(
    claim_type: ParticipationClaimType
) -> Vec<PrivateParticipationClaim>
```
Returns participation claims filtered by type.
*Capability: general_access*

## `zome_resource` API Functions

### Resource Management

#### `create_resource_spec`
```rust
create_resource_spec(
    name: String,
    description: String,
    governance_rules: Vec<GovernanceRule>
) -> Record
```
Creates a new resource specification with embedded governance rules.
*Capability: restricted_access*

#### `create_economic_resource`
```rust
create_economic_resource(
    spec_hash: ActionHash,
    quantity: f64,
    unit: String
) -> Record
```
Creates a new Economic Resource. Automatically triggers validation process.
*Capability: general_access*

### Resource Discovery

#### `get_all_resource_specs`
```rust
get_all_resource_specs() -> Vec<Record>
```
Discovery function for all resource specifications.
*Capability: general_access*

#### `get_resources_by_spec`
```rust
get_resources_by_spec(spec_hash: ActionHash) -> Vec<Record>
```
Filtered discovery by specification.
*Capability: general_access*

#### `get_my_resources`
```rust
get_my_resources() -> Vec<Record>
```
Returns resources where the calling agent is the custodian.
*Capability: general_access*

### Resource Operations

#### `transfer_custody`
```rust
transfer_custody(
    resource_hash: ActionHash,
    new_custodian: AgentPubKey
) -> Record
```
Transfers custody and creates an EconomicEvent via cross-zome call.
*Capability: restricted_access*

#### `check_first_resource_requirement`
```rust
check_first_resource_requirement(agent: AgentPubKey) -> bool
```
Checks if an agent has created at least one resource.
*Capability: general_access*

### Economic Process Management

#### `initiate_economic_process`
```rust
initiate_economic_process(
    process_type: String,
    resource_hashes: Vec<ActionHash>,
    location: Option<String>
) -> Record
```
Initiates an Economic Process (Use, Transport, Storage, Repair).
*Capability: restricted_access*

#### `complete_economic_process`
```rust
complete_economic_process(
    process_hash: ActionHash,
    output_resources: Vec<ActionHash>
) -> Record
```
Completes an Economic Process and records any resource changes.
*Capability: restricted_access*

#### `get_active_processes`
```rust
get_active_processes() -> Vec<Record>
```
Returns all active processes initiated by the calling agent.
*Capability: general_access*

#### `get_process_by_resource`
```rust
get_process_by_resource(resource_hash: ActionHash) -> Vec<Record>
```
Returns all processes that have used a specific resource.
*Capability: general_access*

## `zome_governance` API Functions

### Commitment Management

#### `propose_commitment`
```rust
propose_commitment(
    action: VfAction,
    resource_hash: ActionHash,
    provider: AgentPubKey,
    due: Timestamp
) -> Record
```
Creates a future intention to act on a resource.
*Capability: restricted_access*

#### `accept_commitment`
```rust
accept_commitment(commitment_hash: ActionHash) -> Record
```
Accepts a proposed commitment.
*Capability: restricted_access*

#### `claim_commitment`
```rust
claim_commitment(
    commitment_hash: ActionHash,
    resource_id: ActionHash
) -> Record
```
Fulfills a commitment and creates the corresponding EconomicEvent.
*Capability: restricted_access*

### Validation Functions

#### `validate_new_resource`
```rust
validate_new_resource(
    resource_hash: ActionHash,
    validation_scheme: String
) -> ValidationReceipt
```
Peer-validates a newly created nondominium Resource.
*Capability: restricted_access*

#### `validate_process_event`
```rust
validate_process_event(event_hash: ActionHash) -> ValidationReceipt
```
Validates an event related to a core process.
*Capability: restricted_access*

#### `validate_agent_identity`
```rust
validate_agent_identity(
    simple_agent: AgentPubKey,
    private_profile_hash: ActionHash
) -> ValidationReceipt
```
Validates a Simple Agent's identity information and their first resource transfer.
*Capability: restricted_access*

#### `validate_process_completion`
```rust
validate_process_completion(process_hash: ActionHash) -> ValidationReceipt
```
Validates that an Economic Process was completed according to specifications.
*Capability: restricted_access*

### Specialized Functions

#### `log_initial_transfer`
```rust
log_initial_transfer(
    resource_hash: ActionHash,
    receiver: AgentPubKey,
    quantity: f64
) -> Record
```
Simplified function for a Simple Agent's first transaction.
*Capability: general_access*

#### `check_validation_status`
```rust
check_validation_status(resource_hash: ActionHash) -> ResourceValidation
```
Returns the current validation status of a resource.
*Capability: general_access*

#### `get_validation_history`
```rust
get_validation_history(item_hash: ActionHash) -> Vec<ValidationReceipt>
```
Returns all validation receipts for a given item.
*Capability: general_access*

#### `get_process_validation_requirements`
```rust
get_process_validation_requirements(process_type: String) -> ProcessValidationRequirements
```
Returns the validation requirements for a specific process type.
*Capability: general_access*

### Private Participation Receipt System

#### `issue_participation_receipts`
```rust
issue_participation_receipts(
    commitment_hash: ActionHash,
    event_hash: ActionHash,
    counterparty: AgentPubKey,
    performance_metrics: PerformanceMetrics
) -> (ActionHash, ActionHash)
```
Issues bi-directional Private Participation Claims for both agents.
*Capability: restricted_access*

#### `sign_participation_claim`
```rust
sign_participation_claim(
    claim_hash: ActionHash,
    signature: CryptographicSignature
) -> Record
```
Adds cryptographic signature to a participation claim.
*Capability: general_access*

#### `validate_participation_claim_signature`
```rust
validate_participation_claim_signature(claim_hash: ActionHash) -> bool
```
Validates the cryptographic signature of a participation claim.
*Capability: general_access*