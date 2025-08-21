# Nondominium Architecture Overview

This document provides a comprehensive overview of the Nondominium Holochain application architecture, focusing on the cross-zome integration patterns, shared infrastructure, and development status.

## System Architecture

Nondominium is a **3-zome Holochain hApp** implementing ValueFlows-compliant resource sharing with embedded governance rules, structured Economic Processes, and cryptographically-secured reputation tracking:

- **[`zome_person`](./person_zome.md)**: Agent identity, profiles, roles, Private Participation Receipts (PPRs), capability-based access control
- **[`zome_resource`](./resource_zome.md)**: Resource specifications, Economic Resources, Economic Processes, lifecycle management
- **`zome_gouvernance`**: Commitments, claims, economic events, validation workflows, PPR issuance, governance rules

### Technology Foundation
- **Backend**: Rust (Holochain HDK/HDI 0.5.x-0.6.x), WASM compilation
- **Data Model**: Agent-centric with public/private separation, progressive trust model
- **Security**: Capability-based access using Holochain capability tokens (general → restricted → full)
- **Compliance**: ValueFlows standard for economic resource management with nondominium extensions
- **Governance**: Embedded rules, multi-reviewer validation, cryptographically-signed reputation tracking
- **Economic Processes**: Structured workflows (Use, Transport, Storage, Repair) with role-based access control

## Cross-Zome Integration Patterns

### Agent Capability Progression System
```rust
// Progressive trust model integration across all zomes
let agent_capability = get_person_capability_level(agent_pubkey)?;
match agent_capability.as_str() {
    "member" => {
        // Simple Agent: general capability token
        // Can create resources, make first transaction
    },
    "stewardship" => {
        // Accountable Agent: restricted capability token  
        // Can access resources, validate others, specialized processes
    },
    "coordination" | "governance" => {
        // Primary Accountable Agent: full capability token
        // Can hold custody, validate roles, dispute resolution
    }
}
```

### Economic Process Role Enforcement
```rust
// Cross-zome role validation for specialized processes
let process_type = "Transport"; // Use, Transport, Storage, Repair
let required_role = match process_type {
    "Use" => None, // Accessible to all Accountable Agents
    "Transport" => Some("Transport"),
    "Storage" => Some("Storage"), 
    "Repair" => Some("Repair"),
    _ => return Err(ProcessError::InvalidProcessType),
};

if let Some(role) = required_role {
    let has_role = has_person_role_capability((agent_pubkey, role.to_string()))?;
    if !has_role {
        return Err(ProcessError::InsufficientRole(role.to_string()));
    }
}
```

### PPR Integration Pattern
```rust
// Automatic PPR generation across commitment-claim-event cycles
let ppr_result = call(
    CallTargetCell::Local,
    "zome_gouvernance",
    "issue_participation_receipts".into(),
    None,
    &PPRIssuanceInput {
        commitment_hash: commitment.hash(),
        event_hash: economic_event.hash(),
        provider: commitment.provider,
        receiver: commitment.receiver,
        performance_metrics: calculate_performance_metrics(&commitment, &event)?,
        claim_type: determine_claim_type(&commitment.action, &process_context)?,
    },
)?;

// Store PPR privately in agent's source chain
let private_ppr = PrivateParticipationClaim {
    fulfills: commitment_hash,
    fulfilled_by: event_hash,
    claim_type: ppr_result.claim_type,
    performance_metrics: ppr_result.metrics,
    bilateral_signature: ppr_result.signature,
    // ... other fields
};

// PPRs stored as private entries in zome_person
call(
    CallTargetCell::Local,
    "zome_person",
    "store_participation_receipt".into(),
    None,
    &private_ppr,
)?;
```

### Resource-Governance Integration
```rust
// Resource validation triggering governance workflows
let resource_validation = ResourceValidation {
    resource: resource_hash,
    validation_scheme: "2-of-3".to_string(),
    required_validators: 2,
    current_validators: 0,
    status: "pending".to_string(),
};

// Cross-zome validation coordination
let governance_result = call(
    CallTargetCell::Local,
    "zome_gouvernance", 
    "initiate_resource_validation".into(),
    None,
    &resource_validation,
)?;

// Automatic PPR issuance for validation participation
let validation_pprs = call(
    CallTargetCell::Local,
    "zome_gouvernance",
    "issue_validation_participation_receipts".into(),
    None,
    &ValidationPPRInput {
        resource_hash,
        validator: agent_pubkey,
        validation_type: "resource_approval".to_string(),
    },
)?;
```

