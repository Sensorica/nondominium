---
name: nondominium-holochain-dev
description: Specialized development skill for nondominium Holochain zome development, providing workflows, patterns, and tools for creating, modifying, and building ValueFlows-compliant zomes with integrity/coordinator architecture. Use when working with Holochain zomes in the nondominium project, creating new economic resource sharing features, or following ValueFlows standards.
---

# Nondominium Holochain Development

This skill transforms Claude into a specialized nondominium Holochain development assistant, providing expert guidance for zome development following ValueFlows standards and the project's unique 3-zome architecture.

## When to Use This Skill

**Use this skill when:**
- Creating new zomes for the nondominium project
- Implementing ValueFlows-compliant economic resource sharing features
- Following integrity/coordinator zome architecture patterns
- Working with capability-based access control systems
- Building WASM-optimized Holochain applications
- Debugging cross-zome communication issues

**Do NOT use for:**
- General Holochain development (use generic Holochain guides instead)
- Testing workflows (use the separate testing skill)
- Frontend/UI development (use appropriate web development skills)

## Core Development Workflows

### 1. Zome Creation Workflow

Create new zomes following nondominium's 3-zome architecture pattern:

1. **Initialize Zome Structure**
   ```bash
   ./scripts/create_zome.sh <zome_name> both
   ```

2. **Implement Integrity Layer**
   - Define entry types in `lib.rs`
   - Add validation functions
   - Define link types and relationships
   - See `assets/entry_types/` for templates

3. **Implement Coordinator Layer**
   - Import integrity types: `use zome_<name>_integrity::*;`
   - Implement CRUD functions following naming conventions
   - Add cross-zome calls for business logic
   - See `assets/function_templates/` for patterns

4. **Configure Dependencies**
   ```toml
   # Cargo.toml
   [zome_traits]
   hdk_integrity = "zome_<name>_integrity"
   ```

5. **Validate Structure**
   ```bash
   ./scripts/sync_integrity_coordinator.sh <zome_name>
   ```

### 2. Entry Creation Workflow

Follow ValueFlows-compliant entry patterns:

1. **Define Entry Structure - NO TIMESTAMP FIELDS**
   ```rust
   #[hdk_entry_helper]
   #[derive(Clone, PartialEq)]
   pub struct EconomicResource {
       // Business fields
       pub resource_specification: ActionHash, // Link to spec
       pub current_state: String,

       // Agent information (NO timestamps!)
       pub created_by: AgentPubKey,
   }
   ```

2. **Create Input Structure**
   ```rust
   #[derive(Serialize, Deserialize, Debug)]
   pub struct CreateEconomicResourceInput {
       pub resource_specification: ActionHash,
       pub current_state: String,
   }
   ```

3. **Implement Create Function**
   - Get agent pubkey: `agent_info()?.agent_initial_pubkey`
   - Validate input data
   - Create entry with **NO** `created_at` field
   - Create discovery links for global access
   - Create agent links for ownership tracking
   - Handle errors with custom error types

4. **Add Discovery Patterns**
   ```rust
   // Global anchor - discoverable by everyone
   let path = Path::from("resources");
   create_link(path.path_entry_hash()?, entry_hash, LinkTypes::AllResources, LinkTag::new("resource"))?;

   // Agent link - discoverable by agent
   create_link(agent_pubkey, entry_hash, LinkTypes::AgentToResources, LinkTag::new("created"))?;

   // Hierarchical link - facility to its specification
   create_link(facility_hash, spec_hash, LinkTypes::SpecificationToFacility, LinkTag::new("implements"))?;
   ```

5. **Get Timestamps from Action Headers When Needed**
   ```rust
   let record = get(entry_hash, GetOptions::default())?;
   let action = record.action().as_create()?;
   let created_at = action.timestamp();
   ```

### 3. Build and Validation Workflow

1. **Build WASM**
   ```bash
   ./scripts/build_wasm.sh release [zome_name]
   ```

2. **Validate Patterns**
   ```bash
   ./scripts/validate_entry.sh <zome_name>
   ```

3. **Check Performance**
   - Monitor WASM file sizes (target < 500KB per zome)
   - Review optimization suggestions
   - Test memory usage patterns

4. **Package hApp**
   ```bash
   ./scripts/package_happ.sh production
   ```

## Critical Holochain Patterns

### ✅ CORRECT Data Structure Patterns

