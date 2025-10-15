# Specification: Holochain-Idiomatic Private Data

## Goal

Transform the existing private data sharing system to use Holochain's native capability token system, providing complete privacy through private entries while maintaining seamless integration with governance workflows and enabling time-limited, context-aware data sharing.

## User Stories

- As a **network participant**, I want my personal data to be completely private by default so that only I can access it without explicit permission
- As a **custodian transferring resources**, I want to grant temporary access to my contact information to other agents so they can reach me for resource-related matters
- As a **governance validator**, I want to access agents' private data through their explicit permission so I can validate their identity for role promotions and dispute resolution
- As a **service provider** (transport/repair/storage), I want to request access to clients' location and contact information so I can provide timely and effective services
- As a **dispute resolution participant**, I want to access past custodians' private data through granted permissions so I can help resolve conflicts when resources become unavailable

## Core Requirements

### Functional Requirements
- Replace current DataAccessGrant + SharedPrivateData system with Holochain's native CapGrant + CapClaim system
- Use `EntryVisibility::Private` for all PrivatePersonData entries
- Implement author-based capabilities where agents explicitly allow others to access personal data
- Leverage Holochain's built-in `create_cap_grant()` and `create_cap_claim()` functions
- Use native DHT querying instead of complex link traversals
- Support time-limited access grants for private data sharing
- Enable field-level access control (specific fields only)
- Support context-based access (custodian transfer, governance validation, service provision)
- Support automatic grant creation for governance workflows
- Enable grant revocation and expiration management
- Maintain governance integration for agent promotion validation workflows
- Support dispute resolution through past custodian private data access
- Enable PPR (Private Participation Receipt) system with capability-based access

### Non-Functional Requirements
- **Security**: All private data must use Holochain's private entry visibility with capability token enforcement
- **Performance**: Efficient DHT querying using native Holochain patterns with <200ms response times
- **Reliability**: Graceful handling of capability expiration and robust error handling for invalid capabilities
- **Maintainability**: Clean separation between coordinator and integrity zomes with unified validation

## Visual Design

### Current System Architecture
- Complex manual grant system with custom DataAccessGrant entries
- Inefficient DHT querying with multiple link traversal patterns
- Redundant validation logic distributed across coordinator zomes
- Manual access control checks instead of native capability validation

### Target System Architecture
- Native Holochain capability tokens (CapGrant/CapClaim) for access control
- Private entry visibility for all sensitive data with no public exposure
- Streamlined DHT queries using native capability patterns
- Unified validation in integrity zome with centralized access control

## Reusable Components

### Existing Code to Leverage
- **PrivatePersonData entry structure**: Maintain existing data model with private visibility
- **Governance workflow integration**: Reuse existing governance patterns and validation workflows
- **PPR system**: Leverage existing Private Participation Receipt infrastructure
- **Agent role management**: Use existing role assignment and validation system
- **Validation framework**: Extend existing integrity zome validation patterns

### New Components Required
- **Holochain-native capability management**: New grant/claim functions using HDK capability APIs
- **Field-level access control**: New capability functions for granular field access
- **Context-based permission system**: New context-aware capability grant management
- **Automated grant creation**: New governance workflow integration for automatic grants
- **Native DHT query patterns**: New private data access using capability validation

## Technical Approach

### Data Model Changes

#### PrivatePersonData (Enhanced)
```rust
#[hdk_entry_helper]
#[derive(Clone, PartialEq)]
pub struct PrivatePersonData {
    pub legal_name: String,
    pub email: String,
    pub phone: Option<String>,
    pub address: Option<String>,
    pub emergency_contact: Option<String>,
    pub time_zone: Option<String>,
    pub location: Option<String>,
}

// EntryTypes enum update
#[hdk_entry_types]
#[unit_enum(UnitEntryTypes)]
pub enum EntryTypes {
    Person(Person),
    #[entry_type(visibility = "private")]
    PrivatePersonData(PrivatePersonData),
    PersonRole(PersonRole),
    // Remove: DataAccessGrant, DataAccessRequest, SharedPrivateData
    // Add: Native capability entries will be managed through HDK
}
```

#### Capability Grant Structure (using HDK)
```rust
// Native capability grant created via HDK
// Fields: assigned_to, access_level, context, expiration
// Functions: create_cap_grant(), update_cap_grant(), delete_cap_grant()
```

#### Capability Claim Structure (using HDK)
```rust
// Native capability claim created via HDK
// Fields: cap_grant, claiming_agent, access_context
// Functions: create_cap_claim(), validate_cap_claim()
```

### API Design

#### Grant Management Functions
```rust
// Create capability grant for private data access
#[hdk_extern]
pub fn create_private_data_grant(input: CreatePrivateDataGrantInput) -> ExternResult<CapGrant>

// Update existing capability grant
#[hdk_extern]
pub fn update_private_data_grant(input: UpdatePrivateDataGrantInput) -> ExternResult<CapGrant>

// Revoke capability grant
#[hdk_extern]
pub fn revoke_private_data_grant(grant_hash: ActionHash) -> ExternResult<()>

// Get active grants created by calling agent
#[hdk_extern]
pub fn get_my_private_data_grants(_: ()) -> ExternResult<Vec<CapGrant>>
```

