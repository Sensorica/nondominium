# Nondominium API Reference

**Generated**: 2025-12-17
**Version**: 3.0 (Updated with Current Implementation)
**Scope**: Complete function documentation for all zomes based on actual codebase

---

## 🎯 API Overview

Nondominium implements a comprehensive REST-like API through Holochain zome functions, organized into three main zomes with distinct responsibilities. All functions follow consistent patterns for input validation, error handling, and DHT integration.

### API Conventions
- **Input Types**: Structured input parameters with validation
- **Return Types**: `ExternResult<T>` with comprehensive error handling
- **Authentication**: Agent identity automatically verified via `agent_info()`
- **Authorization**: Role-based access control enforced at function level
- **Auditing**: All operations create immutable audit trails

---

## 🔐 zome_person - Identity & Access Management

### Person Profile Management

#### `create_person(input: PersonInput) -> ExternResult<Record>`
**Purpose**: Create a new agent profile with discovery anchors
**Authorization**: Any agent can create their own profile
**Input**:
```rust
pub struct PersonInput {
    pub name: String,
    pub avatar_url: Option<String>,
    pub bio: Option<String>,
}
```
**Returns**: `Record` containing the created `Person` entry
**Side Effects**:
- Creates `Person` entry with agent public key
- Creates discovery anchor links for agent findability
- Links agent pubkey to person entry
**Error Cases**:
- `PersonError::PersonExists` - Agent already has a profile
- Network/DHT errors during entry creation

#### `get_latest_person_record(original_action_hash: ActionHash) -> ExternResult<Option<Record>>`
**Purpose**: Retrieve the most recent version of a person record
**Authorization**: Public access (person data is public)
**Input**: `ActionHash` of the original person entry
**Returns**: Latest `Record` entry or None if not found
**Error Cases**:
- `PersonError::PersonNotFound` - No person entry found
- Network/DHT errors during retrieval

#### `get_latest_person(original_action_hash: ActionHash) -> ExternResult<Person>`
**Purpose**: Retrieve the most recent version of a person entry
**Authorization**: Public access (person data is public)
**Input**: `ActionHash` of the original person entry
**Returns**: Latest `Person` entry with all current fields
**Error Cases**:
- `PersonError::PersonNotFound` - No person entry found
- `PersonError::SerializationError` - Record parsing failed

#### `update_person(input: UpdatePersonInput) -> ExternResult<Record>`
**Purpose**: Update an existing person profile
**Authorization**: Only profile owner can update
**Input**:
```rust
pub struct UpdatePersonInput {
    pub original_action_hash: ActionHash,
    pub name: Option<String>,
    pub avatar: Option<String>,
    pub bio: Option<String>,
    pub location: Option<String>,
    pub tags: Option<Vec<String>>,
}
```
**Returns**: Updated `Record` with new version
**Side Effects**:
- Creates new entry version with update links
- Updates discovery anchors if needed
- Maintains audit trail of changes
**Error Cases**:
- `PersonError::Unauthorized` - Not profile owner
- `PersonError::PersonNotFound` - Original entry not found

#### `get_all_persons(()) -> ExternResult<GetAllPersonsOutput>`
**Purpose**: Discover all agents in the network
**Authorization**: Public access for discovery
**Returns**:
```rust
pub struct GetAllPersonsOutput {
    pub persons: Vec<PersonProfile>,
}
```
**Performance**: Uses anchor-based traversal for efficient discovery

#### `get_person_profile(agent_pubkey: AgentPubKey) -> ExternResult<PersonProfileOutput>`
**Purpose**: Get comprehensive profile information for a specific agent
**Authorization**: Public access
**Returns**:
```rust
pub struct PersonProfileOutput {
    pub person: Option<Person>,
    pub role: Option<PersonRole>,
    pub capability_level: String,
}
```

#### `get_my_person_profile(()) -> ExternResult<PersonProfileOutput>`
**Purpose**: Get current agent's complete profile
**Authorization**: Current agent only
**Returns**: Full profile including private information
**Performance**: Optimized for current agent access patterns

#### `get_agent_person_links(agent_pubkey: AgentPubKey) -> ExternResult<Vec<Link>>`
**Purpose**: Get all links between an agent and person entries
**Authorization**: Public access
**Returns**: Vector of links showing agent-person relationships
**Use Case**: Multi-device support and relationship management

#### `get_agent_person(agent_pubkey: AgentPubKey) -> ExternResult<Option<ActionHash>>`
**Purpose**: Get the primary person associated with an agent
**Authorization**: Public access
**Returns**: ActionHash of person entry if association exists
**Use Case**: Agent-to-person lookup for profile access

#### `get_person_agents(person_hash: ActionHash) -> ExternResult<Vec<AgentPubKey>>`
**Purpose**: Get all agents associated with a person
**Authorization**: Public access
**Returns**: Vector of agent public keys
**Use Case**: Multi-device support and agent management

#### `add_agent_to_person(input: (AgentPubKey, ActionHash)) -> ExternResult<bool>`
**Purpose**: Associate an additional agent with a person (multi-device support)
**Authorization**: Person owner only
**Input**: Tuple of (agent_pubkey, person_hash)
**Returns**: Success status
**Use Case**: Adding new devices to existing person profile

