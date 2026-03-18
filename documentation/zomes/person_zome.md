# Person Zome (`zome_person`) Documentation

The Person zome provides the foundational identity, privacy, and access control infrastructure for the nondominium ecosystem. It implements **Person-centric identity management**, role-based access control, capability-based private data sharing, multi-device support, and integration with the Private Participation Receipt (PPR) reputation system.

## Architecture Overview

The Person zome follows a **Person-Centric Link Strategy** with the relationship pattern: **Agent → Person → Data**

This architecture enables:
- **Multi-device support**: Multiple agents can represent the same person across different devices
- **Unified identity**: All data and roles are linked to the Person, not individual Agent devices
- **Simplified link management**: Single coherent strategy replacing multiple redundant approaches
- **Scalable access control**: Person-based permissions work across all devices

## Core Data Structures

### Person Entry

```rust
pub struct Person {
    pub name: String,                // Public display name
    pub avatar_url: Option<String>,  // Optional avatar URL (validated HTTP/HTTPS)
    pub bio: Option<String>,         // Optional biography
}
```

> **TODO (G1 — AgentEntityType)**: Add an `agent_entity_type: AgentEntityType` field to this struct (or to a companion `AgentContext` entry). This field distinguishes Individual, Collective, Project, Network, Bot, and ExternalOrganisation agents. Currently all agents are implicitly modelled as individual humans. See `agent.md` §6.1 and `REQ-AGENT-01`.
>
> **TODO (G15 — CapabilitySlot on Agent)**: The `Person` entry hash should serve as a stigmergic attachment surface — analogous to the `NondominiumIdentity` CapabilitySlot in `ndo_prima_materia.md` §6. External credential wallets, DID documents, and reputation oracles should be attachable via typed DHT links from the `Person` hash without modifying this entry. See `agent.md` §3.2 and `REQ-AGENT-11`.

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

### Device Management Entries

#### AgentPersonRelationship Entry

```rust
pub struct AgentPersonRelationship {
    pub agent_pubkey: AgentPubKey,     // Agent representing the person
    pub person_hash: ActionHash,       // Person entry hash
    pub device_type: String,           // Device type (mobile, desktop, web, etc.)
    pub device_name: Option<String>,   // User-friendly device name
    pub created_at: Timestamp,         // When relationship was created
    pub is_active: bool,               // Whether device is currently active
}
```

**Purpose**: Links Agents to Persons, enabling multi-device scenarios
**Validation**: One-to-one Agent-Person relationship prevents ambiguity

#### Device Entry

```rust
pub struct Device {
    pub device_id: String,             // Unique device identifier
    pub device_type: String,           // Device category
    pub device_name: String,           // User-friendly name
    pub person_hash: ActionHash,       // Associated person
    pub created_at: Timestamp,         // Device registration time
    pub last_active: Timestamp,        // Last activity timestamp
    pub capabilities: Vec<String>,     // Device-specific capabilities
}
```

**Purpose**: Physical device management for security and access control
**Features**: Activity tracking, capability management, device lifecycle

#### DeviceSession Entry

```rust
pub struct DeviceSession {
    pub device_id: String,             // Device identifier
    pub session_start: Timestamp,      // Session start time
    pub session_end: Option<Timestamp>, // Session end time (optional for active sessions)
    pub ip_address: Option<String>,    // Network location
    pub user_agent: Option<String>,    // Client information
}
```

**Purpose**: Session tracking for security and audit purposes
**Security**: Enables device-based security policies and monitoring

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

> **TODO (G14 — Configurable Role Taxonomy)**: This enum is currently closed — only these six role types exist and communities cannot define their own. The OVN model requires that roles emerge from community needs, not from infrastructure decisions. Post-MVP, `RoleType` should become either an open string-tagged enum or a configurable registry of role entries defined per network. These six roles become sensible defaults, not constraints. See `agent.md` §5.3 and `REQ-AGENT-06`.

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

- Validates one person per agent through AgentPersonRelationship (prevents duplicates)
- Creates discovery links for efficient queries
- Establishes Person-centric identity foundation

**Links Created**:

- `persons anchor -> person_hash` (global discovery)
- `agent_pubkey -> person_hash` (via AgentPersonRelationship)
- `person_hash -> agent_pubkey` (reverse lookup for device management)

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

### Device Management

#### `register_device_for_person(input: RegisterDeviceInput) -> ExternResult<Record>`

Registers a new device for the calling agent's person.

**Input**:

