# Resource Zome (`zome_resource`) Documentation

The Resource zome implements the core resource management infrastructure for the nondominium ecosystem, providing ValueFlows-compliant economic resource lifecycle management, Economic Process integration, embedded governance enforcement, sophisticated custody transfer workflows, and seamless cross-zome coordination. It serves as the foundation for all resource-related activities including the four structured Economic Processes (Use, Transport, Storage, Repair) and supports the Private Participation Receipt (PPR) reputation system through comprehensive audit trails.

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
    PendingValidation,  // Awaiting community validation (initial state for new resources)
    Active,            // Available for use/transfer and Economic Processes
    Maintenance,       // Under maintenance (Repair process may change to/from this state)
    Retired,          // No longer active (end-of-life state)
    Reserved,         // Reserved for specific use or Economic Process
}
```
**Lifecycle**: Complete resource state management aligned with Economic Process workflows
**Process Integration**: State transitions correspond to Economic Process outcomes (Repair may change Maintenance ↔ Active)
**Governance**: State transitions can be governed by embedded rules and validation requirements
**PPR Integration**: State changes trigger appropriate Private Participation Receipt generation

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

### Economic Process Data Structures

#### EconomicProcess Entry
```rust
pub struct EconomicProcess {
    pub process_type: String,             // "Use", "Transport", "Storage", "Repair"
    pub name: String,                     // Human-readable process name
    pub description: Option<String>,      // Process description
    pub required_role: String,            // Agent role required to initiate
    pub inputs: Vec<ActionHash>,          // Input EconomicResources
    pub outputs: Vec<ActionHash>,         // Output EconomicResources
    pub started_by: AgentPubKey,          // Initiating agent
    pub started_at: Timestamp,            // Process start time
    pub completed_at: Option<Timestamp>,  // Process completion time
    pub location: Option<String>,         // Process location
    pub status: ProcessStatus,            // Current process status
}
```
**Economic Process Types**: Use (core nondominium), Transport (movement), Storage (custody), Repair (maintenance)
**Role-Based Access**: Transport, Repair, Storage require specialized validated roles; Use accessible to all Accountable Agents
**ValueFlows Integration**: Links inputs and outputs for complete process tracking
**PPR Integration**: Process completion triggers appropriate Private Participation Receipt generation

#### ProcessStatus Enum
```rust
pub enum ProcessStatus {
    Planned,       // Process planned but not started
    InProgress,    // Process currently active
    Completed,     // Process finished successfully
    Suspended,     // Process temporarily paused
    Cancelled,     // Process cancelled before completion
    Failed,        // Process failed to complete
}
```
**Lifecycle Management**: Complete process state tracking from planning to completion
**Governance Integration**: Status changes may require validation depending on process type
**Audit Trail**: Process status history maintained for accountability and PPR generation

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

#### `create_economic_resource(input: EconomicResourceInput) -> ExternResult<CreateEconomicResourceOutput>`
Creates a new economic resource instance conforming to a specification.

**Input**:
```rust
pub struct EconomicResourceInput {
    pub spec_hash: ActionHash,
    pub quantity: f64,
    pub unit: String,
    pub current_location: Option<String>,
}
```

**Output**:
```rust
pub struct CreateEconomicResourceOutput {
    pub resource_hash: ActionHash,
    pub resource: EconomicResource,
}
```

**ValueFlows Compliance**: Links to ResourceSpecification via `conforms_to`
**Custody Model**: Establishes clear custodianship with creator as initial Primary Accountable Agent
**State Management**: Initializes with `PendingValidation` state
**Cross-Zome Integration**: Automatically calls `zome_gouvernance.validate_new_resource` for peer validation

#### `update_economic_resource(input: UpdateEconomicResourceInput) -> ExternResult<Record>`
Updates an existing economic resource with custodian authorization.

**Authorization**: Only the current custodian can update the resource
**Versioning**: Maintains update history via `EconomicResourceUpdates` links
**State Preservation**: Maintains custodian, creator, and creation timestamp

#### `transfer_custody(input: TransferCustodyInput) -> ExternResult<TransferCustodyOutput>`
Transfers resource custody between Primary Accountable Agents.

**Input**:
```rust
pub struct TransferCustodyInput {
    pub resource_hash: ActionHash,
    pub new_custodian: AgentPubKey,
    pub request_contact_info: Option<bool>, // Auto-request private data coordination
}
```

**Authorization**: Only the current custodian can initiate transfers
**Link Management**: Updates custodian links automatically
**Coordination**: Logs coordination info request for UI workflow
**Versioning**: Creates updated resource entry with new custodian

#### `update_resource_state(input: UpdateResourceStateInput) -> ExternResult<Record>`
Updates the state of a resource (Active, Maintenance, Retired, Reserved).

**Authorization**: Only the current custodian can update resource state
**State Transitions**: Supports all ResourceState enum values
**Audit Trail**: Maintains state change history

#### `request_coordination_info(input: RequestCoordinationInfoInput) -> ExternResult<()>`
Helper function for new custodians to request contact information from previous custodians.

**Cross-Zome Integration**: Calls `zome_person.request_private_data_access`
**Context-Aware**: Links data request to specific resource transfer
**Justification**: Provides clear justification for coordination needs

#### Resource Discovery and Query Functions
- `get_latest_economic_resource(original_action_hash: ActionHash) -> ExternResult<EconomicResource>`
- `get_all_economic_resources() -> ExternResult<GetAllEconomicResourcesOutput>`
- `get_economic_resource_profile(action_hash: ActionHash) -> ExternResult<EconomicResourceProfileOutput>`
- `get_resources_by_specification(spec_hash: ActionHash) -> ExternResult<Vec<Record>>`
- `get_my_economic_resources() -> ExternResult<Vec<Link>>`
- `get_agent_economic_resources(agent_pubkey: AgentPubKey) -> ExternResult<Vec<Link>>`
- `check_first_resource_requirement(agent_pub_key: AgentPubKey) -> ExternResult<bool>`

#### Resource Discovery Patterns
- **By Specification**: `specification_hash -> resource_instances`
- **By Custodian**: `agent_pubkey -> custodied_resources`
- **Global Discovery**: `economic_resources anchor -> all_resources`
- **Versioning**: `original_hash -> updated_versions`

**Performance**: Multi-dimensional efficient queries without scanning
**Governance Integration**: First resource requirement checking for Simple Agent validation

### Governance Rule Management

#### `create_governance_rule(input: GovernanceRuleInput) -> ExternResult<Record>`
Creates standalone governance rules for community use.

**Flexibility**: JSON-encoded rule parameters for complex logic
**Enforcement**: Role-based enforcement delegation
**Discovery**: Rule type-based categorization

#### Rule Query Functions
- `get_governance_rules_by_type(rule_type: String) -> ExternResult<Vec<Record>>`
- `get_my_governance_rules() -> ExternResult<Vec<Link>>`

### Economic Process Management

#### `initiate_economic_process(input: EconomicProcessInput) -> ExternResult<CreateEconomicProcessOutput>`
Initiates a structured Economic Process with role-based access control.

**Input**:
```rust
pub struct EconomicProcessInput {
    pub process_type: String,             // "Use", "Transport", "Storage", "Repair"
    pub name: String,                     // Process instance name
    pub description: Option<String>,      // Process description
    pub resource_hashes: Vec<ActionHash>, // Resources involved in process
    pub location: Option<String>,         // Process location
}
```

**Output**:
```rust
pub struct CreateEconomicProcessOutput {
    pub process_hash: ActionHash,
    pub process: EconomicProcess,
}
```

**Role-Based Access Control**: 
- **Use Process**: Accessible to all Accountable Agents
- **Transport Process**: Requires validated Transport role
- **Storage Process**: Requires validated Storage role
- **Repair Process**: Requires validated Repair role

**Cross-Zome Integration**: Validates agent roles via `zome_person.has_person_role_capability`
**Governance Integration**: Creates commitment in `zome_gouvernance` with appropriate VfAction
**PPR Preparation**: Sets up process for Private Participation Receipt generation upon completion

#### `complete_economic_process(input: CompleteEconomicProcessInput) -> ExternResult<CompleteEconomicProcessOutput>`
Completes an Economic Process and records outcomes.

**Input**:
```rust
pub struct CompleteEconomicProcessInput {
    pub process_hash: ActionHash,         // Process to complete
    pub output_resources: Vec<ActionHash>, // Resources produced/modified
    pub completion_notes: Option<String>, // Process completion details
    pub performance_metrics: Option<PerformanceMetrics>, // For PPR generation
}
```

**Process-Specific Outcomes**:
- **Use Process**: Resource state unchanged, usage recorded
- **Transport Process**: Resource location updated, movement logged
- **Storage Process**: Resource custody potentially transferred, storage recorded
- **Repair Process**: Resource state may change (Maintenance ↔ Active), repairs documented

**Cross-Zome Integration**: 
- Creates Economic Event in `zome_gouvernance` with appropriate VfAction
- Triggers PPR generation for both process provider and resource custodian
- Updates resource state if applicable (Repair processes)

#### Economic Process Query Functions
- `get_active_processes() -> ExternResult<Vec<EconomicProcess>>` - Active processes for calling agent
- `get_process_by_resource(resource_hash: ActionHash) -> ExternResult<Vec<EconomicProcess>>` - Processes involving specific resource
- `get_processes_by_type(process_type: String) -> ExternResult<Vec<EconomicProcess>>` - Filter by process type
- `get_my_economic_processes() -> ExternResult<Vec<Link>>` - All processes initiated by calling agent

**Performance**: Efficient process discovery via anchor patterns and agent-centric links
**Audit Trail**: Complete process history for resources and agents
**Governance Integration**: Process validation status included in query results

## Link Architecture

### Discovery Links
- **AllResourceSpecifications**: Global resource spec discovery
- **AllEconomicResources**: Global economic resource discovery
- **AllGovernanceRules**: Global governance rule discovery
- **AllEconomicProcesses**: Global Economic Process discovery

### Hierarchical Links
- **SpecificationToResource**: `spec_hash -> resource_instances`
- **SpecificationToGovernanceRule**: `spec_hash -> governance_rules`
- **ResourceToProcess**: `resource_hash -> processes_using_resource`
- **ProcessToResource**: `process_hash -> input_and_output_resources`

### Agent-Centric Links
- **AgentToOwnedSpecs**: `agent -> created_specifications`
- **CustodianToResource**: `agent -> custodied_resources`
- **AgentToManagedResources**: `agent -> resources_they_manage`
- **AgentToOwnedRules**: `agent -> created_rules`
- **AgentToInitiatedProcesses**: `agent -> economic_processes_initiated`

### Process-Centric Links
- **ProcessesByType**: `process_type_anchor -> processes_of_type`
- **ProcessesByStatus**: `status_anchor -> processes_with_status`
- **ProcessesByLocation**: `location_anchor -> processes_at_location`

### Category/Tag Links
- **SpecsByCategory**: `category_anchor -> specifications`
- **ResourcesByLocation**: `location_anchor -> resources`
- **ResourcesByState**: `state_anchor -> resources`
- **RulesByType**: `rule_type_anchor -> rules`

### Validation Links
- **ResourceToValidation**: `economic_resource -> validation_records`

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
    ProcessNotFound(String),          // Economic Process lookup failures
    NotAuthor,                       // Authorization failures
    NotCustodian,                    // Custodian authorization failures
    InsufficientRole(String),        // Role-based access control failures
    InvalidProcessType(String),      // Invalid Economic Process type
    ProcessValidationFailed(String), // Process validation failures
    SerializationError(String),      // Data serialization issues
    EntryOperationFailed(String),    // DHT operation failures
    LinkOperationFailed(String),     // Link operation failures
    InvalidInput(String),            // Input validation failures
    GovernanceViolation(String),     // Governance rule violations
    CrossZomeCallFailed(String),     // Cross-zome communication failures
    PPRGenerationFailed(String),     // PPR issuance failures
}
```