## Shared Infrastructure

### Signal Architecture

#### Enhanced Multi-Zome Signals
```rust
pub enum Signal {
    // Resource lifecycle signals
    EntryCreated { action, app_entry },
    EntryUpdated { action, app_entry, original_app_entry },
    EntryDeleted { action, original_app_entry },
    LinkCreated { action, link_type },
    LinkDeleted { action, link_type },
    
    // Economic Process signals  
    ProcessInitiated { process_hash, process_type, agent },
    ProcessCompleted { process_hash, completion_event, performance_metrics },
    ProcessValidated { process_hash, validator, approved },
    
    // PPR system signals
    PPRIssued { recipient, claim_type, counterparty },
    ReputationUpdated { agent, new_summary },
    
    // Governance workflow signals
    ValidationRequired { item_hash, validation_type, scheme },
    ValidationCompleted { item_hash, result, validators },
    AgentPromoted { agent, from_level, to_level },
}
```

**Real-time Updates**: Enables UI reactivity to all system changes
**Cross-Zome Coordination**: Supports complex workflows spanning multiple zomes
**PPR Integration**: Real-time reputation updates and participation tracking
**Process Management**: Live updates on Economic Process status and completion

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

### Four-Layer Privacy Model

#### 1. Public Data Layer
- **Person entries**: Name, avatar, bio (discoverable by all agents)
- **Role assignments**: Role name, assignment metadata (auditable governance)
- **Resource specifications**: Name, description, category (community discovery)
- **Economic events**: Public record of economic activities (audit trail)
- **Validation receipts**: Public governance validation records

#### 2. Private Data Layer  
- **PrivatePersonData entries**: PII, contact info (owner-only access)
- **PrivateParticipationClaims**: Cryptographically-signed reputation receipts (private entries)
- **Holochain Security**: Private entry visibility enforced by conductor

#### 3. Access-Controlled Layer
- **Role-based permissions**: Capability-driven resource access
- **Governance rules**: Community-managed access controls
- **Custodian permissions**: Resource-specific access rights
- **Process validation**: Specialized role validation for Economic Processes

#### 4. Derived Data Layer
- **Reputation summaries**: Calculated from private PPRs, selectively shared
- **Performance metrics**: Aggregated from participation claims
- **Trust scores**: Derived reputation indicators for decision-making

### Access Control Implementation
```rust
// Four-tier access pattern with PPR integration
match access_level {
    Public => {
        // Anyone can read public entries
        get_public_data(entry_hash)
    },
    Private => {
        // Only owner can access private entries (PPRs, PII)
        if caller == owner {
            get_private_data(entry_hash)
        } else {
            Err(NotAuthorized)
        }
    },
    RoleBased => {
        // Check role-based permissions for processes
        let has_permission = check_role_capability(caller, required_role)?;
        if has_permission {
            get_controlled_data(entry_hash)
        } else {
            Err(InsufficientCapability)
        }
    },
    ReputationBased => {
        // Access based on derived reputation metrics
        let reputation = get_agent_reputation_summary(caller)?;
        if reputation.meets_threshold(required_threshold) {
            get_reputation_gated_data(entry_hash)
        } else {
            Err(InsufficientReputation)
        }
    }
}
```

## Private Participation Receipt (PPR) System

### PPR Infrastructure Architecture

```rust
// PPR lifecycle: automatic generation for every economic interaction
pub struct PPRGenerationWorkflow {
    // 1. Commitment created
    commitment: Commitment,
    
    // 2. Economic event occurs
    event: EconomicEvent,
    
    // 3. Claim links commitment to event (public governance record)
    claim: Claim,
    
    // 4. Bi-directional PPRs automatically generated (private entries)
    provider_ppr: PrivateParticipationClaim,
    receiver_ppr: PrivateParticipationClaim,
}

// Cross-zome PPR coordination
impl PPRGenerationWorkflow {
    pub fn execute(&self) -> ExternResult<(ActionHash, ActionHash)> {
        // 1. Generate performance metrics
        let metrics = self.calculate_performance_metrics()?;
        
        // 2. Create cryptographic signatures
        let signatures = self.create_bilateral_signatures()?;
        
        // 3. Store PPRs as private entries in zome_person
        let provider_ppr_hash = self.store_provider_ppr(metrics.clone(), signatures.provider)?;
        let receiver_ppr_hash = self.store_receiver_ppr(metrics, signatures.receiver)?;
        
        // 4. Update agent reputation caches
        self.update_reputation_summaries()?;
        
        // 5. Emit signals for real-time UI updates
        self.emit_ppr_signals()?;
        
        Ok((provider_ppr_hash, receiver_ppr_hash))
    }
}
```

