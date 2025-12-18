# Cross-Zome API Specification

## 1. Resource Zome API

### 1.1 Data Access Functions

#### get_economic_resource

Retrieves a specific economic resource by its action hash.

```rust
#[hdk_extern]
pub fn get_economic_resource(
    resource_hash: ActionHash,
) -> ExternResult<EconomicResource>
```

**Parameters:**
- `resource_hash: ActionHash` - The action hash of the resource to retrieve

**Returns:**
- `EconomicResource` - The resource data structure

**Errors:**
- `WasmErrorGuest` - If resource not found or access denied

**Example:**
```rust
let resource = call(
    CallTargetCell::Local,
    "zome_resource",
    "get_economic_resource".into(),
    None,
    &resource_hash,
)?;
```

#### get_economic_resource_with_state

Retrieves resource with full state transition history.

```rust
#[hdk_extern]
pub fn get_economic_resource_with_state(
    resource_hash: ActionHash,
) -> ExternResult<ResourceWithState>
```

**Parameters:**
- `resource_hash: ActionHash` - Resource action hash

**Returns:**
- `ResourceWithState` - Resource with state history

### 1.2 State Change Requests

#### request_resource_transition

Primary interface for requesting state changes through governance evaluation.

```rust
#[hdk_extern]
pub fn request_resource_transition(
    request: GovernanceTransitionRequest,
) -> ExternResult<GovernanceTransitionResult>
```

**Parameters:**
- `request: GovernanceTransitionRequest` - Complete transition request

**Returns:**
- `GovernanceTransitionResult` - Governance decision and results

**Request Structure:**
```rust
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct GovernanceTransitionRequest {
    /// The action the requesting agent wants to perform
    pub action: VfAction,
    /// Current state of the resource being modified
    pub resource: EconomicResource,
    /// Agent requesting the state change
    pub requesting_agent: AgentPubKey,
    /// Additional context for the transition
    pub context: TransitionContext,
}
```

**Result Structure:**
```rust
#[derive(Serialize, Deserialize, Debug)]
pub struct GovernanceTransitionResult {
    /// Whether the transition was approved
    pub success: bool,
    /// Updated resource state (if approved)
    pub new_resource_state: Option<EconomicResource>,
    /// Generated economic event for audit trail
    pub economic_event: Option<EconomicEvent>,
    /// Validation receipts from governance evaluation
    pub validation_receipts: Vec<ValidationReceipt>,
    /// Detailed reasons for rejection (if applicable)
    pub rejection_reasons: Option<Vec<String>>,
    /// Required next steps or additional validation needed
    pub next_steps: Option<Vec<String>>,
}
```

#### batch_state_transitions

Process multiple state transitions efficiently in a single call.

```rust
#[hdk_extern]
pub fn batch_state_transitions(
    requests: Vec<GovernanceTransitionRequest>,
) -> ExternResult<Vec<GovernanceTransitionResult>>
```

**Parameters:**
- `requests: Vec<GovernanceTransitionRequest>` - Multiple transition requests

**Returns:**
- `Vec<GovernanceTransitionResult>` - Results for each request in order

### 1.3 Query Functions

#### get_my_resources

Retrieves all resources where the calling agent is the custodian.

```rust
#[hdk_extern]
pub fn get_my_resources() -> ExternResult<Vec<EconomicResource>>
```

**Returns:**
- `Vec<EconomicResource>` - Resources owned by the calling agent

#### get_resources_by_specification

Retrieves all resources conforming to a specific specification.

```rust
#[hdk_extern]
pub fn get_resources_by_specification(
    spec_hash: ActionHash,
) -> ExternResult<Vec<EconomicResource>>
```

**Parameters:**
- `spec_hash: ActionHash` - Specification action hash

**Returns:**
- `Vec<EconomicResource>` - Resources conforming to the specification

#### get_resources_by_state

Retrieves resources in a specific state.

```rust
#[hdk_extern]
pub fn get_resources_by_state(
    state: ResourceState,
) -> ExternResult<Vec<EconomicResource>>
```

**Parameters:**
- `state: ResourceState` - State to filter by

**Returns:**
- `Vec<EconomicResource>` - Resources in the specified state

## 2. Governance Zome API

### 2.1 State Transition Evaluation

#### evaluate_state_transition

Evaluates a state transition request and returns governance decision.