### Cross-Zome Error Handling Patterns
```rust
// Standardized error handling for cross-zome calls
pub fn handle_cross_zome_error(result: ExternResult<impl Any>, context: &str) -> ResourceError {
    match result {
        Err(wasm_error) => {
            match wasm_error.to_string().as_str() {
                s if s.contains("GovernanceViolation") => ResourceError::GovernanceViolation(format!("{}: {}", context, s)),
                s if s.contains("InsufficientRole") => ResourceError::InsufficientRole(format!("{}: {}", context, s)),
                s if s.contains("ValidationFailed") => ResourceError::ProcessValidationFailed(format!("{}: {}", context, s)),
                _ => ResourceError::CrossZomeCallFailed(format!("{}: {}", context, wasm_error)),
            }
        }
        Ok(_) => unreachable!("Should only be called on errors"),
    }
}

// Usage pattern in cross-zome calls
let validation_result = call(/*...*/).map_err(|e| handle_cross_zome_error(Err(e), "resource_validation"))?;
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

## Cross-Zome Integration

### Integration with Person Zome

#### Authorization Checks
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

#### Role-Based Access Control
```rust
// Check if agent has required role for operation
let has_capability = has_person_role_capability((agent_pubkey, "Resource Coordinator".to_string()))?;
if !has_capability {
    return Err(ResourceError::GovernanceViolation("Resource Coordinator role required".to_string()));
}
```

#### Economic Process Role Validation
```rust
// Validate specialized roles for Economic Processes
let process_type = "Transport";
let required_role = match process_type {
    "Use" => None, // Accessible to all Accountable Agents
    "Transport" => Some("Transport"),
    "Storage" => Some("Storage"),
    "Repair" => Some("Repair"),
    _ => return Err(ResourceError::InvalidInput("Invalid process type".to_string())),
};

