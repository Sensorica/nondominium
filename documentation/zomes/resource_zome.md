# Resource Zome (`zome_resource`) Documentation

The Resource zome implements the core resource management infrastructure for the nondominium ecosystem, providing ValueFlows-compliant resource specification management, Economic Resource lifecycle tracking, governance rule enforcement, and custody transfer workflows. It serves as the foundation for all resource-related activities and supports the Private Participation Receipt (PPR) reputation system through comprehensive audit trails.

> **NDO Layer 0 (`NondominiumIdentity`) is implemented** — see `### NondominiumIdentity Entry (Layer 0)` below.
>
> **TODO (post-MVP — NDO Layers 1 & 2, ndo_prima_materia.md §§4, 8, 10)**: Cross-layer link types not yet implemented:
> - `NDOToSpecification` — Layer 0 identity hash to `ResourceSpecification` (Layer 1 activation)
> - `NDOToProcess` — Layer 0 identity hash to `Process` (Layer 2 activation)
> - `NDOToComponent` — Layer 0 identity hash to child NDO identity hash (holonic composition)
> - `CapabilitySlot` — Layer 0 identity hash to capability targets (stigmergic attachment surface)
> - `NDOsByLifecycleStage`, `NDOsByNature`, `NDOsByRegime` — facet discovery anchors (REQ-NDO-L0-07)
>
> **Unyt (post-MVP):** endorsed economic terms use typed **`EconomicAgreement`** `GovernanceRule` data (`ndo_prima_materia.md` §6.6, REQ-NDO-CS-09–CS-11; `documentation/requirements/post-mvp/unyt-integration.md`).

## Core Data Structures

### NondominiumIdentity Entry (Layer 0)

Permanent identity anchor for any resource. Exists from the moment of conception through end-of-life. The original `ActionHash` from `create_ndo` is the **stable Layer 0 identity** — it never changes even as `lifecycle_stage` evolves.

```rust
pub struct NondominiumIdentity {
    pub name: String,
    pub initiator: AgentPubKey,          // set from agent_info at creation; immutable
    pub property_regime: PropertyRegime, // immutable after creation
    pub resource_nature: ResourceNature, // immutable after creation
    pub lifecycle_stage: LifecycleStage, // the ONLY mutable field (REQ-NDO-L0-04)
    pub created_at: Timestamp,           // immutable after creation
    pub description: Option<String>,     // immutable after creation
    pub successor_ndo_hash: Option<ActionHash>, // set once on Deprecated transition (REQ-NDO-LC-06)
}
```

**LifecycleStage** (10 stages):

| Phase | Stages |
|---|---|
| Emergence | `Ideation` → `Specification` → `Development` → `Prototype` |
| Maturity | `Stable` → `Distributed` |
| Operation | `Active` |
| Suspension (reversible) | `Hibernating` |
| Terminal | `Deprecated` → `EndOfLife` |

State machine transitions are enforced by the integrity zome (see `ndo_prima_materia.md §5.3`). `Hibernating` is the only reversible pause state — it can return to `Active`. `Deprecated` and `EndOfLife` cannot be reactivated (REQ-NDO-LC-04).

**PropertyRegime** (6 variants): `Private`, `Commons`, `Collective`, `Pool`, `CommonPool`, `Nondominium`

**ResourceNature** (5 variants): `Physical`, `Digital`, `Service`, `Hybrid`, `Information`

**Immutability**: Only `lifecycle_stage` may change post-creation, except that `successor_ndo_hash` is set exactly once during the `Deprecated` transition. Once `successor_ndo_hash` is set it is also immutable. Delete is always `Invalid` — Layer 0 is permanent.

**Discovery links**: `AllNdos` (global anchor `"ndo_identities"` path → action hashes), `AgentToNdo` (initiator pubkey → action hashes)

