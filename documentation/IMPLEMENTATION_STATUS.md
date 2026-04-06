# nondominium Implementation Status

## Overview

**nondominium** is a Holochain hApp implementing ValueFlows-compliant resource sharing with embedded governance and a Private Participation Receipt (PPR) reputation system.

This document tracks what is **actually implemented and verified** in the current codebase. Claims are grounded in code, not design documents.

## Architecture Overview

### Technology Stack

- **Backend**: Rust (Holochain HDK ^0.6.0 / HDI ^0.7.0), compiled to WASM
- **Frontend**: Svelte 5.0 + TypeScript + Vite 6.2.5 + TailwindCSS
- **Testing**: Sweettest (Rust, primary) — Tryorama (TypeScript) is deprecated
- **Client**: @holochain/client 0.19.0 for DHT interaction

### Zome Architecture (3-Zome Structure)

1. **`zome_person`** - Agent identity, profiles, roles, and capability-based access control
2. **`zome_resource`** - Resource specifications, lifecycle management, and governance rules
3. **`zome_gouvernance`** - Economic events, commitments, claims, and the PPR reputation system

Each zome follows the integrity/coordinator pattern.

---

## Phase 1: Complete ✅

### Person Management

- **Public Profiles**: `Person` entries with name, avatar, and bio
- **Private Data**: `EncryptedProfile` entries with PII (legal name, email, phone, address, emergency contact)
- **Role-Based Access**: `PersonRole` assignments — `SimpleAgent`, `AccountableAgent`, `PrimaryAccountableAgent`, `Transport`, `Repair`, `Storage`
- **Agent-to-Person Mapping**: Secure linking between Holochain agents and their profiles

#### Capability-Based Access Control ✅

- **Capability Grants**: Time-limited access tokens with field-level permissions
- **Filtered Data Access**: `FilteredPrivateData` entries with selective field exposure
- **Grant Metadata**: `PrivateDataCapabilityMetadata` for tracking access grants
- **Field-Level Control**: Granular permissions for email, phone, location, time_zone, emergency_contact, address
- **Time-Based Expiration**: 30-day maximum grant duration with configurable expiration

#### Not yet implemented (person domain)

