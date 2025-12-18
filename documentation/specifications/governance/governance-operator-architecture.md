# Governance-as-Operator Architecture Specification

## 1. Overview

The governance-as-operator architecture establishes a clear separation between data management and business logic enforcement in the nondominium system. This design enables independent evolution of resource data structures and governance rules, providing a foundation for modular, maintainable, and extensible decentralized resource management.

### 1.1 Core Principles

- **Resource Zome**: Pure data model responsible for resource specification management, economic resource lifecycle, and data persistence
- **Governance Zome**: State transition operator responsible for evaluating governance rules, validating state changes, and generating economic events
- **Cross-Zome Interface**: Well-defined communication protocol for state transition requests and decisions
- **Event-Driven Architecture**: All state changes generate corresponding economic events for audit trails and reputation tracking

### 1.2 Business Benefits

- **Modularity**: Independent evolution of data structures and governance logic
- **Testability**: Governance logic can be unit tested independently of data management
- **Swappability**: Different governance schemes can be applied to the same resource types
- **Maintainability**: Clear separation of concerns reduces system complexity

## 2. Cross-Zome Interface Specifications

### 2.1 State Transition Request

The primary interface for resource state changes follows this structure:

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

#[derive(Serialize, Deserialize, Debug, Clone)]
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
}
```

### 2.2 State Transition Result

The governance zome returns detailed results for each transition request:

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

### 2.3 Resource State Change

Detailed resource state changes tracked by the system:

```rust
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct ResourceStateChange {
    /// Hash of the original resource state
    pub original_resource_hash: ActionHash,
    /// Hash of the new resource state
    pub new_resource_hash: ActionHash,
    /// Action that triggered the state change
    pub triggering_action: VfAction,
    /// Agent who initiated the change
    pub initiated_by: AgentPubKey,
    /// Governance decision that authorized the change
    pub governance_decision: GovernanceDecision,
    /// Economic event recording the change
    pub economic_event: EconomicEvent,
    /// Timestamp when the change occurred
    pub changed_at: Timestamp,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct GovernanceDecision {
    /// Whether the change was approved
    pub approved: bool,
    /// Governance rules that were evaluated
    pub evaluated_rules: Vec<ActionHash>,
    /// Role-based permission check results
    pub role_permissions: Vec<RolePermissionResult>,
    /// Additional validation constraints
    pub validation_constraints: Vec<ValidationConstraint>,
    /// Decision rationale
    pub rationale: String,
}
```

## 3. Modular Design Patterns

### 3.1 Pure Function Governance

Governance logic is implemented as pure functions that evaluate state transitions without side effects:

```rust
impl GovernanceEngine {
    /// Pure function: evaluates state transition without side effects
    pub fn evaluate_transition(
        request: GovernanceTransitionRequest,
        rules: Vec<GovernanceRule>,
        agent_permissions: AgentPermissions,
    ) -> ExternResult<TransitionEvaluation> {

        // 1. Validate agent permissions
        let permission_result = validate_agent_permissions(
            &request.requesting_agent,
            &request.action,
            &agent_permissions,
        )?;

        // 2. Evaluate applicable governance rules
        let rule_results = evaluate_governance_rules(
            &request.resource,
            &request.action,
            &rules,
        )?;

        // 3. Check state transition validity
        let state_validity = validate_state_transition(
            &request.resource.state,
            &request.action,
            &request.context,
        )?;

        // 4. Combine all evaluations into final decision
        Ok(TransitionEvaluation {
            allowed: permission_result.allowed && rule_results.all_passed && state_validity.valid,
            new_state: calculate_new_state(&request.resource, &request.action, &request.context)?,
            required_events: generate_required_events(&request.action),
            validation_notes: combine_validation_notes(permission_result, rule_results, state_validity),
        })
    }
}
```

### 3.2 State Management Isolation

Resource state management is isolated from governance evaluation:

```rust
// Resource zome: manages state but delegates decision making
impl ResourceManager {
    pub fn request_state_change(
        &self,
        request: GovernanceTransitionRequest,
    ) -> ExternResult<GovernanceTransitionResult> {

        // 1. Get current resource state
        let current_resource = self.get_resource(request.resource_hash)?;

        // 2. Call governance operator for decision
        let governance_result = call GovernanceZome::evaluate_transition(
            GovernanceTransitionRequest {
                action: request.action,
                resource: current_resource,
                requesting_agent: request.requesting_agent,
                context: request.context,
            }
        )?;

        // 3. Apply state change if approved
        if governance_result.success {
            if let Some(new_state) = governance_result.new_resource_state {
                self.update_resource_state(new_state)?;
            }

            if let Some(event) = governance_result.economic_event {
                self.record_economic_event(event)?;
            }
        }

        Ok(governance_result)
    }
}
```

### 3.3 Event Generation Patterns

All state changes generate corresponding economic events:

```rust
impl EventGenerator {
    pub fn generate_state_change_event(
        action: VfAction,
        resource_before: &EconomicResource,
        resource_after: Option<&EconomicResource>,
        requesting_agent: AgentPubKey,
        governance_decision: &GovernanceDecision,
    ) -> ExternResult<EconomicEvent> {

        Ok(EconomicEvent {
            action,
            provider: resource_before.custodian,
            receiver: requesting_agent,
            resource_inventoried_as: resource_before.conforms_to,
            affects: get_action_hash(resource_before)?,
            resource_quantity: calculate_quantity_change(resource_before, resource_after)?,
            event_time: sys_time()?,
            note: Some(format!(
                "State change approved: {}",
                governance_decision.rationale
            )),
        })
    }
}
```

## 4. Implementation Guidelines

### 4.1 Cross-Zome Call Patterns

Efficient cross-zome communication patterns:

```rust
// Resource zome: synchronous governance evaluation
#[hdk_extern]
pub fn request_resource_transition(
    request: GovernanceTransitionRequest,
) -> ExternResult<GovernanceTransitionResult> {

    // 1. Prepare cross-zome call
    let governance_input = request.clone();

    // 2. Call governance zome
    let result: GovernanceTransitionResult = call(
        CallTargetCell::Local,
        "zome_gouvernance",
        "evaluate_state_transition".into(),
        None,
        &governance_input,
    )?;

    // 3. Handle result and update local state
    if result.success {
        update_resource_state(result.new_resource_state)?;
        create_economic_event(result.economic_event)?;
    }

    Ok(result)
}

// Governance zome: pure function evaluation
#[hdk_extern]
pub fn evaluate_state_transition(
    request: GovernanceTransitionRequest,
) -> ExternResult<GovernanceTransitionResult> {

    // 1. Load applicable governance rules
    let rules = get_applicable_rules(&request.resource)?;

    // 2. Evaluate using pure function
    let evaluation = GovernanceEngine::evaluate_transition(
        request,
        rules,
        get_agent_permissions(&request.requesting_agent)?,
    )?;

    // 3. Generate economic event if approved
    let economic_event = if evaluation.allowed {
        Some(generate_economic_event(&request, &evaluation)?)
    } else {
        None
    };

    Ok(GovernanceTransitionResult {
        success: evaluation.allowed,
        new_resource_state: evaluation.new_state,
        economic_event,
        validation_receipts: evaluation.validation_receipts,
        rejection_reasons: evaluation.rejection_reasons,
        next_steps: evaluation.next_steps,
    })
}
```

### 4.2 Error Handling Strategies

Robust error handling across zome boundaries:

```rust
#[derive(Debug, Serialize, Deserialize)]
pub enum GovernanceError {
    PermissionDenied(String),
    RuleViolation(String),
    InvalidStateTransition(String),
    ResourceNotFound(String),
    CrossZomeCallFailed(String),
}

// Resource zome error handling
pub fn handle_governance_result(
    result: Result<GovernanceTransitionResult, GovernanceError>
) -> ExternResult<()> {
    match result {
        Ok(transition_result) => {
            if transition_result.success {
                // Apply approved changes
                apply_state_changes(transition_result)?;
            } else {
                // Log rejection for audit trail
                log_governance_rejection(transition_result)?;
            }
            Ok(())
        }
        Err(GovernanceError::CrossZomeCallFailed(msg)) => {
            // Log error but don't fail completely
            warn!("Governance evaluation failed: {}", msg);
            Err(WasmError::Guest(format!("Governance unavailable: {}", msg)).into())
        }
        Err(error) => {
            // Log other errors
            error!("Governance error: {:?}", error);
            Err(WasmError::Guest(error.to_string()).into())
        }
    }
}
```

### 4.3 Validation Separation

Clear separation between data validation and governance validation:

```rust
// Resource zome: data integrity validation
impl ResourceValidator {
    pub fn validate_resource_data(
        resource: &EconomicResource,
    ) -> ExternResult<()> {
        // Pure data validation
        if resource.quantity <= 0.0 {
            return Err(ResourceError::InvalidQuantity.into());
        }

        if resource.unit.trim().is_empty() {
            return Err(ResourceError::InvalidUnit.into());
        }

        // Check specification exists
        let _spec = get(resource.conforms_to, GetOptions::default())?
            .ok_or(ResourceError::SpecificationNotFound)?;

        Ok(())
    }
}

// Governance zome: business rule validation
impl GovernanceValidator {
    pub fn validate_governance_rules(
        request: &GovernanceTransitionRequest,
        rules: &[GovernanceRule],
    ) -> ExternResult<Vec<RuleValidationResult>> {
        rules.iter()
            .map(|rule| evaluate_rule(request, rule))
            .collect()
    }
}
```

## 5. Testing Strategy

### 5.1 Unit Testing Governance Logic

Isolated testing of governance evaluation logic:

```rust
#[cfg(test)]
mod governance_tests {
    use super::*;

    #[test]
    fn test_transfer_approval() {
        let request = create_transfer_request();
        let rules = create_test_rules();
        let permissions = create_test_permissions();

        let result = GovernanceEngine::evaluate_transition(
            request,
            rules,
            permissions,
        ).unwrap();

        assert!(result.allowed);
        assert!(result.new_state.is_some());
        assert!(!result.validation_receipts.is_empty());
    }

    #[test]
    fn test_unauthorized_role_rejection() {
        let request = create_repair_request();
        let permissions = AgentPermissions {
            roles: vec!["Transport".to_string()], // No Repair role
            ..Default::default()
        };

        let result = GovernanceEngine::evaluate_transition(
            request,
            vec![],
            permissions,
        ).unwrap();

        assert!(!result.allowed);
        assert!(result.rejection_reasons.unwrap().iter()
            .any(|reason| reason.contains("Insufficient role")));
    }
}
```

### 5.2 Cross-Zome Integration Testing

Testing interaction between resource and governance zomes:

```rust
#[cfg(test)]
mod cross_zome_tests {
    use super::*;

    #[test]
    fn test_end_to_end_state_transition() {
        // Setup test environment
        let (conductor_config, _dna_file) = setup_test_environment().await;
        let alice_agent = setup_agent(conductor_config.clone()).await;
        let bob_agent = setup_agent(conductor_config).await;

        // Create test resource
        let resource_hash = alice_agent.call::<CreateResourceOutput>(
            "create_economic_resource",
            create_test_resource_input(),
        ).await?.resource_hash;

        // Request state change
        let transition_request = GovernanceTransitionRequest {
            action: VfAction::Transfer,
            resource: get_resource(resource_hash).await?,
            requesting_agent: bob_agent.agent_pub_key().clone(),
            context: TransitionContext {
                target_custodian: Some(bob_agent.agent_pub_key().clone()),
                ..Default::default()
            },
        };

        // Process transition
        let result = alice_agent.call::<GovernanceTransitionResult>(
            "request_resource_transition",
            transition_request,
        ).await?;

        assert!(result.success);
        assert!(result.economic_event.is_some());
    }
}
```

### 5.3 Mock Governance for Resource Testing

Mock governance for isolated resource zome testing:

```rust
pub struct MockGovernanceZome {
    approval_mode: ApprovalMode,
}

#[derive(Debug)]
pub enum ApprovalMode {
    ApproveAll,
    RejectAll,
    RoleBased(Vec<String>),
    Conditional(Box<dyn Fn(&GovernanceTransitionRequest) -> bool>),
}

impl MockGovernanceZome {
    pub fn evaluate_transition(
        &self,
        request: GovernanceTransitionRequest,
    ) -> ExternResult<GovernanceTransitionResult> {
        let approved = match &self.approval_mode {
            ApprovalMode::ApproveAll => true,
            ApprovalMode::RejectAll => false,
            ApprovalMode::RoleBased(allowed_roles) => {
                // Mock role checking logic
                false // Simplified for example
            }
            ApprovalMode::Conditional(validator) => validator(&request),
        };

        Ok(GovernanceTransitionResult {
            success: approved,
            new_resource_state: if approved {
                Some(calculate_new_state(&request))
            } else {
                None
            },
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

## 6. Performance Considerations

### 6.1 Cross-Zome Call Optimization

Strategies for efficient cross-zome communication:

```rust
// Batch multiple state changes
#[hdk_extern]
pub fn batch_state_transitions(
    requests: Vec<GovernanceTransitionRequest>,
) -> ExternResult<Vec<GovernanceTransitionResult>> {

    // Group requests by governance rules needed
    let mut grouped_requests = HashMap::new();
    for request in requests {
        let rule_set = determine_required_rules(&request);
        grouped_requests.entry(rule_set)
            .or_insert_with(Vec::new)
            .push(request);
    }

    // Process each group with single governance call
    let mut results = Vec::new();
    for (rule_set, group_requests) in grouped_requests {
        let group_results = evaluate_transition_group(rule_set, group_requests)?;
        results.extend(group_results);
    }

    Ok(results)
}
```

### 6.2 State Management Efficiency

Efficient state management patterns:

```rust
// Lazy evaluation of governance rules
pub struct LazyRuleEvaluator {
    cached_rules: LruCache<String, Vec<GovernanceRule>>,
    rule_loader: Box<dyn Fn(&str) -> ExternResult<Vec<GovernanceRule>>>,
}

impl LazyRuleEvaluator {
    pub fn get_rules_for_resource(
        &mut self,
        resource_spec: &ActionHash,
    ) -> ExternResult<&Vec<GovernanceRule>> {
        let cache_key = format!("{}", resource_spec);

        if !self.cached_rules.contains(&cache_key) {
            let rules = (self.rule_loader)(&cache_key)?;
            self.cached_rules.put(cache_key.clone(), rules);
        }

        Ok(self.cached_rules.get(&cache_key).unwrap())
    }
}
```

This architecture specification provides the technical foundation for implementing the governance-as-operator pattern, ensuring clear separation of concerns while maintaining efficient cross-zome communication and comprehensive state management.