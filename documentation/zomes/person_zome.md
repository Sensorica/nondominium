# Person Zome (`zome_person`) Documentation

The Person zome provides comprehensive agent identity management with role-based access control, privacy layers, and capability validation for the Nondominium Holochain application.

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
    SimpleMember,           // Basic community participation
    CommunityAdvocate,      // Community support and advocacy
    CommunityFounder,       // Founding member privileges
    CommunityCoordinator,   // Community coordination responsibilities
    CommunityModerator,     // Moderation capabilities
    ResourceCoordinator,    // Resource management coordination
    ResourceSteward,        // Resource stewardship responsibilities
    GovernanceCoordinator,  // Governance process coordination
}
```

**Capability Levels**:
- **governance**: Community Founder, Governance Coordinator
- **coordination**: Community/Resource Coordinator, Community Moderator
- **stewardship**: Community Advocate, Resource Steward
- **member**: Simple Member (default)

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
**Links Created**: `original_hash -> updated_hash` (version tracking)

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
**Optimization**: Efficient private data retrieval with error handling

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
**Performance**: Optimized with error handling for missing data

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
**Metadata**: Tracks who assigned the role and when
**Linking**: Links role to person profile for efficient queries

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

## Link Architecture

### Discovery Links
- **AllPersons**: `persons anchor -> person_hash` - Global person discovery
- **AgentToPerson**: `agent_pubkey -> person_hash` - Agent profile lookup

### Privacy Links
- **PersonToPrivateData**: `person_hash -> private_data_hash` - Private data access

### Role Links
- **PersonToRoles**: `person_hash -> role_hash` - Agent role queries

### Versioning Links
- **PersonUpdates**: `original_hash -> updated_hash` - Person version history
- **RoleUpdates**: `original_hash -> updated_hash` - Role version history

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
}
```

**Pattern**: Comprehensive error coverage with descriptive messages
**Integration**: Converts to `WasmError` for Holochain compatibility

## Privacy Model

### Public Data Layer
- **Person entries**: Name, avatar, bio (discoverable)
- **Role assignments**: Role name, assignment metadata (auditable)

### Private Data Layer
- **PrivatePersonData entries**: PII, contact info (owner-only access)
- **Holochain Security**: Private entry visibility enforced by conductor

### Access Control Pattern
```rust
// Public profile access (any agent)
get_person_profile(target_agent) -> Person data only

// Private profile access (owner only)  
get_my_person_profile() -> Person + PrivatePersonData
```

## Integration with Other Zomes

### Role-Based Access Control for Resources
```rust
// Check if agent has required role for operation
let has_capability = has_person_role_capability((agent_pubkey, "Resource Coordinator".to_string()))?;
if !has_capability {
    return Err(ResourceError::GovernanceViolation("Resource Coordinator role required".to_string()));
}
```

### Capability Level Validation
```rust
// Resource creation authorization check
let capability_level = get_person_capability_level(agent_pubkey)?;
match capability_level.as_str() {
    "governance" | "coordination" => {
        // Allow resource specification creation
    },
    _ => return Err(ResourceError::GovernanceViolation("Insufficient capability".to_string()))
}
```

## Implementation Status

### Phase 1 (Complete)
- ✅ Person profile management with public/private data separation
- ✅ Role-based access control with 8-level hierarchy
- ✅ Capability level system for cross-zome authorization
- ✅ Comprehensive discovery and versioning patterns
- ✅ Privacy-preserving data access controls
- ✅ Complete validation and error handling

### Future Enhancements
- Enhanced role delegation workflows
- Temporary role assignments with expiration
- Reputation system integration
- Advanced privacy controls for selective data sharing

The Person zome provides the foundational identity and access control layer for the Nondominium resource sharing ecosystem, enabling secure, privacy-preserving agent interactions with comprehensive role-based governance capabilities.