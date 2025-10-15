# Governance Zome (`zome_gouvernance`) Documentation

The Governance zome implements the core economic coordination and validation infrastructure for the nondominium ecosystem, providing ValueFlows-compliant economic event logging, comprehensive governance workflows, agent capability progression system, Economic Process validation, Private Participation Receipt (PPR) issuance, and seamless cross-zome integration. It serves as the governance backbone enabling decentralized resource sharing with embedded accountability and reputation tracking.

## Core Data Structures

### VfAction Enum
```rust
pub enum VfAction {
    // Standard ValueFlows transfer actions
    Transfer,        // Transfer ownership/custody
    Move,           // Move a resource from one location to another

    // Standard ValueFlows production/consumption actions
    Use,            // Use a resource without consuming it
    Consume,        // Consume/destroy a resource
    Produce,        // Create/produce a new resource
    Work,           // Apply work/labor to a resource

    // Standard ValueFlows modification actions
    Modify,         // Modify an existing resource
    Combine,        // Combine multiple resources
    Separate,       // Separate one resource into multiple

    // Standard ValueFlows quantity adjustment actions
    Raise,          // Increase quantity/value of a resource
    Lower,          // Decrease quantity/value of a resource

    // Standard ValueFlows citation/reference actions
    Cite,           // Reference or cite a resource
    Accept,         // Accept delivery or responsibility

    // nondominium-specific actions
    InitialTransfer, // First transfer by a Simple Agent
    AccessForUse,    // Request access to use a resource
    TransferCustody, // Transfer custody (nondominium specific)
}
```

**ValueFlows Compliance**: Complete economic action vocabulary supporting all standard and nondominium-specific actions
**Economic Process Integration**: Actions mapped to structured processes (Use, Transport, Storage, Repair) with role-based access control
**Helper Methods**: Resource validation, quantity modification, custody change detection, specialized role requirements
**PPR Integration**: Automatic Private Participation Receipt generation for reputation tracking
**Type Safety**: Replaces string-based actions with type-safe enum ensuring compile-time validation

### VfAction Helper Methods
```rust
impl VfAction {
    pub fn requires_existing_resource(&self) -> bool;  // Resource validation
    pub fn creates_resource(&self) -> bool;            // New resource detection
    pub fn modifies_quantity(&self) -> bool;           // Quantity change detection
    pub fn changes_custody(&self) -> bool;             // Custody transfer detection
    
    // Economic Process integration methods
    pub fn requires_specialized_role(&self, process_type: &str) -> Option<String>; // Role requirements
    pub fn triggers_ppr_generation(&self) -> bool;                                 // PPR automation
    pub fn get_validation_requirements(&self, process_type: &str) -> ValidationRequirements; // Process validation
}
```

**Process Integration**: Determines role requirements for specialized Economic Processes
**PPR Automation**: Identifies actions that trigger automatic Private Participation Receipt issuance
**Validation Support**: Provides process-specific validation requirements

### ValidationReceipt Entry
```rust
pub struct ValidationReceipt {
    pub validator: AgentPubKey,           // Agent providing validation
    pub validated_item: ActionHash,       // Item being validated (Resource, Event, etc.)
    pub validation_type: String,          // Type: "resource_approval", "agent_promotion", "role_validation"
    pub approved: bool,                   // Validation result
    pub notes: Option<String>,            // Optional validation notes
    pub validated_at: Timestamp,          // Validation timestamp
}
```

**Governance**: Core validation infrastructure for all governance workflows
**Audit Trail**: Complete tracking of all community validations
**Flexibility**: Supports multiple validation types with contextual notes

### EconomicEvent Entry
```rust
pub struct EconomicEvent {
    pub action: VfAction,                 // Economic action performed
    pub provider: AgentPubKey,            // Agent providing the resource/service
    pub receiver: AgentPubKey,            // Agent receiving the resource/service
    pub resource_inventoried_as: ActionHash, // Link to the EconomicResource
    pub affects: ActionHash,              // Link to the affected EconomicResource
    pub resource_quantity: f64,           // Quantity involved in the event
    pub event_time: Timestamp,            // When the event occurred
    pub note: Option<String>,             // Optional event description
}
```

**ValueFlows Compliance**: Complete economic event specification
**Resource Tracking**: Links to affected resources for audit trails
**Action Integration**: Uses type-safe VfAction enum

### Commitment Entry
```rust
pub struct Commitment {
    pub action: VfAction,                     // Committed action
    pub provider: AgentPubKey,                // Agent making the commitment
    pub receiver: AgentPubKey,                // Agent receiving the commitment
    pub resource_inventoried_as: Option<ActionHash>, // Specific resource if applicable
    pub resource_conforms_to: Option<ActionHash>,    // ResourceSpecification for general commitments
    pub input_of: Option<ActionHash>,         // Optional link to a Process (future)
    pub due_date: Timestamp,                  // Commitment deadline
    pub note: Option<String>,                 // Commitment description
    pub committed_at: Timestamp,              // When commitment was made
}
```

