
# nondominium - Technical Specifications

## 1. Introduction

### 1.1 Purpose
This document provides the detailed technical specifications for the nondominium Holochain application (hApp). It is based on the requirements outlined in `requirements.md` and the architecture described in the nondominium project document. It is intended for Holochain developers.

### 1.2 Guiding Principles
-   **Valueflows Compliance**: Data structures will adhere to the Valueflows standard.
-   **Agent-Centricity**: All data is created and validated from the perspective of the individual agent.
-   **Capability-Based Security**: Access and permissions will be managed through Holochain's capability token mechanism.

## 2. Holochain DNA and Zome Structure

As per the project's architectural description, the hApp will be composed of three distinct zomes. This separation of concerns will enhance modularity and clarity.

-   **`zome_person`**: Handles agent identity, profiles, and roles.
-   **`zome_resource`**: Manages the lifecycle of Economic Resources and their Specifications.
-   **`zome_governance`**: Implements the logic for Commitments, Claims, and other governance-related actions.

## 3. Data Structures (Integrity Zome Entries)

### 3.1. `zome_person` Entries

#### 3.1.1. `AgentProfile`
Stores public-facing information about an agent.
-   **Fields**:
    -   `agent_pub_key: AgentPubKey`: The public key of the agent.
    -   `name: String`: The agent's chosen public name/pseudonym.
    -   `avatar_url: Option<String>`
-   **Links**:
    -   `AllAgents -> AgentProfile`: Anchor for discovering all agent profiles.

