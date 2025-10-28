# Entry Creation Patterns for Nondominium

This document provides detailed patterns and best practices for creating entries in nondominium zomes, ensuring consistency across the codebase and following proper Holochain patterns.

## 🚨 CRITICAL HOLOCHAIN PATTERNS

### ❌ NEVER Use These Patterns
- **NO manual timestamps** in entry fields (`created_at`, `updated_at`)
- **NO SQL-style foreign keys** in entry fields (direct ActionHash references)
- **NO direct cross-entry references** in struct fields

### ✅ ALWAYS Use These Patterns
- **`#[hdk_entry_helper]`** macro on all entry structs
- **Link-based relationships** for all data associations
- **Header metadata** for timestamp extraction
- **Agent-centric data modeling** with ownership links

## Standard Entry Structure

### Base Entry Template

**✅ CORRECT Entry Structure - NO TIMESTAMPS, NO DIRECT REFERENCES**

```rust
#[hdk_entry_helper]
#[derive(Clone, PartialEq)]
pub struct EntryTypeName {
    // Business logic fields ONLY
    pub field_name: FieldType,
    pub optional_field: Option<FieldType>,

    // Agent ownership (NO timestamps!)
    pub created_by: AgentPubKey,
}
```

**❌ WRONG - Contains Forbidden Patterns**

```rust
// WRONG - Never do this!
#[derive(Serialize, Deserialize, Debug, Clone, PartialEq)]
pub struct BadEntryTypeName {
    pub field_name: FieldType,
    pub created_by: AgentPubKey,
    pub created_at: Timestamp,        // ❌ Manual timestamp!
    pub related_entry: ActionHash,    // ❌ Direct reference!
}
```

### Input Structure Pattern

All create functions use dedicated input structs (no agent/timestamp fields):

```rust
#[derive(Serialize, Deserialize, Debug)]
pub struct CreateEntryTypeNameInput {
    pub field_name: FieldType,
    pub optional_field: Option<FieldType>,
}
```

## Complete Creation Function Template

### Standard Create Function

**✅ CORRECT Create Function - NO MANUAL TIMESTAMPS**

```rust
#[hdk_extern]
pub fn create_entry_type_name(input: CreateEntryTypeNameInput) -> ExternResult<Record> {
    // 1. Get agent information
    let agent_pubkey = agent_info()?.agent_initial_pubkey;

    // 2. Validate input data
    input.validate()
        .map_err(|e| EntryError::ValidationFailed(e))?;

    // 3. Check for duplicates if business logic requires
    let existing_links = get_links(
        GetLinksInputBuilder::try_new(agent_pubkey.clone(), LinkTypes::AgentToEntryTypeName)?.build(),
    )?;

    if !existing_links.is_empty() {
        return Err(EntryError::AlreadyExists("Entry already exists for this agent".to_string()).into());
    }

    // 4. Create the entry with NO manual timestamps
    let entry = EntryTypeName {
        field_name: input.field_name,
        optional_field: input.optional_field,
        created_by: agent_pubkey.clone(),  // Agent field, NO timestamp!
    };

    // 5. Create the entry in the DHT
    let entry_hash = create_entry(&EntryTypes::EntryTypeName(entry.clone()))?;

    // 6. Retrieve the created record for return
    let record = get(entry_hash.clone(), GetOptions::default())?.ok_or(
        EntryError::CreationFailed("Failed to retrieve created entry".to_string())
    )?;

    // 7. Create discovery anchor links
    create_discovery_links(&entry_hash, &agent_pubkey)?;

    // 8. Create agent-specific links
    create_agent_links(&entry_hash, &agent_pubkey)?;

    Ok(record)
}

// Helper function for discovery links
fn create_discovery_links(entry_hash: &ActionHash, agent_pubkey: &AgentPubKey) -> ExternResult<()> {
    // Global discovery anchor
    let path = Path::from("entry_type_names");
    create_link(
        path.path_entry_hash()?,
        entry_hash.clone(),
        LinkTypes::EntryTypeAnchor,
        LinkTag::new("entry_type_name")
    )?;

    Ok(())
}

// Helper function for agent links
fn create_agent_links(entry_hash: &ActionHash, agent_pubkey: &AgentPubKey) -> ExternResult<()> {
    // Agent-specific ownership link
    create_link(
        agent_pubkey.clone(),
        entry_hash.clone(),
        LinkTypes::AgentToEntryTypeName,
        LinkTag::new("created")
    )?;

    Ok(())
}
```