**Lifecycle links**: `NdoToSuccessor` (deprecated NDO → successor NDO, REQ-NDO-LC-06), `NdoToTransitionEvent` (NDO → triggering `EconomicEvent`, REQ-NDO-L0-05)

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
    // TODO (G1, REQ-AGENT-02): replace custodian: AgentPubKey with custodian: AgentContext
    // post-MVP to support Collective, Project, Network, and Bot agents as Primary Accountable
    // Agents. AgentContext = union of AgentPubKey | CollectiveAgentHash. The same change is
    // needed in TransitionContext.target_custodian (governance-operator-architecture.md) and
    // NondominiumIdentity.initiator (ndo_prima_materia.md Section 8.1).
    pub created_by: AgentPubKey,   // Resource creator
    pub created_at: Timestamp,     // Creation timestamp
    pub current_location: Option<String>, // Physical/virtual location
    // TODO: split into two fields:
    //   pub lifecycle_stage: LifecycleStage,    // lives on NondominiumIdentity (Layer 0)
    //   pub operational_state: OperationalState, // lives on EconomicResource (Layer 2)
    pub state: ResourceState,      // Current resource state (pending split — see ndo_prima_materia.md Section 5)
}
```

**ValueFlows**: Compliant economic resource implementation
**Custody**: Clear custodianship with Primary Accountable Agent pattern
**State Management**: Comprehensive resource lifecycle tracking

### ResourceState Enum (pending replacement)

> **TODO**: Split `ResourceState` into two orthogonal enums per `ndo_prima_materia.md` Section 5 and `REQ-NDO-OS-01` through `REQ-NDO-OS-06`.

```rust
// CURRENT (conflated — to be replaced):
pub enum ResourceState {
    PendingValidation,  // → OperationalState::PendingValidation
    Active,            // → LifecycleStage::Active + OperationalState::Available
    Maintenance,       // → OperationalState::InMaintenance (LifecycleStage unchanged)
    Retired,          // → LifecycleStage::Deprecated or EndOfLife
    Reserved,         // → OperationalState::Reserved (LifecycleStage unchanged)
}

// IMPLEMENTED — LifecycleStage (on NondominiumIdentity, Layer 0, REQ-NDO-LC-01–07):
pub enum LifecycleStage {
    Ideation,      // spark of an idea, no design yet
    Specification, // design/requirements being written
    Development,   // active construction / prototyping
    Production,    // stable, in active use
    Hibernating,   // dormant but not end-of-life
    Deprecated,    // superseded by a newer version
    EndOfLife,     // permanently archived, Layer 0 tombstone
}

