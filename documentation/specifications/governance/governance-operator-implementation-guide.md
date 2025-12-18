# Governance Operator Implementation Guide

## 1. Technical Architecture Overview

### 1.1 Resource Zome Data Model

The resource zome operates as a pure data model responsible for:
- Resource specification management
- Economic resource lifecycle operations
- Data persistence and retrieval
- Discovery and query functions

**Key Characteristics**:
- No business logic or validation rules
- Pure CRUD operations on data structures
- Cross-zome calls for governance decisions
- Event generation after approved changes

### 1.2 Governance Zome Operator Functions

The governance zome operates as a state transition operator responsible for:
- Evaluating governance rules and policies
- Validating agent permissions and roles
- Authorizing or rejecting state transitions
- Generating economic events for audit trails

**Key Characteristics**:
- Pure function evaluation logic
- No direct data persistence
- Comprehensive validation frameworks
- Integration with reputation system

### 1.3 Cross-Zome Communication Patterns

Communication follows the operator pattern with these key patterns:

1. **Request-Evaluate-Apply Pattern**
   - Resource zome requests state change
   - Governance zome evaluates and decides
   - Resource zome applies approved changes

2. **Event-Driven Auditing**
   - Every state transition generates economic events
   - Complete audit trail maintained
   - Reputation system integration

3. **Error Handling Propagation**
   - Clear error boundaries between zomes
   - Graceful degradation when governance unavailable
   - Comprehensive error reporting

## 2. Implementation Details

### 2.1 Cross-Zome Interface Implementation

**Resource Zome Implementation**:

```rust
use crate::ResourceError;
use hdk::prelude::*;
use zome_resource_integrity::*;
use zome_gouvernance_integrity::*;

// Cross-zome interface structures
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct GovernanceTransitionRequest {
    pub action: VfAction,
    pub resource: EconomicResource,
    pub requesting_agent: AgentPubKey,
    pub context: TransitionContext,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct GovernanceTransitionResult {
    pub success: bool,
    pub new_resource_state: Option<EconomicResource>,
    pub economic_event: Option<EconomicEvent>,
    pub validation_receipts: Vec<ValidationReceipt>,
    pub rejection_reasons: Option<Vec<String>>,
    pub next_steps: Option<Vec<String>>,
}

// Primary interface function for resource state changes
#[hdk_extern]
pub fn request_resource_transition(
    request: GovernanceTransitionRequest,
) -> ExternResult<GovernanceTransitionResult> {

    // 1. Validate input data integrity
    validate_transition_request(&request)?;

    // 2. Call governance zome for evaluation
    let governance_result = call(
        CallTargetCell::Local,
        "zome_gouvernance",
        "evaluate_state_transition".into(),
        None,
        &request,
    )?;

    // 3. Handle governance decision
    match governance_result.success {
        true => {
            // 3a. Apply approved state changes
            if let Some(new_state) = governance_result.new_resource_state.clone() {
                update_resource_state(new_state)?;
            }

            // 3b. Record economic event
            if let Some(event) = governance_result.economic_event.clone() {
                create_economic_event(event)?;
            }

            // 3c. Update state transition links
            update_state_transition_links(&request, &governance_result)?;

            Ok(governance_result)
        }
        false => {
            // 4a. Log rejection for audit trail
            log_governance_rejection(&request, &governance_result)?;

            // 4b. Return decision to caller
            Ok(governance_result)
        }
    }
}

// Validate transition request before governance evaluation
fn validate_transition_request(
    request: &GovernanceTransitionRequest,
) -> ExternResult<()> {
    // Validate resource exists
    let _resource_record = get(
        get_action_hash(&request.resource)?,
        GetOptions::default()
    )?.ok_or(ResourceError::EconomicResourceNotFound(
        "Resource not found".to_string()
    ))?;

    // Validate agent permissions basic checks
    let agent_info = agent_info()?;
    if agent_info.agent_initial_pubkey != request.requesting_agent {
        return Err(ResourceError::NotAuthor.into());
    }

    // Validate action compatibility with resource state
    validate_action_state_compatibility(&request.action, &request.resource.state)?;

    Ok(())
}

// Helper function to get action hash from resource
fn get_action_hash(resource: &EconomicResource) -> ExternResult<ActionHash> {
    // This would typically be stored alongside the resource
    // For implementation, this depends on how resources are tracked
    todo!("Implement action hash retrieval")
}

// Validate that action is compatible with current resource state
fn validate_action_state_compatibility(
    action: &VfAction,
    current_state: &ResourceState,
) -> ExternResult<()> {
    match (current_state, action) {
        (ResourceState::Retired, _) => {
            return Err(ResourceError::InvalidInput(
                "Cannot perform actions on retired resource".to_string()
            ).into());
        }
        (ResourceState::Reserved, VfAction::Use) => {
            return Err(ResourceError::InvalidInput(
                "Cannot use reserved resource".to_string()
            ).into());
        }
        _ => Ok(()), // Valid combination
    }
}
```

