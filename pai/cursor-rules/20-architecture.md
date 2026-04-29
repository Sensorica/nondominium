# Nondominium Architecture

## Three-Zome Structure
- `zome_person` — Agent identity, profiles, roles, capability-based access, PPR storage
- `zome_resource` — Pure data model: ResourceSpecification, EconomicResource, GovernanceRule,
  NondominiumIdentity (Layer 0). No business logic.
- `zome_gouvernance` — State transition operator: evaluates GovernanceRules, generates
  EconomicEvents, issues PPRs. Cross-zome calls from resource zome flow here.

## Governance-as-Operator Pattern
Resource zome owns data. Governance zome owns transitions.
```
request_resource_transition(GovernanceTransitionRequest) → evaluate_state_transition() → GovernanceTransitionResult
```
This separation means governance logic can evolve without touching data structures.

## NDO Three-Layer Model (Layer 0 complete; Layers 1 & 2 in progress)
- **Layer 0 — NondominiumIdentity**: Permanent anchor. `action_hash` is the stable NDO ID.
  Fields: `name`, `initiator`, `property_regime`, `resource_nature`, `lifecycle_stage`,
  `created_at`, `description`. Immutable except `lifecycle_stage`. Never deleted.
- **Layer 1 — ResourceSpecification**: Activated when resource has form to share. Linked via
  `NDOToSpecification` link. Contains governance rules, assets, tags.
- **Layer 2 — Process**: Activated when multi-agent coordination begins. Linked via
  `NDOToProcess` link. Contains EconomicEvents, Commitments, Claims, PPRs.

## LifecycleStage State Machine
```
Ideation → Specification → Development → Prototype → Stable → Distributed → Active
  → Hibernating (reversible) → Deprecated → EndOfLife (terminal)
```
Valid transitions encoded in both Rust validation (`zome_resource` integrity) and frontend
`LifecycleTransitionModal.svelte`. Deprecated requires `successor_ndo_hash`.

## Key Entry Types
`NondominiumIdentity`, `ResourceSpecification`, `EconomicResource`, `GovernanceRule` (resource zome)
`EconomicEvent`, `Commitment`, `Claim`, `ValidationReceipt`, `PrivateParticipationClaim`,
`ResourceValidation` (governance zome)
`Person`, `PrivatePersonData`, `PersonRole`, `Device`, `AgentPersonRelationship` (person zome)

## Data Model References
- Full specs: `documentation/specifications/specifications.md`
- NDO architecture: `documentation/requirements/ndo_prima_materia.md`
- Implementation status: `documentation/IMPLEMENTATION_STATUS.md`