## Link-Based Relationship Patterns

### 🎯 CRITICAL: Links Replace Foreign Keys

**✅ CORRECT - Use Links for Relationships**

```rust
// Entry structs have NO direct references to other entries
#[hdk_entry_helper]
#[derive(Clone, PartialEq)]
pub struct Resource {
    pub name: String,
    pub description: String,
    pub created_by: AgentPubKey,
    // NO facility: ActionHash field!
}

// Create relationships with LINKS, not fields
create_link(resource_hash, facility_hash, LinkTypes::ResourceToFacility, LinkTag::new("located_at"))?;
```

**❌ WRONG - SQL-style Foreign Keys**

```rust
// WRONG - Never store direct references like this
pub struct BadResource {
    pub name: String,
    pub facility: ActionHash,  // ❌ SQL-style foreign key!
    pub owner: ActionHash,     // ❌ Direct reference!
}
```

### Standard Link Types

```rust
#[hdk_link_types]
pub enum LinkTypes {
    // Discovery anchors (global access)
    EntryTypeAnchor,
    AllEntryTypes,

    // Agent relationships (ownership tracking)
    AgentToEntryTypeName,
    EntryTypeToAgent,

    // Business relationships (data associations)
    EntryTypeToRelatedType,
    RelatedTypeToEntryTypeName,

    // Hierarchical relationships
    ParentToChild,
    ChildToParent,

    // Type-based discovery
    EntriesByCategory,
    EntriesByStatus,
}
```

### Link Tag Patterns

Use structured link tags for efficient querying:

```rust
// Status-based tags
LinkTag::new("active")
LinkTag::new("archived")
LinkTag::new("pending")

// Relationship-based tags
LinkTag::new("owned_by")
LinkTag::new("managed_by")
LinkTag::new("member_of")

// Type-based tags
LinkTag::new("created")
LinkTag::new("updated")
LinkTag::new("referenced")

// Hierarchical tags
LinkTag::new("parent")
LinkTag::new("child")
LinkTag::new("sibling")
```

### Link Creation Examples

**✅ CORRECT - Link-Based Relationships**

```rust
// Create bidirectional relationships
create_link(
    entry_a_hash,
    entry_b_hash,
    LinkTypes::EntryTypeToRelatedType,
    LinkTag::new("related_to")
)?;

create_link(
    entry_b_hash,
    entry_a_hash,
    LinkTypes::RelatedTypeToEntryTypeName,
    LinkTag::new("related_from")
)?;

// Create ownership relationships
create_link(
    agent_pubkey,
    entry_hash,
    LinkTypes::AgentToEntryTypeName,
    LinkTag::new("created")
)?;

// Create categorical relationships
create_link(
    category_hash,
    entry_hash,
    LinkTypes::EntriesByCategory,
    LinkTag::new("categorized_as")
)?;
```

// Create categorized links
create_link(
    category_hash,
    entry_hash,
    LinkTypes::CategoryToEntry,
    LinkTag::new(format!("category_{}", category_id))
)?;
```

## Timestamp Extraction Patterns

### 🎯 CRITICAL: Get Timestamps from Headers, Not Entry Fields

**✅ CORRECT - Extract Timestamps from Action Headers**

```rust
// Get timestamp from action header when needed
fn get_entry_timestamp(entry_hash: &ActionHash) -> ExternResult<Timestamp> {
    let record = get(entry_hash.clone(), GetOptions::default())?
        .ok_or(EntryError::NotFound("Entry not found".to_string()))?;

    let action = record.action().as_create()
        .ok_or(EntryError::InvalidAction("Not a create action".to_string()))?;

    Ok(action.timestamp())
}