### PPR Categories and Issuance Patterns

```rust
// PPR issuance based on economic interaction context
pub fn determine_ppr_category(
    action: &VfAction,
    process_type: &str,
    agent_role: &str,
) -> Vec<ParticipationClaimType> {
    match (action, process_type, agent_role) {
        // Simple Agent first transaction
        (VfAction::InitialTransfer, _, "Simple Agent") => vec![
            ParticipationClaimType::ResourceContribution,
            ParticipationClaimType::NetworkValidation,
        ],
        
        // Core Use process
        (VfAction::Use, "Use", _) => vec![
            ParticipationClaimType::ServiceCommitmentAccepted,
            ParticipationClaimType::ServiceFulfillmentCompleted,
        ],
        
        // Specialized Transport process
        (VfAction::Work, "Transport", "Transport") => vec![
            ParticipationClaimType::TransportFulfillment,
            ParticipationClaimType::CustodyAcceptance,
        ],
        
        // Specialized Repair process  
        (VfAction::Modify, "Repair", "Repair") => vec![
            ParticipationClaimType::MaintenanceFulfillment,
            ParticipationClaimType::ServiceFulfillmentCompleted,
        ],
        
        // Custody transfer
        (VfAction::TransferCustody, _, _) => vec![
            ParticipationClaimType::ResponsibleTransfer,
            ParticipationClaimType::CustodyAcceptance,
        ],
        
        // Validation activities
        (_, _, "Validator") => vec![
            ParticipationClaimType::NetworkValidation,
            ParticipationClaimType::GovernanceCompliance,
        ],
        
        _ => vec![], // No PPR generation for this combination
    }
}
```

### Reputation Derivation and Selective Sharing

```rust
// Privacy-preserving reputation calculation
pub fn calculate_reputation_summary(agent: AgentPubKey) -> ExternResult<ReputationSummary> {
    // Access agent's private PPR collection
    let pprs = get_my_participation_claims()?;
    
    let mut summary = ReputationSummary {
        agent,
        total_interactions: pprs.len() as u32,
        average_timeliness: 0.0,
        average_quality: 0.0,
        average_reliability: 0.0,
        average_communication: 0.0,
        completion_rate: 0.0,
        role_performance: HashMap::new(),
        recent_activity: Vec::new(),
        calculated_at: sys_time()?,
    };
    
    // Aggregate metrics from private claims
    for ppr in pprs {
        summary.aggregate_metrics(&ppr.performance_metrics)?;
        summary.update_role_performance(&ppr)?;
        summary.track_recent_activity(&ppr)?;
    }
    
    summary.finalize_calculations();
    Ok(summary)
}

// Selective reputation sharing
pub fn share_reputation_summary(
    target_agent: AgentPubKey,
    sharing_scope: ReputationSharingScope,
) -> ExternResult<SelectiveReputationShare> {
    let full_summary = calculate_reputation_summary(agent_info()?.agent_initial_pubkey)?;
    
    match sharing_scope {
        ReputationSharingScope::Basic => {
            // Share only overall scores and completion rate
            SelectiveReputationShare::basic(full_summary)
        },
        ReputationSharingScope::RoleSpecific(role) => {
            // Share detailed metrics for specific role
            SelectiveReputationShare::role_specific(full_summary, role)
        },
        ReputationSharingScope::Comprehensive => {
            // Share detailed breakdown (requires higher trust level)
            SelectiveReputationShare::comprehensive(full_summary)
        },
    }
}
```

## ValueFlows Compliance

### Enhanced Agent-Centric Model
- **Agents as Economic Actors**: Every participant is an autonomous economic agent with progressive capability levels
- **Identity and Reputation**: Comprehensive agent profiles with role-based capabilities and cryptographically-signed reputation tracking
- **Decentralized Coordination**: No central authority, community-governed resource sharing with embedded governance rules
- **Process-Aware Interactions**: All economic activities occur within structured Economic Processes