**Governance Zome Implementation**:

```rust
use hdk::prelude::*;
use zome_gouvernance_integrity::*;

// Governance evaluation engine
#[hdk_extern]
pub fn evaluate_state_transition(
    request: GovernanceTransitionRequest,
) -> ExternResult<GovernanceTransitionResult> {

    // 1. Load applicable governance rules
    let governance_rules = load_applicable_rules(&request.resource)?;

    // 2. Check agent permissions and roles
    let agent_permissions = check_agent_permissions(
        &request.requesting_agent,
        &request.action,
    )?;

    // 3. Evaluate state transition using pure function
    let evaluation = GovernanceEngine::evaluate_transition(
        &request,
        &governance_rules,
        &agent_permissions,
    )?;

    // 4. Generate economic event if approved
    let economic_event = if evaluation.allowed {
        Some(generate_economic_event(&request, &evaluation)?)
    } else {
        None
    };

    // 5. Generate validation receipts
    let validation_receipts = generate_validation_receipts(
        &request,
        &evaluation,
    )?;

    // 6. Return comprehensive result
    Ok(GovernanceTransitionResult {
        success: evaluation.allowed,
        new_resource_state: evaluation.new_state,
        economic_event,
        validation_receipts,
        rejection_reasons: evaluation.rejection_reasons,
        next_steps: evaluation.next_steps,
    })
}

// Load governance rules applicable to resource and action
fn load_applicable_rules(
    resource: &EconomicResource,
) -> ExternResult<Vec<GovernanceRule>> {
    // 1. Get resource specification
    let spec_record = get(
        resource.conforms_to,
        GetOptions::default()
    )?.ok_or(GovernanceError::ResourceSpecificationNotFound)?;

    let spec: ResourceSpecification = spec_record.entry().ok_or(
        GovernanceError::InvalidEntryType
    )?;

    // 2. Get governance rules from specification
    let mut rules = Vec::new();
    for rule_hash in spec.governance_rules {
        let rule_record = get(rule_hash, GetOptions::default())?
            .ok_or(GovernanceError::GovernanceRuleNotFound)?;
        let rule: GovernanceRule = rule_record.entry().ok_or(
            GovernanceError::InvalidEntryType
        )?;
        rules.push(rule);
    }

    // 3. Add system-wide rules
    rules.extend(load_system_governance_rules()?);

    Ok(rules)
}

// Check agent permissions and role requirements
fn check_agent_permissions(
    agent_pubkey: &AgentPubKey,
    action: &VfAction,
) -> ExternResult<AgentPermissions> {
    // 1. Get agent profile and roles
    let agent_profile = get_agent_profile(agent_pubkey)?;
    let agent_roles = get_agent_roles(agent_pubkey)?;

    // 2. Check basic permissions
    let has_basic_access = agent_roles.iter()
        .any(|role| role.role_name == "Accountable Agent" || role.role_name == "Simple Agent");

    if !has_basic_access {
        return Ok(AgentPermissions {
            allowed: false,
            required_roles: vec!["Accountable Agent".to_string()],
            role_status: "Insufficient role".to_string(),
        });
    }

    // 3. Check role-specific requirements
    let required_roles = get_required_roles_for_action(action);
    let has_required_roles = required_roles.iter().all(|required_role| {
        agent_roles.iter().any(|role| role.role_name == *required_role)
    });

    Ok(AgentPermissions {
        allowed: has_required_roles,
        required_roles,
        role_status: if has_required_roles {
            "Authorized".to_string()
        } else {
            "Insufficient role".to_string()
        },
    })
}

// Get roles required for specific actions
fn get_required_roles_for_action(action: &VfAction) -> Vec<String> {
    match action {
        VfAction::Use => vec!["Accountable Agent".to_string()],
        VfAction::Transfer => vec!["Accountable Agent".to_string()],
        VfAction::TransferCustody => vec!["Accountable Agent".to_string()],
        VfAction::InitialTransfer => vec!["Simple Agent".to_string()],
        VfAction::Move | VfAction::Work => vec!["Transport".to_string()],
        VfAction::Modify => vec!["Repair".to_string()],
        VfAction::Consume | VfAction::Produce => vec!["Accountable Agent".to_string()],
        _ => vec!["Accountable Agent".to_string()],
    }
}
```