// Usage in query functions
#[hdk_extern]
pub fn get_entry_with_timestamp(entry_hash: ActionHash) -> ExternResult<EntryWithTimestamp> {
    let record = get(entry_hash.clone(), GetOptions::default())?
        .ok_or(EntryError::NotFound("Entry not found".to_string()))?;

    let entry: EntryTypeName = record.entry().to_app_entry()?.try_into()?;
    let timestamp = get_entry_timestamp(&entry_hash)?;

    Ok(EntryWithTimestamp {
        entry,
        created_at: timestamp,  // Timestamp from header, not entry field
    })
}

#[derive(Serialize, Deserialize, Debug)]
pub struct EntryWithTimestamp {
    pub entry: EntryTypeName,
    pub created_at: Timestamp,  // Response struct can have timestamp
}
```

**❌ WRONG - Manual Timestamps in Entries**

```rust
// WRONG - Never store timestamps in entries
pub struct BadEntry {
    pub name: String,
    pub created_at: Timestamp,  // ❌ Manual timestamp!
    pub updated_at: Timestamp,  // ❌ Manual timestamp!
}
```

## Update Patterns

### Standard Update Function

```rust
#[hdk_extern]
pub fn update_entry_type_name(input: UpdateEntryTypeNameInput) -> ExternResult<Record> {
    // 1. Validate original entry exists
    let original_record = get(input.original_action_hash.clone(), GetOptions::default())?
        .ok_or(EntryError::NotFound("Original entry not found".to_string()))?;

    // 2. Check author permissions
    let original_entry = original_record.entry().to_app_entry()?;
    let original_entry_type: EntryTypeName = original_entry.try_into()?;

    if original_entry_type.agent_pub_key != agent_info()?.agent_initial_pubkey {
        return Err(EntryError::NotAuthor.into());
    }

    // 3. Create updated entry with new fields but same metadata
    let updated_entry = EntryTypeName {
        field_name: input.field_name,
        optional_field: input.optional_field,
        agent_pub_key: original_entry_type.agent_pub_key,  // Preserve original
        created_at: original_entry_type.created_at,        // Preserve original
    };

    // 4. Update the entry
    let updated_hash = update_entry(input.original_action_hash, &updated_entry)?;

    // 5. Retrieve and return the updated record
    get(updated_hash, GetOptions::default())?
        .ok_or(EntryError::UpdateFailed("Failed to retrieve updated entry".to_string()).into())
}