**NEVER use SQL-style foreign keys in entry fields!**
```rust
// ❌ WRONG - Direct ActionHash references
struct BadFacility {
    pub facility_hash: ActionHash,  // SQL-style foreign key
    pub owner: ActionHash,        // Should be a link instead
}

// ✅ CORRECT - Use links for relationships
struct GoodFacility {
    pub conforms_to: ActionHash,     // Link to specification
    // No direct references to other entries
}

// ✅ CORRECT - Link patterns for relationships
create_link(facility_hash, owner_hash, LinkTypes::FacilityToOwner, LinkTag::new("managed_by"))?;
```

### ✅ NO Manual Timestamps

**Use Holochain's built-in header metadata:**
```rust
// ❌ WRONG - Manual timestamps
struct BadEntry {
    pub created_at: Timestamp,    // Redundant!
    pub updated_at: Timestamp,    // Redundant!
}

// ✅ CORRECT - No timestamps in entries
struct GoodEntry {
    pub name: String,
    pub description: String,
    // No created_at/updated_at fields
}

// Get timestamps from action header when needed:
let record = get(entry_hash, GetOptions::default())?;
let action = record.action().as_create()?;
let created_at = action.timestamp();
```

### ✅ CORRECT Entry Definition Pattern (Updated 2025)

Use `#[hdk_entry_helper]` macro with proper validation requirements:

```rust
#[hdk_entry_helper]
#[derive(Clone, PartialEq)]
pub struct FacilitySpecification {
    pub name: String,
    pub description: String,
    pub facility_type: String, // Use Display impl for enums
    pub created_by: AgentPubKey,
    pub is_active: bool,
    // NO ActionHash fields for relationships
}

#[hdk_entry_types]
#[unit_enum(UnitEntryTypes)]
pub enum EntryTypes {
    #[entry_def(required_validations = 2)]  // Specify validation requirements
    FacilitySpecification(FacilitySpecification),

    #[entry_def(required_validations = 2)]
    EconomicFacility(EconomicFacility),

    #[entry_def(required_validations = 3)]  // Higher validation for bookings
    FacilityBooking(FacilityBooking),

    #[entry_def(required_validations = 2, visibility = "private")]
    PrivateFacilityData(PrivateFacilityData),
}
```

**🆕 NEW - Advanced Validation Options**:
```rust
#[hdk_entry_types]
#[unit_enum(UnitEntryTypes)]
pub enum EntryTypes {
    // Public entry with standard validation
    #[entry_def(required_validations = 2)]
    PublicEntry(PublicEntry),

    // Private entry with higher validation
    #[entry_def(required_validations = 5, visibility = "private")]
    PrivateEntry(PrivateEntry),

    // Entry with custom name
    #[entry_def(name = "custom_entry", required_validations = 3)]
    CustomEntry(CustomEntry),
}
```

**🆕 NEW - Base64 Agent Keys Option**:
For web-compatible applications, consider base64 encoded agent keys:

```rust
#[hdk_entry_helper]
#[derive(Clone, PartialEq)]
pub struct FacilitySpecification {
    pub name: String,
    pub description: String,
    pub created_by: AgentPubKeyB64, // Base64 encoded for web compatibility
    pub is_active: bool,
}
```

### ✅ CORRECT Link Patterns

Use comprehensive link types for discovery:

```rust
#[hdk_link_types]
pub enum LinkTypes {
    // Discovery anchors
    AllFacilitySpecifications,
    AllEconomicFacilities,

    // Hierarchical relationships
    SpecificationToFacility,   // FacilitySpec -> EconomicFacility
    FacilityToBookings,        // EconomicFacility -> FacilityBookings

    // Agent-centric patterns
    AgentToOwnedSpecs,         // Agent -> FacilitySpecs they created
    AgentToManagedFacilities,  // Agent -> EconomicFacilities they manage

    // Type-based discovery
    SpecsByType,               // FacilityType -> FacilitySpecs
    FacilitiesByLocation,      // Location -> EconomicFacilities
    FacilitiesByState,         // FacilityState -> EconomicFacilities
}
```

### Function Naming Conventions

- `create_[entry_type]` - Creates new entries with validation and links
- `get_[entry_type]` - Retrieves single entry by hash
- `get_all_[entry_type]` - Global discovery via anchor links
- `get_my_[entry_type]` - Agent-specific entries only
- `update_[entry_type]` - Updates existing entries with permission checks
- `delete_[entry_type]` - Soft deletes with author validation

