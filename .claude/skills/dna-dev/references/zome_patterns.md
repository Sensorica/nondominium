# Nondominium Zome Architecture Patterns

This document describes the specific architectural patterns used in the nondominium Holochain application for ValueFlows-compliant economic resource sharing.

## 3-Zome Architecture

nondominium follows a 3-zome architecture pattern:

```
zome_person      - Agent identity, profiles, roles, capability-based access
zome_resource    - Resource specifications and lifecycle management
zome_gouvernance - Commitments, claims, economic events, governance rules, PPR system
```

Each zome follows the integrity/coordinator separation pattern:

- **Integrity Layer**: Entry definitions, validation rules, core data structures
- **Coordinator Layer**: Business logic, cross-zome calls, external integrations

## Entry Creation Patterns

### Standard Entry Structure

All entries in nondominium follow this pattern:

```rust
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct EntryType {
    // Business-specific fields
    pub field: String,

    // Standard metadata fields
    pub agent_pub_key: AgentPubKey,
    pub created_at: Timestamp,
}
```

### Creation Pattern

All create functions follow this pattern:

```rust
#[hdk_extern]
pub fn create_entry_type(input: EntryTypeInput) -> ExternResult<Record> {
    let agent_pubkey = agent_info()?.agent_initial_pubkey;

    // Check for existing entries if needed
    let existing_links = get_links(
        GetLinksInputBuilder::try_new(agent_pubkey.clone(), LinkTypes::AgentToEntryType)?.build(),
    )?;

    if !existing_links.is_empty() {
        return Err(EntryError::AlreadyExists.into());
    }

    // Create entry
    let entry = EntryType {
        field: input.field,
        agent_pub_key: agent_pubkey.clone(),
        created_at: sys_time()?,
    };

    let entry_hash = create_entry(&EntryTypes::EntryType(entry.clone()))?;
    let record = get(entry_hash.clone(), GetOptions::default())?.ok_or(
        EntryError::CreationFailed("Failed to retrieve created entry".to_string()),
    )?;

    // Create discovery anchor links
    let path = Path::from("entry_types");
    create_link(path.path_entry_hash()?, entry_hash.clone(), LinkTypes::AnchorType, LinkTag::new("entry_type"))?;

    // Create agent-specific link
    create_link(agent_pubkey, entry_hash, LinkTypes::AgentToEntryType, LinkTag::new("created"))?;

    Ok(record)
}
```

## Function Naming Conventions

- `create_[entry_type]`: Creates new entries with anchor links
- `get_[entry_type]`: Retrieves entries by hash
- `get_all_[entry_type]`: Discovery via anchor links
- `update_[entry_type]`: Updates existing entries
- `delete_[entry_type]`: Marks entries as deleted

## Agent-Centric Data Model

### Public/Private Separation

- **Public Data**: Discoverable entries (Person, Resource Specification)
- **Private Data**: Access-controlled entries (EncryptedProfile, private resource details)

### Capability-Based Security

Role-based access using Holochain capability tokens:

```rust
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct RoleAssignment {
    pub agent: AgentPubKey,
    pub role: String,
    pub capability_level: u32,
    pub granted_by: AgentPubKey,
    pub granted_at: Timestamp,
}
```

## ValueFlows Integration

### Core ValueFlows Data Structures

```rust
// Economic Resource - primary resource entity
pub struct EconomicResource {
    pub resource_specification: ActionHash,
    pub current_state: String,
    pub tracking_identifier: Option<String>,
    pub unit_of_effort: Option<String>,
    pub contained_in: Option<ActionHash>,
    pub agent_pub_key: AgentPubKey,
    pub created_at: Timestamp,
}

// Economic Event - resource movements and changes
pub struct EconomicEvent {
    pub action: String,
    pub resource_inventoried_as: Option<ActionHash>,
    pub to_resource_inventoried_as: Option<ActionHash>,
    pub resource_quantity: Option<f64>,
    pub effort_quantity: Option<f64>,
    pub provider: AgentPubKey,
    pub receiver: AgentPubKey,
    pub note: Option<String>,
    pub agent_pub_key: AgentPubKey,
    pub created_at: Timestamp,
}

// Commitment - agreements between agents
pub struct Commitment {
    pub provider: AgentPubKey,
    pub receiver: AgentPubKey,
    pub resource_inventoried_as: Option<ActionHash>,
    pub resource_quantity: Option<f64>,
    pub effort_quantity: Option<f64>,
    pub due: Option<Timestamp>,
    pub created: Timestamp,
    pub note: Option<String>,
    pub agent_pub_key: AgentPubKey,
    pub created_at: Timestamp,
}
```