if let Some(role) = required_role {
    let has_role = has_person_role_capability((agent_pubkey, role.to_string()))?;
    if !has_role {
        return Err(ResourceError::GovernanceViolation(format!("{} role required for {} process", role, process_type)));
    }
}
```

#### Private Data Coordination
```rust
// Custody transfer coordination - call person zome for private data access
let data_request = DataAccessRequestInput {
    requested_from: previous_custodian,
    fields_requested: vec!["email".to_string(), "phone".to_string(), "location".to_string()],
    context: format!("custodian_transfer_{}", resource_hash),
    resource_hash: Some(resource_hash),
    justification: "New custodian requesting contact information for resource handover coordination.".to_string(),
};

call(
    CallTargetCell::Local,
    "zome_person",
    "request_private_data_access".into(),
    None,
    &data_request,
)?;
```

### Integration with Governance Zome

#### Resource Validation
```rust
// Automatic resource validation upon creation
let validation_result = call(
    CallTargetCell::Local,
    "zome_gouvernance",
    "validate_new_resource".into(),
    None,
    &ValidateNewResourceInput {
        resource_hash: resource_hash.clone(),
        resource_spec_hash: spec_hash.clone(),
        creator: agent_pubkey.clone(),
        validation_scheme: "simple_approval".to_string(),
    },
)?;
```

#### Economic Process Integration with VfAction
```rust
// Create commitment for Economic Process using type-safe VfAction
let vf_action = match process_type {
    "Use" => VfAction::Use,
    "Transport" => VfAction::Work,  // Transport is Work action
    "Storage" => VfAction::Work,    // Storage is Work action  
    "Repair" => VfAction::Modify,   // Repair modifies resources
    _ => return Err(ProcessError::InvalidProcessType(process_type.to_string())),
};

