# Person Zome (`zome_person`) Documentation

The Person zome provides the foundational identity, privacy, and access control infrastructure for the nondominium ecosystem. It implements agent identity management, role-based access control, capability-based private data sharing, and integration with the Private Participation Receipt (PPR) reputation system.

## Core Data Structures

### Person Entry

```rust
pub struct Person {
    pub name: String,                // Public display name
    pub avatar_url: Option<String>,  // Optional avatar URL (validated HTTP/HTTPS)
    pub bio: Option<String>,         // Optional biography
}
```

**Privacy**: Public entry, discoverable by all agents
**Validation**: Name required (1-100 chars), avatar URL format validation

### PrivatePersonData Entry

```rust
pub struct PrivatePersonData {
    pub legal_name: String,              // Full legal name
    pub email: String,                   // Contact email (validated)
    pub phone: Option<String>,           // Optional phone number
    pub address: Option<String>,         // Physical address
    pub emergency_contact: Option<String>, // Emergency contact info
    pub time_zone: Option<String>,       // Time zone preference
    pub location: Option<String>,        // Location/city
}
```

**Privacy**: Private entry, only accessible by owner
**Validation**: Legal name and valid email required

### PersonRole Entry

```rust
pub struct PersonRole {
    pub role_name: String,        // Role name from RoleType enum
    pub description: Option<String>, // Role description
    pub assigned_to: AgentPubKey, // Agent receiving the role
    pub assigned_by: AgentPubKey, // Agent assigning the role
    pub assigned_at: Timestamp,   // Assignment timestamp
}
```

**Governance**: Only predefined role types allowed
**Authorization**: Role assignment tracked with metadata

### Role Types Hierarchy

```rust
pub enum RoleType {
    SimpleAgent,             // Simple Agent capabilities
    AccountableAgent,        // Accountable Agent level
    PrimaryAccountableAgent, // Primary Accountable Agent level
    Transport,               // Transport process access
    Repair,                  // Repair process access
    Storage,                 // Storage process access
}
```

**Agent Capability Progression**:

- **Simple Agent** (Entry Level): Default capabilities
- **Accountable Agent** (Validated): Enhanced capabilities after resource validation
- **Primary Accountable Agent** (Custodian): Full governance rights and physical custody
- **Specialized Roles**: Transport, Repair, Storage for specific service types

### Capability-Based Private Data Sharing

#### PrivateDataCapabilityMetadata Entry

```rust
pub struct PrivateDataCapabilityMetadata {
    pub grant_hash: ActionHash,          // Hash of the capability grant
    pub granted_to: AgentPubKey,         // Agent granted access
    pub granted_by: AgentPubKey,         // Agent granting access (data owner)
    pub fields_allowed: Vec<String>,     // Specific fields accessible
    pub context: String,                 // Context for the access
    pub expires_at: Timestamp,           // When access expires
    pub created_at: Timestamp,           // When grant was created
    pub cap_secret: CapSecret,           // Capability secret for validation
}
```

#### FilteredPrivateData Structure

```rust
pub struct FilteredPrivateData {
    pub legal_name: Option<String>,      // Never shared for privacy
    pub email: Option<String>,           // Email if granted
    pub phone: Option<String>,           // Phone if granted
    pub address: Option<String>,         // Address if granted
    pub emergency_contact: Option<String>, // Emergency contact if granted
    pub time_zone: Option<String>,       // Time zone if granted
    pub location: Option<String>,        // Location if granted
}
```

**Capability Access Patterns**:

- **Field-Level Control**: Granular access to specific private data fields
- **Time-Limited Access**: Automatic expiration with configurable duration (max 30 days)
- **Context-Aware Grants**: Access linked to specific purposes and resource transfers
- **Holochain Native Security**: Uses CapGrant/CapClaim system for cryptographic access control

## API Functions

### Person Management

#### `create_person(input: PersonInput) -> ExternResult<Record>`

Creates a new person profile for the calling agent.

**Input**:

```rust
pub struct PersonInput {
    pub name: String,
    pub avatar_url: Option<String>,
    pub bio: Option<String>,
}
```

**Business Logic**:

- Validates one person per agent (prevents duplicates)
- Creates discovery links for efficient queries
- Links agent to person profile for quick lookup

