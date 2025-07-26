# Nondominium Architecture Overview

This document provides a comprehensive overview of the Nondominium Holochain application architecture, focusing on the cross-zome integration patterns, shared infrastructure, and development status.

## System Architecture

Nondominium is a **3-zome Holochain hApp** implementing ValueFlows-compliant resource sharing:

- **[`zome_person`](./person_zome.md)**: Agent identity, profiles, roles, capability-based access control
- **[`zome_resource`](./resource_zome.md)**: Resource specifications and lifecycle management (Phase 2)
- **`zome_gouvernance`**: Commitments, claims, economic events, governance rules (Planned)

### Technology Foundation
- **Backend**: Rust (Holochain HDK/HDI 0.5.x-0.6.x), WASM compilation
- **Data Model**: Agent-centric with public/private separation
- **Security**: Capability-based access using Holochain capability tokens
- **Compliance**: ValueFlows standard for economic resource management

## Cross-Zome Integration Patterns

### Person-Resource Integration
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

## Shared Infrastructure

### Signal Architecture

#### Resource Zome Signals
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

### Discovery Performance

#### Anchor Path Strategy
- **Categorized Discovery**: O(1) lookup by category/tag
- **Agent-Centric Queries**: Direct agent -> owned resources links
- **Versioning**: Efficient latest version resolution
- **Bulk Operations**: Optimized for large result sets

#### Link Tag Optimization
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

## Common Patterns

### Entry Creation Pattern
All zomes follow this standardized pattern for creating entries:

```rust
// Standard entry creation with discovery links
let entry = EntryType {
    field: value,
    agent_pub_key: agent_info.agent_initial_pubkey,
    created_at: sys_time()?,
};
let hash = create_entry(&EntryTypes::EntryType(entry.clone()))?;

// Create discovery anchor links
let path = Path::from("anchor_name");
create_link(path.path_entry_hash()?, hash.clone(), LinkTypes::AnchorType, LinkTag::new("tag"))?;
```

### Versioning Pattern
```rust
// Update pattern with version history tracking
let updated_entry = update_entry(input.previous_action_hash, &updated_data)?;
create_link(
    input.original_action_hash,
    updated_entry.clone(),
    LinkTypes::EntryUpdates,
    (),
)?;
```

### Discovery Pattern
```rust
// Efficient anchor-based discovery
let path = Path::from("discovery_anchor");
let links = get_links(
    GetLinksInputBuilder::try_new(path.path_entry_hash()?, LinkTypes::DiscoveryType)?.build(),
)?;
```

## Privacy Architecture

### Three-Layer Privacy Model

#### 1. Public Data Layer
- **Person entries**: Name, avatar, bio (discoverable by all agents)
- **Role assignments**: Role name, assignment metadata (auditable governance)
- **Resource specifications**: Name, description, category (community discovery)

#### 2. Private Data Layer  
- **PrivatePersonData entries**: PII, contact info (owner-only access)
- **Holochain Security**: Private entry visibility enforced by conductor

#### 3. Access-Controlled Layer
- **Role-based permissions**: Capability-driven resource access
- **Governance rules**: Community-managed access controls
- **Custodian permissions**: Resource-specific access rights

### Access Control Implementation
```rust
// Three-tier access pattern
match access_level {
    Public => {
        // Anyone can read public entries
        get_public_data(entry_hash)
    },
    Private => {
        // Only owner can access private entries  
        if caller == owner {
            get_private_data(entry_hash)
        } else {
            Err(NotAuthorized)
        }
    },
    RoleBased => {
        // Check role-based permissions
        let has_permission = check_role_capability(caller, required_role)?;
        if has_permission {
            get_controlled_data(entry_hash)
        } else {
            Err(InsufficientCapability)
        }
    }
}
```

## ValueFlows Compliance

### Agent-Centric Model
- **Agents as Economic Actors**: Every participant is an autonomous economic agent
- **Identity and Reputation**: Comprehensive agent profiles with role-based capabilities  
- **Decentralized Coordination**: No central authority, community-governed resource sharing

### Economic Resource Management
- **Resource Specifications**: Templates defining resource types and governance
- **Economic Resources**: Actual resource instances with clear custodianship
- **Governance Rules**: Community-defined access and usage policies
- **State Tracking**: Complete resource lifecycle management

