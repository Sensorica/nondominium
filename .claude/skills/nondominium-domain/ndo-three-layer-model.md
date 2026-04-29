# NDO Three-Layer Model

Source: `documentation/requirements/ndo_prima_materia.md` §4–§5

## Conceptual Foundation

The NDO (Nondominium Object) is the prima materia of the Nondominium system — a minimal
DHT structure that carries the potential to become any resource type. The three layers
match the brain architecture analogy: brainstem (Layer 0, vital/permanent), cerebellum
(Layer 1, coordination/form), cortex (Layer 2, agency/activity).

Layers are not sequential phases — they co-activate. At EndOfLife, only Layer 0 remains
as a permanent tombstone.

## Layer 0 — NondominiumIdentity (Identity Anchor)

**Always active. Never deleted. action_hash = stable NDO ID (DID-like).**

```rust
pub struct NondominiumIdentity {
    pub name: String,
    pub description: Option<String>,
    pub initiator: AgentPubKey,
    pub property_regime: PropertyRegime,
    pub resource_nature: ResourceNature,
    pub lifecycle_stage: LifecycleStage,   // only field that changes post-creation
    pub created_at: Timestamp,
}
```

- `action_hash` of the Create action becomes the permanent NDO identifier
- `update_entry` on lifecycle transitions — `update_lifecycle_stage` coordinator function
- Transitions are validated in integrity zome (see state machine below)
- At EndOfLife: only Layer 0 survives as tombstone

**Activation scenarios:** stub registration, idea externalization, minimal representation,
end-of-life tombstone

## Layer 1 — ResourceSpecification (The Form)

**Activated when resource has form worth sharing.**

Link: `NDOToSpecification` (from Layer 0 `action_hash` to `ResourceSpecification` `action_hash`)

Contains:
- Design intent, standards, dimensions
- `Vec<GovernanceRule>` — embedded access/transfer rules
- Assets, tags, categories
- Digital integrity manifests (post-MVP)

**When to activate:** design worth sharing → distributed fabrication → peer review needed
**When dormant:** hibernation, EndOfLife, spec archived (`is_active: false`)

**Critical insight:** In distributed fabrication, Layer 1 specification IS the product
(cosmolocal production). The spec is shared globally, instances are produced locally.

## Layer 2 — Process (The Activity)

**Activated when multi-agent economic work begins.**

Link: `NDOToProcess` (from Layer 0 `action_hash` to ValueFlows `Process` `action_hash`)

Contains:
- `EconomicEvent` records (what happened)
- `Commitment` records (what was promised)
- `Claim` records (promise → fulfillment link)
- `PrivateParticipationClaim` / PPR records (private, bilateral, signed)

**When to activate:** second agent involved, custody transfer, use event, PPR issuance

## LifecycleStage State Machine

```
Ideation
  → Specification | Deprecated | EndOfLife

Specification
  → Development | Deprecated | EndOfLife

Development
  → Prototype | Deprecated | EndOfLife

Prototype
  → Stable | Deprecated | EndOfLife

Stable
  → Distributed | Deprecated | EndOfLife

Distributed
  → Active | Deprecated | EndOfLife

Active
  → Hibernating | Deprecated | EndOfLife

Hibernating
  → <hibernation_origin> | Deprecated | EndOfLife
  (reversible; stores origin stage in entry)

Deprecated
  → EndOfLife

EndOfLife
  → (terminal; no transitions)
```

**Special transitions:**
- `→ Deprecated`: `successor_ndo_hash` required
- `→ Hibernating`: `hibernation_origin` = current stage stored in entry
- `transition_event_hash` is `null` in MVP (EconomicEvent generation deferred to Phase 2.3)

**Implementation:** Validated in `zome_resource` integrity AND mirrored in
`LifecycleTransitionModal.svelte` frontend. They must stay in sync.

## Layer Composition by Lifecycle Stage

| Stage | Layer 0 | Layer 1 | Layer 2 |
|---|---|---|---|
| Ideation | ✅ | — | — |
| Specification | ✅ | ✅ | — |
| Development → Active | ✅ | ✅ | ✅ |
| Hibernating | ✅ | ✅ (inactive) | ✅ (paused) |
| Deprecated | ✅ | ✅ (archived) | ✅ (closed) |
| EndOfLife | ✅ (tombstone) | — | — |

## PropertyRegime Enum (Current MVP)

```rust
pub enum PropertyRegime {
    Private,     // Full rights bundle; individual ownership
    Commons,     // Non-rivalrous shared resource; licensing/attribution governance
    Collective,  // Cooperative/collective ownership
    Pool,        // Rivalrous shared resources; custody/scheduling/maintenance
    CommonPool,  // Rivalrous consumable; quota/depletion rules
    Nondominium, // Uncapturable by design; contribution-based access; no alienation
}
```

## ResourceNature Enum (Current MVP)

```rust
pub enum ResourceNature {
    Digital,  // Software, data, design files, documents
    Physical, // Material objects, equipment, spaces
    Hybrid,   // Digital twin of a physical resource
}
// Post-MVP: Space, Method, Currency
```

## Governance-as-Operator Relationship

Layer 0 lifecycle transitions go through the governance zome:
```
resource.update_lifecycle_stage(input)
  → call("zome_gouvernance", "evaluate_state_transition", request)
  → GovernanceTransitionResult { success, new_state, economic_event, ... }
  → resource zome applies approved state
```

This is the REQ-ARCH-07 pattern. The resource zome is a pure data model; the governance
zome is the state transition operator.

## Implementation Status
- Layer 0 `NondominiumIdentity`: **Complete** (PR #80)
- Lifecycle transitions UI: **Complete**
- Layers 1 & 2 activation: **Not started**
- LifecycleStage vs OperationalState split: **Not started**