let commitment = call(
    CallTargetCell::Local,
    "zome_gouvernance",
    "propose_commitment".into(),
    None,
    &ProposeCommitmentInput {
        action: vf_action,
        resource_hash: Some(resource_hash),
        provider: agent_pubkey,
        due_date: process_deadline,
        note: Some(format!("{} process commitment", process_type)),
    },
)?;
```

#### Economic Event Logging
```rust
// Log Economic Event upon process completion
let economic_event = call(
    CallTargetCell::Local,
    "zome_gouvernance", 
    "log_economic_event".into(),
    None,
    &LogEconomicEventInput {
        action: vf_action,
        provider: process_agent,
        receiver: resource_custodian,
        resource_inventoried_as: resource_hash,
        resource_quantity: 1.0,
        note: Some(format!("{} process completed", process_type)),
    },
)?;

// Trigger PPR generation for process participants
let ppr_result = call(
    CallTargetCell::Local,
    "zome_gouvernance",
    "issue_participation_receipts".into(),
    None,
    &IssueParticipationReceiptsInput {
        commitment_hash: commitment_hash,
        event_hash: economic_event.event_hash,
        counterparty: resource_custodian,
        performance_metrics: process_performance_metrics,
    },
)?;
```

#### Standardized Cross-Zome Data Structures

##### Person Zome Integration Structures
```rust
pub struct DataAccessRequestInput {
    pub requested_from: AgentPubKey,
    pub fields_requested: Vec<String>,
    pub context: String,
    pub resource_hash: Option<ActionHash>,
    pub justification: String,
}

pub struct RoleCapabilityCheck {
    pub agent: AgentPubKey,
    pub required_role: String,
    pub process_context: Option<String>,    // Economic Process context
}

