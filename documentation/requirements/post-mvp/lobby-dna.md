# Lobby DNA: Multi-Network Federation Requirements

**Status**: Post-MVP Design Document
**Created**: 2026-04-14
**Authors**: Nondominium project
**Relates to**: `ndo_prima_materia.md`, `flowsta-integration.md`, `unyt-integration.md`,
`many-to-many-flows.md`, `../requirements.md §2.3`

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

### 4.1 Agent profile

- **REQ-LOBBY-01**: Any agent may register a public `LobbyAgentProfile` in the Lobby DHT
  containing a handle, optional avatar, and optional bio. Registration is permissionless.
- **REQ-LOBBY-02**: An agent may update only their own profile. Profiles cannot be deleted
  (permanent identity anchors in the Lobby DHT).
- **REQ-LOBBY-03**: Agent profiles are discoverable via a global anchor
  (`Path("lobby.agents")`).

### 4.2 NDO descriptor registry

- **REQ-LOBBY-04**: Any agent may register an `NdoDescriptor` entry in the Lobby DHT for an
  NDO they initiated. The descriptor contains: NDO name, DnaHash, network_seed,
  Layer 0 identity hash, lifecycle_stage, property_regime, resource_nature, and description.
- **REQ-LOBBY-05**: Only the registrant may update a descriptor. Descriptors cannot be
  deleted (mirroring the permanent nature of NondominiumIdentity in the NDO DHT).
- **REQ-LOBBY-06**: The only mutable field on a descriptor after registration is
  `lifecycle_stage`, which mirrors transitions on the NDO's `NondominiumIdentity`.
- **REQ-LOBBY-07**: Descriptors are discoverable via global anchors and categorization paths
  by lifecycle stage, resource nature, and property regime.
- **REQ-LOBBY-08**: Anti-spam: registration requires a valid `DnaHash` referencing an actual
  NDO cell. Ghost registrations (no deployed DNA) are detectable by peers who attempt to
  connect and find no DHT.

### 4.3 Discovery model

- **REQ-LOBBY-09**: NDO descriptors are publicly discoverable in the Lobby DHT without any
  group membership or invitation.
- **REQ-LOBBY-10**: Groups are NOT publicly discoverable. Group membership is invite-only.
  Agents discover groups through personal connections and out-of-band invite codes.
- **REQ-LOBBY-11**: Canonical Lobby network seed (`"nondominium-lobby-v1"`) is hardcoded
  in the hApp bundle to ensure all deployments share one global registry.

---

## 5. Group DNA Requirements

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
  or equipment), or `Monitoring` (observing the NDO lifecycle).
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

### 6.1 Hard NDO-to-NDO links

- **REQ-NDO-EXT-01**: The NDO DNA (zome_gouvernance) shall support a `NdoHardLink` entry
  type representing a permanent, validated structural relationship between two NDOs.
- **REQ-NDO-EXT-02**: A `NdoHardLink` may only be created by an agent holding the
  `AccountableAgent` or `PrimaryAccountableAgent` role in the originating NDO.
- **REQ-NDO-EXT-03**: Every `NdoHardLink` must reference a valid `EconomicEvent` fulfillment
  hash in the originating NDO's DHT. This fulfillment is the cryptographic proof that the
  incorporation actually occurred.
- **REQ-NDO-EXT-04**: `NdoHardLink` entries are immutable: no updates or deletions are
  permitted after creation. Hard links represent permanent historical reality (OVN license
  requirement).
- **REQ-NDO-EXT-05**: Three `NdoLinkType` values are supported: `Component` (target is a
  structural component of the source), `DerivedFrom` (source was forked/adapted from
  target), `Supersedes` (source replaces target in the network).
- **REQ-NDO-EXT-06**: Hard links are publicly discoverable on the NDO DHT via
  `NdoToHardLinks` anchor links and filterable by type.

### 6.2 Contributions

- **REQ-NDO-EXT-07**: The NDO DNA shall support a `Contribution` entry type representing a
  peer-validated record of work done on the NDO.
- **REQ-NDO-EXT-08**: A Contribution is created by any agent but must be validated by at
  least one `AccountableAgent` of the NDO. The `validated_by` field records all validating
  agents.
- **REQ-NDO-EXT-09**: A Contribution may optionally reference a `WorkLog` entry in a Group
  DHT (stored as `DnaHash + ActionHash`) for audit purposes. This reference is not
  validated on-chain (cross-DHT references are informational only).
- **REQ-NDO-EXT-10**: When a work log is validated as a Contribution, the contributing
  agent's pubkey is discoverable via `AgentToContributions` links, making them appear in
  the NDO's contributor list.
- **REQ-NDO-EXT-11**: A Contribution may optionally reference an `EconomicEvent` fulfillment
  hash when the work resulted in a structural change (i.e. hard link creation).

### 6.3 Smart agreements

- **REQ-NDO-EXT-12**: The NDO DNA shall support a `Agreement` entry type defining
  benefit distribution rules for the NDO. Smart agreements are created and updated only by
  agents holding the `AccountableAgent` role.
- **REQ-NDO-EXT-13**: A `Agreement` contains a list of `BenefitClause` entries, each
  specifying a beneficiary (agent or component NDO), a share percentage, and a benefit type
  (`Monetary`, `GovernanceWeight`, or `AccessRight`).
- **REQ-NDO-EXT-14**: Smart agreements are versioned. Each update creates a new entry linked
  to the previous via `AgreementUpdates`. The full version history is preserved for
  audit purposes.
- **REQ-NDO-EXT-15**: When a `NdoHardLink` of type `Component` is created, the originating
  NDO's smart agreement should be updated to include a cascade benefit rule to the component
  NDO, implementing the OVN license benefit cascade. (Automated post-MVP via Unyt; manual
  in MVP.)
- **REQ-NDO-EXT-16**: `BeneficiaryRef` supports both `Agent(AgentPubKey)` and
  `NdoComponent { ndo_dna_hash, ndo_identity_hash }`, allowing benefits to flow recursively
  through the NDO composition graph.

---

## 7. Cross-cutting Requirements

### 7.1 Dual deployment

- **REQ-XCUT-01**: The Nondominium hApp shall run as a standalone application (Lobby DNA +
  Group DNA + NDO DNA, all managed by one conductor) AND as a single Moss/The Weave Tool
  applet (Nondominium Lobby appears as one tile in the Moss sidebar; Moss handles agent
  invites and identity at the surface level).
- **REQ-XCUT-02**: The NDO DNA is not modified between standalone and Moss deployments. The
  Lobby and Group DNAs are either used directly (standalone) or delegated to Moss
  equivalents (Moss integration).

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

As of the Nondominium MVP codebase:

- Lobby DNA, Group DNA, and NDO DNA extensions are **not yet implemented**.
- The existing NDO DNA (`zome_person`, `zome_resource`, `zome_gouvernance`) provides the
  constitutional layer for a single NDO DHT; the multi-network federation layer is absent.
- `NdoHardLink`, `Contribution`, and `Agreement` entry types are **specified but not
  yet present** in the WASM.
- The companion architecture specification
  (`documentation/specifications/post-mvp/lobby-architecture.md`) provides the full schema,
  coordinator API, validation rules, sequence diagrams, and ADRs for implementation.

---

*For OVN-scale motivation (bridge nodes, multi-community agents, holonic layers) and the
normative NDO requirements that this document extends, see `ndo_prima_materia.md` §6, §8,
and §11. For the companion architecture design, see
`documentation/specifications/post-mvp/lobby-architecture.md`.*