**Links Created**:

- `persons anchor -> person_hash` (discovery)
- `agent_pubkey -> person_hash` (agent lookup)

#### `update_person(input: UpdatePersonInput) -> ExternResult<Record>`

Updates an existing person profile with versioning support.

**Authorization**: Only the person's author can update
**Versioning**: Creates update links for version history

#### `get_latest_person(original_action_hash: ActionHash) -> ExternResult<Person>`

Retrieves the latest version of a person profile.

**Pattern**: Follows update chain via `PersonUpdates` links
**Performance**: Optimized with timestamp-based latest selection

#### `get_all_persons() -> ExternResult<GetAllPersonsOutput>`

Discovers all person profiles in the network.

**Discovery Pattern**: Queries the `persons` anchor path
**Output**: Array of all public person profiles

#### `get_person_profile(agent_pubkey: AgentPubKey) -> ExternResult<PersonProfileOutput>`

Gets public profile information for a specific agent.

**Privacy**: Returns only public `Person` data, no private information

#### `get_my_person_profile() -> ExternResult<PersonProfileOutput>`

Gets complete profile information for the calling agent.

**Privacy**: Includes both public `Person` and private `PrivatePersonData`

### Private Data Management

#### `store_private_person_data(input: PrivatePersonDataInput) -> ExternResult<Record>`

Stores private personal information for the calling agent.

**Security**: Private entry visibility enforced by Holochain
**Linking**: Automatically links to person profile if it exists

#### `update_private_person_data(input: UpdatePrivatePersonDataInput) -> ExternResult<Record>`

Updates private personal information.

**Authorization**: Private entry visibility ensures only owner can update

#### `get_my_private_person_data() -> ExternResult<Option<PrivatePersonData>>`

Retrieves private data for the calling agent.

**Security**: Only accessible by the data owner

### Capability-Based Private Data Sharing

#### `grant_private_data_access(input: GrantPrivateDataAccessInput) -> ExternResult<GrantPrivateDataAccessOutput>`

Creates a Holochain-native capability grant for private data access.

**Input**:

```rust
pub struct GrantPrivateDataAccessInput {
    pub agent_to_grant: AgentPubKey,
    pub fields_allowed: Vec<String>,    // ["email", "phone", "location", "time_zone", "emergency_contact", "address"]
    pub context: String,
    pub expires_in_days: Option<u32>,    // Default 7 days, max 30 days
}
```

**Output**:

```rust
pub struct GrantPrivateDataAccessOutput {
    pub grant_hash: ActionHash,
    pub cap_secret: CapSecret,
    pub expires_at: Timestamp,
}
```

**Security**: Uses Holochain's native CapGrant system
**Validation**: Only allowed fields can be granted
**Automatic Enforcement**: Holochain runtime validates capability claims

#### `create_private_data_cap_claim(input: CreatePrivateDataCapClaimInput) -> ExternResult<CreatePrivateDataCapClaimOutput>`

Creates a capability claim to access private data.

**Usage**: Required before accessing protected data
**Validation**: Automatic Holochain capability checking

#### `get_private_data_with_capability(input: GetPrivateDataWithCapabilityInput) -> ExternResult<FilteredPrivateData>`

Accesses private data using a valid capability claim.

**Protection**: Automatically validated by Holochain capability system
**Field Filtering**: Only returns fields included in the capability grant
**Privacy**: Legal name never included in shared data

#### `grant_role_based_private_data_access(input: GrantRoleBasedAccessInput) -> ExternResult<GrantPrivateDataAccessOutput>`

Creates capability grants based on predefined role configurations.

**Role Configurations**:

- **Simple Agent**: email only, 7 days
- **Accountable Agent**: email + phone, 14 days
- **Primary Accountable Agent**: email + phone + location, 30 days
- **Transport/Repair/Storage**: email + phone + location + time_zone, 21 days

#### `create_transferable_private_data_access(input: CreateTransferableAccessInput) -> ExternResult<TransferableCapabilityOutput>`

Creates transferable capability grants that can be shared between agents.

**Use Case**: Guest access, temporary coordination, flexible sharing
**Security**: Shorter duration for transferable capabilities

#### `revoke_private_data_access(grant_hash: ActionHash) -> ExternResult<()>`

