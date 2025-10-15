# Resource Zome Implementation Guide

## Overview
This document describes the **actual implemented** Resource zome functionality in the nondominium project.

**File Location**: `/dnas/nondominium/zomes/coordinator/zome_resource/`

## Implemented Modules

### 1. Resource Specification Management (`resource_specification.rs`)

#### Core Functions

**`create_resource_specification(input: CreateResourceSpecificationInput) -> ExternResult<ActionHash>`**
- **Purpose**: Create a new resource specification template
- **Input**: Name, description, optional image, governance rules
- **Process**: Creates ResourceSpecification with embedded governance
- **Validation**: Requires appropriate agent capabilities
- **Returns**: ActionHash of the created specification

**`update_resource_specification(input: UpdateResourceSpecificationInput) -> ExternResult<Record>`**
- **Purpose**: Update an existing resource specification
- **Process**: Modifies specification while maintaining governance rules
- **Validation**: Only the specification creator can update
- **Returns**: Updated specification record

**`get_resource_specification(spec_hash: ActionHash) -> ExternResult<Option<Record>>`**
- **Purpose**: Retrieve a resource specification by hash
- **Access**: Public access for discovery
- **Returns**: ResourceSpecification record or None

**`get_all_resource_specifications() -> ExternResult<Vec<Record>>`**
- **Purpose**: Discover all available resource specifications
- **Used by**: UI for resource browsing and discovery
- **Returns**: All resource specification records

### 2. Economic Resource Management (`economic_resource.rs`)

#### Core Functions

**`create_economic_resource(input: CreateEconomicResourceInput) -> ExternResult<ActionHash>`**
- **Purpose**: Create a concrete instance of a resource
- **Input**: Specification hash, quantity, unit, optional location
- **Process**: Creates EconomicResource linked to specification
- **Validation**: Checks agent capabilities and specification validity
- **Returns**: ActionHash of the created resource

**`update_economic_resource(input: UpdateEconomicResourceInput) -> ExternResult<Record>`**
- **Purpose**: Update an existing economic resource
- **Fields**: Quantity, location, state, notes
- **Validation**: Only current custodian can update
- **Returns**: Updated resource record

**`transfer_custody(input: TransferCustodyInput) -> ExternResult<Record>`**
- **Purpose**: Transfer resource custody to another agent
- **Process**: Updates custodian field and creates audit trail
- **Integration**: Creates EconomicEvent and generates PPRs
- **Validation**: Validates against governance rules
- **Returns**: Updated resource record

**`get_economic_resource(resource_hash: ActionHash) -> ExternResult<Option<Record>>`**
- **Purpose**: Retrieve a specific economic resource
- **Returns**: EconomicResource record or None

**`get_my_economic_resources() -> ExternResult<Vec<Record>>`**
- **Purpose**: Get all resources where calling agent is custodian
- **Used by**: UI for resource management
- **Returns**: List of owned economic resources

**`get_resources_by_specification(spec_hash: ActionHash) -> ExternResult<Vec<Record>>`**
- **Purpose**: Find all resources conforming to a specification
- **Used by**: Resource discovery and filtering
- **Returns**: List of economic resources

### 3. Governance Rules Management (`governance_rule.rs`)

#### Core Functions

**`create_governance_rule(input: CreateGovernanceRuleInput) -> ExternResult<ActionHash>`**
- **Purpose**: Create a governance rule for resource access
- **Types**: Access requirements, usage limits, transfer conditions
- **Process**: Creates rule with enforcement parameters
- **Returns**: ActionHash of the created rule

**`validate_governance_rules(input: ValidateGovernanceRulesInput) -> ExternResult<ValidationResult>`**
- **Purpose**: Validate an action against resource governance rules
- **Process**: Checks all applicable rules for the resource
- **Integration**: Used by other zomes for access control
- **Returns**: ValidationResult with details