### Error Handling Patterns

Define custom error types for each zome:

```rust
#[derive(Debug, thiserror::Error)]
pub enum ZomeError {
    #[error("Entry not found: {0}")]
    EntryNotFound(String),

    #[error("Insufficient capability: {0}")]
    InsufficientCapability(String),

    #[error("Validation failed: {0}")]
    ValidationError(String),
}

impl From<ZomeError> for WasmError {
    fn from(err: ZomeError) -> Self {
        error!(err.to_string())
    }
}
```

### Link Creation Patterns

Use structured link tagging for efficient queries:

```rust
// Discovery anchors
LinkTag::new("facility")
LinkTag::new("category")

// Status-based tags
LinkTag::new("available")
LinkTag::new("occupied")

// Relationship tags
LinkTag::new("created")
LinkTag::new("managed_by")
```

## ValueFlows Integration

### Core Data Structures

Implement standard ValueFlows entities:

- **EconomicResource**: Primary resource entities with state tracking
- **EconomicEvent**: Resource movements and transformations
- **Commitment**: Agreements between agents for future exchanges
- **ResourceSpecification**: Definitions of resource types and properties

### Action Vocabulary

Use standard ValueFlows actions:
- Production: `produce`, `accept`, `modify`
- Distribution: `transfer`, `move`, `deliver_service`
- Consumption: `consume`, `use`, `work`
- Exchange: `transfer-custody`, `certify`, `review`

### Validation Rules

Validate ValueFlows compliance:
- Action types must be from standard vocabulary
- Resource state transitions must follow valid patterns
- Economic events must have valid participants
- Commitments must have proper timing constraints

## Performance Optimization

### WASM Size Management

- Use minimal dependencies and feature flags
- Prefer compact data structures (u8 flags, bit fields)
- Use `wee_alloc` for memory allocation
- Enable LTO (Link-Time Optimization) in release builds

### Query Optimization

- Use targeted link queries with tag filters
- Implement pagination for large result sets
- Batch operations when possible
- Cache frequently accessed cross-zome data

### Memory Management

- Avoid unnecessary clones of large data structures
- Use references instead of owned data where possible
- Implement efficient serialization patterns
- Monitor memory usage in complex operations

## Capability-Based Security

### Role Management

Implement hierarchical capability levels:
- **Viewer (100)**: Read-only access to resources
- **Member (200)**: Basic participation and resource usage
- **Contributor (300)**: Resource modification and contribution
- **Manager (400)**: Resource management and member oversight
- **Admin (500)**: Full administrative access
- **Owner (1000)**: Complete ownership and control

### Access Control Patterns

```rust
// Check capability before operations
if !agent_has_capability(&agent_pubkey, "create_resource") {
    return Err(ZomeError::InsufficientCapability(
        "Agent lacks 'create_resource' capability".to_string()
    ).into());
}

// Store capability grants as entries
let capability = CapabilityEntry {
    agent: target_agent,
    role: "contributor".to_string(),
    capability_level: 300,
    granted_by: agent_pubkey,
    expires_at: Some(expiration_time),
    // ... other fields
};
```

## Cross-Zome Communication

### Integrity Function Calls

Call integrity functions across zomes:

```rust
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

### Remote Agent Calls

Call functions on other agents' zomes:

```rust
let result: ExternResult<ResourceDetails> = call_remote(
    agent_pubkey,
    zome_zome_resource.zome_name,
    "get_resource_details".into(),
    CapSecret::default(),
    resource_hash,
)?;
```

### Data Access Patterns

**✅ CORRECT Cross-Zome Data Access**

Use link queries to find related data, then retrieve entries:

```rust
// Find all resources managed by agent
let links = get_links(agent_pubkey, LinkTypes::AgentToResources, None)?;
let resource_hashes: Vec<ActionHash> = links.iter()
    .map(|link| link.target.clone())
    .collect();

// Retrieve each resource entry
let mut resources = Vec::new();
for hash in resource_hashes {
    if let Some(record) = get(hash, GetOptions::default())? {
        if let Some(entry) = record.entry().as_app_entry() {
            if let EntryTypes::EconomicResource(resource) = entry {
                resources.push(resource);
            }
        }
    }
}
```

**❌ WRONG - Direct Cross-Zome Entry Access**

Never access entries from other zomes directly in your entry fields:

```rust
// WRONG - Never store direct references like this
struct BadResource {
    pub owner: ActionHash,  // SQL-style foreign key!
    pub facility: ActionHash,  // Direct reference!
}