Revokes a previously granted data access.

**Authorization**: Only the granting agent can revoke

#### `get_my_capability_grants() -> ExternResult<Vec<PrivateDataCapabilityMetadata>>`

Gets all capability grants created by the calling agent.

#### `validate_capability_grant(grant_hash: ActionHash) -> ExternResult<bool>`

Validates whether a capability grant is still valid and not expired.

### Role Management

#### `assign_person_role(input: PersonRoleInput) -> ExternResult<Record>`

Assigns a role to an agent in the community.

**Input**:

```rust
pub struct PersonRoleInput {
    pub agent_pubkey: AgentPubKey,
    pub role_name: String,        // Must match RoleType enum
    pub description: Option<String>,
}
```

**Validation**: Role name must be from predefined `RoleType` enum
**Cross-Zome Integration**: For specialized roles, calls governance zome for validation
**Metadata**: Tracks who assigned the role and when

#### `get_person_roles(agent_pubkey: AgentPubKey) -> ExternResult<GetPersonRolesOutput>`

Retrieves all roles assigned to a specific agent.

**Pattern**: Follows `AgentToPerson -> PersonToRoles` link chain
**Versioning**: Gets latest version of each role

#### `get_my_person_roles() -> ExternResult<GetPersonRolesOutput>`

Gets all roles for the calling agent.

#### `has_person_role_capability(input: (AgentPubKey, String)) -> ExternResult<bool>`

Checks if an agent has a specific role capability.

**Usage**: Access control validation in other zomes
**Performance**: Optimized boolean check

#### `get_person_capability_level(agent_pubkey: AgentPubKey) -> ExternResult<String>`

Determines the highest capability level for an agent based on their roles.

**Returns**: "governance" | "coordination" | "stewardship" | "member"
**Logic**: Hierarchical evaluation of role capabilities

### Agent Promotion and Validation

#### `promote_agent_to_accountable(input: PromoteAgentInput) -> ExternResult<String>`

Promotes a Simple Agent to Accountable Agent status through governance validation.

**Input**:

```rust
pub struct PromoteAgentInput {
    pub agent: AgentPubKey,
    pub first_resource_hash: ActionHash,
}
```

**Cross-Zome Integration**: Calls `zome_gouvernance.validate_agent_identity`
**Governance**: Implements agent validation workflow
**Agent Progression**: Transitions Simple Agent → Accountable Agent after validation

#### `promote_agent_with_validation(input: PromoteAgentInput) -> ExternResult<Record>`

Promotes an agent with comprehensive validation workflow.

**Process**: Multi-step validation with governance integration
**Validation**: Creates validation receipt and triggers PPR generation

#### `request_role_promotion(input: RolePromotionRequest) -> ExternResult<ActionHash>`

Requests promotion to a higher role level.

**Workflow**: Creates request for existing agents to validate and approve

#### `approve_role_promotion(input: ApprovePromotionInput) -> ExternResult<Record>`

Approves a role promotion request.

**Authorization**: Only existing Primary Accountable Agents can approve promotions

### Cross-Zome Integration Functions

#### `validate_agent_private_data(input: ValidationDataRequest) -> ExternResult<ValidationResult>`

Validates agent private data for governance workflows.

**Purpose**: Enables governance zome to validate agent identity and private data
**Privacy**: Requires explicit consent for private data access

#### `validate_agent_private_data_with_grant(input: ValidationDataRequestWithGrant) -> ExternResult<ValidationResult>`

Validates agent private data using existing capability grant.

**Usage**: Optimized validation when access has already been granted

## Link Architecture

### Discovery Links

- **AllPersons**: `persons anchor -> person_hash` - Global person discovery
- **AgentToPerson**: `agent_pubkey -> person_hash` - Agent profile lookup

### Privacy Links

- **PersonToPrivateData**: `person_hash -> private_data_hash` - Private data access
- **AgentToPrivateData**: `agent_pubkey -> private_data_hash` - Direct private data access

### Role Links

- **PersonToRoles**: `person_hash -> role_hash` - Agent role queries
- **RoleUpdates**: `original_hash -> updated_hash` - Role version history

### Versioning Links

- **PersonUpdates**: `original_hash -> updated_hash` - Person version history

### Capability Management Links