```rust
#[hdk_extern]
pub fn evaluate_state_transition(
    request: GovernanceTransitionRequest,
) -> ExternResult<GovernanceTransitionResult>
```

**Parameters:**
- `request: GovernanceTransitionRequest` - Transition request to evaluate

**Returns:**
- `GovernanceTransitionResult` - Governance evaluation result

**Evaluation Process:**
1. Load applicable governance rules
2. Check agent permissions and roles
3. Evaluate all applicable rules
4. Determine if transition is allowed
5. Generate economic events if approved

### 2.2 Rule Processing

#### get_applicable_rules

Retrieves governance rules applicable to a specific resource and action.

```rust
#[hdk_extern]
pub fn get_applicable_rules(
    resource_hash: ActionHash,
    action: VfAction,
) -> ExternResult<Vec<GovernanceRule>>
```

**Parameters:**
- `resource_hash: ActionHash` - Resource to get rules for
- `action: VfAction` - Action being performed

**Returns:**
- `Vec<GovernanceRule>` - Applicable governance rules

#### evaluate_rule

Evaluates a single governance rule against a transition request.

```rust
#[hdk_extern]
pub fn evaluate_rule(
    request: GovernanceTransitionRequest,
    rule_hash: ActionHash,
) -> ExternResult<RuleEvaluationResult>
```

**Parameters:**
- `request: GovernanceTransitionRequest` - Transition request
- `rule_hash: ActionHash` - Rule to evaluate

**Returns:**
- `RuleEvaluationResult` - Rule evaluation result

### 2.3 Economic Event Generation

#### generate_economic_event

Generates an economic event for a completed state transition.

```rust
#[hdk_extern]
pub fn generate_economic_event(
    request: GovernanceTransitionRequest,
    evaluation_result: &TransitionEvaluation,
) -> ExternResult<EconomicEvent>
```

**Parameters:**
- `request: GovernanceTransitionRequest` - Original transition request
- `evaluation_result: TransitionEvaluation` - Internal evaluation result

**Returns:**
- `EconomicEvent` - Generated economic event

### 2.4 Agent Permission Management

#### check_agent_permissions

Checks if an agent has permission to perform a specific action.

```rust
#[hdk_extern]
pub fn check_agent_permissions(
    agent_pubkey: AgentPubKey,
    action: VfAction,
) -> ExternResult<AgentPermissions>
```

**Parameters:**
- `agent_pubkey: AgentPubKey` - Agent to check permissions for
- `action: VfAction` - Action to check permissions for

**Returns:**
- `AgentPermissions` - Permission check results

#### get_agent_roles

Retrieves all roles assigned to an agent.

```rust
#[hdk_extern]
pub fn get_agent_roles(
    agent_pubkey: AgentPubKey,
) -> ExternResult<Vec<Role>>
```

**Parameters:**
- `agent_pubkey: AgentPubKey` - Agent to get roles for

**Returns:**
- `Vec<Role>` - Agent's assigned roles

## 3. Interface Types

### 3.1 Request/Response Structures

#### GovernanceTransitionRequest

Complete request for state transition evaluation.

```rust
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct GovernanceTransitionRequest {
    /// The action the requesting agent wants to perform
    pub action: VfAction,
    /// Current state of the resource being modified
    pub resource: EconomicResource,
    /// Agent requesting the state change
    pub requesting_agent: AgentPubKey,
    /// Additional context for the transition
    pub context: TransitionContext,
}
```

#### TransitionContext

Additional context information for state transitions.

```rust
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct TransitionContext {
    /// Target location for transport/move actions
    pub target_location: Option<String>,
    /// Quantity change for produce/consume actions
    pub quantity_change: Option<f64>,
    /// Target custodian for transfer actions
    pub target_custodian: Option<AgentPubKey>,
    /// Process notes and observations
    pub process_notes: Option<String>,
    /// Associated economic process if applicable
    pub process_context: Option<ActionHash>,
    /// Additional metadata
    pub metadata: HashMap<String, String>,
}
```

#### GovernanceTransitionResult

Comprehensive result from governance evaluation.

```rust
#[derive(Serialize, Deserialize, Debug)]
pub struct GovernanceTransitionResult {
    /// Whether the transition was approved
    pub success: bool,
    /// Updated resource state (if approved)
    pub new_resource_state: Option<EconomicResource>,
    /// Generated economic event for audit trail
    pub economic_event: Option<EconomicEvent>,
    /// Validation receipts from governance evaluation
    pub validation_receipts: Vec<ValidationReceipt>,
    /// Detailed reasons for rejection (if applicable)
    pub rejection_reasons: Option<Vec<String>>,
    /// Required next steps or additional validation needed
    pub next_steps: Option<Vec<String>>,
    /// Processing metadata
    pub metadata: TransitionMetadata,
}
```

