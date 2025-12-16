# VfAction Usage Guide

## Overview

The `VfAction` enum provides type-safe representation of ValueFlows actions in the nondominium system, supporting structured Economic Processes, role-based access control, and comprehensive governance workflows. It replaces the previous string-based approach with a strongly-typed enum that ensures compile-time validation, better documentation, and seamless integration with the Private Participation Receipt (PPR) system.

## Available Actions

### Standard ValueFlows Actions

#### Transfer Actions

- **`Transfer`** - Transfer ownership/custody between agents
- **`Move`** - Move a resource from one location to another (used in Transport processes)

#### Production/Consumption Actions

- **`Use`** - Core nondominium process: use a resource without consuming it (accessible to all Accountable Agents)
- **`Consume`** - Consume/destroy a resource (used in end-of-life processes)
- **`Produce`** - Create/produce a new resource
- **`Work`** - Apply work/labor to a resource (used in Transport and Storage processes, requires specialized roles)

#### Modification Actions

- `Modify` - Modify an existing resource, applies to the Repair Process, accessible by Agents that have credencials for the Repair role.

#### Quantity Adjustment Actions

- **`Raise`** - Increase quantity/value of a resource
- **`Lower`** - Decrease quantity/value of a resource

#### Citation/Reference Actions

- **`Cite`** - Reference or cite a resource
- **`Accept`** - Accept delivery or responsibility

### nondominium-Specific Actions

- **`InitialTransfer`** - First transfer by a Simple Agent (triggers agent promotion process)
- **`AccessForUse`** - Request access to use a resource (creates commitment for Use process)
- **`TransferCustody`** - Transfer custody between Primary Accountable Agents (nondominium specific)

## VfAction in Economic Processes

The nondominium system implements four structured Economic Processes that use specific VfAction combinations:

### Process-Action Mappings

#### **Use Process** (Core nondominium process)

- **Primary Action**: `Use`
- **Access**: All Accountable Agents
- **Resource Effect**: Resource unchanged
- **PPR Generated**: Service process receipts

#### **Transport Process** (Material resource movement)

- **Primary Actions**: `Move`, `Work`
- **Access**: Agents with Transport role credentials only
- **Resource Effect**: Resource location changed, otherwise unchanged
- **PPR Generated**: Transport-specific service receipts

#### **Storage Process** (Temporary custody)

- **Primary Actions**: `Work`, `TransferCustody`
- **Access**: Agents with Storage role credentials only
- **Resource Effect**: Resource unchanged
- **PPR Generated**: Storage-specific service receipts

#### **Repair Process** (Resource maintenance)

- **Primary Actions**: `Modify`, `Work`
- **Access**: Agents with Repair role credentials only
- **Resource Effect**: Resource state may change (broken → functional)
- **PPR Generated**: Repair-specific service receipts

## Usage Examples

### Economic Process Workflows

#### Simple Agent First Transaction

```rust
use zome_gouvernance_integrity::VfAction;

// Simple Agent's first transfer (triggers promotion)
let initial_transfer_event = LogEconomicEventInput {
    action: VfAction::InitialTransfer,
    provider: simple_agent_pubkey,
    receiver: accountable_agent_pubkey,
    resource_inventoried_as: new_resource_hash,
    resource_quantity: 1.0,
    note: Some("First resource transfer triggering agent promotion".to_string()),
};

// This automatically triggers:
// 1. Resource validation by receiving agent
// 2. Simple Agent promotion to Accountable Agent
// 3. Bi-directional PPR issuance (ResourceContribution + NetworkValidation)
```

#### Use Process (Core nondominium)

```rust
// Creating commitment for Use process
let use_commitment = Commitment {
    action: VfAction::Use,
    provider: resource_custodian,
    receiver: requesting_agent,
    resource_inventoried_as: Some(resource_hash),
    input_of: Some(use_process_hash),
    due_date: future_timestamp,
    note: Some("Resource use under governance rules".to_string()),
    committed_at: sys_time()?,
};

// Economic event upon completion
let use_event = LogEconomicEventInput {
    action: VfAction::Use,
    provider: resource_custodian,
    receiver: requesting_agent,
    resource_inventoried_as: resource_hash,
    resource_quantity: 1.0,
    note: Some("Resource used according to embedded governance rules".to_string()),
};
```

