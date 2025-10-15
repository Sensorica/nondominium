# Governance Zome Implementation Guide

## Overview
This document describes the **actual implemented** Governance zome functionality in the nondominium project.

**File Location**: `/dnas/nondominium/zomes/coordinator/zome_gouvernance/`

## Implemented Modules

### 1. Private Participation Receipt (PPR) System (`ppr.rs`)

#### Core PPR Functions

**`issue_participation_receipts(input: IssueParticipationReceiptsInput) -> ExternResult<IssueParticipationReceiptsOutput>`**
- **Purpose**: Generate bi-directional PPRs for economic interactions
- **Input**: Commitment, EconomicEvent, provider/receiver agents, performance metrics
- **Process**: Creates exactly 2 PPRs (one for each participant)
- **Features**: Cryptographic signatures, bilateral authentication
- **Returns**: Hashes and complete PPR data for both participants

**`sign_participation_claim(input: SignParticipationClaimInput) -> ExternResult<SignParticipationClaimOutput>`**
- **Purpose**: Cryptographically sign participation claims
- **Process**: Creates bilateral signing context with counterparty
- **Security**: Uses Ed25519 cryptographic signatures
- **Returns**: Signature and signed data hash

**`validate_participation_claim_signature(input: ValidateParticipationClaimSignatureInput) -> ExternResult<bool>`**
- **Purpose**: Validate cryptographic signatures on PPRs
- **Process**: Verifies both owner and counterparty signatures
- **Security**: Ensures authenticity and prevents tampering
- **Returns**: Boolean indicating signature validity

#### PPR Retrieval and Reputation

**`get_my_participation_claims(input: GetMyParticipationClaimsInput) -> ExternResult<GetMyParticipationClaimsOutput>`**
- **Purpose**: Retrieve calling agent's private PPRs
- **Filters**: By claim type, date range, limit
- **Privacy**: Only accessible by the PPR owner
- **Returns**: Filtered list of PPRs with metadata

**`derive_reputation_summary(input: DeriveReputationSummaryInput) -> ExternResult<DeriveReputationSummaryOutput>`**
- **Purpose**: Calculate privacy-preserving reputation from PPRs
- **Process**: Aggregates performance metrics from PPRs
- **Privacy**: Calculates reputation without exposing individual PPRs
- **Returns**: Reputation summary with metrics and trends

### 2. Commitment Management (`commitment.rs`)

#### Core Functions

**`create_commitment(input: CreateCommitmentInput) -> ExternResult<ActionHash>`**
- **Purpose**: Create a commitment (intention to perform economic action)
- **Input**: Action type, provider/receiver, resource details, due date
- **Validation**: Checks agent capabilities and resource availability
- **Returns**: ActionHash of the created commitment

**`accept_commitment(input: AcceptCommitmentInput) -> ExternResult<Record>`**
- **Purpose**: Accept a proposed commitment
- **Process**: Updates commitment status to "accepted"
- **Validation**: Ensures accepting agent has appropriate capabilities
- **Returns**: Updated commitment record

**`complete_commitment(input: CompleteCommitmentInput) -> ExternResult<Record>`**
- **Purpose**: Complete a commitment by creating the corresponding economic event
- **Process**: Creates EconomicEvent and generates PPRs
- **Integration**: Cross-zome coordination with resource and person zomes
- **Returns**: Updated commitment and created economic event

### 3. Economic Events (`economic_event.rs`)

#### Core Functions

**`create_economic_event(input: CreateEconomicEventInput) -> ExternResult<ActionHash>`**
- **Purpose**: Record consummated economic actions
- **Actions**: Transfer, Use, Produce, InitialTransfer, AccessForUse, TransferCustody
- **Integration**: Updates resource state and generates PPRs
- **Returns**: ActionHash of the created event

**`get_economic_events(filter: EconomicEventFilter) -> ExternResult<Vec<Record>>`**
- **Purpose**: Retrieve economic events based on filter criteria
- **Filters**: By agent, resource, action type, date range
- **Used by**: Reputation calculation and audit functions
- **Returns**: Filtered list of economic events

### 4. Validation System (`validation.rs`)

#### Resource Validation

**`validate_new_resource(input: ValidateNewResourceInput) -> ExternResult<ValidationReceipt>`**
- **Purpose**: Peer-validate newly created resources
- **Process**: Reviews resource specification against governance rules
- **Requirements**: Agent must have appropriate validation role
- **Integration**: Links to PPR generation for validation activities