### Compliance Implementation
```rust
// ValueFlows Economic Resource pattern
pub struct EconomicResource {
    pub conforms_to: ActionHash,        // ResourceSpecification compliance
    pub quantity: f64,                  // Measurable resource quantity
    pub unit: String,                  // Standard measurement unit
    pub custodian: AgentPubKey,        // Primary Accountable Agent
    pub current_location: Option<String>, // Resource location tracking
    pub state: ResourceState,          // Lifecycle state management
}
```

## Development Status

### Phase 1 (Complete) ✅
- **Person Management**: Comprehensive identity with privacy layers
- **Role-Based Access Control**: 8-level hierarchy with capability validation
- **Resource Specifications**: ValueFlows-compliant resource templates
- **Discovery Patterns**: Optimized anchor-based queries
- **Governance Foundation**: Rule embedding and enforcement framework
- **Cross-Zome Integration**: Authorization and capability checking

### Phase 2 (In Progress) 🔄
- **Economic Resource Lifecycle**: Complete resource instance management
- **Governance Rule Enforcement**: Active rule validation and enforcement
- **Resource Custody Transfer**: Ownership and responsibility transitions
- **Integration with Governance Zome**: Community decision-making workflows

### Phase 3 (Planned) 📋
- **Resource Booking System**: Temporal resource allocation
- **Economic Event Tracking**: Complete ValueFlows event logging
- **Advanced Governance**: Multi-stage approval workflows
- **Community Resource Protocols**: Sophisticated sharing mechanisms

## Performance Considerations

### Scalability Patterns
- **Anchor-Based Discovery**: O(1) category and tag lookups
- **Agent-Centric Links**: Direct ownership queries without scanning
- **Lazy Loading**: On-demand data retrieval for large datasets
- **Batch Operations**: Efficient bulk data processing

### Optimization Strategies
- **Link Tag Metadata**: Rich link information without record retrieval
- **Caching Strategies**: Strategic data caching for frequent queries
- **Pagination Support**: Large result set management
- **Selective Loading**: Component-based data loading

## Security Model

### Holochain Security Features
- **Agent Identity**: Cryptographic agent verification
- **Entry Validation**: Comprehensive validation rules per entry type
- **Private Entries**: Conductor-enforced privacy
- **Capability Tokens**: Fine-grained access control (planned)

### Application Security Layers  
- **Role-Based Authorization**: Hierarchical capability system
- **Governance Rule Validation**: Community-enforced access controls
- **Cross-Zome Verification**: Multi-zome authorization checks
- **Audit Trails**: Complete action history and attribution

## Error Handling Strategy

### Comprehensive Error Types
Each zome implements domain-specific error enums with:
- **Descriptive Messages**: Clear error descriptions for debugging
- **Error Categories**: Logical grouping of related failures
- **Recovery Guidance**: Information for error resolution
- **Cross-Zome Compatibility**: Consistent error handling patterns

### Error Propagation Pattern
```rust
// Standardized error handling across zomes
match operation_result {
    Ok(data) => Ok(data),
    Err(domain_error) => {
        error!("Operation failed: {:?}", domain_error);
        Err(WasmError::from(domain_error))
    }
}
```

## Testing Architecture

### Four-Layer Testing Strategy
1. **Foundation Tests**: Basic zome function calls and connectivity
2. **Integration Tests**: Cross-zome interactions and multi-agent scenarios
3. **Scenario Tests**: Complete user journeys and workflows  
4. **Performance Tests**: Load and stress testing (planned)

### Test Coverage Areas
- ✅ **Person Management**: Profiles, roles, privacy controls
- ✅ **Identity Storage**: Public/private data separation
- ✅ **Role Assignment**: Capability validation and enforcement
- 🔄 **Resource Management**: Specification and lifecycle (Phase 2)
- 🔄 **Governance Processes**: Rule enforcement (Phase 2)

This architecture provides a robust, scalable foundation for ValueFlows-compliant resource sharing with comprehensive agent identity management, privacy-preserving data controls, and efficient discovery patterns optimized for Holochain's agent-centric paradigm.