#### Transport Process (Specialized role required)

```rust
// Transport process commitment (requires Transport role)
let transport_commitment = Commitment {
    action: VfAction::Work, // Transport is a Work action
    provider: transport_agent_with_credentials,
    receiver: destination_agent,
    resource_inventoried_as: Some(resource_hash),
    input_of: Some(transport_process_hash),
    due_date: delivery_deadline,
    note: Some("Transport resource to new location".to_string()),
    committed_at: sys_time()?,
};

// Movement event during transport
let move_event = LogEconomicEventInput {
    action: VfAction::Move,
    provider: transport_agent,
    receiver: destination_agent,
    resource_inventoried_as: resource_hash,
    resource_quantity: 1.0,
    note: Some("Resource moved from origin to destination".to_string()),
};
```

#### Repair Process (Modifies resource state)

```rust
// Repair commitment (requires Repair role)
let repair_commitment = Commitment {
    action: VfAction::Modify,
    provider: repair_agent_with_credentials,
    receiver: resource_owner,
    resource_inventoried_as: Some(broken_resource_hash),
    input_of: Some(repair_process_hash),
    due_date: repair_completion_date,
    note: Some("Repair resource from broken to functional state".to_string()),
    committed_at: sys_time()?,
};

// Repair completion event
let repair_event = LogEconomicEventInput {
    action: VfAction::Modify,
    provider: repair_agent,
    receiver: resource_owner,
    resource_inventoried_as: broken_resource_hash,
    resource_quantity: 1.0,
    note: Some("Resource repaired: broken → functional".to_string()),
};
```

#### Process Chaining (Multi-role agent)

```rust
// Agent with Transport + Repair roles chaining actions
let chained_commitment = Commitment {
    action: VfAction::Work, // Represents entire chain
    provider: multi_role_agent,
    receiver: final_recipient,
    resource_inventoried_as: Some(resource_hash),
    input_of: Some(chained_process_hash),
    due_date: completion_deadline,
    note: Some("Transport → Repair → Transport delivery chain".to_string()),
    committed_at: sys_time()?,
};

// Single completion event for entire chain
let chain_completion_event = LogEconomicEventInput {
    action: VfAction::Work,
    provider: multi_role_agent,
    receiver: final_recipient,
    resource_inventoried_as: resource_hash,
    resource_quantity: 1.0,
    note: Some("Completed transport + repair + delivery chain".to_string()),
};
```

### TypeScript (UI) - Process Management

```typescript
import type { VfAction, EconomicEvent, Commitment } from "./types";

// Process initiation helper
const initiateProcess = (
  processType: "Use" | "Transport" | "Storage" | "Repair",
  resourceHash: string,
  agentHasRole: boolean,
): Commitment => {
  if (!agentHasRole && processType !== "Use") {
    throw new Error(`Agent lacks required role for ${processType} process`);
  }

  const actionMap: Record<string, VfAction> = {
    Use: "Use",
    Transport: "Work",
    Storage: "Work",
    Repair: "Modify",
  };

  return {
    action: actionMap[processType],
    provider: agentPubKey,
    receiver: recipientPubKey,
    resource_inventoried_as: resourceHash,
    input_of: `${processType.toLowerCase()}_process_${Date.now()}`,
    due_date: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
    note: `${processType} process commitment`,
    committed_at: Date.now(),
  };
};

// Usage examples
const useCommitment = initiateProcess("Use", resourceHash, true); // All Accountable Agents can use
const transportCommitment = initiateProcess(
  "Transport",
  resourceHash,
  hasTransportRole,
);
const repairCommitment = initiateProcess("Repair", resourceHash, hasRepairRole);

// PPR generation tracking
const trackPPRGeneration = (commitment: Commitment, event: EconomicEvent) => {
  // When claim links commitment to event, bi-directional PPRs are automatically generated
  console.log(
    `PPRs will be issued for ${commitment.action} process completion`,
  );

  // Example PPR types generated:
  // - ServiceCommitmentAccepted (when commitment created)
  // - ServiceFulfillmentCompleted (when event recorded)
  // - Corresponding counterparty receipts
};
```

## Action Properties & Role Requirements

The `VfAction` enum includes helper methods to understand action behavior and governance requirements:

```rust
use zome_gouvernance_integrity::VfAction;

let action = VfAction::Work; // Used in Transport/Storage processes

// Check if action requires existing resource
if action.requires_existing_resource() {
    // Validate resource exists before allowing action
    let resource_exists = verify_resource_exists(resource_hash)?;
}

// Check if action creates new resource
if action.creates_resource() {
    // Handle resource creation logic and trigger validation
    let validation_required = action == VfAction::Produce;
}

// Check if action modifies quantity
if action.modifies_quantity() {
    // Update resource quantity and validate changes
    update_resource_quantity(resource_hash, new_quantity)?;
}

// Check if action changes custody
if action.changes_custody() {
    // Update custodian information and generate custody PPRs
    transfer_custody_with_pprs(current_custodian, new_custodian)?;
}

// NEW: Check if action requires specialized role
fn requires_specialized_role(action: &VfAction, process_type: &str) -> Option<String> {
    match (action, process_type) {
        (VfAction::Work, "Transport") => Some("Transport".to_string()),
        (VfAction::Work, "Storage") => Some("Storage".to_string()),
        (VfAction::Modify, "Repair") => Some("Repair".to_string()),
        (VfAction::Use, _) => None, // Accessible to all Accountable Agents
        _ => None,
    }
}

// NEW: Check if action triggers PPR generation
fn triggers_ppr_generation(action: &VfAction) -> bool {
    match action {
        VfAction::InitialTransfer => true, // ResourceContribution + NetworkValidation
        VfAction::Use => true,            // Service process receipts
        VfAction::Work => true,           // Transport/Storage service receipts
        VfAction::Modify => true,         // Repair service receipts
        VfAction::TransferCustody => true, // ResponsibleTransfer + CustodyAcceptance
        _ => false,
    }
}

// NEW: Get process validation requirements
fn get_validation_requirements(action: &VfAction, process_type: &str) -> ValidationRequirements {
    match (action, process_type) {
        (VfAction::InitialTransfer, _) => ValidationRequirements {
            requires_resource_validation: true,
            requires_agent_validation: true,
            minimum_validators: 1,
            validation_scheme: "simple_majority".to_string(),
        },
        (VfAction::Work, "Transport") => ValidationRequirements {
            requires_process_validation: true,
            minimum_validators: 1,
            validation_scheme: "simple_approval".to_string(),
        },
        (VfAction::Modify, "Repair") => ValidationRequirements {
            requires_process_validation: true,
            requires_state_change_validation: true,
            minimum_validators: 1,
            validation_scheme: "simple_approval".to_string(),
        },
        _ => ValidationRequirements::default(),
    }
}

// Example usage in process validation
let transport_action = VfAction::Work;
if let Some(required_role) = requires_specialized_role(&transport_action, "Transport") {
    let agent_has_role = check_agent_role(agent_pubkey, &required_role)?;
    if !agent_has_role {
        return Err(ProcessError::InsufficientRole(required_role));
    }
}

if triggers_ppr_generation(&transport_action) {
    // Prepare for automatic PPR issuance upon process completion
    prepare_ppr_generation(commitment_hash, process_type)?;
}
```

### Role-Action Matrix

| Action            | Use Process | Transport Process | Storage Process | Repair Process | Role Required            |
| ----------------- | ----------- | ----------------- | --------------- | -------------- | ------------------------ |
| `Use`             | ✓ (Primary) | -                 | -               | -              | Accountable Agent        |
| `Work`            | -           | ✓ (Primary)       | ✓ (Primary)     | ✓ (Secondary)  | Transport/Storage Role   |
| `Modify`          | -           | -                 | -               | ✓ (Primary)    | Repair Role              |
| `Move`            | -           | ✓ (Secondary)     | -               | -              | Transport Role           |
| `TransferCustody` | -           | ✓ (Final)         | ✓ (Final)       | ✓ (Final)      | Process Role + Custodian |

## Migration from String-Based Actions

### Before (String-based)

```rust
// Old approach - error-prone
let event = EconomicEvent {
    action: "initial-transfer".to_string(), // Could have typos
    // ...
};
```

### After (Enum-based)

```rust
// New approach - type-safe
let event = EconomicEvent {
    action: VfAction::InitialTransfer, // Compile-time validation
    // ...
};
```

