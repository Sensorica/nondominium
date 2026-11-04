# Lobby DNA: Multi-Network Federation Requirements

**Status**: Partially implemented. Lobby DNA and NDO federation extensions landed in PR #103, Group DNA in PR #107, DHT-backed group UI in PR #111. The group model for Moss and standalone and the work-context layer (§5.6, §5.7, §8.4) are proposed on 2026-11-03 and await review.
**Created**: 2026-04-14
**Last updated**: 2026-11-03
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
5. [Group DNA requirements](#5-group-dna-requirements), including the group model by deployment mode (§5.6) and work contexts (§5.7)
6. [NDO DNA extension requirements](#6-ndo-dna-extension-requirements)
7. [Cross-cutting requirements](#7-cross-cutting-requirements)
8. [Governance layers](#8-governance-layers), including the three sovereignty levels (§8.4)
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

### Group model by deployment mode and work contexts

Since 2026-11-03 the Group DNA stays in both deployment modes. In Moss the Moss group is the federation layer and holds exactly one Nondominium group, the group cell of the tool instance. Work contexts, the project layer, live in the group DHT and are many-to-many with groups. They ship in v0.2, not in v0.1.0. See §5.6, §5.7, §8.4 and §8.5.

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

- **REQ-GROUP-05**: Group membership is invite-only. In standalone mode joining requires a valid invite code. In Moss the invitation is Moss's: an agent joins the Moss group, and the Nondominium group follows automatically (REQ-GROUP-22).
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

### 5.6 Group model by deployment mode

Decided 2026-11-03. The Group DNA stays in both deployment modes, so standalone and Moss share one architecture. What differs is who supplies membership, identity and invitation. Release scope (what v0.1.0 ships and what v0.2 adds) is in `../requirements.md` §2.4 (REQ-REL-01 to REQ-REL-05).

- **REQ-GROUP-19**: The Group DNA is the group architecture in both deployment modes. A Moss build and a standalone build contain the same `group` role, and a group cell answers the same zome calls in both.
  **Falsifier:** a Moss build without the `group` role, or a zome call that exists in one mode's group cell and not in the other's.
  **Status:** 🔄 Partial. The `group` role exists (PR #107); the Moss build does not exist yet.
- **REQ-GROUP-20**: In standalone mode a group is a cloned Group DNA cell that an agent creates, registers in the Lobby (`GroupAnnouncement`) and opens to others by invite code. REQ-GROUP-01, REQ-GROUP-05 and REQ-LOBBY-10 apply unchanged.
  **Falsifier:** an agent joins a standalone group without a valid invite code.
  **Status:** ✅ Implemented (PR #107, PR #111).
- **REQ-GROUP-21**: In Moss there is exactly one Nondominium group per Moss group: the group cell of the Nondominium tool instance installed in that Moss group. The Moss group is the federation layer above it (REQ-FED-01).
  **Falsifier:** two Nondominium group cells for one tool instance, or a member of the Moss group with no Nondominium group to act in.
  **Status:** ❌ Not implemented. The Moss spike confirms that Moss accepts a deferred `group` role before this is built.
- **REQ-GROUP-22**: In Moss an agent joins the Nondominium group automatically when the agent joins the tool instance. No invite code is requested and no Lobby `GroupAnnouncement` is needed to reach the group.
  **Falsifier:** a Moss-mode screen that asks for an invite code, or a Moss group member who must take a Nondominium-specific step to reach the group's NDOs.
  **Status:** ❌ Not implemented.
- **REQ-GROUP-23**: In Moss, membership and the agent profile come from Moss, and Nondominium does not keep a second copy of either. Standalone keeps `LobbyAgentProfile` and the invite flow unchanged.
  **Falsifier:** a profile edited in Moss that reads differently in Nondominium, or a Moss-mode write of a `LobbyAgentProfile`.
  **Status:** ❌ Not implemented.

Annotation to REQ-GROUP-01: in Moss each tool instance in each Moss group receives its own network seed from Moss, so the group's seed is Moss's, not an invite code.

### 5.7 Work contexts (v0.2)

A work context is the project layer: the space where agents work with several NDOs towards deliverables. Internally the term is **work context** (Bob Haugen's *context of work*, kept because it describes open collaboration, with no contract and no employment). The interface displays **project**, and a community may use its own word. No work context ships in v0.1.0.

- **REQ-WC-01**: A work context is stored in the Group DHT, as entries of the group cell, in both deployment modes. It has no DNA of its own. Decision of 2026-11-03, recorded in `../specifications/adr/ADR-014-work-contexts-in-group-dht.md`.
  **Falsifier:** a `work_context` DNA or role in `workdir/happ.yaml`, or a work-context entry written outside a group cell.
  **Status:** ❌ Not implemented (v0.2).
- **REQ-WC-02**: A work context is not an NDO. It has no `NondominiumIdentity`, no Layer 0 lifecycle and no PPRs. It is a space and an amalgam of agents, closer to an organizational agent than to a resource, and Valueflows keeps the agent and the resource apart.
  **Falsifier:** a `NondominiumIdentity` created to represent a work context.
  **Status:** ❌ Not implemented (v0.2).
- **REQ-WC-03**: Work contexts and groups are many-to-many. A group holds several work contexts, and one work context may be worked in by several groups. Reference case: Catmaster, one work context with its own set of NDOs, worked in by Sensorica, Ludociel and Sainte-Justine.
  **Falsifier:** the Catmaster scenario fails: a work context that three groups each see and work in cannot be set up, or a work context can be attached to one group only.
  **Status:** ❌ Not implemented (v0.2). The mechanism that keeps a shared work context's state consistent across groups is open (see the ADR).
- **REQ-WC-04**: A work context works with NDOs by reference, following the pointer pattern of ADR-011: it stores the NDO's clone coordinates (DnaHash, network seed, properties), never a copy of the NDO's data. One NDO may appear in several work contexts.
  **Falsifier:** NDO data duplicated inside a work context, or an NDO that cannot be listed by two work contexts at once.
  **Status:** ❌ Not implemented (v0.2). `NdoAnchor` (PR #128) is the existing pattern.
- **REQ-WC-05**: A work context governs its own scope only (REQ-SOV-03). Its governance cannot change an NDO's lifecycle or an NDO's governance rules.
  **Falsifier:** a work-context rule that blocks or triggers an NDO lifecycle transition.
  **Status:** ❌ Not implemented (v0.2).
- **REQ-WC-06**: A work context may clone an NDO to experiment. Disagreements about the clone stay in the clone, and the original NDO and its governance are untouched. This is the fractal sovereignty case of REQ-SOV-05.
  **Falsifier:** a governance event or a lifecycle change in a clone that appears on the original NDO.
  **Status:** ❌ Not implemented (v0.2). A fork is expressed today by `NdoHardLink` of type `DerivedFrom` (REQ-NDO-EXT-05).
- **REQ-WC-07**: The interface displays a work context as a project by default, and the code and the design documents call it a work context.
  **Falsifier:** a code identifier that names the entity `project`, or a default screen that says "work context".
  **Status:** ❌ Not implemented (v0.2).

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

- **REQ-XCUT-01**: The Nondominium hApp shall run as a standalone application (Lobby DNA, Group DNA and NDO DNA, all managed by one conductor) and as a single Moss/The Weave Tool applet (Nondominium appears as one tool in the Moss group; Moss supplies membership, invitation and agent identity at the surface level).
  **Falsifier:** either mode cannot create a group, create an NDO inside it and open that NDO from a second agent.
  **Status:** 🔄 Partial. The standalone bundle includes the **lobby**, **group**, **ndo**, **nondominium** and **hrea** roles; the Moss tool does not exist yet.
- **REQ-XCUT-02**: The NDO DNA and the Group DNA are not modified between standalone and Moss deployments (REQ-GROUP-19). What Moss replaces is the surface around them: the invite flow, the agent profile and group creation (REQ-GROUP-21 to REQ-GROUP-23). Superseded wording: earlier versions said the Group DNA is delegated to a Moss equivalent in Moss; the decision of 2026-11-03 keeps it in both modes.
  **Falsifier:** a Moss build whose `group` or `ndo` DNA differs from the standalone build's.
  **Status:** ✅ NDO DNA unchanged; the Moss path is not implemented.

### 7.2 Resources are organization-agnostic

- **REQ-XCUT-03**: NDO resources (EconomicResource, NondominiumIdentity) are groups- and
  organizations-agnostic. A Group does not own an NDO. Multiple groups may soft-link to
  the same NDO. The NDO's governance is independent of any group that references it.

### 7.3 Solo agent model

- **REQ-XCUT-04**: A solo agent who has not joined any multi-member group appears in the UI
  as an individual Agent. Internally, they operate via an auto-created group-of-one. This
  group-of-one can grow to accommodate new members without any structural migration.

### 7.4 Interoperability between Moss and standalone

- **REQ-XCUT-05**: The NDO is the bridge between Moss and standalone. An agent in a standalone Nondominium and an agent in Moss reach the same NDO when both derive the same clone cell from the same coordinates (DnaHash, network seed, properties) and run the same Holochain network protocol. Work contexts are managed by Nondominium, not by Moss, so they do not need Moss to be shared.
  **Falsifier:** an NDO created in Moss whose anchor coordinates, given to a standalone agent on the same protocol, do not open the same cell.
  **Status:** ❌ Not verified. Constraint recorded on 2026-10-27: the Moss 0.16 test builds ran a patched Holochain 0.7.1 that partitions their network from a standard 0.7.1, so the bridge holds only when both sides run the same protocol. Each tool instance in each Moss group also receives its own network seed, so the NDO's coordinates, not the group's, are what cross.

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

### 8.4 Three sovereignty levels

Brainstorm of 2026-10-27, restated here as requirements. Each level is sovereign within its own scope, and each higher level interconnects the lower ones while preserving their sovereignty. The levels are the NDO (hyperlocal), the work context (a social and economic boundary, around what a group wants to obtain from the NDOs it uses) and the federation (the layer that aggregates knowledge and redistributes it across work contexts and NDOs). REQ-GROUP-18 holds inside this model: NDO governance takes precedence for actions on that NDO, because that is the NDO's own scope.

- **REQ-SOV-01**: Three sovereignty levels exist, NDO, work context and federation, each with its own governance scope, and no level's governance changes another level's.
  **Falsifier:** a governance action at one level that alters the lifecycle, the rules or the membership of another level's entity.
  **Status:** 🔄 Partial. NDO and Group governance exist; work-context and federation scopes do not.
- **REQ-SOV-02**: The NDO governs what it becomes: its lifecycle from idea to design specification, prototype and new versions, including the choice between designs and forking.
  **Falsifier:** an NDO lifecycle transition decided by a work-context or federation rule.
  **Status:** ✅ Lifecycle implemented (Layer 0, #80); design choice and fork governance partial.
- **REQ-SOV-03**: A work context governs which NDOs it works with, the soft links it makes, the direction it develops in, what it submits to an NDO as a version or update, activity management, and the order of contributions before they reach the NDO.
  **Falsifier:** a work-context rule that acts on something outside this list, or something in this list that only the NDO or the federation can decide.
  **Status:** ❌ Not implemented (v0.2). Benefit redistribution is deliberately absent from this list: REQ-GROUP-17 places it with NDO governance, and whether work-context contribution tables change that is open.
- **REQ-SOV-04**: The federation governs the list of work contexts, the overall strategy, the link to the macro level and common policies across work contexts.
  **Falsifier:** a federation rule that acts on a single NDO's lifecycle or on a work context's internal organization.
  **Status:** ❌ Not implemented. Which component holds federation governance in Moss is open: Moss groups carry no governance of their own.
- **REQ-SOV-05**: A work context may clone an NDO and disagree on the clone without touching the original NDO or its governance (REQ-WC-06).
  **Falsifier:** a change made on a clone that shows on the original NDO.
  **Status:** 🔄 Partial. Forks are recorded by `NdoHardLink` of type `DerivedFrom`.

### 8.5 Federation (v0.2)

- **REQ-FED-01**: In Moss the Moss group is the federation layer. Nondominium adds no group-of-groups structure of its own, so REQ-GROUP-03 (groups are flat) holds. In standalone mode the Lobby remains the only shared layer above groups.
  **Falsifier:** a Nondominium entry type or role that nests a group inside another group.
  **Status:** ✅ By design; no code adds a nesting.
- **REQ-FED-02**: In Moss an agent can view the work contexts of all the agent's groups from one place, across Moss groups.
  **Falsifier:** an agent in two Moss groups who must open each group's tool instance to learn which work contexts exist.
  **Status:** ❌ Not implemented (v0.2).

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
| **Moss WeApplet** | ❌ | `ui/src/we-applet.ts` contract specified in architecture doc; not in repo. v0.1.0 ships Moss only (REQ-REL-01) |
| **Group model in Moss** | ❌ | One Nondominium group per Moss group, joined automatically (REQ-GROUP-21 to REQ-GROUP-23); proposed 2026-11-03 |
| **Work contexts** | ❌ | v0.2: group DHT, many-to-many with groups (REQ-WC-01 to REQ-WC-07); not in v0.1.0 |
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
