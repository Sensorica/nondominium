# Agent: Ontology, Implementation, and Forward Map

**Type**: Archive / Knowledge Base Document  
**Created**: 2026-03-11  
**Relates to**: `governance.md`, `resources.md`, `ndo_prima_materia.md`, `unyt-integration.md`, `flowsta-integration.md`  
**Sources**: MVP code (`zome_person`, `zome_gouvernance` PPR/validation), post-MVP design, [OVN wiki — Agent](https://ovn.world/index.php?title=Agent), [Identity](https://ovn.world/index.php?title=Identity), [Individual profile](https://ovn.world/index.php?title=Individual_profile), [Organizational structure](https://ovn.world/index.php?title=Organizational_structure)

---

## Purpose

This document maps the three states of Agent understanding in the Nondominium / NDO project:

1. **Implemented** — what exists today in the MVP `zome_person` and governance-related agent handling
2. **Planned** — what is designed in post-MVP documents for agent evolution
3. **Remaining** — what the OVN wiki's 15 years of commons-based peer production practice contains that NDO does not yet plan for

The goal is to ensure the generic NDO agent model is as complete and principled as the OVN ontology, enabling diverse applications (resource-sharing, digital commons, open science, cooperative production) to configure agent behaviour through data, not custom code.

---

## 1. Conceptual Foundation: What is an Agent in P2P Complexity Economics?

### 1.1 Agent vs User — A Critical Distinction

The OVN wiki is unequivocal: "In a p2p context it is not advised to reduce agents or affiliates to *users*." The word *user* is appropriate for centralised platforms (Facebook, Uber) where participants have no control over the platform, interact on terms set by the owner, and provide data in exchange for access. An *agent*, by contrast, is an entity with agency — the capacity to plan and take actions, to own its own data, and to participate in defining the rules of the system it operates within.

This is not merely semantic. The data model follows the ontology: a "user" has an account on a server that another party controls. An agent has a cryptographic key pair that they control, a source chain of their own actions that only they can append to, and relationships with other agents that are maintained on a shared DHT — not a shared database controlled by an operator. Holochain is the first infrastructure natively designed for agent-centric data models. The NDO must take this seriously from the ground up.

### 1.2 The Agent Type Spectrum

The OVN wiki defines agents as: "anything that can perform an action. Has agency, i.e. can also plan to take actions. Agents can be individuals, groups, projects, networks. Agents can also be bots, machines (IoT)."

This spectrum is essential. In a P2P complexity economics framework, the system must model:

- **Individual agents**: human participants, each with a source chain
- **Collective agents**: groups, working groups, communities — entities with collective agency
- **Project/venture agents**: temporary organised efforts with their own goals and resources
- **Network agents**: larger-scale communities (an OVN as a whole is also an agent in its ecosystem)
- **Artificial agents**: bots, AI models, IoT devices — increasingly significant actors in the commons

The current NDO models only individual agents. This is a significant constraint for the generic NDO project, which aims to support Sensorica-style open value networks where ventures, networks, and partner organisations are themselves agents in economic processes.

### 1.3 Individual vs Person — The Two Layers of Agent Identity

The OVN wiki makes a distinction of deep philosophical and technical importance:

> "An *individual* is the physical you. You exist and therefore you have access to certain things. A *person* is a representation of the physical you, it is an agent in a socio/economic context."

In practical terms:
- **Individual-type identity**: exists by virtue of holding a cryptographic key pair. Permissionless access. No disclosure required. Like Bitcoin: you only need keys to transact. This is the foundation of the NDO's permissionless entry model.
- **Person-type identity**: requires reputation, credentials, or demonstrated capabilities earned through participation. Required for sensitive processes: governance participation, custodianship, specialised service provision.

This two-layer model is not bureaucratic gatekeeping — it is a precise answer to the information-theoretic question: "what does this process require to function well?" Taking the bus requires a ticket, not identification. Performing surgery requires credentials. The NDO must distinguish which processes are ticket-level (individual-type) and which require person-type identity, and build the appropriate mechanisms for each.

In complexity economics terms: forcing all interactions through person-type identity is a high information-overhead solution applied to low-information-need situations. It reduces participation, increases friction, and creates centralisation risks (who issues the credentials?). The OVN model, and therefore the NDO model, reserves person-type identity for the specific processes that genuinely need it.

### 1.4 Identity ≠ Credentials

The OVN wiki offers a clarifying thought experiment: "When you take the bus you don't need to tell the driver all about yourself before boarding, you just show your ticket, which is the credential required to access the transportation service."

Credentials are context-specific access tokens derived from past actions or present conditions. They are not identity. You can prove you can safely use a 3D printer (credential) without revealing who you are (identity). This distinction, made precise through zero-knowledge proof technology, is the foundation for privacy-preserving participation in P2P systems.

The implications for NDO agent design: the system should be designed so that agents prove *what they can do* through minimally-revealing credentials, not by revealing *who they are* through full identity disclosure. This is currently only partially implemented: the PPR system generates verifiable contribution records (a form of capability credential), but there is no ZKP layer to share them without revealing the underlying data.

### 1.5 Agent as Network Node: Social Capital and Interconnection

The OVN wiki's individual profile description captures a dimension of agents often overlooked in technical implementations: an agent's profile includes "social relations (connections with other agents), which can be seen as social capital, may be shared in context / processes, part of the wealth structure of a network" and "network affiliations."

Social capital — the value embedded in relationships and network position — is an intangible resource that the NDO system should make legible, not obscure. In complexity economics, information flows through social networks, and an agent's connectivity is a measure of their access to collective intelligence. The individual profile should capture relational wealth, not just transactional history.

### 1.6 The Long Tail of Agent Engagement

From the governance archive, the OVN operates with a 1-9-90 engagement distribution: 1% core (entrepreneurial, high commitment), 9% active contributors, 90% occasional participants. This is not a design flaw — it is universal in open networks. The agent model must be designed for this reality.

An agent system designed only for the 1% (assuming high engagement, rich profiles, continuous participation) will exclude the 99% who should still be able to participate meaningfully at their actual engagement level. The affiliation model (unaffiliated → close → active → core) is the OVN's answer to this: design for the full spectrum, not just the core.

---

## 2. Current Implementation (MVP)

### 2.0 Three-Level Identity Model (UI)

The MVP UI introduces three distinct identity layers that reflect the Lobby → Group → NDO hierarchy defined in `ui_design.md`. These layers are intentionally separate: they allow progressive disclosure of personal information and defer DHT costs until the agent acts.

#### Level 1 — Lobby (UI-only, `localStorage`)

**`LobbyUserProfile`** is the outermost, lightest identity layer. It is never written to the DHT.

| Field | Required | Notes |
|---|---|---|
| `nickname` | Yes | Displayed in the Lobby profile bar and Group profile |
| `realName` | No | Optional; user controls whether it is shared in groups |
| `bio` | No | Optional |
| `email` | No | Optional |
| `phone` | No | Optional |
| `address` | No | Optional |

- Stored in `localStorage` under the key `ndo_lobby_profile_v1`.
- Written to `app.context.lobbyUserProfile` (Svelte `$state`) on every page load.
- Created via `UserProfileForm.svelte` (modal on first launch; page-mode for editing).
- Exists before any `Person` DHT entry is created. An agent can browse the Lobby anonymously (no profile) or under a pseudonym (nickname only).

#### Level 2 — Group (UI-only, `localStorage`)

**`GroupMemberProfile`** is a per-group presentation choice derived from `LobbyUserProfile`. It is also never written to the DHT (Groups are localStorage-persisted shells for the MVP; Group DNA is a post-MVP deliverable).

| Field | Type | Notes |
|---|---|---|
| `isAnonymous` | `boolean` | If true, the agent appears only by pseudonym |
| `shownFields` | `(keyof LobbyUserProfile)[]` | Fields from `LobbyUserProfile` the agent explicitly consents to share |

- Stored alongside the `GroupDescriptor` in `localStorage` under `ndo_groups_v1`.
- Prompted via `GroupProfileModal.svelte` on first entry to each group.
- No consensus or DHT record required; this is a purely local choice.

#### Level 3 — NDO / Agent (DHT, `zome_person`)

**`Person`** is the public, on-chain agent profile. It is created when the agent performs their first DHT-active action — creating an NDO or accepting a commitment. This layer corresponds to the "person-type identity" described in §1.3.

- Written to the DHT via `create_person` in `zome_person`.
- Linked to the agent's `AgentPubKey` through Holochain's source chain.
- Required for governance participation, custodianship, and specialised service provision.
- Discoverable by other agents via the `all_persons` anchor.

This three-level model enables permissionless browsing (Level 1 not required), group participation under a pseudonym (Level 2), and full economic participation (Level 3), without conflating disclosure requirements across contexts.

> Cross-reference: `ui_design.md` MVP section describes the intended UI flow. Implementation lives in `app.context.svelte.ts` (`lobbyUserProfile`), `lobby.service.ts` (`GroupDescriptor.memberProfile`), `UserProfileForm.svelte`, `GroupProfileModal.svelte`, and `GroupSidebar.svelte`.

---

### 2.1 The Two-Layer Identity Model in Code

The NDO MVP implements the individual/person distinction at the data model level:

**Individual layer** — the Holochain `AgentPubKey`:
- Cryptographic key pair generated locally by the agent
- Source chain is agent-owned and agent-controlled
- Permissionless network entry (`validate_agent_joining` returns `ValidateCallbackResult::Valid` unconditionally)
- No disclosure required for basic read access to the DHT

**Person layer** — the `Person` entry (public) + `PrivatePersonData` entry (private):

```rust
pub struct Person {
    pub name: String,
    pub avatar_url: Option<String>,
    pub bio: Option<String>,
}

pub struct PrivatePersonData {
    pub legal_name: String,
    pub email: String,
    pub phone: Option<String>,
    pub address: Option<String>,
    pub emergency_contact: Option<String>,
    pub time_zone: Option<String>,
    pub location: Option<String>,
}
```

`Person` entries are the public identity anchor — discoverable via the `AllPersons` anchor, versioned (via `PersonUpdates` links), and permanently immutable once created (`validate_delete_person` returns `Invalid`). They cannot be deleted: consistent with the OVN principle that contribution records and identity anchors must be permanent.

`PrivatePersonData` is a Holochain private entry stored only on the agent's source chain, accessible to others only through explicit capability grants.

### 2.2 The Capability-Based Private Data System

The MVP implements a sophisticated field-level capability sharing system for private data:

**`PrivateDataCapabilityMetadata`**: tracks each capability grant issued by an agent:
- `granted_to`, `granted_by`, `fields_allowed` (subset of: email, phone, location, time_zone, emergency_contact, address)
- `context`: why the access was granted
- `expires_at` with a hard-coded 30-day maximum duration
- `cap_secret`: stored locally for revocation

**`RevokedGrantMarker`**: explicit revocation record (important because Holochain native capability revocation is silent — this creates an auditable revocation trail)

**`FilteredPrivateData`**: the view of private data after capability filtering — what the other agent actually sees given their access level

This system implements the OVN principle of "absolute privacy by default" with agent-controlled selective disclosure. The legal_name field is notably never shared (not in `allowed_fields`), preserving the individual/person separation at the field level.

### 2.3 The Role System — Four Capability Levels

The MVP implements a six-role system across two dimensions:

**Governance tiers** (progressive trust levels):
- `SimpleAgent` (member) — permissionless entry; basic participation
- `AccountableAgent` (coordination) — validated private identity; can validate others; can initiate process commitments
- `PrimaryAccountableAgent` (governance) — highest trust; can promote agents; can approve governance decisions

**Functional service roles** (validated competencies):
- `Transport`, `Repair`, `Storage` (stewardship level)

**Capability level hierarchy**: `member < stewardship < coordination < governance`

The promotion workflow is a cross-zome interaction:

```
SimpleAgent → Accountable:
  1. Agent calls request_role_promotion("Accountable Agent")
  2. System validates private data exists (legal_name, email required)
  3. Cross-zome call: governance.validate_agent_for_promotion()
  4. Accountable/Primary agent approves: approve_role_promotion()
  5. Cross-zome call: governance.validate_agent_identity() (with first_resource_hash)
  6. Role entry created and linked to Person

Accountable → Primary:
  1. Requires PPR milestones (governance_claims in ReputationSummary)
  2. Specialized role validation for functional roles
  3. Governance-level approver required
```

The promotion workflow correctly implements the OVN's "access to governance is earned through contribution" principle. Simple agents exist (permissionless) but cannot act as validators or custodians without establishing person-type identity.

### 2.4 Multi-Device Agent Architecture

The MVP's most technically sophisticated agent-layer contribution: a clean many-to-many `Agent ↔ Person` relationship model.

**`AgentPersonRelationship`**: explicitly models the link between a cryptographic key (`AgentPubKey`) and a persistent identity (`Person` hash):
- `relationship_type`: `Primary` (initial device), `Secondary` (additional devices), `Device` (dedicated device agents)

**`Device` entry**: tracked per physical device with `device_id`, `device_name`, `device_type` (mobile/desktop/tablet/web/server), registration, last-active timestamps, and revocable `DeviceStatus`.

**Bidirectional links**: `AgentToPerson` (key to identity) and `PersonToAgents` (identity to all associated keys) enable multi-device coordination without leaking any of the devices' keys.

This is a forward-looking implementation: one person may use Nondominium from a phone, a desktop, and a shared lab computer. Each device has its own key. All keys are controlled by the same person. The Person is the persistent socio-economic identity; AgentPubKeys are the session-level cryptographic instruments.

### 2.5 What the MVP Does Well

- **The individual/person dual layer** correctly implements OVN's identity model: permissionless individual access + earned person-type credentials
- **Permanent identity anchors** (Person entries cannot be deleted): enforces the OVN principle that contribution history cannot be retroactively erased
- **Field-level capability grants with 30-day expiry and explicit revocation** are privacy-first by design, consistent with the OVN's "absolute privacy by default" principle
- **Multi-device architecture** is pragmatic and technically sound — most systems ignore this, resulting in brittle single-key identities
- **The cross-zome promotion workflow** is correctly designed: role assignment requires governance validation, not just peer-to-peer agreement
- **Functional roles as validated competencies** (not just trust levels) introduce the credential concept correctly, even if without portability

### 2.6 Known Gaps in the MVP

| Gap | OVN relevance | Impact |
|---|---|---|
| Only individual agents | OVN: groups, projects, networks, bots are also agents | Cannot model collective agency, AI participants, or network-level actors |
| Person profile is minimal (name/avatar/bio) | OVN: profile contains contributions, roles, artifacts, social relations, affiliations | Cannot produce a rich agent profile for governance or contribution accounting |
| No contribution aggregation in profile | OVN: profile is "window into the past" and "predictive tool" | ReputationSummary is separate; not discoverable as part of agent profile |
| No credential portability | OVN: profile must be portable across networks | Roles and PPRs are local to this DNA instance |
| Roles are closed (6 predefined) | OVN: roles emerge from community needs | Communities cannot define their own role taxonomies |
| No zero-knowledge proofs | OVN: "prove capability without providing access to data" | Agents must reveal private data to prove eligibility |
| No affiliation types | OVN: unaffiliated / close / active / core / inactive spectrum | Cannot model the long tail of engagement; all non-members look the same |
| No social graph | OVN: social relations are part of profile / social capital | Cannot surface network wealth or organisational reach |
| No agent type taxonomy | OVN: individual, group, project, network, bot | Everything is modeled as an individual human |
| Promotion is partially stubbed | `request_role_promotion` returns a placeholder hash | Promotion requests cannot be queried or tracked |
| Legal_name is never shared | Appropriate for most use cases but inflexible | Cannot support cases where legal identity sharing is required (e.g., insurance, legal agreements) |
| No cross-app identity or DID | OVN: portable profile across networks; agents as bridge nodes between OVNs | Agents cannot prove they are the same person on another Holochain app; reputation and roles stay local to this DNA. Planned: `FlowstaIdentity` CapabilitySlot on `Person` hash, W3C DID via Flowsta agent linking (`ndo_prima_materia.md` Section 6.7) |
| No deterministic key recovery | Permanent `Person` and PPR model assume long-lived signing keys | Device loss can strand the agent from their source chain and private entries. Planned: Flowsta Vault BIP39 recovery, auto-backup, CAL-compliant export (`ndo_prima_materia.md` Section 6.7) |

---

## 3. Post-MVP Roadmap

### 3.1 Agent as NDO

The most elegant solution to the missing collective agent type is architectural: **an organisation, project, or working group is itself an NDO**. The NDO's three-layer structure (Identity + Specification + Process) maps naturally to a collective agent:

- NDO **Identity layer** = the organisation's public identity (name, mission, membership anchor)
- NDO **Specification layer** = the organisation's capabilities and resource access agreements
- NDO **Process layer** = the organisation's active commitments and economic events

An individual agent can hold a `PersonRole` in both their own profile and in an organisational NDO's governance. Cross-agent capability grants enable the organisational NDO to act on behalf of its members (with appropriate authorisation).

This means the generic NDO's agent model does not need a separate "organisation agent" type — it needs organisational NDOs and a clear mapping between individual agents and the NDOs they participate in.

Agent-NDOs use the same three-layer structure as resource-NDOs (see `resources.md §3.1`) but may use a subset of `LifecycleStage` values — a working group does not go through `Prototype` or `Distributed`, for example. The `PropertyRegime` and `ResourceNature` fields on `NondominiumIdentity` remain applicable: a working group's shared knowledge base is a `Commons`/`Digital` NDO; a collectively owned workshop is a `Collective`/`Physical` NDO.

### 3.2 CapabilitySlot on Agent Identity

The NDO CapabilitySlot surface (from `ndo_prima_materia.md`) can be extended to agent identities: an agent's `Person` entry hash becomes a stigmergic attachment point for external applications — credential wallets, reputation oracles, DID documents, professional networks — without modifying the core Person entry. This is the agent-level equivalent of the resource-level CapabilitySlot.

**Flowsta Auth** (`ndo_prima_materia.md` **Section 6.7**) is the first specified implementation: a `FlowstaIdentity` CapabilitySlot from the `Person` entry hash to an `IsSamePersonEntry` (dual-signed attestation: NDO agent key + Flowsta Vault key), yielding a W3C DID (`did:flowsta:uhCAk...`) without changing the `Person` schema. Full architecture, two-tier identity authority, and integration phases are summarised in **Section 3.5** below.

### 3.3 Composable Profile Aggregator

A post-MVP `AgentProfile` view that composes:
- `Person` (public identity)
- `ReputationSummary` (derived from PPRs)
- `PersonRole` list
- Participation statistics (economic event counts by category)
- Capability slot attachments (external credentials, DIDs)

This view is not stored as a new entry type — it is computed from existing DHT data. But exposing it as a queryable composite is the key step toward the OVN individual profile model.

### 3.4 Credential Portability via Holochain Membrane Proofs

Post-MVP: a mechanism to export cryptographically signed summaries of an agent's role assignments and ReputationSummary that can be verified by other Holochain networks. This implements the OVN requirement for portable identity: a person's contribution track record in one community should be recognisable in another.

Flowsta agent linking provides a cross-app identity anchor (DID) so `ReputationSummary` and participation history can be *attributed* across Flowsta-linked apps; full `PortableCredential` structures (this document, Section 6.5) remain the NDO-native export path — the two are complementary (`ndo_prima_materia.md` Section 6.7, PPR cross-app attribution).

### 3.5 Flowsta Integration (`flowsta-integration.md`)

Decentralized identity and authentication for Holochain apps: **agent linking** commits `IsSamePersonEntry` on this DNA via `flowsta-agent-linking` zomes; **`FlowstaIdentity`** CapabilitySlot on the agent's **`Person`** entry hash points to that attestation. **Tier 1** (Flowsta Phase 1): permissionless self-attestation (trust signal; REQ-NDO-CS-12/CS-13). **Tier 2** (Flowsta Phase 3): governance can require a valid Flowsta link for sensitive transitions (e.g. **PrimaryAccountableAgent** promotion, high-value custody) via **`IdentityVerification`-style rules** (REQ-NDO-CS-14/CS-15). **Flowsta Vault**: BIP39 recovery, encrypted auto-backups, CAL-aligned export — addressing the gap between permanent `Person`/PPR anchors and real-world key loss. **OAuth-only path** (`@flowsta/auth`): consistent DID across web apps while the app keeps its own Holochain keys (Flowsta docs "Option 1"); **Vault path** ("Option 2") is the one that produces **`IsSamePersonEntry`** on the NDO DHT. See `ndo_prima_materia.md` Section 6.7 and Section 11.6; see also `resources.md` Section 3.8 for resource-ontology cross-links.

---

## 4. OVN Agent Ontology: 15 Years of Practice

### 4.1 Agent Type Taxonomy

The OVN wiki classifies agents into four primary types:

| Agent type | Examples | NDO support |
|---|---|---|
| Individual | Human participants, affiliates | ✅ Implemented (Person + AgentPubKey) |
| Group/Collective | Working groups, committees | ❌ Gap: no collective agent type |
| Project/Venture | An open hardware project, a design sprint | ❌ Gap: ventures are implicit in resources, not agents |
| Network | An OVN as an entity in the ecosystem | ❌ Gap: no network-level agent |
| Artificial | Bots, AI models, IoT devices | ❌ Gap: no bot/machine agent type |

In the REA model used by Sensorica, economic agents can represent:
- An individual
- A project/venture (another network or autonomous open business unit)
- Another network (cross-OVN interactions)
- A traditional organisation (partner, supplier, funder)

The NDO currently only models the individual case. For the generic NDO to support Sensorica-style operations, at minimum group/collective and project/venture agent types are needed.

**Complexity economics note**: The omission of collective agents is not just an inconvenience — it makes it impossible to model the actual economic events in many commons-based peer production contexts. When Sensorica licenses a sensor to a university, the economic agents are Sensorica (a network) and the university (a traditional organisation), not individual humans. Without collective agent types, the economic model is systematically misrepresented.

### 4.2 The Affiliation Spectrum

The OVN wiki defines five affiliation states that capture the long tail of participation:

**Unaffiliated**: anonymous; accesses public information only; no obligations; not known by affiliates.

**Close affiliate**: not yet contributed in a trackable way; known by some affiliates; can access database and some activities; no formal obligations but respects OVN's assets.

**Active affiliate**: has logged contributions in the NRP-CAS AND is recognised by the community; has access to OVN infrastructure, governance, and production assets; must adhere to the Benefit Redistribution Algorithm and affiliation conditions.

**Core affiliate**: algorithmically selected from active affiliates based on contribution + reputation; special privileges within specific projects or ventures; status is dynamic (in/out based on contribution; can expire through inactivity).

**Inactive affiliate**: previously contributed, currently inactive; access to some activities; can re-engage by contributing again.

**Formal affiliation**: becoming an active affiliate formally consists of:
1. Acknowledging the Affiliate Handbook
2. Acknowledging the Nondominium & Custodian agreement
3. Signing the "Acknowledgement of Knowledge Commons" agreement
4. Signing the Benefit Redistribution Algorithm agreement

The NDO currently has only two states: joined (has a `Person` entry) and not joined. There is no modelling of engagement depth, affiliation conditions, formal affiliation agreements, or the core/active/close/inactive spectrum. This means the system cannot algorithmically determine who should participate in a governance decision (active affiliates only? core affiliates? anyone with a Person entry?), cannot manage the onboarding process, and cannot track affiliation lifecycle.

### 4.3 The Individual Profile as Composable Aggregate

The OVN wiki defines the individual profile as "a digital environment that aggregates information and data about Agents." Key properties:

**Composable**: can contain roles, reputation, contributions, artifacts, social relations, network affiliations, credentials, available assets, needs/wants.

**Standard format**: portable across contexts.

**Non-transferable**: cannot be reassigned from one individual to another (analogous to soul-bound tokens). The link to the physical self must be unique.

**Portable**: "An individual can participate in more than one OVN simultaneously... enables the individual to transport his/her reputation and credentials from one cluster of economic activities to another."

**Owner-controlled**: the agent controls what is shared, with whom, for what purpose, and for how long. But crucially: some parts are write-protected — "applications can write data about contributions, roles, and reputation, which cannot be deleted by the affiliate in question." This is exactly what the NDO implements with immutable `Person` entries and private-but-signed PPRs. The profile owner cannot delete their contribution history, but controls what they reveal.

**Predictive**: "can be used as a predictive tool, to judge if a future action or relation would be beneficial."

**Agency-extended**: "The individual profile can even have agency in the digital world. It can be AI-enhanced to act on behalf of the real agent in some circumstances, sign contracts based on predefined rules."

The NDO currently splits what should be the individual profile across at least four separate concepts: `Person`, `PrivatePersonData`, `ReputationSummary`, and `PersonRole`. These are correct building blocks but lack the composable aggregation layer that would make the profile a genuine OVN individual profile.

### 4.4 Identity Architecture: SSI, DIDs, VCs, ZKP

The OVN wiki synthesises the state of the art in decentralised identity:

**Self-Sovereign Identity (SSI)**: The individual controls their own identity data; no third party can revoke or modify it without the individual's consent. Roles in the SSI ecosystem: issuer (issues credentials), wallet (stores and provides), validator (requests and obtains), revoker.

**Decentralised Identifiers (DIDs)**: W3C-standardised unique identifiers for individuals and organisations that are independent of any centralised registry, resolved through decentralised systems. DIDs enable "a direct, encrypted channel for p2p communication" and portability from one transport or security context to another.

**Verifiable Credentials (VCs)**: "Sets of claims about an agent of which the provenance and immutability can be proved." ZKP-compatible: an agent can prove "I have a credential that satisfies condition X" without revealing the credential's full contents.

**Soul-bound tokens**: non-transferable, non-sellable reputation tokens. The OVN wiki references these as one potential mechanism for non-transferable credentials. The NDO's `Person` entries (non-deletable) and PPRs (bilaterally signed, private) are soul-bound-like, but not interoperable with external VC/DID ecosystems.

**Portability challenge**: "I can gain some credentials based on activities in one organization/context and have that, or only a part of it, being recognized in another context." This is the core portability requirement. The technical path: ZKP-based proofs from Holochain source chains that can be verified by other Holochain networks or other distributed systems.

**Near-term bridge — Flowsta**: Flowsta supplies W3C DIDs and dual-signed agent linking (`IsSamePersonEntry` on the NDO DHT, `ndo_prima_materia.md` Section 6.7) so the same human can be recognised across Holochain conductors without shared DNA. `PrivateParticipationClaim` entries remain non-transferable and bound to the local `AgentPubKey`; reputation summaries can nevertheless be *attributed* to a DID for cross-app trust — the same distinction as `resources.md` Section 4.6 (attribution portability is not claim transferability). REQ-NDO-AGENT-08 positions the Flowsta DID as the cross-network identity anchor for portable credentials. ZKP/VC layers remain the longer-term path for minimally revealing proofs at scale.

**The identity insurance alternative**: the OVN wiki cites Vinay Gupta's proposal that what P2P systems need is not reputation but restorative justice — insurance that compensates you if an agent acts in bad faith. "If I present you with proof that I am insured against bad conduct, and you trust my insurer will pay, REPUTATION is suddenly a whole bunch less important." This is a provocative alternative to the PPR approach: rather than tracking reputation to prevent bad actors, use economic backstops to make bad acting unprofitable. The NDO's Unyt Smart Agreement integration could potentially implement this pattern.

### 4.5 Privacy vs Network Efficiency

The OVN wiki frames this as a genuine tension with no universal solution: an agent's contribution history can improve network efficiency (matching to tasks, governance access, trust in new interactions) but also creates a privacy risk (triangulation of physical identity, de-platforming vulnerability).

The OVN wiki's resolution: "the agent must be given the choice, allow an individual profile to be formed from past activity or not, weighing the pros and cons, the benefits and the potential harm." The NDO's private-but-derivable PPR system partially implements this: agents sign PPRs (opting into accountability) but control how their ReputationSummary is shared. The gap is that there is currently no mechanism for an agent to participate partially — all PPRs follow the same model.

A more complete implementation would allow agents to choose their privacy level per interaction:
- Full anonymity: no PPRs, no reputation accumulation, no access to governance
- Pseudonymous: PPRs linked to a persistent pseudonym, not to physical identity
- Named: PPRs linked to public Person entry

This spectrum maps to the OVN's individual/person identity model: individual-level participation (anonymous), person-level participation (reputation-accumulating), and fully identified participation (legal accountability for high-trust processes).

### 4.6 Agent Profile and Network Wealth

The OVN wiki's individual profile description includes something not present in most technical systems: network affiliations as a form of organisational wealth. "The information about affiliations can be used... to assess the organic reach into other organisational contexts, beyond the immediate zone of influence of the context. This allows surfacing of a new form of network wealth, its influence or degree of connectivity with other networks within the ecosystem, provided by the number of relations extending from the context network to other networks, through agents."

An agent who participates in multiple OVNs is a bridge node — a carrier of information, trust, and potential collaboration across network boundaries. This agent's profile is not just a personal record; it is a piece of the network's connective tissue. Making this visible makes the network's resilience and reach legible.

The NDO currently has no social graph and no multi-network affiliation model. An agent is either in this network or not. The generic NDO should model the OVN's insight that agents are simultaneously nodes in multiple overlapping networks, and that this multi-membership is itself a form of value.

---

## 5. Gap Analysis

### 5.1 Mapped — OVN concepts implemented or planned in NDO

| OVN concept | NDO implementation | Status |
|---|---|---|
| Individual/person identity distinction | AgentPubKey (individual) + Person entry (person-type) | ✅ Implemented |
| Permissionless individual-level access | `validate_agent_joining` unconditional pass | ✅ Implemented |
| Owner-controlled private data with selective disclosure | PrivatePersonData + field-level capability grants | ✅ Implemented |
| Non-transferable, non-deletable identity anchor | Person entries are permanent (delete validation returns Invalid) | ✅ Implemented |
| Earned access to sensitive processes | Role promotion requiring private data validation | ✅ Implemented |
| Contribution history write-protected from owner | Bilaterally signed PPRs cannot be unilaterally deleted | ✅ Implemented |
| Multi-device support | Agent-Person many-to-many relationship model | ✅ Implemented |
| Capability expiry and explicit revocation | 30-day max grants + RevokedGrantMarker | ✅ Implemented |
| Composable profile building blocks | Person + PrivatePersonData + PersonRole + ReputationSummary | ✅ Partial (separate, not aggregated) |
| Functional role credentials | Transport / Repair / Storage validated competency roles | ✅ Implemented |
| Cross-app identity / DID (agent) | `FlowstaIdentity` CapabilitySlot + Flowsta agent linking (`ndo_prima_materia.md` Section 6.7) | 🔄 Planned (post-MVP) |
| Agent key recovery (Vault) | Flowsta Vault BIP39, auto-backup, CAL export (`ndo_prima_materia.md` Section 6.7) | 🔄 Planned (post-MVP) |

### 5.2 Partial — concepts present in OVN and partially covered in NDO

| OVN concept | NDO partial coverage | Gap |
|---|---|---|
| Affiliation spectrum | Joined (has Person) vs not joined | No close/active/core/inactive states; no affiliation conditions |
| Active affiliate = contribution + recognition | SimpleAgent → Accountable promotion is contribution-gated | Recognition is informal; no algorithmic determination of active affiliate status |
| Core affiliate = algorithmically selected | PPR-based ReputationSummary provides the data | No algorithm using PPR data to compute core affiliate status |
| Portability | Roles and PPRs are local | No export mechanism; no VC/DID interoperability yet. Planned: cross-app *attribution* via Flowsta DID + `FlowstaIdentity` slot (`ndo_prima_materia.md` Section 6.7); NDO-native `PortableCredential` export (this document, Section 6.5) remains complementary |
| Privacy vs efficiency trade-off | Agents can share ReputationSummary selectively | No per-interaction privacy level choice; no pseudonymous participation mode |
| Agent-controlled profile sections | Private data share controlled | No mechanism to protect some sections while exposing others; no correction mechanism for contributions |

### 5.3 Missing — OVN concepts not yet planned in NDO

| OVN concept | Gap description | Proposed resolution |
|---|---|---|
| **Agent type taxonomy** (individual, group, project, network, bot) | Only individual agents exist | Model collective agents as NDOs with their own governance; add `AgentType` to person context |
| **Composable individual profile** | Profile is split across unconnected entries | Build `AgentProfile` as a composable view aggregating Person, PPR summary, roles, capability slots, affiliations |
| **Social graph** (social capital, network relations) | No peer relationships modeled | Add `AgentRelationship` link type: bidirectional, typed (colleague, collaborator, trusted, etc.), private |
| **Network affiliations** | Only single-network membership | Model cross-network affiliations as links from Person to other NDO instances |
| **Affiliation conditions** (formal ToP agreements) | No affiliation ceremony | Add `AffiliationRecord`: a hash-referenced acknowledgement of Terms of Participation + benefit redistribution agreement |
| **Affiliation lifecycle** (active/core/close/inactive) | Binary in/out membership | Derive affiliation state algorithmically from PPR activity + recency; expose as queryable status |
| **Zero-knowledge capability proofs** | Must reveal raw data to prove eligibility | Integrate ZKP library or ZKP-compatible VC layer; allow `prove_capability(condition)` without data disclosure |
| **Credential portability** (across networks) | Roles and PPRs are local | Flowsta W3C DID + `FlowstaIdentity` CapabilitySlot on `Person` hash as cross-network identity anchor (REQ-NDO-AGENT-08, `ndo_prima_materia.md` Section 6.7); and define a `PortableCredential` structure: signed summary of roles + PPR statistics, verifiable by other Holochain networks |
| **Sybil resistance mechanism** | No proof-of-personhood | Optional Tier 2 governance requirement for verified Flowsta identity (REQ-NDO-CS-14) for high-trust roles; complements social vouching (existing agents vouch for new agents), biometric opt-in, or Proof-of-Personhood integration as optional membrane proof |
| **Pseudonymous participation mode** | Contribution always linked to AgentPubKey | Allow ephemeral agents (agent contributes under a temporary key without linking to Person); contribution is recorded but unlinkable to physical identity |
| **Agent AI/bot delegation** | Agents must act manually | Define a `DelegatedAgent` relationship: a Person can authorise an AI agent to act on their behalf within defined scope |
| **Needs and wants** in profile | Not modeled | Add `AgentNeedsWants` as an optional profile extension: what resources the agent needs and what they can offer; enables matching |

---

## 6. Forward Map: Generic NDO Agent Architecture

### 6.1 Agent Type as Configuration, Not Hard-Code

Rather than adding parallel code paths for each agent type, the generic NDO should treat agent type as a configuration property:

```rust
pub enum AgentEntityType {
    Individual,                    // Human participant
    Collective(String),            // Group/working group (name/description)
    Project(ActionHash),           // Project NDO this agent represents
    Network(ActionHash),           // Network NDO this agent represents
    Bot { capabilities: Vec<String>, operator: AgentPubKey }, // AI/bot with declared capabilities
    ExternalOrganisation(String),  // Traditional org (name, for partner modelling)
}

pub struct AgentContext {
    pub agent_type: AgentEntityType,
    pub person_hash: Option<ActionHash>,   // None for bots/external orgs
    pub created_at: Timestamp,
    pub network_seed: String,              // Which NDO network this context belongs to
}
```

Individual agents have `AgentEntityType::Individual` with a linked `Person`. Collective agents (working groups, projects) reference an NDO hash. Bots have no `Person` but have declared capabilities and a responsible operator.

### 6.2 Affiliation State as a Derived Property

Rather than storing affiliation state (which would need maintenance and could become inconsistent), derive it algorithmically from existing DHT data:

```
affiliation_state(agent) = f(
    person_exists(agent),                   // Boolean
    contributions_count(agent),             // From economic events
    last_contribution_timestamp(agent),     // Recency from economic events
    reputation_summary.total_claims,        // From PPRs
    affiliation_record_exists(agent),       // Has the agent signed the ToP?
    governance_claims_count(agent)          // From PPRs
)

→ UnaffiliatedStranger | CloseAffiliate | ActiveAffiliate | 
  CoreAffiliate | InactiveAffiliate
```

`CoreAffiliate` is algorithmically determined: an active affiliate whose PPR contribution rate in the past N days exceeds a configurable threshold becomes a core affiliate. This implements the OVN governance equation: governance access as benefit derived from contribution activity.

### 6.3 Composable AgentProfile View

The aggregated individual profile, computed on demand:

```rust
pub struct AgentProfile {
    // Identity layer
    pub agent_pub_key: AgentPubKey,
    pub person: Option<Person>,
    pub affiliation_state: AffiliationState,
    
    // Capability layer
    pub roles: Vec<PersonRole>,
    pub capability_level: String,           // member/stewardship/coordination/governance
    pub capability_slots: Vec<CapabilitySlotInfo>,  // External credential attachments; includes FlowstaIdentity → IsSamePersonEntry; optional resolved flowsta_did for UI (`ndo_prima_materia.md` Section 6.7)
    
    // Reputation layer (derived, selectively shared)
    pub reputation_summary: Option<ReputationSummary>,
    pub economic_reliability_score: Option<f64>,    // For Unyt credit limit
    
    // Participation layer
    pub active_commitments_count: u32,
    pub economic_events_count: u32,
    pub resource_custodianships_count: u32,
    
    // Social layer (optional, agent-controlled)
    pub network_affiliations: Vec<NetworkAffiliation>,
    pub peer_vouches: Option<u32>,          // Number of vouches from trusted peers
    
    // Temporal
    pub joined_at: Option<Timestamp>,
    pub last_active_at: Option<Timestamp>,
}
```

This profile is not an entry type — it is a query result, composed from existing entries. The agent controls which sections are exposed by granting access to the constituent entries.

### 6.4 Affiliation Record — The Terms of Participation Bridge

A lightweight mechanism to record formal affiliation:

```rust
pub struct AffiliationRecord {
    pub agent: AgentPubKey,
    pub network_id: String,                    // Which NDO network
    pub documents_acknowledged: Vec<DocumentAck>,  // Hash + title of each ToP document
    pub signed_at: Timestamp,
    pub signature: Signature,                  // Agent signs the affiliation record
    pub witness: Option<AgentPubKey>,          // Optional vouching agent
}

pub struct DocumentAck {
    pub document_hash: String,         // Hash of the document text
    pub document_title: String,
    pub document_version: String,
}
```

When an agent creates their first `Person` entry, the UI prompts them to acknowledge the network's Terms of Participation. The acknowledgement is cryptographically signed and stored as an `AffiliationRecord`. This bridges the OVN's formal affiliation ceremony with the NDO's digital infrastructure.

### 6.5 Portable Credential Summary

A structure that can be shared with other Holochain networks as proof of contribution and capability:

```rust
pub struct PortableCredential {
    pub issuing_network: String,               // DNA hash of the issuing network
    pub agent: AgentPubKey,
    pub credential_type: PortableCredentialType,
    pub claims: PortableCredentialClaims,
    pub issued_at: Timestamp,
    pub valid_until: Option<Timestamp>,
    pub issuer_signature: Signature,           // Signed by a Primary Accountable Agent
    pub agent_signature: Signature,            // Countersigned by the agent
}

pub enum PortableCredentialType {
    RoleCredential(String),                    // "Accountable Agent in network X"
    ReputationCredential,                      // Aggregated reputation score
    CompetencyCredential(String),              // "Certified 3D printer operator"
    AffiliationCredential,                     // "Active affiliate of network X since date"
}
```

A receiving network can verify the `issuer_signature` against the issuing network's DNA hash, establishing a cryptographic chain of trust without requiring centralized credential issuers.

Receiving networks may correlate credentials with a **Flowsta DID** when the issuer also records a **`FlowstaIdentity`** link on the agent's `Person` hash — improving interoperability without making PPR entries themselves transferable.

---

## 7. Complexity Economics Justification: Why Each Agent Concept Matters

**Agent type taxonomy** matters because economic models must faithfully represent economic actors. In Sensorica's actual operations, the entities performing actions are networks, ventures, and partner organisations — not just individuals. Flattening these to individual-human agents produces systematically inaccurate economic accounting. Benkler's P2P advantage — that P2P systems can process more information and model more finely-grained reality — is lost when the agent model is coarser than the actual social structure.

**The affiliation spectrum** matters because governance decisions made by binary "in/out" membership are weaker than those made by graded participation-aware membership. The governance equation (contribution history → governance access) requires a nuanced engagement model as input. If everyone is either "in" or "out," the governance equation reduces to "everyone who joined gets an equal vote," which ignores the 1-9-90 engagement reality. The result is either oligarchy (the 1% who do all the work decide everything while the 90% technically could override them) or paralysis (decisions require the majority of a population that mostly isn't paying attention).

**ZKP capability proofs** matter because the current privacy-accountability model forces a false binary: either share raw data (low privacy, high accountability) or share nothing (high privacy, no accountability). Zero-knowledge proofs break this binary. An agent can prove "I have at least 10 completed maintenance commitments" without revealing who the counterparties were, what the resources were, or what the exact performance scores were. This is the technical foundation for privacy-preserving meritocracy — governance access based on contribution without requiring surveillance.

**Credential portability** matters because the value of contribution data is severely limited if it only functions within a single application instance. An experienced Sensorica contributor who joins a new OVN should be able to leverage their track record. Without portability, every new commons requires starting from zero, creating massive friction to growth of the P2P ecosystem. Benkler's model of the peer production advantage assumes information flows across organisational boundaries — credential portability is the mechanism that makes this flow possible.

**Cross-app identity (Flowsta)** matters for the same reason credential portability matters: agents who participate in multiple OVNs or hApps are bridge nodes (Section 4.6). Without a verifiable same-person link across conductors, every network treats them as a stranger; sybil pressure and cold-start friction repeat. Flowsta's permissionless Tier 1 keeps overhead low for casual participants; Tier 2 lets communities demand verified identity only where Bar-Yam-style complexity matching says it is worth the coordination cost (high-trust governance, high-value custody).

**The composable individual profile** matters because an agent's full profile — their roles, contributions, social relations, affiliations, capabilities — is the information substrate for most governance and economic decisions in the commons. If this information is scattered across disconnected entries with no composable view, the information cost of making well-informed decisions is high. Bar-Yam's complexity matching principle: the governance system's access to information about participants must match the complexity of the participation patterns it is trying to govern.

**Collective agent types** matter because commons-based peer production is fundamentally about collectives. Modelling it as a collection of individual agents without collective agency misses the emergent properties of collaboration. A working group is not just the sum of its members — it has its own identity, its own resource access, its own reputation, and its own governance. Without collective agent types, the NDO cannot model the holonic structure of OVNs: the fact that every entity is simultaneously a whole and a part of a larger whole.

---

*This is a living document. Section 5.3 should be converted into formal requirements as the generic NDO project begins. Section 6 describes design directions, not final specifications. The OVN wiki pages at [Agent](https://ovn.world/index.php?title=Agent), [Identity](https://ovn.world/index.php?title=Identity), [Individual profile](https://ovn.world/index.php?title=Individual_profile), and [Organizational structure](https://ovn.world/index.php?title=Organizational_structure) remain authoritative references for agent design in peer production systems.*