// TARGET — OperationalState (on EconomicResource, Layer 2):
pub enum OperationalState {
    PendingValidation, Available, Reserved,
    InTransit, InStorage, InMaintenance, InUse,
}
```

**Key principle**: Transport, storage, and maintenance are *processes* that act on a resource at *any* lifecycle stage. A `Development` resource can be `InTransit` between R&D labs. A `Production` resource can be `InMaintenance`. These are operational conditions, not lifecycle milestones.

**Lifecycle**: `LifecycleStage` tracks maturity/evolution (advances rarely, almost irreversibly)
**Operational**: `OperationalState` tracks active processes (cycles frequently, reset to `Available` when process ends)
**Transitions**: All state changes governed by the governance zome; each transition references a valid `EconomicEvent`

### GovernanceRule Entry

```rust
pub struct GovernanceRule {
    pub rule_type: String,           // Rule category (access, usage, transfer)
    pub rule_data: String,          // JSON-encoded rule parameters
    pub enforced_by: Option<String>, // Role required for enforcement
    pub created_by: AgentPubKey,    // Rule creator
    pub created_at: Timestamp,      // Creation timestamp
    // TODO (post-MVP, governance.md §4.8): add `expires_at: Option<Timestamp>` for temporal
    // governance. Rules with an expiry become inactive after the deadline without requiring a
    // manual update. Enables sunset clauses and time-limited access grants.
    // TODO (post-MVP): add `EconomicAgreement` to typed `GovernanceRuleType` for Unyt Smart
    // Agreement integration. See ndo_prima_materia.md §6.6, REQ-NDO-CS-07–CS-11, and
    // documentation/specifications/governance/governance.md (EconomicAgreement TODO).
}
```

**Flexibility**: JSON-encoded parameters for complex rule logic
**Enforcement**: Role-based rule enforcement delegation
**Governance**: Community-driven rule creation and management

## API Functions

### NDO Layer 0 Management

#### `create_ndo(input: NdoInput) -> ExternResult<NdoOutput>`

Creates a new `NondominiumIdentity`. Sets `initiator` from `agent_info` and `created_at` from `sys_time`. Creates two discovery links.

**Input**: `NdoInput { name, property_regime, resource_nature, lifecycle_stage, description }`
**Output**: `NdoOutput { action_hash, entry }` — `action_hash` is the stable Layer 0 identity.
**Links created**: `AllNdos` (global anchor `"ndo_identities"` → action hash), `AgentToNdo` (initiator pubkey → action hash).
**Validation**: name must not be empty.

#### `get_ndo(original_action_hash: ActionHash) -> ExternResult<Option<NondominiumIdentity>>`

Returns the **latest** version of a `NondominiumIdentity` by resolving the HDK update chain. Always provide the original action hash — the function handles chain traversal internally.

#### `update_lifecycle_stage(input: UpdateLifecycleStageInput) -> ExternResult<ActionHash>`

Transitions the `lifecycle_stage` of a `NondominiumIdentity`. Only the initiator may call this. Enforced in both the coordinator (pre-flight check) and the integrity zome (state machine validation).

**Input**:
```rust
UpdateLifecycleStageInput {
    original_action_hash: ActionHash,
    new_stage: LifecycleStage,
    successor_ndo_hash: Option<ActionHash>,    // required when new_stage == Deprecated
    transition_event_hash: Option<ActionHash>, // triggering EconomicEvent (REQ-NDO-L0-05)
}
```

**Authorization**: caller must equal `entry.initiator`.

**State machine**: The integrity zome enforces the §5.3 transition allowlist. Invalid transitions (e.g. `EndOfLife → Ideation`, `Deprecated → Active`) return a validation error.

**Returns**: new action hash. The `original_action_hash` remains the stable Layer 0 identity.

**Links created** (conditional):
- `NdoToSuccessor` (`original_action_hash` → `successor_ndo_hash`) — only when `new_stage == Deprecated` (REQ-NDO-LC-06)
- `NdoToTransitionEvent` (`original_action_hash` → `transition_event_hash`) — when `transition_event_hash` is `Some` (REQ-NDO-L0-05; full cross-zome event validation deferred)

### Resource Specification Management

#### `create_resource_specification(input: CreateResourceSpecificationInput) -> ExternResult<Record>`

Creates a new resource specification template.

**Input**:

```rust
pub struct CreateResourceSpecificationInput {
    pub name: String,
    pub description: String,
    pub category: String,
    pub image_url: Option<String>,
    pub tags: Vec<String>,
    pub governance_rules: Vec<ActionHash>,
}
```

**Business Logic**:

- Validates required fields (name, description, category)
- Creates discovery links by category and tags
- Links to governance rules for embedded control

**Links Created**:

- `category anchor -> spec_hash` (category discovery)
- `tag anchors -> spec_hash` (tag discovery)
- `all_specs anchor -> spec_hash` (global discovery)

#### `update_resource_specification(input: UpdateResourceSpecificationInput) -> ExternResult<Record>`

Updates an existing resource specification.

**Authorization**: Only the specification author can update
**Versioning**: Creates update links for version history

#### `get_latest_resource_specification(original_action_hash: ActionHash) -> ExternResult<ResourceSpecification>`

Retrieves the latest version of a resource specification.

**Pattern**: Follows update chain via version links
**Performance**: Optimized with timestamp-based latest selection

#### `get_all_resource_specifications() -> ExternResult<GetAllResourceSpecificationsOutput>`

Discovers all resource specifications in the network.

**Discovery Pattern**: Queries the `resource_specifications` anchor path
**Output**: Array of all active resource specifications

#### `get_resource_specifications_by_category(category: String) -> ExternResult<Vec<Record>>`

Finds resource specifications by category.

**Pattern**: Efficient category-based discovery via anchor links
**Use Case**: Browse resources by type (tools, materials, services)

#### `get_resource_specifications_by_tag(tag: String) -> ExternResult<Vec<Record>>`

Finds resource specifications by tag.

**Pattern**: Tag-based discovery for flexible filtering
**Use Case**: Find resources with specific attributes

#### `get_resource_specification_with_rules(spec_hash: ActionHash) -> ExternResult<ResourceSpecificationWithRules>`

Gets resource specification with associated governance rules.

**Integration**: Fetches linked governance rules for complete context
**Use Case**: Understand resource access requirements before creation

### Economic Resource Management

#### `create_economic_resource(input: CreateEconomicResourceInput) -> ExternResult<Record>`

Creates a new economic resource instance.

**Input**:

```rust
pub struct CreateEconomicResourceInput {
    pub conforms_to: ActionHash,    // Resource specification
    pub quantity: f64,
    pub unit: String,
    pub current_location: Option<String>,
}
```

**Business Logic**:

- Validates caller has appropriate capability level
- Links resource to specification for compliance
- Sets initial state to `PendingValidation`
- Creates custody links to custodian

**Authorization**: Requires Accountable Agent capability level
**Validation**: Cross-zome validation with governance zome

#### `update_economic_resource(input: UpdateEconomicResourceInput) -> ExternResult<Record>`

Updates an existing economic resource.

**Authorization**: Only resource custodian can update
**Fields Updateable**: Quantity, location, state (with validation)

#### `get_latest_economic_resource(original_action_hash: ActionHash) -> ExternResult<EconomicResource>`

Retrieves the latest version of an economic resource.

**Pattern**: Follows update chain via version links
**Use Case**: Get current resource state and attributes

#### `get_all_economic_resources() -> ExternResult<GetAllEconomicResourcesOutput>`

Discovers all economic resources in the network.

**Privacy**: Returns only public resource information
**Access Control**: Respects resource visibility settings

#### `get_my_economic_resources() -> ExternResult<Vec<Link>>`

Gets resources created or custodied by the calling agent.

**Pattern**: Queries agent's resource links
**Use Case**: Agent's personal resource inventory

#### `get_agent_economic_resources(agent_pubkey: AgentPubKey) -> ExternResult<Vec<Link>>`

Gets resources associated with a specific agent.

**Pattern**: Agent-centric resource discovery
**Use Case**: View another agent's resource portfolio

#### `get_resources_by_specification(spec_hash: ActionHash) -> ExternResult<Vec<Record>>`

Finds all economic resources conforming to a specification.

**Pattern**: Specification to resource discovery
**Use Case**: Find all instances of a particular resource type

#### `get_economic_resource_profile(resource_hash: ActionHash) -> ExternResult<EconomicResourceProfile>`

Gets complete resource profile with specification and governance rules.

**Integration**: Combines resource data with specification and rules
**Use Case**: Full resource context for decision making

#### `check_first_resource_requirement(agent_pub_key: AgentPubKey) -> ExternResult<bool>`

Checks if an agent has created their first resource yet.

**Use Case**: Validation for Simple Agent promotion requirements
**Business Logic**: Used in agent progression workflows

### Custody Transfer Management

#### `transfer_custody(input: TransferCustodyInput) -> ExternResult<TransferCustodyOutput>`

Transfers custody of an economic resource to another agent.

**Input**:

```rust
pub struct TransferCustodyInput {
    pub resource_hash: ActionHash,
    pub new_custodian: AgentPubKey,
    pub transfer_note: Option<String>,
}
```

**Authorization**: Only current custodian can transfer
**Validation**: Validates new custodian capability level
**Integration**: Creates economic event for PPR generation

**Business Logic**:

- Validates transfer permissions
- Updates resource custodian
- Creates economic event (TransferCustody)
- Triggers validation workflow if required

#### `update_resource_state(input: UpdateResourceStateInput) -> ExternResult<Record>`

> **TODO**: Replace with two separate functions per `REQ-NDO-OS-01`:
> - `update_lifecycle_stage(input: UpdateLifecycleStageInput)` — transitions on `NondominiumIdentity`; requires an `EconomicEvent` hash as proof of triggering action
> - `update_operational_state(input: UpdateOperationalStateInput)` — transitions on `EconomicResource`; called by governance zome when processes begin/end

Updates the state of an economic resource.

**Input**:

```rust
// CURRENT (pending split):
pub struct UpdateResourceStateInput {
    pub resource_hash: ActionHash,
    pub new_state: ResourceState,  // TODO: split into lifecycle_stage / operational_state
    pub reason: Option<String>,
}
```

**Authorization**: Governance zome only (via governance-as-operator pattern)
**Validation**: All transitions require a corresponding `EconomicEvent` reference
**Integration**: Creates economic events for PPR generation

### Governance Rule Management

#### `create_governance_rule(input: GovernanceRuleInput) -> ExternResult<Record>`

Creates a new governance rule.

**Input**:

```rust
pub struct GovernanceRuleInput {
    pub rule_type: String,
    pub rule_data: String,
    pub enforced_by: Option<String>,
}
```

**Business Logic**:

- Validates rule format and structure
- Links rule to creator for accountability
- Creates discovery links for rule lookup

#### `update_governance_rule(input: UpdateGovernanceRuleInput) -> ExternResult<Record>`

Updates an existing governance rule.

**Authorization**: Only rule creator can update
**Validation**: Ensures rule data remains valid JSON

#### `get_all_governance_rules() -> ExternResult<GetAllGovernanceRulesOutput>`

Discovers all governance rules in the network.

**Discovery Pattern**: Queries the `governance_rules` anchor path
**Use Case**: Understand community governance framework

#### `get_governance_rules_by_type(rule_type: String) -> ExternResult<Vec<Record>>`

Finds governance rules by type.

**Pattern**: Type-based rule discovery
**Use Case**: Find all access rules, usage rules, etc.

#### `get_governance_rule_profile(rule_hash: ActionHash) -> ExternResult<GovernanceRuleProfile>`

Gets governance rule with creator information.

**Integration**: Links rule to creator agent profile
**Use Case**: Understand rule context and authority

## Link Architecture

### Resource Specification Links

- **AllSpecs**: `resource_specifications anchor -> spec_hash` - Global discovery
- **CategoryLinks**: `category anchor -> spec_hash` - Category discovery
- **TagLinks**: `tag anchor -> spec_hash` - Tag discovery
- **SpecificationUpdates**: `original_hash -> updated_hash` - Version history

### Economic Resource Links

- **AllResources**: `economic_resources anchor -> resource_hash` - Global discovery
- **SpecificationToResources**: `spec_hash -> resource_hash` - Specification to instances
- **AgentToResources**: `agent_pubkey -> resource_hash` - Agent resource portfolio
- **CustodyLinks**: `custodian -> resource_hash` - Current custodian tracking
- **ResourceUpdates**: `original_hash -> updated_hash` - Version history

### Governance Rule Links

- **AllGovernanceRules**: `governance_rules anchor -> rule_hash` - Global discovery
- **RuleTypeLinks**: `rule_type anchor -> rule_hash` - Type-based discovery
- **RuleUpdates**: `original_hash -> updated_hash` - Version history

### Cross-Reference Links

- **SpecificationToRules**: `spec_hash -> rule_hash` - Embedded governance
- **ResourceToEvents**: `resource_hash -> event_hash` - Economic event tracking

## Signal Architecture

The Resource zome emits signals for real-time UI updates:

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
**Cross-Zome Coordination**: Supports complex workflows with other zomes

## Error Handling

### ResourceError Types

`ResourceError` is defined in `crates/utils/src/errors.rs` and imported by `zome_resource`.

```rust
pub enum ResourceError {
    ResourceSpecNotFound(String),      // Specification lookup failures
    EconomicResourceNotFound(String),  // Resource lookup failures
    GovernanceRuleNotFound(String),    // Rule lookup failures
    NotAuthor,                         // Authorization failures
    NotCustodian,                      // Custody validation failures
    SerializationError(String),        // Data serialization issues
    EntryOperationFailed(String),     // DHT operation failures
    LinkOperationFailed(String),      // Link operation failures
    InvalidInput(String),             // Input validation failures
    GovernanceViolation(String),      // Rule enforcement failures
}
```

**Pattern**: Comprehensive error coverage with descriptive messages
**Integration**: Converts to `WasmError` for Holochain compatibility

## Privacy and Access Control

### Public Resource Information

- **Resource Specifications**: Name, description, category, tags (discoverable)
- **Resource Status**: Active status and basic availability (public)
- **Governance Rules**: Rule types and basic requirements (transparent)

### Private Resource Information

- **Resource Details**: Specific locations, quantities, custodians (access-controlled)
- **Economic Events**: Detailed transaction history (participant access)
- **Custody Transfers**: Transfer details and participants (participant access)

### Access Control Patterns

```rust
// Public resource discovery
get_all_economic_resources() -> Basic resource info