#### `remove_agent_from_person(input: (AgentPubKey, ActionHash)) -> ExternResult<bool>`
**Purpose**: Remove agent association from a person
**Authorization**: Person owner only
**Input**: Tuple of (agent_pubkey, person_hash)
**Returns**: Success status
**Use Case**: Removing lost or deactivated devices

#### `is_agent_associated_with_person(input: (AgentPubKey, ActionHash)) -> ExternResult<bool>`
**Purpose**: Check if agent is associated with person
**Authorization**: Public access
**Input**: Tuple of (agent_pubkey, person_hash)
**Returns**: Boolean indicating association status
**Use Case**: Authorization checks and validation

#### `promote_agent_to_accountable(input: PromoteAgentInput) -> ExternResult<String>`
**Purpose**: Promote an agent to accountable status with validation
**Authorization**: Governance role required
**Input**:
```rust
pub struct PromoteAgentInput {
    pub agent: AgentPubKey,
    pub first_resource_hash: ActionHash,
}
```
**Returns**: String indicating new capability level
**Use Case**: Agent promotion workflow

---

### Private Data Management

#### `store_private_person_data(input: PrivatePersonDataInput) -> ExternResult<Record>`
**Purpose**: Store private personal data with encryption
**Authorization**: Current agent only
**Input**:
```rust
pub struct PrivatePersonDataInput {
    pub legal_name: String,
    pub email: String,
    pub phone: Option<String>,
    pub address: Option<String>,
    pub emergency_contact: Option<String>,
    pub time_zone: Option<String>,
    pub location: Option<String>,
}
```
**Returns**: Encrypted `Record` with private data
**Security**: Data encrypted before storage in DHT

#### `update_private_person_data(input: UpdatePrivatePersonDataInput) -> ExternResult<Record>`
**Purpose**: Update existing private personal data
**Authorization**: Current agent only
**Input**: Similar to PrivatePersonDataInput with optional fields for updates
**Returns**: Updated encrypted `Record`
**Security**: Data encrypted before storage in DHT

#### `get_my_private_person_data(()) -> ExternResult<Option<PrivatePersonData>>`
**Purpose**: Retrieve current agent's private data
**Authorization**: Current agent only
**Returns**: Decrypted private data if available
**Security**: Automatic decryption for authorized access