// CORRECT - Use links instead
struct GoodResource {
    pub name: String,
    pub description: String,
    // No direct ActionHash references
}

// Create relationships with links
create_link(resource_hash, owner_hash, LinkTypes::ResourceToOwner, LinkTag::new("owned_by"))?;
create_link(resource_hash, facility_hash, LinkTypes::ResourceToFacility, LinkTag::new("located_at"))?;
```

## Private Data Handling

### PPR (Private Permissioned Requests)

Implement secure private data sharing:

1. **Request Creation**: Agent creates encrypted request with capability requirements
2. **Permission Validation**: Target agent validates capabilities before decryption
3. **Secure Response**: Encrypted response with audit trail
4. **Access Logging**: All access logged for transparency

### Encryption Patterns

Use Holochain's built-in encryption for sensitive data:
- Store encrypted private entries
- Share decryption keys through capability tokens
- Implement access logging and audit trails
- Validate access permissions before decryption

## Development Tools

### Scripts

- `create_zome.sh` - Automated zome creation with proper structure
- `build_wasm.sh` - WASM compilation with optimization and validation
- `validate_entry.sh` - Pattern validation for entry creation
- `sync_integrity_coordinator.sh` - Layer consistency checking
- `package_happ.sh` - hApp packaging and distribution

### Templates

- `assets/zome_template/` - Complete zome structure templates
- `assets/entry_types/` - Common entry type patterns
- `assets/function_templates/` - CRUD and query function templates

### Reference Documentation

- `references/zome_patterns.md` - Core architectural patterns
- `references/valueflows_compliance.md` - ValueFlows implementation guide
- `references/entry_creation_patterns.md` - Detailed entry creation workflows
- `references/performance_patterns.md` - Optimization techniques

## 🆕 Modern Validation Patterns (2025)

### Current Validation Callback Structure

Based on recent Holochain projects, here's the modern validation pattern:

```rust
#[hdk_extern]
pub fn validate(op: Op) -> ExternResult<ValidateCallbackResult> {
    match op {
        Op::StoreRecord(_) => Ok(ValidateCallbackResult::Valid),
        Op::StoreEntry { .. } => Ok(ValidateCallbackResult::Valid),

        Op::RegisterCreateLink(create_link) => {
            let (create, _action) = create_link.create_link.into_inner();
            let link_type = LinkTypes::try_from(ScopedLinkType {
                zome_index: create.zome_index,
                zome_type: create.link_type,
            })?;

            // Link-specific validation logic
            match link_type {
                LinkTypes::AgentToResource => {
                    // Validate agent has permission to create this link
                    Ok(ValidateCallbackResult::Valid)
                }
                LinkTypes::ResourceToSpecification => {
                    // Validate resource exists and specification is valid
                    let _resource: Resource = must_get_entry(create.target_address.clone().into())?.try_into()?;
                    Ok(ValidateCallbackResult::Valid)
                }
                _ => Ok(ValidateCallbackResult::Invalid("Unknown link type".to_string())),
            }
        }

        Op::RegisterDeleteLink(_) => {
            Ok(ValidateCallbackResult::Invalid("Deleting links isn't valid".to_string()))
        }

        Op::RegisterUpdate { .. } => {
            Ok(ValidateCallbackResult::Invalid("Updating entries isn't valid".to_string()))
        }

        Op::RegisterDelete { .. } => {
            Ok(ValidateCallbackResult::Invalid("Deleting entries isn't valid".to_string()))
        }

        Op::RegisterAgentActivity { .. } => Ok(ValidateCallbackResult::Valid),
    }
}
```

### 🆕 Link Tag Validation Pattern

Modern projects use link tags for validation data:

```rust
Op::RegisterCreateLink(create_link) => {
    let link_type = LinkTypes::try_from(ScopedLinkType {
        zome_index: create.zome_index,
        zome_type: create.link_type,
    })?;

    if link_type == LinkTypes::Attestation {
        // Extract agent from link tag and validate against entry
        let agent = AgentPubKey::try_from(
            SerializedBytes::try_from(create.tag.clone())
                .map_err(|e| wasm_error!(e))?
        ).map_err(|e| wasm_error!(e))?;

        let attestation: Attestation = must_get_entry(create.target_address.clone().into())?.try_into()?;

        if AgentPubKey::from(attestation.about) == agent {
            Ok(ValidateCallbackResult::Valid)
        } else {
            Ok(ValidateCallbackResult::Invalid("Tag doesn't point to about".to_string()))
        }
    } else {
        Ok(ValidateCallbackResult::Valid)
    }
}
```

### Modern Error Handling

Use structured error handling with clear messages:

```rust
#[derive(Debug, thiserror::Error)]
pub enum ZomeError {
    #[error("Entry not found: {0}")]
    EntryNotFound(String),