#### 3.1.2. `PrivateProfile`
-   **Description**: Stores an agent's private Personal Identifiable Information (PII) as a Holochain private entry in the agent's source chain. The agent can grant access to this data on a case-by-case basis (see https://developer.holochain.org/build/entries/).
-   `private_data: ...` (fields like legal name, address, email, photo ID hash)
-   **Links**:
    -   `AgentProfile -> PrivateProfile`: Links the public profile to the private data.

#### 3.1.3. `Role`
Defines a specific role an agent can have (e.g., `User`, `Repair`, `Transport`, `Storage`).
-   **Fields**:
    -   `role_name: String`
    -   `validated_by: Option<AgentPubKey>`: The Accountable or Primary Accountable Agent who validated the role assignment (fulfills REQ-GOV-06).
    -   `validation_receipt: Option<ActionHash>`: Link to the ValidationReceipt for this role assignment.
-   **Links**:
    -   `AgentProfile -> Role`: Assigns a role to an agent. This link's tag could hold validation info (e.g., who validated the role).

### 3.2. `zome_resource` Entries

#### 3.2.1. `ResourceSpecification`
A template for a class of nondominium resources.
-   **Fields**:
    -   `name: String`
    -   `description: String`
    -   `image_url: Option<String>`
    -   `governance_rules: Vec<GovernanceRule>`: Embedded rules for resource access and management. Fulfills `REQ-GOV-06`.
-   **Links**:
    -   `AllResourceSpecifications -> ResourceSpecification`: Anchor for discovery.

#### 3.2.2. `GovernanceRule`
A rule embedded within a ResourceSpecification that defines how resources can be accessed and managed.
-   **Fields**:
    -   `rule_type: String`: e.g., "access_requirement", "usage_limit", "transfer_conditions"
    -   `rule_data: String`: JSON-encoded rule parameters
    -   `enforced_by: Option<AgentRole>`: Role required to enforce this rule

#### 3.2.3. `EconomicResource`
A concrete instance of a nondominium resource.
-   **Fields**:
    -   `conforms_to: ActionHash`: Link to the `ResourceSpecification`.
    -   `quantity: f64`
    -   `unit: String`
    -   `custodian: AgentPubKey`: The Primary Accountable Agent holding the resource.
-   **Links**:
    -   `ResourceSpecification -> EconomicResource`: Find all resources of a type.
    -   `AgentProfile -> EconomicResource` (as Custodian): Link to the agent currently holding it. Tag: "custodian".

### 3.3. `zome_governance` Entries

#### 3.3.1. `EconomicEvent`
Records a consummated action on a resource.
-   **Fields**:
    -   `action: String`: e.g., "transfer-custody", "use", "produce".
    -   `provider: AgentPubKey`
    -   `receiver: AgentPubKey`
    -   `resource_inventoried_as: ActionHash`: Link to the `EconomicResource`.
    -   `affects: ActionHash`: Link to the `EconomicResource` that is affected.
-   **Links**:
    -   `EconomicResource -> EconomicEvent`: History of events for a resource.

#### 3.3.2. `Commitment`
An intention to perform an `EconomicEvent`.
-   **Fields**:
    -   `action: String`: The intended action (e.g., "access-for-use").
    -   `provider: AgentPubKey`
    -   `receiver: AgentPubKey`
    -   `input_of: ActionHash`: (Optional) Link to a `Process`.
    -   `due_date: Timestamp`
-   **Links**:
    -   `AgentProfile -> Commitment`: Agent's outgoing/incoming commitments.

#### 3.3.3. `Claim`
Fulfills a `Commitment`.
-   **Fields**:
    -   `fulfills: ActionHash`: Link to the `Commitment`.
    -   `fulfilled_by: ActionHash`: Link to the resulting `EconomicEvent`.
-   **Links**:
    -   `Commitment -> Claim`: Shows a commitment has been actioned.

#### 3.3.4. `ValidationReceipt`
Records validation of resources, events, or agent promotions by Accountable Agents.
-   **Fields**:
    -   `validator: AgentPubKey`: The agent performing the validation
    -   `validated_item: ActionHash`: Link to the item being validated (Resource, Event, Role, or Agent promotion)
    -   `validation_type: String`: e.g., "resource_approval", "process_validation", "identity_verification", "role_assignment", "agent_promotion"
    -   `approved: bool`: Whether the validation was approved or rejected
    -   `notes: Option<String>`: Optional validation notes
-   **Links**:
    -   `ValidatedItem -> ValidationReceipt`: Track all validations for an item

#### 3.3.5. `ResourceValidation`
Tracks the overall validation status of a resource requiring peer review.
-   **Fields**:
    -   `resource: ActionHash`: Link to the `EconomicResource` being validated
    -   `validation_scheme: String`: e.g., "2-of-3", "simple_majority"
    -   `required_validators: u32`: Number of validators needed
    -   `current_validators: u32`: Number of validators who have responded
    -   `status: String`: "pending", "approved", "rejected"
-   **Links**:
    -   `EconomicResource -> ResourceValidation`: One validation per resource

## 4. Zome Functions (Coordinator Zomes)

### 4.1. `zome_person` Functions
-   `create_profile(name: String, avatar: Option<String>, private_profile: ...) -> Record`
-   `get_my_profile() -> (Record, Record)`
-   `get_agent_profile(agent: AgentPubKey) -> Option<Record>`
-   `assign_role(agent: AgentPubKey, role: String) -> ActionHash` (Requires validation by Accountable Agent; for specialized roles, must follow REQ-GOV-06 validation process)
-   `promote_agent_to_accountable(simple_agent: AgentPubKey, private_profile_hash: ActionHash) -> ValidationReceipt`: Promotes a Simple Agent to Accountable Agent status after successful validation (REQ-GOV-08).

### 4.2. `zome_resource` Functions
-   `create_resource_spec(name: String, description: String, governance_rules: Vec<GovernanceRule>) -> Record`: Creates a new resource specification with embedded governance rules. Fulfills `REQ-GOV-06`.
    -   **Capability**: `restricted_access` (Only Accountable Agents can define new resource types)
-   `create_economic_resource(spec_hash: ActionHash, quantity: f64, unit: String) -> Record`: Creates a new Economic Resource. This is the first step for a Simple Agent (`REQ-USER-S-05`). Automatically triggers validation process (`REQ-GOV-02`).
    -   **Capability**: `general_access`
-   `get_all_resource_specs() -> Vec<Record>`: Discovery function for all resource specifications.
    -   **Capability**: `general_access`
-   `get_resources_by_spec(spec_hash: ActionHash) -> Vec<Record>`: Filtered discovery by specification.
    -   **Capability**: `general_access`
-   `get_my_resources() -> Vec<Record>`: Returns resources where the calling agent is the custodian.
    -   **Capability**: `general_access`
-   `transfer_custody(resource_hash: ActionHash, new_custodian: AgentPubKey) -> Record`: Transfers custody and creates an `EconomicEvent` via cross-zome call to `zome_governance`. Enforces governance rules (`REQ-GOV-07`).
    -   **Capability**: `restricted_access`
-   `check_first_resource_requirement(agent: AgentPubKey) -> bool`: Checks if an agent has created at least one resource. Fulfills `REQ-GOV-01`.
    -   **Capability**: `general_access`

### 4.3. `zome_governance` Functions
-   `propose_commitment(action: String, resource_hash: ActionHash, provider: AgentPubKey, due: Timestamp) -> Record`: Creates a future intention to act on a resource.
    -   **Capability**: `restricted_access`
-   `accept_commitment(commitment_hash: ActionHash) -> Record`: Accepts a proposed commitment.
    -   **Capability**: `restricted_access`
-   `claim_commitment(commitment_hash: ActionHash, resource_id: ActionHash) -> Record`: Fulfills a commitment and creates the corresponding `EconomicEvent`.
    -   **Capability**: `restricted_access`
-   `log_initial_transfer(resource_hash: ActionHash, receiver: AgentPubKey, quantity: f64) -> Record`: A simplified function for a `Simple Agent`'s first transaction (`REQ-USER-S-07`). This triggers the validation process for Simple Agent promotion (`REQ-GOV-02`).
    -   **Capability**: `general_access`
-   `validate_new_resource(resource_hash: ActionHash, validation_scheme: String) -> ValidationReceipt`: Peer-validates a newly created nondominium Resource. Fulfills `REQ-USER-A-07` and `REQ-GOV-02`. Supports configurable validation schemes (`REQ-GOV-04`).
    -   **Capability**: `restricted_access`
-   `validate_process_event(event_hash: ActionHash) -> ValidationReceipt`: Validates an event related to a core process (e.g., Storage, Repair). Fulfills `REQ-USER-A-08` and `REQ-GOV-05`.
    -   **Capability**: `restricted_access`
-   `validate_agent_identity(simple_agent: AgentPubKey, private_profile_hash: ActionHash) -> ValidationReceipt`: Validates a Simple Agent's identity information and their first resource transfer, potentially promoting them to Accountable Agent status. Full validation requires access to the agent's private entry. Fulfills REQ-GOV-08.
    -   **Capability**: `restricted_access`
-   `check_validation_status(resource_hash: ActionHash) -> ResourceValidation`: Returns the current validation status of a resource.
    -   **Capability**: `general_access`
-   `get_validation_history(item_hash: ActionHash) -> Vec<ValidationReceipt>`: Returns all validation receipts for a given item.
    -   **Capability**: `general_access`

## 5. Security and Validation
-   **Capability Tokens**: Zome functions will be protected by capability grants. `Simple Agents` get a general token. `Accountable Agents` get a restricted token after their first validated transaction (`REQ-SEC-01`).
-   **Validation Logic**:
    -   The `zome_person` integrity zome will validate that only an Accountable Agent can assign a `Role`, and that specialized roles (Transport, Repair, Storage) require validation by existing Primary Accountable Agents per REQ-GOV-04 (Specialized Role Validation).
    -   The `zome_person` integrity zome will validate that promotion from Simple Agent to Accountable Agent requires validation by an Accountable or Primary Accountable Agent, following the process in REQ-GOV-03 (Agent Validation).
    -   The `zome_resource` integrity zome ensures a resource cannot be created without a valid `ResourceSpecification` and enforces embedded governance rules (`REQ-GOV-07`).
    -   The `zome_resource` integrity zome ensures that new resources start in a 'pending validation' state and are set to 'validated' upon successful peer review, as described in REQ-GOV-02 (Resource Validation).
    -   The `zome_governance` integrity zome ensures a `Claim` matches its `Commitment` and validates all validation receipts for authenticity.
    -   The system supports configurable validation schemes (e.g., 2-of-3, N-of-M reviewers) for nondominium Resource approval per REQ-GOV-06 (Multi-Reviewer Validation).
    -   Certain types of validation are restricted to Agents with specific Roles per REQ-GOV-05 (Role-Gated Validation).
-   **Cross-Zome Calls**: Functions will call other zomes to maintain transactional integrity (e.g., `transfer_custody` must create a valid `EconomicEvent` and enforce governance rules).
-   **First Resource Requirement**: The system enforces that Simple Agents must create at least one resource before accessing others (`REQ-GOV-01`), implemented through the `check_first_resource_requirement` function.