pub struct RoleCapabilityResponse {
    pub has_capability: bool,
    pub capability_level: String,          // "governance", "coordination", etc.
    pub specialized_roles: Vec<String>,     // List of specialized roles held
}
```

##### Governance Zome Integration Structures
```rust
pub struct ValidateNewResourceInput {
    pub resource_hash: ActionHash,
    pub resource_spec_hash: ActionHash,
    pub creator: AgentPubKey,
    pub validation_scheme: String,
    pub resource_type: String,             // Additional context for validation
    pub governance_rules: Vec<ActionHash>, // Embedded governance rules
}

pub struct ValidateNewResourceOutput {
    pub validation_hash: ActionHash,
    pub validation_required: bool,
    pub status: String,                    // "pending", "approved", "rejected"
    pub validators_assigned: Vec<AgentPubKey>, // Assigned validators
}

pub struct ValidateProcessCompletionInput {
    pub process_hash: ActionHash,
    pub completion_evidence: String,       // Evidence of completion
    pub performance_metrics: PerformanceMetrics, // For PPR generation
    pub resource_state_changes: Vec<ResourceStateChange>, // State changes made
}

pub struct ResourceStateChange {
    pub resource_hash: ActionHash,
    pub previous_state: ResourceState,
    pub new_state: ResourceState,
    pub change_reason: String,
}