```rust
pub struct RegisterDeviceInput {
    pub device_type: String,           // Device category (mobile, desktop, web, etc.)
    pub device_name: String,           // User-friendly device name
    pub capabilities: Vec<String>,     // Device-specific capabilities
}
```

**Business Logic**:

- Links device to agent's existing person profile
- Creates AgentPersonRelationship for device tracking
- Automatically generates unique device identifier
- Supports device-specific capability management

**Multi-Device Support**: Enables same person across multiple devices

#### `get_my_devices() -> ExternResult<GetMyDevicesOutput>`

Retrieves all devices registered for the calling agent's person.

**Output**:

```rust
pub struct GetMyDevicesOutput {
    pub devices: Vec<Device>,
}
```

**Security**: Only accessible by the person who owns the devices
**Features**: Returns device metadata, activity status, and capabilities

#### `update_device_activity(device_id: String) -> ExternResult<()>`

Updates the last activity timestamp for a device.

**Usage**: Called automatically during user interactions to maintain device activity tracking
**Security**: Only device owner can update activity
**Purpose**: Enables device-based security policies and session management

#### `get_agent_person(agent_pubkey: AgentPubKey) -> ExternResult<Option<ActionHash>>`

Retrieves the person hash associated with a specific agent.

**Cross-Zome Usage**: Essential for other zomes to resolve Agent → Person relationships
**Person-Centric Pattern**: Core function enabling unified data access across devices
**Returns**: Person hash if Agent-Person relationship exists, None otherwise

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

The Person-Centric Link Strategy uses a unified **Agent → Person → Data** pattern that simplifies access while enabling multi-device scenarios.

### Discovery Links

- **AllPersons**: `persons anchor -> person_hash` - Global person discovery
- **AgentToPerson**: `agent_pubkey -> person_hash` - Agent-to-Person relationship lookup
- **PersonToAgent**: `person_hash -> agent_pubkey` - Reverse lookup for device management

### Privacy Links (Person-Centric)

- **PersonToPrivateData**: `person_hash -> private_data_hash` - **Primary private data access**
- **PrivateDataUpdates**: `original_hash -> updated_hash` - Private data version history

**Key Improvement**: Simplified from 3 redundant strategies to 1 unified Person-centric approach

### Role Links (Person-Centric)

- **PersonToRoles**: `person_hash -> role_hash` - Person role queries (works across all devices)
- **RoleUpdates**: `original_hash -> updated_hash` - Role version history

**Multi-Device Benefit**: Roles are assigned to Persons, not individual Agents, so they work across all devices

### Versioning Links

- **PersonUpdates**: `original_hash -> updated_hash` - Person version history

### Device Management Links

- **PersonToDevices**: `person_hash -> device_hash` - All devices belonging to a person
- **DeviceToSessions**: `device_id -> session_hash` - Device session tracking
- **AgentToRelationship**: `agent_pubkey -> relationship_hash` - AgentPersonRelationship tracking

### Capability Management Links

- **AgentToCapabilityMetadata**: `agent_pubkey -> grant_hash` - Track grants created by agent
- **RevokedGrantAnchor**: Anchor for revoked capability grants

### Cross-Zome Integration Pattern

```rust
// Other zomes use this pattern for Person-centric access
let person_hash = call(
    CallTargetCell::Local,
    "zome_person",
    "get_agent_person".into(),
    None,
    &agent_pubkey,
)?;

if let Some(person) = person_hash {
    // Access Person's data, roles, resources
    let roles = call("zome_person", "get_person_roles", None, &person_hash)?;
    let resources = call("zome_resource", "get_person_resources", None, &person_hash)?;
}
```

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

The Person-Centric architecture provides a unified integration pattern for all zomes.

### Person-Centric Access Pattern

```rust
// RESOLUTION PATTERN: Agent → Person → Data
let person_hash = call(
    CallTargetCell::Local,
    "zome_person",
    "get_agent_person".into(),
    None,
    &agent_pubkey,
)?;

if let Some(person) = person_hash {
    // Access Person's unified data across all their devices
    let roles = call("zome_person", "get_person_roles", None, &person_hash)?;
    let private_data = call("zome_person", "get_person_private_data", None, &person_hash)?;
    let resources = call("zome_resource", "get_person_resources", None, &person_hash)?;
}
```

### Cross-Zome Role Validation (Person-Centric)

