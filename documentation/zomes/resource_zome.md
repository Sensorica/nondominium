# Resource Zome (`zome_resource`) Documentation

The Resource zome implements ValueFlows-compliant resource management with embedded governance, state tracking, and efficient discovery patterns for the Nondominium Holochain application.

## Core Data Structures

### ResourceSpecification Entry
```rust
pub struct ResourceSpecification {
    pub name: String,                     // Resource specification name
    pub description: String,              // Detailed description
    pub category: String,                 // Category for efficient queries
    pub image_url: Option<String>,        // Optional resource image
    pub tags: Vec<String>,               // Flexible discovery tags
    pub governance_rules: Vec<ActionHash>, // Embedded governance
    pub created_by: AgentPubKey,         // Creator agent
    pub created_at: Timestamp,           // Creation timestamp
    pub is_active: bool,                 // Active/inactive filter
}
```
**ValueFlows**: Compliant with resource specification standards
**Governance**: Embedded rules for access and usage control
**Discovery**: Category and tag-based efficient queries

### EconomicResource Entry
```rust
pub struct EconomicResource {
    pub conforms_to: ActionHash,    // Link to ResourceSpecification
    pub quantity: f64,              // Resource quantity
    pub unit: String,              // Unit of measurement
    pub custodian: AgentPubKey,    // Primary Accountable Agent
    pub created_by: AgentPubKey,   // Resource creator
    pub created_at: Timestamp,     // Creation timestamp
    pub current_location: Option<String>, // Physical/virtual location
    pub state: ResourceState,      // Current resource state
}
```
**ValueFlows**: Compliant economic resource implementation
**Custody**: Clear custodianship with Primary Accountable Agent pattern
**State Management**: Comprehensive resource lifecycle tracking

### ResourceState Enum
```rust
pub enum ResourceState {
    PendingValidation,  // Awaiting community validation
    Active,            // Available for use/transfer
    Maintenance,       // Under maintenance
    Retired,          // No longer active
    Reserved,         // Reserved for specific use
}
```
**Lifecycle**: Complete resource state management
**Governance**: State transitions can be governed by rules

### GovernanceRule Entry
```rust
pub struct GovernanceRule {
    pub rule_type: String,           // Rule category (access, usage, transfer)
    pub rule_data: String,          // JSON-encoded rule parameters  
    pub enforced_by: Option<String>, // Role required for enforcement
    pub created_by: AgentPubKey,    // Rule creator
    pub created_at: Timestamp,      // Creation timestamp
}
```
**Flexibility**: JSON-encoded parameters for complex rule logic
**Enforcement**: Role-based rule enforcement delegation
**Governance**: Community-driven rule creation and management

## API Functions

### Resource Specification Management

#### `create_resource_specification(input: ResourceSpecificationInput) -> ExternResult<CreateResourceSpecificationOutput>`
Creates a new resource specification with embedded governance rules.

**Input**:
```rust
pub struct ResourceSpecificationInput {
    pub name: String,
    pub description: String,
    pub category: String,
    pub image_url: Option<String>,
    pub tags: Vec<String>,
    pub governance_rules: Vec<GovernanceRuleInput>,
}
```

**Business Logic**:
- Validates input completeness and format
- Creates all governance rules first
- Links governance rules to specification
- Creates comprehensive discovery links

**Discovery Links Created**:
- Global discovery: `resource_specifications anchor -> spec_hash`
- Category discovery: `specs_by_category_{category} -> spec_hash`
- Tag discovery: `specs_by_tag_{tag} -> spec_hash`
- Agent ownership: `agent_pubkey -> spec_hash`

#### `update_resource_specification(input: UpdateResourceSpecificationInput) -> ExternResult<Record>`
Updates a resource specification with versioning support.

**Authorization**: Only the original creator can update
**Governance**: Phase 2 will add governance-based update validation
**Versioning**: Maintains update history via links

#### `get_latest_resource_specification(original_action_hash: ActionHash) -> ExternResult<ResourceSpecification>`
Retrieves the latest version of a resource specification.

**Pattern**: Follows `ResourceSpecificationUpdates` link chain
**Performance**: Timestamp-based latest version selection

#### `get_all_resource_specifications() -> ExternResult<GetAllResourceSpecificationsOutput>`
Discovers all resource specifications in the network.