**ValueFlows Compliance**: Complete commitment specification
**Flexibility**: Supports both specific resource and general specification commitments
**Process Integration**: Ready for future process workflow integration

### Claim Entry
```rust
pub struct Claim {
    pub fulfills: ActionHash,             // Link to the Commitment being fulfilled
    pub fulfilled_by: ActionHash,         // Link to the fulfilling EconomicEvent
    pub claimed_at: Timestamp,            // When claim was made
    pub note: Option<String>,             // Optional fulfillment notes
}
```

**ValueFlows Compliance**: Commitment fulfillment tracking
**Audit Trail**: Links commitments to their actual fulfillment events

### ResourceValidation Entry
```rust
pub struct ResourceValidation {
    pub resource: ActionHash,             // Link to EconomicResource being validated
    pub validation_scheme: String,        // Validation scheme: "simple_approval", "2-of-3"
    pub required_validators: u32,         // Number of validators required
    pub current_validators: u32,          // Current number of validators
    pub status: String,                   // Status: "pending", "approved", "rejected"
    pub created_at: Timestamp,            // When validation was initiated
    pub updated_at: Timestamp,            // Last status update
}
```

**Governance**: Resource approval workflow management
**Flexibility**: Configurable validation schemes for different resource types
**Progress Tracking**: Real-time validation progress monitoring

### Private Participation Receipt (PPR) Data Structures

#### PrivateParticipationClaim Entry (Private Entry)
```rust
pub struct PrivateParticipationClaim {
    // Standard ValueFlows fields
    pub fulfills: ActionHash,                    // Link to the Commitment fulfilled
    pub fulfilled_by: ActionHash,                // Link to the resulting EconomicEvent
    pub claimed_at: Timestamp,                   // When the claim was created
    
    // PPR-specific extensions
    pub claim_type: ParticipationClaimType,      // Type of participation claimed
    pub counterparty: AgentPubKey,               // The other agent involved
    pub performance_metrics: PerformanceMetrics, // Quantitative performance measures
    pub bilateral_signature: CryptographicSignature, // Cryptographic proof of agreement
    pub interaction_context: String,             // Context: "resource_creation", "custody_transfer", etc.
    pub role_context: Option<String>,            // Specific role context (Transport, Repair, Storage)
    pub resource_reference: Option<ActionHash>,  // Link to resource involved
}
```

**Privacy**: Stored as Holochain private entry accessible only to owning agent
**Bi-directional**: Every economic interaction generates exactly 2 receipts between participating agents
**Cryptographic Integrity**: All receipts cryptographically signed for authenticity
**Reputation Foundation**: Enables privacy-preserving reputation derivation

#### ParticipationClaimType Enum
```rust
pub enum ParticipationClaimType {
    // Genesis Role - Network Entry
    ResourceContribution,              // Successfully creating and validating a Resource
    NetworkValidation,                 // Performing validation duties
    
    // Core Usage Role - Custodianship
    ResponsibleTransfer,               // Properly transferring Resource custody
    CustodyAcceptance,                 // Accepting Resource custody responsibly
    
    // Intermediate Roles - Specialized Services
    ServiceCommitmentAccepted,         // Accepting service commitments
    GoodFaithTransfer,                 // Transferring Resource in good faith for service
    ServiceFulfillmentCompleted,       // Completing services successfully
    MaintenanceFulfillment,            // Completing maintenance/repair service
    StorageFulfillment,                // Completing storage service
    TransportFulfillment,              // Completing transport service
    
    // Network Governance
    DisputeResolutionParticipation,    // Constructive dispute resolution participation
    GovernanceCompliance,              // Consistent adherence to governance protocols
    EndOfLifeDeclaration,              // Declaring Resource end-of-life
    EndOfLifeValidation,               // Validating Resource end-of-life
}
```

**Process Integration**: Each Economic Process type generates specific PPR categories
**Context-Aware**: PPR types reflect the actual governance context and agent roles involved

#### PerformanceMetrics Structure
```rust
pub struct PerformanceMetrics {
    pub timeliness_score: f64,                    // Promptness in fulfilling commitments (0.0-1.0)
    pub quality_score: f64,                       // Quality of service provided (0.0-1.0)
    pub reliability_score: f64,                   // Consistency and dependability (0.0-1.0)
    pub communication_score: f64,                 // Effectiveness of communication (0.0-1.0)
    pub completion_rate: f64,                     // Percentage of commitments successfully completed
    pub resource_condition_maintained: Option<bool>, // Whether resource condition was maintained
    pub additional_metrics: Option<String>,       // JSON-encoded context-specific metrics
}
```