#### `get_agent_private_data(
    agent_pubkey: AgentPubKey,
    required_fields: Vec<String>,
) -> ExternResult<Option<PrivatePersonData>>`
**Purpose**: Access another agent's private data with authorization
**Authorization**: Requires valid capability grant
**Input**: Tuple of (agent_pubkey, required_fields)
**Returns**: Private data if access authorized
**Security**: Enforces capability-based access control

---

### Device Management

#### `register_device_for_person(input: RegisterDeviceInput) -> ExternResult<Record>`
**Purpose**: Register a new device for a person (multi-device support)
**Authorization**: Device owner or person representative
**Input**:
```rust
pub struct RegisterDeviceInput {
    pub device_id: String,
    pub device_name: String,
    pub device_type: String, // "mobile", "desktop", "tablet", "web", "server"
    pub person_hash: ActionHash,
}
```
**Returns**: Created `Device` entry record
**Side Effects**: Creates device-person relationship links

#### `get_devices_for_person(person_hash: ActionHash) -> ExternResult<Vec<DeviceInfo>>`
**Purpose**: Get all devices registered for a specific person
**Authorization**: Person owner or authorized agent
**Returns**: Vector of device information structures
**Use Case**: Multi-device management and security

#### `get_device_info(device_id: String) -> ExternResult<Option<DeviceInfo>>`
**Purpose**: Get detailed information about a specific device
**Authorization**: Device owner or authorized agent
**Returns**: Device information if device exists
**Use Case**: Device verification and management

#### `update_device_activity(device_id: String) -> ExternResult<bool>`
**Purpose**: Update the last active timestamp for a device
**Authorization**: Any authenticated request for the device
**Returns**: Success status
**Use Case**: Device activity tracking and security monitoring

#### `deactivate_device(device_id: String) -> ExternResult<bool>`
**Purpose**: Deactivate a device (revoke access)
**Authorization**: Device owner or person representative
**Returns**: Success status
**Security**: Prevents further access from deactivated device

#### `get_my_devices(()) -> ExternResult<Vec<DeviceInfo>>`
**Purpose**: Get all devices for the current agent
**Authorization**: Current agent only
**Returns**: Vector of device information for current agent
**Use Case**: Device management interface for users

---

### Capability-Based Sharing

#### `grant_private_data_access(input: GrantPrivateDataAccessInput) -> ExternResult<GrantPrivateDataAccessOutput>`
**Purpose**: Grant another agent access to specific private data fields
**Authorization**: Data owner only
**Input**:
```rust
pub struct GrantPrivateDataAccessInput {
    pub agent_to_grant: AgentPubKey,
    pub fields_allowed: Vec<String>,
    pub context: String,
    pub expires_in_days: Option<u32>,
}
```
**Returns**:
```rust
pub struct GrantPrivateDataAccessOutput {
    pub grant_hash: ActionHash,
    pub cap_secret: CapSecret,
}
```
**Security**: Creates granular, field-level access control

#### `create_private_data_cap_claim(input: CreatePrivateDataCapClaimInput) -> ExternResult<Record>`
**Purpose**: Create capability claim for private data access (for grantee)
**Authorization**: Any agent can create claims
**Input**:
```rust
pub struct CreatePrivateDataCapClaimInput {
    pub grantor: AgentPubKey,
    pub fields: Vec<String>,
    pub purpose: String,
    pub expires_at: Option<Timestamp>,
}
```
**Returns**: Capability claim record
**Security**: Creates cryptographically secure capability claim

#### `get_private_data_with_capability(input: GetPrivateDataWithCapabilityInput) -> ExternResult<FilteredPrivateData>`
**Purpose**: Access private data using capability claim
**Authorization**: Valid capability claim required
**Input**:
```rust
pub struct GetPrivateDataWithCapabilityInput {
    pub target_agent: AgentPubKey,
    pub cap_claim: CapClaim,
    pub cap_secret: CapSecret,
    pub requested_fields: Vec<String>,
}
```
**Returns**: Filtered private data based on authorized fields
**Security**: Cryptographic verification of capability claim

#### `get_my_capability_grants(()) -> ExternResult<Vec<PrivateDataCapabilityMetadata>>`
**Purpose**: List all active capability grants issued by current agent
**Authorization**: Current agent only
**Returns**: List of capability grants with metadata
**Utility**: For managing and revoking access permissions

#### `create_transferable_private_data_access(input: CreateTransferableAccessInput) -> ExternResult<Record>`
**Purpose**: Create transferable access capability for delegation
**Authorization**: Data owner only
**Input**:
```rust
pub struct CreateTransferableAccessInput {
    pub agent_pubkey: AgentPubKey,
    pub fields: Vec<String>,
    pub context: String,
    pub expires_at: Option<Timestamp>,
}
```
**Security**: Enables controlled delegation of access rights
**Use Case**: Service providers needing temporary access to client data

#### `revoke_private_data_access(grant_hash: ActionHash) -> ExternResult<()>`
**Purpose**: Revoke previously granted private data access
**Authorization**: Grant owner only
**Input**: ActionHash of the capability grant to revoke
**Security**: Immediately terminates access permissions
**Use Case**: Security incident response and access management

#### `validate_capability_grant(grant_hash: ActionHash) -> ExternResult<bool>`
**Purpose**: Validate if a capability grant is still active and valid
**Authorization**: Public access
**Input**: ActionHash of the capability grant to validate
**Returns**: Boolean indicating grant validity
**Use Case**: Pre-access validation and security checks

#### `grant_role_based_private_data_access(input: RoleBasedAccessInput) -> ExternResult<Record>`
**Purpose**: Grant private data access based on role assignment
**Authorization**: System or governance role required
**Input**:
```rust
pub struct RoleBasedAccessInput {
    pub role_name: String,
    pub fields: Vec<String>,
    pub context: String,
    pub expires_at: Option<Timestamp>,
}
```
**Security**: Role-based access control for private data
**Use Case**: Organizational data access policies

#### `validate_agent_private_data(input: ValidationDataRequest) -> ExternResult<ValidationResult>`
**Purpose**: Validate an agent's request for private data access
**Authorization**: Validation service or authorized validator
**Input**:
```rust
pub struct ValidationDataRequest {
    pub requesting_agent: AgentPubKey,
    pub target_agent: AgentPubKey,
    pub requested_fields: Vec<String>,
    pub context: String,
}
```
**Returns**:
```rust
pub struct ValidationResult {
    pub is_valid: bool,
    pub granted_fields: Vec<String>,
    pub reason: Option<String>,
}
```
**Security**: Structured validation with reasoning

#### `validate_agent_private_data_with_grant(input: ValidationWithGrantRequest) -> ExternResult<ValidationResult>`
**Purpose**: Validate private data access with specific capability grant
**Authorization**: Validation service or authorized validator
**Input**: Validation request with specific grant information
**Returns**: Validation result with grant-specific reasoning
**Security**: Grant-specific validation for audit trails

---

### Role Management

#### `assign_person_role(input: PersonRoleInput) -> ExternResult<Record>`
**Purpose**: Assign a role to an agent
**Authorization**: System or governance role required
**Input**:
```rust
pub struct PersonRoleInput {
    pub agent_pubkey: AgentPubKey,
    pub role_name: String,
    pub description: Option<String>,
}
```
**Returns**: Role assignment record
**Security**: Role assignments create capability implications

#### `get_latest_person_role_record(original_action_hash: ActionHash) -> ExternResult<Option<Record>>`
**Purpose**: Retrieve the most recent version of a person role record
**Authorization**: Public access for role verification
**Returns**: Latest role record or None if not found
**Use Case**: Role history and validation

#### `get_latest_person_role(original_action_hash: ActionHash) -> ExternResult<PersonRole>`
**Purpose**: Retrieve the most recent version of a person role
**Authorization**: Public access for role verification
**Returns**: Latest `PersonRole` entry
**Error Cases**: Role not found, record parsing failed

#### `update_person_role(input: UpdatePersonRoleInput) -> ExternResult<Record>`
**Purpose**: Update an existing person role
**Authorization**: System or governance role required
**Input**:
```rust
pub struct UpdatePersonRoleInput {
    pub original_action_hash: ActionHash,
    pub previous_action_hash: ActionHash,
    pub role_name: Option<String>,
    pub description: Option<String>,
}
```
**Returns**: Updated role assignment record
**Security**: Maintains audit trail of role changes

#### `get_person_roles(agent_pubkey: AgentPubKey) -> ExternResult<GetPersonRolesOutput>`
**Purpose**: Retrieve all roles assigned to an agent
**Authorization**: Public access for role verification
**Returns**:
```rust
pub struct GetPersonRolesOutput {
    pub roles: Vec<PersonRole>,
}
```

#### `get_my_person_roles(()) -> ExternResult<GetPersonRolesOutput>`
**Purpose**: Get current agent's roles with validation details
**Authorization**: Current agent only
**Returns**: Complete role information including validation metadata

#### `get_person_capability_level(agent_pubkey: AgentPubKey) -> ExternResult<String>`
**Purpose**: Determine agent's capability level based on roles
**Authorization**: Public access for capability verification
**Returns**: String capability level ("Simple Agent", "Accountable Agent", "Primary Accountable Agent", etc.)
**Logic**:
- "Simple Agent" - Basic agent capabilities
- "Accountable Agent" - Resource access and management
- "Primary Accountable Agent" - Process initiation and coordination
- Specialized roles: "Transport Agent", "Repair Agent", "Storage Agent"

#### `has_person_role_capability(input: (AgentPubKey, String)) -> ExternResult<bool>`
**Purpose**: Check if agent has specific role capability
**Authorization**: Public access for role verification
**Input**: Tuple of (agent_pubkey, role_name)
**Returns**: Boolean indicating role presence

---

### Role Promotion Workflow

#### `promote_agent_with_validation(input: PromoteAgentInput) -> ExternResult<Record>`
**Purpose**: Promote an agent with validation and PPR generation
**Authorization**: Governance role required
**Input**:
```rust
pub struct PromoteAgentInput {
    pub agent: AgentPubKey,
    pub first_resource_hash: ActionHash,
}
```
**Returns**: Role promotion record with validation metadata
**Side Effects**: Generates PPRs for promotion validation
**Security**: Comprehensive validation with reputation assessment

#### `request_role_promotion(input: RolePromotionRequest) -> ExternResult<ActionHash>`
**Purpose**: Request role promotion for current agent
**Authorization**: Any agent can request promotion
**Input**:
```rust
pub struct RolePromotionRequest {
    pub desired_role: String,
    pub evidence: Option<String>,
    pub context: String,
}
```
**Returns**: ActionHash of the promotion request
**Use Case**: Self-initiated promotion requests

#### `approve_role_promotion(input: ApprovePromotionInput) -> ExternResult<Record>`
**Purpose**: Approve a role promotion request
**Authorization**: Governance role required
**Input**:
```rust
pub struct ApprovePromotionInput {
    pub request_hash: ActionHash,
    pub validator_notes: Option<String>,
    pub assigned_role: String,
}
```
**Returns**: Approved role promotion record
**Side Effects**: Creates PPRs for successful promotion
**Security**: Multi-validator approval process

---

## 🏗️ zome_resource - Resource Lifecycle Management

### Resource Specification Management

#### `create_resource_specification(input: ResourceSpecificationInput) -> ExternResult<Record>`
**Purpose**: Define new resource type with properties and governance rules
**Authorization**: Any agent can create resource specifications
**Input**:
```rust
pub struct ResourceSpecificationInput {
    pub name: String,
    pub description: String,
    pub resource_class: String,
    pub default_unit: String,
    pub custom_properties: HashMap<String, PropertyValue>,
    pub behavior: Option<String>,
    pub conforming: bool,
    pub image: Option<String>,
    pub category: Option<String>,
    pub tags: Vec<String>,
    pub governance_rules: Vec<ActionHash>,
}
```
**Returns**: Created `ResourceSpecification` entry
**Side Effects**:
- Creates specification entry with discovery anchors
- Links to governance rules for compliance
- Creates category and tag-based discovery links

#### `get_latest_resource_specification(original_action_hash: ActionHash) -> ExternResult<ResourceSpecification>`
**Purpose**: Retrieve most recent resource specification version
**Authorization**: Public access
**Returns**: Latest `ResourceSpecification` with all properties
**Error Cases**: Specification not found, record corruption

#### `update_resource_specification(input: UpdateResourceSpecificationInput) -> ExternResult<Record>`
**Purpose**: Update resource specification with version tracking
**Authorization**: Specification owner only
**Input**:
```rust
pub struct UpdateResourceSpecificationInput {
    pub original_action_hash: ActionHash,
    pub name: Option<String>,
    pub description: Option<String>,
    pub resource_class: Option<String>,
    pub default_unit: Option<String>,
    pub custom_properties: Option<HashMap<String, PropertyValue>>,
    pub behavior: Option<String>,
    pub conforming: Option<bool>,
    pub image: Option<String>,
    pub category: Option<String>,
    pub tags: Option<Vec<String>>,
    pub governance_rules: Option<Vec<ActionHash>>,
}
```
**Returns**: Updated specification with version tracking

#### `get_all_resource_specifications(()) -> ExternResult<GetAllResourceSpecificationsOutput>`
**Purpose**: Discover all resource specifications in network
**Authorization**: Public access
**Returns**: Array of all resource specifications for browsing

#### `get_resource_specification_profile(action_hash: ActionHash) -> ExternResult<ResourceSpecificationProfile>`
**Purpose**: Get comprehensive specification profile with metadata
**Authorization**: Public access
**Returns**: Specification with creation metadata and governance rules

#### `get_resource_specifications_by_category(category: String) -> ExternResult<Vec<Record>>`
**Purpose**: Find specifications by category classification
**Authorization**: Public access
**Performance**: Category-based anchor traversal for efficiency

#### `get_resource_specifications_by_tag(tag: String) -> ExternResult<Vec<Record>>`
**Purpose**: Find specifications with specific tags
**Authorization**: Public access
**Utility**: Tag-based resource discovery

#### `get_my_resource_specifications(()) -> ExternResult<Vec<Link>>`
**Purpose**: List specifications created by current agent
**Authorization**: Current agent only
**Returns**: Links to created specifications

---

### Economic Resource Management

#### `create_economic_resource(input: EconomicResourceInput) -> ExternResult<Record>`
**Purpose**: Create resource instance from specification
**Authorization**: Any agent can create resources
**Input**:
```rust
pub struct EconomicResourceInput {
    pub resource_specification: ActionHash,
    pub name: String,
    pub accounting_quantity: Option<f64>,
    pub unit_of_effort: Option<String>,
    pub current_quantity: f64,
    pub primary_accountable: AgentPubKey,
    pub classified_as: Vec<String>,
    pub unit_of_resource: String,
    pub stage: Option<String>,
    pub state: Option<String>,
    pub location: Option<String>,
    pub note: Option<String>,
    pub image: Option<String>,
}
```
**Returns**: Created `EconomicResource` entry
**Side Effects**:
- Creates resource with lifecycle tracking
- Links to specification for type validation
- Establishes custody relationships
- Creates economic event for resource creation

#### `get_latest_economic_resource(original_action_hash: ActionHash) -> ExternResult<EconomicResource>`
**Purpose**: Retrieve most recent resource state
**Authorization**: Public access for resource discovery
**Returns**: Current `EconomicResource` with state and metadata

#### `update_economic_resource(input: UpdateEconomicResourceInput) -> ExternResult<Record>`
**Purpose**: Update resource properties and state
**Authorization**: Primary accountable agent or authorized role
**Input**:
```rust
pub struct UpdateEconomicResourceInput {
    pub original_action_hash: ActionHash,
    pub name: Option<String>,
    pub accounting_quantity: Option<f64>,
    pub unit_of_effort: Option<String>,
    pub current_quantity: Option<f64>,
    pub primary_accountable: Option<AgentPubKey>,
    pub classified_as: Option<Vec<String>>,
    pub unit_of_resource: Option<String>,
    pub stage: Option<String>,
    pub state: Option<String>,
    pub location: Option<String>,
    pub note: Option<String>,
    pub image: Option<String>,
}
```
**Returns**: Updated resource with audit trail
**Security**: Role-based authorization for resource updates

#### `get_all_economic_resources(()) -> ExternResult<GetAllEconomicResourcesOutput>`
**Purpose**: Discover all economic resources in network
**Authorization**: Public access
**Performance**: Anchor-based discovery with pagination support

#### `get_economic_resource_profile(action_hash: ActionHash) -> ExternResult<EconomicResourceProfile>`
**Purpose**: Get comprehensive resource profile with history
**Authorization**: Public access
**Returns**: Resource with specification details and lifecycle events

#### `get_resources_by_specification(spec_hash: ActionHash) -> ExternResult<Vec<Record>>`
**Purpose**: Find all resources of a specific type
**Authorization**: Public access
**Utility**: Resource browsing and discovery

#### `get_my_economic_resources(()) -> ExternResult<Vec<Link>>`
**Purpose**: List resources where current agent has custody or ownership
**Authorization**: Current agent only
**Returns**: Links to resources with relationship metadata

#### `get_agent_economic_resources(agent_pubkey: AgentPubKey) -> ExternResult<Vec<Link>>`
**Purpose**: List resources associated with specific agent
**Authorization**: Public access
**Returns**: Resources where agent has accountability or custody

#### `update_resource_state(input: UpdateResourceStateInput) -> ExternResult<Record>`
**Purpose**: Update resource state with validation
**Authorization**: Primary accountable agent or authorized role
**Input**:
```rust
pub struct UpdateResourceStateInput {
    pub resource_hash: ActionHash,
    pub new_state: String,
    pub stage: Option<String>,
    pub location: Option<String>,
    pub note: Option<String>,
}
```
**Returns**: State update record with economic event
**Validation**: State transitions validated against specification rules

---

### Governance Rules Management

#### `create_governance_rule(input: GovernanceRuleInput) -> ExternResult<Record>`
**Purpose**: Create governance rule for resource or process compliance
**Authorization**: Governance role required
**Input**:
```rust
pub struct GovernanceRuleInput {
    pub name: String,
    pub description: String,
    pub rule_type: String,
    pub resource_specification: Option<ActionHash>,
    pub economic_process: Option<String>,
    pub condition_expression: String,
    pub action_required: String,
    pub validation_method: String,
    pub active: bool,
    pub priority: u32,
}
```
**Returns**: Created `GovernanceRule` entry
**Purpose**: Embed compliance rules directly in resource definitions

#### `get_latest_governance_rule(original_action_hash: ActionHash) -> ExternResult<GovernanceRule>`
**Purpose**: Retrieve governance rule details
**Authorization**: Public access for compliance verification
**Returns**: Complete governance rule with validation logic

#### `update_governance_rule(input: UpdateGovernanceRuleInput) -> ExternResult<Record>`
**Purpose**: Update governance rule with version tracking
**Authorization**: Governance role required
**Returns**: Updated rule with audit trail

#### `get_all_governance_rules(()) -> ExternResult<GetAllGovernanceRulesOutput>`
**Purpose**: Discover all governance rules
**Authorization**: Public access
**Returns**: Array of all active governance rules

#### `get_governance_rules_by_type(rule_type: String) -> ExternResult<Vec<Record>>`
**Purpose**: Find governance rules by type classification
**Authorization**: Public access
**Utility**: Rule discovery and compliance checking

---

## 🏛️ zome_gouvernance - Governance & Reputation

### Commitment Management

#### `get_all_commitments(()) -> ExternResult<Vec<Commitment>>`
**Purpose**: Retrieve all commitments in the network
**Authorization**: Public access for commitment discovery
**Returns**: Array of all commitment entries
**Use Case**: Finding available commitment opportunities

#### `get_commitments_for_agent(agent: AgentPubKey) -> ExternResult<Vec<Commitment>>`
**Purpose**: Find commitments involving specific agent
**Authorization**: Public access
**Returns**: Commitments where agent is provider or receiver
**Utility**: Agent reputation and capability assessment

---

### Claim Management

#### `get_all_claims(()) -> ExternResult<Vec<Claim>>`
**Purpose**: Retrieve all claims in the network
**Authorization**: Public access
**Returns**: Array of all claim entries
**Purpose**: Claim discovery and verification

#### `get_claims_for_commitment(commitment_hash: ActionHash) -> ExternResult<Vec<Claim>>`
**Purpose**: Find claims related to specific commitment
**Authorization**: Public access
**Returns**: Claims providing evidence for commitment fulfillment
**Use Case**: Commitment validation and reputation assessment

---

### Economic Event Management

#### `get_all_economic_events(()) -> ExternResult<Vec<EconomicEvent>>`
**Purpose**: Retrieve all economic events for transparency
**Authorization**: Public access
**Returns**: Array of all economic events
**Purpose**: Complete economic activity audit trail

#### `get_events_for_resource(resource_hash: ActionHash) -> ExternResult<Vec<EconomicEvent>>`
**Purpose**: Get economic history of specific resource
**Authorization**: Public access
**Returns**: Events affecting resource state and ownership
**Utility**: Resource lifecycle tracking and provenance

#### `get_events_for_agent(agent: AgentPubKey) -> ExternResult<Vec<EconomicEvent>>`
**Purpose**: Get economic activity for specific agent
**Authorization**: Public access
**Returns**: Events where agent participated as provider or receiver
**Use Case**: Agent economic reputation and activity assessment

---

### PPR (Private Participation Receipt) System

#### `get_my_participation_claims(input: GetMyParticipationClaimsInput) -> ExternResult<ParticipationClaimBundle>`
**Purpose**: Retrieve current agent's PPR claims for reputation assessment
**Authorization**: Current agent only
**Input**:
```rust
pub struct GetMyParticipationClaimsInput {
    pub categories: Option<Vec<ParticipationClaimType>>,
    pub time_range: Option<TimeRange>,
    pub include_expired: bool,
}
```
**Returns**:
```rust
pub struct ParticipationClaimBundle {
    pub claims: Vec<ParticipationClaim>,
    pub summary: ReputationSummary,
    pub verification_contexts: Vec<VerificationContext>,
}
```
**Security**: Cryptographic verification of all PPR claims

#### `create_service_commitment_pprs(commitment_hash: ActionHash) -> ExternResult<Vec<Record>>`
**Purpose**: Automatically issue PPRs when service commitments are created
**Authorization**: System function based on commitment creation
**Returns**: Created PPR entries for commitment initiation
**Logic**: Issues PPRs to both provider and potential receivers

#### `create_service_fulfillment_pprs(commitment_hash: ActionHash) -> ExternResult<Vec<Record>>`
**Purpose**: Issue PPRs upon successful commitment fulfillment
**Authorization**: System function triggered by fulfillment validation
**Returns**: PPR entries documenting successful service delivery
**Categories**: Service-specific PPR categories based on commitment type

---

### Validation System

#### `create_validation_receipt(input: CreateValidationReceiptInput) -> ExternResult<Record>`
**Purpose**: Create validation receipt for resource, service, or commitment
**Authorization**: Validator role required
**Input**:
```rust
pub struct CreateValidationReceiptInput {
    pub validated_item: ActionHash,
    pub validation_type: String,
    pub validator: AgentPubKey,
    pub assessment: String,
    pub confidence: f64,
    pub evidence: Option<String>,
    pub metrics: Option<HashMap<String, f64>>,
}
```
**Returns**: Validation receipt with cryptographic signature
**Purpose**: Create evidence for PPR issuance and reputation building

#### `get_validation_history(item_hash: ActionHash) -> ExternResult<Vec<ValidationReceipt>>`
**Purpose**: Retrieve complete validation history for any item
**Authorization**: Public access
**Returns**: All validation receipts for the specified item
**Use Case**: Multi-reviewer validation and quality assessment

#### `get_all_validation_receipts(()) -> ExternResult<Vec<ValidationReceipt>>`
**Purpose**: Discover all validation receipts in network
**Authorization**: Public access
**Returns**: Array of all validation receipts
**Utility**: Validator discovery and reputation assessment

#### `create_resource_validation(input: CreateResourceValidationInput) -> ExternResult<Record>`
**Purpose**: Create comprehensive resource validation with multi-reviewer process
**Authorization**: Resource owner or authorized validator
**Input**:
```rust
pub struct CreateResourceValidationInput {
    pub resource_hash: ActionHash,
    pub validation_type: String,
    pub required_reviewers: u32,
    pub validation_criteria: String,
    pub deadline: Option<u64>,
    pub incentive: Option<f64>,
}
```
**Returns**: Resource validation workflow setup
**Process**: Initiates multi-reviewer validation workflow

---

### Private Data Validation

#### `get_validation_requirements(process_type: String) -> ExternResult<Vec<String>>`
**Purpose**: Get required private data fields for economic process validation
**Authorization**: Public access
**Returns**: List of required private data fields
**Use Case**: Process compliance and data access planning

#### `create_validation_with_private_data(input: CreateValidationWithPrivateDataInput) -> ExternResult<Record>`
**Purpose**: Create validation that requires access to private data
**Authorization**: Authorized validator with capability grants
**Input**:
```rust
pub struct CreateValidationWithPrivateDataInput {
    pub validated_item: ActionHash,
    pub validation_type: String,
    pub required_private_data: Vec<String>,
    pub validator: AgentPubKey,
    pub assessment: String,
    pub confidence: f64,
    pub data_access_grants: Vec<CapClaim>,
}
```
**Returns**: Validation with private data access verification
**Security**: Requires valid capability grants for all accessed private data

---

## 🔗 Cross-Zome Integration Functions

### Agent Capability Assessment
These functions combine data from multiple zomes to provide comprehensive capability assessment:

```rust
// Combined capability evaluation (pseudo-code)
fn evaluate_agent_capability(agent: AgentPubKey) -> CapabilityAssessment {
    let person_info = zome_person::get_person_capability_level(agent)?;
    let reputation = zome_gouvernance::get_my_participation_claims(agent)?;
    let resources = zome_resource::get_agent_economic_resources(agent)?;

    CapabilityAssessment {
        level: person_info.capability_level,
        reputation_score: reputation.summary.overall_score,
        resource_count: resources.len(),
        eligible_processes: calculate_eligible_processes(person_info, reputation),
    }
}
```

### Economic Process Validation
Cross-zome validation ensures process compliance across all domains:

```rust
// Process authorization validation (pseudo-code)
fn validate_process_authorization(
    agent: AgentPubKey,
    process_type: EconomicProcess
) -> AuthorizationResult {
    let capability = zome_person::get_person_capability_level(agent)?;
    let reputation = zome_gouvernance::derive_reputation_score(agent)?;

    match process_type {
        UseProcess => {
            require_capability_level(capability, "stewardship")?;
            validate_reputation_threshold(reputation, USE_PROCESS_THRESHOLD)?;
        },
        TransportProcess | StorageProcess | RepairProcess => {
            require_capability_level(capability, "coordination")?;
            validate_reputation_threshold(reputation, ADVANCED_PROCESS_THRESHOLD)?;
            validate_specialized_role(agent, process_type)?;
        }
    }
}
```

---

## 🛡️ Security & Authorization Patterns

### 1. Capability-Based Access Control
All API functions enforce capability-based authorization:

```rust
// Standard authorization pattern
fn check_authorization(agent: AgentPubKey, required_level: &str) -> Result<(), AuthorizationError> {
    let current_level = get_person_capability_level(agent)?;
    if !capability_sufficient(&current_level, required_level) {
        return Err(AuthorizationError::InsufficientCapability);
    }
    Ok(())
}
```

### 2. Private Data Protection
Private data functions implement field-level access control:

```rust
// Private data access pattern
fn authorize_private_data_access(
    requestor: AgentPubKey,
    target: AgentPubKey,
    fields: Vec<String>
) -> Result<DataAccessGrant, AccessError> {
    let grant = validate_capability_claim(requestor, target, fields)?;
    ensure_grant_not_expired(&grant)?;
    ensure_field_authorized(&grant, fields)?;
    Ok(grant)
}
```

### 3. PPR Cryptographic Verification
PPR functions implement cryptographic verification:

```rust
// PPR verification pattern
fn verify_ppr_authenticity(ppr: &ParticipationClaim) -> Result<VerificationResult, VerificationError> {
    let signature_valid = verify_signature(&ppr.signature, &ppr.issuer, &ppr.content)?;
    let context_valid = verify_verification_context(&ppr.verification_context)?;
    let not_expired = check_expiration(&ppr.expires_at)?;

    Ok(VerificationResult {
        signature_valid,
        context_valid,
        not_expired,
        overall_trust_score: calculate_trust_score(ppr),
    })
}
```

---

## 📊 Performance & Optimization

### DHT Optimization Patterns
- **Anchor-Based Discovery**: All discovery functions use anchor paths for efficient DHT traversal
- **Link Caching**: Frequently accessed link queries are cached at the conductor level
- **Batch Operations**: Multi-entry operations minimize DHT round trips

### Memory Management
- **Lazy Loading**: Large data structures are loaded on-demand
- **Reference Counting**: Shared data structures use reference counting to prevent memory leaks
- **Cleanup Strategies**: Expired capabilities and outdated entries are periodically cleaned up

### Network Efficiency
- **Compression**: Large data payloads are compressed before DHT storage
- **Validation Caching**: Validation results are cached to reduce redundant computations
- **Async Processing**: Long-running operations use async patterns to prevent blocking

---

## 🔮 API Evolution & Extensibility

### Versioning Strategy
- **Semantic Versioning**: API versions follow semantic versioning (MAJOR.MINOR.PATCH)
- **Backward Compatibility**: Deprecated functions remain supported for at least one major version
- **Migration Paths**: Clear migration guidelines provided for breaking changes

### Extension Points
- **Custom Validation**: Pluggable validation modules for domain-specific requirements
- **New PPR Categories**: Extensible PPR system for new reputation dimensions
- **Process Types**: Economic process system supports new process type definitions

### Integration APIs
Future API extensions will include:
- **External System Integration**: Webhook and event streaming capabilities
- **Analytics APIs**: Advanced reputation and economic analytics
- **Governance APIs**: Dynamic rule management and democratic governance features

---

## 📋 Error Handling Reference

### Common Error Types
```rust
// Person Management Errors (actual implementation)
pub enum PersonError {
    PersonAlreadyExists,
    PersonNotFound(String),
    PrivateDataNotFound,
    RoleNotFound(String),
    NotAuthor,
    SerializationError(String),
    EntryOperationFailed(String),
    LinkOperationFailed(String),
    InvalidInput(String),
    InsufficientCapability(String),
}

