# ValueFlows Alignment in Nondominium

Source: `documentation/specifications/specifications.md §3`, `documentation/requirements/requirements.md §9.2`

## VF Ontology Layers in Use

ValueFlows defines three ontology layers. Nondominium uses all three:

| VF Layer | Purpose | Nondominium Entry |
|---|---|---|
| **Knowledge** | Type/template | `ResourceSpecification` |
| **Plan** | Intent | `Commitment` |
| **Observation** | What happened | `EconomicEvent`, `Claim` |

## VfAction Enum (16 actions)

**Standard ValueFlows:**
`Transfer`, `Move`, `Use`, `Consume`, `Produce`, `Work`, `Modify`, `Combine`, `Separate`,
`Raise`, `Lower`, `Cite`, `Accept`

**Nondominium Extensions:**
- `InitialTransfer` — first transaction by Simple Agent; triggers role promotion workflow
- `AccessForUse` — access request; triggers governance evaluation
- `TransferCustody` — custody-specific transfer preserving nondominium property regime

Each action has semantic methods:
```rust
action.requires_existing_resource() -> bool
action.creates_resource() -> bool
action.modifies_quantity() -> bool
action.changes_custody() -> bool
```

## Commitment → EconomicEvent → Claim Cycle

```
Commitment {
    action: VfAction,
    provider: AgentPubKey,
    receiver: AgentPubKey,
    resource_inventoried_as: Option<ActionHash>,
    resource_conforms_to: Option<ActionHash>,  // → ResourceSpecification
    input_of: Option<ActionHash>,              // → EconomicProcess
    due_date: Timestamp,
    committed_at: Timestamp,
}
  ↓ (fulfilled)
EconomicEvent {
    action: VfAction,
    provider: AgentPubKey,
    receiver: AgentPubKey,
    resource_inventoried_as: ActionHash,
    resource_quantity: f64,
    event_time: Timestamp,
}
  ↓ (proves)
Claim {
    fulfills: ActionHash,      // → Commitment
    fulfilled_by: ActionHash,  // → EconomicEvent
    claimed_at: Timestamp,
}
  ↓ (triggers)
PrivateParticipationClaim (PPR) — private, bilateral
```

This cycle is **both governance and economics** — consistent with VF's unified model.

## EconomicResource VF Mapping

```rust
pub struct EconomicResource {
    pub quantity: f64,
    pub unit: String,
    pub custodian: AgentPubKey,          // VF: primaryAccountable
    pub current_location: Option<String>,
    pub state: ResourceState,
}
// conforms_to: ResourceSpecification (via link)  → VF: conformsTo
// custodian: PrimaryAccountableAgent             → VF: primaryAccountable
```

## hREA Integration

Phase 1 complete (dual-DNA setup, bridge calls):
- `zome_person` creates `Person` → bridges to hREA `Agent` entry
- Bridge validation in Sweettest: `setup_dual_dna_two_agents()` from `common::conductors`
- Phases 2–4 not started (epic #47)

**hREA entry types** (separate DNA, not in nondominium DNA):
`EconomicResource`, `EconomicEvent`, `Commitment`, `Process`, `Agent`

## What VF Compliance Means in Practice (REVIEW.md §3)

**Flag as violations:**
- Missing required `EconomicEvent` fields (`provider`, `receiver`, `resource_inventoried_as`, `event_time`)
- Creating or modifying resources without a corresponding `EconomicEvent`
- Using non-spec field names (e.g., `owner` instead of `custodian`)
- Bypassing governance zome for state transitions that require governance evaluation
- PPR `claim_type` outside the 16 `ParticipationClaimType` values

**Accept:**
- Actions that don't produce resources (read queries, capability checks)
- Batch reads for discovery (anchor link traversal)

## GovernanceRule (Current MVP — Weakly Typed)

```rust
pub struct GovernanceRule {
    pub rule_type: String,              // e.g., "access_requirement"
    pub rule_data: String,              // JSON-encoded, untyped
    pub enforced_by: Option<String>,    // Role required to enforce
}
```

Post-MVP: `GovernanceRuleType` enum with typed schemas (`EconomicAgreement` for Unyt,
`IdentityVerification` for Flowsta). Currently free-form strings.

## GovernanceTransitionRequest / Result (Cross-Zome Interface)

```rust
pub struct GovernanceTransitionRequest {
    pub action: VfAction,
    pub resource: EconomicResource,
    pub requesting_agent: AgentPubKey,
    pub context: TransitionContext,
}

pub struct GovernanceTransitionResult {
    pub success: bool,
    pub new_resource_state: Option<EconomicResource>,
    pub economic_event: Option<EconomicEvent>,
    pub validation_receipts: Vec<ValidationReceipt>,
    pub rejection_reasons: Option<Vec<String>>,
    pub next_steps: Option<Vec<String>>,
}
```