**Discovery Pattern**: Queries global `resource_specifications` anchor
**Performance**: Efficient bulk retrieval with filtering

#### `get_resource_specification_with_rules(spec_hash: ActionHash) -> ExternResult<GetResourceSpecWithRulesOutput>`
Gets a complete resource specification with all its governance rules.

**Output**:
```rust
pub struct GetResourceSpecWithRulesOutput {
    pub spec: ResourceSpecification,
    pub governance_rules: Vec<GovernanceRule>,
}
```

**Performance**: Single query for complete specification context

#### Query Functions
- `get_resource_specifications_by_category(category: String) -> ExternResult<Vec<Record>>`
- `get_resource_specifications_by_tag(tag: String) -> ExternResult<Vec<Record>>`
- `get_my_resource_specifications() -> ExternResult<Vec<Link>>`

**Pattern**: Efficient discovery via pre-computed anchor paths
**Performance**: Category and tag-based filtering without full table scans

### Economic Resource Management

#### `create_economic_resource(input: EconomicResourceInput) -> ExternResult<Record>`
Creates a new economic resource instance conforming to a specification.

**ValueFlows Compliance**: Links to ResourceSpecification via `conforms_to`
**Custody Model**: Establishes clear custodianship with Primary Accountable Agent
**State Management**: Initializes with appropriate ResourceState

#### Resource Discovery Patterns
- **By Specification**: `specification_hash -> resource_instances`
- **By Custodian**: `agent_pubkey -> custodied_resources`
- **By Location**: `location -> resources_at_location`
- **By State**: `resource_state -> resources_in_state`

**Performance**: Multi-dimensional efficient queries without scanning

### Governance Rule Management

#### `create_governance_rule(input: GovernanceRuleInput) -> ExternResult<Record>`
Creates standalone governance rules for community use.

**Flexibility**: JSON-encoded rule parameters for complex logic
**Enforcement**: Role-based enforcement delegation
**Discovery**: Rule type-based categorization

#### Rule Query Functions
- `get_governance_rules_by_type(rule_type: String) -> ExternResult<Vec<Record>>`
- `get_my_governance_rules() -> ExternResult<Vec<Link>>`

## Link Architecture

### Discovery Links
- **AllResourceSpecifications**: Global resource spec discovery
- **AllEconomicResources**: Global economic resource discovery
- **AllGovernanceRules**: Global governance rule discovery

### Hierarchical Links
- **SpecificationToResource**: `spec_hash -> resource_instances`
- **SpecificationToGovernanceRule**: `spec_hash -> governance_rules`

### Agent-Centric Links
- **AgentToOwnedSpecs**: `agent -> created_specifications`
- **CustodianToResource**: `agent -> custodied_resources`
- **AgentToOwnedRules**: `agent -> created_rules`

### Category/Tag Links
- **SpecsByCategory**: `category_anchor -> specifications`
- **ResourcesByLocation**: `location_anchor -> resources`
- **ResourcesByState**: `state_anchor -> resources`
- **RulesByType**: `rule_type_anchor -> rules`

### Versioning Links
- **ResourceSpecificationUpdates**: Version history tracking
- **EconomicResourceUpdates**: Resource modification history
- **GovernanceRuleUpdates**: Rule evolution tracking

## Error Handling

### ResourceError Types
```rust
pub enum ResourceError {
    ResourceSpecNotFound(String),     // Specification lookup failures
    EconomicResourceNotFound(String), // Resource lookup failures
    GovernanceRuleNotFound(String),   // Rule lookup failures
    NotAuthor,                       // Authorization failures
    NotCustodian,                    // Custodian authorization failures
    SerializationError(String),      // Data serialization issues
    EntryOperationFailed(String),    // DHT operation failures
    LinkOperationFailed(String),     // Link operation failures
    InvalidInput(String),            // Input validation failures
    GovernanceViolation(String),     // Governance rule violations
}
```

## Validation Rules

### ResourceSpecification Validation
- Name required (1-100 characters)
- Description required
- Creator must match action author
- Image URL format validation (if provided)

### EconomicResource Validation
- Quantity must be positive
- Unit cannot be empty
- Creator must match action author
- Valid ResourceState required