**Quantitative Tracking**: Enables objective performance assessment across all interactions
**Service Quality**: Supports quality assurance for specialized Economic Processes
**Reputation Input**: Provides data for privacy-preserving reputation calculation

### Economic Process Data Structures

#### ProcessValidationRequirements Entry
```rust
pub struct ProcessValidationRequirements {
    pub process_type: String,                     // "Use", "Transport", "Storage", "Repair"
    pub required_role: Option<String>,            // Role required to initiate process
    pub minimum_validators: u32,                  // Minimum validators required for completion
    pub validation_scheme: String,                // Validation scheme to use
    pub completion_validation_required: bool,     // Whether completion needs separate validation
    pub performance_thresholds: PerformanceThresholds, // Minimum performance requirements
    pub special_requirements: Vec<String>,        // Any special requirements for this process type
}
```

**Process Governance**: Defines validation requirements for each Economic Process type
**Role Integration**: Links process access to agent capability progression system
**Quality Assurance**: Ensures minimum performance standards for service delivery

## API Functions

### Validation Receipt Management

#### `create_validation_receipt(input: CreateValidationReceiptInput) -> ExternResult<CreateValidationReceiptOutput>`
Creates a new validation receipt for governance workflows.

**Input**:
```rust
pub struct CreateValidationReceiptInput {
    pub validated_item: ActionHash,       // Item being validated
    pub validation_type: String,          // Validation context
    pub approved: bool,                   // Validation result
    pub notes: Option<String>,            // Optional notes
}
```

**Output**:
```rust
pub struct CreateValidationReceiptOutput {
    pub receipt_hash: ActionHash,
    pub receipt: ValidationReceipt,
}
```

**Business Logic**:
- Records validator identity and timestamp
- Creates discovery links for audit trails
- Links receipt to validated item
- Supports all governance validation types

**Discovery Links Created**:
- Global discovery: `all_validation_receipts anchor -> receipt_hash`
- Item validation: `validated_item -> receipt_hash`

#### `get_validation_history(item_hash: ActionHash) -> ExternResult<Vec<ValidationReceipt>>`
Retrieves complete validation history for any validated item.

**Usage**: Audit trails for resources, agents, roles, and processes
**Performance**: Efficient validation history queries

#### `get_all_validation_receipts() -> ExternResult<Vec<ValidationReceipt>>`
Gets all validation receipts in the network for governance oversight.

### Resource Validation Management

#### `create_resource_validation(input: CreateResourceValidationInput) -> ExternResult<CreateResourceValidationOutput>`
Initiates a resource validation workflow.

**Input**:
```rust
pub struct CreateResourceValidationInput {
    pub resource: ActionHash,             // Resource to validate
    pub validation_scheme: String,        // Validation requirements
    pub required_validators: u32,         // Number of validators needed
}
```

**Validation Schemes**: "simple_approval", "2-of-3", "majority_consensus"
**Progress Tracking**: Real-time validation status updates

#### `check_validation_status(resource_hash: ActionHash) -> ExternResult<Option<ResourceValidation>>`
Checks current validation status for a resource.

**Returns**: Current validation state or None if no validation exists
**Usage**: Resource status checking across zomes

### Cross-Zome Validation Functions

#### `validate_new_resource(input: ValidateNewResourceInput) -> ExternResult<ValidateNewResourceOutput>`
Cross-zome function called by resource zome during resource creation.

**Input**:
```rust
pub struct ValidateNewResourceInput {
    pub resource_hash: ActionHash,
    pub resource_spec_hash: ActionHash,
    pub creator: AgentPubKey,
    pub validation_scheme: String,
}
```

**Output**:
```rust
pub struct ValidateNewResourceOutput {
    pub validation_hash: ActionHash,
    pub validation_required: bool,
    pub status: String,
}
```

**Governance Integration**: Implements REQ-GOV-02 (Resource Validation)
**Workflow**: Automatically initiates community validation for new resources

#### `validate_agent_identity(input: ValidateAgentIdentityInput) -> ExternResult<ValidateAgentIdentityOutput>`
Cross-zome function for Simple Agent → Accountable Agent promotion.

**Input**:
```rust
pub struct ValidateAgentIdentityInput {
    pub agent: AgentPubKey,
    pub resource_hash: ActionHash,        // Their first resource
    pub private_data_hash: Option<ActionHash>, // Identity verification
}
```

**Output**:
```rust
pub struct ValidateAgentIdentityOutput {
    pub validation_receipt_hash: ActionHash,
    pub promotion_approved: bool,
    pub new_capability_level: String,
}
```