### Comprehensive Economic Resource Management
- **Resource Specifications**: Templates defining resource types, embedded governance rules, and process requirements
- **Economic Resources**: Actual resource instances with clear custodianship and lifecycle tracking
- **Economic Processes**: Structured activities (Use, Transport, Storage, Repair) with role-based access control
- **Economic Events**: VfAction-based event tracking with automatic PPR generation
- **Governance Rules**: Community-defined access and usage policies enforced programmatically

### VfAction Enum Implementation
```rust
// Type-safe ValueFlows action representation with nondominium extensions
#[derive(Clone, PartialEq, Debug, Serialize, Deserialize)]
pub enum VfAction {
    // Standard ValueFlows actions
    Transfer, Move, Use, Consume, Produce, Work, Modify, 
    Combine, Separate, Raise, Lower, Cite, Accept,
    
    // nondominium-specific extensions
    InitialTransfer,    // Simple Agent first transaction
    AccessForUse,       // Request access commitment
    TransferCustody,    // Primary Accountable Agent custody transfer
}

impl VfAction {
    // Process-aware action classification
    pub fn requires_specialized_role(&self, process_type: &str) -> Option<String> {
        match (self, process_type) {
            (VfAction::Work, "Transport") => Some("Transport".to_string()),
            (VfAction::Work, "Storage") => Some("Storage".to_string()),
            (VfAction::Modify, "Repair") => Some("Repair".to_string()),
            (VfAction::Use, _) => None, // Accessible to all Accountable Agents
            _ => None,
        }
    }
    
    // PPR integration
    pub fn triggers_ppr_generation(&self) -> bool {
        matches!(self, 
            VfAction::InitialTransfer | VfAction::Use | 
            VfAction::Work | VfAction::Modify | 
            VfAction::TransferCustody
        )
    }
}
```

### Enhanced Compliance Implementation
```rust
// Comprehensive ValueFlows compliance with nondominium extensions
pub struct EconomicResource {
    pub conforms_to: ActionHash,         // ResourceSpecification compliance
    pub quantity: f64,                   // Measurable resource quantity
    pub unit: String,                   // Standard measurement unit
    pub custodian: AgentPubKey,         // Primary Accountable Agent
    pub current_location: Option<String>, // Resource location tracking
    pub state: ResourceState,           // Lifecycle state management
    pub governance_rules: Vec<GovernanceRule>, // Embedded governance
    pub validation_status: String,      // Peer validation status
    pub process_history: Vec<ActionHash>, // Economic Process audit trail
}

pub struct EconomicProcess {
    pub process_type: String,           // Use, Transport, Storage, Repair
    pub required_role: String,          // Role-based access control
    pub inputs: Vec<ActionHash>,        // Input resources
    pub outputs: Vec<ActionHash>,       // Output resources
    pub status: ProcessStatus,          // Process lifecycle state
    pub validation_requirements: ProcessValidationRequirements,
}

pub struct EconomicEvent {
    pub action: VfAction,               // Type-safe ValueFlows action
    pub provider: AgentPubKey,          // Agent providing
    pub receiver: AgentPubKey,          // Agent receiving
    pub resource_inventoried_as: ActionHash, // Affected resource
    pub input_of: Option<ActionHash>,   // Parent Economic Process
    pub ppr_generated: bool,            // Automatic PPR issuance flag
}
```

### Multi-Layered Ontology Support
```rust
// ValueFlows three-layer ontology implementation
pub enum OntologyLayer {
    Knowledge {
        // Resource specifications, governance rules, process templates
        resource_specs: Vec<ResourceSpecification>,
        governance_rules: Vec<GovernanceRule>,
        process_templates: Vec<ProcessTemplate>,
    },
    Plan {
        // Commitments, process initiations, validation workflows
        commitments: Vec<Commitment>,
        planned_processes: Vec<EconomicProcess>,
        validation_schemes: Vec<ValidationScheme>,
    },
    Observation {
        // Economic events, completed processes, issued PPRs
        economic_events: Vec<EconomicEvent>,
        completed_processes: Vec<CompletedProcess>,
        validation_receipts: Vec<ValidationReceipt>,
        participation_claims: Vec<PrivateParticipationClaim>,
    },
}
```

## Development Status