### 2.2 State Transition Logic

**Pure Function Governance Engine**:

```rust
pub struct GovernanceEngine;

impl GovernanceEngine {
    /// Pure function: evaluates state transition without side effects
    pub fn evaluate_transition(
        request: &GovernanceTransitionRequest,
        rules: &[GovernanceRule],
        agent_permissions: &AgentPermissions,
    ) -> ExternResult<TransitionEvaluation> {

        // 1. Check agent permissions first
        if !agent_permissions.allowed {
            return Ok(TransitionEvaluation {
                allowed: false,
                new_state: None,
                required_events: vec![],
                validation_receipts: vec![],
                rejection_reasons: Some(vec![
                    format!("Permission denied: {}", agent_permissions.role_status)
                ]),
                next_steps: Some(vec![
                    "Acquire required role".to_string(),
                    "Contact system administrator".to_string(),
                ]),
            });
        }

        // 2. Evaluate governance rules
        let rule_results = evaluate_governance_rules(request, rules)?;

        // 3. Check if all rules passed
        let all_rules_passed = rule_results.iter().all(|result| result.passed);

        if !all_rules_passed {
            let failed_rules = rule_results.iter()
                .filter(|result| !result.passed)
                .collect::<Vec<_>>();

            return Ok(TransitionEvaluation {
                allowed: false,
                new_state: None,
                required_events: vec![],
                validation_receipts: vec![],
                rejection_reasons: Some(failed_rules.iter()
                    .map(|result| result.reason.clone())
                    .collect()),
                next_steps: Some(vec![
                    "Address governance rule violations".to_string(),
                    "Modify request to comply with rules".to_string(),
                ]),
            });
        }

        // 4. Calculate new resource state
        let new_state = calculate_new_state(
            &request.resource,
            &request.action,
            &request.context,
        )?;

        // 5. Determine required events
        let required_events = generate_required_events(&request.action);

        Ok(TransitionEvaluation {
            allowed: true,
            new_state: Some(new_state),
            required_events,
            validation_receipts: vec![],
            rejection_reasons: None,
            next_steps: None,
        })
    }
}

#[derive(Debug)]
pub struct TransitionEvaluation {
    pub allowed: bool,
    pub new_state: Option<EconomicResource>,
    pub required_events: Vec<String>,
    pub validation_receipts: Vec<ValidationReceipt>,
    pub rejection_reasons: Option<Vec<String>>,
    pub next_steps: Option<Vec<String>>,
}

#[derive(Debug)]
pub struct AgentPermissions {
    pub allowed: bool,
    pub required_roles: Vec<String>,
    pub role_status: String,
}

#[derive(Debug)]
pub struct RuleEvaluationResult {
    pub rule_hash: ActionHash,
    pub rule_type: String,
    pub passed: bool,
    pub reason: String,
}

// Evaluate all applicable governance rules
fn evaluate_governance_rules(
    request: &GovernanceTransitionRequest,
    rules: &[GovernanceRule],
) -> ExternResult<Vec<RuleEvaluationResult>> {
    let mut results = Vec::new();

    for rule in rules {
        let result = evaluate_single_rule(request, rule)?;
        results.push(result);
    }

    Ok(results)
}

// Evaluate a single governance rule
fn evaluate_single_rule(
    request: &GovernanceTransitionRequest,
    rule: &GovernanceRule,
) -> ExternResult<RuleEvaluationResult> {
    let rule_hash = hash_entry(rule)?;

    let (passed, reason) = match rule.rule_type.as_str() {
        "access_requirement" => evaluate_access_requirement(request, rule)?,
        "usage_limit" => evaluate_usage_limit(request, rule)?,
        "transfer_conditions" => evaluate_transfer_conditions(request, rule)?,
        "custody_requirement" => evaluate_custody_requirement(request, rule)?,
        "location_restriction" => evaluate_location_restriction(request, rule)?,
        _ => (true, "Unknown rule type, auto-approving".to_string()),
    };

    Ok(RuleEvaluationResult {
        rule_hash,
        rule_type: rule.rule_type.clone(),
        passed,
        reason,
    })
}
```