## Error Handling Patterns

### Custom Error Types

Each zome defines its own error type:

```rust
#[derive(Debug, thiserror::Error)]
pub enum ZomeError {
  #[error("Entry not found: {0}")]
  EntryNotFound(String),

  #[error("Entry already exists")]
  AlreadyExists,

  #[error("Not the author of this entry")]
  NotAuthor,

  #[error("Serialization error: {0}")]
  SerializationError(String),

  #[error("Entry operation failed: {0}")]
  EntryOperationFailed(String),

  #[error("Invalid input: {0}")]
  InvalidInput(String),

  #[error("Insufficient capability level: {0}")]
  InsufficientCapability(String),
}

impl From<ZomeError> for WasmError {
    fn from(err: ZomeError) -> Self {
        wasm_error!(WasmErrorInner::Guest(err.to_string()))
    }
}
```

## Link Patterns

### Discovery Anchors

```rust
// Global discovery
let path = Path::from("persons");
create_link(path.path_entry_hash()?, person_hash, LinkTypes::Anchor, LinkTag::new("person"))?;

// Agent-specific links
create_link(agent_pubkey, person_hash, LinkTypes::AgentToPerson, LinkTag::new("profile"))?;
```

### Relationship Links

```rust
// Resource to specification
create_link(resource_hash, spec_hash, LinkTypes::ResourceToSpecification, LinkTag::new("spec"))?;

// Agent to resources
create_link(agent_pubkey, resource_hash, LinkTypes::AgentToResource, LinkTag::new("owns"))?;
```

## Performance Optimization

### WASM Size Optimization

- Use `wee_alloc` for memory allocation
- Remove debug symbols in release builds
- Avoid unnecessary dependencies
- Use efficient data structures

### Memory Management

- Prefer references over clones where possible
- Use efficient serialization formats
- Minimize stored data in entry types

## Cross-Zome Communication

### Integrity Function Calls

```rust
// Call to another zome's integrity function
let result: ExternResult<ValidationStatus> = call_integrity(
    zome_info()?.zome_id,
    "validate_resource_access".into(),
    CapSecret::default(),
    ValidateAccessInput {
        agent: agent_pubkey,
        resource: resource_hash,
    },
)?;
```

### Remote Zome Calls

```rust
// Call to another agent's zome
let result: ExternResult<ResourceDetails> = call_remote(
    agent_pubkey,
    zome_zome_resource.zome_name,
    "get_resource_details".into(),
    CapSecret::default(),
    resource_hash,
)?;
```

## Privacy and Security

### PPR (Private Permissioned Requests) System

The PPR system enables secure private data sharing:

1. **Request Creation**: Agent creates encrypted request with capability requirements
2. **Permission Validation**: Target agent validates capabilities and decrypts
3. **Secure Response**: Encrypted response with audit trail

### Capability Tokens

Role-based access control with capability tokens:

```rust
pub struct CapabilityToken {
    pub grantor: AgentPubKey,
    pub grantee: AgentPubKey,
    pub capabilities: Vec<String>,
    pub expires_at: Option<Timestamp>,
    pub created_at: Timestamp,
}
```

## Development Workflow

### 1. Create Entry Types
- Define structs in integrity layer
- Implement serialization/deserialization
- Add to EntryTypes enum

### 2. Implement Validation
- Add validation functions to integrity layer
- Implement business rule checks
- Handle error cases

### 3. Create Coordinator Functions
- Implement CRUD operations
- Add cross-zome calls
- Handle capability checks

### 4. Add Discovery Links
- Create anchor paths for global discovery
- Add agent-specific links for ownership
- Implement relationship links

### 5. Test Integration
- Use 4-layer testing strategy
- Validate cross-zome interactions
- Test capability-based access

## Common Patterns

### Timestamp Handling
```rust
let created_at = sys_time()?;
```

### Agent Identification
```rust
let agent_pubkey = agent_info()?.agent_initial_pubkey;
```

### Entry Retrieval
```rust
let record = get(entry_hash, GetOptions::default())?
    .ok_or(EntryError::NotFound(entry_hash.to_string()))?;
```

### Link Querying
```rust
let links = get_links(
    GetLinksInputBuilder::try_new(base, LinkTypes::LinkType)?.build(),
)?;
```