**Governance Integration**: Implements REQ-GOV-03 (Agent Validation)
**Capability Progression**: Enables agent advancement through governance validation

#### `validate_specialized_role(input: ValidateSpecializedRoleInput) -> ExternResult<ValidateSpecializedRoleOutput>`
Cross-zome function for specialized role validation (Transport, Repair, Storage).

**Input**:
```rust
pub struct ValidateSpecializedRoleInput {
    pub agent: AgentPubKey,
    pub requested_role: String,           // Transport, Repair, Storage
    pub credentials: Option<String>,      // Supporting credentials
    pub validation_history: Option<ActionHash>, // Previous validations
}
```

**Output**:
```rust
pub struct ValidateSpecializedRoleOutput {
    pub validation_receipt_hash: ActionHash,
    pub role_approved: bool,
    pub role_granted: String,
}
```

**Governance Integration**: Implements REQ-GOV-04 (Specialized Role Validation)
**Role Progression**: Enables specialized capability acquisition

### Economic Event Management

#### `log_economic_event(input: LogEconomicEventInput) -> ExternResult<LogEconomicEventOutput>`
Records economic events for resource transactions and process activities.

**Input**:
```rust
pub struct LogEconomicEventInput {
    pub action: VfAction,                 // Type-safe economic action
    pub provider: AgentPubKey,            // Service/resource provider
    pub receiver: AgentPubKey,            // Service/resource receiver
    pub resource_inventoried_as: ActionHash, // Affected resource
    pub resource_quantity: f64,           // Quantity involved
    pub note: Option<String>,             // Event description
}
```

**Output**:
```rust
pub struct LogEconomicEventOutput {
    pub event_hash: ActionHash,
    pub event: EconomicEvent,
}
```

**ValueFlows Compliance**: Complete economic event recording
**Resource Integration**: Links events to affected resources
**Discovery Links**: Creates searchable audit trails

#### `log_initial_transfer(input: LogInitialTransferInput) -> ExternResult<LogInitialTransferOutput>`
Specialized function for Simple Agent first transactions.

**Input**:
```rust
pub struct LogInitialTransferInput {
    pub resource_hash: ActionHash,
    pub receiver: AgentPubKey,
    pub quantity: f64,
}
```

**Governance Trigger**: Initiates Simple Agent promotion workflow
**Special Handling**: Uses VfAction::InitialTransfer for governance tracking

#### Economic Event Query Functions
- `get_all_economic_events() -> ExternResult<Vec<EconomicEvent>>`
- `get_events_for_resource(resource_hash: ActionHash) -> ExternResult<Vec<EconomicEvent>>`
- `get_events_for_agent(agent: AgentPubKey) -> ExternResult<Vec<EconomicEvent>>`

**Performance**: Efficient event discovery and filtering
**Audit Trails**: Complete transaction history for resources and agents

### Private Participation Receipt (PPR) Management

#### `issue_participation_receipts(input: IssueParticipationReceiptsInput) -> ExternResult<IssueParticipationReceiptsOutput>`
Issues bi-directional Private Participation Claims for both agents involved in an economic interaction.

**Input**:
```rust
pub struct IssueParticipationReceiptsInput {
    pub commitment_hash: ActionHash,              // The commitment being fulfilled
    pub event_hash: ActionHash,                   // The fulfilling economic event
    pub counterparty: AgentPubKey,                // The other agent involved
    pub performance_metrics: PerformanceMetrics, // Performance assessment
    pub interaction_context: String,              // Context of interaction
    pub role_context: Option<String>,             // Role-specific context
}
```

**Output**:
```rust
pub struct IssueParticipationReceiptsOutput {
    pub provider_receipt_hash: ActionHash,        // Provider's PPR
    pub receiver_receipt_hash: ActionHash,        // Receiver's PPR
    pub claim_types_issued: (ParticipationClaimType, ParticipationClaimType), // Types for each agent
}
```

**Business Logic**:
- Automatically triggered for every completed Commitment-Claim-Event cycle
- Creates bi-directional receipts with appropriate ParticipationClaimType for each agent
- Links receipts to the fulfilling EconomicEvent and original Commitment
- Stores receipts as private entries accessible only to owning agents
- Generates context-aware claim types based on Economic Process type and agent roles

#### `sign_participation_claim(input: SignParticipationClaimInput) -> ExternResult<SignParticipationClaimOutput>`
Adds cryptographic signature to a participation claim to complete the bi-directional receipt process.

**Input**:
```rust
pub struct SignParticipationClaimInput {
    pub claim_hash: ActionHash,                   // PPR to sign
    pub signature: CryptographicSignature,       // Cryptographic signature
}
```

