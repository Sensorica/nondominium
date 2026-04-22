# nondominium Implementation Status

## Overview

**nondominium** is a Holochain hApp implementing ValueFlows-compliant resource sharing with embedded governance and a Private Participation Receipt (PPR) reputation system.

This document tracks what is **actually implemented and verified** in the current codebase. Claims are grounded in code, not design documents.

## Architecture Overview

### Technology Stack

- **Backend**: Rust (Holochain HDK ^0.6.0 / HDI ^0.7.0), compiled to WASM
- **Frontend**: Svelte 5.0 + TypeScript + Vite 6.2.5 + UnoCSS + Melt UI next-gen
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

- **Entry type**: `NondominiumIdentity` with `name`, `initiator`, `property_regime`, `resource_nature`, `lifecycle_stage`, `created_at`, `description`, `successor_ndo_hash`
- **Enums**: `LifecycleStage` (10 stages: Ideation→Specification→Development→Prototype→Stable→Distributed→Active→Hibernating→Deprecated→EndOfLife), `PropertyRegime` (4 variants: Private, Commons, Nondominium, CommonPool — Collective and Pool removed after design review), `ResourceNature` (5 variants: Physical, Digital, Service, Hybrid, Information — extends spec's 3-variant definition with Service and Information)
- **Immutability**: Only `lifecycle_stage` may change post-creation; `successor_ndo_hash` set exactly once on Deprecated transition; deletes are always invalid
- **Authorization**: Only the `initiator` may call `update_lifecycle_stage` (MVP simplification; full role-based authorization per REQ-NDO-LC-07 deferred to governance zome integration)
- **Discovery links**: `AllNdos` (global `"ndo_identities"` path anchor), `AgentToNdo` (per-initiator), `NdoByLifecycleStage` / `NdoByNature` / `NdoByPropertyRegime` (categorization anchors — PR #84)
- **API**: `create_ndo`, `get_ndo` (resolves update chain), `get_all_ndos` (global anchor traversal), `get_my_ndos` (resolved entries), `update_lifecycle_stage`, `get_ndos_by_lifecycle_stage`, `get_ndos_by_nature`, `get_ndos_by_property_regime` (PR #84)
- **REQ coverage**: REQ-NDO-L0-01, -02, -03, -04, -06, -07 implemented; not yet enforced: REQ-NDO-L0-05 (EconomicEvent ref on transitions, optional in coordinator), REQ-NDO-LC-02 (governance-as-operator for transition validation), REQ-NDO-LC-03 (automatic EconomicEvent generation per transition), REQ-NDO-LC-05 (EndOfLife challenge period), REQ-NDO-LC-07 (role-based authorization per §5.3)

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

- SvelteKit + UnoCSS + Melt UI next-gen project scaffolded (`vite.config.ts`, `svelte.config.js`, `uno.config.ts`)
- `HolochainProvider.svelte` — Holochain client connection management
- Effect-TS service layer (PR #97): all three zome services and stores converted to `Context.Tag` / `Layer` / `E.gen` pattern with `isLoading` + `errorMessage` state
- `wrapZomeCallWithErrorFactory` utility for consistent zome call error handling

### MVP UI — Lobby → Group → NDO ✅ Implemented

Full three-level hierarchical UI as specified in `documentation/requirements/ui_design.md` (MVP section) and `documentation/specifications/ui_architecture.md`. The UI was substantially restructured in the UI-restructure sprint to make the Lobby the persistent outer shell with a permanent sidebar, and to fix NDO data display.

#### Shared Types

- `NdoDescriptor`, `NdoInput`, `UpdateLifecycleStageInput`, `NdoTransitionHistoryEvent` — `packages/shared-types/src/resource.types.ts`
- `PropertyRegime` — 4 variants: Private, Commons, Nondominium, CommonPool (Collective and Pool removed)
- `LobbyUserProfile`, `GroupMemberProfile` — three-level identity model
- Extended `GroupDescriptor` with `ndoHashes`, `memberProfile`, `createdBy`, `createdAt`

#### Service Layer

- `resource.service.ts` — `createNdo`, `getNdo` (returns `NondominiumIdentity | null`, matching Rust's `Option<NondominiumIdentity>`), `updateLifecycleStage`, `getMyNdos`, `getNdosByLifecycleStage/Nature/Regime`, `getNdoTransitionHistory`
- `ndo.service.ts` — `getLobbyNdoDescriptors`, `createNdo(input, groupId)`, `getGroupNdoDescriptors`, `getNdoTransitionHistory`; `getNdoDescriptorForSpecActionHash` uses `getMyNdos → getAllNdos → ResourceSpec` lookup chain with reliable base64 hash comparison
- `lobby.service.ts` — localStorage-backed: `getMyGroups`, `createGroup`, `joinGroup`, `generateInviteLink`

#### Store Layer

- `app.context.svelte.ts` — `lobbyUserProfile` state with localStorage hydration + persistence
- `lobby.store.svelte.ts` — `ndos`, `filteredNdos`, `activeFilters`, `groups`, `createGroup`, `joinGroup`; `loadLobby()` now called from root layout
- `group.store.svelte.ts` — `group`, `groupNdos`, `loadGroupData`, `createNdo`, `associateNdoWithGroup`
- `ndo-cache.ts` *(new)* — in-memory `Map<hashB64, NdoDescriptor>` populated on card click so the NDO detail page renders immediately without a DHT round-trip

#### Components — Shell / Layout

- `+layout.svelte` (root) — `onMount` calls `getMyAgentPubKey()` + `loadLobby()` + shows first-time `UserProfileForm` if no lobby profile exists; ensures sidebar has data on every route
- `Sidebar.svelte` — **rewritten as persistent LobbySidebar**: Browse NDOs link, live groups list with `/group/:id` links, inline "+ New Group" form, inline "→ Join Group" form, "My Profile / Edit profile" at bottom; "New NDO" global link removed (NDO creation lives only inside Group)
- `AppShell.svelte` — unchanged layout wrapper

#### Components — Lobby Level

- `LobbyView.svelte` — **simplified**: removed GroupSidebar and onMount data loading (both moved to root); keeps only page header and `NdoBrowser`
- `UserProfileForm.svelte` — Lobby profile create/edit (modal + page modes; nickname required)
- `NdoBrowser.svelte` — multi-select filter chips: LifecycleStage × ResourceNature × PropertyRegime (4 variants); "No NDOs yet" empty state
- `NdoCard.svelte` — NDO summary card with lifecycle/nature/regime badges; populates `ndo-cache` before navigating

#### Components — Group Level

- `GroupView.svelte` — group header, "Create NDO" button, group-scoped `NdoBrowser`; **fixed**: uses `$effect` instead of `onMount` so group data reloads correctly when navigating between groups
- `NdoCreateModal.svelte` — 5-field form (name, 4-variant regime, nature, stage, description), uniqueness check, Effect-TS errors, navigates to NDO page on success
- `GroupProfileModal.svelte` — per-group profile disclosure preferences (first visit only)

#### Components — NDO Level

- `NdoView.svelte` — **extended**: detail card with labeled Description / Property Regime / Resource Nature / Lifecycle Stage / Created fields; loading skeleton and retry-able error banner; Join NDO placeholder button ("Coming soon" tooltip); Associate with group button (always visible); Fork button (visible when Holochain connected); descriptor seeded from `ndo-cache` immediately, then refreshed from DHT
- `AssociateNdoModal.svelte` *(new)* — group-picker modal: lists user's groups from `lobbyStore`, multi-select checkboxes, writes NDO hash to target group's `ndoHashes` in localStorage via `groupStore.associateNdoWithGroup`
- `NdoIdentityLayer.svelte` — initiator profile link, lifecycle transition button (initiator-only), `TransitionHistoryPanel`; updated to 4-variant `PropertyRegime` color map
- `LifecycleTransitionModal.svelte` — full state machine (mirrors Rust), Deprecated + Hibernating special cases
- `TransitionHistoryPanel.svelte` — collapsible history: from/to stage, agent, timestamp, event_hash + copy-to-clipboard
- `ForkNdoModal.svelte` — informational fork friction modal with copy-initiator-pubkey CTA

#### Routing

- `/` (`LobbyView`) — NDO browser across all user groups
- `/group/[id]` (`GroupView`) — group-scoped NDO list + Create NDO; `?createNdo=1` auto-opens modal
- `/ndo/[id]` (`NdoView`) — full NDO detail page with detail card, actions, and tabs

### Not Yet Implemented (UI)

- Multi-member groups: invite-link generation and redemption (issue related to group backend)
- Group member list display (GroupView stub shows empty `MemberList`)
- "Join NDO" backend implementation (button is a placeholder)
- Person management components (issue #8)
- Resource management components (issue #9)
- Capability-based private data sharing UI (issue #39)
- PPR reputation visualization (issue #22)
- Economic Process workflow UI (issues #28–#32)
- Role management / agent progression UI (issues #33–#34)
- Group DNA backend (post-MVP; currently localStorage shell — `implementation_plan.md §12.6`)

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

| Area                                                   | Status         |
| ------------------------------------------------------ | -------------- |
| Person management (profiles, roles, capability grants) | ✅ Complete    |
| Resource specifications and economic resources         | ✅ Complete    |
| ValueFlows action vocabulary + economic events         | ✅ Complete    |
| Commitments and claims                                 | ✅ Complete    |
| PPR data structures + cryptographic auth               | ✅ Complete    |
| hREA Phase 1 (Person/ReaAgent bridge)                  | ✅ Complete    |
| SvelteKit + UnoCSS + Melt UI next-gen setup            | ✅ Complete    |
| Effect-TS service layer                                | ✅ Complete (PR #97) |
| NondominiumIdentity (Layer 0 identity anchor)          | ✅ Complete    |
| MVP UI — Persistent Lobby sidebar (all routes)         | ✅ Complete    |
| MVP UI — Lobby → Group → NDO hierarchy                 | ✅ Complete    |
| MVP UI — Three-level identity (Lobby/Group/Agent)      | ✅ Complete    |
| MVP UI — NDO creation within Group context             | ✅ Complete    |
| MVP UI — NDO detail page (name, description, fields)   | ✅ Complete    |
| MVP UI — NDO filter browser (3-dimension chips)        | ✅ Complete    |
| MVP UI — Lifecycle transition + history panel          | ✅ Complete    |
| MVP UI — Fork friction modal                           | ✅ Complete    |
| MVP UI — Associate NDO with group modal                | ✅ Complete    |
| MVP UI — Join NDO (placeholder)                        | ✅ Complete (placeholder) |
| MVP UI — First-time user profile modal (root layout)   | ✅ Complete    |
| PropertyRegime reduced to 4 canonical variants         | ✅ Complete    |
| Sweettest scaffold + person tests                      | ✅ Complete    |
| Economic processes (Use/Transport/Storage/Repair)      | ❌ Not started |
| PPR receipt generation and EOL workflows               | ❌ Not started |
| Governance-as-Operator architecture                    | ❌ Not started |
| Agent promotion + role validation workflows            | 🔄 Partial     |
| Person management UI components                        | ❌ Not started |
| Economic Process UI                                    | ❌ Not started |
| PPR reputation visualization                           | ❌ Not started |
| Group DNA backend (currently localStorage shell)       | ❌ Not started |
| hREA Phase 2–4                                         | ❌ Not started |

---

## Post-MVP Design Specifications

The following are documented and traceable to REQ-NDO-\* in `documentation/requirements/ndo_prima_materia.md` but are not in scope for the current development milestone:

| Track                                             | Design sources                                                                    | Implementation status                                                                                                                                  |
| ------------------------------------------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **NDO Layer 0 (identity anchor)**                 | `ndo_prima_materia.md` §§4, 8; REQ-NDO-L0-01–07                                   | **Complete** (#80) — `NondominiumIdentity` entry with lifecycle validation; REQ-NDO-L0-05 (EconomicEvent ref) and -07 (facet anchors) not yet enforced |
| **NDO Layers 1 & 2**                              | `ndo_prima_materia.md` §§4, 8, 10; `resources.md` §3                              | Not started — Layer 1 (Specification links), Layer 2 (Process links), cross-layer link types pending                                                   |
| **Lifecycle vs operational state split**          | `ndo_prima_materia.md` §5, §9.4 (`REQ-NDO-OS-01`–`06`)                            | Not started — `ResourceState` still conflated (see `zome_resource` TODOs)                                                                              |
| **Unyt (EconomicAgreement, RAVE)**                | `ndo_prima_materia.md` §6.6, §11.5; `unyt-integration.md`; REQ-NDO-CS-07–CS-11    | Not started — no Unyt cell / RAVE validation in governance zome                                                                                        |
| **Flowsta (agent linking, IdentityVerification)** | `ndo_prima_materia.md` §6.7, §11.6; `flowsta-integration.md`; REQ-NDO-CS-12–CS-15 | Not started — `flowsta-agent-linking` zomes not bundled                                                                                                |
| **Person capability slot (G15)**                  | `agent.md` §3.2; `person_zome.md`; REQ-AGENT-11, REQ-NDO-AGENT-07                 | Not started — no `FlowstaIdentity` links on `Person` hash                                                                                              |
| **Lobby DNA (multi-network federation entry point)** | `post-mvp/lobby-dna.md` REQ-LOBBY-*; `specifications/post-mvp/lobby-architecture.md` | **Complete** (#103) — `zome_lobby` DNA with `LobbyAgentProfile` + `NdoAnnouncement` entry types, Sweettest suite (`lobby_sweettest`), `lobby` role in `happ.yaml`, Moss manifest. Group DNA (#101) not yet started. |
| **NDO DNA extensions (NdoHardLink, Contribution, Agreement)** | `post-mvp/lobby-dna.md` REQ-NDO-EXT-01–16; `specifications/post-mvp/lobby-architecture.md §6` | **Complete** (#103) — three new entry types and link types added to `zome_gouvernance` integrity; coordinator modules `hard_link.rs`, `contribution.rs`, `agreement.rs` with Sweettest coverage. |

See `documentation/implementation_plan.md` Section 12 for a phased checklist aligned with the prima materia.