```rust
// Check if PERSON (not agent) has required role for operation
let person_hash = call("zome_person", "get_agent_person", None, &agent_pubkey)?;
if let Some(person) = person_hash {
    let has_capability = call(
        CallTargetCell::Local,
        "zome_person",
        "has_person_role_capability".into(),
        None,
        &(person, "required_role".to_string()),
    )?;
}
```

**Multi-Device Benefit**: Role validation works consistently across all user devices

### Agent Capability Level Validation

```rust
// Check PERSON's capability level (unified across devices)
let person_hash = call("zome_person", "get_agent_person", None, &agent_pubkey)?;
if let Some(person) = person_hash {
    let capability_level = call(
        CallTargetCell::Local,
        "zome_person",
        "get_person_capability_level".into(),
        None,
        &person,
    )?;
}
```

### Private Data Validation for Governance

```rust
// Governance zome accessing PERSON's private data (not agent-specific)
let person_hash = call("zome_person", "get_agent_person", None, &agent_pubkey)?;
if let Some(person) = person_hash {
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
}
```

### Resource Zome Integration

```rust
// Resources linked to PERSON, not individual agents
let person_hash = call("zome_person", "get_agent_person", None, &agent_pubkey)?;
if let Some(person) = person_hash {
    // Get all resources belonging to this person (across all devices)
    let resources = call("zome_resource", "get_person_resources", None, &person_hash)?;

    // Create new resource linked to person
    let resource = call("zome_resource", "create_resource", None, &ResourceInput {
        person_hash: person,
        // ... other fields
    })?;
}
```

## Implementation Status

### ✅ **Completed Features**

- **Person-Centric Architecture**: Unified Agent → Person → Data relationship pattern
- **Multi-Device Support**: Complete device management with AgentPersonRelationship tracking
- **Person Profile Management**: Public identity with name, avatar, bio
- **Private Data Management**: Simplified Person-centric private data access (1 unified strategy)
- **Role-Based Access Control**: 6-level role hierarchy with Person-centric assignment
- **Capability-Based Sharing**: Holochain native CapGrant/CapClaim system for private data
- **Device Management**: Complete device registration, tracking, and session management
- **Agent Promotion Workflows**: Simple Agent → Accountable Agent promotion with governance validation
- **Cross-Zome Integration**: Person-centric role and capability validation for all zomes
- **Versioning Support**: Complete update history for persons, roles, and devices
- **Privacy Controls**: Four-layer privacy model with Person-centric access control
- **Validation Functions**: Private data validation for governance workflows

### 🚀 **New Person-Centric Capabilities**

- **Simplified Link Management**: Reduced from 3 redundant strategies to 1 unified approach
- **Multi-Device Identity**: Same Person can operate across multiple devices seamlessly
- **Unified Data Access**: All data (roles, resources, private info) accessed through Person
- **Device Security Policies**: Device-based access control and session management
- **Cross-Device Consistency**: Roles and permissions work consistently across all devices

### 🔧 **Current Limitations**

- **No Economic Processes**: Specialized roles (Transport, Repair, Storage) defined but not fully integrated with process workflows
- **Basic PPR Integration**: PPR system exists but integration with person zome is primarily through validation workflows
- **No Role Delegation**: Temporary role assignments and delegation workflows not implemented
- **Limited Audit Features**: Capability grant tracking exists but comprehensive audit trails need enhancement

**Agent Ontology Gaps** (identified against OVN wiki — see `documentation/archives/agent.md` §2.6):

| Gap | Gap ID | OVN Relevance | Impact |
|---|---|---|---|
| Only individual agents modelled | G1 | OVN: groups, projects, networks, bots are also agents | Cannot model collective agency, AI participants, or network-level actors |
| Binary in/out membership | G2 | OVN: UnaffiliatedStranger/Close/Active/Core/Inactive affiliation spectrum | Cannot determine governance eligibility algorithmically; 1-9-90 engagement reality is invisible |
| No composable AgentProfile | G3 | OVN: profile aggregates roles, contributions, relations, credentials | Person, ReputationSummary, and Roles are separate and unconnected |
| No social graph | G4 | OVN: social relations are part of profile and social capital | Cannot surface network wealth or organisational reach |
| No network affiliations | G5 | OVN: agents participate simultaneously in multiple networks | Single-network only; agents cannot be bridge nodes |
| No AffiliationRecord | G6 | OVN: formal ToP ceremony creates accountability for active affiliates | No formal onboarding; no machine-readable agreement to Terms of Participation |
| `request_role_promotion` stubbed | G13 | Promotion requests cannot be queried or tracked | Approvers cannot discover pending requests; workflow is broken |
| Roles are predefined/closed | G14 | OVN: roles emerge from community needs | Communities cannot extend the role taxonomy |

