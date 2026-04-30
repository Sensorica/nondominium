# Nondominium Architecture

> **Navigation index.** Sources of truth are in `documentation/`. When content here
> conflicts with `documentation/`, `documentation/` wins.

## Three-Zome Structure
Source: `documentation/specifications/specifications.md §2`, `CLAUDE.md — Architecture Overview`

- `zome_person` — Agent identity, profiles, roles, capability-based access, PPR storage
- `zome_resource` — Pure data model: ResourceSpecification, EconomicResource, GovernanceRule,
  NondominiumIdentity (Layer 0). No business logic.
- `zome_gouvernance` — State transition operator: evaluates GovernanceRules, generates
  EconomicEvents, issues PPRs. Cross-zome calls from resource zome flow here.

## Governance-as-Operator Pattern
Source: `documentation/specifications/specifications.md §3`, `documentation/requirements/requirements.md §9.3`

Resource zome owns data. Governance zome owns transitions.
```
request_resource_transition(GovernanceTransitionRequest) → evaluate_state_transition() → GovernanceTransitionResult
```
This separation means governance logic can evolve without touching data structures.

## NDO Three-Layer Model
Source: `documentation/requirements/ndo_prima_materia.md §4–§5`

- **Layer 0 — NondominiumIdentity**: Permanent anchor. `action_hash` is the stable NDO ID.
  Fields: `name`, `initiator`, `property_regime`, `resource_nature`, `lifecycle_stage`,
  `created_at`, `description`. Immutable except `lifecycle_stage`. Never deleted.
- **Layer 1 — ResourceSpecification**: Activated when resource has form to share. Linked via
  `NDOToSpecification` link. Contains governance rules, assets, tags.
- **Layer 2 — Process**: Activated when multi-agent coordination begins. Linked via
  `NDOToProcess` link. Contains EconomicEvents, Commitments, Claims, PPRs.

## LifecycleStage State Machine
Source: `documentation/specifications/specifications.md §7.5`

```
Ideation → Specification → Development → Prototype → Stable → Distributed → Active
  → Hibernating (reversible) → Deprecated → EndOfLife (terminal)
```
Valid transitions encoded in both Rust validation (`zome_resource` integrity) and frontend
`LifecycleTransitionModal.svelte`. Deprecated requires `successor_ndo_hash`.

## Key Entry Types
Source: `documentation/specifications/specifications.md §4`

`NondominiumIdentity`, `ResourceSpecification`, `EconomicResource`, `GovernanceRule` (resource zome)
`EconomicEvent`, `Commitment`, `Claim`, `ValidationReceipt`, `PrivateParticipationClaim`,
`ResourceValidation` (governance zome)
`Person`, `PrivatePersonData`, `PersonRole`, `Device`, `AgentPersonRelationship` (person zome)

## Documentation Sources

| Topic | Source |
|---|---|
| Full data structures and entry specs | `documentation/specifications/specifications.md` |
| NDO three-layer architecture | `documentation/requirements/ndo_prima_materia.md` |
| Agent ontology and roles | `documentation/requirements/agent.md` |
| Resource ontology | `documentation/requirements/resources.md` |
| Governance model | `documentation/requirements/governance.md` |
| Requirements (REQ-* IDs) | `documentation/requirements/requirements.md` |
| Implementation status | `documentation/IMPLEMENTATION_STATUS.md` |
| Project vision and AI principles | `documentation/TELOS.md` |
