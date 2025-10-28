# ValueFlows Compliance in Nondominium

This document describes how nondominium implements ValueFlows standards for economic resource sharing and ensures compliance with the ValueFlows vocabulary and patterns.

## ValueFlows Overview

ValueFlows is an open-source vocabulary and economic model for resource sharing networks. It provides standardized ways to describe:

- **Economic Resources**: Tangible and intangible resources that have economic value
- **Economic Events**: Actions that affect resources (production, consumption, transfer)
- **Processes**: Sequences of events that transform resources
- **Agents**: Economic actors who perform actions and hold resources
- **Commitments**: Agreements between agents for future resource exchanges

## Core ValueFlows Concepts in Nondominium

### 1. Economic Resources

Resources are the primary entities in the network, representing anything that can be used, consumed, or exchanged.

```rust
pub struct EconomicResource {
    // Resource specification defining what this resource is
    pub resource_specification: ActionHash,

    // Current state and classification
    pub current_state: String,
    pub classification: Option<String>,

    // Identification and tracking
    pub tracking_identifier: Option<String>,
    pub unit_of_effort: Option<String>,

    // Containment relationships (nested resources)
    pub contained_in: Option<ActionHash>,

    // Agent ownership and stewardship
    pub primary_accountable: Option<AgentPubKey>,
    pub owner: Option<AgentPubKey>,

    // Metadata
    pub agent_pub_key: AgentPubKey,
    pub created_at: Timestamp,
}
```

### 2. Resource Specifications

Define what types of resources exist and their properties.

```rust
pub struct ResourceSpecification {
    pub name: String,
    pub image_url: Option<String>,
    pub note: Option<String>,
    pub unit_of_effort: Option<String>,
    pub default_unit_of_resource: Option<String>,
    pub conforming_resource_classifications: Vec<String>,
    pub agent_pub_key: AgentPubKey,
    pub created_at: Timestamp,
}
```

### 3. Economic Events

Events represent all economic actions that affect resources.

```rust
pub struct EconomicEvent {
    // Action type (based on ValueFlows action vocabulary)
    pub action: String,  // "produce", "consume", "transfer", "use", etc.

    // Resource references
    pub resource_inventoried_as: Option<ActionHash>,
    pub to_resource_inventoried_as: Option<ActionHash>,

    // Quantities
    pub resource_quantity: Option<f64>,
    pub effort_quantity: Option<f64>,
    pub unit_of_resource: Option<String>,
    pub unit_of_effort: Option<String>,

    // Participants
    pub provider: AgentPubKey,
    pub receiver: AgentPubKey,

    // Timing and context
    pub has_point_in_time: Option<Timestamp>,
    pub has_beginning: Option<Timestamp>,
    pub has_end: Option<Timestamp>,
    pub due: Option<Timestamp>,

    // Additional information
    pub note: Option<String>,
    pub triggered_by: Option<ActionHash>,
    pub in_scope_of: Option<ActionHash>,

    // Metadata
    pub agent_pub_key: AgentPubKey,
    pub created_at: Timestamp,
}
```

### 4. Commitments

Commitments represent agreements between agents for future economic exchanges.

```rust
pub struct Commitment {
    // Participants
    pub provider: AgentPubKey,
    pub receiver: AgentPubKey,

    // Resource commitment
    pub resource_inventoried_as: Option<ActionHash>,
    pub resource_quantity: Option<f64>,
    pub unit_of_resource: Option<String>,
    pub effort_quantity: Option<f64>,
    pub unit_of_effort: Option<String>,

    // Timing
    pub created: Timestamp,
    pub due: Option<Timestamp>,
    pub has_beginning: Option<Timestamp>,
    pub has_end: Option<Timestamp>,

    // Plan context
    pub plan: Option<ActionHash>,
    pub independent_demand_of: Option<ActionHash>,

    // Additional information
    pub note: Option<String>,
    pub clause_of: Option<ActionHash>,

    // Metadata
    pub agent_pub_key: AgentPubKey,
    pub created_at: Timestamp,
}
```

## ValueFlows Actions Implementation

Nondominium implements the standard ValueFlows action vocabulary:

### Production Actions
- `produce` - Creating new resources
- `accept` - Accepting ownership of resources
- `modify` - Changing resource properties

### Distribution Actions
- `transfer` - Moving ownership between agents
- `move` - Moving resources between locations
- `deliver_service` - Providing services

### Consumption Actions
- `consume` - Using up resources
- `use` - Using resources without consuming them
- `work` - Applying labor/effort

### Exchange Actions
- `transfer-custody` - Temporary transfer of control
- `transfer-all-rights` - Complete ownership transfer
- `certify` - Quality verification
- `review` - Quality assessment

## Resource Lifecycle Management

### Creation Flow
1. **Resource Specification** created defining resource type
2. **Economic Resource** created linking to specification
3. **Production Event** creates initial resource quantity
4. **Agent Links** establish ownership/stewardship

### Transfer Flow
1. **Commitment** created between provider and receiver
2. **Transfer Event** records actual resource movement
3. **Resource Links** updated to reflect new ownership
4. **Audit Trail** maintained for transparency