### 2.3 Economic Event Generation

**Event Generation Logic**:

```rust
// Generate economic events for approved transitions
fn generate_economic_event(
    request: &GovernanceTransitionRequest,
    evaluation: &TransitionEvaluation,
) -> ExternResult<EconomicEvent> {

    Ok(EconomicEvent {
        action: request.action.clone(),
        provider: request.resource.custodian,
        receiver: request.requesting_agent.clone(),
        resource_inventoried_as: Some(request.resource.conforms_to),
        affects: get_action_hash(&request.resource)?,
        resource_quantity: calculate_quantity_change(
            &request.resource,
            &request.action,
            &request.context,
        )?,
        event_time: sys_time()?,
        note: Some(format!(
            "State transition: {:?} approved",
            request.action
        )),
    })
}

// Calculate quantity changes for different actions
fn calculate_quantity_change(
    resource: &EconomicResource,
    action: &VfAction,
    context: &TransitionContext,
) -> ExternResult<f64> {
    match action {
        VfAction::Produce => {
            context.quantity_change.unwrap_or(1.0)
        }
        VfAction::Consume => {
            -context.quantity_change.unwrap_or(resource.quantity)
        }
        VfAction::Raise => {
            context.quantity_change.unwrap_or(0.0)
        }
        VfAction::Lower => {
            -context.quantity_change.unwrap_or(0.0)
        }
        _ => 0.0, // No quantity change for transfer, move, use, etc.
    }
}

// Generate required events based on action type
fn generate_required_events(action: &VfAction) -> Vec<String> {
    match action {
        VfAction::Transfer | VfAction::InitialTransfer => {
            vec!["CustodyTransfer".to_string(), "ReceiptGeneration".to_string()]
        }
        VfAction::Use => {
            vec!["ResourceUse".to_string(), "ServiceProcess".to_string()]
        }
        VfAction::Move => {
            vec!["ResourceTransport".to_string(), "LocationChange".to_string()]
        }
        VfAction::Modify => {
            vec!["ResourceRepair".to_string(), "StateChange".to_string()]
        }
        _ => vec![],
    }
}
```

### 2.4 Error Handling Patterns

**Comprehensive Error Handling**:

```rust
#[derive(Debug, thiserror::Error)]
pub enum GovernanceOperatorError {
    #[error("Permission denied: {0}")]
    PermissionDenied(String),

    #[error("Rule violation: {0}")]
    RuleViolation(String),

    #[error("Invalid state transition: {0}")]
    InvalidStateTransition(String),

    #[error("Cross-zome communication failed: {0}")]
    CrossZomeError(String),

    #[error("Data validation failed: {0}")]
    ValidationError(String),
}

// Error handling wrapper for cross-zome calls
pub fn handle_governance_call<T>(
    call_result: Result<T, WasmError>,
    fallback_action: Option<T>,
) -> Result<T, GovernanceOperatorError> {
    match call_result {
        Ok(result) => Ok(result),
        Err(wasm_error) => {
            error!("Governance call failed: {:?}", wasm_error);

            match fallback_action {
                Some(fallback) => {
                    warn!("Using fallback action due to governance unavailability");
                    Ok(fallback)
                }
                None => {
                    Err(GovernanceOperatorError::CrossZomeError(
                        wasm_error.to_string()
                    ))
                }
            }
        }
    }
}

// Resource zome error handling with fallback
#[hdk_extern]
pub fn request_resource_transition_with_fallback(
    request: GovernanceTransitionRequest,
) -> ExternResult<GovernanceTransitionResult> {

    // Try governance evaluation
    let governance_result = handle_governance_call(
        call(
            CallTargetCell::Local,
            "zome_gouvernance",
            "evaluate_state_transition".into(),
            None,
            &request,
        ),
        Some(create_fallback_approval(&request)),
    )?;

    // Apply changes if approved
    if governance_result.success {
        apply_approved_changes(&request, &governance_result)?;
    }

    Ok(governance_result)
}

// Fallback approval for when governance is unavailable
fn create_fallback_approval(request: &GovernanceTransitionRequest) -> GovernanceTransitionResult {
    match request.action {
        VfAction::Use | VfAction::Transfer => {
            // Allow basic actions without governance
            GovernanceTransitionResult {
                success: true,
                new_resource_state: Some(request.resource.clone()),
                economic_event: Some(create_basic_event(request)),
                validation_receipts: vec![],
                rejection_reasons: None,
                next_steps: Some(vec![
                    "Governance validation pending".to_string(),
                    "Manual review recommended".to_string(),
                ]),
            }
        }
        _ => {
            // Reject complex actions without governance
            GovernanceTransitionResult {
                success: false,
                new_resource_state: None,
                economic_event: None,
                validation_receipts: vec![],
                rejection_reasons: Some(vec![
                    "Governance service unavailable".to_string(),
                    "Complex action requires governance approval".to_string(),
                ]),
                next_steps: Some(vec![
                    "Retry later".to_string(),
                    "Contact system administrator".to_string(),
                ]),
            }
        }
    }
}
```

