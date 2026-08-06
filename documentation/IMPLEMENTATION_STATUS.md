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

### Multi-DNA hApp Architecture

The packaged hApp currently contains four roles:

1. **`lobby`** — fixed, permissionless federation DHT for Lobby profiles and Group discovery
2. **`nondominium`** — the core NDO DNA, containing:
   - `zome_person` — Agent identity, profiles, roles, capabilities, and devices
   - `zome_resource` — specifications, inventoried resources, governance-rule data, and NDO Layer 0
   - `zome_gouvernance` — events, commitments, claims, validation, PPR prototypes, and federation extensions
3. **`hrea`** — bundled hREA DNA used by the Person/ReaAgent bridge
4. **`group`** — deferred template role; each Group is provisioned as an isolated cloned cell (`clone_limit: 64`)

Each local DNA domain follows the integrity/coordinator pattern. The core Nondominium domain remains a three-zome architecture, but the installed hApp is a multi-DNA system.

### Status Terminology

- **Complete** — implemented end-to-end for the stated scope and covered by active tests
- **Implemented** — working code/API exists, but may not be exposed in every UI
- **Partial / prototype** — code exists, but contains placeholders, incomplete workflow integration, or limited tests
- **Not implemented** — no operational implementation exists

---

## Core Backend

### Person Management 🔄 Core implemented; workflows partial

- **Public Profiles**: `Person` entries with name, avatar, and bio
- **Private Data**: private `PrivatePersonData` entries with legal name, email, phone, address, emergency contact, time zone, and location
- **Role-Based Access**: `PersonRole` assignments — `SimpleAgent`, `AccountableAgent`, `PrimaryAccountableAgent`, `Transport`, `Repair`, `Storage`
- **Agent-to-Person Mapping**: bidirectional Agent↔Person links supporting multiple agent keys per Person
- **Profile APIs**: create, update, latest-version resolution, global discovery, current-agent profile, and composed Person profile queries

#### Capability-Based Access Control 🔄 Prototype

- **Capability Grants**: Holochain capability grants plus `PrivateDataCapabilityMetadata` with field-level allowlists, context, expiry, and local capability secret
- **Filtered Data Access**: `FilteredPrivateData` response views
- **Field-Level Control**: Granular permissions for email, phone, location, time_zone, emergency_contact, address
- **Time-Based Expiration**: callable grants accept arbitrary `expires_in_days` (default 7); role-based defaults top out at 30 days, but there is **no global hard maximum enforcement**
- **Implemented APIs**: `grant_private_data_access`, `create_private_data_cap_claim`, `get_private_data_with_capability`, `revoke_private_data_access`, owned/role-based/transferable grant helpers, and governance-oriented private-data validation
- **Prototype limitations**: retrieval still contains mock/fallback paths for test situations, and comprehensive active Sweettests are missing

#### Multi-Device Support ✅ Implemented

- `Device` entries with `Active`, `Inactive`, and `Revoked` status
- `AgentPersonRelationship` entries with `Primary`, `Secondary`, and `Device` relationship types
- Device registration, per-Person and current-agent discovery, device lookup, activity updates, and deactivation
- Device and relationship integrity validation and bidirectional Person/device links

#### Partial or not yet implemented (person domain)