pub struct IssueParticipationReceiptsInput {
    pub commitment_hash: ActionHash,
    pub event_hash: ActionHash,
    pub counterparty: AgentPubKey,
    pub performance_metrics: PerformanceMetrics,
    pub interaction_context: String,
    pub role_context: Option<String>,
    pub resource_context: Option<ActionHash>, // Link to involved resource
}
```

## ValueFlows Compliance

### Economic Resource Model
- **Conforms To**: Clear specification conformance via `conforms_to` field
- **Primary Accountable Agent**: Custodian field establishes resource accountability
- **Quantity Tracking**: Numeric quantity with unit for precise resource measurement
- **State Management**: Comprehensive lifecycle state tracking aligned with Economic Processes
- **Location Awareness**: Physical and virtual location tracking with process integration

### Resource Specification Pattern
- **Categorization**: Efficient resource type organization
- **Governance Embedding**: Rules embedded within specifications for Economic Process access control
- **Tag-based Discovery**: Flexible resource finding mechanisms
- **Agent Attribution**: Clear creator and ownership tracking

### Economic Process Compliance
- **Process Integration**: Resources participate in structured Economic Processes (Use, Transport, Storage, Repair)
- **VfAction Alignment**: Economic Processes use type-safe VfAction enum (Use, Work, Modify)
- **Input/Output Tracking**: Complete tracking of resource inputs and outputs for each process
- **Process Lifecycle**: Status tracking from Planned through Completed with governance validation
- **Role-Based Access**: Process access control based on validated agent roles

### REA Pattern Implementation
- **Resources**: EconomicResource entries with specifications, state, and custodianship
- **Events**: Economic Events logged in governance zome for all process activities
- **Agents**: Agent roles determine process access and resource custody capabilities

### Multi-Layered Ontology Support
- **Knowledge Layer**: ResourceSpecifications with embedded governance rules and process requirements
- **Plan Layer**: Economic Processes with commitments using type-safe VfAction enum
- **Observation Layer**: Completed Economic Events with PPR generation for reputation tracking

## Implementation Status

### Phase 1 (Complete) ✅
- ✅ Complete data structures with ValueFlows compliance
- ✅ Resource specification CRUD operations with versioning
- ✅ Governance rule creation and linking
- ✅ Comprehensive discovery patterns (category, tag, agent-centric)
- ✅ Agent-centric ownership tracking
- ✅ Signal architecture for real-time updates
- ✅ Validation and error handling

### Phase 2 (Complete) ✅
- ✅ Economic resource lifecycle management (full CRUD)
- ✅ Resource custody transfer workflows with coordination
- ✅ Resource state transition management (Active, Maintenance, Retired, Reserved)
- ✅ Cross-zome integration with governance and person zomes
- ✅ Private data coordination for custody transfers
- ✅ First resource requirement validation for governance workflows
- ✅ Automatic resource validation upon creation
- ✅ Comprehensive authorization and role-based access control
- ✅ Economic Process infrastructure (Use, Transport, Storage, Repair)
- ✅ VfAction integration for type-safe Economic Process management
- ✅ Role-based process access control with specialized role validation
- ✅ PPR integration for Economic Process reputation tracking

### Current Features
- **Complete Economic Resource Management**: Full lifecycle from creation through Economic Processes to custody transfer
- **Economic Process Integration**: Four structured processes (Use, Transport, Storage, Repair) with role-based access control
- **VfAction Compliance**: Type-safe Economic Process management using ValueFlows action vocabulary
- **Cross-Zome Coordination**: Seamless integration with person and governance zomes for complete workflows
- **Private Data Integration**: Automatic coordination workflows for custody transfers and process coordination
- **State Management**: Comprehensive resource state tracking aligned with Economic Process outcomes
- **Validation Integration**: Automatic peer validation through governance zome with PPR generation
- **Discovery Optimization**: Multi-dimensional efficient queries including process-centric patterns
- **Audit Trails**: Complete versioning, update history, and Economic Process tracking
- **Role-Based Process Access**: Specialized roles (Transport, Repair, Storage) enable restricted Economic Process participation
- **PPR System Integration**: Economic Process completion triggers bi-directional Private Participation Receipt generation

### Phase 3 Enhancement Opportunities (Future) 📋
- **Advanced Process Chaining**: Multi-step Economic Process workflows with conditional logic
- **Resource Booking and Reservation**: Time-based resource allocation for Economic Processes
- **Advanced Governance Rule Enforcement**: Conditional logic and smart contract-like governance rules
- **Process Automation**: AI-assisted process matching and automatic workflow optimization
- **Resource Availability Calendaring**: Time-based resource discovery and process scheduling
- **Multi-Agent Coordination**: Complex Economic Process coordination involving multiple specialized agents
- **Performance Analytics**: Economic Process performance tracking and optimization recommendations
- **Cross-Network Process Federation**: Economic Process coordination across multiple nondominium networks

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

## Economic Process Workflows

The Resource zome implements four structured Economic Process types aligned with nondominium governance principles and VfAction vocabulary:

### Use Process (Core nondominium)
- **Access**: All Accountable Agents
- **VfAction**: `Use`
- **Resource Effect**: Resource state unchanged
- **Workflow**: Signal intent → Create commitment → Use resource → Complete process → Generate PPRs
- **PPR Types**: Service process receipts for both resource user and custodian

### Transport Process (Material resource movement)
- **Access**: Agents with validated Transport role only
- **VfAction**: `Work` (primary), `Move` (secondary for location changes)
- **Resource Effect**: Resource location updated, state unchanged
- **Workflow**: Validate Transport role → Create commitment → Move resource → Update location → Complete process → Generate PPRs
- **PPR Types**: Transport-specific service receipts

### Storage Process (Temporary custody)
- **Access**: Agents with validated Storage role only
- **VfAction**: `Work` (primary), `TransferCustody` (if custody changes)
- **Resource Effect**: Resource unchanged (custody may transfer)
- **Workflow**: Validate Storage role → Create commitment → Accept storage → Maintain custody → Complete process → Generate PPRs
- **PPR Types**: Storage-specific service receipts

### Repair Process (Resource maintenance)
- **Access**: Agents with validated Repair role only
- **VfAction**: `Modify` (primary), `Work` (secondary for labor)
- **Resource Effect**: Resource state may change (Maintenance ↔ Active)
- **Workflow**: Validate Repair role → Create commitment → Perform repairs → Update resource state → Complete process → Generate PPRs
- **PPR Types**: Repair-specific service receipts with state change documentation

### Process Chaining Support
The Resource zome supports process chaining for agents with multiple specialized roles:
- Single commitment covering multiple process steps (Transport → Repair → Transport)
- Efficient workflow management for complex service delivery
- Comprehensive PPR generation for entire process chain

The Resource zome provides a production-ready, comprehensive implementation of ValueFlows-compliant resource management with complete economic resource lifecycle, Economic Process integration, embedded governance enforcement, sophisticated custody transfer workflows, and seamless cross-zome coordination. It serves as the foundation for all resource-related activities in the nondominium ecosystem, supporting the four structured Economic Processes (Use, Transport, Storage, Repair) with role-based access control, type-safe VfAction integration, and comprehensive Private Participation Receipt (PPR) generation for reputation tracking.

The zome seamlessly integrates with the identity and governance systems to enable sophisticated resource sharing workflows with automatic validation, private data coordination, Economic Process management, and comprehensive audit trails that support the nondominium principles of permissionless access, organization-agnostic resources, capture resistance, and embedded governance.