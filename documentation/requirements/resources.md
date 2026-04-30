# Resources: Ontology, Implementation, and Forward Map

**Type**: Archive / Knowledge Base Document  
**Created**: 2026-03-11  
**Relates to**: `ndo_prima_materia.md`, `versioning.md`, `digital-resource-integrity.md`, `unyt-integration.md`, `flowsta-integration.md`  
**Sources**: MVP code (`zome_resource`), post-MVP design documents, [OVN wiki — Resource](https://ovn.world/index.php?title=Resource), [OVN wiki — Resource type](https://ovn.world/index.php?title=Resource_type)

---

## Purpose

This document maps the three states of Resource understanding in the Nondominium / NDO project:

1. **Implemented** — what exists today in the MVP `zome_resource` codebase
2. **Planned** — what is designed in the post-MVP requirements documents
3. **Remaining** — what the OVN wiki's 15 years of commons-based peer production practice contains that NDO does not yet plan to implement, and which should inform the generic NDO design

The goal is to ensure that the generic NDO — which will be built as a standalone hApp and then instantiated by Nondominium and other projects — represents a complete and principled resource ontology, not an accidental by-product of a single use-case.

---

## 1. Conceptual Foundation: Resources in P2P Complexity Economics

Before mapping what is and is not implemented, it is necessary to establish what a Resource *is* in the theoretical context this project operates within. The OVN wiki defines resources from the REA (Resources, Events, Agents) ontology and extends it through 15 years of Sensorica practice. The NDO builds further on this.

### 1.1 Beyond REA Primitives

In standard REA accounting, a Resource is simply an entity that has economic value and can be tracked as it flows through Events performed by Agents. This is a correct but minimal definition — adequate for accounting, inadequate for governance.

In P2P peer production, a resource is also:
- An **information carrier**: it encodes design intent, provenance, contribution history, and quality evidence
- A **coordination node**: agents discover it, express intent to use it, negotiate access, and coordinate around it
- A **trust anchor**: its history of use (how it has been treated, maintained, transacted) is evidence about the agents who interacted with it
- An **economic attractor**: governance rules embedded in a resource determine who can create value with it, and therefore shape the economic topology of the network around it

This richer conception changes the design requirements fundamentally. A Resource is not merely a record in a ledger — it is a *socially embedded DHT object* with its own identity, governance constitution, and economic role.

### 1.2 The Tragedy of the Commons Solved by Embedded Governance

Hardin's "tragedy of the commons" (1968) argued that shared resources are inevitably depleted because individual agents have incentives to overuse. His solution was privatisation or central regulation. Ostrom's work (*Governing the Commons*, 1990) empirically refuted this: communities have sustainably governed shared resources for centuries through embedded, peer-enforced rules — without privatisation and without central authorities.

The NDO is, architecturally, an implementation of Ostrom's finding. The GovernanceRule entries embedded in ResourceSpecifications are exactly the "locally evolved institutions" that Ostrom identified as the mechanism of successful commons governance. The peer validation of economic events, PPR generation, and role-based access control are the "monitoring and sanctioning" mechanisms she observed.

This theoretical grounding is not academic decoration. It justifies specific design choices: governance rules must be *embedded in the resource* (not in a separate administrative system), enforcement must be *peer-based* (not authority-based), and participation in governance must generate *reputational stake* for participants.

### 1.3 Rivalrous vs. Non-Rivalrous: The Governance Fork

Benkler (*The Wealth of Networks*, 2006) identifies the rivalry or non-rivalry of a resource as the primary determinant of optimal governance strategy:

- **Non-rivalrous resources** (digital designs, methods, documentation, software): can be copied and shared at near-zero marginal cost. Restricting access does not preserve the resource — it only reduces total value creation. Default governance: open access, attribution-based, copy-left.
- **Rivalrous resources** (physical tools, equipment, spaces, materials): use by one agent excludes others. Restricting access is necessary to prevent overuse and ensure maintenance. Default governance: Ostromian embedded rules, reputation-gated access, stewardship requirements.

This distinction has profound implications for NDO Resource modeling. A resource's governance defaults, access rules, lifecycle requirements, and Unyt integration patterns should all differ based on rivalry. The current implementation does not model rivalry explicitly — this is a fundamental gap.

### 1.4 Complexity Matching: Governance Overhead Must Match Resource Complexity

Bar-Yam's complexity matching principle states that the governance complexity of a system must match the complexity of the challenges it manages. Applied to resources:

- A simple idea (Layer 0 only, `Ideation` lifecycle stage) requires near-zero governance overhead
- A design file shared across a network requires moderate governance (attribution, versioning, integrity)
- A physical CNC machine used by 50 agents requires substantial governance (access rules, maintenance scheduling, custody chains, reliability tracking)

The NDO's three-layer model (`ndo_prima_materia.md`) directly implements this principle. The LifecycleStage enum ensures that governance overhead is matched to the resource's current social complexity. But this document will argue that even the NDO plan needs further refinement to model the full spectrum of resource types that exist in practice.

### 1.5 Resources as Social Infrastructure

The OVN wiki goes further than REA in recognising **intangible resources**: social capital, trust, community sense, governance knowledge, competencies, synergy. These are not commodifiable — they cannot be transferred, traded, or priced. But they are inputs to productive processes and outputs of participation.

In complexity economics terms: these intangibles are the *emergent properties* of the social system. They cannot be designed in; they arise from the right conditions. But they can be cultivated, protected, and damaged. A governance system that only models material and digital resources is blind to a large fraction of the actual value that flows in peer production communities.

The NDO does not need to *track* intangible resources in the same way it tracks a bicycle or a CAD file. But it must be *aware* of them — as a category of resource type — to avoid designing governance mechanisms that damage them.

---

## 2. Current Implementation (MVP)

### 2.1 Entry Types in `zome_resource` Integrity

The MVP implements three entry types:

**`ResourceSpecification`**
```rust
pub struct ResourceSpecification {
    pub name: String,
    pub description: String,
    pub category: String,
    pub image_url: Option<String>,
    pub tags: Vec<String>,
    pub is_active: bool,
}
```
This is the **knowledge layer** in ValueFlows terminology: the type or template of a resource. It corresponds to the OVN concept of "Resource Type" — an abstract representation that groups interchangeable concrete instances.

**`EconomicResource`**
```rust
pub struct EconomicResource {
    pub quantity: f64,
    pub unit: String,
    pub custodian: AgentPubKey, // TODO (G1, REQ-AGENT-02): replace with AgentContext post-MVP
                                // to support Collective, Project, Network, and Bot agents as
                                // Primary Accountable Agents. Currently assumes individual agent.
    pub current_location: Option<String>,
    pub state: ResourceState,
}
```
This is the **observation layer**: a specific instance of a resource at a point in time, held by a specific custodian.

**`GovernanceRule`**
```rust
pub struct GovernanceRule {
    pub rule_type: String,   // free-form string (e.g., "access_requirement")
    pub rule_data: String,   // JSON-encoded, completely untyped
    pub enforced_by: Option<String>,
}
```
Economic rules governing access and use. Currently entirely untyped — `rule_data` is a free-form JSON string with no schema enforcement.

**`ResourceState`** (enum) — *conflated, pending split*
```
PendingValidation | Active | Maintenance | Retired | Reserved
```
The code contains a `TODO` comment noting this enum conflates two orthogonal dimensions:
- **`LifecycleStage`** (maturity/evolutionary phase — advances rarely, almost irreversibly)
- **`OperationalState`** (current process acting on the instance — cycles frequently)

`Maintenance` and `Reserved` are operational conditions imposed by active processes; they are not lifecycle milestones. A resource being repaired is still `LifecycleStage::Active` — it just has `OperationalState::InMaintenance`. Similarly, `InTransit` and `InStorage` are operational states valid at any lifecycle stage.

### 2.2 Link Graph

The link types model resource discovery and navigation:
- Anchor links for global discovery (`AllResourceSpecifications`, `AllEconomicResources`, `AllGovernanceRules`)
- Hierarchical links (`SpecificationToResource`, `SpecificationToGovernanceRule`)
- Agent-centric links (`CustodianToResource`, `AgentToOwnedSpecs`, `AgentToManagedResources`)
- Faceted search links (`SpecsByCategory`, `ResourcesByLocation`, `ResourcesByState`, `RulesByType`)
- Governance links (`ResourceToValidation`)
- Update chain links (for Holochain's append-only update pattern)

### 2.3 What the MVP Does Well

- Clean separation of specification (type/template) from resource (instance) — consistent with ValueFlows Knowledge/Observation layering
- Single-custodian model is appropriate for the current Artcoin/simple sharing use case
- GovernanceRule linked to ResourceSpecification rather than EconomicResource is architecturally correct: rules belong to the type, not the instance
- The anchor link pattern enables permissionless discovery

### 2.4 Known Gaps in the MVP

| Gap | Impact | Planned fix |
|---|---|---|
| `ResourceState` conflates lifecycle and operational dimensions (TODO in code) | Cannot model in-transit, in-storage, or in-maintenance resources independently of lifecycle stage | Split into `LifecycleStage` (on `NondominiumIdentity`) + `OperationalState` (on `EconomicResource`) — see `ndo_prima_materia.md` Section 5 |
| No property regime field | Cannot distinguish nondominium from commons from individual stewardship | `PropertyRegime` enum (`ndo_prima_materia.md`) |
| No resource nature field | Cannot distinguish digital from physical from hybrid | `ResourceNature` enum (`ndo_prima_materia.md`) |
| `GovernanceRule.rule_data` is untyped JSON string | No schema enforcement, no tooling support, no peer validation of rule semantics | `GovernanceRuleType` enum with typed schemas (`ndo_prima_materia.md` + `unyt-integration.md`) |
| No lifecycle before `PendingValidation` | Cannot model resources in ideation, design, development stages | `LifecycleStage` (`ndo_prima_materia.md`) |
| Single custodian only | Cannot model shared tools, collective custody, resource pools | Many-to-many flows (post-MVP) |
| No resource-level identity separate from specification hash | Identity changes when specification is updated | `NondominiumIdentity` (`ndo_prima_materia.md` Layer 0) |
| No versioning | Cannot track design evolution, forks, repairs | Versioning DAG (post-MVP) |
| No digital integrity | Cannot verify downloaded digital resource data | Digital Resource Integrity (post-MVP) |
| No rivalry/non-rivalry modeling | Governance defaults are the same for all resource types | Gap — see Section 5 |
| No scope classification | Cannot determine network-wide vs. project-specific visibility | Gap — see Section 5 |
| No resource reliability | No way to track a tool's track record independent of custodian reputation | Gap — see Section 5 |
| No cross-app identity or DID | Agents cannot prove identity across Holochain apps or networks; reputation is local to this DHT; no key recovery mechanism | `FlowstaIdentity` CapabilitySlot on `Person` entry hash (`ndo_prima_materia.md` Section 6.7); W3C DID via Flowsta agent linking; Vault key recovery |
| No agent key recovery | If agent loses device, signing key (and all private entries/PPRs) are inaccessible; no deterministic key regeneration | Flowsta Vault BIP39 recovery phrases; auto-backup; CAL-compliant data export (`ndo_prima_materia.md` Section 6.7) |

---

## 3. Post-MVP Roadmap

The following improvements are designed in the post-MVP documentation. Each is described briefly here; full specifications are in the referenced documents.

### 3.1 NDO Three-Layer Model (`ndo_prima_materia.md`)

The most significant architectural change. Replaces the flat `ResourceSpecification + EconomicResource` model with a progressive three-layer structure:

- **Layer 0 — NondominiumIdentity**: A permanent, immutable identity anchor. The genesis entry whose action hash becomes the stable identifier for the resource across its entire existence. Contains `name`, `description`, `initiator`, `property_regime`, `resource_nature`, `lifecycle_stage`, `created_at`. Never voided — serves as the tombstone at end of life.
- **Layer 1 — ResourceSpecification** (activated by `NDOToSpecification` link): The form of the resource — design, governance rules, assets, digital integrity manifests. Activated when the resource has a form worth sharing.
- **Layer 2 — Process** (activated by `NDOToProcess` link): The activity around the resource — EconomicEvents, Commitments, Claims, PPRs. Activated when multi-agent coordination begins.

This model directly implements the complexity matching principle: coordination overhead grows with actual social complexity, not at resource creation. The three-layer structure is also used for collective agent identities (organisations, projects, working groups) — see `agent.md §3.1` for the Agent-as-NDO pattern.

### 3.2 Property Regime and Resource Nature

```rust
pub enum PropertyRegime {
    Private,        // Full rights bundle; individual ownership
    Commons,        // Non-rivalrous shared resource; governance via licensing/attribution
    Collective,     // Cooperative/collective ownership
    Pool,           // Pool of shareables: rivalrous shared resources; custody/scheduling/maintenance
    CommonPool,     // Rivalrous consumable resource; governance via quota/depletion rules
    Nondominium,    // Uncapturable by design; contribution-based access; no alienation permitted
}

pub enum ResourceNature {
    Digital,   // Software, data, design files, documents
    Physical,  // Material objects, equipment, spaces
    Hybrid,    // Digital twin of a physical resource
}
```

These enums are part of `NondominiumIdentity` (Layer 0) — they classify the resource at creation and remain stable across its lifecycle. The `PropertyRegime` enum is reconciled from the OVN property regime taxonomy (§4.4.3) — see §4.4.6 for the full analysis.

### 3.3 LifecycleStage and OperationalState

The current 5-state `ResourceState` enum is replaced by two orthogonal enums:

**`LifecycleStage`** (10 stages on `NondominiumIdentity`) — the maturity/evolutionary phase of the resource, advancing rarely and mostly irreversibly:

```
Ideation → Specification → Development → Prototype →
Stable → Distributed → Active →
Hibernating → Deprecated → EndOfLife
```

**`OperationalState`** (7 states on `EconomicResource`) — the current process acting on a specific instance, cycling frequently as processes begin and end:

```
PendingValidation | Available | Reserved | InTransit | InStorage | InMaintenance | InUse
```

`Maintenance` and `Reserved` move from `LifecycleStage` to `OperationalState`. Transport, storage, and maintenance are *processes* that can apply to a resource at *any* lifecycle stage (a `Prototype` can be `InTransit` between labs; an `Active` resource can be `InMaintenance`).

Each transition is governance-validated (the governance zome is the state transition operator), generates an economic event, and creates a lifecycle history audit trail.

### 3.4 Versioning (`versioning.md`)

A DAG-based version graph applicable to material resources (physical instances and designs), digital resources (code, documents, CAD), and the Nondominium hApp itself. Typed relations: `EvolvedFrom`, `ForkedFrom`, `MergedFrom`, `RepairedFrom`, `AugmentedFrom`, `PortedToPlatform`. OVN-compliant contribution propagation upstream through the version graph.

### 3.5 Digital Resource Integrity (`digital-resource-integrity.md`)

Cryptographic integrity verification for digital resources: SHA-256 content addressing per 64KB chunk, Merkle tree structure for selective verification, composable/fractal resource architecture (atomic → component → composite), supply chain transparency.

### 3.6 Many-to-Many Flows (`many-to-many-flows.md`)

Extension of the single-custodian model to shared custody with weights and roles, one-to-many/many-to-one/many-to-many custody transfers, resource pools, co-custodian delegation.

### 3.7 Unyt Integration (`unyt-integration.md`)

Economic settlement layer via Unyt Smart Agreements and RAVEs. `EconomicAgreement` GovernanceRule type, RAVE validation as state transition precondition, PPR↔RAVE provenance chain, reputation-derived credit limits.

### 3.8 Flowsta Integration (`flowsta-integration.md`)

Decentralized identity and authentication layer via Flowsta agent linking. `FlowstaIdentity` CapabilitySlot on `Person` entry hash, providing W3C DID (`did:flowsta:uhCAk...`) without modifying the `Person` entry schema. Two-tier identity authority: Tier 1 (permissionless attestation via CapabilitySlot link) and Tier 2 (governance-enforced identity verification for role promotions and high-value transitions). Flowsta Vault provides BIP39 key recovery and auto-backup for agent data resilience (CAL-compliant). PPR `ReputationSummary` becomes attributable to a cross-app DID, enabling portable reputation across Flowsta-linked Holochain apps.

---

## 4. OVN Resource Ontology: 15 Years of Practice

The OVN wiki ([Resource](https://ovn.world/index.php?title=Resource), [Resource type](https://ovn.world/index.php?title=Resource_type)) represents the distilled understanding of commons-based peer production at Sensorica. This section synthesises its key concepts in the context of NDO design, with complexity economics justifications.

### 4.1 Resource Primitives (Greg Cassel / OVN)

The OVN wiki adopts Greg Cassel's resource primitive taxonomy: mental resources, identity, physical resources, and media resources. This is broader than REA.

**Mental resources** — thoughts, feelings, ideas, knowledge that exists in agents' minds. Cannot be modelled directly in a DHT system (they are in the agent's head, not on a public ledger), but they are inputs to productive processes. In NDO terms: mental resources become visible when an agent creates an `Ideation`-stage NDO (Layer 0 only), which is the externalization of a mental resource into a public intent. The Ideation lifecycle stage is precisely the mechanism by which mental resources enter the observable network.

**Identity** — the capacity to distinguish agents and resources. In NDO terms: the `NondominiumIdentity` entry is the identity resource for every NDO object. Agent identity is handled by `zome_person`.

**Physical resources** — material objects with physical properties. NDO's `Physical` nature classification and the full custody/maintenance/transport/repair process suite cover this category.

**Media resources** — information superimposed on mediums: signs, signals, streams, messages, items, channels. This maps to NDO's `Digital` nature classification but is richer: the OVN taxonomy distinguishes between a design file (media item) and the channel through which it is shared (media channel). NDO currently does not make this distinction — a `Digital` resource could be either.

**Complexity economics note**: Mental resources and media resources are both non-rivalrous. Their governance implications differ from physical resources. Encoding this distinction at the resource type level is prerequisite to correct governance defaults.

### 4.2 Value Chain Maturity

The OVN wiki characterises resources by their stage of development:

| OVN stage | Description | NDO `LifecycleStage` equivalent |
|---|---|---|
| Idea | Documented, contextualised intent | `Ideation` |
| Design | Formalised in CAD, SPICE, etc. | `Specification`, `Development` |
| Study | Documented R&D | `Development`, `Prototype` |
| Prototype | Tangible, somewhat functional | `Prototype` |
| Usable artifact | Ready-to-use product | `Stable`, `Distributed`, `Active` |

The NDO `LifecycleStage` enum covers and extends this taxonomy with the addition of post-operational stages (`Hibernating`, `Deprecated`, `EndOfLife`) that OVN implies but does not formally enumerate. The NDO model is thus more complete in this dimension.

**Complexity economics note**: A resource's governance complexity should match its value-chain maturity. An `Ideation`-stage resource (someone's declared intent) requires near-zero governance. A `Stable` design that is being distributed for fabrication requires full governance, integrity verification, and versioning. The NDO's pay-as-you-grow layer activation model directly implements this — it is why the three-layer model is correct.

### 4.3 Production Process Resource Types

The OVN wiki classifies what production processes need:

| OVN type | Description | NDO coverage |
|---|---|---|
| Human labor | Time spent working | **Not modeled** as a resource type; covered by PPR participation records |
| Usables | Non-consumed inputs (tools, equipment) | Physical resources in NDO |
| Consumables | Depleted inputs (glue, components) | Physical resources in NDO; quantity tracking covers depletion |
| Space | Physical or virtual locations | **Not explicitly modeled** as a resource type |
| Method | Protocol, recipe, sequence | **Not modeled** as a resource type |
| Currency | Symbolic value exchange system | **Not modeled** as a resource type; partially addressed by Unyt integration |

The most significant gaps here are **Method** (documented processes, recipes, protocols) and **Space** (physical locations with governance, scheduling, and access control needs). Both are important in commons-based peer production settings.

**Method resources** are particularly interesting in the NDO context: a fabrication method (how to assemble a CNC machine) is a non-rivalrous digital resource — it can be copied freely. But it is also a *governance-bearing* resource: it defines the conditions under which physical resources should be used, encoding safety requirements, quality standards, and attribution requirements. In NDO terms, a Method would be a Digital NDO whose Layer 1 specification includes both the documented process and governance rules referencing it.

**Space resources** are rivalrous (only one person can use the CNC machine bay at a time) and require scheduling/booking mechanics that the current NDO does not model. A future generic NDO should be able to express temporal availability as a dimension of resource governance.

### 4.4 Property Regimes

#### 4.4.1 What Property Is

The OVN wiki opens its treatment of property with a definition that reorients the entire concept away from legal formalism: "Property is about the **relationship between agents and things**. These relationships are institutionalized, meaning that they are codified as norms or rules or laws, are made public and are widely accepted by everyone in a social setting."

Property is not an object — it is a *bundle of rights and obligations* connecting a subject (agent) to an object (resource). Bentham identified four key classes of stakeholder rights in this bundle:

| Right | Description | NDO mapping |
|---|---|---|
| **Use** | Exclusive or otherwise — the right to interact with the resource | Role-gated VfAction execution; GovernanceRule `access_requirement` |
| **Usufruct** | The fruits of use — the right to benefit from what the resource produces | Benefit redistribution algorithm; PPR-based credit distribution |
| **Management** | The right to define how the resource is governed | GovernanceRule creation; role-gated rule modification |
| **Custody/Stewardship** | The right and obligation to maintain and protect the resource | `EconomicResource.custodian`; custody transfer protocols |

These four rights are not always bundled together. A Simple Agent may have Use rights without Management rights. A maintenance specialist has Custody rights for the duration of a repair without having Management rights. The NDO's role system and GovernanceRule architecture partially implements this unbundling, but without explicit modelling of which rights each role confers.

#### 4.4.2 Goods Typology: The Excludability × Rivalry Matrix

Before classifying property regimes, Ostrom (following Samuelson) establishes a goods typology based on two independent axes:

- **Excludability**: can non-payers or non-members be excluded from use?
- **Rivalry (subtractability)**: does one agent's use reduce availability for others?

| | Low excludability | High excludability |
|---|---|---|
| **Low subtractability** | Public goods (open knowledge, broadcast) | Toll / Club goods (private park, cable TV, software) |
| **High subtractability** | Common-pool resources (fisheries, physical tools) | Private goods (equipment owned by one person) |

Critically: goods types exist independently of property regimes. A common-pool resource (high subtractability, low excludability) can be owned as government property, private property, community property, or no-one's property. The goods type characterises the resource's *physical or informational nature*; the property regime characterises the *social arrangement* governing it.

This distinction matters for the NDO: `ResourceNature` and `Rivalry` describe the *intrinsic* characteristics of the resource. `PropertyRegime` describes the *chosen governance arrangement*. They are orthogonal fields.

#### 4.4.3 The Full Property Regime Taxonomy

The OVN wiki distinguishes more regime types than the current NDO plan. All are important for the generic NDO:

| Regime | Rivalry | Excludability | Description | NDO coverage |
|---|---|---|---|---|
| **Private** | Any | High | Owned by one agent; full rights bundle; protected by a higher authority (or by Nondominium design) | `Private` (NDO forward map) |
| **Public** | Any | Low | Owned by the state; accessible under conditions; not relevant in a stateless P2P context | Not planned (stateless system) |
| **Commons** | Non-rivalrous | Low | Pool of tangible but immaterial resources (designs, knowledge, software) with use governance (licences, attribution). Technically can be privatised through governance capture | `Commons` (NDO forward map) |
| **Pool of Shareables** | Rivalrous | Medium | Tangible material resources intended for sharing within a network; individually governed by property regime and intrinsic characteristics; designed for preservation and perpetual access | `Pool` (NDO forward map) |
| **Common-pool resource** | Rivalrous | Low | Mostly consumables, governed in bulk with rules for prevention of depletion; community-managed quotas | `CommonPool` (NDO forward map) |
| **Condominium** | Rivalrous | High | Resource divided into privately owned parts with collective governance of the whole (infrastructure, integrity, shared structures) | Not planned (can be added as a future variant) |
| **Nondominium** | Any | High (by design) | Requires *extremely high costs of control*, making it virtually uncontrollable by any entity — not even nation states. Does not need external protection because no actor can capture it. Examples: Bitcoin network, open seas, indigenous forest commons | `Nondominium` (NDO forward map) |
| **Toll goods (club goods)** | Non-rivalrous | High | Excludable but non-rivalrous up to a point (congestion); fee-based or membership-based access | Not planned (can be added as a future variant) |

**The three most critical distinctions for the NDO:**

**Commons ≠ Pool of Shareables**: The OVN wiki makes an important distinction. Commons are immaterial (non-rivalrous) resources — sharing a design file costs nothing and excludes no one. Pool of Shareables are material (rivalrous) — sharing a 3D printer requires scheduling, maintenance, and custody transfer. These have different governance requirements and should map to different `PropertyRegime` variants.

**Commons ≠ Nondominium**: In the OVN model:
- **Commons**: governed resources with shared stewardship; theoretically, governance capture could privatise a commons (a bad actor could modify the governance rules to extract exclusive control)
- **Nondominium**: *uncapturable by design* — no one can assert ownership, no organisation can enclose them. The property regime exists independently of governance rules: even if governance rules were to declare individual ownership, the cryptographic architecture makes it technically unenforceable

The NDO's architecture (append-only DHT, no admin key, agent-centric source chains) is a Nondominium implementation at the infrastructure level. This should be formally reflected in the data model.

**Nondominium is defined by cost of capture, not by intent**: The OVN wiki is precise — "The conditions for it to exist is to have extremely high costs of control, making it virtually uncontrollable by any entity, not even by nation states." This is a *technical* condition, not a legal or normative one. The NDO's `PropertyRegime::Nondominium` variant should encode a *validation constraint*: a resource declared as Nondominium must have governance rules that do not permit ownership assignment or transfer, and the system should reject GovernanceRule updates that attempt to add such rules.

#### 4.4.4 Property Regime Determines Possible Economic Models

The OVN wiki makes a point that is central to the NDO's relationship with Unyt: "once the property regime is fixed, only a limited number of motivation and incentive models are possible on top of that (call it economic model or business model). In turn, this determines people's values and behaviour within that organization."

This has direct architectural implications:

| PropertyRegime | Allowable economic models | Unyt implications |
|---|---|---|
| `Private` | Full market (buy/sell/rent/lend); individual benefit capture | Smart Agreement can specify price, rental, usage fees |
| `Commons` | Attribution-based; copyleft/open source | Smart Agreement triggers on share events, not sale events |
| `Pool` | Scheduling-based access; contribution-weighted priority; insurance/maintenance pools | Smart Agreement triggers on custody transfer; maintenance settlement. Post-MVP: access eligibility should also gate on `AffiliationState` ≥ `ActiveAffiliate` (TODO G2) |
| `CommonPool` | Quota-based; depletion taxes; collective replenishment | Smart Agreement governs extraction rate |
| `Nondominium` | Contribution-based; access is earned but not purchased; no alienation | Smart Agreement can distribute benefits of use but cannot assign ownership. Post-MVP: high-stakes access should gate on `AffiliationState` ≥ `ActiveAffiliate` or `CoreAffiliate` (TODO G2) |

The `PropertyRegime` on `NondominiumIdentity` should therefore be a *hard constraint* on which GovernanceRules and Unyt Smart Agreements are valid for that resource. The governance zome should enforce this: an attempt to attach a `sale` Smart Agreement to a `Nondominium` resource must be rejected.

#### 4.4.5 Property and Distribution — Transfer Rights

The OVN wiki observes: "Distribution is a change in status, a transfer of rights and obligations associated with that thing... Distribution is not possible without the notion of property."

In the NDO, different property regimes enable different types of transfers:

| Regime | Ownership transfer | Custody transfer | Use rights transfer | Benefit transfer |
|---|---|---|---|---|
| `Private` | ✅ Full alienation | ✅ | ✅ | ✅ |
| `Commons` | ❌ | ✅ (stewardship) | ✅ | ✅ (attribution) |
| `Pool` | ❌ (stays in pool) | ✅ (temporary custody) | ✅ (scheduled) | ✅ |
| `CommonPool` | ❌ | ✅ (extraction) | ✅ (quota-limited) | ✅ |
| `Nondominium` | ❌ (architecturally impossible) | ✅ | ✅ | ✅ |

The current NDO models custody transfer well (through `EconomicResource.custodian` and `TransferCustody` VfAction). It does not model ownership transfer, benefit transfer, or the regime-specific restrictions on which transfers are valid. The governance zome should enforce regime-appropriate transfer restrictions.

#### 4.4.6 OVN Analysis and NDO `PropertyRegime` Reconciliation

The OVN wiki identifies eight property regime types (§4.4.3 table). The current NDO plan (`Commons`, `Individual`, `Collective`, `Mixed`) is too narrow. The full OVN taxonomy is preserved in §4.4.3 as an analytical reference. The NDO forward map (§6.3) selects the six regimes that are architecturally relevant to the generic NDO:

```rust
pub enum PropertyRegime {
    Private,        // Full rights bundle; individual ownership
    Commons,        // Non-rivalrous shared resource; governance via licensing/attribution
    Collective,     // Cooperative/collective ownership
    Pool,           // Pool of shareables: rivalrous shared resources; custody/scheduling/maintenance
    CommonPool,     // Rivalrous consumable resource; governance via quota/depletion rules
    Nondominium,    // Uncapturable by design; contribution-based access; no alienation permitted
}
```

`Mixed` is removed — mixed regimes should be expressed as compound governance rules on top of a primary regime, not as a separate enum variant (which conveys no information about what the mix contains). `Individual` is renamed to `Private` to align with OVN property vocabulary. `Condominium` and `TollGoods` are omitted from the initial generic NDO — they can be added as future variants if communities require them.

**Complexity economics note**: The OVN wiki states: "Property regime is not merely a legal classification, it shapes the entire economic topology of flows. A resource under the Nondominium regime cannot be enclosed, which is a stronger guarantee than a Commons resource (which can theoretically be privatised through governance capture)." This is precisely the Bar-Yam complexity matching principle applied to governance: the information requirements for different property regimes are vastly different. A `Private` resource can be governed by simple bilateral contracts. A `Nondominium` resource requires cryptographic enforcement of uncapturability — human agreements are insufficient. The NDO's Holochain DHT architecture provides the technical foundation for Nondominium governance at scale; encoding the regime explicitly in the data model closes the loop between the technical guarantee and the social norm.

### 4.5 Accessibility, Availability, and Rivalry

The OVN wiki provides three orthogonal classification axes that NDO does not yet model:

**Accessibility** (who can access the resource):
- Free: public, no restrictions
- Protected/regulated: requires credentials — skill, role, reputation, or payment. In the NDO, "credentialed" access encompasses:
  - **Role-based**: existing `RoleType` membership, enforced by GovernanceRule `enforced_by` field
  - **AffiliationState-based** (post-MVP, TODO G2): derived from participation history via `AffiliationRecord` entries — e.g. `ActiveAffiliate` or `CoreAffiliate` tier. Not declared but computed; harder to game than assigned roles
  - **PortableCredential-based** (post-MVP, TODO G8): cross-network verifiable claims from allied networks, enabling recognition of contribution history that happened elsewhere
  - **ZKP-based** (post-MVP, TODO G7): privacy-preserving proofs of the form "I have ≥ N claims of type T" without revealing raw scores, counterparties, or timestamps — prerequisite for governance access without surveillance
  - **FlowstaIdentity-based** (post-MVP): cross-app identity via `FlowstaIdentity` CapabilitySlot on the agent's `Person` entry hash pointing to a dual-signed `IsSamePersonEntry` (Vault agent linking). Tier 1 (REQ-NDO-CS-12/CS-13) is a voluntary trust signal; Tier 2 (REQ-NDO-CS-14/CS-15) lets governance require a valid link for high-value or high-risk resource access — sybil resistance and cross-network accountability without revealing private PPR data
- Formally restricted: requires formal approval procedures

This maps to governance rule patterns in NDO but is not a first-class property. Encoding it explicitly would allow the system to set appropriate governance defaults and UI affordances automatically.

**Availability** (how much is there):
- Abundant: near-zero marginal reproduction cost (ideas, designs, documents)
- Scarce: high marginal reproduction cost (physical tools, equipment, materials)

And the related distinction:
- Rivalrous: access by one agent excludes others
- Non-rivalrous: multiple agents can access simultaneously without exclusion

**This is the most critical missing dimension in the NDO plan.** Rivalry determines optimal governance strategy more directly than any other property. Non-rivalrous resources should default to open access (information wants to be free); rivalrous resources require access scheduling, usage tracking, and maintenance governance. The generic NDO should model rivalry explicitly as a first-class `EconomicResource` property.

**Complexity economics note**: Benkler's entire argument for commons-based peer production rests on the distinction between rivalrous and non-rivalrous resources. A P2P governance system that does not formally model this distinction will produce governance rules that are either too restrictive for non-rival resources (inefficient) or too permissive for rival resources (destructive).

### 4.6 Transferability

| OVN transferability | Description | NDO coverage |
|---|---|---|
| Transferable | Can change ownership (currency, consumables) | Custody transfer in EconomicResource; ownership transfer in EconomicEvents |
| Non-transferable | Cannot be sold or given (social capital, reputation) | PPRs are non-transferable by design (cryptographic linkage to agent key) |
| Shareable | Commons / pool items — shared without ownership transfer | GovernanceRules can encode this but it is not a first-class classification |

The OVN wiki makes an important observation: allowing non-transferable assets (like reputation) to be transferred would destroy their value — "allowing this would in fact destroy the reputation system, as its meaning would be called into question." This is why Nondominium PPRs are cryptographically linked to the generating agent's key pair and cannot be assigned to another agent.

Flowsta's `FlowstaIdentity` CapabilitySlot introduces an important nuance: PPR reputation becomes *attributable* across apps (via a verified W3C DID) without becoming *transferable*. The DID is a stable cross-app reference key — other Flowsta-linked apps can verify that a given reputation history belongs to a specific cross-app identity — but the underlying `PrivateParticipationClaim` entries remain cryptographically bound to the generating agent's key pair on this DHT. Attribution portability and claim transferability are orthogonal: the former enables cross-network trust signals; the latter remains forbidden to preserve the integrity of the reputation system.

**Complexity economics note**: Transferability determines what kind of market or exchange system applies to a resource. Non-transferable resources require non-market coordination mechanisms (gifting, contribution tracking, reputation systems). The NDO already enforces non-transferability of PPRs at the cryptographic level. Extending this concept to other resources (should a method always be shareable? should equipment ever be non-transferable? these are governance questions) requires transferability to be a formal property.

### 4.7 Scope

The OVN wiki classifies resources by the domain they can affect:

| Scope | Description | Examples |
|---|---|---|
| Project / Venture | Benefit mostly the specific project team | A bespoke chemical solution for a single R&D project |
| Network | Benefit the entire organisational network | A shared lab space, the network website |
| Public | Commons accessible to the entire world | Open source designs, documented methods |

This dimension is completely absent from the current NDO data model. Its importance for the generic NDO is significant: visibility, discovery, and governance rules for a network-scoped resource should differ from those of a public resource. A public design file should be discoverable globally; a project-scoped resource should only be visible to project participants.

### 4.8 Source

The OVN wiki tracks resource provenance:

| Source | Description |
|---|---|
| OVN | Created within the network; part of commons/nondominium/pool |
| Partners | Contributed by allied networks with possible use restrictions |
| Purchased | Acquired through market exchange; property of the network |

In the NDO, this is modelled as a `ResourceSource` enum on `NondominiumIdentity` (Layer 0, see §6.1). It matters for governance (a purchased resource may still be owned by its buyer and not be a true nondominium) and for attribution (OVN-sourced resources carry contribution history; purchased resources do not).

### 4.9 Reliability

The OVN wiki identifies reliability as a property of **material usables** — distinct from, but analogous to, agent reputation:

> "Material resources, mostly usables, should have a parameter of reliability, which is related to the risk associated with their use... Is that piece of equipment going to break during the fabrication process? Is that sensor going to present accurate data?"

This is currently absent from the NDO model. A resource can have high-quality custodians (good PPR scores) but be itself unreliable (it breaks frequently, produces defective outputs, or presents safety risks). Resource reliability should be:
- Accumulated from economic events: repair events, usage incidents, quality validation failures
- Independent of custodian reputation: a reliable agent can custody an unreliable tool
- A governance input: unreliable resources may require pre-access inspection, reduced access frequency, or mandatory insurance

**Complexity economics note**: In information theory, reliability is a measure of signal-to-noise ratio. A governance system that cannot distinguish reliable from unreliable resources is processing high-noise information — it cannot direct maintenance effort, access restrictions, or replacement decisions to where they are most needed.

### 4.10 Intangibles as Resources

The OVN wiki provides the most extensive taxonomy in the entire resource ontology for intangibles, identifying:

- Brand (network and deliverable identity)
- Social capital (opening markets, driving campaigns)
- Group dynamics (energising and animating a community)
- Member/customer loyalty
- Synergy (linking ventures in value systems)
- Internal structure and relationships (weaving agent networks)
- Incentive systems (designing and embedding incentives)
- Competencies (individual skill, group know-how)
- Cultural values (maintaining and evolving culture)
- Governance resources (decision-making knowledge and mechanisms)
- Trust (trust by members in the network, in its metrics, in its fairness)
- Sense of community

These cannot be traded, transferred, or precisely measured. But they are:
- Outputs of participation (being part of a well-functioning community increases social capital)
- Inputs to production (communities with high trust and good governance outperform those without)
- Destroyable by bad governance (surveillance capitalism, governance capture, and unfair systems all erode intangibles)

For the generic NDO, the implication is: **do not model intangible resources as DHT entries**. Instead, design the system's governance and participation architecture so that positive interactions *generate* intangibles as emergent properties. The PPR system, the reputation-credit loop, the transparent governance architecture, the permissionless access — these are design choices that cultivate social capital, trust, and community sense without attempting to track them as assets. The NDO should be consciously designed as an intangible resource *producer*, not just a material resource *tracker*.

---

## 5. Gap Analysis

### 5.1 Mapped — OVN coverage implemented or planned in NDO

| OVN concept | NDO implementation | Status |
|---|---|---|
| Resource Type (specification/instance distinction) | `ResourceSpecification` + `EconomicResource` | ✅ Implemented |
| Property regimes (Private, Commons, Collective, Pool, CommonPool, Nondominium) | `PropertyRegime` enum | 🔄 Planned (`ndo_prima_materia.md`) |
| Value chain maturity stages | `LifecycleStage` enum (10 stages) | 🔄 Planned (`ndo_prima_materia.md`) |
| Embedded governance rules | `GovernanceRule` entries linked to `ResourceSpecification` | ✅ Implemented (weakly typed) |
| Physical resource custody | `EconomicResource.custodian`, custody transfer | ✅ Implemented (single custodian, assumed individual agent — gap: collective agent custodianship not supported; TODO G1) |
| Multi-custodian / shared custody | Many-to-many flows | 🔄 Planned |
| Capture resistance | DHT architecture + Holochain's append-only model | ✅ Architectural property |
| Digital resources (composable, integrity) | Digital Resource Integrity | 🔄 Planned |
| Versioning / DAG evolution | Versioning DAG | 🔄 Planned |
| Contribution tracking | PPR system, Layer 2 EconomicEvents | ✅ Implemented |
| OVN license / contribution propagation | Versioning + PPR upstream propagation | 🔄 Planned |
| Economic settlement | Unyt integration | 🔄 Planned (post-MVP) |
| Cross-app identity / DID | `FlowstaIdentity` CapabilitySlot via Flowsta agent linking (`ndo_prima_materia.md` Section 6.7) | 🔄 Planned (post-MVP) |
| Agent key recovery | Flowsta Vault BIP39 recovery, auto-backup, CAL-compliant data export | 🔄 Planned (post-MVP) |

### 5.2 Partial — concepts present in OVN and partially covered in NDO

| OVN concept | NDO partial coverage | Gap |
|---|---|---|
| Resource nature (physical/digital/media) | `ResourceNature` enum (Digital, Physical, Hybrid) | Missing `Mental` analog; media channel vs. media item distinction absent |
| Governance of access (role-based) | Role-based `enforced_by` in GovernanceRule | Rule types are untyped strings; no first-class accessibility classification |
| Material/Immaterial behavior | Physical vs. Digital nature | No formal rivalrous/non-rivalrous property |
| Method as resource | Covered as `Digital` resources | Not explicitly modelled; no template/recipe entry type |
| Property regime: Nondominium vs. Commons | `Nondominium` now a distinct variant in `PropertyRegime` (§6.3) | Resolved — `Nondominium` has no-enclosure guarantees distinct from `Commons` |
| Transferability | Custody transfer + PPR non-transferability | No formal `transferability` classification on resources |
| Reliability | Not modelled at resource level | PPR tracks agent quality, not resource condition/reliability |

### 5.3 Missing — OVN concepts not yet planned in NDO

These represent the forward agenda for the generic NDO design:

| OVN concept | Gap description | Proposed resolution |
|---|---|---|
| **Rivalrous / Non-rivalrous** | Fundamental governance fork not modelled; all resources treated equivalently | Add `rivalry: Rivalrous \| NonRivalrous` field to `NondominiumIdentity` (Layer 0, see §6.1); derive governance defaults from this property |
| **Resource scope** (Project / Network / Public) | Visibility and governance should differ by scope; not modelled | Add `ResourceScope` enum to `NondominiumIdentity`; drive discovery anchor selection from scope |
| **Resource source** (OVN / Partner / Purchased) | Provenance matters for attribution and governance | Add `ResourceSource` enum to `NondominiumIdentity` |
| **Space as resource type** | Physical spaces need scheduling, booking, temporal availability | Add `Space` to `ResourceNature`; design temporal availability governance patterns |
| **Method / Recipe as resource type** | Process documentation is a resource with its own governance | Add `Method` to `ResourceNature`; link methods to the physical resources they govern |
| **Currency as resource type** | Currencies (including Unyt Base Units) are resources in the OVN model | Add `Currency` to `ResourceNature`; Unyt Alliance represents a currency resource |
| **Resource reliability** | A tool's track record (failure rate, repair history) is independent of custodian reputation | Add `reliability_score: Option<f64>` derived from EconomicEvents (repair, incident PPRs); update on each Repair/Maintenance event |
| **Accessibility classification** | Free / Protected / Restricted as a first-class property | Add `Accessibility` enum; governance defaults derived from this |
| **Transferability classification** | Formal encoding of transferable / non-transferable / shareable | Add `Transferability` enum; informs custody transfer governance |
| **Nondominium as distinct PropertyRegime** | Nondominium (no-enclosure guarantee) ≠ Commons (shared stewardship) | Resolved in §6.3 — `Nondominium` variant added to `PropertyRegime` with validation that no governance rule can assert or transfer ownership |
| **Affiliation-gated resource access** | Role membership alone is insufficient for high-stakes access to rivalrous resources — participation quality (affiliation tier) should also gate access. `GovernanceRule` currently evaluates only role membership, not derived `AffiliationState` | Extend `GovernanceRule.rule_data` schema with `min_affiliation` field (e.g. `"min_affiliation": "ActiveAffiliate"`); extend governance operator `evaluate_transition` to cross-zome query `AffiliationState` from `zome_person` (refs G2, REQ-AGENT-03, REQ-AGENT-05) |
| **Cross-app identity verification** | No mechanism for an agent to prove they are the same person across multiple Holochain apps or external systems. PPR reputation is local to this DHT; no cross-network trust signal | Add `FlowstaIdentity` CapabilitySlot on `Person` hash (`ndo_prima_materia.md` Section 6.7, REQ-NDO-CS-12). Governance rules can require Tier 2–validated Flowsta linking for high-value access (REQ-NDO-CS-14, Flowsta Phase 3). Flowsta DID provides the cross-app identity anchor for portable credentials (REQ-NDO-AGENT-08) |
| **Collective agent custodianship** | `EconomicResource.custodian` is currently `AgentPubKey`, assuming individual agent. Collective, Project, Network, and Bot agents (G1) should also be valid custodians | Replace `AgentPubKey` with `AgentContext` (union type) across `EconomicResource.custodian`, `TransitionContext.target_custodian`, and `NondominiumIdentity.initiator` (ref G1, REQ-AGENT-02) |
| **Intangibles** | Social capital, trust, competencies — not tracked but should be preserved | Design principle: NDO governance architecture should cultivate intangibles as emergent properties, not track them as entries |

---

## 6. Forward Map: Generic NDO Resource Ontology

Based on the gap analysis, the generic NDO should extend its resource classification to the following model. This is a design proposal, not a requirements document — it will be refined as the generic NDO project begins.

### 6.1 Extended `NondominiumIdentity` (Layer 0)

```rust
pub struct NondominiumIdentity {
    // Existing fields
    pub name: String,
    pub description: Option<String>,
    pub initiator: AgentPubKey,
    pub lifecycle_stage: LifecycleStage,
    pub created_at: Timestamp,

    // Classification fields (drive governance defaults)
    pub property_regime: PropertyRegime,  // existing
    pub resource_nature: ResourceNature,  // extended
    pub rivalry: Rivalry,                 // NEW
    pub scope: ResourceScope,             // NEW
    pub source: ResourceSource,           // NEW
    pub accessibility: Accessibility,     // NEW
    pub transferability: Transferability, // NEW
}
```

### 6.2 Extended `ResourceNature`

```rust
pub enum ResourceNature {
    Physical,   // Material objects: tools, equipment, consumables
    Digital,    // Software, data, design files, documents
    Hybrid,     // Digital twin of a physical resource
    Space,      // Physical or virtual locations with temporal availability
    Method,     // Documented process, recipe, protocol
    Currency,   // Symbolic value exchange system (including Unyt Alliance Base Units)
    // Note: Mental resources are represented by Ideation-stage NDOs, not a separate type
}
```

### 6.3 Extended `PropertyRegime`

```rust
pub enum PropertyRegime {
    Private,        // Full rights bundle; individual ownership (renamed from Individual per OVN vocabulary)
    Commons,        // Non-rivalrous shared resource; governance via licensing/attribution
    Collective,     // Cooperative/collective ownership
    Pool,           // Pool of shareables: rivalrous shared resources; custody/scheduling/maintenance
    CommonPool,     // Rivalrous consumable resource; governance via quota/depletion rules
    Nondominium,    // Uncapturable by design; contribution-based access; no alienation permitted
}
```

### 6.4 New Classification Enums

```rust
pub enum Rivalry {
    Rivalrous,    // Use by one agent excludes others; access governance required
    NonRivalrous, // Multiple agents can access simultaneously; open access preferred
}

pub enum ResourceScope {
    Project,  // Benefits mostly the specific project/venture team
    Network,  // Benefits the entire organisational network
    Public,   // Commons accessible to the entire world
}

pub enum ResourceSource {
    Network,   // Created within the network (OVN/nondominium)
    Partner,   // Contributed by allied networks (may have use restrictions)
    Purchased, // Acquired through market exchange
    Donated,   // Gifted with conditions
}

pub enum Accessibility {
    Free,       // Open access, no restrictions
    Credentialed, // Requires role, reputation, or demonstrated skill
    Gated,      // Requires formal application and approval
}

pub enum Transferability {
    Transferable,    // Ownership can change (exchange, gifting)
    NonTransferable, // Cannot be exchanged or gifted (reputation, social capital)
    Shareable,       // Pool/commons items: shared without ownership transfer
}
```

### 6.5 Resource Reliability (Layer 2 derived property)

Resource reliability should be derived from Layer 2 EconomicEvents rather than stored as a static field — it is an emergent property of the resource's history, not a declared attribute:

```
reliability_score ← derived from:
  - Repair event frequency (more repairs = lower reliability)
  - Maintenance completion rate (scheduled vs. emergency maintenance ratio)
  - Incident reports (damage, failure, safety events)
  - Quality validation results (passed vs. failed inspections)
```

This score accumulates over time and is queryable from the governance zome alongside the custodian's ReputationSummary. A resource reliability score and a custodian reputation score together give a complete picture of a resource interaction's risk profile.

### 6.6 Governance Defaults from Classification

The power of explicit resource classification is that it enables automatic governance defaults. The generic NDO should define a `GovernanceDefaultsEngine` that derives appropriate starting governance rule templates from the classification:

| Nature | Rivalry | Property | Governance defaults |
|---|---|---|---|
| Digital | NonRivalrous | Commons | Open access, copy-left attribution, versioning required |
| Digital | NonRivalrous | Nondominium | Open access, attribution, no enclosure possible |
| Physical | Rivalrous | Pool | Credentialed access, custody transfer required, maintenance schedule |
| Physical | Rivalrous | Nondominium | Permissionless access under rules, peer validation, PPR required |
| Space | Rivalrous | Pool | Booking/scheduling, temporal access governance |
| Method | NonRivalrous | Commons | Open access, execution tracking, version-linked |
| Currency | NonRivalrous | Network | Defined by Unyt Alliance configuration |

These defaults are starting points — communities override them through the GovernanceRule entries on Layer 1. But having well-considered defaults dramatically reduces the governance design burden for community members setting up new resources.

> **TODO (G2, G7, G8 — post-MVP)**: The `Credentialed access` defaults shown for `Pool` (Physical/Rivalrous/Pool) and `Nondominium` rows above will eventually support three additional credential dimensions beyond role membership:
> - `AffiliationState`-based gating (G2): the governance operator queries `zome_person` for the requesting agent's derived affiliation tier and compares it to the `min_affiliation` condition in `GovernanceRule.rule_data`
> - `PortableCredential` acceptance (G8): governance rules can declare which external credential types they accept, enabling cross-network access without re-joining
> - ZKP-compatible evaluation (G7): reputation proofs are verified without revealing raw PPR scores or counterparties
> - **`FlowstaIdentity` Tier 1 (Flowsta Phase 1; REQ-NDO-CS-12, REQ-NDO-CS-13)**: Agents can attach a `FlowstaIdentity` slot on their `Person` hash to a valid `IsSamePersonEntry` (Vault dual-signed attestation), making a DID discoverable and enabling cross-app **attribution** of reputation — without `AffiliationRecord`, `PortableCredential`, or ZKP infrastructure. The governance zome does **not** enforce Tier 1 (`ndo_prima_materia.md` Section 6.7).
> - **`FlowstaIdentity` Tier 2 (Flowsta Phase 3; REQ-NDO-CS-14, REQ-NDO-CS-15)**: Governance rules can **require** a valid Flowsta link (per REQ-NDO-CS-15 checks) for credentialed access to resources that need sybil resistance or cross-network accountability — same phase and pattern as Unyt governance-operator enforcement (`ndo_prima_materia.md` Section 6.7).
>
> The AffiliationState, PortableCredential, and ZKP dimensions above require the `AffiliationRecord` entry type (REQ-AGENT-05), cross-zome `AffiliationState` queries, and/or ZKP proof infrastructure — all post-MVP. **Flowsta Tier 1** is the exception among trust signals: voluntary linking can ship in Flowsta Phase 1 without those dependencies. **Flowsta Tier 2** enforcement requires Flowsta Phase 3 (`zome_gouvernance` changes), not Phase 1.

---

## 7. Complexity Economics Justification: Why Each Classification Matters

**Rivalry** matters because it determines the fundamental economic logic. Non-rivalrous resources exhibit positive sum dynamics — sharing them creates more value, never less. Rivalrous resources exhibit zero-sum dynamics in the short term — access by one agent genuinely prevents access by another. Conflating these in a governance system produces either over-restriction (damaging information flows) or under-restriction (depleting physical commons). No other classification has more direct governance consequences.

**Scope** matters because it determines information propagation. Benkler's analysis of networked information environments shows that scope determines who needs to know about a resource for it to produce value. A method that benefits the entire world should propagate globally; a specialised tool scoped to one project should not create noise in the global discovery layer. Scope-driven discovery anchors reduce the information overhead of the global DHT.

**Property regime** matters because it encodes the relationship between the resource and its community. A Nondominium resource cannot be captured, enclosed, or removed from the commons — this is a hard guarantee built into its governance validation rules. A Commons resource can be governed into restriction by its stewards. Individual-owned resources can be withheld. The economic consequences of each regime are profound and should be permanent attributes of the resource's identity, not mutable governance settings.

**Reliability** matters because it is information. In a P2P system with no central quality control, agents making decisions about which resources to access, which tools to borrow, which methods to follow, need reliable information about the track record of those resources. A resource with a high failure rate imposes hidden costs on the network — missed deadlines, wasted materials, unsafe working conditions. Making reliability visible and queryable converts hidden costs into explicit governance inputs.

**Resource nature and method resources** matter because the governance architecture for a documented protocol is fundamentally different from the governance architecture for a physical tool. A method (recipe, process, protocol) is non-rivalrous, can be forked and adapted, should be versioned and attributed, and its quality affects every physical process it governs. Modelling methods as first-class resources enables the network to track method provenance, quality, and evolution — and to connect method quality to the physical resource outcomes produced using those methods.

**Intangibles** matter negatively — as a design constraint. The OVN wiki's extensive treatment of intangibles is a warning: governance systems that ignore social capital, trust, and community sense will inadvertently destroy them through surveillance, commodification, or capture. The NDO's design choices (peer validation rather than central authority, private PPRs rather than public scoring, permissionless access rather than gatekeeping) are intangible-preserving choices. They should be recognised as such, so that future design decisions are evaluated against the same standard.

---

*This is a living document. As the generic NDO project begins, the gap analysis in Section 5.3 should be converted into formal requirements. The forward map in Section 6 should be reviewed against the actual NDO project scope and prioritised accordingly. The OVN wiki at [ovn.world](https://ovn.world) remains the authoritative reference for community-validated resource ontology concepts.*