**Cryptographic Integrity**: Ensures authenticity and prevents manipulation
**Bilateral Agreement**: Completes the mutual validation of economic interactions

#### `validate_participation_claim_signature(input: ValidateParticipationClaimSignatureInput) -> ExternResult<bool>`
Validates the cryptographic signature of a participation claim for authenticity verification.

**Input**:
```rust
pub struct ValidateParticipationClaimSignatureInput {
    pub claim_hash: ActionHash,                   // PPR to validate
    pub expected_signer: AgentPubKey,             // Expected signing agent
}
```

**Security**: Prevents falsified participation claims
**Trust**: Enables verification of bilateral agreement authenticity

#### `get_my_participation_claims() -> ExternResult<Vec<PrivateParticipationClaim>>`
Returns all Private Participation Receipts for the calling agent.

**Privacy**: Only returns agent's own private receipts
**Reputation Input**: Provides data for reputation summary calculation

#### `derive_reputation_summary(input: DeriveReputationSummaryInput) -> ExternResult<ReputationSummary>`
Calculates aggregated reputation metrics from an agent's Private Participation Claims.

**Input**:
```rust
pub struct DeriveReputationSummaryInput {
    pub time_range: Option<(Timestamp, Timestamp)>, // Optional time range filter
    pub role_filter: Option<String>,                 // Optional role-specific summary
    pub include_recent_activity: bool,               // Whether to include recent interaction details
}
```

**Privacy-Preserving**: Calculation performed locally, agent controls sharing
**Selective Disclosure**: Agents can generate role-specific or time-bounded summaries
**Comprehensive**: Aggregates performance across all interaction types

### Commitment Management

#### `propose_commitment(input: ProposeCommitmentInput) -> ExternResult<ProposeCommitmentOutput>`
Creates a commitment for future resource provision or service delivery.

**Input**:
```rust
pub struct ProposeCommitmentInput {
    pub action: VfAction,                 // Committed action
    pub resource_hash: Option<ActionHash>, // Specific resource
    pub resource_spec_hash: Option<ActionHash>, // General specification
    pub provider: AgentPubKey,            // Committing agent
    pub due_date: Timestamp,              // Commitment deadline
    pub note: Option<String>,             // Commitment details
}
```

**Flexibility**: Supports both specific resource and general specification commitments
**ValueFlows Integration**: Complete commitment workflow support

#### `claim_commitment(input: ClaimCommitmentInput) -> ExternResult<ClaimCommitmentOutput>`
Claims fulfillment of a previously made commitment.

**Input**:
```rust
pub struct ClaimCommitmentInput {
    pub commitment_hash: ActionHash,      // Commitment being fulfilled
    pub fulfillment_note: Option<String>, // Fulfillment details
}
```

**Validation**: Verifies commitment exists and hasn't been claimed
**Audit Trail**: Links claims to original commitments

#### Commitment Query Functions
- `get_all_commitments() -> ExternResult<Vec<Commitment>>`
- `get_commitments_for_agent(agent: AgentPubKey) -> ExternResult<Vec<Commitment>>`
- `get_all_claims() -> ExternResult<Vec<Claim>>`
- `get_claims_for_commitment(commitment_hash: ActionHash) -> ExternResult<Vec<Claim>>`

## Link Architecture

### Discovery Links
- **AllValidationReceipts**: `all_validation_receipts anchor -> receipt_hash` - Global validation discovery
- **AllEconomicEvents**: `all_economic_events anchor -> event_hash` - Global event discovery
- **AllCommitments**: `all_commitments anchor -> commitment_hash` - Global commitment discovery
- **AllClaims**: `all_claims anchor -> claim_hash` - Global claim discovery
- **AllResourceValidations**: `all_resource_validations anchor -> validation_hash` - Global resource validation discovery
- **AllProcessValidationRequirements**: `all_process_requirements anchor -> requirements_hash` - Global process validation requirements

### Validation Links
- **ValidatedItemToReceipt**: `validated_item -> receipt_hash` - Item validation history
- **ResourceToValidation**: `resource_hash -> validation_hash` - Resource validation tracking
- **ProcessToValidationRequirements**: `process_type -> requirements_hash` - Process validation requirements

### Economic Event Links
- **ResourceToEvent**: `resource_hash -> event_hash` - Resource transaction history
- **ProcessToEvent**: `process_hash -> event_hash` - Economic Process event tracking
- **AgentToEvents**: `agent_pubkey -> event_hash` - Agent economic activity history

### Commitment Links
- **CommitmentToClaim**: `commitment_hash -> claim_hash` - Commitment fulfillment tracking
- **ProcessToCommitment**: `process_hash -> commitment_hash` - Economic Process commitment tracking

