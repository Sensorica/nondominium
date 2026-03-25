# Governance: Ontology, Implementation, and Forward Map

**Type**: Archive / Knowledge Base Document  
**Created**: 2026-03-11  
**Relates to**: `ndo_prima_materia.md`, `unyt-integration.md`, `flowsta-integration.md`, `resources.md`, `agent.md`  
**Sources**: MVP code (`zome_gouvernance`, `zome_person`), post-MVP design documents, [OVN wiki — Governance](https://ovn.world/index.php?title=Governance)

---

## Purpose

This document maps the three states of Governance understanding in the Nondominium / NDO project:

1. **Implemented** — what exists today in the MVP `zome_gouvernance` and `zome_person` codebases
2. **Planned** — what is designed in post-MVP requirements documents
3. **Remaining** — what the OVN wiki's 15 years of commons-based peer production practice contains that NDO does not yet plan to implement

The goal is to ensure that the generic NDO — built as a standalone hApp — represents a principled, complete governance architecture that can support diverse communities and use cases through configuration, not custom code.

---

## 1. Conceptual Foundation: Governance in P2P Complexity Economics

### 1.1 What Governance Is (and Is Not)

The OVN wiki defines governance as "a means of direct influence for an organization." More structurally, it has three core functions:

- **Selection** — choosing among alternatives; decision-making
- **Enforcement** — enacting and reinforcing choices
- **Adaptation** — sensing, feedback, and evolving the rules

In traditional organisations, governance is largely concentrated: a small group selects, enforces, and adapts. In P2P open networks, all three functions must be distributed across a large, permeable, changing set of participants — without centrally controlled bottlenecks. This is not a political preference; it is an information-theoretic necessity. Bar-Yam's complexity matching principle: the governance system's complexity must match the organisational complexity it manages. As the network grows and its challenges diversify, only distributed governance can keep pace.

### 1.2 Embedded Governance and Stigmergy

The most important governance concept for the NDO is **embedded governance**: engineering the environment so that desirable behaviour is facilitated and undesirable behaviour is made impossible or costly, rather than relying on policing.

The OVN wiki describes this precisely: "Embedded governance (or immanent governance) is about engineering the environment in which actions are deployed to direct, channel or shape action, to take away the possibility of undesirable or less desirable action alternatives."

In practice: instead of writing a rule "you must not transfer a resource without a validated custodian," make it technically impossible to record a custody transfer without a prior commitment accepted by an accountable agent. The rule is in the architecture, not in a policy document that humans can ignore.

This is also stigmergy in the complexity economics sense: governance through environmental modification. Ants do not follow written rules — their collective behaviour emerges from pheromone trails (environmental signals) that individual agents respond to locally. The NDO's capability slot surface (Layer 0 stigmergic attachment) is exactly this: governance emerges from what agents choose to attach to resources, without central coordination.

The same stigmergic attachment pattern applies to **agent** identity anchors: a `FlowstaIdentity` capability slot on the agent's `Person` entry hash (`ndo_prima_materia.md` **Section 6.5** defines the Person attachment surface; **Section 6.7** specifies Flowsta). **Tier 1** is permissionless at the DHT level; **Tier 2** is when a community turns that signal into a **hard governance precondition** via typed `GovernanceRule` mechanisms (Flowsta Phase 3).

The distinction between soft and hard embedded governance matters:
- **Hard embedded**: cryptographic impossibility of the prohibited action (Holochain validation rules, capability tokens)
- **Soft embedded**: social norms encoded as discoverable defaults (GovernanceRules marked as required, reputation consequences)

The NDO primarily uses hard embedded governance (Holochain integrity zomes are cryptographic) with soft embedded governance at the application layer (GovernanceRules are data that agents must choose to enforce in their coordinator logic).

### 1.3 Governance as Signal Processing, Not Rule Enforcement

The OVN wiki makes a critical distinction: OVN governance is not "rules-based, but rather signal-based, as norms emerge in real time from agent preferences, in context." Rules assume a known, closed world. Signals are the governance of complex, open, evolving systems.

In complexity economics terms: the adjacent possible (Kauffman) is never fully knowable. Rules written today cannot anticipate tomorrow's edge cases. The governance architecture must support emergence — agents should be able to propose and enact new norms through their behaviour, not just comply with pre-written rules.

This has direct implications for NDO design: the governance layer should expose proposing, voting, and adapting mechanisms as first-class capabilities, not just enforcement mechanisms. The current MVP focuses almost entirely on enforcement. Adaptation is barely present. Proposal is absent.

### 1.4 The REA Governance Parallel

The OVN wiki makes a structural proposal with deep implications: "Architecture governance in a way that it becomes compatible with the organizational and economic model architecture. REA is used to model the economic reality of the network, use the same structure to describe governance."

This means: governance events are EconomicEvents. Governance policies are Resources. Governance actors are Agents. The Policy/Scheduling/Accountability layers of REA are the governance architecture, not just the economic architecture.

The implication: the NDO's `zome_gouvernance` — which already models EconomicEvents, Commitments, and Claims — should be the natural home for governance events as well. A decision to grant a role is a governance EconomicEvent. A governance proposal is a Commitment. The decision outcome is a Claim. This unification is not complete in the current codebase but is architecturally supported.

### 1.5 Holonic Multi-Scale Governance

The OVN is fractal: ventures nest in networks, networks nest in networks-of-networks. Each level has its own governance concerns, while sharing protocols and standards. The NDO, as a holon (simultaneously whole and part), needs governance that is self-similar across scales — the same primitives should work at the instance level, the network level, and the federation level.

The OVN wiki defines three governance layers:
- **Network-of-networks** (ecosystem): protocols, standards, interoperability
- **Network** (commons community): shared resources, roles, benefit distribution
- **Venture** (project): specific work, specific benefit distribution

Currently the NDO implements only venture-level governance (single resource interactions, agent roles, process validation). Network and federation-level governance are absent.

### 1.6 Ostrom's Principles as NDO Architecture

Elinor Ostrom's 8 principles for governing commons (*Governing the Commons*, 1990) provide a design checklist for the NDO governance architecture:

| Ostrom's Principle | NDO implementation |
|---|---|
| 1. Clearly defined boundaries (who is in) | Role system: SimpleAgent / AccountableAgent / PrimaryAccountable + functional roles |
| 2. Match rules to local conditions | GovernanceRules embedded in ResourceSpecifications (per-resource rules) |
| 3. Collective choice arrangements | **Gap**: No formal participation in rule-making by affected agents |
| 4. Monitoring (observation of rules and resources) | EconomicEvents + PPR system provides comprehensive audit trail |
| 5. Graduated sanctions | **Gap**: PPR system tracks rule compliance, but sanctions are informal |
| 6. Conflict-resolution mechanisms | **Gap**: Only a PPR category exists; no dispute resolution process |
| 7. Minimal recognition of rights | **Architectural property**: Holochain permissionless access |
| 8. Nested enterprises (multi-scale) | **Gap**: Only single-level governance; no nested structure |

---

## 2. Current Implementation (MVP)

### 2.1 Governance-as-Operator Architecture

The most important architectural choice in the MVP is the separation of data from governance logic:

- **`zome_resource`**: pure data model — creates and stores `ResourceSpecification`, `EconomicResource`, `GovernanceRule` entries without enforcing any business logic
- **`zome_gouvernance`**: state transition operator — the resource zome requests transitions, the governance zome evaluates the applicable rules and approves or rejects them

This is the REQ-ARCH-07 design. It means governance logic can evolve without touching the data model, different governance schemes can be applied to the same resource types, and governance is independently testable.

This architecture is the NDO's most principled contribution to governance design — it directly implements the OVN insight that governance must be compatible with the economic model (REA), because governance and economics are handled by the same zome operating on the same entry types.

### 2.2 VfAction System (16 Actions)

The `VfAction` enum defines all possible economic actions, and by extension, all possible governance-relevant state transitions:

**Standard ValueFlows actions**: `Transfer`, `Move`, `Use`, `Consume`, `Produce`, `Work`, `Modify`, `Combine`, `Separate`, `Raise`, `Lower`, `Cite`, `Accept`

**Nondominium-specific extensions**: `InitialTransfer` (first transaction by a Simple Agent, triggering role promotion), `AccessForUse` (access request triggering governance evaluation), `TransferCustody` (custody-specific transfer preserving nondominium property regime)

Each action has semantic methods: `requires_existing_resource()`, `creates_resource()`, `modifies_quantity()`, `changes_custody()`. This is the deontic layer — actions are typed by their governance implications.

### 2.3 Commitment / EconomicEvent / Claim Cycle

The MVP implements the core ValueFlows observation cycle:

```
Commitment (intent + obligation)
  └─ EconomicEvent (what actually happened)
       └─ Claim (link: this event fulfills that commitment)
```

This is the **planning → observation** bridge. Commitments are governance artifacts: they are the declared intent of an agent, time-bound, linking provider and receiver for a specific VfAction on a specific resource. The claim verifies fulfillment. The entire chain is auditable on the DHT.

This cycle is both governance and economics — consistent with the OVN wiki's REA governance parallel.

### 2.4 Validation System

**`ValidationReceipt`**: a peer-issued record that a specific item (resource, event, agent identity) was validated by a specific agent, with an approval decision, type, notes, and timestamp.

**`ResourceValidation`**: a multi-agent validation workflow for a specific resource, with configurable schemes (`"2-of-3"`, `"simple_majority"`, `"N-of-M"`). Tracks current vs. required validator counts and aggregate status.

The validation system implements the monitoring and graduated sanction aspects of Ostrom's principles: it is the mechanism by which the community collectively validates that resources, agents, and processes meet the network's standards before they gain access to higher-trust activities.

**Validation functions in the coordinator**:
- `validate_new_resource`: validates a resource being added to the network
- `validate_agent_identity`: validates an agent's private identity data for role promotion
- `validate_specialized_role`: validates a request for Transport, Repair, or Storage roles
- `create_resource_validation`: creates a multi-agent validation workflow
- `check_validation_status`: queries whether required validators have approved

### 2.5 The PPR System: 16 Categories, Bilateral Cryptographic Signatures

The Private Participation Receipt (PPR) system is the most complete governance mechanism in the MVP. It generates cryptographically signed, private, bilateral records of every economic interaction.

**`PrivateParticipationClaim` entry structure**:
```rust
pub struct PrivateParticipationClaim {
    pub fulfills: ActionHash,           // References the Commitment
    pub fulfilled_by: ActionHash,       // References the EconomicEvent
    pub claimed_at: Timestamp,
    pub claim_type: ParticipationClaimType,   // One of 16 categories
    pub performance_metrics: PerformanceMetrics,
    pub bilateral_signature: CryptographicSignature, // Both parties sign
    pub counterparty: AgentPubKey,
    pub resource_hash: Option<ActionHash>,
    pub notes: Option<String>,
}
```

**The 16 `ParticipationClaimType` categories across 5 groups:**

| Group | Categories | Governance role |
|---|---|---|
| Genesis | `ResourceCreation`, `ResourceValidation` | Network entry, contribution tracking |
| Core custody | `CustodyTransfer`, `CustodyAcceptance` | Custody chain accountability |
| Services | `MaintenanceCommitmentAccepted`, `MaintenanceFulfillmentCompleted`, `StorageCommitmentAccepted`, `StorageFulfillmentCompleted`, `TransportCommitmentAccepted`, `TransportFulfillmentCompleted`, `GoodFaithTransfer` | Service economy accountability |
| Governance | `DisputeResolutionParticipation`, `ValidationActivity`, `RuleCompliance` | Governance participation tracking |
| End-of-life | `EndOfLifeDeclaration`, `EndOfLifeValidation` | Lifecycle management accountability |

**`PerformanceMetrics` structure** with weighted components:
- `timeliness` (weight 0.25)
- `quality` (weight 0.30)
- `reliability` (weight 0.25)
- `communication` (weight 0.20)
- `overall_satisfaction` (additional signal)

**Bilateral cryptographic signatures**: both the recipient and the counterparty sign the PPR. This is not just authentication — it is **mutual accountability**. Neither party can unilaterally issue a PPR; both must sign. This prevents false claims and creates bilateral commitment to the record.

**`ReputationSummary`**: a derived, privacy-preserving aggregate that agents can selectively share. Counts by category, average performance, time period. The agent controls what they reveal; the summary proves they have a track record without revealing individual interactions.

The PPR system is the NDO's most direct implementation of Ostrom's monitoring principle. It is also the input to the governance equation (access to governance = f(contribution history)).

### 2.6 Role System and Capability-Based Access

**`RoleType` enum**: `SimpleAgent`, `AccountableAgent`, `PrimaryAccountableAgent`, `Transport`, `Repair`, `Storage`

The first three are **governance tiers** (graduated trust levels). The last three are **functional roles** (validated competencies for specific processes).

Role assignment is tracked in `PersonRole` entries (in `zome_person`), created by `assigned_by` agents with appropriate governance tier. Role transitions (SimpleAgent → Accountable, Accountable → Primary) require:
1. Private identity validation by existing AccountableAgents
2. Completion of first validated transaction (for Simple → Accountable)
3. PPR milestones and specialist role validation (for Accountable → Primary)

**Capability-based access** (Holochain native): capability tokens gate cross-zome calls and agent-to-agent requests. The NDO extends this with:
- `PrivateDataCapabilityMetadata`: tracks field-level access grants with 30-day maximum expiry
- `RevokedGrantMarker`: explicit revocation record (Holochain capability revocation does not leave a trace by default)

This is the access control layer of the deontic ontology: permissions are cryptographically issued and cryptographically revoked, not relying on runtime checks.

> **TODO (G1, REQ-AGENT-01, REQ-AGENT-02 — post-MVP)**: The role system and all governance workflows assume `AgentPubKey` as the requestor. Specifically: `RoleType` is assigned to individual agents only; `ValidationReceipt.validated_by` is a single `AgentPubKey`; PPR `counterparty` is an `AgentPubKey`; and `GovernanceTransitionRequest.requesting_agent` is an `AgentPubKey`. Collective, Project, Network, and Bot agents (`AgentEntityType` from `agent.md §6.1`) cannot currently hold roles, participate in validation schemes, sign PPRs, or act as governance requestors. Post-MVP, role assignment must accept `AgentContext` (a union of individual and collective agent references). Delegation rules for collective signing authority must be defined — e.g., a designated `PrimaryAccountableAgent` representative key for the collective NDO, or an N-of-M multi-sig from its member agents. See `implementation_plan.md §3 [G1+Resource]` and `agent.md §3.1`.

### 2.7 What the MVP Does Well

- **Governance-as-operator** is the correct architectural pattern: clear separation of data model and governance logic, enabling swappable governance
- **VfAction semantics** — typed actions with governance implications — are a principled approach to deontic governance encoding
- **Bilateral cryptographic PPRs** are a novel and strong accountability mechanism; stronger than reputation systems that rely on one-sided ratings
- **Multi-scheme validation** (`"2-of-3"`, `"N-of-M"`) supports configurable collective decisions at the resource validation level
- **Graduated role tiers** implement Ostrom's "clearly defined boundaries" principle
- **Private-yet-derivable reputation** (PPR → ReputationSummary) correctly addresses the privacy/accountability tension

### 2.8 Known Gaps in the MVP

| Gap | Impact | Status |
|---|---|---|
| No governance proposal mechanism | Agents cannot propose changes to GovernanceRules; changes require developer update | Planned indirectly via GovernanceRule update functions |
| No collective decision making | Only binary validation schemes; no conviction voting, quadratic voting, etc. | Gap |
| No dispute resolution process | Only a PPR category for dispute resolution participation; no actual mechanism | Gap |
| Governance tiers create de facto hierarchy | The Simple/Accountable/Primary tier system, while non-coercive, concentrates governance influence | Structural design tension |
| No metagovernance | Who can change the governance rules? No formal mechanism | Gap |
| No temporal governance | Rules don't expire; decisions don't sunset | Gap |
| No governance layers | Only venture-level governance; no network or federation layer | Gap |
| No registries | No formal lists of validated agents, active ventures, legitimate proposals | Gap |
| Governance rules untyped | `rule_type` and `rule_data` are free strings; no schema enforcement | Planned fix in `ndo_prima_materia.md` |
| No offchain governance bridge | No mechanism to record offchain decisions as DHT artifacts | Gap |
| ReputationSummary not used for governance weight | PPRs accumulate but don't mechanically influence governance access | Planned via Unyt credit limit integration |
| No affiliation spectrum in governance access | All validated agents treated equivalently; governance cannot enforce "active affiliates only" conditions; the 1-9-90 participation distribution is acknowledged conceptually but not implemented | Gap — requires `AffiliationState` (G2) cross-zome query from the governance operator; see `agent.md §4.2`, `resources.md §4.5` |
| No collective agent governance participation | Collective, Project, Network, and Bot agents (G1) cannot hold roles, sign PPRs, or act as validators; economic events between a project and an organisation cannot be correctly modelled | Gap — requires `AgentContext` extension across role assignment, PPR issuance, and validation receipt; see `agent.md §4.1` |
| No governance-enforced cross-app identity | Communities cannot cryptographically require a verified same-person link (W3C DID / `IsSamePersonEntry`) before high-trust transitions | Planned: `IdentityVerification`-style `GovernanceRule` + `FlowstaIdentity` slot checks (`ndo_prima_materia.md` **Section 6.7**, **REQ-NDO-CS-14**, **REQ-NDO-CS-15**) |
| No sybil resistance for governance | Multiple source chains controlled by one physical person can dilute validation quorums, game role promotion, or accumulate disproportionate PPR counts | Gap — requires social vouching (N existing active affiliates vouch for a new agent) or optional proof-of-personhood (G9); see `agent.md §5.3`. Planned complement (not replacement): optional **Tier 2** Flowsta identity checks for high-trust roles (**REQ-NDO-CS-14**, `ndo_prima_materia.md` **Section 6.7**) |
| No pseudonymous governance participation | Pseudonymous or anonymous agents cannot accumulate PPRs or earn governance access without linking contributions to a persistent identity | Gap — by current design; pseudonymous participation mode (G10) is a post-MVP option with a defined affiliation path; see `agent.md §4.5` |

---

## 3. Post-MVP Roadmap

### 3.1 Governance-as-Operator Extended to LifecycleStage

The prima-materia model introduces two orthogonal state dimensions, both governed by the governance zome acting as state transition operator:

- **`LifecycleStage`** (10 stages on `NondominiumIdentity`): the maturity/evolutionary phase of the resource. Each transition requires a valid economic event and a role-authorized request. Examples: `Prototype → Stable` (peer validation), `Active → EndOfLife` (challenge period).
- **`OperationalState`** (7 states on `EconomicResource`): the current process acting on a resource instance. Transitions are triggered by process events: a transport `Move` event sets `InTransit`; its completion clears it back to `Available`. Transport, storage, and maintenance are processes — they do not advance `LifecycleStage`.

Both dimensions generate auditable lifecycle history via `EconomicEvent` entries, extending the governance-as-operator pattern to cover the complete resource state model.

### 3.2 EconomicAgreement GovernanceRule Type (Unyt Integration)

The `EconomicAgreement` GovernanceRule type (see `unyt-integration.md`) adds programmable economic governance to the existing rule set. Unyt Smart Agreements (RHAI scripts) become governance rules — specifying not just who may act but what economic consequence follows. This is a direct implementation of the OVN's connection between governance and the economic model.

Identity verification for cross-app identity follows the **same structural pattern**: a discoverable **CapabilitySlot** (Tier 1) plus an enforceable **`GovernanceRule`** (Tier 2) — detailed in **Section 3.7** (Flowsta).

### 3.3 NDO Capability Slot Surface (Stigmergic Governance)

The CapabilitySlot surface (Section 6 of `ndo_prima_materia.md`) enables stigmergic governance at the NDO level. Any agent can attach governance tools (a GovernanceDAO slot, a dispute resolution hApp, a voting tool) to any NDO's Layer 0 identity hash without modifying the NDO entry. Governance infrastructure attaches to resources, not the other way around.

That same `ndo_prima_materia.md` Section 6 also defines the **`Person` entry hash** as a capability surface for agents (e.g. **`FlowstaIdentity`**); as rules mature, the governance operator may **read both** resource Layer 0 attachments and agent identity attachments when evaluating transitions — without prescribing every MOSS tool in the DNA.

### 3.4 Many-to-Many Governance Consent

Multi-custodian consent mechanisms (from `many-to-many-flows.md`): when a resource has multiple custodians, governance decisions that affect it require multi-party consent. This brings network-level governance down to the resource level.

### 3.5 Reputation-Weighted Governance (via Unyt)

The PPR → Unyt credit limit feedback loop (`unyt-integration.md` Section 7) is the governance equation in practice: contribution history determines economic access, and economic access determines which governance interactions are available. This is not yet explicit governance weighting, but it creates the data foundation for it.

When both Unyt and Flowsta are adopted, a **Flowsta DID** (via a valid Tier 1 `FlowstaIdentity` slot and `IsSamePersonEntry`) can anchor **cross-app attribution** of the same reputation signals that inform Unyt credit limits (`ndo_prima_materia.md` **Section 6.7**, **Section 11.6**).

### 3.6 Agent Ontology Impacts on Governance-as-Operator (Post-MVP)

The expanded agent ontology from `agent.md` introduces three structural changes to the governance-as-operator architecture that must be addressed in the post-MVP generic NDO:

**3.6.1 AgentContext as Requestor (TODO G1, REQ-AGENT-02)**

The `GovernanceTransitionRequest.requesting_agent: AgentPubKey` field (see `governance-operator-architecture.md §2.1`) must be extended to `requesting_agent: AgentContext` post-MVP. `AgentContext` is a union that accommodates `Individual`, `Collective`, `Project`, `Network`, `Bot`, and `ExternalOrganisation` agent types (see `agent.md §6.1`). The governance evaluation functions `validate_agent_permissions` and `validate_agent_for_promotion` must be extended to handle each type. For `Bot` and collective agents, the signing authority is the `operator: AgentPubKey` declared in `AgentEntityType::Bot`, or the designated `PrimaryAccountableAgent` representative of the collective NDO. Multi-sig patterns (N-of-M from collective NDO members) are an alternative for high-stakes governance actions. See Section 6.6 of this document for the full collective agent governance pattern.

**3.6.2 AffiliationState as Governance Condition (TODO G2, REQ-AGENT-03, REQ-AGENT-05)**

The governance operator must support `min_affiliation` conditions in `GovernanceRule.rule_data`. When a GovernanceRule contains a `min_affiliation` field (e.g. `"min_affiliation": "ActiveAffiliate"`), the operator must:
1. Cross-zome call `zome_person` to retrieve the requesting agent's `AffiliationRecord` entries
2. Derive the agent's current `AffiliationState` (`UnaffiliatedStranger | CloseAffiliate | ActiveAffiliate | CoreAffiliate | InactiveAffiliate`)
3. Compare the state against the `min_affiliation` threshold and block the transition if the agent does not meet it

This is the mechanism by which the governance equation (Section 4.4, Section 6.4) becomes operationally enforceable — not merely a conceptual aspiration. Without this cross-zome query, the governance equation has no runtime implementation. See `resources.md §5.3 (Affiliation-gated resource access)` and `implementation_plan.md §3 [G2+Resource]`.

**3.6.3 AffiliationRecord as Governance Ceremony (TODO G6, REQ-AGENT-05)**

Signing an `AffiliationRecord` — the formal Terms of Participation ceremony — is itself a governance event in the ValueFlows sense. Using the existing Commitment/EconomicEvent cycle:
- The agent creates a `Commitment` entry: "I commit to the Terms of Participation, Nondominium & Custodian agreement, and Benefit Redistribution Algorithm"
- The act of signing the `AffiliationRecord` entry with the agent's key constitutes the fulfilling `EconomicEvent`
- A `Claim` links the two, creating an auditable on-chain record of the affiliation ceremony

The `AffiliationRecord` entry hash then becomes the evidence that the agent's `AffiliationState` function returns `ActiveAffiliate`. This is what transitions the agent from `CloseAffiliate` (knows the network, not yet committed) to `ActiveAffiliate` (has formally committed, gains governance access). No separate "activation" function is needed — the `AffiliationState` derivation reads the presence or absence of the `AffiliationRecord` directly from the DHT.

### 3.7 Flowsta Integration — Identity Verification Governance (`flowsta-integration.md`)

**Parallel to Unyt (`ndo_prima_materia.md` Section 6.6 vs 6.7):** Unyt combines a **`UnytAgreement`** capability slot with an endorsed **`EconomicAgreement`** `GovernanceRule` and, at full enforcement, a **RAVE** proof on the transition request. Flowsta combines a **`FlowstaIdentity`** capability slot on the agent's **`Person`** entry hash (target: an **`IsSamePersonEntry`** action hash committed by `flowsta-agent-linking` zomes) with an endorsed **`IdentityVerification`** rule (or equivalent typed rule): transitions that the rule scopes (e.g. **PrimaryAccountableAgent** promotion, high-value **`TransferCustody`**) are **blocked** unless **Tier 2** validation passes (REQ-NDO-CS-15: slot present, `IsSamePersonEntry` includes requestor key, not revoked).

**Tier 1 — permissionless attestation** (REQ-NDO-CS-12, REQ-NDO-CS-13): `FlowstaIdentity` is a `SlotType` variant; any agent may attach a slot pointing at a valid `IsSamePersonEntry`. The governance zome does **not** require this for baseline participation.

**Tier 2 — governance requirement** (REQ-NDO-CS-14, REQ-NDO-CS-15): When an applicable rule is in force, evaluation shall verify: (a) a `FlowstaIdentity` capability slot exists from the requestor's `Person` hash; (b) the referenced `IsSamePersonEntry` includes the requestor's `AgentPubKey` as one of the two signing parties; (c) the link has not been revoked via the Flowsta coordinator's `revoke_link` (`ndo_prima_materia.md` **Section 6.7**).

**Implementation locus (planned, not MVP):** In `ndo_prima_materia.md`, Flowsta **Phase 3** extends the same governance-operator / **`evaluate_transition_request`** story as Unyt Phase 3 — unified transition evaluation that reads typed rules and cross-zome / cross-cell evidence. Today's MVP stores `GovernanceRule` as **`rule_type` / `rule_data` strings** in `zome_resource` (no enum yet) and uses **separate** coordinator paths such as `validate_agent_for_promotion` and `validate_agent_for_custodianship` for private-field checks, **without** Flowsta or `IdentityVerification` enforcement. Tier 2 identity checks are specified to **fold into** that unified evaluation as the generic NDO matures.

**PPR and reputation:** With a verified slot, **`ReputationSummary` is attributable to a cross-app DID** (**REQ-NDO-AGENT-08**; prima **Section 6.7**). **Attribution** (same person across apps) is not **claim transferability** (`PrivateParticipationClaim` entries remain bound to local keys) — the same distinction as `resources.md` **§4.6**.

**Complementarity:** Flowsta answers *who is who*; Unyt answers *who owes what*. Communities may adopt one, both, or neither (`ndo_prima_materia.md` **Section 6.7**, *Flowsta and Unyt*). See **`resources.md` §3.8** for resource-ontology cross-links and **`agent.md` §3.5** for the agent-facing tier summary.

**Traceability:** `ndo_prima_materia.md` **Section 11.6** (Flowsta integration in the requirements matrix).

---

## 4. OVN Governance Ontology: 15 Years of Practice

### 4.1 Governance Layers

The OVN wiki defines three governance layers, each with different concerns:

**Network-of-networks layer** (ecosystem governance):
- Protocols and standards for cross-network interoperability
- Role and reputation portability across organisational boundaries — **planned**: W3C DIDs plus `FlowstaIdentity` / `IsSamePersonEntry` as a near-term cross-network identity anchor (**REQ-NDO-AGENT-08**, `ndo_prima_materia.md` **Section 6.7**), with Verifiable Credentials and ZKP proofs as longer-term depth (see `agent.md` §4.4)
- Content management standards enabling effective cross-network documentation
- Custodian agreements, exchange firm mandates

**Network layer** (commons community governance):
- Resource access governance (tools, spaces, brand, infrastructure)
- Access to network-level governance participation
- Benefit distribution algorithm and governance equation
- Protocols for contribution accounting and transactions within the network

**Venture layer** (project governance):
- Benefit distribution for specific projects (regulated by benefit redistribution algorithm)
- Autonomous governance within the network's meta-rules

The NDO currently implements only venture-layer governance. The generic NDO must support all three, using the same primitives at each scale.

**Complexity economics note**: Multi-scale governance that uses self-similar primitives is not just architecturally elegant — it is functionally necessary. A governance system that only works at one scale cannot adapt to the fractal structure of real OVN communities. The holonic NDO structure (each NDO is both a whole and a part) requires holonic governance.

### 4.2 Governance Components

**Governing bodies**: Committees, offices, working groups. The OVN wiki notes that functions like "leadership," "coordination," and "accountability" should be seen as processes that can be distributed or embodied, not as roles necessarily held by specific individuals. The NDO's role system partially addresses this, but does not model governing body structures.

**Registries**: Formal lists used in governance processes — list of affiliates, list of events, list of legitimate funding proposals, list of ventures, list of digital services. Registries enable algorithmic governance: "only those included in the registry of affiliates will be considered for participating" in a decision. The NDO has anchor-based discovery links but no governance-specific registries.

**Decision making**: The OVN wiki lists multiple decision-making mechanisms: `Free initiative`, `Red flag`, `Lazy democracy`, `Advice process`, `Voluntary subordination`. None of these are implemented in the NDO beyond binary approval/rejection in validation schemes.

**Body of agreements**: Smart contracts + paper contracts + hybrid. Currently the NDO has GovernanceRules (programmable, onchain) and Commitments (onchain). Missing: integration with paper/legal agreements (even as hash references), and the hybrid model between onchain enforcement and offchain human processes.

**People, environment, purpose**: The OVN draws on constitutional theory: People (who is in and how they interact), Environment (external pressures on the organisation), Purpose (the attractor that orients governance). In NDO terms: People = agent system; Environment = DHT and surrounding ecosystem; Purpose = the nondominium property regime embedded in the DNA. These are correct architecturally but not explicitly modeled as governance artifacts.

### 4.3 Governance Processes

The OVN wiki lists five governance processes for how decisions get made:

| Process | Description | NDO support |
|---|---|---|
| Free initiative | Any agent can act without prior approval within their scope | Partially: permissionless network entry; role-gated process initiation |
| Red flag | Any agent can signal concern about a proposed action | **Gap**: No signal mechanism for concerns |
| Lazy democracy | Proposals pass by default unless someone objects | **Gap**: Not implemented |
| Advice process | Must consult affected parties before acting | **Gap**: Not implemented |
| Voluntary subordination | Agents voluntarily follow decisions they didn't make | Partially: governance-as-operator (agents accept system rules by participating) |

The processes are not mutually exclusive. Different types of decisions warrant different processes. The generic NDO should support configurable governance process assignment per decision type.

### 4.4 Access to Governance and the Governance Equation

The OVN wiki identifies a key design problem in open systems: the **long tail distribution** of participation. A typical OVN has a 1-9-90 structure: 1% are core participants (entrepreneurial, high commitment), 9% are active contributors, 90% are occasional participants. The governance system must be sensitive to this — it cannot treat all participants equally without producing either governance paralysis (too inclusive) or oligarchy (too exclusive).

**The governance equation** maps contribution history to governance access:

```
governance_access = f(past_contributions, future_commitments)
```

Past contributions are measured through contribution accounting (PPRs in NDO). Future commitments are pledges of future work (Commitments in NDO). Access to governance is seen as a **benefit** — one of the outputs of participation in the commons, alongside economic benefits and social benefits.

The OVN affiliation spectrum (`agent.md §4.2`) is the operational definition of this equation — the concrete mechanism by which participation depth maps to governance tier:

- `UnaffiliatedStranger` / `CloseAffiliate` → individual-level access only: permissionless DHT reads, basic VfActions; no governance participation
- `ActiveAffiliate` → governance participation unlocked: validation, proposal submission, dispute resolution
- `CoreAffiliate` → elevated governance weight: rule amendment, role promotion, registry management; algorithmically determined from PPR contribution rate above a configurable threshold
- `InactiveAffiliate` → reduced access: prior contributions preserved and visible; governance weight suspended until re-engagement

The **`AffiliationRecord`** entry (G6) is the formal on-ramp that transitions an agent from `CloseAffiliate` to `ActiveAffiliate`. It is a governance event in the ValueFlows sense: the agent creates a `Commitment` (I commit to the Terms of Participation, the Nondominium & Custodian agreement, and the Benefit Redistribution Algorithm), fulfils it by signing the `AffiliationRecord` entry on-chain, and a `Claim` links the two. From that moment, the agent's `AffiliationState` derivation function (which reads DHT data, not a stored field) returns `ActiveAffiliate`, and the governance gate opens.

Post-MVP, **ZKP proofs** (G7) enable agents to prove their affiliation tier to other governance participants without revealing which network they are affiliated with, their full contribution history, or the identity of their counterparties. An agent can prove "I am at least an ActiveAffiliate with ≥ N governance claims" without disclosing the raw PPR data. This is the privacy-preserving meritocracy design: governance access based on contribution without requiring surveillance of the agent's full history.

**Flowsta and complexity matching:** **Tier 1** (permissionless `FlowstaIdentity` attestation) keeps friction low for the long tail of occasional participants. **Tier 2** (**REQ-NDO-CS-14**, `ndo_prima_materia.md` **Section 6.7**) lets communities require Tier 2–validated Flowsta linking only where **Bar-Yam-style complexity matching** justifies the coordination cost — e.g. **PrimaryAccountableAgent** promotion or high-stakes custody — without mandating Flowsta for every agent.

**Non-binary decision making**: The OVN wiki proposes mechanisms beyond yes/no voting: conviction voting (continuous preference posting, updated over time), quadratic voting (cost of additional votes grows quadratically, preventing concentration), rank choice (preference ordering across alternatives). These are described as composable — basic decision-making patterns that can be combined into more complex governance recipes.

**Complexity economics note**: The governance equation is an application of Benkler's observation that P2P systems can process more granular information than market or hierarchical systems. Instead of binary in/out, the governance system can weight participation based on the richness of contribution history, producing governance decisions that reflect actual contribution patterns rather than crude majority rules.

### 4.5 Embedded Governance — Onchain and Offchain

The OVN wiki's most practically important governance insight for NDO: the distinction between:

- **Governance of the OVN**: meta-rules about how the network behaves; control resides outside/above the automated system
- **Governance through the OVN**: automated execution through smart contracts, self-enforcing agreements

This maps to:
- **Offchain governance** (governance of): the community's agreements about rules, maintained in documents and social processes; what the DNA is designed to implement
- **Onchain governance** (governance through): the actual HDI validation rules, capability tokens, GovernanceRules; what the DNA implements and enforces automatically

The OVN wiki is explicit: "What cannot be automated? Human issues: interpersonal problems, emotions, etc. cannot be automated." Metagovernance — discussions about the rules, proposals for new rules, architectural decisions — requires human process. The NDO should provide hooks for metagovernance without trying to automate it.

Sensorica's current governance is described as "mostly offchain (written in documents), although some governance aspects are embedded within the infrastructure." The NDO project represents the transition toward more onchain governance, with Nondominium as "the resource transfer and flow engine... designed as an organization-agnostic system that embeds governance rules directly within resource definitions."

**Complexity economics note**: The question of how much to automate is itself a governance decision. Full automation produces a rigid, brittle system that cannot adapt to unforeseen situations. Full human process is slow and expensive. The optimal point depends on the community and context — which is why the NDO should support configurable automation depth, not hard-code a single approach.

### 4.6 Stigmergy and Governance

The OVN wiki treats stigmergy as a governance mechanism, not just an implementation pattern. "Stigmergic governance relies on embedded governance, meaning that the effect of these fundamental principles are complemented by the properties of the environment."

The key insight: **governance can be reduced to a small number of principles embedded in the environment, with complex collective behaviour emerging from individual responses to environmental signals**. Ants build nests of extraordinary complexity without written rules — just a few genetic principles and an environment they modify collectively.

For the NDO: the fundamental governance principles should be encoded into the DHT structure (Holochain validation rules, capability tokens, the VfAction semantics). The specific governance recipes for different communities should emerge from how those communities configure and extend the environment (GovernanceRules, CapabilitySlot attachments, role definitions). The system should not need a comprehensive rulebook — it needs a well-designed environment.

The OVN's description of stigmergy as "governance focused on attention — governing our collective attention" is relevant: capability slots and anchor links are both mechanisms for directing agents' attention to what is relevant, allowing them to coordinate without central direction.

### 4.7 Deontic Ontology

The OVN wiki explicitly calls for a deontic ontology integrated with REA: "Fundamental concepts and relations that allow us to speak about decisions, rules, norms, obligation and permission." The core operators are **Obligation** and **Permission**, from which Access (to benefits or resources) can be derived.

In NDO terms:
- `Permission` → capability tokens + role-gated validation + GovernanceRule `enforced_by`
- `Obligation` → Commitment entries (a declared obligation to perform a VfAction by a due date)
- `Access` → derived: agent has capability token AND meets GovernanceRule conditions → access granted

The current NDO implements these concepts but does not name them using deontic vocabulary. The generic NDO should formalise the deontic layer as first-class governance entries, not as implicit properties of other entry types.

A deontic governance entry might look like:

```rust
pub struct DeonticRule {
    pub operator: DeonticOperator,  // Obligation | Permission | Prohibition
    pub applies_to: AgentRole,      // Who this rule applies to
    pub regarding: ActionOrResource, // What action or resource it concerns
    pub conditions: Vec<Condition>, // Preconditions for the rule to apply
    pub enforced_by: GovernanceLayer, // Venture | Network | Federation
    pub expires_at: Option<Timestamp>,
}
```

This would replace the current untyped `GovernanceRule` with a formally typed deontic structure.

Planned first **typed rule families** alongside that migration include **`EconomicAgreement`** (Unyt settlement / RAVE path) and **`IdentityVerification`** (Flowsta `FlowstaIdentity` + `IsSamePersonEntry` path) — both specified in `ndo_prima_materia.md` **Sections 6.6–6.7** while MVP code still uses `rule_type` / `rule_data` **strings** in `zome_resource`.

### 4.8 Temporal Governance

The OVN wiki identifies several temporal dimensions of governance:

- **Decision expiry**: decisions can have expiration dates, not just single-moment validity
- **Evaluation triggers**: decisions can include evaluation conditions that, if triggered, initiate review or revision
- **Past-looking and forward-looking governance access**: both contribution history and future commitments count
- **Preference voting as continuous process**: agents update preferences over time, building an ongoing governance profile

The NDO currently has only one temporal governance mechanism: capability grant expiry (30-day maximum for private data access grants). This is correct but minimal. The generic NDO should support temporal governance more broadly.

### 4.9 Constitution and the Governance of Governance

The OVN wiki discusses whether OVNs should have constitutions. Its conclusion: traditional constitutions (for closed, bounded organisations) don't map well to open, fractal networks. But the concept of a **constitutive infrastructure** — "all of that organization's implementations of the constitutive function" — is useful.

The constitutive infrastructure of an NDO community is:
- The DNA validation rules (hard-coded, very difficult to change)
- The global GovernanceRules (encoded in the DHT, updatable through governance)
- The community agreements (offchain, referenced but not enforced by the DNA)

The **governance surface** — the mechanisms through which the constitutive infrastructure can be modified — is a critical design element. In the OVN model, this includes: who can propose a rule change, what deliberation process applies, how changes are ratified, and how they are recorded.

The NDO has no formal governance surface. Rule changes require developer intervention (DNA upgrades) or are limited to per-resource GovernanceRule updates (controlled by role-gated validation). This is a fundamental gap for any community that needs to evolve its own rules.

---

## 5. Gap Analysis

### 5.1 Mapped — OVN concepts implemented or planned in NDO

| OVN concept | NDO implementation | Status |
|---|---|---|
| Governance-as-operator (embedded rules) | `zome_gouvernance` as state transition operator | ✅ Implemented |
| Deontic permission system | Capability tokens + role-gated validation | ✅ Implemented |
| Deontic obligation system | `Commitment` entries with due dates | ✅ Implemented |
| Access from Permission | Role-gated VfAction execution | ✅ Implemented |
| Monitoring and accountability | PPR system (16 categories, bilateral signatures) | ✅ Implemented |
| Graduated trust / bounded membership | SimpleAgent → Accountable → Primary tiers | ✅ Implemented |
| Multi-scheme collective validation | ResourceValidation with `"2-of-3"`, `"N-of-M"` | ✅ Implemented |
| Governance equation (contribution → access) | PPR → role promotion; Unyt credit limit feedback | ✅ Partial (promotion path); 🔄 Planned (credit/weight) |
| Embedded governance in resources | GovernanceRule entries in ResourceSpecifications | ✅ Implemented (weakly typed) |
| Typed governance rules | `GovernanceRuleType` enum (incl. `EconomicAgreement`, `IdentityVerification` / Flowsta) | 🔄 Planned (`ndo_prima_materia.md` **§6.6–6.7**, `unyt-integration.md`, `flowsta-integration.md`) |
| Stigmergic governance surface | CapabilitySlot surface (Layer 0) | 🔄 Planned (`ndo_prima_materia.md`) |
| Economic governance (Smart Agreements) | Unyt EconomicAgreement GovernanceRule | 🔄 Planned (unyt-integration) |
| End-of-life governance (challenge period) | REQ-GOV-11 through REQ-GOV-13 | 🔄 Planned (requirements.md) |
| Privacy-preserving accountability | Private PPRs + derivable ReputationSummary | ✅ Implemented |
| `AffiliationRecord` entry (formal ToP ceremony) | `agent.md §6.4` forward design; uses the existing Commitment/EconomicEvent cycle for the signing ceremony; `AffiliationState` is derived from its presence on the DHT | 🔄 Planned (post-MVP, G6, REQ-AGENT-05) |
| Affiliation-gated resource governance | `GovernanceRule.rule_data["min_affiliation"]` condition evaluated by the governance operator; cross-zome `AffiliationState` query from `zome_person`; blocks state transitions for agents below the threshold | 🔄 Planned (post-MVP, G2 — see `resources.md §5.3`, `implementation_plan.md §3 [G2+Resource]`) |
| Governance-enforced identity verification | `IdentityVerification` rule + `FlowstaIdentity` slot validation (**REQ-NDO-CS-14**, **REQ-NDO-CS-15**; W3C DID + `IsSamePersonEntry`; `ndo_prima_materia.md` **Section 6.7**) | 🔄 Planned (post-MVP) |
| Cross-app identity anchor for portable governance signals | Stable DID + dual-signed attestation; portable credential attribution (**REQ-NDO-AGENT-08**) | 🔄 Planned (post-MVP) |

### 5.2 Partial — concepts present in OVN and partially covered in NDO

| OVN concept | NDO partial coverage | Gap |
|---|---|---|
| Openness / equipotentiality | Permissionless network entry + role-gated governance | No formal mechanism to EARN governance access beyond role promotion |
| Transparency | All rules and events are public DHT entries | PPRs are private; no holoptism mechanism for governance state |
| Decentralisation | Agent-centric Holochain validation | Role tiers create de facto power concentration |
| Emergent governance | Holochain peer validation is emergent | Rules are still designed; no mechanism for rules to emerge from agent behaviour |
| Free initiative | Within role scope, agents can act unilaterally | No explicit free initiative declaration or scope definition |
| Voluntary subordination | Agents accept system rules by joining | No mechanism to formally express "I subordinate to this decision I opposed" |
| Body of agreements | GovernanceRules (onchain) | No paper/legal agreement model; no hybrid onchain/offchain agreements |
| Temporal governance | Capability grant expiry (30 days max) | No expiry on GovernanceRules; no evaluation triggers on decisions |
| Metagovernance | GovernanceRule update with role validation | No proposal mechanism; no formal deliberation; no ratification process |

### 5.3 Missing — OVN concepts not yet planned in NDO

| OVN concept | Gap description | Proposed resolution |
|---|---|---|
| **Governance layers** (venture / network / federation) | Only venture-level governance exists | Model governance scope as a property of GovernanceRules and registries; use NDO's holonic composition to nest governance |
| **Decision-making processes** (free initiative, red flag, lazy democracy, advice process) | No process models beyond binary validation | Add `GovernanceProcess` as a configurable entry type; composable decision patterns |
| **Governing bodies** (committees, working groups) | Not modeled | Model as a specialised NDO (a governing body is itself an NDO with its own governance and membership) |
| **Registries** (affiliate lists, venture lists, legitimate proposal lists) | Only anchor-based discovery links | Add `Registry` entry type: a governance-managed list of validated entries |
| **Non-binary decision making** (conviction voting, quadratic voting, rank choice) | Only binary approve/reject | Modular vote aggregation patterns in a `GovernanceProcess` framework |
| **Red flag / concern signaling** | No mechanism for agents to raise concerns about proposed actions | Add `GovernanceConcern` entry: a signal from any agent about a resource action or governance decision |
| **Governance of governance** (metagovernance surface) | Rule changes require developer intervention or role-gated updates only | Define a formal governance amendment process as a `GovernanceProcess` type |
| **Long tail awareness** (1-9-90 structure) | All validated agents treated equivalently in governance | Participation-weighted governance access (governance equation formally implemented) |
| **Holonic multi-scale governance** | Only single-level governance | Governance primitives should work at venture, network, and federation scales using the same structures |
| **Temporal governance** (rule expiry, decision evaluation triggers) | Only capability grant expiry | Add `expires_at` and `evaluation_trigger` to GovernanceRules and governance decisions |
| **Offchain governance bridge** | No way to record offchain decisions as DHT artifacts | Add `GovernanceRecord` entry: a hash of an offchain document/decision with metadata, linking offchain and onchain governance |
| **Constitution / Governance surface** | No formal description of who can change what rules | Implement a `GovernanceConstitution` entry at the DNA level: a hash-referenced document + amendment process |
| **Affiliation-based governance access gating** | Governance processes cannot enforce "active affiliates only" conditions; all agents with any role receive the same governance access regardless of participation depth | Extend `GovernanceRule.rule_data` schema with `min_affiliation` field; extend governance operator `evaluate_transition` to cross-zome query `AffiliationState` from `zome_person`; block transitions below threshold (refs G2, G6, `agent.md §4.2`, `resources.md §5.3`) |
| **Collective agent governance participation** | Validation schemes, PPR issuance, and role assignment all require `AgentPubKey`; collective, network, and bot agents cannot act as governance participants; economic events between organisations cannot be correctly modelled | Extend `GovernanceTransitionRequest.requesting_agent` and `ValidationReceipt.validated_by` to accept `AgentContext`; define delegation rules for collective signing authority — designated operator key or N-of-M from collective NDO members (ref G1, `agent.md §4.1`, Section 6.6 of this document) |
| **Sybil resistance in governance** | Multiple source chains controlled by one physical person can dilute validation quorums, inflate role promotion counts, or accumulate disproportionate PPR governance_claims | Optional **Tier 2** Flowsta identity checks (**REQ-NDO-CS-14**, `ndo_prima_materia.md` **Section 6.7**) for high-trust role or transition classes — **complementary** to social vouching (N existing active affiliates vouch for a new agent before first governance-tier role promotion) and optional proof-of-personhood as a membrane condition (ref G9, `agent.md §5.3`) |
| **Pseudonymous governance participation** | Pseudonymous or anonymous agents cannot accumulate PPRs or earn governance access without linking contributions to a persistent `Person` identity; the privacy/efficiency trade-off has no intermediate option | Design a pseudonymous affiliation path: PPRs issued to a persistent pseudonymous `AgentPubKey` (no `Person` entry required); pseudonymous agents can reach `ActiveAffiliate` status through contribution; blocked from governance roles that require legal accountability (e.g. dispute resolution involving off-chain agreements); see `agent.md §4.5` (ref G10) |

---

## 6. Forward Map: Generic NDO Governance Architecture

### 6.1 Governance as REA — The Unified Model

The most important design principle for the generic NDO: governance events are EconomicEvents. The unified model:

```
GovernanceRule  (knowledge layer)    → ResourceSpecification analog
GovernanceRecord (planning layer)    → Commitment analog  
GovernanceDecision (observation layer) → EconomicEvent analog
```

This means:
- Proposing a rule change = creating a `GovernanceRecord` (a Commitment-like intent)
- Deliberation = Commitments from affected agents (support/oppose)
- Decision = `GovernanceDecision` (EconomicEvent-like outcome)
- Implementation = updated `GovernanceRule` entries
- Accountability = `ValidationReceipt` on the implementation + PPR for governance participants

This is not a new subsystem — it is the existing ValueFlows cycle applied to the governance domain. The governance zome already handles this cycle for resource governance. Extending it to meta-governance is architecturally natural.

### 6.2 Governance Process as Configurable Entry

```rust
pub struct GovernanceProcess {
    pub name: String,                   // "lazy_democracy", "advice_process", etc.
    pub applies_to: GovernanceScope,    // Venture | Network | Federation
    pub decision_type: DecisionType,    // RuleAmendment | RoleGrant | ResourceAccess | ...
    pub participation_required: Vec<ParticipantSpec>, // Who must participate
    pub quorum: QuorumSpec,             // Minimum participation threshold
    pub threshold: ThresholdSpec,       // What counts as a decision (majority, supermajority, etc.)
    pub timeline: GovernanceTimeline,   // Deliberation + decision + implementation windows
    pub veto_period: Option<Duration>,  // Optional lazy democracy reversal window
    pub expires_at: Option<Timestamp>,  // Sunset clause
}
```

Communities configure which governance process applies to which decision type. The generic NDO provides a library of composable process patterns (from the OVN vocabulary); each NDO instantiation selects and configures its governance recipe.

### 6.3 Registry Model

Registries are governance-managed lists. They are themselves NDO resources (a registry is a resource with its own governance rules):

```rust
pub struct Registry {
    pub name: String,               // "ValidatedAgents", "ActiveVentures", "LegitimateProposals"
    pub scope: GovernanceScope,     // Which governance layer manages this registry
    pub entry_type: RegistryEntryType, // What kind of entries it contains
    pub admission_process: GovernanceProcess, // How entries are added
    pub removal_process: GovernanceProcess,  // How entries are removed
    pub is_public: bool,            // Whether the registry is publicly readable
}
```

The registry mechanism enables algorithmic governance: "only agents in the ValidatedAgents registry may participate in the next decision." This moves governance from relying on per-decision ad hoc membership determination to managed, auditable lists.

### 6.4 Participation-Weighted Governance (The Governance Equation)

The OVN governance equation implemented as a cross-zome computation:

```
governance_weight = f(
    affiliation_state,                            // PREREQUISITE GATE (from agent.md §6.2)
                                                  //   < ActiveAffiliate  → weight = 0 (blocked)
                                                  //   = ActiveAffiliate  → weight computed normally
                                                  //   = CoreAffiliate    → weight × core_multiplier
                                                  //   = InactiveAffiliate → weight = 0 (suspended)
    reputation_summary.average_performance,       // quality of past contributions
    reputation_summary.governance_claims,         // governance participation depth
    reputation_summary.custody_claims,            // resource stewardship depth
    unyt_credit_capacity,                         // economic standing in commons
    active_commitments_count                      // forward-looking engagement
)
```

The `affiliation_state` input is derived (not stored) from existing DHT data by `zome_person` using the formula in `agent.md §6.2`:
```
affiliation_state(agent) = f(
    person_exists(agent),
    affiliation_record_exists(agent),   // AffiliationRecord (G6) signed on-chain?
    contributions_count(agent),         // from EconomicEvents
    last_contribution_timestamp(agent), // recency window check
    reputation_summary.total_claims,
    governance_claims_count(agent)
)
```

The `affiliation_state` gate ensures that the governance equation's contribution data is only evaluated after the formal affiliation ceremony (`AffiliationRecord`, G6) is complete. An agent with high PPR scores but no signed `AffiliationRecord` remains at `CloseAffiliate` and cannot participate in governance — they must formally commit to the network's terms before their contributions are recognised as governance standing. This prevents incidental interactions (browsing the DHT, casual transactions) from accumulating governance weight without commitment.

This weight determines:
- Vote weight in non-binary decision mechanisms
- Thresholds for initiating certain governance processes
- Access to higher-trust governance functions (dispute resolution, rule amendment)

Critically: the weight function is itself a GovernanceRule, configurable by communities. Different communities weight contribution dimensions differently. The `core_multiplier` and the recency window for `InactiveAffiliate` detection are also governance-configurable parameters.

Note: the inclusion of `unyt_credit_capacity` as an input creates a feedback loop (PPR → reputation → Unyt credit → governance weight → more governance participation → more PPRs). To prevent runaway accumulation, the weight function should apply dampening — e.g., logarithmic scaling of the credit capacity input — so that marginal increases in credit produce diminishing governance weight returns.

Communities may also (configurably) treat **Tier 2–validated `FlowstaIdentity`** (or simply presence of a Tier 1 DID link for softer signals) as an additional input for **high-trust** governance processes — aligned with PPR reputation **attributable to a DID** (`ndo_prima_materia.md` **Section 6.7**) — without requiring a new field in the sketch above.

### 6.5 Offchain Governance Bridge

A minimal mechanism for linking offchain human decisions to the onchain governance record:

```rust
pub struct GovernanceRecord {
    pub document_hash: String,           // Hash of the offchain document (PDF, markdown, etc.)
    pub document_uri: Option<String>,    // Where to find the document
    pub record_type: OffchainRecordType, // Agreement | Policy | Decision | Constitution
    pub ratified_by: Vec<AgentPubKey>,   // Agents who have ratified this record
    pub effective_at: Timestamp,
    pub supersedes: Option<ActionHash>,  // Previous version of this record
    pub scope: GovernanceScope,
}
```

This is the bridge between the OVN's offchain governance reality (most governance today is documents and social processes) and the onchain aspiration. Agents ratify offchain documents by signing `GovernanceRecord` entries — creating a cryptographic commitment to the offchain text without requiring full onchain implementation of its processes.

### 6.6 Collective Agent Governance Patterns (Post-MVP)

The expanded agent ontology (`agent.md §3.1`, §4.1`) enables working groups, projects, networks, and bots to act as governance participants. Three structural patterns cover the main cases:

**Pattern 1 — Collective agents as NDOs**

A working group, project, or network is itself an NDO with its own governance layer (Identity + Specification + Process). When a collective NDO participates in external governance — signing a `ValidationReceipt`, acting as a `GovernanceTransitionRequest.requesting_agent`, or being a PPR `counterparty` — it does so through a designated representative: the `PrimaryAccountableAgent` of the collective NDO, whose `AgentPubKey` acts on the collective's behalf. Governance decisions affecting the collective (e.g., approving a resource access request it submitted) require internal governance within that collective NDO before the external signature is issued. This nests governance holonically: venture → network → federation, all using the same VfAction/Commitment/EconomicEvent primitives.

**Pattern 2 — Multi-sig validation for collective actors**

When a governance process requires approval from a collective agent (e.g., a working group must validate a new resource), the `ResourceValidation` scheme must support `AgentContext` references in its `required_validators` field. Two implementation options:

- **Designated operator**: the collective NDO has nominated a single `PrimaryAccountableAgent` whose signature counts as the collective's approval. Simple but creates a governance bottleneck at the operator.
- **Member threshold**: the governance scheme accepts approval from N-of-M individual agents who are current active members of the collective NDO. More resilient but requires the validator set to be dynamically resolved from the collective NDO's membership links at validation time.

Both options require the `GovernanceProcess` entry (Section 6.2) to declare which pattern applies per `decision_type`. The `ResourceValidation.required_validators` field transitions from `Vec<AgentPubKey>` to `Vec<AgentContext>` post-MVP.

**Pattern 3 — Bot / AI agent governance scope**

`Bot` agents (`AgentEntityType::Bot { capabilities, operator }`) can participate in governance only within the scope declared in their `capabilities` vector. Examples:

- A bot may be authorised to sign `ValidationReceipt` entries for automated integrity checks (e.g., a digital resource hash validation bot) — but not for role promotions or rule amendments, which require human judgment.
- A bot may be authorised to issue `EconomicEvent` entries for automated processes (e.g., a scheduler bot recording that a storage commitment has been fulfilled on time) — but not for dispute resolution.

The `operator: AgentPubKey` in the `Bot` type is the governance-responsible party: all bot actions are attributed to the operator for accountability purposes, and any PPRs generated by bot interactions list the operator as the accountable counterparty. Bot `governance_claims` in the `ReputationSummary` do not contribute to the operator's `affiliation_state` — they are tracked separately under the bot's own `AgentContext` with a `governance_weight = 0` gate (bots cannot accumulate governance standing independent of their human operator).

> **TODO (G1, G11 — post-MVP)**: Implement `AgentContext` type, extend `GovernanceTransitionRequest`, `ValidationReceipt`, and PPR `counterparty` fields to accept `AgentContext`. Define `Bot` delegation scope enforcement in the governance operator's `validate_agent_permissions` function. See `implementation_plan.md §3 [G1+Resource]` and `agent.md §5.3 (DelegatedAgent)`.

---

## 7. Complexity Economics Justification: Why Each Governance Concept Matters

**Governance layers** matter because the OVN is fractal. A governance architecture that only works at one scale (venture) cannot coordinate the network-level and federation-level decisions that determine the ecosystem's evolution. Governance without scale awareness will centralise at whichever scale is most powerful, undermining the decentralisation that makes peer production competitive with capitalist alternatives.

**Decision processes (advice process, lazy democracy, etc.)** matter because different types of decisions have different optimal deliberation speeds. Time-sensitive operational decisions need fast, local authority (free initiative). Rule-changing decisions need wide deliberation and consent. Treating all decisions equally produces either paralysis (everything goes through full deliberation) or autocracy (important decisions get made without consultation). The composable governance process library is the infrastructure for decision-appropriate governance.

**Non-binary decision making** matters because voting aggregates preferences by throwing away information. A community where 60% support a proposal and 40% strongly oppose it is very different from one where 60% support and 40% mildly prefer an alternative. Binary voting cannot distinguish these — it just says "60% win." Conviction voting (continuous preference updating), quadratic voting (cost-weighted expression), and rank choice (preference ordering) all recover more information from the deliberation process. In complexity economics terms: higher-resolution preference aggregation produces better decisions because it uses more of the information that participants possess.

**Registries** matter for the same reason that formal membership distinctions matter in Ostrom's commons governance: without a clear definition of who is in the community, governance processes cannot be bounded, quorums cannot be calculated, and the accountability chain cannot be closed. The OVN's long tail distribution means that simple "everyone who has ever participated" definitions produce governance bodies so large and diffuse that decisions become impossible. Algorithmically managed registries — updated by governance, not by developer deployment — solve this.

**The governance equation** matters because access to governance should not be arbitrary (cooptation, seniority, formal appointment) in a P2P system. Benkler's observation about peer production's information advantage is applicable: distributed contribution data is richer than any centralised assessment of "who is a responsible governance participant." The PPR system generates this data as a byproduct of ordinary participation. Using it to weight governance access converts participation history into governance standing automatically — without administrative overhead.

**The offchain bridge** matters because full onchain governance is a fiction. Human communities have always and will always need spaces for informal conversation, emotional resolution, and contextual judgment that no smart contract can replicate. The OVN wiki is explicit: "Human issues: interpersonal problems, emotions, etc. cannot be automated." A governance architecture that ignores its own offchain complement will be gamed by agents who understand that the informal layer always overrides the formal. Acknowledging and linking the offchain layer makes the full governance stack legible, auditable, and improvable.

**Temporal governance** matters because all rules become outdated. A GovernanceRule written for a community of 10 becomes inappropriate for a community of 1000. A decision made under one set of conditions may be harmful under new conditions. Sunset clauses and evaluation triggers are the governance equivalent of software unit tests: they force the community to consciously re-evaluate whether rules still serve their purpose, rather than allowing dead rules to accumulate and complicate the governance landscape.

**Cross-app identity (Flowsta)** matters for governance for the same reason **credential portability** and **network-layer reputation** matter in the OVN model: agents who participate in **multiple OVNs or hApps** are **bridge nodes** between networks. Without a verifiable **same-person** link across conductors, each network treats them as a stranger and must **re-derive trust from zero**; sybil pressure and cold-start friction repeat at every boundary. Flowsta **Tier 1** keeps overhead low for casual participants; **Tier 2** applies Flowsta link validation only where complexity matching says the coordination cost is justified (`ndo_prima_materia.md` **Section 6.7**, **REQ-NDO-CS-14**).

---

*This is a living document. The gap analysis in Section 5.3 should be converted into formal requirements as the generic NDO project begins. The forward map in Section 6 describes design directions, not final specifications. Major external capability integrations (**Unyt**, **Flowsta**) are traced in `ndo_prima_materia.md` **Sections 6.6–6.7** and **Sections 11.5–11.6**. The OVN wiki at [ovn.world](https://ovn.world/index.php?title=Governance) remains the authoritative reference for peer production governance practice.*