**`get_governance_rules(resource_hash: ActionHash) -> ExternResult<Vec<Record>>`**
- **Purpose**: Retrieve all governance rules for a resource
- **Used by**: Validation and access control systems
- **Returns**: List of applicable governance rules

## Data Structures

### Resource Specification
```rust
pub struct ResourceSpecification {
    pub name: String,
    pub description: String,
    pub image_url: Option<String>,
    pub governance_rules: Vec<GovernanceRule>,
    pub created_by: AgentPubKey,
    pub created_at: Timestamp,
    pub updated_at: Timestamp,
}
```

### Economic Resource
```rust
pub struct EconomicResource {
    pub conforms_to: ActionHash,        // Link to ResourceSpecification
    pub quantity: f64,
    pub unit: String,
    pub custodian: AgentPubKey,          // Current custodian
    pub location: Option<String>,
    pub state: ResourceState,
    pub created_at: Timestamp,
    pub updated_at: Timestamp,
    pub notes: Option<String>,
}
```

### Governance Rule
```rust
pub struct GovernanceRule {
    pub rule_type: GovernanceRuleType,
    pub rule_data: String,              // JSON-encoded rule parameters
    pub enforced_by: Option<Role>,      // Role required to enforce
    pub conditions: Option<String>,     // Additional conditions
    pub priority: u32,                  // Rule priority for conflicts
    pub created_at: Timestamp,
}
```

### Resource State
```rust
pub enum ResourceState {
    Available,     // Available for use
    InUse,         // Currently being used
    InTransfer,    // Being transferred
    InMaintenance, // Undergoing maintenance
    InStorage,     // In storage
    Decommissioned, // End of life
}
```

### Governance Rule Types
```rust
pub enum GovernanceRuleType {
    AccessRequirement,    // Who can access the resource
    UsageLimit,           // Quantity or time limits
    TransferCondition,    // Conditions for transfer
    RoleRequirement,      // Required roles for access
    LocationConstraint,   // Geographic or logical constraints
    TimeLimit,           // Time-based access limits
    ReputationThreshold,  // Minimum reputation required
}
```

## Error Handling

### ResourceError Enum
```rust
pub enum ResourceError {
    ResourceSpecificationNotFound(String),
    EconomicResourceNotFound(String),
    GovernanceRuleNotFound(String),
    NotAuthorizedCustodian(String),
    InsufficientCapability(String),
    GovernanceViolation(String),
    InvalidQuantity(String),
    InvalidTransition(String),
    SerializationError(String),
    EntryOperationFailed(String),
    LinkOperationFailed(String),
    InvalidInput(String),
}
```

## Security Features

### Capability-Based Access Control
- Functions require appropriate capability tokens
- Role-based access to resource operations
- Custodian validation for resource modifications

### Governance Rule Enforcement
- Automatic validation against embedded rules
- Cross-zome rule checking for complex operations
- Audit trail of all rule violations

### State Management
- Proper state transitions with validation
- History tracking for all resource changes
- Immutable audit trail on Holochain DHT

## Integration Patterns

### With Person Zome
- **Role Validation**: Check agent roles for resource access
- **Private Data**: Access private data for resource validation
- **Capability Checks**: Validate agent capabilities

### With Governance Zome
- **PPR Generation**: Generate PPRs for resource operations
- **Economic Events**: Create events for resource state changes
- **Validation**: Cross-zome validation for resource operations

### Cross-Zome Functions
- `validate_resource_access()` - Validate access across zomes
- `check_custody_requirements()` - Verify custody transfer rules
- `generate_resource_pprs()` - Create PPRs for resource operations

## Usage Examples