// Agent's own resources (full access)
get_my_economic_resources() -> Complete resource details

// Resource access by permission
get_economic_resource_profile(resource_hash) -> Requires custodian permission
```

## Integration with Other Zomes

### Cross-Zome Validation

```rust
// Validate agent has required capability level
let capability_level = call(
    CallTargetCell::Local,
    "zome_person",
    "get_person_capability_level".into(),
    None,
    &agent_pubkey,
)?;

if capability_level != "governance" && capability_level != "coordination" {
    return Err(ResourceError::GovernanceViolation("Insufficient capability".to_string()));
}
```

### Economic Event Integration

```rust
// Create economic event for custody transfer
let event_output = call(
    CallTargetCell::Local,
    "zome_gouvernance",
    "log_economic_event".into(),
    None,
    &LogEconomicEventInput {
        action: VfAction::TransferCustody,
        provider: current_custodian,
        receiver: new_custodian,
        resource_inventoried_as: resource_hash,
        affects: resource_hash,
        resource_quantity: resource.quantity,
        note: transfer_note,
    },
)?;
```

### Governance Rule Enforcement

```rust
// Check resource access against governance rules
let rules = get_governance_rules_by_type("access".to_string())?;
for rule in rules {
    if rule_applies_to_operation(&rule, &operation, &agent_roles) {
        enforce_rule(&rule)?;
    }
}
```

## Implementation Status

### ✅ **Completed Features**

- **Resource Specification Management**: Complete CRUD operations with discovery
- **Economic Resource Lifecycle**: Full resource creation, updates, and tracking
- **Custody Transfer System**: Secure custody transfers with validation
- **Governance Rule Integration**: Embedded rules for access control
- **State Management**: Complete resource state transitions
- **Discovery System**: Category and tag-based efficient resource discovery
- **Cross-Zome Integration**: Role validation and economic event creation
- **Signal System**: Real-time updates for UI reactivity
- **Versioning Support**: Complete update history for specifications and resources

### 🔧 **Current Limitations**

- **No Economic Processes**: Structured process workflows (Use, Transport, Storage, Repair) not implemented
- **Basic Resource Validation**: Simple validation without multi-reviewer schemes
- **No Resource Dependencies**: Resource relationships and dependencies not tracked
- **Limited Location Support**: Basic location tracking without spatial features

### 📋 **Future Enhancement Opportunities**

- **Economic Process Integration**: Implement structured process workflows
- **Advanced Validation**: Multi-reviewer validation schemes (2-of-3, N-of-M)
- **Resource Relationships**: Dependency tracking and resource bundling
- **Spatial Features**: Location-based resource discovery and services
- **Resource Analytics**: Usage statistics and availability optimization
- **Automated Governance**: AI-assisted rule creation and enforcement

> **TODO (post-MVP — PropertyRegime-driven governance defaults, resources.md §6.6)**:
> Implement a `GovernanceDefaultsEngine` that derives default governance rule templates from
> `PropertyRegime + ResourceNature` classification. For example, a `Nondominium` physical
> resource gets default rules for custody rotation, maintenance obligations, and access-for-use;
> a `Commons` digital resource gets default rules for attribution and remix licensing. The
> defaults are suggestions populated into `ResourceSpecification.governance_rules` at creation
> time; custodians can override them. See `resources.md §6.6`.

The Resource zome provides the foundational resource management infrastructure for the nondominium ecosystem, enabling ValueFlows-compliant resource sharing with embedded governance and comprehensive lifecycle tracking.