- **AgentToCapabilityMetadata**: `agent_pubkey -> grant_hash` - Track grants created by agent
- **RevokedGrantAnchor**: Anchor for revoked capability grants

## Error Handling

### PersonError Types

```rust
pub enum PersonError {
    PersonAlreadyExists,           // One person per agent restriction
    PersonNotFound(String),        // Person lookup failures
    PrivateDataNotFound,          // Private data access failures
    RoleNotFound(String),         // Role lookup failures
    NotAuthor,                    // Authorization failures
    SerializationError(String),   // Data serialization issues
    EntryOperationFailed(String), // DHT operation failures
    LinkOperationFailed(String),  // Link operation failures
    InvalidInput(String),         // Input validation failures
    InsufficientCapability(String), // Capability level restrictions
}
```

**Pattern**: Comprehensive error coverage with descriptive messages
**Integration**: Converts to `WasmError` for Holochain compatibility

## Privacy Model

### Public Data Layer

- **Person entries**: Name, avatar, bio (discoverable)
- **Role assignments**: Role name, assignment metadata (auditable)
- **Capability metadata**: Grant information for audit trails

### Private Data Layer

- **PrivatePersonData entries**: PII, contact info (owner-only access)
- **Holochain Security**: Private entry visibility enforced by conductor

### Controlled Sharing Layer

- **Capability grants**: Time-limited, field-specific access grants
- **Allowed Fields**: email, phone, location, time_zone, emergency_contact, address
- **Grant Duration**: Maximum 30 days, configurable by data owner
- **Context-Aware**: Grants linked to specific purposes and resource transfers

## Integration with Other Zomes

### Cross-Zome Role Validation

```rust
// Check if agent has required role for operation
let has_capability = call(
    CallTargetCell::Local,
    "zome_person",
    "has_person_role_capability".into(),
    None,
    &("agent_pubkey", "required_role".to_string()),
)?;
```

### Agent Capability Level Validation

```rust
// Check agent capability level for resource operations
let capability_level = call(
    CallTargetCell::Local,
    "zome_person",
    "get_person_capability_level".into(),
    None,
    &agent_pubkey,
)?;
```

### Private Data Validation for Governance

```rust
// Governance zome accessing private data for agent validation
let validation_result = call(
    CallTargetCell::Local,
    "zome_person",
    "validate_agent_private_data".into(),
    None,
    &ValidationDataRequest {
        agent_to_validate: agent_pubkey,
        validation_type: "agent_promotion".to_string(),
        requesting_validator: validator_pubkey,
        validation_context: validation_hash,
    },
)?;
```

## Implementation Status

### ✅ **Completed Features**

- **Person Profile Management**: Public identity with name, avatar, bio
- **Private Data Management**: Secure personal information storage with field-level control
- **Role-Based Access Control**: 6-level role hierarchy with capability evaluation
- **Capability-Based Sharing**: Holochain native CapGrant/CapClaim system for private data
- **Agent Promotion Workflows**: Simple Agent → Accountable Agent promotion with governance validation
- **Cross-Zome Integration**: Role and capability validation for resource and governance zomes
- **Versioning Support**: Complete update history for persons and roles
- **Privacy Controls**: Four-layer privacy model with granular access control
- **Validation Functions**: Private data validation for governance workflows

### 🔧 **Current Limitations**

- **No Economic Processes**: Specialized roles (Transport, Repair, Storage) defined but not fully integrated with process workflows
- **Basic PPR Integration**: PPR system exists but integration with person zome is primarily through validation workflows
- **No Role Delegation**: Temporary role assignments and delegation workflows not implemented
- **Limited Audit Features**: Capability grant tracking exists but comprehensive audit trails need enhancement

### 📋 **Future Enhancement Opportunities**

- **Economic Process Integration**: Full integration with structured process workflows
- **Enhanced PPR Features**: Direct PPR storage and reputation calculation in person zome
- **Advanced Delegation**: Temporary role assignments with time-based expiration
- **Smart Grant Management**: AI-assisted private data sharing recommendations
- **Cross-Network Identity**: Federated identity management across multiple networks

The Person zome provides the foundational identity and privacy infrastructure for the nondominium ecosystem, enabling secure agent interactions with comprehensive role-based governance and sophisticated private data sharing capabilities.