#[derive(Serialize, Deserialize, Debug)]
pub struct UpdateEntryTypeNameInput {
    pub original_action_hash: ActionHash,
    pub field_name: FieldType,
    pub optional_field: Option<FieldType>,
}
```

## Retrieval Patterns

### Get by Hash

```rust
#[hdk_extern]
pub fn get_entry_type_name(entry_hash: ActionHash) -> ExternResult<Option<Record>> {
    get(entry_hash, GetOptions::default())
}
```

### Get All by Agent

```rust
#[hdk_extern]
pub fn get_all_my_entry_type_names() -> ExternResult<Vec<Record>> {
    let agent_pubkey = agent_info()?.agent_initial_pubkey;

    let links = get_links(
        GetLinksInputBuilder::try_new(agent_pubkey, LinkTypes::AgentToEntryTypeName)?.build(),
    )?;

    let records = links.iter()
        .map(|link| get(link.target.clone(), GetOptions::default()))
        .filter_map(Result::ok)
        .flatten()
        .collect();

    Ok(records)
}
```

### Get All Global

```rust
#[hdk_extern]
pub fn get_all_entry_type_names() -> ExternResult<Vec<Record>> {
    let path = Path::from("entry_type_names");
    let links = get_links(
        GetLinksInputBuilder::try_new(path.path_entry_hash()?, LinkTypes::EntryTypeAnchor)?.build(),
    )?;

    let records = links.iter()
        .map(|link| get(link.target.clone(), GetOptions::default()))
        .filter_map(Result::ok)
        .flatten()
        .collect();

    Ok(records)
}
```

## Delete Patterns

### Soft Delete Pattern

```rust
#[hdk_extern]
pub fn delete_entry_type_name(entry_hash: ActionHash) -> ExternResult<ActionHash> {
    // 1. Get the original record to check permissions
    let original_record = get(entry_hash.clone(), GetOptions::default())?
        .ok_or(EntryError::NotFound("Entry not found".to_string()))?;

    let original_entry = original_record.entry().to_app_entry()?;
    let original_entry_type: EntryTypeName = original_entry.try_into()?;

    // 2. Check if the caller is the original author
    if original_entry_type.agent_pub_key != agent_info()?.agent_initial_pubkey {
        return Err(EntryError::NotAuthor.into());
    }

    // 3. Perform the delete
    delete_entry(entry_hash)
}
```

## Validation Patterns

### Input Validation

```rust
impl CreateEntryTypeNameInput {
    pub fn validate(&self) -> Result<(), String> {
        // Validate required fields
        if self.field_name.is_empty() {
            return Err("field_name cannot be empty".to_string());
        }

        // Validate field formats
        if let Some(ref optional_field) = self.optional_field {
            if optional_field.len() > 1000 {
                return Err("optional_field too long (max 1000 characters)".to_string());
            }
        }

        Ok(())
    }
}
```

### Business Logic Validation

```rust
pub fn validate_business_rules(entry: &EntryTypeName) -> Result<(), String> {
    // Check business constraints
    if is_duplicate_business_identifier(&entry.field_name) {
        return Err("Business identifier already exists".to_string());
    }

    // Validate agent permissions
    if !agent_has_required_capability(&entry.agent_pub_key, "create_entry") {
        return Err("Agent lacks required capability".to_string());
    }

    Ok(())
}
```

## Error Handling Patterns

### Custom Error Types

```rust
#[derive(Debug, thiserror::Error)]
pub enum EntryError {
    #[error("Entry not found: {0}")]
    NotFound(String),

    #[error("Entry already exists: {0}")]
    AlreadyExists(String),

    #[error("Not the author of this entry")]
    NotAuthor,

    #[error("Validation failed: {0}")]
    ValidationFailed(String),

    #[error("Creation failed: {0}")]
    CreationFailed(String),

    #[error("Update failed: {0}")]
    UpdateFailed(String),

    #[error("Serialization error: {0}")]
    SerializationError(String),

    #[error("Invalid input: {0}")]
    InvalidInput(String),
}

impl From<EntryError> for WasmError {
    fn from(err: EntryError) -> Self {
        wasm_error!(WasmErrorInner::Guest(err.to_string()))
    }
}
```

## Performance Patterns

### Efficient Link Queries

```rust
// Use targeted link queries
pub fn get_active_entries_for_agent(agent: AgentPubKey) -> ExternResult<Vec<Record>> {
    let links = get_links(
        GetLinksInputBuilder::try_new(agent, LinkTypes::AgentToEntryTypeName)?
            .link_tag(LinkTag::new("active"))
            .build(),
    )?;

    // Batch get operations
    let entry_hashes: Vec<ActionHash> = links.iter()
        .map(|link| link.target.clone())
        .collect();

    get_details(entry_hashes, GetOptions::default())?
        .into_iter()
        .filter_map(|detail| detail.record().cloned())
        .collect::<Vec<_>>()
        .into()
}
```

### Pagination for Large Result Sets

```rust
#[derive(Serialize, Deserialize, Debug)]
pub struct PaginatedResult<T> {
    pub items: Vec<T>,
    pub total_count: u32,
    pub page: u32,
    pub page_size: u32,
}

#[hdk_extern]
pub fn get_entry_type_names_paginated(input: PaginationInput) -> ExternResult<PaginatedResult<Record>> {
    let path = Path::from("entry_type_names");
    let links = get_links(
        GetLinksInputBuilder::try_new(path.path_entry_hash()?, LinkTypes::EntryTypeAnchor)?.build(),
    )?;

    let total_count = links.len() as u32;
    let start_index = (input.page * input.page_size) as usize;
    let end_index = start_index + (input.page_size as usize);

    let paginated_links = links.iter()
        .skip(start_index)
        .take(end_index - start_index);

    let items = paginated_links
        .map(|link| get(link.target.clone(), GetOptions::default()))
        .filter_map(Result::ok)
        .flatten()
        .collect();

    Ok(PaginatedResult {
        items,
        total_count,
        page: input.page,
        page_size: input.page_size,
    })
}