// Resource Management Errors (actual implementation)
pub enum ResourceError {
    ResourceSpecNotFound(String),
    EconomicResourceNotFound(String),
    GovernanceRuleNotFound(String),
    NotAuthor,
    NotCustodian,
    SerializationError(String),
    EntryOperationFailed(String),
    LinkOperationFailed(String),
    InvalidInput(String),
    GovernanceViolation(String),
}

// Governance Errors (actual implementation)
pub enum GovernanceError {
    ValidationReceiptNotFound(String),
    EconomicEventNotFound(String),
    ResourceValidationNotFound(String),
    CommitmentNotFound(String),
    NotAuthorizedValidator,
    InsufficientCapability(String),
    ValidationAlreadyExists(String),
    InvalidValidationScheme(String),
    SerializationError(String),
    EntryOperationFailed(String),
    LinkOperationFailed(String),
    InvalidInput(String),
    CrossZomeCallFailed(String),
}
```

### Error Response Format
All API functions return `ExternResult<T>` with comprehensive error information:
```rust
pub struct ErrorDetails {
    pub error_type: String,
    pub error_code: u32,
    pub message: String,
    pub details: Option<String>,
    pub retry_possible: bool,
    pub suggested_actions: Vec<String>,
}
```

---

*This API reference represents the complete current functionality of the Nondominium system based on actual codebase analysis. Function signatures and behaviors evolve with implementation improvements and community feedback.*

## 🔄 **Updates in Version 3.0 (2025-12-17)**

### **Major Corrections:**
- ✅ **PersonInput structure**: Corrected `avatar` → `avatar_url`, removed non-existent `location` and `tags` fields
- ✅ **Function signatures**: Updated all function signatures to match actual implementation
- ✅ **Error types**: Replaced with actual error enums from the codebase

### **New Function Categories Added:**
- 🆕 **Device Management** (6 functions): Multi-device support with registration, deactivation, activity tracking
- 🆕 **Advanced Capability Sharing** (4 functions): Grant revocation, validation, role-based access
- 🆕 **Role Promotion Workflow** (3 functions): Request/approve/promotion with PPR integration

### **Missing Functions Now Included:**
- **Person Management**: Added 8 missing functions for agent-person relationships and promotion
- **Private Data**: Added `store_private_person_data` and corrected `get_agent_private_data` signature
- **Capability System**: Added `grant_private_data_access`, `revoke_private_data_access`, validation functions

### **Accuracy Improvements:**
- **Capability Levels**: Updated to reflect actual role types ("Simple Agent", "Accountable Agent", etc.)
- **Security Patterns**: Corrected to match actual implementation patterns
- **Data Structures**: All input/output structures now match actual code