### Private Participation Receipt Links
*Note: PPRs are stored as private entries, so no DHT links are created for privacy preservation*
- PPRs are linked internally within each agent's source chain
- Reputation derivation performed locally from agent's own PPR collection
- Selective sharing controlled entirely by owning agent

## Error Handling

### GovernanceError Types
```rust
pub enum GovernanceError {
    ValidationReceiptNotFound(String),    // Validation lookup failures
    EconomicEventNotFound(String),        // Event lookup failures
    ResourceValidationNotFound(String),   // Resource validation failures
    CommitmentNotFound(String),           // Commitment lookup failures
    ClaimNotFound(String),                // Claim lookup failures
    PPRNotFound(String),                  // Private Participation Receipt lookup failures
    ProcessValidationNotFound(String),    // Process validation failures
    NotAuthorizedValidator,               // Validation authorization failures
    InsufficientCapability(String),       // Capability level failures
    ValidationAlreadyExists(String),      // Duplicate validation prevention
    InvalidValidationScheme(String),      // Validation scheme errors
    ValidationFailed(String),             // General validation failures
    PPRGenerationFailed(String),          // PPR issuance failures
    SignatureValidationFailed(String),    // Cryptographic signature failures
    SerializationError(String),           // Data serialization issues
    EntryOperationFailed(String),         // DHT operation failures
    LinkOperationFailed(String),          // Link operation failures
    InvalidInput(String),                 // Input validation failures
    CrossZomeCallFailed(String),          // Cross-zome communication failures
}
```

### Cross-Zome Error Coordination
```rust
// Standardized error translation for consistent cross-zome error handling
impl From<ResourceError> for GovernanceError {
    fn from(error: ResourceError) -> Self {
        match error {
            ResourceError::GovernanceViolation(msg) => GovernanceError::ValidationFailed(msg),
            ResourceError::InsufficientRole(msg) => GovernanceError::InsufficientCapability(msg),
            ResourceError::ProcessValidationFailed(msg) => GovernanceError::ValidationFailed(msg),
            ResourceError::CrossZomeCallFailed(msg) => GovernanceError::CrossZomeCallFailed(msg),
            _ => GovernanceError::CrossZomeCallFailed(format!("Resource zome error: {}", error)),
        }
    }
}

impl From<PersonError> for GovernanceError {
    fn from(error: PersonError) -> Self {
        match error {
            PersonError::RoleNotFound(msg) => GovernanceError::InsufficientCapability(msg),
            PersonError::NotAuthor => GovernanceError::NotAuthorizedValidator,
            PersonError::InvalidInput(msg) => GovernanceError::InvalidInput(msg),
            _ => GovernanceError::CrossZomeCallFailed(format!("Person zome error: {}", error)),
        }
    }
}

// Unified error handling for cross-zome operations
pub fn handle_cross_zome_governance_error<T, E: Into<GovernanceError>>(
    result: Result<T, E>, 
    operation: &str
) -> Result<T, GovernanceError> {
    result.map_err(|e| {
        let gov_error = e.into();
        // Log the operation context for better debugging
        match &gov_error {
            GovernanceError::CrossZomeCallFailed(msg) => {
                GovernanceError::CrossZomeCallFailed(format!("{} operation failed: {}", operation, msg))
            },
            _ => gov_error
        }
    })
}
```

**Comprehensive Coverage**: All governance operation failure modes
**Cross-Zome Integration**: Special handling for inter-zome communication errors

## Cross-Zome Integration

### Integration with Resource Zome