#### TransitionMetadata

Metadata about the transition processing.

```rust
#[derive(Serialize, Deserialize, Debug)]
pub struct TransitionMetadata {
    /// Timestamp when evaluation started
    pub evaluation_started: Timestamp,
    /// Timestamp when evaluation completed
    pub evaluation_completed: Timestamp,
    /// Number of rules evaluated
    pub rules_evaluated: u32,
    /// Processing duration in milliseconds
    pub processing_duration_ms: u64,
    /// Governance engine version
    pub engine_version: String,
}
```

### 3.2 Validation Structures

#### RuleEvaluationResult

Result of evaluating a single governance rule.

```rust
#[derive(Serialize, Deserialize, Debug)]
pub struct RuleEvaluationResult {
    /// Hash of the evaluated rule
    pub rule_hash: ActionHash,
    /// Type of governance rule
    pub rule_type: String,
    /// Whether the rule was passed
    pub passed: bool,
    /// Detailed reason for evaluation result
    pub reason: String,
    /// Rule-specific evaluation data
    pub evaluation_data: Option<serde_json::Value>,
    /// Timestamp of evaluation
    pub evaluated_at: Timestamp,
}
```

#### AgentPermissions

Permission check results for agent and action.

```rust
#[derive(Serialize, Deserialize, Debug)]
pub struct AgentPermissions {
    /// Whether the permission was granted
    pub allowed: bool,
    /// Roles required for this action
    pub required_roles: Vec<String>,
    /// Current status of permission check
    pub status: String,
    /// Permission expiration (if applicable)
    pub expires_at: Option<Timestamp>,
    /// Additional permission constraints
    pub constraints: Vec<String>,
}
```

### 3.3 Error Handling

#### GovernanceError

Comprehensive error types for governance operations.

```rust
#[derive(Debug, thiserror::Error, Serialize, Deserialize)]
pub enum GovernanceError {
    #[error("Permission denied: {0}")]
    PermissionDenied(String),

    #[error("Rule violation: {0}")]
    RuleViolation(String),

    #[error("Invalid state transition: {0}")]
    InvalidStateTransition(String),

    #[error("Agent not found: {0}")]
    AgentNotFound(String),

    #[error("Resource not found: {0}")]
    ResourceNotFound(String),

    #[error("Governance rule not found: {0}")]
    GovernanceRuleNotFound(String),

    #[error("Insufficient role: {0}")]
    InsufficientRole(String),

    #[error("Evaluation timeout: {0}ms")]
    EvaluationTimeout(u64),

    #[error("Cross-zome communication failed: {0}")]
    CrossZomeError(String),

    #[error("Data validation failed: {0}")]
    ValidationError(String),

    #[error("Configuration error: {0}")]
    ConfigurationError(String),
}
```

## 4. Usage Examples

### 4.1 Basic Resource Transfer

```typescript
// TypeScript (Frontend) example
const transferResource = async (
  resourceHash: string,
  newCustodian: string,
  notes: string
) => {
  const request: GovernanceTransitionRequest = {
    action: "TransferCustody",
    resource: await getResource(resourceHash),
    requestingAgent: await getMyAgentPubKey(),
    context: {
      targetCustodian: newCustodian,
      processNotes: notes,
    },
  };

  const result = await callZome<GovernanceTransitionResult>(
    "zome_resource",
    "request_resource_transition",
    request
  );

  if (result.success) {
    console.log("Transfer approved");
    return result;
  } else {
    console.log("Transfer rejected:", result.rejectionReasons);
    throw new Error("Transfer failed");
  }
};
```

### 4.2 Complex Process Chain