#[derive(Serialize, Deserialize, Debug)]
pub struct PaginationInput {
    pub page: u32,
    pub page_size: u32,
}
```

## Testing Patterns

### Unit Test Templates

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_entry_creation() {
        let input = CreateEntryTypeNameInput {
            field_name: "test_value".to_string(),
            optional_field: Some("optional_value".to_string()),
        };

        assert!(input.validate().is_ok());
    }

    #[test]
    fn test_invalid_input() {
        let input = CreateEntryTypeNameInput {
            field_name: "".to_string(),  // Invalid: empty
            optional_field: None,
        };

        assert!(input.validate().is_err());
    }

    #[test]
    fn test_business_logic_validation() {
        let entry = EntryTypeName {
            field_name: "test".to_string(),
            optional_field: None,
            agent_pub_key: AgentPubKey::from_raw_bytes([0; 32]),
            created_at: Timestamp::now(),
        };

        // Test business rules
        assert!(validate_business_rules(&entry).is_ok());
    }
}
```

## Integration with Other Zomes

### Cross-Zome Entry References

```rust
// In zome_person, create link to resource
pub fn link_agent_to_resource(agent: AgentPubKey, resource_hash: ActionHash) -> ExternResult<()> {
    create_link(
        agent,
        resource_hash,
        LinkTypes::AgentToResource,
        LinkTag::new("owns")
    )
}

// In zome_resource, create backlink to agent
pub fn link_resource_to_agent(resource_hash: ActionHash, agent: AgentPubKey) -> ExternResult<()> {
    create_link(
        resource_hash,
        agent,
        LinkTypes::ResourceToAgent,
        LinkTag::new("owned_by")
    )
}
```

## Common Patterns Cheat Sheet

### 🚨 CRITICAL HOLOCHAIN PATTERNS QUICK REFERENCE

**✅ ALWAYS DO These:**

```rust
// 1. Use #[hdk_entry_helper] macro on ALL entry structs
#[hdk_entry_helper]
#[derive(Clone, PartialEq)]
pub struct EntryType {
    pub name: String,
    pub created_by: AgentPubKey,  // Agent field, NO timestamp!
}

// 2. Get agent
let agent_pubkey = agent_info()?.agent_initial_pubkey;

// 3. Create entry (NO manual timestamps)
let entry = EntryType {
    name: input.name,
    created_by: agent_pubkey.clone(),
};

// 4. Create entry in DHT
let entry_hash = create_entry(&EntryTypes::EntryType(entry))?;

// 5. Create discovery anchor link
let path = Path::from("entry_types");
create_link(path.path_entry_hash()?, entry_hash, LinkTypes::EntryTypeAnchor, LinkTag::new("entry"))?;

// 6. Create agent ownership link
create_link(agent_pubkey, entry_hash, LinkTypes::AgentToEntryType, LinkTag::new("created"))?;

// 7. Get timestamp from HEADER when needed (not from entry!)
let record = get(entry_hash, GetOptions::default())?;
let timestamp = record.action().as_create()?.timestamp();

// 8. Create relationships with LINKS, not fields
create_link(entry_a_hash, entry_b_hash, LinkTypes::EntryToRelated, LinkTag::new("related_to"))?;
```

**❌ NEVER DO These:**

```rust
// WRONG - Never store timestamps in entries
pub struct BadEntry {
    pub name: String,
    pub created_at: Timestamp,     // ❌ Manual timestamp!
    pub updated_at: Timestamp,     // ❌ Manual timestamp!
}

// WRONG - Never store direct references in entries
pub struct BadResource {
    pub name: String,
    pub facility: ActionHash,      // ❌ SQL-style foreign key!
    pub owner: ActionHash,         // ❌ Direct reference!
}

// WRONG - Never use sys_time() for entry fields
let entry = BadEntry {
    name: "test".to_string(),
    created_at: sys_time()?,      // ❌ Manual timestamp!
};
```