    #[error("Validation failed: {0}")]
    ValidationError(String),

    #[error("Link validation failed: {0}")]
    LinkValidationError(String),

    #[error("Permission denied: {0}")]
    PermissionDenied(String),

    #[error("Serialization error: {0}")]
    SerializationError(#[from] SerializedBytesError),
}

impl From<ZomeError> for WasmError {
    fn from(err: ZomeError) -> Self {
        wasm_error!(WasmErrorInner::Guest(err.to_string()))
    }
}
```

## Quality Assurance

### Validation Checklist

**Critical Pattern Validation**:
- [ ] **No SQL-style foreign keys** in entry fields (use links instead)
- [ ] **No manual timestamps** in entries (use header metadata)
- [ ] **Proper `#[hdk_entry_helper]`** macro usage on all structs
- [ ] **Link-based relationships** for all data associations
- [ ] **Discovery anchor links** created for global data access
- [ ] **Agent-centric links** for ownership and tracking

**Standard Validation**:
- [ ] Entry types follow ValueFlows standards
- [ ] Functions follow naming conventions
- [ ] Error handling implemented with custom types
- [ ] Cross-zome calls properly validated
- [ ] Capability checks implemented for sensitive operations
- [ ] WASM size under target limits
- [ ] Performance optimizations applied

### Testing Integration

While this skill focuses on development, integrate with testing workflows:
- Use foundation tests for basic function validation
- Implement integration tests for cross-zome interactions
- Create scenario tests for complete user workflows
- Validate capability-based access control

## Best Practices

### DO ✅
- **Follow proper Holochain patterns** (no SQL-style foreign keys, no manual timestamps)
- Use `#[hdk_entry_helper]` macro on all entry structs
- Create **link-based relationships** for all data associations
- Follow the 3-zome architecture (person, resource, governance)
- Implement ValueFlows-compliant data structures
- Use capability-based access control
- Create **discovery anchor links** for global data access
- Create **agent-centric links** for ownership tracking
- Get timestamps from action headers when needed
- Validate all input data before entry creation
- Implement proper error handling with custom types
- Optimize WASM size and performance
- Use targeted link queries with filters

### DON'T ❌
- **NEVER use SQL-style foreign keys** in entry fields
- **NEVER add manual timestamps** like `created_at` or `updated_at` to entries
- **NEVER store direct ActionHash references** in entry fields
- Create entries without required metadata fields
- Skip capability validation for sensitive operations
- Use generic error messages without context
- Create monolithic functions that do too much
- Ignore ValueFlows standards for economic data
- Build WASM without optimization flags
- Create cross-zome dependencies without validation
- Store sensitive data without encryption
- Skip validation of agent permissions
- Use inefficient data retrieval patterns

## Resources

### Scripts/
Executable automation scripts for common development tasks:
- `create_zome.sh` - Creates new zomes with integrity/coordinator structure
- `build_wasm.sh` - Compiles Rust code to WASM with optimization
- `validate_entry.sh` - Validates entry creation patterns and conventions
- `sync_integrity_coordinator.sh` - Ensures layer consistency across zomes
- `package_happ.sh` - Packages hApp bundles for distribution

### References/
Comprehensive documentation for development patterns and standards:
- `zome_patterns.md` - Core architectural patterns and conventions
- `valueflows_compliance.md` - ValueFlows implementation guidelines
- `entry_creation_patterns.md` - Detailed entry creation workflows
- `performance_patterns.md` - Optimization techniques and best practices

### Assets/
Code templates and boilerplate for rapid development:
- `zome_template/` - Complete integrity/coordinator zome templates
- `entry_types/` - Common entry type patterns (basic, ValueFlows, capabilities)
- `function_templates/` - CRUD and query function templates

**Note**: This skill is specifically tailored for the nondominium project's ValueFlows-based economic resource sharing architecture and should not be used for generic Holochain development outside this context.