- Private data access request/approval workflow (#40)
- Audit trail for private data access events (#38)
- `get_expiring_grants()` for proactive grant lifecycle management (#37)
- Full agent promotion workflow logic (#33) — roles exist, promotion workflow incomplete
- Specialized role validation (#34)

### Resource Management

#### Resource Specifications ✅

- `ResourceSpecification` entries with name, description, category
- Tag-based discovery, governance rule linking, active/inactive status

#### Economic Resources ✅

- `EconomicResource` entries conforming to specifications
- Quantity tracking with units, custodian assignment, location metadata
- Five-state lifecycle: `PendingValidation`, `Active`, `Maintenance`, `Retired`, `Reserved`

> **Note**: The current `ResourceState` conflates lifecycle maturity and operational condition. The NDO three-layer model (post-MVP) separates these into `LifecycleStage` + `OperationalState`. See `documentation/requirements/ndo_prima_materia.md`.

#### Governance Rules ✅

- Extensible rule system with JSON-encoded parameters
- Enforcement role requirements, resource attachment, audit trail

#### NDO Layer 0 — Identity Anchor ✅

`NondominiumIdentity` provides a permanent identity anchor for any resource from conception through end-of-life. Implemented in PR #80.

- **Entry type**: `NondominiumIdentity` with `name`, `initiator`, `property_regime`, `resource_nature`, `lifecycle_stage`, `created_at`, `description`
- **Enums**: `LifecycleStage` (10 stages: Ideation→Specification→Development→Prototype→Stable→Distributed→Active→Hibernating→Deprecated→EndOfLife), `PropertyRegime` (6 variants), `ResourceNature` (5 variants)
- **Immutability**: Only `lifecycle_stage` may change post-creation; deletes are always invalid
- **Authorization**: Only the `initiator` may call `update_lifecycle_stage`
- **Discovery links**: `AllNdos` (global `"ndo_identities"` path anchor), `AgentToNdo` (per-initiator)
- **API**: `create_ndo`, `get_ndo` (resolves update chain), `update_lifecycle_stage`
- **REQ coverage**: REQ-NDO-L0-01, -02, -03, -04, -06 implemented; REQ-NDO-L0-05 (EconomicEvent ref on transitions) not yet enforced; REQ-NDO-L0-07 (per-stage/nature/regime discovery anchors) not yet implemented

### Discovery and Query Patterns ✅

- Anchors: `AllResourceSpecifications`, `AllEconomicResources`, `AllGovernanceRules`
- Hierarchical links: Specification → Resource, Custodian → Resources
- Category-based, location-based, and state-based query support

---

## Phase 2: In Progress 🔄

### ValueFlows Economic Framework

#### Action Vocabulary ✅

Standard ValueFlows actions (`Transfer`, `Move`, `Use`, `Consume`, `Produce`, `Work`, `Modify`, `Combine`, `Separate`, `Raise`, `Lower`, `Cite`, `Accept`) plus nondominium extensions (`InitialTransfer`, `AccessForUse`, `TransferCustody`).

#### Economic Events ✅

- `EconomicEvent` entry capture with provider/receiver, resource linking, quantity, timestamping

#### Commitments & Claims ✅

- Future economic commitments with due dates
- `Claim` entries for fulfillment tracking
- Bidirectional links: Commitments ↔ Events ↔ Claims

#### Economic Processes ❌ Not implemented

Use, Transport, Storage, and Repair process workflows are specified but not implemented. Tracked in #28, #29, #31, #32.

### PPR Reputation System

#### Data Structures ✅

16 `ParticipationClaimType` variants are defined in `zome_gouvernance/src/ppr.rs`:
- Genesis: `ResourceCreation`, `ResourceValidation`
- Custody: `CustodyTransfer`, `CustodyAcceptance`
- Services: `MaintenanceCommitmentAccepted`, `MaintenanceFulfillmentCompleted`, `StorageCommitmentAccepted`, `StorageFulfillmentCompleted`, `TransportCommitmentAccepted`, `TransportFulfillmentCompleted`, `GoodFaithTransfer`
- Governance: `DisputeResolutionParticipation`, `ValidationActivity`, `RuleCompliance`
- End-of-Life: `EndOfLifeDeclaration`, `EndOfLifeValidation`

Performance score fields (timeliness, quality, reliability, communication, satisfaction) and `ReputationSummary` struct with category breakdowns are implemented.

#### Cryptographic Authentication ✅

Bilateral signature system with dual signatures, hash-based security, and temporal validation is implemented in the integrity zome.

#### Not yet implemented (PPR domain)

- Bi-directional receipt generation zome functions (#14)
- Genesis role and custody receipt issuance workflows (#15, #16)
- End-of-life management with multi-validator security (#18)
- Challenge period mechanism for EOL declarations (#19)
- Historical review system for EOL abuse prevention (#20)
- PPR reputation aggregation zome function (#21)

### Governance-as-Operator Architecture ❌ Not implemented

The governance-as-operator pattern (pure-function `GovernanceEngine`, cross-zome interface types, Request-Evaluate-Apply resource refactor, automatic event generation on state transitions) is fully specified in `documentation/specifications/governance/` but not yet implemented. Tracked in #41–#44.

---

## hREA Dual-DNA Integration

### Phase 1: Complete ✅

- hREA git submodule (`vendor/hrea`, Sensorica fork)
- `happ.yaml` dual-DNA roles configuration
- hREA DNA compiled and included in `.webhapp` bundle
- `hrea_agent_hash` field added to `Person` integrity entry
- `create_rea_agent` bridge call in `zome_person` coordinator
- `create_person` creates a `ReaAgent` in hREA first
- Cross-DNA validation tests in Sweettest

### Phases 2–4: Not started ❌

Resource lifecycle, governance/PPR wiring, and production hardening via hREA are tracked under epic #47.

---

## Frontend

### Infrastructure ✅

- SvelteKit + TailwindCSS project scaffolded (`vite.config.ts`, `svelte.config.js`)
- `HolochainProvider.svelte` — Holochain client connection management
- Service layer stubs: `person.service.ts`, `resource.service.ts`, `governance.service.ts`
- Store layer stubs: `person.store.svelte.ts`, `resource.store.svelte.ts`, `governance.store.svelte.ts`

### UI Components ❌ Not implemented

No domain-specific UI components exist yet. The following are tracked as open issues:

- Person management components (#8)
- Resource management components (#9)
- Effect-TS service layer (#7) — current services use plain TypeScript
- Capability-based private data sharing UI (#39)
- PPR reputation visualization (#22)

---

## Testing Infrastructure

### Sweettest (Rust) — Primary ✅

All new tests are written in Sweettest in `dnas/nondominium/tests/src/`.

**Shared setup utilities** (`common::conductors`):
- `setup_two_agents()` — two conductors, nondominium DNA
- `setup_three_agents()` — three conductors, nondominium DNA
- `setup_dual_dna_two_agents()` — two conductors, nondominium + hREA DNAs

**Test modules:**
- `misc/mod.rs` — zome connectivity (ping)
- `person/mod.rs` — person zome + hREA bridge tests

### Tryorama (TypeScript) — Deprecated ⚠

Tests in `tests/` are deprecated. See `tests/DEPRECATED.md` for migration status. Do not write new tests there.

---

## Development Environment & Tooling ✅

```bash
git submodule update --init --recursive  # Initialize hREA submodule (REQUIRED)
nix develop              # Reproducible environment (REQUIRED)
bun install              # Dependency installation
bun run start            # 2-agent development network with UIs
bun run build:zomes      # WASM compilation
bun run build:happ       # DNA packaging
bun run package          # Final .webhapp distribution

# Sweettest (primary test runner)
CARGO_TARGET_DIR=target/native-tests cargo test --package nondominium_sweettest
```

---

## Current Status Summary

| Area | Status |
|---|---|
| Person management (profiles, roles, capability grants) | ✅ Complete |
| Resource specifications and economic resources | ✅ Complete |
| ValueFlows action vocabulary + economic events | ✅ Complete |
| Commitments and claims | ✅ Complete |
| PPR data structures + cryptographic auth | ✅ Complete |
| hREA Phase 1 (Person/ReaAgent bridge) | ✅ Complete |
| SvelteKit + TailwindCSS setup | ✅ Complete |
| Sweettest scaffold + person tests | ✅ Complete |
| Economic processes (Use/Transport/Storage/Repair) | ❌ Not started |
| PPR receipt generation and EOL workflows | ❌ Not started |
| Governance-as-Operator architecture | ❌ Not started |
| Agent promotion + role validation workflows | 🔄 Partial |
| Frontend UI components | ❌ Not started |
| Effect-TS service layer | ❌ Not started |
| hREA Phase 2–4 | ❌ Not started |
| NondominiumIdentity (Layer 0 identity anchor) | ✅ Complete |

---

## Post-MVP Design Specifications

The following are documented and traceable to REQ-NDO-* in `documentation/requirements/ndo_prima_materia.md` but are not in scope for the current development milestone:

| Track | Design sources | Implementation status |
|---|---|---|
| **NDO Layer 0 (identity anchor)** | `ndo_prima_materia.md` §§4, 8; REQ-NDO-L0-01–07 | **Complete** (#80) — `NondominiumIdentity` entry with lifecycle validation; REQ-NDO-L0-05 (EconomicEvent ref) and -07 (facet anchors) not yet enforced |
| **NDO Layers 1 & 2** | `ndo_prima_materia.md` §§4, 8, 10; `resources.md` §3 | Not started — Layer 1 (Specification links), Layer 2 (Process links), cross-layer link types pending |
| **Lifecycle vs operational state split** | `ndo_prima_materia.md` §5, §9.4 (`REQ-NDO-OS-01`–`06`) | Not started — `ResourceState` still conflated (see `zome_resource` TODOs) |
| **Unyt (EconomicAgreement, RAVE)** | `ndo_prima_materia.md` §6.6, §11.5; `unyt-integration.md`; REQ-NDO-CS-07–CS-11 | Not started — no Unyt cell / RAVE validation in governance zome |
| **Flowsta (agent linking, IdentityVerification)** | `ndo_prima_materia.md` §6.7, §11.6; `flowsta-integration.md`; REQ-NDO-CS-12–CS-15 | Not started — `flowsta-agent-linking` zomes not bundled |
| **Person capability slot (G15)** | `agent.md` §3.2; `person_zome.md`; REQ-AGENT-11, REQ-NDO-AGENT-07 | Not started — no `FlowstaIdentity` links on `Person` hash |

See `documentation/implementation_plan.md` Section 12 for a phased checklist aligned with the prima materia.