## 3. Code Examples

### 3.1 Resource State Transitions

**Complete Resource Transfer Example**:

```rust
// Transfer custody of a resource
pub async fn transfer_resource_example() -> Result<(), Box<dyn std::error::Error>> {
    let agent = Agent::new().await?;

    // 1. Create transfer request
    let transfer_request = GovernanceTransitionRequest {
        action: VfAction::TransferCustody,
        resource: get_resource("resource_hash").await?,
        requesting_agent: agent.agent_pubkey().clone(),
        context: TransitionContext {
            target_custodian: Some("new_custodian_pubkey".parse()?),
            process_notes: Some("Resource transfer for maintenance".to_string()),
            ..Default::default()
        },
    };

    // 2. Request state transition
    let result: GovernanceTransitionResult = agent.call(
        "request_resource_transition",
        transfer_request,
    ).await?;

    // 3. Handle result
    if result.success {
        println!("Transfer approved");
        if let Some(event) = result.economic_event {
            println!("Economic event generated: {:?}", event);
        }
    } else {
        println!("Transfer rejected: {:?}", result.rejection_reasons);
    }

    Ok(())
}
```

### 3.2 Governance Rule Evaluation

**Custom Rule Implementation**:

```rust
// Example: Location-based access rule
fn evaluate_location_restriction(
    request: &GovernanceTransitionRequest,
    rule: &GovernanceRule,
) -> ExternResult<(bool, String)> {

    // Parse rule parameters
    let rule_params: LocationRuleParams = serde_json::from_str(&rule.rule_data)?;

    // Get current resource location
    let current_location = request.resource.current_location.as_deref().unwrap_or("");

    // Check if action requires location compliance
    let requires_location_check = matches!(request.action,
        VfAction::Use | VfAction::Transfer | VfAction::Move
    );

    if !requires_location_check {
        return Ok((true, "Location restriction not applicable".to_string()));
    }

    // Check if current location is in allowed list
    let location_allowed = rule_params.allowed_locations.contains(&current_location.to_string());

    if location_allowed {
        Ok((true, format!("Location '{}' is allowed", current_location)))
    } else {
        Ok((false, format!(
            "Location '{}' not in allowed locations: {:?}",
            current_location,
            rule_params.allowed_locations
        )))
    }
}

#[derive(Deserialize)]
struct LocationRuleParams {
    allowed_locations: Vec<String>,
    requires_approval: bool,
    notification_required: bool,
}
```

### 3.3 Economic Event Generation

**Complex Event Generation**:

```rust
// Generate events for multi-step process chains
pub fn generate_process_chain_events(
    request: &GovernanceTransitionRequest,
    process_chain: &Vec<VfAction>,
) -> ExternResult<Vec<EconomicEvent>> {
    let mut events = Vec::new();
    let mut current_resource = request.resource.clone();

    for (index, action) in process_chain.iter().enumerate() {
        let event = EconomicEvent {
            action: action.clone(),
            provider: current_resource.custodian,
            receiver: request.requesting_agent.clone(),
            resource_inventoried_as: Some(current_resource.conforms_to),
            affects: get_action_hash(&current_resource)?,
            resource_quantity: calculate_quantity_for_action(action, &current_resource)?,
            event_time: sys_time()?,
            note: Some(format!(
                "Step {} of process chain: {:?}",
                index + 1,
                action
            )),
        };

        events.push(event);

        // Update resource state for next step
        current_resource = apply_action_to_resource(&current_resource, action)?;
    }

    Ok(events)
}
```

### 3.4 Complete Workflow Examples

**End-to-End Resource Lifecycle**:

```rust
// Complete example: Resource creation through use
pub async fn complete_resource_lifecycle() -> Result<(), Box<dyn std::error::Error>> {
    let agent = Agent::new().await?;

    // Step 1: Create resource specification
    let spec_hash = agent.call::<ActionHash>(
        "create_resource_spec",
        CreateResourceSpecInput {
            name: "3D Printer".to_string(),
            description: "Industrial 3D printer for prototyping".to_string(),
            category: "Equipment".to_string(),
            governance_rules: vec![create_usage_limit_rule()],
        },
    ).await?;

    // Step 2: Create economic resource
    let resource_hash = agent.call::<CreateResourceOutput>(
        "create_economic_resource",
        EconomicResourceInput {
            spec_hash,
            quantity: 1.0,
            unit: "unit".to_string(),
            current_location: Some("Workshop A".to_string()),
        },
    ).await?.resource_hash;

    // Step 3: Use resource (requires governance approval)
    let use_result: GovernanceTransitionResult = agent.call(
        "request_resource_transition",
        GovernanceTransitionRequest {
            action: VfAction::Use,
            resource: get_resource(resource_hash).await?,
            requesting_agent: agent.agent_pubkey().clone(),
            context: TransitionContext {
                process_notes: Some("Prototype development".to_string()),
                ..Default::default()
            },
        },
    ).await?;

    // Step 4: Handle result
    match use_result.success {
        true => {
            println!("Resource use approved");

            // Step 5: Record usage completion
            if let Some(event) = use_result.economic_event {
                let _completion_receipt = agent.call::<ActionHash>(
                    "record_usage_completion",
                    event,
                ).await?;
            }
        }
        false => {
            println!("Resource use denied: {:?}", use_result.rejection_reasons);
        }
    }

    Ok(())
}
```

## 4. Testing Patterns

### 4.1 Mock Governance for Resource Testing

**Mock Implementation for Testing**:

```rust
#[cfg(test)]
pub struct MockGovernanceEngine {
    approval_mode: ApprovalMode,
    rule_results: HashMap<String, bool>,
}

#[derive(Debug, Clone)]
pub enum ApprovalMode {
    ApproveAll,
    RejectAll,
    RoleBased(Vec<String>),
    Conditional(Box<dyn Fn(&GovernanceTransitionRequest) -> bool>),
    RuleBased(HashMap<String, bool>),
}

impl MockGovernanceEngine {
    pub fn evaluate_transition(
        &self,
        request: GovernanceTransitionRequest,
    ) -> ExternResult<GovernanceTransitionResult> {

        let approved = match &self.approval_mode {
            ApprovalMode::ApproveAll => true,
            ApprovalMode::RejectAll => false,
            ApprovalMode::RoleBased(allowed_roles) => {
                // Mock role checking
                allowed_roles.contains(&"Accountable Agent".to_string())
            }
            ApprovalMode::Conditional(validator) => validator(&request),
            ApprovalMode::RuleBased(results) => {
                // Mock rule evaluation
                self.rule_results.values().all(|&result| *result)
            }
        };

        let new_state = if approved {
            Some(calculate_new_state(&request))
        } else {
            None
        };

        Ok(GovernanceTransitionResult {
            success: approved,
            new_resource_state,
            economic_event: if approved {
                Some(generate_test_event(&request))
            } else {
                None
            },
            validation_receipts: vec![],
            rejection_reasons: if approved {
                None
            } else {
                Some(vec!["Mock rejection".to_string()])
            },
            next_steps: None,
        })
    }
}
```

**Testing Resource Zome with Mock Governance**:

```rust
#[cfg(test)]
mod resource_tests {
    use super::*;

    #[tokio::test]
    async fn test_resource_creation_with_mock_governance() {
        let mock_engine = MockGovernanceEngine {
            approval_mode: ApprovalMode::ApproveAll,
            rule_results: HashMap::new(),
        };

        // Create test request
        let create_request = GovernanceTransitionRequest {
            action: VfAction::Produce,
            resource: create_test_resource(),
            requesting_agent: create_test_agent(),
            context: TransitionContext {
                quantity_change: Some(1.0),
                ..Default::default()
            },
        };

        // Test with mock governance
        let result = mock_engine.evaluate_transition(create_request).unwrap();

        assert!(result.success);
        assert!(result.new_resource_state.is_some());
        assert!(result.economic_event.is_some());
    }

    #[tokio::test]
    async fn test_role_based_rejection() {
        let mock_engine = MockGovernanceEngine {
            approval_mode: ApprovalMode::RoleBased(vec!["Transport".to_string()]),
            rule_results: HashMap::new(),
        };

        let repair_request = GovernanceTransitionRequest {
            action: VfAction::Modify, // Requires Repair role
            resource: create_test_resource(),
            requesting_agent: create_test_agent_with_role("Transport".to_string()),
            context: Default::default(),
        };

        let result = mock_engine.evaluate_transition(repair_request).unwrap();

        assert!(!result.success);
        assert!(result.rejection_reasons.is_some());
        assert!(result.rejection_reasons.unwrap().iter()
            .any(|reason| reason.contains("Insufficient role")));
    }
}
```