### GovernanceRule Validation
- Rule type cannot be empty
- Rule data cannot be empty (JSON validation in Phase 2)
- Creator must match action author

## Signal Architecture

### Resource Zome Signals
```rust
pub enum Signal {
    EntryCreated { action, app_entry },
    EntryUpdated { action, app_entry, original_app_entry },
    EntryDeleted { action, original_app_entry },
    LinkCreated { action, link_type },
    LinkDeleted { action, link_type },
}
```

**Real-time Updates**: Enables UI reactivity to resource changes
**Integration**: Supports cross-zome event coordination

## Discovery Performance

### Anchor Path Strategy
- **Categorized Discovery**: O(1) lookup by category/tag
- **Agent-Centric Queries**: Direct agent -> owned resources links
- **Versioning**: Efficient latest version resolution
- **Bulk Operations**: Optimized for large result sets

### Link Tag Optimization
```rust
// Category-based discovery with tag metadata
create_link(
    category_path.path_entry_hash()?,
    spec_hash.clone(),
    LinkTypes::SpecsByCategory,
    LinkTag::new(category_name.as_str()),
)?;
```

**Performance**: Link tags enable efficient filtering without record retrieval

## Integration with Person Zome

### Authorization Checks
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

### Role-Based Access Control
```rust
// Check if agent has required role for operation
let has_capability = has_person_role_capability((agent_pubkey, "Resource Coordinator".to_string()))?;
if !has_capability {
    return Err(ResourceError::GovernanceViolation("Resource Coordinator role required".to_string()));
}
```

## ValueFlows Compliance

### Economic Resource Model
- **Conforms To**: Clear specification conformance via `conforms_to` field
- **Primary Accountable Agent**: Custodian field establishes resource accountability
- **Quantity Tracking**: Numeric quantity with unit for precise resource measurement
- **State Management**: Comprehensive lifecycle state tracking
- **Location Awareness**: Physical and virtual location tracking

### Resource Specification Pattern
- **Categorization**: Efficient resource type organization
- **Governance Embedding**: Rules embedded within specifications
- **Tag-based Discovery**: Flexible resource finding mechanisms
- **Agent Attribution**: Clear creator and ownership tracking

## Phase 2 Implementation Status

### Currently Implemented (Phase 1)
- ✅ Complete data structures with ValueFlows compliance
- ✅ Resource specification CRUD operations
- ✅ Governance rule creation and linking
- ✅ Comprehensive discovery patterns
- ✅ Agent-centric ownership tracking
- ✅ Signal architecture for real-time updates
- ✅ Validation and error handling

### Planned (Phase 2)
- Economic resource lifecycle management
- Resource custody transfer workflows
- Governance rule enforcement logic
- Resource state transition validation
- Integration with governance zome
- Resource booking and reservation system

### Phase 3 (Future)
- Resource booking and reservation system
- Economic event tracking (ValueFlows events)
- Advanced governance workflows
- Community resource sharing protocols
- Resource availability calendaring
- Multi-agent resource coordination

## Development Patterns

### Entry Creation Pattern
```rust
// All resource entries follow this pattern
let entry = ResourceSpecification {
    name: input.name,
    description: input.description,
    // ... other fields
    created_by: agent_info.agent_initial_pubkey,
    created_at: sys_time()?,
};
let hash = create_entry(&EntryTypes::ResourceSpecification(entry))?;

// Create discovery anchor links
create_link(path.path_entry_hash()?, hash.clone(), LinkTypes::AllResourceSpecifications, ())?;
```

### Versioning Pattern
```rust
// Update pattern with version tracking
let updated_entry = update_entry(input.previous_action_hash, &updated_resource)?;
create_link(
    input.original_action_hash,
    updated_entry.clone(),
    LinkTypes::ResourceSpecificationUpdates,
    (),
)?;
```

### Discovery Pattern
```rust
// Efficient discovery via anchor paths
let path = Path::from(format!("specs_by_category_{}", category));
let links = get_links(
    GetLinksInputBuilder::try_new(path.path_entry_hash()?, LinkTypes::SpecsByCategory)?.build(),
)?;
```

The Resource zome provides a comprehensive, ValueFlows-compliant foundation for resource management with embedded governance, efficient discovery patterns, and seamless integration with the Nondominium identity and access control system.