```rust
// Rust backend example for process chaining
pub async fn execute_transport_repair_chain(
    resource_hash: ActionHash,
    repair_location: String,
    final_destination: String,
) -> ExternResult<Vec<EconomicEvent>> {

    let agent_info = agent_info()?;
    let resource = get_economic_resource(resource_hash)?;

    // Step 1: Transport to repair location
    let transport_request = GovernanceTransitionRequest {
        action: VfAction::Move,
        resource: resource.clone(),
        requesting_agent: agent_info.agent_initial_pubkey,
        context: TransitionContext {
            target_location: Some(repair_location),
            process_notes: Some("Transport for repair".to_string()),
            ..Default::default()
        },
    };

    let transport_result = request_resource_transition(transport_request)?;
    if !transport_result.success {
        return Err(GovernanceError::RuleViolation(
            format!("Transport failed: {:?}", transport_result.rejection_reasons)
        ).into());
    }

    // Step 2: Repair the resource
    let repair_request = GovernanceTransitionRequest {
        action: VfAction::Modify,
        resource: transport_result.new_resource_state.unwrap(),
        requesting_agent: agent_info.agent_initial_pubkey,
        context: TransitionContext {
            target_location: Some(repair_location),
            process_notes: Some("Maintenance repair".to_string()),
            ..Default::default()
        },
    };

    let repair_result = request_resource_transition(repair_request)?;
    if !repair_result.success {
        return Err(GovernanceError::RuleViolation(
            format!("Repair failed: {:?}", repair_result.rejection_reasons)
        ).into());
    }

    // Step 3: Transport to final destination
    let final_transport_request = GovernanceTransitionRequest {
        action: VfAction::Move,
        resource: repair_result.new_resource_state.unwrap(),
        requesting_agent: agent_info.agent_initial_pubkey,
        context: TransitionContext {
            target_location: Some(final_destination),
            process_notes: Some("Transport after repair".to_string()),
            ..Default::default()
        },
    };

    let final_result = request_resource_transition(final_transport_request)?;
    if !final_result.success {
        return Err(GovernanceError::RuleViolation(
            format!("Final transport failed: {:?}", final_result.rejection_reasons)
        ).into());
    }

    // Collect all generated events
    let mut events = Vec::new();
    if let Some(event) = transport_result.economic_event {
        events.push(event);
    }
    if let Some(event) = repair_result.economic_event {
        events.push(event);
    }
    if let Some(event) = final_result.economic_event {
        events.push(event);
    }

    Ok(events)
}
```

### 4.3 Batch Processing

```typescript
// TypeScript batch processing example
const batchUpdateResources = async (
  updates: Array<{
    resourceHash: string;
    action: VfAction;
    context: TransitionContext;
  }>
) => {
  const requests = updates.map(update => ({
    action: update.action,
    resource: await getResource(update.resourceHash),
    requestingAgent: await getMyAgentPubKey(),
    context: update.context,
  }));

  const results = await callZome<GovernanceTransitionResult[]>(
    "zome_resource",
    "batch_state_transitions",
    requests
  );

  // Process results
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  console.log(`Processed ${results.length} requests`);
  console.log(`Successful: ${successful.length}`);
  console.log(`Failed: ${failed.length}`);

  if (failed.length > 0) {
    console.error("Failed transitions:", failed);
  }

  return results;
};
```

## 5. Performance and Scalability

### 5.1 Rate Limiting

Rate limiting is enforced at the governance zome level:

```rust
// Rate limiting configuration
pub const RATE_LIMITS: HashMap<&'static str, u32> = hashmap! {
    "evaluate_state_transition" => 100, // Per minute
    "check_agent_permissions" => 500,    // Per minute
    "get_applicable_rules" => 200,     // Per minute
};
```

### 5.2 Batch Processing

For high-volume operations, use batch processing:

```rust
// Recommended batch sizes
const OPTIMAL_BATCH_SIZE: usize = 10;
const MAX_BATCH_SIZE: usize = 50;

// Implementation validates and adjusts batch sizes
pub fn validate_batch_size(size: usize) -> usize {
    if size > MAX_BATCH_SIZE {
        warn!("Batch size {size} exceeds maximum, truncating to {MAX_BATCH_SIZE}");
        MAX_BATCH_SIZE
    } else {
        size.max(OPTIMAL_BATCH_SIZE)
    }
}
```

### 5.3 Caching Strategy

Cache frequently accessed data to improve performance:

```rust
// Cache configuration
pub const CACHE_TTL_SECONDS: u64 = 300; // 5 minutes
pub const RULE_CACHE_SIZE: usize = 100;
pub const PERMISSION_CACHE_SIZE: usize = 200;
```

This API specification provides a comprehensive reference for implementing cross-zome communication in the governance-as-operator architecture, with detailed examples and performance considerations for production deployment.