### 4.2 Governance Logic Unit Testing

**Pure Function Testing**:

```rust
#[cfg(test)]
mod governance_tests {
    use super::*;

    #[test]
    fn test_permission_evaluation() {
        let agent_permissions = AgentPermissions {
            allowed: true,
            required_roles: vec!["Accountable Agent".to_string()],
            role_status: "Authorized".to_string(),
        };

        let evaluation = TransitionEvaluation {
            allowed: true,
            new_state: None,
            required_events: vec![],
            validation_receipts: vec![],
            rejection_reasons: None,
            next_steps: None,
        };

        assert!(agent_permissions.allowed);
        assert_eq!(agent_permissions.required_roles.len(), 1);
        assert!(evaluation.allowed);
    }

    #[test]
    fn test_rule_evaluation() {
        let rule = GovernanceRule {
            rule_type: "access_requirement".to_string(),
            rule_data: r#"{"min_agent_level": "Accountable Agent"}"#.to_string(),
            enforced_by: None,
            created_by: AgentPubKey::random(),
            created_at: sys_time().unwrap(),
        };

        let request = create_test_request();
        let result = evaluate_single_rule(&request, &rule).unwrap();

        assert!(result.passed);
        assert_eq!(result.rule_type, "access_requirement");
    }

    #[test]
    fn test_state_transition_validation() {
        let resource = EconomicResource {
            conforms_to: ActionHash::random(),
            quantity: 1.0,
            unit: "unit".to_string(),
            custodian: AgentPubKey::random(),
            created_by: AgentPubKey::random(),
            created_at: sys_time().unwrap(),
            current_location: Some("Workshop".to_string()),
            state: ResourceState::Active,
        };

        // Valid transition
        assert!(validate_action_state_compatibility(
            &VfAction::Transfer,
            &resource.state
        ).is_ok());

        // Invalid transition
        assert!(validate_action_state_compatibility(
            &VfAction::Use,
            &ResourceState::Reserved
        ).is_err());
    }
}
```

### 4.3 Cross-Zome Integration Testing

**Integration Test Setup**:

```rust
#[cfg(test)]
mod integration_tests {
    use super::*;

    #[tokio::test]
    async fn test_end_to_end_state_transition() {
        // Setup test environment
        let test_env = TestEnvironment::new().await;
        let resource_agent = test_env.create_agent("resource_owner").await;
        let request_agent = test_env.create_agent("requester").await;

        // Create test resource
        let resource_hash = resource_agent.call::<ActionHash>(
            "create_economic_resource",
            EconomicResourceInput {
                spec_hash: create_test_spec(),
                quantity: 1.0,
                unit: "unit".to_string(),
                current_location: Some("Test Location".to_string()),
            },
        ).await;

        // Request state transition
        let transfer_request = GovernanceTransitionRequest {
            action: VfAction::Transfer,
            resource: resource_agent.call::<EconomicResource>(
                "get_economic_resource",
                resource_hash,
            ).await,
            requesting_agent: request_agent.agent_pubkey().clone(),
            context: TransitionContext {
                target_custodian: Some(request_agent.agent_pubkey().clone()),
                ..Default::default()
            },
        };

        // Process through resource zome
        let result: GovernanceTransitionResult = resource_agent.call(
            "request_resource_transition",
            transfer_request,
        ).await;

        // Verify outcome
        assert!(result.success);
        assert!(result.economic_event.is_some());

        // Verify state changed in DHT
        let updated_resource = resource_agent.call::<EconomicResource>(
            "get_economic_resource",
            resource_hash,
        ).await;

        assert_eq!(updated_resource.custodian, request_agent.agent_pubkey());
    }

    #[tokio::test]
    async fn test_governance_rule_enforcement() {
        let test_env = TestEnvironment::new().await;
        let agent = test_env.create_agent("test_agent").await;

        // Create resource with strict governance rules
        let spec_hash = agent.call::<ActionHash>(
            "create_resource_spec",
            CreateResourceSpecInput {
                name: "Restricted Resource".to_string(),
                description: "Resource with strict access rules".to_string(),
                category: "Restricted".to_string(),
                governance_rules: vec![
                    GovernanceRule {
                        rule_type: "access_requirement".to_string(),
                        rule_data: r#"{"requires_approval": true, "min_agent_level": "Accountable Agent"}"#.to_string(),
                        enforced_by: Some("System".to_string()),
                        created_by: AgentPubKey::random(),
                        created_at: sys_time().unwrap(),
                    }
                ],
            },
        ).await;

        // Create resource
        let resource_hash = agent.call::<ActionHash>(
            "create_economic_resource",
            EconomicResourceInput {
                spec_hash,
                quantity: 1.0,
                unit: "unit".to_string(),
                current_location: Some("Test Location".to_string()),
            },
        ).await;

        // Try to use resource with Simple Agent role
        let simple_agent = test_env.create_simple_agent("simple_agent").await;
        let use_request = GovernanceTransitionRequest {
            action: VfAction::Use,
            resource: agent.call::<EconomicResource>(
                "get_economic_resource",
                resource_hash,
            ).await,
            requesting_agent: simple_agent.agent_pubkey().clone(),
            context: Default::default(),
        };

        let result: GovernanceTransitionResult = agent.call(
            "request_resource_transition",
            use_request,
        ).await;

        // Should be rejected due to insufficient role
        assert!(!result.success);
        assert!(result.rejection_reasons.is_some());
    }
}
```