### Creating a Resource Specification
```rust
// Create governance rules first
let governance_rules = vec![
    GovernanceRule {
        rule_type: GovernanceRuleType::AccessRequirement,
        rule_data: json!({"required_role": "Accountable"}).to_string(),
        enforced_by: Some(Role::Validator),
        conditions: Some("Must have positive reputation".to_string()),
        priority: 1,
        created_at: sys_time()?,
    }
];

// Create resource specification
let spec_input = CreateResourceSpecificationInput {
    name: "Electric Drill".to_string(),
    description: "High-quality electric drill for construction work".to_string(),
    image_url: Some("https://example.com/drill.jpg".to_string()),
    governance_rules,
};
let spec_hash = create_resource_specification(spec_input)?;
```

### Creating an Economic Resource
```rust
let resource_input = CreateEconomicResourceInput {
    conforms_to: spec_hash,
    quantity: 1.0,
    unit: "piece".to_string(),
    location: Some("Warehouse A".to_string()),
    notes: Some("Brand new in box".to_string()),
};
let resource_hash = create_economic_resource(resource_input)?;
```

### Transferring Custody with PPR Generation
```rust
let transfer_input = TransferCustodyInput {
    resource_hash,
    new_custodian: bob_pub_key,
    transfer_reason: "Resource sharing agreement".to_string(),
    notes: Some("Standard transfer process".to_string()),
};

// This function automatically:
// 1. Validates against governance rules
// 2. Updates the resource custodian
// 3. Creates an EconomicEvent
// 4. Generates PPRs for both parties
let updated_resource = transfer_custody(transfer_input)?;
```

### Validating Resource Access
```rust
let validation_input = ValidateGovernanceRulesInput {
    resource_hash,
    agent: carol_pub_key,
    action_type: "Use".to_string(),
    context: json!({"duration_hours": 2}).to_string(),
};

let validation_result = validate_governance_rules(validation_input)?;

if validation_result.allowed {
    println!("Access granted: {}", validation_result.reason);
} else {
    println!("Access denied: {}", validation_result.reason);
}
```

## Implementation Status

### ✅ Completed Features
- **Resource Specification Management**: Complete CRUD operations
- **Economic Resource Lifecycle**: Creation, updates, custody transfers
- **Governance Rules System**: Embedded rules with enforcement
- **Cross-Zome Integration**: Seamless coordination with other zomes
- **State Management**: Proper resource state transitions
- **Error Handling**: Comprehensive error types and recovery
- **Security**: Capability-based access control

### 🚧 Partial Features
- **Advanced Governance**: Basic rule enforcement, complex rules pending
- **Resource Search**: Basic discovery, advanced search pending
- **Performance Metrics**: Basic tracking, detailed analytics pending

### ❌ Not Implemented
- **Resource Booking**: Reservation system not implemented
- **Process Integration**: Economic process integration needs enhancement
- **Advanced Filtering**: Complex filtering and search capabilities
- **Resource Analytics**: Detailed usage analytics pending

## Performance Considerations

### Optimizations
- **Anchor Strategies**: Efficient DHT anchors for resource discovery
- **Link Management**: Optimized linking for resource relationships
- **Query Performance**: Efficient filtering and pagination

### Scalability
- **DHT Organization**: Resource-specific anchor organization
- **Batch Operations**: Support for batch resource operations
- **Caching**: Strategic caching for frequently accessed resources

## Testing

The Resource zome has comprehensive test coverage:
- **Unit Tests**: All core functions thoroughly tested
- **Integration Tests**: Cross-zome coordination tested
- **Scenario Tests**: Complete resource lifecycle workflows
- **Security Tests**: Access control and governance rule enforcement

## Known Limitations

1. **Search Capability**: Basic search only, advanced filtering needed
2. **Governance Complexity**: Simple rule enforcement, complex rules pending
3. **Resource Relationships**: Basic linking, complex relationships not fully implemented
4. **Performance**: No optimization for large-scale resource management

## Future Enhancements

1. **Advanced Search**: Full-text search and complex filtering
2. **Resource Booking**: Time-based reservation system
3. **Resource Analytics**: Detailed usage and performance analytics
4. **Process Integration**: Enhanced economic process workflows
5. **Resource Relationships**: Complex dependency and relationship mapping