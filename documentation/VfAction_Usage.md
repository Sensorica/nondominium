# VfAction Usage Guide

## Overview

The `VfAction` enum provides type-safe representation of ValueFlows actions in the Nondominium system. It replaces the previous string-based approach with a strongly-typed enum that ensures compile-time validation and better documentation.

## Available Actions

### Standard ValueFlows Actions

#### Transfer Actions
- `Transfer` - Transfer ownership/custody
- `Move` - Move a resource from one location to another

#### Production/Consumption Actions  
- `Use` - Use a resource without consuming it
- `Consume` - Consume/destroy a resource
- `Produce` - Create/produce a new resource
- `Work` - Apply work/labor to a resource

#### Modification Actions
- `Modify` - Modify an existing resource
- `Combine` - Combine multiple resources
- `Separate` - Separate one resource into multiple

#### Quantity Adjustment Actions
- `Raise` - Increase quantity/value of a resource
- `Lower` - Decrease quantity/value of a resource

#### Citation/Reference Actions
- `Cite` - Reference or cite a resource
- `Accept` - Accept delivery or responsibility

### Nondominium-Specific Actions

- `InitialTransfer` - First transfer by a Simple Agent
- `AccessForUse` - Request access to use a resource
- `TransferCustody` - Transfer custody (Nondominium specific)

## Usage Examples

### Rust (Coordinator Zome)

```rust
use zome_gouvernance_integrity::VfAction;

// Creating an economic event
let event_input = LogEconomicEventInput {
    action: VfAction::InitialTransfer,
    provider: agent_info.agent_initial_pubkey,
    receiver: input.receiver,
    resource_inventoried_as: input.resource_hash,
    resource_quantity: input.quantity,
    note: Some("First resource transfer by Simple Agent".to_string()),
};

// Creating a commitment
let commitment = Commitment {
    action: VfAction::AccessForUse,
    provider: input.provider,
    receiver: agent_info.agent_initial_pubkey,
    // ... other fields
};
```

### TypeScript (UI)

```typescript
import type { VfAction, EconomicEvent } from './types';

// Using the action type
const createEvent = (action: VfAction): EconomicEvent => ({
  action,
  provider: agentPubKey,
  receiver: receiverPubKey,
  resource_inventoried_as: resourceHash,
  affects: resourceHash,
  resource_quantity: 1.0,
  event_time: Date.now(),
});

// Example usage
const transferEvent = createEvent("InitialTransfer");
const useEvent = createEvent("Use");
```

## Action Properties

The `VfAction` enum includes helper methods to understand action behavior:

```rust
let action = VfAction::InitialTransfer;

// Check if action requires existing resource
if action.requires_existing_resource() {
    // Validate resource exists
}

// Check if action creates new resource
if action.creates_resource() {
    // Handle resource creation logic
}

// Check if action modifies quantity
if action.modifies_quantity() {
    // Update resource quantity
}

// Check if action changes custody
if action.changes_custody() {
    // Update custodian information
}
```

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

1. **Type Safety**: Compile-time validation prevents typos and invalid actions
2. **IDE Support**: Better autocomplete and refactoring support
3. **Documentation**: Self-documenting code with clear action definitions
4. **ValueFlows Compliance**: Ensures actions match standard vocabulary
5. **Maintainability**: Easier to add new actions and understand existing code

## Future Extensions

New actions can be easily added to the enum:

```rust
pub enum VfAction {
    // ... existing actions
    
    // New actions
    CustomAction,    // Custom Nondominium action
    Delegate,        // Delegate responsibility
    // etc.
}
```

Remember to also update the TypeScript types when adding new actions to maintain type consistency across the stack.