### 📋 **Future Enhancement Opportunities**

The following items map directly to the gap IDs in `documentation/archives/agent.md` and the `REQ-AGENT-*` requirements in `documentation/requirements/requirements.md`:

**Phase 2 (Near-term):**
- **[G13] Fix `request_role_promotion` stub**: Create a real queryable `RolePromotionRequest` entry with bidirectional discovery links so approvers can find and act on pending requests (see `REQ-AGENT-16`).
- **[G6] `AffiliationRecord` entry**: Implement formal Terms of Participation ceremony — agent cryptographically signs acknowledgement of ToP, Nondominium & Custodian agreement, and Benefit Redistribution Algorithm (see `REQ-AGENT-05`).
- **[G2] Derived affiliation state**: Implement `get_affiliation_state(agent)` as a computed query over existing PPR + contribution data — `f(person_exists, contributions_count, last_contribution_ts, reputation_summary, affiliation_record_exists)` → `UnaffiliatedStranger | CloseAffiliate | ActiveAffiliate | CoreAffiliate | InactiveAffiliate` (see `REQ-AGENT-04`).

**Phase 3 (Medium-term):**
- **[G1] `AgentEntityType` field**: Add `agent_entity_type: AgentEntityType` to agent context (Individual, Collective, Project, Network, Bot, ExternalOrganisation). Collective agents reference an NDO hash rather than a Person entry (see `REQ-AGENT-01`, `REQ-AGENT-02`).
- **[G15] CapabilitySlot on Person**: Implement typed DHT links from `Person` hash to external capabilities — DID documents, credential wallets, reputation oracles — without modifying the `Person` entry (see `REQ-AGENT-11`).
- **[G3] Composable `AgentProfile` view**: Implement `get_agent_profile(agent)` that assembles Person + ReputationSummary + PersonRole list + active commitment count + economic event counts + CapabilitySlot attachments + network affiliations into one queryable output (see `REQ-AGENT-07`).
- **[G4] `AgentRelationship` link type**: Bidirectional, typed (colleague, collaborator, trusted, voucher), private peer relationship links. Social capital must be legible to governance (see `REQ-AGENT-08`).
- **[G5] Network affiliation links**: Typed links from `Person` hash to NDO instance hashes, modelling cross-network membership (see `REQ-AGENT-09`).
- **[G14] Configurable role taxonomy**: Replace closed `RoleType` enum with a configurable role registry defined per network; predefined roles become defaults (see `REQ-AGENT-06`).

**Phase 4 (Long-term):**
- **[G8] `PortableCredential` structure**: Bilaterally signed credential export (issuer + agent signatures) verifiable by other Holochain networks. Types: `RoleCredential`, `ReputationCredential`, `CompetencyCredential`, `AffiliationCredential` (see `REQ-AGENT-12`).
- **[G7] ZKP capability proofs**: Integration of ZKP library or ZKP-compatible VC layer; `prove_capability(condition)` without raw data disclosure — e.g., "I have ≥10 completed maintenance commitments" without revealing counterparties or timestamps (see `REQ-AGENT-13`).
- **[G9] Sybil resistance**: Social vouching (existing agents vouch for new agents), biometric opt-in, or Proof-of-Personhood integration as configurable membrane proof (see `REQ-AGENT-15`).
- **[G10] Pseudonymous participation mode**: Allow contribution under a temporary ephemeral key without linking to `Person`. Contribution is recorded but unlinkable to physical identity (see `REQ-AGENT-14`).
- **[G11] AI/bot delegation**: `DelegatedAgent` relationship allowing a Person to authorise an AI or bot to act within defined scope and duration (see `REQ-AGENT-03`).
- **[G12] `AgentNeedsWants` profile extension**: Optional profile extension declaring what resources the agent needs and what they can offer, enabling network-level matching (see `REQ-AGENT-10`).
- **Cross-Network Identity**: Federated identity management using PortableCredential + Holochain membrane proofs.
- **Device Trust Scoring**: Reputation-based device security policies.
- **Advanced Session Management**: Multi-device session coordination and security.

The Person zome provides the foundational identity and privacy infrastructure for the nondominium ecosystem, enabling secure agent interactions with comprehensive role-based governance and sophisticated private data sharing capabilities.