#### Automatic Resource Validation
```rust
// Called automatically during resource creation
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

#### Economic Process Validation
```rust
// Called during Economic Process completion
let process_validation = call(
    CallTargetCell::Local,
    "zome_gouvernance",
    "validate_process_completion".into(),
    None,
    &ValidateProcessCompletionInput {
        process_hash: process_hash.clone(),
        completion_evidence: completion_data,
        performance_metrics: process_metrics,
    },
)?;
```

#### PPR Issuance for Resource Activities
```rust
// Automatic PPR generation for resource transactions
let ppr_result = call(
    CallTargetCell::Local,
    "zome_gouvernance",
    "issue_participation_receipts".into(),
    None,
    &IssueParticipationReceiptsInput {
        commitment_hash: commitment_hash.clone(),
        event_hash: economic_event_hash,
        counterparty: counterparty_agent,
        performance_metrics: transaction_metrics,
        interaction_context: "custody_transfer".to_string(),
        role_context: None, // or Some("Transport") for specialized processes
    },
)?;
```

#### Resource Validation Workflows
- New resource creation triggers automatic validation
- Community validators can approve/reject resources
- Validation status affects resource availability
- Economic Process completion triggers process-specific validation
- All resource transactions generate appropriate PPRs for reputation tracking

### Integration with Person Zome

#### Agent Promotion Workflows
```rust
// Simple Agent → Accountable Agent promotion
let promotion_result = call(
    CallTargetCell::Local,
    "zome_gouvernance",
    "validate_agent_identity".into(),
    None,
    &ValidateAgentIdentityInput {
        agent: agent_pubkey.clone(),
        resource_hash: first_resource_hash,
        private_data_hash: identity_data_hash,
    },
)?;
```

#### Specialized Role Validation
```rust
// Transport, Repair, Storage role validation
let role_result = call(
    CallTargetCell::Local,
    "zome_gouvernance",
    "validate_specialized_role".into(),
    None,
    &ValidateSpecializedRoleInput {
        agent: agent_pubkey.clone(),
        requested_role: "Transport".to_string(),
        credentials: Some(credentials_data),
        validation_history: Some(previous_validation_hash),
        context: Some("economic_process_preparation".to_string()),
    },
)?;
```

#### Person Zome Private Data Access
```rust
// Accessing private data for governance validation
let private_data_result = call(
    CallTargetCell::Local,
    "zome_person",
    "get_private_data_for_governance_validation".into(),
    None,
    &GovernanceDataAccessInput {
        agent_to_validate: simple_agent_pubkey,
        validation_type: "agent_promotion".to_string(),
        requesting_validator: validator_pubkey,
        validation_context: validation_process_hash,
    },
)?;

// Example of complete agent validation with private data
let agent_validation = match private_data_result {
    Ok(data_access) if data_access.validation_eligible => {
        // Proceed with validation
        create_validation_receipt(CreateValidationReceiptInput {
            validated_item: agent_to_validate,
            validation_type: "agent_promotion".to_string(),
            approved: true,
            notes: Some(format!("Identity verified with quality score: {}", data_access.data_quality_score)),
        })?
    },
    Ok(_) => {
        // Insufficient data quality
        return Err(GovernanceError::ValidationFailed("Insufficient identity data quality".to_string()));
    },
    Err(e) => {
        return Err(GovernanceError::CrossZomeCallFailed(format!("Private data access failed: {}", e)));
    }
};
```

#### Resource Zome Coordination
```rust
// Coordinating with resource zome for process validation
let process_state_changes = call(
    CallTargetCell::Local,
    "zome_resource",
    "get_process_state_changes".into(),
    None,
    &ProcessStateChangesInput {
        process_hash: economic_process_hash,
        include_resource_effects: true,
    },
)?;