## 5. Performance Considerations

### 5.1 Cross-Zome Call Optimization

**Batch Processing Pattern**:

```rust
// Process multiple state transitions efficiently
#[hdk_extern]
pub fn batch_state_transitions(
    requests: Vec<GovernanceTransitionRequest>,
) -> ExternResult<Vec<GovernanceTransitionResult>> {

    // Group requests by resource specification for efficient rule loading
    let mut grouped_requests: HashMap<ActionHash, Vec<GovernanceTransitionRequest>> = HashMap::new();

    for request in requests {
        let spec_hash = request.resource.conforms_to;
        grouped_requests.entry(spec_hash)
            .or_insert_with(Vec::new)
            .push(request);
    }

    // Process each group
    let mut all_results = Vec::new();
    for (spec_hash, group_requests) in grouped_requests {
        // Load governance rules once per group
        let governance_rules = load_governance_rules_for_spec(&spec_hash)?;

        // Process all requests in the group
        let group_results = process_request_group(group_requests, &governance_rules)?;
        all_results.extend(group_results);
    }

    Ok(all_results)
}
```

### 5.2 State Management Efficiency

**Lazy Loading and Caching**:

```rust
use std::collections::HashMap;
use lru::LruCache;

pub struct EfficientGovernanceEngine {
    rule_cache: LruCache<ActionHash, Vec<GovernanceRule>>,
    permission_cache: LruCache<AgentPubKey, AgentPermissions>,
    cache_ttl: Duration,
}

impl EfficientGovernanceEngine {
    pub fn new() -> Self {
        Self {
            rule_cache: LruCache::new(std::num::NonZeroUsize::new(100)),
            permission_cache: LruCache::new(std::num::NonZeroUsize::new(200)),
            cache_ttl: Duration::from_secs(300), // 5 minutes
        }
    }

    pub fn get_rules_cached(
        &mut self,
        spec_hash: &ActionHash,
    ) -> ExternResult<&Vec<GovernanceRule>> {
        let cache_key = spec_hash.clone();

        if !self.rule_cache.contains(&cache_key) {
            let rules = load_governance_rules_for_spec(spec_hash)?;
            self.rule_cache.put(cache_key, rules);
        }

        Ok(self.rule_cache.get(&cache_key).unwrap())
    }

    pub fn get_permissions_cached(
        &mut self,
        agent_pubkey: &AgentPubKey,
        action: &VfAction,
    ) -> ExternResult<&AgentPermissions> {
        let cache_key = format!("{}-{:?}", agent_pubkey, action);
        let cache_key_hash = hash_string(&cache_key);

        if !self.permission_cache.contains(&cache_key_hash) {
            let permissions = check_agent_permissions(agent_pubkey, action)?;
            self.permission_cache.put(cache_key_hash, permissions);
        }

        Ok(self.permission_cache.get(&cache_key_hash).unwrap())
    }
}
```

This implementation guide provides comprehensive technical details for implementing the governance-as-operator architecture, with practical examples, testing patterns, and performance optimizations for production deployment.