#### Access Claim Functions
```rust
// Claim access to private data using capability
#[hdk_extern]
pub fn claim_private_data_access(input: ClaimPrivateDataAccessInput) -> ExternResult<CapClaim>

// Validate access claim and retrieve private data
#[hdk_extern]
pub fn get_private_data_with_claim(input: GetPrivateDataWithClaimInput) -> ExternResult<PrivatePersonData>

// Check if agent has valid access claim
#[hdk_extern]
pub fn validate_private_data_access(input: ValidatePrivateDataAccessInput) -> ExternResult<bool>
```

#### Governance Integration Functions
```rust
// Create automatic grant for governance validation
#[hdk_extern]
pub fn create_governance_access_grant(input: CreateGovernanceAccessGrantInput) -> ExternResult<CapGrant>

// Validate agent data for governance workflows
#[hdk_extern]
pub fn validate_agent_for_governance(input: ValidateAgentForGovernanceInput) -> ExternResult<ValidationResult>

// Self-validation for governance (proof of access)
#[hdk_extern]
pub fn create_governance_validation_proof(input: CreateGovernanceValidationProofInput) -> ExternResult<ValidationProof>
```

### Input/Output Structures
```rust
#[derive(Debug, Serialize, Deserialize)]
pub struct CreatePrivateDataGrantInput {
    pub granted_to: AgentPubKey,
    pub fields_allowed: Vec<String>, // ["email", "phone", "location", etc.]
    pub access_context: String,     // "custodian_transfer", "governance_validation", "service_provision"
    pub duration_seconds: u64,      // Duration from now
    pub resource_context: Option<ActionHash>, // Optional resource for context
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ClaimPrivateDataAccessInput {
    pub grant_hash: ActionHash,
    pub fields_requested: Vec<String>,
    pub access_context: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ValidationResult {
    pub is_valid: bool,
    pub validated_fields: HashMap<String, String>,
    pub validation_context: String,
    pub validated_at: Timestamp,
    pub grant_hash: ActionHash,
    pub error_message: Option<String>,
}
```

### Validation Strategy for Integrity Zome

#### Unified Validation Callback
```rust
#[hdk_extern]
pub fn validate(op: Op) -> ExternResult<ValidateCallbackResult> {
    match op.flattened::<EntryTypes, LinkTypes>()? {
        // Validate PrivatePersonData creation (owner only)
        FlatOp::StoreEntry(store_entry) => {
            match store_entry {
                OpEntry::CreateEntry { app_entry, .. } => {
                    match app_entry {
                        EntryTypes::PrivatePersonData(data) => {
                            validate_private_person_data_creation(data)
                        }
                        // Other entry types...
                    }
                }
                // Other operations...
            }
        }
        // Validate capability grants (HDK handles most validation)
        // Add custom validation for access context and field permissions
        // Validate governance-specific access patterns
    }
}

// Validation functions moved to integrity zome
fn validate_private_person_data_creation(data: PrivatePersonData) -> ExternResult<ValidateCallbackResult> {
    // Validate data format and required fields
    // Ensure only agent can create their own private data
    // Validate against governance requirements
}
```

#### Capability Access Validation
```rust
// Validate access attempts against granted capabilities
fn validate_capability_access(
    claim_hash: ActionHash,
    requesting_agent: AgentPubKey,
    fields: Vec<String>,
    context: String
) -> ExternResult<ValidateCallbackResult> {
    // Use HDK to validate claim exists and is valid
    // Check field permissions against granted capability
    // Verify context matches grant context
    // Check expiration and revocation status
}
```

### Migration Strategy

#### Phase 1: New Capability System
1. Create new capability-based private data module
2. Implement grant/claim functions using Holochain HDK
3. Add comprehensive test coverage for new functionality
4. Create migration utilities for existing data

#### Phase 2: Integrity Zome Migration
1. Move validation logic from coordinator to integrity zome
2. Implement unified validation callbacks
3. Update capability validation to use integrity zome
4. Add governance-specific validation patterns

#### Phase 3: Governance Integration
1. Update governance workflows to use new capability system
2. Implement automatic grant creation for validation workflows
3. Integrate with PPR system for reputation tracking
4. Update dispute resolution workflows

#### Phase 4: Cleanup and Optimization
1. Remove old DataAccessGrant and SharedPrivateData entries
2. Optimize DHT queries using native patterns
3. Implement cleanup routines for expired capabilities
4. Performance optimization and testing

## Out of Scope

### Features Not Being Built Now
- Advanced encryption beyond Holochain's private entry system
- Cross-network private data sharing or federation
- Complex conditional access rules (beyond basic context and field control)
- Anonymous or pseudonymous private data sharing
- Private data backup and recovery systems
- Integration with external identity verification services

### Future Enhancements
- Automated grant renewal and extension workflows
- Bulk grant operations for governance validation
- Advanced audit and reporting features
- Private data inheritance and delegation patterns
- Integration with external credential systems

## Success Criteria

- **Complete Privacy**: All private data uses Holochain private entry visibility with no public exposure
- **Native Capabilities**: All access control uses Holochain's native CapGrant/CapClaim system
- **Performance Improvement**: Reduced DHT query complexity with <200ms access validation times
- **Governance Integration**: Seamless integration with existing governance workflows and PPR system
- **Developer Experience**: Simplified API for private data access management with clear capability patterns
- **Test Coverage**: Comprehensive test coverage for all new functionality including edge cases
- **Migration Success**: Smooth migration from current system without data loss or governance disruption