### Phase 1 (Complete) ✅
- **Person Management**: Comprehensive identity with three-tier privacy layers
- **Role-Based Access Control**: Progressive capability system (Simple → Accountable → Primary Accountable)
- **Resource Specifications**: ValueFlows-compliant resource templates with embedded governance rules
- **Discovery Patterns**: Optimized anchor-based queries with performance optimization
- **Governance Foundation**: Multi-reviewer validation schemes and rule enforcement framework
- **Cross-Zome Integration**: Authorization and capability checking across all three zomes
- **VfAction Enum**: Type-safe ValueFlows action implementation with nondominium extensions

### Phase 2 (Complete) ✅
- **Economic Resource Lifecycle**: Complete resource instance management with state tracking
- **Economic Process Management**: Structured processes (Use, Transport, Storage, Repair) with role-based access
- **Governance Rule Enforcement**: Active rule validation and programmatic enforcement
- **Resource Custody Transfer**: Primary Accountable Agent custody management with audit trails
- **PPR System Implementation**: Private Participation Receipt generation and reputation tracking
- **Validation Workflows**: Multi-signature validation with configurable schemes
- **Agent Progression**: Simple Agent promotion to Accountable Agent through validated transactions

### Phase 2 (In Progress) 🔄
- **End-of-Life Management**: Resource decommissioning with enhanced validation requirements
- **Dispute Resolution**: Edge-based conflict resolution involving recent interaction partners
- **Performance Optimization**: Large-scale testing and efficiency improvements
- **UI Integration**: Comprehensive frontend implementation of all governance workflows

### Phase 3 (Planned) 📋
- **Advanced Governance Engine**: Conditional logic and smart contract-like governance rules
- **Cross-Network Federation**: Multi-network resource sharing and governance coordination
- **Advanced Reputation Algorithms**: Machine learning-based trust prediction and recommendation systems
- **Economic Incentive Mechanisms**: Value accounting and contribution-based incentive systems
- **Automated Compliance Monitoring**: Real-time governance rule compliance checking and enforcement

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

### Comprehensive Four-Layer Testing Strategy
1. **Foundation Tests**: Basic zome function calls, connectivity, and individual component validation
2. **Integration Tests**: Cross-zome interactions, multi-agent scenarios, and PPR generation workflows
3. **Scenario Tests**: Complete user journeys, Economic Process workflows, and governance validation cycles
4. **Performance Tests**: Load and stress testing for large-scale deployment (in progress)

### Test Coverage Areas
- ✅ **Person Management**: Profiles, roles, privacy controls, PPR storage and retrieval
- ✅ **Identity Storage**: Public/private data separation, selective sharing mechanisms
- ✅ **Role Assignment**: Capability validation, specialized role validation, agent progression
- ✅ **Resource Management**: Specifications, Economic Resources, lifecycle management, embedded governance
- ✅ **Governance Processes**: Rule enforcement, validation workflows, multi-reviewer schemes
- ✅ **Economic Processes**: Use, Transport, Storage, Repair processes with role-based access control
- ✅ **PPR System**: Bi-directional receipt generation, cryptographic signatures, reputation derivation
- ✅ **Agent Progression**: Simple Agent promotion workflows, validation participation
- 🔄 **End-of-Life Management**: Resource decommissioning with enhanced security validation
- 🔄 **Dispute Resolution**: Edge-based conflict resolution mechanisms
- 📋 **Performance Optimization**: Large-scale network behavior and efficiency testing

This architecture provides a comprehensive, production-ready foundation for ValueFlows-compliant resource sharing with advanced governance capabilities, including:

- **Progressive Trust Model**: Three-tier agent capability system ensuring appropriate access control
- **Economic Process Management**: Structured workflows with role-based access and automatic validation
- **Privacy-Preserving Reputation**: Cryptographically-signed PPR system enabling trust without compromising privacy
- **Embedded Governance**: Community-defined rules enforced programmatically across all interactions
- **Cross-Zome Integration**: Seamless coordination between identity, resource, and governance systems
- **Type-Safe Operations**: VfAction enum ensuring ValueFlows compliance with compile-time validation
- **Scalable Infrastructure**: Optimized discovery patterns and performance considerations for large-scale deployment

The system demonstrates how decentralized, agent-centric architectures can support sophisticated governance models while maintaining the core principles of nondominium resources: organization-agnostic, capture-resistant, and permissionless access under transparent community governance.