// Validate state changes are appropriate for process type
let validation_result = validate_process_state_changes(&process_state_changes)?;
```

## ValueFlows Compliance

### Complete Economic Vocabulary
- **VfAction Enum**: Type-safe implementation of all ValueFlows actions with nondominium-specific extensions
- **Economic Events**: Full ValueFlows event specification with Economic Process integration
- **Commitments**: Complete commitment and claim workflow supporting Economic Process chaining
- **Resource Integration**: Seamless integration with resource management and Economic Process workflows
- **Process Compliance**: Structured Economic Processes mapped to appropriate VfAction sequences

### Economic Event Model
- **Provider/Receiver Pattern**: Clear agent roles in all transactions with capability progression support
- **Resource Effects**: Detailed tracking of resource modifications through specialized processes (Use, Transport, Storage, Repair)
- **Quantity Tracking**: Precise quantity changes for all events with process-specific validation
- **Time Tracking**: Complete temporal audit trails with performance metrics
- **Process Integration**: Events linked to Economic Processes for structured activity tracking

### Commitment/Claim Pattern with PPR Integration
- **Future Planning**: Commitments enable Economic Process planning with role-based access control
- **Fulfillment Tracking**: Claims link commitments to actual events with automatic PPR generation
- **Due Date Management**: Time-based commitment tracking with performance assessment
- **Flexible Resources**: Both specific and specification-based commitments supporting process workflows
- **Bi-directional Receipts**: Every Commitment-Claim-Event cycle generates Private Participation Receipts for both agents
- **Performance Tracking**: Quantitative metrics embedded in fulfillment workflows for reputation derivation

### Economic Process ValueFlows Extension
- **Process-Action Mapping**: Each Economic Process type uses specific VfAction combinations (Use→Use, Transport→Work+Move, etc.)
- **Role-Based Access**: Process initiation restricted by agent capability progression and specialized role validation
- **State Management**: Process completion affects resource states according to ValueFlows resource lifecycle patterns
- **Validation Integration**: Process completion validation follows ValueFlows governance patterns with community review

## Signal Architecture

### Governance Zome Signals
```rust
pub enum Signal {
    LinkCreated { action: SignedActionHashed },      // New governance links
    LinkDeleted { action: SignedActionHashed },      // Governance link removal
    EntryCreated { action: SignedActionHashed },     // New governance entries
    EntryUpdated { action: SignedActionHashed },     // Governance updates
    EntryDeleted { action: SignedActionHashed },     // Governance deletions
}
```

**Real-time Updates**: Enables UI reactivity to governance changes
**Cross-Zome Coordination**: Supports inter-zome event coordination

## Implementation Status

### Phase 1 (Complete) ✅
- ✅ Complete VfAction enum with helper methods
- ✅ ValidationReceipt infrastructure for all governance workflows
- ✅ EconomicEvent logging with type-safe actions
- ✅ Commitment and claim management
- ✅ ResourceValidation workflow infrastructure
- ✅ Discovery links and query patterns
- ✅ Signal architecture for real-time updates
- ✅ Cross-zome validation functions
- ✅ ValueFlows-compliant data structures

### Phase 2 (Complete) ✅
- ✅ Cross-zome integration with resource and person zomes
- ✅ Agent identity validation workflows (Simple → Accountable promotion)
- ✅ Specialized role validation (Transport, Repair, Storage)
- ✅ Automatic resource validation upon creation
- ✅ Economic event tracking for all resource transactions
- ✅ Complete audit trails and validation history
- ✅ Initial transfer handling for Simple Agent workflows
- ✅ Economic Process validation infrastructure
- ✅ Private Participation Receipt (PPR) issuance and management
- ✅ Cryptographic signature support for PPR authenticity
- ✅ Performance metrics integration for reputation tracking
- ✅ Role-based access control for Economic Processes
- ✅ Bi-directional receipt generation for all economic interactions

### Current Features
- **Complete Governance Infrastructure**: Full validation workflows for all community activities including Economic Processes
- **ValueFlows Integration**: Type-safe economic action vocabulary with Economic Process mapping and PPR generation
- **Cross-Zome Coordination**: Seamless integration with person and resource management for Economic Process workflows
- **Agent Progression**: Automated workflows for capability advancement with specialized role validation
- **Private Participation Receipt System**: Comprehensive reputation tracking with cryptographically-signed, bi-directional receipts
- **Performance Tracking**: Quantitative performance metrics embedded in all economic interactions
- **Privacy-Preserving Reputation**: Local reputation derivation with selective disclosure control
- **Process-Aware Governance**: Economic Process validation with role-based access control and quality assurance
- **Audit Trails**: Complete tracking of all governance decisions, economic events, and process activities
- **Validation Flexibility**: Configurable validation schemes for different governance needs and process types
- **Cryptographic Integrity**: All PPRs cryptographically signed for authenticity and non-repudiation

### Phase 3 (Planned) 📋
- Advanced validation schemes (N-of-M consensus, weighted voting) with reputation-based weighting
- Enhanced Economic Process workflows with complex process chaining and conditional logic
- AI-assisted validation and anomaly detection for governance workflows
- Advanced reputation algorithms with machine learning-based trust prediction
- Automated governance rule enforcement with smart contract-like logic
- Community governance parameter adjustment through democratic processes
- Enhanced dispute resolution mechanisms with formal mediation protocols
- Cross-network PPR reputation portability and federation
- Performance optimizations for large-scale governance with millions of agents

## Development Patterns

### Cross-Zome Call Pattern
```rust
// Standard cross-zome validation call
let validation_result = call(
    CallTargetCell::Local,
    "zome_gouvernance",
    "validate_new_resource".into(),
    None,
    &ValidateNewResourceInput { /* ... */ },
)?;
```

### Validation Receipt Pattern
```rust
// Create validation receipt for any governance decision
let receipt = create_validation_receipt(CreateValidationReceiptInput {
    validated_item: item_hash,
    validation_type: "resource_approval".to_string(),
    approved: true,
    notes: Some("Community validated resource".to_string()),
})?;
```

### Economic Event Logging Pattern
```rust
// Log all economic activities
let event = log_economic_event(LogEconomicEventInput {
    action: VfAction::Transfer,
    provider: current_custodian,
    receiver: new_custodian,
    resource_inventoried_as: resource_hash,
    resource_quantity: transferred_quantity,
    note: Some("Resource custody transfer".to_string()),
})?;
```

The Governance zome provides the foundational economic coordination and validation infrastructure for the nondominium resource sharing ecosystem, enabling ValueFlows-compliant economic activities with comprehensive governance workflows, structured Economic Process management, Private Participation Receipt reputation tracking, and seamless cross-zome integration. It serves as the governance backbone that transforms the theoretical nondominium principles into a production-ready, privacy-preserving, and accountability-enabled decentralized resource sharing platform with embedded economic coordination, progressive trust models, and community-driven validation processes.
