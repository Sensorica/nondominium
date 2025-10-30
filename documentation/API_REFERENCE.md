# Nondominium API Reference

**Generated**: 2025-10-30
**Version**: 2.0 (Complete PPR & Capability System)
**Scope**: Complete function documentation for all zomes

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
    pub avatar: Option<String>,
    pub bio: Option<String>,
    pub location: Option<String>,
    pub tags: Vec<String>,
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

#### `get_latest_person(original_action_hash: ActionHash) -> ExternResult<Person>`
**Purpose**: Retrieve the most recent version of a person entry
**Authorization**: Public access (person data is public)
**Input**: `ActionHash` of the original person entry
**Returns**: Latest `Person` entry with all current fields
**Error Cases**:
- `PersonError::PersonNotFound` - No person entry found
- `PersonError::CorruptRecord` - Record parsing failed

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

---

### Private Data Management

#### `update_private_person_data(input: UpdatePrivatePersonDataInput) -> ExternResult<Record>`
**Purpose**: Update private personal data with encryption
**Authorization**: Current agent only
**Input**:
```rust
pub struct UpdatePrivatePersonDataInput {
    pub original_action_hash: Option<ActionHash>,
    pub contact_email: Option<String>,
    pub contact_phone: Option<String>,
    pub contact_address: Option<String>,
    pub private_fields: HashMap<String, String>,
}
```
**Returns**: Encrypted `Record` with private data
**Security**: Data encrypted before storage in DHT

#### `get_my_private_person_data(()) -> ExternResult<Option<PrivatePersonData>>`
**Purpose**: Retrieve current agent's private data
**Authorization**: Current agent only
**Returns**: Decrypted private data if available
**Security**: Automatic decryption for authorized access

#### `get_agent_private_data(agent_pubkey: AgentPubKey) -> ExternResult<Option<PrivatePersonData>>`
**Purpose**: Access another agent's private data with authorization
**Authorization**: Requires valid capability grant
**Returns**: Private data if access authorized
**Security**: Enforces capability-based access control

---

### Capability-Based Sharing

#### `create_private_data_cap_claim(input: CreatePrivateDataCapClaimInput) -> ExternResult<CreatePrivateDataCapClaimOutput>`
**Purpose**: Create capability claim for private data access
**Authorization**: Data owner only
**Input**:
```rust
pub struct CreatePrivateDataCapClaimInput {
    pub grantor: AgentPubKey,
    pub fields: Vec<String>,
    pub purpose: String,
    pub expires_at: Option<u64>,
}
```
**Returns**:
```rust
pub struct CreatePrivateDataCapClaimOutput {
    pub cap_claim: CapClaim,
    pub cap_secret: CapSecret,
}
```
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

#### `create_transferable_private_data_access(input: CreateTransferableAccessInput) -> ExternResult<TransferableCapabilityOutput>`
**Purpose**: Create transferable access capability for delegation
**Authorization**: Data owner only
**Security**: Enables controlled delegation of access rights
**Use Case**: Service providers needing temporary access to client data

---

### Role Management

#### `update_person_role(input: UpdatePersonRoleInput) -> ExternResult<Record>`
**Purpose**: Assign or update agent roles with validation metadata
**Authorization**: System or governance role required
**Input**:
```rust
pub struct UpdatePersonRoleInput {
    pub original_action_hash: Option<ActionHash>,
    pub agent_pubkey: AgentPubKey,
    pub role: String,
    pub assigned_by: AgentPubKey,
    pub evidence: Option<String>,
    pub expires_at: Option<u64>,
}
```
**Returns**: Role assignment record with validation metadata
**Security**: Role assignments create capability implications

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
**Returns**: String capability level ("member", "stewardship", "coordination", "governance")
**Logic**:
- "member" - Simple Agent with basic access
- "stewardship" - Accountable Agent with resource access
- "coordination" - Primary Accountable Agent with process initiation
- "governance" - Advanced governance capabilities

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
// Person Management Errors
pub enum PersonError {
    PersonExists,
    PersonNotFound,
    Unauthorized,
    CorruptRecord,
    InvalidInput,
}

// Resource Management Errors
pub enum ResourceError {
    ResourceNotFound,
    UnauthorizedAccess,
    InvalidSpecification,
    InsufficientQuantity,
    InvalidStateTransition,
}

// Governance Errors
pub enum GovernanceError {
    CommitmentNotFound,
    InvalidValidation,
    InsufficientReputation,
    PPRInvalid,
    ValidationExpired,
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

*This API reference represents the complete current functionality of the Nondominium system. Function signatures and behaviors evolve with implementation improvements and community feedback.*