### Link Query Patterns

```rust
// Query by agent ownership
let agent_links = get_links(
    GetLinksInputBuilder::try_new(agent_pubkey, LinkTypes::AgentToEntryType)?.build()
)?;

// Query by global anchor
let anchor_links = get_links(
    GetLinksInputBuilder::try_new(anchor_path, LinkTypes::EntryTypeAnchor)?.build()
)?;

// Query with tag filters
let filtered_links = get_links(
    GetLinksInputBuilder::try_new(base, LinkTypes::EntryType)?
        .link_tag(LinkTag::new("active"))
        .build()
)?;
```

## 🆕 Latest Holochain Patterns (2025)

### Modern Entry Definition with Validation

Based on current Holochain projects, include validation requirements:

```rust
#[hdk_entry_types]
#[unit_enum(UnitEntryTypes)]
pub enum EntryTypes {
    // Standard public entry
    #[entry_def(required_validations = 2)]
    PublicEntry(PublicEntry),

    // Private entry with higher validation
    #[entry_def(required_validations = 5, visibility = "private")]
    PrivateEntry(PrivateEntry),

    // Custom named entry
    #[entry_def(name = "custom_entry", required_validations = 3)]
    CustomEntry(CustomEntry),
}
```

### Modern Validation Callback Structure

Current validation pattern from active projects:

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

            match link_type {
                LinkTypes::AgentToEntry => Ok(ValidateCallbackResult::Valid),
                LinkTypes::EntryToSpecification => {
                    // Validate target entry exists
                    let _target = must_get_entry(create.target_address.clone().into())?;
                    Ok(ValidateCallbackResult::Valid)
                }
                _ => Ok(ValidateCallbackResult::Invalid("Invalid link type".to_string())),
            }
        }

        // Modern patterns often restrict updates/deletes
        Op::RegisterUpdate { .. } => {
            Ok(ValidateCallbackResult::Invalid("Updates not allowed".to_string()))
        }
        Op::RegisterDelete { .. } => {
            Ok(ValidateCallbackResult::Invalid("Deletes not allowed".to_string()))
        }
        Op::RegisterDeleteLink(_) => {
            Ok(ValidateCallbackResult::Invalid("Link deletion not allowed".to_string()))
        }

        Op::RegisterAgentActivity { .. } => Ok(ValidateCallbackResult::Valid),
    }
}
```

### Link Tag Validation Pattern

Use link tags to embed validation data:

```rust
// Create link with validation data in tag
create_link(
    agent_pubkey,
    entry_hash,
    LinkTypes::Attestation,
    LinkTag::new(SerializedBytes::try_from(target_agent)?)
)?;

// Validate link tag matches entry data
if link_type == LinkTypes::Attestation {
    let tag_agent: AgentPubKey = AgentPubKey::try_from(
        SerializedBytes::try_from(create.tag)?
    )?;

    let entry: Attestation = must_get_entry(create.target_address.clone().into())?.try_into()?;

    if AgentPubKey::from(entry.about) == tag_agent {
        Ok(ValidateCallbackResult::Valid)
    } else {
        Ok(ValidateCallbackResult::Invalid("Tag mismatch".to_string()))
    }
}
```

### Modern Error Handling

Use thiserror for better error management:

```rust
#[derive(Debug, thiserror::Error)]
pub enum ZomeError {
    #[error("Entry not found: {0}")]
    EntryNotFound(String),

    #[error("Validation failed: {0}")]
    ValidationError(String),

    #[error("Permission denied: {0}")]
    PermissionDenied(String),

    #[error("Serialization error: {0}")]
    SerializationError(#[from] SerializedBytesError),

    #[error("Link validation failed: {0}")]
    LinkValidationError(String),
}

impl From<ZomeError> for WasmError {
    fn from(err: ZomeError) -> Self {
        wasm_error!(WasmErrorInner::Guest(err.to_string()))
    }
}
```