**`validate_agent_identity(input: ValidateAgentIdentityInput) -> ExternResult<ValidationReceipt>`**
- **Purpose**: Validate agent identity for promotion to Accountable status
- **Process**: Reviews private data and first resource transfer
- **Requirements**: Private data access through proper channels
- **Integration**: Triggers PPR generation and agent promotion

#### Process Validation

**`validate_process_completion(input: ValidateProcessCompletionInput) -> ExternResult<ValidationReceipt>`**
- **Purpose**: Validate completion of economic processes
- **Process**: Reviews process outcomes against requirements
- **Validation**: Checks role compliance and performance metrics
- **Integration**: Generates specialized PPRs for process validation

### 5. Private Data Validation (`private_data_validation.rs`)

#### Cross-Zome Data Access

**`get_private_data_for_validation(input: PrivateDataValidationRequest) -> ExternResult<PrivateDataView>`**
- **Purpose**: Access private data for validation purposes
- **Security**: Requires proper authorization and audit trail
- **Privacy**: Creates audit log for all private data access
- **Returns**: Filtered private data view based on validation needs

## Data Structures

### Private Participation Claim
```rust
pub struct PrivateParticipationClaim {
    pub fulfills: ActionHash,           // Related commitment
    pub fulfilled_by: ActionHash,       // Related economic event
    pub claim_type: ParticipationClaimType,
    pub performance_metrics: PerformanceMetrics,
    pub bilateral_signature: CryptographicSignature,
    pub counterparty: AgentPubKey,
    pub resource_reference: Option<ActionHash>,
    pub notes: Option<String>,
    pub claimed_at: Timestamp,
}
```

### Cryptographic Signature
```rust
pub struct CryptographicSignature {
    pub recipient_signature: Signature,    // Calling agent's signature
    pub counterparty_signature: Signature,  // Other party's signature
    pub signed_data_hash: [u8; 32],        // Hash of signed data
    pub created_at: Timestamp,
}
```

### Performance Metrics
```rust
pub struct PerformanceMetrics {
    pub timeliness: f64,           // 0.0-1.0
    pub quality: f64,              // 0.0-1.0
    pub reliability: f64,          // 0.0-1.0
    pub communication: f64,        // 0.0-1.0
    pub overall_satisfaction: f64,  // 0.0-1.0
    pub notes: Option<String>,
}
```

### Participation Claim Types
```rust
pub enum ParticipationClaimType {
    ResourceContribution,
    NetworkValidation,
    ResponsibleTransfer,
    CustodyAcceptance,
    ServiceCommitmentAccepted,
    GoodFaithTransfer,
    ServiceFulfillmentCompleted,
    MaintenanceFulfillment,
    StorageFulfillment,
    TransportFulfillment,
    EndOfLifeDeclaration,
    EndOfLifeValidation,
    DisputeResolutionParticipation,
    GovernanceCompliance,
    RuleCompliance,
    ValidationActivity,
}
```

### Reputation Summary
```rust
pub struct ReputationSummary {
    pub agent: AgentPubKey,
    pub total_interactions: u32,
    pub average_timeliness: f64,
    pub average_quality: f64,
    pub average_reliability: f64,
    pub average_communication: f64,
    pub completion_rate: f64,
    pub role_performance: HashMap<String, RolePerformance>,
    pub recent_activity: Vec<RecentInteraction>,
    pub calculated_at: Timestamp,
}
```

## Error Handling

### GovernanceError Enum
```rust
pub enum GovernanceError {
    ValidationReceiptNotFound(String),
    EconomicEventNotFound(String),
    ResourceValidationNotFound(String),
    CommitmentNotFound(String),
    NotAuthorizedValidator,
    InsufficientCapability(String),
    ValidationAlreadyExists(String),
    InvalidValidationScheme(String),
    SerializationError(String),
    EntryOperationFailed(String),
    LinkOperationFailed(String),
    InvalidInput(String),
    CrossZomeCallFailed(String),
}
```

## Security Features

### Cryptographic Security
- **Bi-directional Signatures**: Both parties sign PPRs
- **Bilateral Authentication**: Context-specific signing
- **Hash Validation**: BLAKE2b-256 for data integrity
- **Replay Protection**: Timestamp-based signing