### Consumption Flow
1. **Use Event** records resource utilization
2. **Consume Event** records resource depletion
3. **Resource State** updated accordingly
4. **Inventory** adjusted for availability

## Agent Roles and Capabilities

### Primary Agent Roles
- **Provider**: Offers resources to the network
- **Receiver**: Accepts resources from the network
- **Steward**: Manages resources on behalf of others
- **Transporter**: Moves resources between locations

### Capability-Based Access
```rust
pub struct ResourceCapability {
    pub resource: ActionHash,
    pub agent: AgentPubKey,
    pub capabilities: Vec<String>,  // "use", "transfer", "consume", etc.
    pub granted_by: AgentPubKey,
    pub expires_at: Option<Timestamp>,
    pub created_at: Timestamp,
}
```

## Measurement and Units

### Supported Unit Types
- **Count**: Discrete units (pieces, items)
- **Time**: Duration-based units (hours, days)
- **Weight**: Mass-based units (kg, lbs)
- **Volume**: Space-based units (liters, m³)
- **Custom**: Domain-specific units

### Quantity Handling
```rust
pub struct ResourceQuantity {
    pub has_numerical_value: f64,
    pub has_unit: String,
    pub resource_classified_as: Option<String>,
}
```

## Process Flows

### Production Process
1. **Resource Inputs** identified and allocated
2. **Transformation Events** recorded for each step
3. **Resource Outputs** created and inventoried
4. **Quality Verification** through certification events

### Exchange Process
1. **Commitment Agreement** established between agents
2. **Capability Verification** for access permissions
3. **Transfer Execution** with proper documentation
4. **Settlement Confirmation** completing the exchange

## Compliance Validation

### Entry Validation Rules
```rust
pub fn validate_economic_event(event: &EconomicEvent) -> Result<(), String> {
    // Validate action type
    if !VALID_ACTIONS.contains(&event.action.as_str()) {
        return Err("Invalid action type".to_string());
    }

    // Validate participants
    if event.provider == event.receiver {
        return Err("Provider and receiver must be different".to_string());
    }

    // Validate quantities
    if let (Some(qty), Some(unit)) = (&event.resource_quantity, &event.unit_of_resource) {
        if *qty <= 0.0 {
            return Err("Resource quantity must be positive".to_string());
        }
        if !VALID_UNITS.contains(unit.as_str()) {
            return Err("Invalid unit of resource".to_string());
        }
    }

    Ok(())
}
```

### Cross-Zone Consistency
- Resources must reference valid specifications
- Events must reference existing resources
- Commitments must have valid participants
- Links must maintain referential integrity

## Data Relationships

### Core Relationships
- **EconomicResource** → ResourceSpecification (defines resource type)
- **EconomicEvent** → EconomicResource (affects resource state)
- **Commitment** → EconomicResource (commits future resource exchange)
- **Agent** → EconomicResource (ownership/stewardship)

### Link Types for Relationships
```rust
pub enum LinkTypes {
    // Resource relationships
    ResourceToSpecification,
    ResourceToEvents,
    ResourceToCommitments,

    // Agent relationships
    AgentToResources,
    AgentToCommitments,
    AgentToCapabilities,

    // Event relationships
    EventToResource,
    EventToCommitment,

    // Discovery anchors
    ResourceAnchor,
    SpecificationAnchor,
    EventAnchor,
}
```

## Extension Points

### Custom Classifications
Projects can add domain-specific resource classifications:
- **Tools and Equipment**: Shared tool libraries
- **Knowledge Assets**: Educational resources, documentation
- **Physical Spaces**: Meeting rooms, workshops
- **Digital Resources**: Software, datasets, designs

### Specialized Actions
Domain-specific economic actions can be added:
- **Maintenance Actions**: Repair, calibration, upgrade
- **Learning Actions**: Training, skill development
- **Research Actions**: Investigation, experimentation
- **Creative Actions**: Design, content creation

## Integration Patterns

### With Existing Systems
- **ERP Systems**: Import/export resource catalogs
- **Time Tracking**: Map effort to ValueFlows events
- **Inventory Management**: Sync resource quantities
- **Project Management**: Map tasks to processes

### API Compliance
- **REST Endpoints**: Follow ValueFlows API patterns
- **Data Formats**: Use JSON-LD for semantic clarity
- **Identification**: Maintain consistent ID schemes
- **Timestamps**: Use ISO 8601 format

## Testing ValueFlows Compliance

### Validation Tests
1. **Action Vocabulary**: All events use valid action types
2. **Resource Lifecycle**: Proper creation, transfer, consumption flows
3. **Agent Relationships**: Valid participant roles and capabilities
4. **Quantity Handling**: Consistent units and measurements

### Integration Tests
1. **Multi-Agent Scenarios**: Complex resource exchange workflows
2. **Cross-Zome Consistency**: Data integrity across zomes
3. **Capability Enforcement**: Proper access control validation
4. **Audit Trail**: Complete transaction history maintenance