- Private data access request/approval workflow (#40)
- Audit trail for private data access events (#38)
- `get_expiring_grants()` for proactive grant lifecycle management (#37)
- Full agent promotion workflow (#33): promotion and approval externs exist, but `request_role_promotion` still returns a placeholder hash instead of a queryable request entry
- Specialized role validation (#34): the governance extern exists but currently auto-approves and contains Phase 2 authorization/credential TODOs
- Complete active Sweettest coverage for capability sharing, roles, devices, and promotion workflows

### Resource Management

#### Resource Specifications ✅

- `ResourceSpecification` entries with name, description, category
- Tag-based discovery, governance rule linking, active/inactive status

#### Economic Resources ✅ Data model and CRUD implemented

- `EconomicResource` entries conforming to specifications
- Quantity tracking with units, custodian assignment, location metadata
- `OperationalState` on `EconomicResource`: `PendingValidation`, `Available`, `Reserved`, `InTransit`, `InStorage`, `InMaintenance`, `InUse` (REQ-NDO-OS-01 ✅ data layer)
- Creation, updates, latest-version resolution, queries by specification/custodian/operational state, first-resource checks, custody transfer, and `update_operational_state` / `get_resources_by_operational_state` APIs

> **Note**: Lifecycle maturity lives on `NondominiumIdentity` (`LifecycleStage`). Process condition lives on `EconomicResource` (`operational_state`). Governance-zome ownership of operational transitions (REQ-NDO-OS-02/03) remains deferred.

#### Governance Rules 🔄 Persistence implemented; enforcement pending

- `GovernanceRule` CRUD, update chains, type discovery, and specification attachment
- Extensible `rule_type`, JSON-encoded `rule_data`, and optional `enforced_by` role metadata
- Rule semantics are not yet evaluated programmatically; update integrity validation remains permissive pending Governance-as-Operator

#### NDO Layer 0 — Identity Anchor ✅

`NondominiumIdentity` provides a permanent identity anchor for any resource from conception through end-of-life. Implemented in PR #80.

- **Entry type**: `NondominiumIdentity` with `name`, `initiator`, `property_regime`, `resource_nature`, `lifecycle_stage`, `created_at`, `description`, `successor_ndo_hash`, and `hibernation_origin`
- **LifecycleStage**: 10 stages — Ideation → Specification → Development → Prototype → Stable → Distributed → Active → Hibernating → Deprecated → EndOfLife
- **PropertyRegime**: 6 canonical variants — `Private`, `Commons`, `Collective`, `Pool`, `CommonPool`, `Nondominium`
- **ResourceNature**: 5 variants — `Physical`, `Digital`, `Service`, `Hybrid`, `Information`
- **Immutability**: identity fields are permanent; `lifecycle_stage` changes through the validated state machine, `successor_ndo_hash` is set once on deprecation, and `hibernation_origin` is set/cleared during suspension/resumption; deletes are always invalid
- **Authorization**: Only the `initiator` may call `update_lifecycle_stage` (MVP simplification; full role-based authorization per REQ-NDO-LC-07 deferred to governance zome integration)
- **Discovery links**: `AllNdos` (global `"ndo_identities"` path anchor), `AgentToNdo` (per-initiator), `NdoByLifecycleStage` / `NdoByNature` / `NdoByPropertyRegime` (categorization anchors — PR #84)
- **API**: `create_ndo`, `get_ndo` (resolves update chain), `get_all_ndos` (global anchor traversal), `get_my_ndos` (resolved entries), `update_lifecycle_stage`, `get_ndos_by_lifecycle_stage`, `get_ndos_by_nature`, `get_ndos_by_property_regime` (PR #84)
- **REQ coverage**: Layer 0 creation, permanence, lifecycle validation, and facet links are implemented. Link-level integrity hardening remains pending for categorization links. Also pending: required transition EconomicEvents, Governance-as-Operator evaluation, automatic event generation, EndOfLife challenge periods, and role-based lifecycle authorization.

### Discovery and Query Patterns ✅

- Anchors: `AllResourceSpecifications`, `AllEconomicResources`, `AllGovernanceRules`
- Hierarchical links: Specification → Resource, Custodian → Resources
- Category-based, location-based, and state-based query support

---

## ValueFlows and Governance Backend

### ValueFlows Economic Framework

#### Action Vocabulary ✅

Standard ValueFlows actions (`Transfer`, `Move`, `Use`, `Consume`, `Produce`, `Work`, `Modify`, `Combine`, `Separate`, `Raise`, `Lower`, `Cite`, `Accept`) plus nondominium extensions (`InitialTransfer`, `AccessForUse`, `TransferCustody`).

#### Economic Events ✅ Entry/API implemented

- `EconomicEvent` creation and retrieval with provider/receiver, resource references, quantity, timestamp, and optional note
- Queries by Agent and EconomicResource

#### Commitments & Claims ✅ Entry/API implemented

- Future economic commitments with due dates
- `Claim` entries for fulfillment tracking
- Commitment proposal/acceptance and Claim creation/retrieval APIs
- Links from Agents/resources to Commitments and from Commitments to Claims

#### Economic Processes ❌ Not implemented end-to-end

Use, Transport, Storage, and Repair process workflows are specified but not implemented as `EconomicProcess` entries or coordinated state machines. Existing VfAction, Commitment, EconomicEvent, resource transition, and WorkLog primitives do not yet form these workflows. Tracked in #28, #29, #31, #32.

### PPR Reputation System

#### Data Structures ✅

16 `ParticipationClaimType` variants are defined in `zome_gouvernance/src/ppr.rs`:

- Genesis: `ResourceCreation`, `ResourceValidation`
- Custody: `CustodyTransfer`, `CustodyAcceptance`
- Services: `MaintenanceCommitmentAccepted`, `MaintenanceFulfillmentCompleted`, `StorageCommitmentAccepted`, `StorageFulfillmentCompleted`, `TransportCommitmentAccepted`, `TransportFulfillmentCompleted`, `GoodFaithTransfer`
- Governance: `DisputeResolutionParticipation`, `ValidationActivity`, `RuleCompliance`
- End-of-Life: `EndOfLifeDeclaration`, `EndOfLifeValidation`

Performance score fields (timeliness, quality, reliability, communication, satisfaction) and `ReputationSummary` struct with category breakdowns are implemented.

#### Cryptographic Authentication 🔄 Prototype

Signature structures, signed-data hashing, timestamp checks, score-range validation, and signer checks exist. However, `issue_participation_receipts` currently inserts a placeholder counterparty signature. The counterparty must subsequently call `sign_participation_claim`; this is not yet a fully authenticated, atomic bilateral issuance flow.

#### Implemented PPR coordinator surface 🔄

- `issue_participation_receipts`
- `sign_participation_claim`
- `validate_participation_claim_signature`
- `validate_participation_claim_signature_enhanced`
- `get_my_participation_claims`
- `derive_reputation_summary`

These are operational prototypes. Claim discovery uses DHT links (`AgentToPrivateParticipationClaims` and related links), despite the broader design goal that PPRs remain private and unlinked. `derive_reputation_summary` summarizes only the calling agent's local linked receipts.

#### Not yet implemented (PPR domain)

- Fully authenticated bilateral issuance without placeholder signatures (#14)
- Privacy-preserving storage without DHT discovery links to private claim action hashes
- Automatic guaranteed PPR issuance for every Commitment→EconomicEvent→Claim cycle
- Complete genesis role and custody receipt workflows (#15, #16)
- End-of-life management with multi-validator security (#18)
- Challenge period mechanism for EOL declarations (#19)
- Historical review system for EOL abuse prevention (#20)
- Production-grade reputation sharing/verification workflow; the local `derive_reputation_summary` function exists, but portable or third-party-verifiable summaries do not

### Governance and Validation 🔄 Partial

- `ValidationReceipt` and `ResourceValidation` entry types
- Resource, process-event, process-completion, agent-identity, and specialized-role validation externs
- Multi-reviewer status tracking and validation history queries
- Person↔governance private-data validation helpers

Several checks are still simplified or stubbed: specialized-role validation auto-approves, authorization is incomplete in places, GovernanceRule semantics are not evaluated, and event/PPR generation is not uniformly automatic.

### Governance-as-Operator Architecture ❌ Specified, not implemented

The Request→Evaluate→Apply architecture is documented in `documentation/specifications/governance/`, but the Rust DNA does **not** currently define `GovernanceTransitionRequest`, `TransitionContext`, `GovernanceTransitionResult`, `evaluate_state_transition`, `evaluate_governance_transition`, or `request_resource_transition`. Existing validation and private-data helpers are related infrastructure, not that operator path. Tracked in #41–#44.

---

## Lobby DNA ✅ Implemented

### Purpose and Data Model

The Lobby is a fixed, permissionless DHT used as the federation entry point. It does not store NDO announcements directly.

- `LobbyAgentProfile` — `handle`, optional `avatar_url`, optional `bio`, `lobby_pubkey`, and `created_at`
- `GroupAnnouncement` — `group_name`, `group_dna_hash`, `network_seed`, optional `description`, and `registered_by` (no stored announcement timestamp)
- Discovery/update links: `AllLobbyAgents`, `AgentToLobbyProfile`, `AgentProfileUpdates`, `AllGroupAnnouncements`, and `AgentToGroupAnnouncements`
- `get_group_announcement_by_dna_hash` scans the global announcement anchor; there is no dedicated DNA-hash→announcement link type

### Coordinator API (9 externs)

`init`, `upsert_lobby_agent_profile`, `get_lobby_agent_profile`, `get_all_lobby_agents`, `announce_group`, `get_all_group_announcements`, `get_my_group_announcements`, `get_group_announcement_by_dna_hash`, `get_my_groups`

`get_my_groups` is a lightweight Lobby-side descriptor query over announcements. In the frontend, `LobbyService.getMyGroups()` instead enumerates the conductor's Group clone cells and calls each cell's `get_my_group`, because local clone-cell installation is the authoritative source for Groups the current agent has joined.

### Sweettest Coverage

5 active scenarios in `dnas/lobby/tests/src/lobby/mod.rs`, covering profile create/update/discovery and Group announcement discovery/deduplication behavior.

### Packaging

- `lobby` role in `workdir/happ.yaml`
- Lobby integrity/coordinator WASM included in the hApp build
- Separate `lobby_sweettest` package
- Moss applet metadata in `workdir/moss.yaml`

---

## Group DNA ✅ Backend complete for current scope (PR #107)

### DNA Architecture

Group cells use the **cloned-cell pattern**: a single Group DNA template is installed with the hApp (`deferred: true` in `workdir/happ.yaml`). Each new group provisions its own DHT via `clone_cell`, giving full network isolation between groups. `clone_limit: 64` is the hard per-conductor ceiling.

### Entry Types

- `GroupProfile` — group name and optional description; one logical profile per cloned cell
- `GroupMembership` — agent membership record; links removed on leave, entry retained as audit trail
- `WorkLog` — planning-level contribution record (no PPRs; ADR-GROUP-04)
- `SoftLink` — planning-level link to an NDO (no PPRs; ADR-GROUP-04)

### Coordinator API (16 externs)

`init`, `create_group`, `get_group`, `update_group`, `get_my_group`, `join_group`, `leave_group`, `get_group_members`, `is_member`, `log_work`, `delete_work_log`, `get_work_logs`, `get_my_work_logs`, `create_soft_link`, `delete_soft_link`, `get_soft_links`

There is no `get_all_groups` extern in a Group cell; each cell represents one isolated Group. Cross-Group discovery belongs to the Lobby DNA.

### Sweettest Coverage

13 test scenarios in `dnas/group/tests/src/group/mod.rs`: group creation, discovery, membership (join/leave/is_member/duplicate-join guard), work logs (group + per-agent query), soft links, `get_my_group`, `update_group`, and validation rejection cases (empty name, zero hours).

### Shared Crate

`GroupError` added to `crates/shared/src/errors.rs` (gated behind `coordinator` feature), re-exported from `crates/shared/src/lib.rs`.

### UI Service Layer

`ui/src/lib/services/zomes/group.service.ts` targets cloned cells and exposes the subset currently needed by the UI: Group lookup, members, WorkLog queries, and SoftLink queries/creation. The backend's update/delete and work-entry functions are not all surfaced through this service yet.

`WorkLogFeed.svelte` and `SoftLinkList.svelte` exist as early components, but are not currently integrated into `GroupView`; the visible Group page focuses on members and Group-associated NDOs.

---

## NDO Federation Extensions ✅ Implemented (PR #103)

The governance zome includes three additional public entry families:

- **`NdoHardLink`** — typed cross-NDO/cross-DNA links (`Component`, `DerivedFrom`, `Supersedes`) backed by an EconomicEvent fulfillment hash
- **`Contribution`** — peer-validated `Work`/`Modify` contributions with optional effort and cross-DNA WorkLog references
- **`Agreement`** — versioned benefit-redistribution clauses with Primary Accountable Agent authorization

Implemented coordinator APIs:

- Hard links: `create_ndo_hard_link`, `get_ndo_hard_links`, `get_ndo_hard_link`, `get_ndo_hard_links_by_type`
- Contributions: `validate_contribution`, `get_ndo_contributions`, `get_agent_contributions`, `get_contribution`
- Agreements: `create_agreement`, `update_agreement`, `get_current_agreement`, `get_agreement`

These are Nondominium-native federation primitives. They are not yet a full version DAG, automatic upstream benefit propagation, or Unyt Smart Agreement/RAVE integration. Sweettest coverage is partial: the hard-link scenario is active; Agreement and Contribution scenarios currently use `#[ignore]`.

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

Full three-level hierarchical UI as specified in `documentation/requirements/ui_design.md` (MVP section) and `documentation/specifications/ui_architecture.md`. Lobby and Group presentation layers are wired. Automatic `Person` creation on the agent's first DHT-active action is **not** currently enforced by the UI. The UI was substantially restructured in the UI-restructure sprint to make the Lobby the persistent outer shell with a permanent sidebar, and to fix NDO data display.

#### Shared Types

- `NdoDescriptor`, `NdoInput`, `UpdateLifecycleStageInput`, `NdoTransitionHistoryEvent` — `packages/shared-types/src/resource.types.ts`
- Rust's canonical `PropertyRegime` has 6 variants: `Private`, `Commons`, `Collective`, `Pool`, `CommonPool`, `Nondominium`
- **Current frontend mismatch**: `packages/shared-types/src/resource.types.ts` still exposes only 4 variants (`Private`, `Commons`, `Nondominium`, `CommonPool`); `Collective` and `Pool` still need to be propagated through frontend types, schemas, form options, filters, and color/label maps
- `LobbyUserProfile`, `GroupMemberProfile` — three-level identity model
- Extended `GroupDescriptor` with clone-cell identifiers, derived/deprecated `ndoHashes`, local `memberProfile`, and optional presentation metadata

#### Service Layer

- `resource.service.ts` — `createNdo`, `getNdo` (returns `NondominiumIdentity | null`, matching Rust's `Option<NondominiumIdentity>`), `updateLifecycleStage`, `getMyNdos`, `getNdosByLifecycleStage/Nature/Regime`, `getNdoTransitionHistory`
- `ndo.service.ts` — `getLobbyNdoDescriptors`, `createNdo(input, groupId)`, `getGroupNdoDescriptors`, `getNdoTransitionHistory`; `getNdoDescriptorForSpecActionHash` uses `getMyNdos → getAllNdos → ResourceSpec` lookup chain with reliable base64 hash comparison
- `lobby.service.ts` — Group + Lobby DNA backed: `getMyGroups` (enumerate group clone cells + `get_my_group`), `createGroup` (`createCloneCell` → `create_group` → `join_group` → `announce_group`), `joinGroup` (provision clone cell + `is_member` guard + best-effort `join_group`, with `fetchGroupProfileWithRetry` gossip polling and invite-payload fallback so the group appears without a reload — `TODO(signals)`), `ensureMembership(groupId)` (idempotent membership self-heal — resolve group hash → `is_member` → `join_group` if missing — so a joined agent always reconciles into the member list even if the original join missed), `generateInviteLink`. Only the Level 2 `GroupMemberProfile` presentation choice stays in `localStorage` (`saveGroupMemberProfile`)

#### Store Layer

- `app.context.svelte.ts` — `lobbyUserProfile` state with localStorage hydration + persistence
- `lobby.store.svelte.ts` — `ndos`, `filteredNdos`, `activeFilters`, `groups`, `createGroup`, `joinGroup`; `loadLobby()` now called from root layout
- `group.store.svelte.ts` — `group`, `groupNdos`, `members`, `loadGroupData(groupId, { silent? })` (full load runs `ensureMembership` then fetches NDOs + members; silent load skips reconcile, keeps data on transient failure, no spinner), `refreshCurrentGroup()` (silent re-fetch for the pull-based reactivity layer — driven by `GroupView` tab-focus/visibility + ~8 s poll; `TODO(signals)`), `createNdo`, **`associateNdoWithGroup(ndoHashB64, groupId)`** (writes a `SoftLink` on the target group clone cell)
- `ndo-cache.ts` *(new)* — in-memory `Map<hashB64, NdoDescriptor>` populated on card click so the NDO detail page renders immediately without a DHT round-trip

#### Components — Shell / Layout

- `+layout.svelte` (root) — `onMount` calls `getMyAgentPubKey()` + `loadLobby()` + shows first-time `UserProfileForm` if no lobby profile exists; ensures sidebar has data on every route
- `Sidebar.svelte` — **rewritten as persistent LobbySidebar**: Browse NDOs link, live groups list with `/group/:id` links, inline "+ New Group" form, inline "→ Join Group" form, "My Profile / Edit profile" at bottom; "New NDO" global link removed (NDO creation lives only inside Group)
- `AppShell.svelte` — unchanged layout wrapper

#### Components — Lobby Level

- `LobbyView.svelte` — page header + `NdoBrowser`; **`$effect` mirrors `lobbyStore.myPerson` into `appContext` and triggers `loadNdos()` — it does not set `appContext.currentView`** so the lobby shell does not override `'ndo'` when an NDO page is mounted
- `UserProfileForm.svelte` — Lobby profile create/edit (modal + page modes; nickname required)
- `NdoBrowser.svelte` — multi-select filter chips: LifecycleStage × ResourceNature × PropertyRegime; currently offers the frontend's 4 regimes, pending propagation of `Collective` and `Pool`; "No NDOs yet" empty state
- `NdoCard.svelte` — NDO summary card with lifecycle/nature/regime badges; populates `ndo-cache` before navigating

#### Components — Group Level

- `GroupView.svelte` — group header, "Create NDO" button, group-scoped `NdoBrowser`; **fixed**: uses `$effect` instead of `onMount` so group data reloads correctly when navigating between groups
- `NdoCreateModal.svelte` — 5-field form (name, regime, nature, stage, description), uniqueness check, Effect-TS errors, navigates to NDO page on success; currently exposes 4 of the backend's 6 regimes
- `GroupProfileModal.svelte` — per-group profile disclosure preferences (first visit only)

#### Components — NDO Level

- `NdoView.svelte` — detail card with labeled Description / Property Regime / Resource Nature / Lifecycle Stage / Created; loading skeleton + retry-able DHT refresh error banner; Join NDO (inline **Coming soon**); **Associate with a group** opens `AssociateNdoModal`; Fork opens `ForkNdoModal` when Holochain is connected. Descriptor is seeded from `ndo-cache` then refreshed from the DHT.
- `AssociateNdoModal.svelte` — lists groups excluding those whose `ndoHashes` already contain this spec; loads groups via `lobbyStore.loadGroups()` on mount
- `NdoIdentityLayer.svelte` — initiator profile link, lifecycle transition button (initiator-only), `TransitionHistoryPanel`; its color map still covers only the 4 frontend regimes
- `LifecycleTransitionModal.svelte` — full state machine (mirrors Rust), Deprecated + Hibernating special cases
- `TransitionHistoryPanel.svelte` — collapsible history: from/to stage, agent, timestamp, event_hash + copy-to-clipboard
- `ForkNdoModal.svelte` — informational fork friction modal with copy-initiator-pubkey CTA
- NDO tabs: Resources, Governance, and Activity render current service-backed data; Composition is still a placeholder

#### Routing

- `/` (`LobbyView`) — NDO browser across all user groups
- `/group/[id]` (`GroupView`) — group-scoped NDO list + Create NDO; `?createNdo=1` auto-opens modal
- `/ndo/[id]` (`NdoView`) — full NDO detail page with detail card, actions, and tabs

### Multi-Agent Web Dev Harness ✅ Implemented

The dev runtime is the **browser** (Electron/`hc-spin` superseded). `scripts/launch-happ.mjs` (`bun run start` / `AGENTS=N bun run network`) orchestrates: `kitsune2-bootstrap-srv` → `hc sandbox` conductors → path-based `installApp` (avoids the websocket bundle-streaming timeout) → `ui/static/hc-connection.json` connection manifest → **one Vite dev server per agent** on consecutive ports (`5173 + agent-1`, pinned via `VITE_DEV_AGENT`) → auto-opened browser tab per agent (`NO_OPEN=1` to disable).

- Each agent = dedicated port = dedicated origin = isolated `localStorage`, with clean permalinks (no `?agent=` in URLs; the param is retained only as a manual override).
- `connectHolochainClient` (`hc-connect.ts`) resolves `launcher` / `manifest` / `env` modes; `getDevAgentIndex()` prefers `?agent=N` → `VITE_DEV_AGENT` → `localStorage`.
- Signing credentials are authorized for **provisioned and cloned** cells, serialized with `authorizeWithRetry` to survive "source chain head has moved"; `authorizeCellSigning` handles group clone cells created after connect.
- UI-only `localStorage` keys are namespaced via `devStorageKey(base)` (`__a{agent}`) for the shared-origin override case.

### Not Yet Implemented (UI)

- Complete six-variant PropertyRegime support: `Collective` and `Pool` are present in Rust but missing from frontend shared types, schemas, forms, filter options, and display maps
- "Join NDO" backend implementation (button is a placeholder; UI flow + API contract only)
- Person management components (issue #8)
- Resource management components (issue #9)
- Capability-based private data sharing UI (issue #39)
- PPR reputation visualization (issue #22)
- Economic Process workflow UI (issues #28–#32)
- Role management / agent progression UI (issues #33–#34)

> Group DNA backend ✅ Complete for its current scope (PR #107) — cloned-cell architecture, 4 entry types, 16 coordinator externs, 13 Sweettest cases. Multi-member Group invites, DHT member lists, reactive join, idempotent membership self-heal (`ensureMembership`), and pull-based reactivity (tab focus + gentle poll) for shared-group items are wired in the UI. Push reactivity via Holochain `remote_signal` is the documented next step.

---

## Testing Infrastructure

### Sweettest (Rust) — Primary ✅

All new backend integration tests use Sweettest. Core-DNA tests live in `dnas/nondominium/tests/src/`; Lobby and Group have separate Sweettest packages.

**Shared setup utilities** (`common::conductors`):

- `setup_two_agents()` — two conductors, nondominium DNA
- `setup_three_agents()` — three conductors, nondominium DNA
- `setup_dual_dna_two_agents()` — two conductors, nondominium + hREA DNAs

**Registered core test modules** (`dnas/nondominium/tests/Cargo.toml`):

- `misc` — zome connectivity
- `person` — Person zome + hREA bridge
- `resource` — ResourceSpecification, EconomicResource, GovernanceRule, transition, and NDO Layer 0 behavior
- `governance` — federation hard links are active; Agreement and Contribution scenarios are currently ignored
- `nondominium` — NDO lifecycle/integrity scenarios

**Separate DNA suites:**

- `dnas/lobby/tests` — 5 Lobby scenarios
- `dnas/group/tests` — 13 Group scenarios

Active Sweettest coverage is useful but incomplete. Across core + Lobby + Group suites there are about 33 active tests, with ignored governance Agreement/Contribution cases. The PPR coordinator prototype, Person capability/device paths, and several partially stubbed governance flows still lack complete active coverage.

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
| Multi-DNA hApp packaging (Lobby/NDO/hREA/Group)        | ✅ Complete for current bundle |
| Person profiles and Agent↔Person mapping               | ✅ Implemented |
| Person roles, capabilities, and device support         | 🔄 Implemented APIs; capability sharing is still prototype-quality |
| Role promotion and specialized validation              | 🔄 Partial; placeholder/auto-approval paths remain |
| Resource specifications and economic resources         | ✅ CRUD/query model implemented |
| GovernanceRule persistence                             | ✅ Implemented |
| GovernanceRule semantic enforcement                    | ❌ Not implemented |
| ValueFlows action vocabulary + EconomicEvents          | ✅ Implemented |
| Commitments and Claims                                 | ✅ Implemented |
| PPR types, validation, local queries, and summaries     | 🔄 Prototype |
| Fully authenticated automatic bilateral PPR workflow   | ❌ Not implemented |
| Governance validation APIs                             | 🔄 Partial |
| Governance-as-Operator Request→Evaluate→Apply path     | ❌ Not implemented |
| NondominiumIdentity Layer 0                             | ✅ Implemented |
| PropertyRegime backend enum (6 variants)               | ✅ Implemented |
| PropertyRegime frontend support (all 6 variants)       | 🔄 4 of 6 currently exposed |
| NDO federation hard links/contributions/agreements      | 🔄 Implemented; Agreement/Contribution tests ignored |
| Lobby DNA backend                                      | ✅ Implemented |
| Group DNA backend (cloned-cell architecture)           | ✅ Complete for current scope |
| hREA Phase 1 (Person/ReaAgent bridge)                  | ✅ Implemented |
| hREA Phases 2–4                                        | ❌ Not started |
| SvelteKit + UnoCSS + Melt UI next-gen setup            | ✅ Implemented |
| Effect-TS service layer                                | ✅ Complete (PR #97) |
| MVP UI — Persistent Lobby sidebar (all routes)         | ✅ Complete    |
| MVP UI — Lobby → Group → NDO hierarchy                 | ✅ Complete    |
| MVP UI — Three-level identity (Lobby/Group/Agent)      | 🔄 Lobby + Group presentation wired; first-action Person creation not enforced |
| MVP UI — NDO creation within Group context             | ✅ Complete    |
| MVP UI — NDO detail page                               | 🔄 Implemented; Join and Composition are placeholders |
| MVP UI — NDO filter browser (3-dimension chips)        | 🔄 Complete for current 4 frontend regimes |
| MVP UI — Lifecycle transition + history panel          | ✅ Complete    |
| MVP UI — Fork friction modal                           | ✅ Complete    |
| MVP UI — Associate NDO with group modal                | ✅ Complete    |
| MVP UI — Join NDO                                      | ❌ Backend not implemented |
| MVP UI — First-time user profile modal (root layout)   | ✅ Complete    |
| MVP UI — Multi-member group invites + DHT member list   | ✅ Complete    |
| MVP UI — Reactive group join (gossip-retry + fallback)  | ✅ Complete    |
| MVP UI — Membership self-heal (`ensureMembership`)      | ✅ Complete    |
| MVP UI — Pull reactivity for shared-group items (focus + poll) | ✅ Complete |
| Push reactivity via Holochain signals                   | ❌ Not started (`TODO(signals)`) |
| Dev harness — per-agent web instances (ports, auto-open) | ✅ Complete   |
| Active Sweettest suites (core + Lobby + Group)         | ✅ Implemented |
| Economic processes (Use/Transport/Storage/Repair)      | ❌ Not started |
| Person management UI components                        | ❌ Not started |
| Economic Process UI                                    | ❌ Not started |
| PPR reputation visualization                           | ❌ Not started |

---

## Post-MVP Design Specifications

The following are documented and traceable to REQ-NDO-\* in `documentation/requirements/ndo_prima_materia.md` but are not in scope for the current development milestone:

| Track                                             | Design sources                                                                    | Implementation status                                                                                                                                  |
| ------------------------------------------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **NDO Layer 0 (identity anchor)**                 | `ndo_prima_materia.md` §§4, 8; REQ-NDO-L0-01–07                                   | **Implemented** (#80/#84) — identity, lifecycle validation, and facet anchors exist; required EconomicEvent generation and complete link-integrity hardening remain pending |
| **NDO Layers 1 & 2**                              | `ndo_prima_materia.md` §§4, 8, 10; `resources.md` §3                              | Not started — Layer 1 (Specification links), Layer 2 (Process links), cross-layer link types pending                                                   |
| **Lifecycle vs operational state split**          | `ndo_prima_materia.md` §5, §9.4 (`REQ-NDO-OS-01`, `REQ-NDO-OS-06`)                | ✅ Data layer — `OperationalState` on `EconomicResource`; governance-operator transitions (`REQ-NDO-OS-02`–`05`) deferred |
| **Unyt (EconomicAgreement, RAVE)**                | `ndo_prima_materia.md` §6.6, §11.5; `unyt-integration.md`; REQ-NDO-CS-07–CS-11    | Not started — no Unyt cell / RAVE validation in governance zome                                                                                        |
| **Flowsta (agent linking, IdentityVerification)** | `ndo_prima_materia.md` §6.7, §11.6; `flowsta-integration.md`; REQ-NDO-CS-12–CS-15 | Not started — `flowsta-agent-linking` zomes not bundled                                                                                                |
| **Person capability slot (G15)**                  | `agent.md` §3.2; `person_zome.md`; REQ-AGENT-11, REQ-NDO-AGENT-07                 | Not started — no `FlowstaIdentity` links on `Person` hash                                                                                              |
| **Lobby DNA (multi-network federation entry point)** | `post-mvp/lobby-dna.md` REQ-LOBBY-*; `specifications/post-mvp/lobby-architecture.md` | **Implemented** (#103) — Lobby DNA with `LobbyAgentProfile` + `GroupAnnouncement`, 9 coordinator externs, 5 Sweettest scenarios, `lobby` role in `happ.yaml`, and Moss manifest. Group DNA complete for its current scope (#107). |
| **NDO DNA extensions (NdoHardLink, Contribution, Agreement)** | `post-mvp/lobby-dna.md` REQ-NDO-EXT-01–16; `specifications/post-mvp/lobby-architecture.md §6` | **Implemented** (#103) — entry types, link types, and coordinator modules exist; hard-link Sweettest is active, while Agreement/Contribution scenarios are currently ignored. |

See `documentation/implementation_plan.md` Section 12 for a phased checklist aligned with the prima materia.