## Benefits

### Core Development Benefits

1. **Type Safety**: Compile-time validation prevents typos and invalid actions
2. **IDE Support**: Better autocomplete and refactoring support
3. **Documentation**: Self-documenting code with clear action definitions
4. **ValueFlows Compliance**: Ensures actions match standard vocabulary
5. **Maintainability**: Easier to add new actions and understand existing code

### Governance Integration Benefits

6. **Role-Based Access Control**: Automatic validation of agent roles for specialized processes
7. **PPR Integration**: Seamless Private Participation Receipt generation for reputation tracking
8. **Process Validation**: Built-in support for Economic Process validation requirements
9. **Cross-Zome Consistency**: Unified action handling across person, resource, and governance zomes
10. **Audit Trail Completeness**: Every action properly logged with governance context

### Economic Process Benefits

11. **Process Chaining Support**: Enable complex multi-step service delivery
12. **State Management**: Proper resource state transitions based on action type
13. **Validation Automation**: Automatic triggering of appropriate validation workflows
14. **Performance Tracking**: Built-in performance metrics for service quality assessment

### Security & Privacy Benefits

15. **Capability Enforcement**: Actions respect progressive agent capability levels
16. **End-to-End Validation**: From commitment through completion with cryptographic signatures
17. **Dispute Resolution Support**: Clear action history for conflict resolution
18. **Privacy Preservation**: PPR generation respects private entry storage patterns

## Future Extensions

The VfAction enum is designed for extensibility to support advanced governance features:

### Phase 2 Action Extensions

```rust
pub enum VfAction {
    // ... existing actions

    // Advanced governance actions
    Delegate,        // Delegate responsibility to another agent
    Revoke,          // Revoke access or role assignment
    Audit,           // Formal audit process initiation
    Mediate,         // Dispute mediation action
    Escalate,        // Escalate dispute to higher governance level
}
```

### Phase 3 Network Actions

```rust
pub enum VfAction {
    // ... existing actions

    // Cross-network actions
    Bridge,          // Bridge resource to another network
    Federate,        // Federate governance across networks
    Synchronize,     // Synchronize state across federated networks
    Migrate,         // Migrate resource between networks
}
```

### Integration Requirements for New Actions

When adding new VfAction variants:

1. **Update Helper Methods**: Extend `requires_existing_resource()`, `creates_resource()`, etc.
2. **Define Role Requirements**: Specify which agent roles can perform the action
3. **PPR Integration**: Define what PPR types should be generated
4. **Validation Rules**: Specify validation requirements and schemes
5. **Process Integration**: Define how action fits into Economic Processes
6. **TypeScript Types**: Update UI types for consistency

### Example: Adding a Delegate Action

```rust
// 1. Add to enum
pub enum VfAction {
    // ... existing actions
    Delegate,  // Delegate responsibility to another agent
}

// 2. Update helper methods
impl VfAction {
    pub fn requires_delegation_capability(&self) -> bool {
        match self {
            VfAction::Delegate => true,
            _ => false,
        }
    }
}

// 3. Define role requirements
fn requires_specialized_role(action: &VfAction, process_type: &str) -> Option<String> {
    match (action, process_type) {
        // ... existing matches
        (VfAction::Delegate, _) => Some("Primary Accountable Agent".to_string()),
        _ => None,
    }
}

// 4. PPR integration
fn triggers_ppr_generation(action: &VfAction) -> bool {
    match action {
        // ... existing matches
        VfAction::Delegate => true, // DelegationAccepted + ResponsibilityTransferred
        _ => false,
    }
}

// 5. TypeScript update
export type VfAction =
  // ... existing actions
  | "Delegate"; // Delegate responsibility to another agent
```

### Action Design Principles

New actions should follow these principles:

- **ValueFlows Alignment**: Maintain compatibility with ValueFlows standard
- **Role-Based Access**: Clear role requirements for governance
- **PPR Generation**: Automatic reputation tracking integration
- **Process Awareness**: Integration with Economic Process workflows
- **Validation Support**: Built-in validation and compliance checking
- **Privacy Preservation**: Respect private entry patterns for sensitive operations

Remember to update all three layers (Rust integrity, Rust coordinator, TypeScript UI) when adding new actions to maintain type consistency and governance integration across the entire stack.
