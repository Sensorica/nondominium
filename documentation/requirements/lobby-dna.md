# Lobby DNA: Multi-Network Federation Requirements

**Status**: Partially implemented — Lobby DNA and NDO federation extensions landed in PR #103;
Group DNA in progress (#101); MVP UI uses a localStorage group shell until Group DNA ships
**Created**: 2026-04-14
**Last updated**: 2026-05-23
**Authors**: Nondominium project
**Relates to**: `ndo_prima_materia.md`, `flowsta-integration.md`, `unyt-integration.md`,
`many-to-many-flows.md`, `../requirements.md §2.3`, `../ui_design.md` (MVP Lobby → Group → NDO UI),
`../../IMPLEMENTATION_STATUS.md`, `../../implementation_plan.md §12.6`

---

## Table of Contents

1. [Purpose and scope](#1-purpose-and-scope)
2. [Background: the multi-network problem](#2-background-the-multi-network-problem)
3. [Architecture overview](#3-architecture-overview)
4. [Lobby DNA requirements](#4-lobby-dna-requirements)
5. [Group DNA requirements](#5-group-dna-requirements)
6. [NDO DNA extension requirements](#6-ndo-dna-extension-requirements)
7. [Cross-cutting requirements](#7-cross-cutting-requirements)
8. [Governance layers](#8-governance-layers)
9. [Integration requirements](#9-integration-requirements)
10. [Current state vs planned enforcement](#10-current-state-vs-planned-enforcement)

---

## 1. Purpose and scope

This document specifies requirements for the **Lobby DNA** layer: the multi-network federation
infrastructure that allows Nondominium agents to discover, join, coordinate around, and
compose multiple independent NDO networks (each its own DHT) through a unified entry point.

It defines three new DNA-level components and one extension to the existing NDO DNA:

1. **Lobby DNA** (`zome_lobby`): public registry for agents and NDO descriptors.
2. **Group DNA** (`zome_group`): per-group coordination space (invite-only, per-DHT).
3. **NDO DNA extensions**: new entry types in `zome_gouvernance` for hard links,
   contributions, and smart agreements.

This document is the normative requirements anchor. The companion architecture specification
lives in `documentation/specifications/post-mvp/lobby-architecture.md`.

---

## 2. Background: the multi-network problem

The MVP NDO hApp operates as a single DHT: all agents, resources, and governance events share
one network. As OVN (Open Value Network) communities grow, several problems emerge:

- An agent participating in multiple OVN communities (Sensorica, Open Source Ecology, etc.)
  must manage separate identities and has no unified workspace for coordinating across them.
- A Project NDO (e.g. an electronic device) needs to formally incorporate component NDOs
  (power supply, enclosure) in a way that is intrinsic to the DHT and OVN-license compliant.
- Communities need discovery mechanisms that are not a public free-for-all (spam risk)
  but also not so private that new agents cannot find communities to join.
- Work done at the group coordination level (informal logs) must have a clear pathway to
  becoming a validated Contribution recorded on the NDO DHT.

These gaps are addressed by the Lobby DNA layer defined in this document.

---

## 3. Architecture overview

### Three-layer DHT model

```
Lobby DHT (public registry, canonical network_seed)
  |
  |-- Group DHTs (per-group, invite-only, one DHT per group)
  |     |-- Work logs, soft links, membership
  |
  |-- NDO DHTs (per-NDO, constitutional, one DHT per NDO)
        |-- Resources, events, contributions, hard links, smart agreements
```

### Governance hierarchy (strictly ordered)

```
NDO governance (constitution, supersedes all)
  |
Group governance (coordination, agents only)
  |
Lobby (no governance, permissionless registry)
```

### Two link tiers

**Soft links** live in the Group DHT:
- Created by any group member, permissionless
- Invisible to the target NDO
- Represent planning and coordination intent
- Subject only to group governance

**Hard links** (NdoHardLink) live in the NDO DHT:
- Created only on validated EconomicEvent Fulfillment
- Require Accountable Agent authorization
- Represent structural reality (what has actually been incorporated)
- Intrinsic to the NDO, OVN-license compliant
- Immutable and permanent

### Agent identity layers

One physical agent produces **multiple pubkeys** across DHT layers. The Lobby, Group, and NDO
layers each hold a distinct identity record for the same person:

- `LobbyAgentProfile` (Lobby DHT) — ecosystem-wide public handle. One per agent, never
  modified by NDO joins. Stable cross-community identity anchor.
- `Person` (NDO DHT, `zome_person`) — constitutional identity within one specific NDO.
  A fresh `AgentPubKey` is created per NDO join; the `Person` entry records roles, PPRs,
  and private data for that community.
- `GroupMembership.ndo_pubkey_map` (Group DHT) — the MVP bridge linking `lobby_pubkey`
  to the per-NDO pubkeys, enabling cross-DHT identity resolution without Flowsta.
  Post-MVP, Flowsta `IsSamePersonEntry` supersedes this (REQ-LOBBY-INT-01).

For the full identity-layer diagram and implementer guidance, see
`documentation/specifications/post-mvp/lobby-architecture.md §2 "Agent identity layers"`.

### Groups vs organization-NDOs

Groups and organization-NDOs are **distinct concepts** that must not be conflated:

- A **Group** (Lobby layer) is a coordination space for agents. It has no `NondominiumIdentity`,
  no Layer 0 lifecycle, no PPRs, and cannot hold resource custody. It governs agents only:
  membership, work logs, and soft links.
- An **organization-NDO** (NDO layer) is a `NondominiumIdentity` representing a collective
  entity. It has its own lifecycle, `Agreement`, `AccountableAgents`, and can accumulate
  Contributions and reputation. Post-MVP it can hold resource custody (`AgentContext`,
  REQ-AGENT-02).
- A group typically **creates and coordinates around** an organization-NDO but does not
  become it. The two are always separate entities at separate DHT layers.
- An agent does not need to be in a group to contribute to an organization-NDO. Group
  membership governs group-layer coordination only; NDO participation is governed by
  the NDO's own rules.

For the comparative table and worked example, see
`documentation/specifications/post-mvp/lobby-architecture.md §2 "Groups vs organization-NDOs"`.

---

## 4. Lobby DNA Requirements

> **Implementation note (PR #103, revised by PR #107):** The Lobby is a **separate DNA** (`dnas/lobby/`),
> not a zome inside the nondominium DNA. The `lobby` role in `workdir/happ.yaml` uses canonical
> `network_seed: "nondominium-lobby-v1"`. PR #103 initially shipped `LobbyAgentProfile` plus an
> `NdoAnnouncement` registry; **PR #107 removed the NDO registry** (`NdoAnnouncement`, `announce_ndo`,
> `get_all_ndo_announcements`, `update_ndo_announcement`) and replaced it with the **group registry**:
> entry types are now `LobbyAgentProfile` and `GroupAnnouncement`, with coordinator APIs
> `upsert_lobby_agent_profile`, `get_lobby_agent_profile`, `announce_group`,
> `get_my_group_announcements`, `get_all_group_announcements`. NDOs are group-scoped; the
> NDO-per-cell design (issue #112) resurrects the descriptor idea as the group-level `NdoAnchor`.
> Authoritative reference: `documentation/zomes/lobby_zome.md`.

### 4.1 Agent profile

- **REQ-LOBBY-01**: Any agent may register a public `LobbyAgentProfile` in the Lobby DHT
  containing a handle, optional avatar, and optional bio. Registration is permissionless.
  **Status:** ✅ Implemented (`upsert_lobby_agent_profile`).
- **REQ-LOBBY-02**: An agent may update only their own profile. Profiles cannot be deleted
  (permanent identity anchors in the Lobby DHT).
  **Status:** ✅ Implemented (update chain + delete rejected in integrity zome).
- **REQ-LOBBY-03**: Agent profiles are discoverable via a global anchor
  (`Path("lobby.agents")`).
  **Status:** ✅ Implemented (`AllLobbyAgents` link type, `get_all_lobby_agents`).

### 4.2 NDO descriptor registry

Normative name: **`NdoDescriptor`**. Initially implemented as **`NdoAnnouncement`** in PR #103,
then **removed in PR #107**: the Lobby became a group registry and NDO visibility became
group-scoped. The descriptor concept survives at group level as **`NdoAnchor`** (issue #112),
which carries the same clone coordinates (name, DnaHash, network_seed, Layer 0 identity hash,
lifecycle_stage, property_regime, resource_nature) inside each group cell.

- **REQ-LOBBY-04**: Any agent may register an `NdoDescriptor` / `NdoAnnouncement` entry in the
  Lobby DHT for an NDO they initiated. The descriptor contains: NDO name, DnaHash, network_seed,
  Layer 0 identity hash, lifecycle_stage, property_regime, resource_nature, and description.
  **Status:** ⚠️ Superseded — removed from the Lobby in PR #107; fulfilled at group scope by
  `NdoAnchor` (#112). A future Lobby-level NDO index remains an explicit option.
- **REQ-LOBBY-05**: Only the registrant may update a descriptor. Descriptors cannot be
  deleted (mirroring the permanent nature of NondominiumIdentity in the NDO DHT).
  **Status:** ⚠️ Superseded — see REQ-LOBBY-04; anchor updates are author-gated in `zome_group`.
- **REQ-LOBBY-06**: The only mutable field on a descriptor after registration is
  `lifecycle_stage`, which mirrors transitions on the NDO's `NondominiumIdentity`.
  **Status:** ⚠️ Superseded — `NdoAnchor` allows cached descriptor sync (name, description,
  lifecycle_stage) while its identity coordinates stay immutable.
- **REQ-LOBBY-07**: Descriptors are discoverable via global anchors and categorization paths
  by lifecycle stage, resource nature, and property regime.
  **Status:** 🔄 Partial — global anchor (`lobby.ndos`) and lifecycle paths
  (`lobby.ndo.lifecycle.{stage}`) ✅; nature and property-regime facet anchors **not yet**
  implemented (client-side filtering only in MVP UI).
- **REQ-LOBBY-08**: Anti-spam: registration requires a valid `DnaHash` referencing an actual
  NDO cell. Ghost registrations (no deployed DNA) are detectable by peers who attempt to
  connect and find no DHT.
  **Status:** 🔄 Partial — `ndo_dna_hash` is stored but not cryptographically verified at
  registration time; social detection only.

### 4.3 Discovery model

- **REQ-LOBBY-09**: NDO descriptors are publicly discoverable in the Lobby DHT without any
  group membership or invitation.
  **Status:** ✅ Implemented at DNA level; MVP UI browse still uses resource zome + local groups.
- **REQ-LOBBY-10**: Groups are NOT publicly discoverable. Group membership is invite-only.
  Agents discover groups through personal connections and out-of-band invite codes.
  **Status:** ✅ By design — Group DNA not public; MVP uses localStorage invite encoding.
- **REQ-LOBBY-11**: Canonical Lobby network seed (`"nondominium-lobby-v1"`) is hardcoded
  in the hApp bundle to ensure all deployments share one global registry.
  **Status:** ✅ Implemented in `workdir/happ.yaml` lobby role modifiers.

---

## 5. Group DNA Requirements

> **Current state:** Group DNA (`zome_group_integrity` + `zome_group_coordinator`) is **not yet
> in the repository** (issue #101). The **MVP UI** implements the Lobby → Group → NDO navigation
> hierarchy with a **localStorage shell** (`GroupDescriptor` in `ndo_groups_v1`) per
> `ui_design.md` and REQ-UI-GRP-01. `LobbyService.getMyGroups()` reads/writes localStorage;
> `associateNdoWithGroup` in `group.store.svelte.ts` appends NDO hashes locally with a TODO for
> Group DHT propagation once DNA lands. The Lobby coordinator's `get_my_groups` returns a
> solo-workspace stub until real membership exists on the Group DHT.

### 5.1 Group structure

- **REQ-GROUP-01**: Each Group occupies its own DHT, instantiated with a unique network seed
  (the invite code or a random seed on creation). This provides natural isolation and makes
  group creation computationally non-trivial (anti-spam).
- **REQ-GROUP-02**: On first launch, an agent's conductor automatically creates a
  "group-of-one" personal workspace. This solo group can later expand to accommodate new
  members without any structural migration.
- **REQ-GROUP-03**: Groups are flat: no recursive group nesting, no groups of groups.
  The Lobby is the only shared coordination layer above groups.
- **REQ-GROUP-04**: A `GroupDescriptor` entry is created by the founding agent (progenitor)
  and is immutable after creation.

### 5.2 Membership

- **REQ-GROUP-05**: Group membership is invite-only. Joining requires a valid invite code
  (or, when running inside Moss, the Moss invite system).
- **REQ-GROUP-06**: A `GroupMembership` entry records the joining agent's Group DHT pubkey
  and their per-NDO pubkey map (`Vec<NdoPubkeyEntry>`), following the Moss
  `AppletToJoinedAgent` identity pattern.
- **REQ-GROUP-07**: An agent may update their `ndo_pubkey_map` after joining a new NDO DHT
  (i.e. after installing a new NDO clone cell). This is the MVP cross-DHT identity bridge.
- **REQ-GROUP-08**: Group members can look up the NDO-DHT pubkey of any other group member
  for a given NDO, enabling cross-DHT agent resolution without Flowsta (MVP).

### 5.3 Work logs

- **REQ-GROUP-09**: Any group member may create a `WorkLog` entry referencing an NDO, a
  process context, a description, and optional effort hours. Work logs are informal and
  pre-contribution; they are invisible to the NDO.
- **REQ-GROUP-10**: Work logs serve as the group-level input to the contribution validation
  pipeline: an AccountableAgent of the NDO reviews the work log and, if accepted, promotes
  it to a `Contribution` entry on the NDO DHT.

### 5.4 Soft links

- **REQ-GROUP-11**: Any group member may create a `SoftLink` entry pointing to any NDO,
  without requiring that NDO's permission. Soft links are invisible to the target NDO.
- **REQ-GROUP-12**: A soft link has one of three purposes: `Incorporation` (planning to
  structurally incorporate the target NDO into a parent NDO), `Use` (using the NDO as a tool
  or equipment), or `Monitoring` (observing the NDO lifecycle). These map to VfAction values
  `Combine | Use | Cite` respectively (see architecture spec `SoftLink.planned_action`).
- **REQ-GROUP-13**: A soft link may optionally reference a `Commitment` action hash in the
  target NDO's DHT, associating the planning intent with a formal economic commitment.
- **REQ-GROUP-14**: When an Incorporation soft link's associated Commitment is fulfilled
  (i.e. a hard link is created on the NDO DHT), the group deletes the soft link and displays
  it as "promoted" in the UI.
- **REQ-GROUP-15**: Only the link creator or the group progenitor may delete a soft link.

### 5.5 Group governance

- **REQ-GROUP-16**: Groups have their own governance rules, stored as `GroupGovernanceRule`
  entries. MVP: governance rules are flat string key-value pairs.
- **REQ-GROUP-17**: Group governance governs group-internal concerns only: membership,
  coordination norms, and soft link management. Group governance does NOT govern
  contributions, benefit distribution, or smart agreements (these belong to NDO governance).
- **REQ-GROUP-18**: NDO governance supersedes group governance. If an NDO's governance rules
  conflict with a group's rules, the NDO rules take precedence for any action on that NDO.

---

## 6. NDO DNA Extension Requirements

> **Implementation note (PR #103):** Entry types and coordinator modules exist in
> `zome_gouvernance`. Sweettest coverage in `dnas/nondominium/tests/src/governance/mod.rs`
> (`create_and_get_ndo_hard_link` passes; Agreement and Contribution tests are `#[ignore]`
> pending AccountableAgent role setup in test harness). Full **AccountableAgent** enforcement
> on create paths awaits governance-as-operator (#41–#44) and complete promotion workflows.

### 6.1 Hard NDO-to-NDO links

- **REQ-NDO-EXT-01**: The NDO DNA (zome_gouvernance) shall support a `NdoHardLink` entry
  type representing a permanent, validated structural relationship between two NDOs.
  **Status:** ✅ Implemented.
- **REQ-NDO-EXT-02**: A `NdoHardLink` may only be created by an agent holding the
  `AccountableAgent` or `PrimaryAccountableAgent` role in the originating NDO.
  **Status:** 🔄 Partial — coordinator validates caller identity; full cross-zome role
  check deferred to governance-as-operator.
- **REQ-NDO-EXT-03**: Every `NdoHardLink` must reference a valid `EconomicEvent` fulfillment
  hash in the originating NDO's DHT. This fulfillment is the cryptographic proof that the
  incorporation actually occurred.
  **Status:** ✅ Implemented (`create_ndo_hard_link` verifies record decodes as `EconomicEvent`).
- **REQ-NDO-EXT-04**: `NdoHardLink` entries are immutable: no updates or deletions are
  permitted after creation. Hard links represent permanent historical reality (OVN license
  requirement).
  **Status:** ✅ Implemented (integrity zome).
- **REQ-NDO-EXT-05**: Three `NdoLinkType` values are supported: `Component` (target is a
  structural component of the source), `DerivedFrom` (source was forked/adapted from
  target), `Supersedes` (source replaces target in the network).
  **Status:** ✅ Implemented.
- **REQ-NDO-EXT-06**: Hard links are publicly discoverable on the NDO DHT via
  `NdoToHardLinks` anchor links and filterable by type.
  **Status:** ✅ Implemented (`get_ndo_hard_links`, `get_ndo_hard_links_by_type`).

#### Design note — two-stage NdoHardLink deployment

`NdoHardLink` uses the same struct in both stages. No breaking change occurs between Stage 2
and Stage 3. The fields `to_ndo_dna_hash: DnaHash` and `to_ndo_identity_hash: ActionHash`
change only in value, not in meaning:

**Stage 2 (pre-Lobby DNA, `clone_limit: 0`):** Both the source and target NDOs live in the
same `nondominium` cell. `to_ndo_dna_hash` equals the shared `nondominium` DNA hash.
`to_ndo_identity_hash` is the target NDO's `NondominiumIdentity` action hash. Resolving the
link requires no cross-cell call — both hashes are local to the same DHT.

**Stage 3 (post-Lobby DNA, `clone_limit: 1024`):** Each NDO has its own cloned cell with a
unique `DnaHash` (because each clone has a unique `network_seed`). `to_ndo_dna_hash` is the
target NDO cell's unique hash. The UI resolves the link by connecting to
`CellId(to_ndo_dna_hash, agent_pubkey)` and calling `get_ndo(to_ndo_identity_hash)`. The
Lobby's `NdoDescriptor` provides a human-readable index but is not required for resolution.

See `documentation/specifications/post-mvp/lobby-architecture.md §6.1` for the full entry
struct and §7.1 for the incorporation pipeline.

### 6.2 Contributions

- **REQ-NDO-EXT-07**: The NDO DNA shall support a `Contribution` entry type representing a
  peer-validated record of work done on the NDO.
  **Status:** ✅ Implemented (`validate_contribution`, discovery queries).
- **REQ-NDO-EXT-08**: A Contribution is created by any agent but must be validated by at
  least one `AccountableAgent` of the NDO. The `validated_by` field records all validating
  agents.
  **Status:** 🔄 Partial — schema and API exist; AccountableAgent enforcement in tests
  still `#[ignore]`.
- **REQ-NDO-EXT-09**: A Contribution may optionally reference a `WorkLog` entry in a Group
  DHT (stored as `DnaHash + ActionHash`) for audit purposes. This reference is not
  validated on-chain (cross-DHT references are informational only).
  **Status:** ✅ Schema fields `work_log_group_dna_hash`, `work_log_action_hash` on
  `Contribution`; Group DHT not yet available.
- **REQ-NDO-EXT-10**: When a work log is validated as a Contribution, the contributing
  agent's pubkey is discoverable via `AgentToContributions` links, making them appear in
  the NDO's contributor list.
  **Status:** ✅ Implemented (`AgentToContributions`, `NdoToContributions` links).
- **REQ-NDO-EXT-11**: A Contribution may optionally reference an `EconomicEvent` fulfillment
  hash when the work resulted in a structural change (i.e. hard link creation).
  **Status:** ✅ Optional `fulfills` field on `Contribution`.

### 6.3 Smart agreements

Entry type name: `Agreement` (aligned with VF vocabulary `vf:Agreement`); referred to as
"smart agreements" in this document to emphasise their benefit-distribution role.

- **REQ-NDO-EXT-12**: The NDO DNA shall support an `Agreement` entry type defining
  benefit distribution rules for the NDO. Smart agreements are created and updated only by
  agents holding the `AccountableAgent` role.
  **Status:** ✅ Implemented (`create_agreement`, `update_agreement`, `get_current_agreement`).
- **REQ-NDO-EXT-13**: A `Agreement` contains a list of `BenefitClause` entries, each
  specifying a beneficiary (agent or component NDO), a share percentage, and a benefit type
  (`Monetary`, `GovernanceWeight`, or `AccessRight`).
  **Status:** ✅ Implemented.
- **REQ-NDO-EXT-14**: Smart agreements are versioned. Each update creates a new entry linked
  to the previous via `AgreementUpdates`. The full version history is preserved for
  audit purposes.
  **Status:** ✅ Implemented.
- **REQ-NDO-EXT-15**: When a `NdoHardLink` of type `Component` is created, the originating
  NDO's smart agreement should be updated to include a cascade benefit rule to the component
  NDO, implementing the OVN license benefit cascade. (Automated post-MVP via Unyt; manual
  in MVP.)
  **Status:** ❌ Not automated — manual process only; Unyt integration post-MVP.
- **REQ-NDO-EXT-16**: `BeneficiaryRef` supports both `Agent(AgentPubKey)` and
  `NdoComponent { ndo_dna_hash, ndo_identity_hash }`, allowing benefits to flow recursively
  through the NDO composition graph.
  **Status:** ✅ Implemented in shared types / integrity zome.

---

## 7. Cross-cutting Requirements

### 7.1 Dual deployment

- **REQ-XCUT-01**: The Nondominium hApp shall run as a standalone application (Lobby DNA +
  Group DNA + NDO DNA, all managed by one conductor) AND as a single Moss/The Weave Tool
  applet (Nondominium Lobby appears as one tile in the Moss sidebar; Moss handles agent
  invites and identity at the surface level).
  **Status:** 🔄 Partial — standalone bundle includes **lobby** + **nondominium** + **hrea**
  roles; Group DNA and Moss WeApplet not yet present.
- **REQ-XCUT-02**: The NDO DNA is not modified between standalone and Moss deployments. The
  Lobby and Group DNAs are either used directly (standalone) or delegated to Moss
  equivalents (Moss integration).
  **Status:** ✅ NDO DNA unchanged; Moss path not implemented.

### 7.2 Resources are organization-agnostic

- **REQ-XCUT-03**: NDO resources (EconomicResource, NondominiumIdentity) are groups- and
  organizations-agnostic. A Group does not own an NDO. Multiple groups may soft-link to
  the same NDO. The NDO's governance is independent of any group that references it.

### 7.3 Solo agent model

- **REQ-XCUT-04**: A solo agent who has not joined any multi-member group appears in the UI
  as an individual Agent. Internally, they operate via an auto-created group-of-one. This
  group-of-one can grow to accommodate new members without any structural migration.

---

## 8. Governance Layers

### 8.1 NDO governance (constitutional layer)

NDO governance is defined by the NDO's `GovernanceRule` entries and the AccountableAgent
role set. It governs:
- Who may create hard NDO-to-NDO links (AccountableAgents only)
- Who may validate contributions (AccountableAgents only)
- Who may create and update smart agreements (AccountableAgents only)
- What EconomicEvent actions are valid for the NDO
- NDO lifecycle stage transitions

NDO governance supersedes group governance for all actions that affect NDO state.

### 8.2 Group governance (coordination layer)

Group governance is defined by `GroupGovernanceRule` entries. MVP: flat key-value rules.
It governs:
- Who may join the group (invite code validation)
- Who may create or delete soft links
- Coordination norms and cultural rules

Group governance does NOT govern contributions, benefit distribution, or smart agreements.

### 8.3 Lobby (no governance)

The Lobby DHT is permissionless. Any agent may register a profile or NDO descriptor.
The only implicit governance is the requirement that a registered NDO descriptor references
an actual deployed DNA (discoverable by peers who attempt to connect).

---

## 9. Integration Requirements

### 9.1 Flowsta (post-MVP, Phase 1+3)

- **REQ-LOBBY-INT-01**: Post-MVP, the MVP cross-DHT identity mechanism (per-NDO pubkey
  map in `GroupMembership`) shall be superseded by Flowsta `IsSamePersonEntry` attestations,
  enabling cross-conductor and cross-device identity federation.
- **REQ-LOBBY-INT-02**: `GroupMembership.ndo_pubkey_map` is forward-compatible: the
  Flowsta DID can be added as an additional field without breaking existing records.
- See `flowsta-integration.md` for full Flowsta requirements (REQ-NDO-CS-12 through CS-15).

### 9.2 Unyt (post-MVP)

- **REQ-LOBBY-INT-03**: Post-MVP, `Agreement` rules with `BenefitType::Monetary` shall
  be activated via Unyt: validated Contributions trigger RAVE events, and NdoHardLink
  creation triggers benefit cascade through the NDO composition graph.
- **REQ-LOBBY-INT-04**: The Lobby shall support monetary contributions to NDOs via Unyt
  (agents can donate to an NDO from the Lobby without joining a group).
- See `unyt-integration.md` for full Unyt requirements.

### 9.3 Many-to-many flows (post-MVP)

- **REQ-LOBBY-INT-05**: NdoHardLink creation currently requires a single AccountableAgent
  signature. Post-MVP, multi-party consent for structural incorporation shall be supported
  per REQ-MMF-* (many-to-many-flows.md).

---

## 10. Current State vs Planned Enforcement

*Last reconciled with the codebase, 2026-07-19.*

### 10.1 What is implemented

| Layer | Status | Notes |
|-------|--------|-------|
| **Lobby DNA** | ✅ PR #103, revised #107 | `dnas/lobby/` — `LobbyAgentProfile` + `GroupAnnouncement` (group registry); `lobby` role in `happ.yaml` with `network_seed: "nondominium-lobby-v1"`; Sweettest (`lobby_sweettest`, 5 tests) |
| **Group DNA** | ✅ PR #107 | `dnas/group/` — `GroupProfile`, `GroupMembership`, `WorkLog`, `SoftLink`; `group` role (`deferred: true`, `clone_limit: 64`); Sweettest (`group_sweettest`, 13 tests) |
| **DHT-backed group UI** | ✅ PR #111 | `createCloneCell` group provisioning, invite links, DHT member list, NDO association (SoftLink at the time, `NdoAnchor` since PR #128); multi-agent web harness (`scripts/launch-happ.mjs`) |
| **NDO-per-cell UI cutover** | ✅ Issue #110 / PR #128 | `createNdo` provisions an NDO cell + `NdoAnchor` instead of a shared-DHT entry + SoftLink; lobby and group NDO grids render from anchors; a peer derives and joins the cell from anchor coordinates |
| **NDO federation extensions** | ✅ PR #103 | `NdoHardLink`, `Contribution`, `Agreement` in `zome_gouvernance`; coordinator APIs + partial Sweettest |
| **NDO Layer 0** | ✅ PR #80 | `NondominiumIdentity` on the shared nondominium DHT |
| **NDO DNA + NdoAnchor** | ✅ Issue #112 / PR #128 | `ndo` role (`deferred: true`, `clone_limit: 512`) bundling existing resource + governance WASMs; `NdoAnchor` in `zome_group` with clone coordinates; one NDO = one cloned cell, `DnaHash` bound to Layer 0 via DNA properties (ADR-013) |

### 10.2 In progress or not started

| Layer | Status | Notes |
|-------|--------|-------|
| **Lobby profile UI sync** | 🔄 Issue #106 / PR #114 | Profile bar + fire-and-forget `upsert_lobby_agent_profile` |
| **Moss WeApplet** | ❌ | `ui/src/we-applet.ts` contract specified in architecture doc; not in repo |
| **Facet discovery (nature / regime)** | ❌ | REQ-LOBBY-07 nature and property-regime path anchors not in Lobby DNA (NDO announcements removed; facets now group-scoped via anchors) |
| **Governance-as-operator** | ❌ | #41–#44 — blocks full AccountableAgent enforcement on Contribution / Agreement / hard links |

### 10.3 Planned next steps

1. **NDO-per-cell (#112 + amended #110)** — backend anchor plumbing, then UI cutover.
2. **Per-LinkType validation (#85)** — scope extended to lobby, group, and ndo DNAs.
3. **Governance-as-operator (#41–#44)** — the operator evaluates inside each NDO cell.
4. **Post-MVP** — cross-cell reputation aggregation, optional Lobby-level NDO index, Moss WeApplet, Flowsta identity bridge.

The companion architecture specification
(`documentation/specifications/post-mvp/lobby-architecture.md`) remains the detailed schema,
coordinator API, pipeline, UI, Moss contract, and ADR reference for remaining work.

---

*For OVN-scale motivation (bridge nodes, multi-community agents, holonic layers) and the
normative NDO requirements that this document extends, see `ndo_prima_materia.md` §6, §8,
and §11. For the companion architecture design, see
`documentation/specifications/post-mvp/lobby-architecture.md`.*