### Privacy Protection
- **Private Entry Storage**: PPRs stored as private entries
- **Selective Disclosure**: Reputation calculation without exposing individual PPRs
- **Access Control**: Strict capability-based access to validation functions

### Audit Trail
- **Comprehensive Logging**: All validations and PPR generations logged
- **Cross-Zome Coordination**: Audit trails across all zomes
- **Immutable Records**: Holochain DHT ensures tamper resistance

## Integration Patterns

### PPR Generation Triggers
1. **Economic Events**: Automatic PPR generation for all economic events
2. **Validation Activities**: PPRs for resource and agent validation
3. **Process Completion**: Specialized PPRs for economic processes
4. **Agent Promotion**: PPRs for Simple Agent → Accountable Agent promotion

### Cross-Zome Function Calls
- **Person Zome**: Role validation, private data access for validation
- **Resource Zome**: Resource state updates, governance rule enforcement
- **Validation Coordination**: Multi-zome validation workflows

## Usage Examples

### Creating Economic Event with PPRs
```rust
// Create economic event
let event_input = CreateEconomicEventInput {
    action: VfAction::Transfer,
    provider: alice_pub_key,
    receiver: bob_pub_key,
    resource_inventoried_as: resource_hash,
    resource_quantity: 1.0,
    note: Some("Resource transfer".to_string()),
};
let event_hash = create_economic_event(event_input)?;

// Automatically generates PPRs
let ppr_output = generate_pprs_for_economic_event(
    &event,
    commitment_hash,
    event_hash,
)?;
```

### Agent Identity Validation with PPRs
```rust
// Validate agent identity and promote to Accountable
let validation_input = ValidateAgentIdentityInput {
    agent_to_validate: simple_agent_pub_key,
    private_data_hash: private_data_hash,
    validation_notes: Some("Identity verified with supporting documents".to_string()),
};
let validation_receipt = validate_agent_identity(validation_input)?;

// PPRs automatically generated for validation activity
```

### Reputation Calculation
```rust
// Calculate reputation summary from PPRs
let reputation_input = DeriveReputationSummaryInput {
    period_start: Timestamp::from_secs(1640995200), // Jan 1, 2022
    period_end: sys_time()?,
    claim_type_filter: None, // All claim types
};
let reputation_output = derive_reputation_summary(reputation_input)?;

println!("Reputation score: {}", reputation_output.summary.average_reliability);
```

## Implementation Status

### ✅ Completed Features
- **Complete PPR System**: Bi-directional receipt generation with cryptographic signatures
- **Reputation Calculation**: Privacy-preserving reputation from PPRs
- **Economic Events**: Full ValueFlows compliance
- **Validation System**: Resource and agent validation workflows
- **Cross-Zome Integration**: Seamless coordination with other zomes
- **Error Handling**: Comprehensive error types and recovery
- **Security**: Cryptographic signatures and access control

### 🚧 Partial Features
- **Economic Processes**: Basic implementation, needs enhancement
- **Advanced Validation**: Simple validation schemes, complex schemes pending
- **Process Chaining**: Multi-step processes not fully implemented

### ❌ Not Implemented
- **Dispute Resolution**: Framework exists but not fully implemented
- **Advanced Reputation**: Machine learning-based reputation pending
- **Performance Analytics**: Basic metrics, advanced analytics pending

## Performance Considerations

### Optimizations
- **Private Entry Queries**: Optimized for agent-specific queries
- **Link Management**: Efficient linking for PPR discovery
- **Caching**: Reputation calculation results cached where appropriate

### Scalability
- **DHT Optimization**: Efficient anchor strategies for PPR storage
- **Batch Operations**: Support for batch PPR generation
- **Query Performance**: Optimized filtering and pagination

## Testing

The Governance zome has comprehensive test coverage:
- **PPR System Tests**: Bi-directional receipt generation and validation
- **Cryptographic Tests**: Signature generation and validation
- **Integration Tests**: Cross-zome coordination workflows
- **Security Tests**: Access control and privacy protection
- **Performance Tests**: Reputation calculation efficiency

## Future Enhancements

1. **Advanced Validation Schemes**: 2-of-3, N-of-M reviewer systems
2. **Dispute Resolution**: Automated dispute resolution with PPR context
3. **Process Chaining**: Multi-step economic process workflows
4. **Advanced Reputation**: Machine learning-based trust prediction
5. **Performance Analytics**: Detailed performance metrics and trends