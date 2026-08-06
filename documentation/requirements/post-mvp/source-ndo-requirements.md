# Source-NDO Requirements (Post-MVP)

**Status**: Post-MVP Requirements  
**Created**: 2026-07-01  
**Relates to**: [`ndo_prima_materia.md`](../ndo_prima_materia.md), [`resources.md`](../resources.md), [`governance.md`](../governance.md), [`requirements.md`](../requirements.md)  
**Academic grounding**: [`source-ndo-paper.md`](source-ndo-paper.md) (full theoretical justification, river case study, Occam's razor proof, complexity economics analysis)  
**Sibling NDO types**: [`project-type-ndo-specifications.md`](project-type-ndo-specifications.md)

---

## 1. Problem Statement and Ontological Position

### 1.1 The missing primitive

The REA/ValueFlows economic ontology operates with two primitives: **Agent** (entities that can act, commit, deliberate, and bear responsibility) and **Resource** (appropriable, inventoriable outputs used in economic processes). A river, watershed, forest, or fishery fits neither category honestly.

If modelled as an `EconomicResource`, the system requires a `primaryAccountable` owner — the exact inverse of the `Nondominium` property regime. If modelled as an `Agent`, it is attributed intention it does not possess; and if avoided entirely, abstraction events appear as `raise` (resource-from-nowhere) while depletion disappears from the ledger entirely.

The academic paper (`source-ndo-paper.md`) demonstrates this with Occam's razor: without the `Source` primitive, a faithful representation of a watershed under `Nondominium` governance requires **three active fictions** (false ownership, phantom `raise`, resource/agent dual-typing for pollution receivers) and **four inexpressible relations** (source hierarchy, cross-source coupling, black-box epistemics, governance reflexivity). Adding one primitive removes all seven.

**`Source` is therefore a third ontological primitive**: neither resource nor person, neither property nor agent, but a generative, non-ownable, partially unknowable system that yields resources, receives ecological effects, conditions future possibilities, and accumulates the historical evidence required for its own stewardship.

### 1.2 Ostrom mapping

The Source/Resource distinction has a direct lineage in Elinor Ostrom's Social-Ecological Systems framework:

| Ostrom / SES concept | Source-NDO equivalent |
|---|---|
| Resource system (e.g. fishery, watershed) | **Source** |
| Resource unit (e.g. fish, gallons of water) | **Resource** (`EconomicResource`) |
| Governance system | Object-attached `GovernanceRule` entries (governance-as-operator) |
| Users / actors | **Agents** |
| Action situation | Economic events, commitments, claims |

The Source-NDO operationalises Ostrom's analytical categories as machine-readable accounting and governance objects — the resource system can receive and originate economic events and carry adaptive governance rules, not merely be described analytically.

### 1.3 Scope

A **Source-NDO** is a Nondominium Object whose Layer 0 `NondominiumIdentity` represents a **generative ecological system** (watershed, river, forest, fishery, wetland, atmosphere, soil system) or a **generative knowledge commons** (open-source design repository, scientific knowledge base, language corpus — sources that produce non-rival resources). See §2.3 for the full type taxonomy.

Source-NDO is a **post-MVP** extension. It does not require breaking changes to existing entry types; it adds new typed Layer 0 attributes, a new `vf:Source` role for ValueFlows events, and an adaptive governance pattern built on the existing governance-as-operator architecture.

---

## 2. Conceptual Model

### 2.1 Three ontological categories

```
AGENT          — acts, intends, commits, bears responsibility
               — individuals, organisations, networks, bots

RESOURCE       — appropriable, inventoriable output
               — water in a tank, fish landed, timber cut, a tool in custody

SOURCE         — generative system that yields Resources, receives effects,
               — conditions future possibilities, regenerates or degrades
               — not owned, not an agent, not merely a stock behind a flow
```

A Source **yields** Resources (a river yields cubic metres of water when abstracted). A Source **receives** ecological effects (a river receives heavy-metal discharge). A Source **conditions** other Sources (a forest conditions river infiltration and flow stability). These are distinct event types, all of which become first-class economic events once the `Source` primitive is available as a flow endpoint.

### 2.2 Source as NDO

In the Nondominium architecture, a Source-NDO is a `NondominiumIdentity` entry with:
- `property_regime: Nondominium` (or `CommonPool` for rivalrous consumable ecological stocks)
- `resource_nature: Physical` or `Information` (see §2.3)
- A set of **Source-specific Layer 0 extension attributes** (§4.1)
- **No `primaryAccountable`** — stewardship relations use `stewardedBy` links to Agent(s) with a stewardship role, never ownership
- **Governance-as-adaptive-operator** (§5): the governance loop is cybernetic rather than rule-evaluation only

The Layer 0 identity hash becomes the stable anchor for the source's entire economic history — all events that extract from it, discharge into it, or restore it are linked against this hash.

### 2.3 Source type taxonomy

| Source type | Examples | ResourceNature equivalent | Notes |
|---|---|---|---|
| **Ecological — hydrological** | Watershed, river, groundwater, wetland | `Physical` | Rivalrous; extraction and pollution compete |
| **Ecological — biological** | Forest, fishery, soil system, biodiversity | `Physical` | Some rivalrous (fishery); some regenerative |
| **Ecological — atmospheric** | Atmosphere, climate system | `Physical` | Assimilation capacity rivalrous |
| **Knowledge commons** | Open-source design repository, scientific commons, language corpus | `Information` | Non-rivalrous; yields knowledge resources |
| **Social commons** | Community, network, trust fabric | `Information` | Non-rivalrous; yields social capital and governance capacity |

The existing `ResourceNature` enum covers Source types adequately for Layer 0 classification; a separate `SourceType` sub-classification is recommended for Layer 1 (§4.2).

### 2.4 Source hierarchy and coupling

Sources can be organised hierarchically and can condition each other. These are **first-class relations** in the Source-NDO model:

```
Source → yields → Source  (generative parenthood: watershed yields river)
Source → conditions → Source  (coupling: forest conditions river flow and resilience)
Source → yields → Resource  (production: river yields gallons of water when abstracted)
```

Example:

```
WATERSHED  (complex system — black box)
  ├── RIVER        (sub-source)  ─── yields ──► water m³ (EconomicResource)
  ├── FOREST       (sub-source)  ─── yields ──► timber (EconomicResource)
  │   └── conditions RIVER (improved infiltration ↑ river resilience)
  ├── FAUNA        (sub-source)  ─── yields ──► fish (EconomicResource)
  └── FLORA        (sub-source)  ─── yields ──► herbs (EconomicResource)
```

The watershed is treated as a **black box**: its full interior is not modelled. Governance operates on observable boundary events, not on a complete internal description. This is the black-box principle (Ashby, 1956; Snowden & Boone, 2007): in complex domains, govern observable periphery and adapt; do not claim to model the interior.

---

## 3. ValueFlows Extension: `vf:Source`

### 3.1 The extension

Source-NDO proposes adding `vf:Source` as a typed role for flow endpoints in ValueFlows economic events, alongside `Agent` and `EconomicResource`. The single new affordance: **flows may originate from and terminate in Sources, not only in Agents or Resources**.

### 3.2 Event types using Sources as flow endpoints

**Extraction (Source as provider):**
```
EconomicEvent {
  action: extract,
  provider: River(Source),
  receiver: AgriCoop(Agent),
  quantity: 10000 m³ water
}
→ decrements River.currentStock; depletion is visible
```

**Non-consumptive use (Source as provider of flux, not stock):**
```
EconomicEvent {
  action: use,
  provider: River(Source),
  receiver: HydroDam(Agent),
  effect: River.regimeState  (altered timing/sediment, not volume)
}
```

**Pollution / loading (Source as receiver):**
```
EconomicEvent {
  action: produce,
  provider: MiningCo(Agent),
  receiver: River(Source),
  quantity: 50 kg heavy metals
}
→ debits River.assimilationCapacity; pollution is visible
```

**Regeneration (Agent raises a Source):**
```
EconomicEvent {
  action: raise,
  target: Forest(Source),
  provider: RegenCollective(Agent),
  quantity: 1000 trees
}
→ Forest.conditions(River): improved infiltration raises River.fluxRate and resilience
```

### 3.3 What the extension removes

Adding `vf:Source` eliminates:

| Fiction removed | Description |
|---|---|
| **False ownership claim** | No `primaryAccountable` needed; no fictional steward-as-owner |
| **Resource-from-nowhere `raise`** | Extraction from a Source is debited against it; depletion is visible |
| **Resource/Agent dual-typing** | Sources can receive pollution events without being attributed agency |
| **Inexpressible source hierarchy** | `Source yields Source` is a native edge |
| **Inexpressible cross-source coupling** | `Source conditions Source` is a native edge |
| **Missing black-box epistemics** | `complexInterior: true` and `regimeState` encode partial knowability |
| **Missing governance reflexivity** | Events accumulate on the Source → rules adapt → future events are conditioned |

---

## 4. Data Model

### 4.1 Source-specific Layer 0 attributes (extension to `NondominiumIdentity`)

These attributes extend the existing `NondominiumIdentity` for Source-NDOs. They may be implemented as a separate `SourceProfile` entry linked to Layer 0 (to avoid breaking changes) or as additional optional fields on `NondominiumIdentity` guarded by `resource_nature`.

```rust
pub struct SourceProfile {
    pub ndo_identity_hash: ActionHash,    // links to NondominiumIdentity

    // Ecological condition state (updated by governance events)
    pub current_stock: Option<f64>,         // current extractable quantity
    pub flux_rate: Option<f64>,             // natural replenishment rate per period
    pub assimilation_capacity: Option<f64>, // pollution absorption capacity remaining
    pub regime_state: SourceRegimeState,    // ecological regime classification
    pub resilience: Option<f64>,            // 0.0–1.0 resilience index
    pub tipping_threshold: Option<f64>,     // stock/flux ratio below which regime shift is likely

    // Complexity economics dimensions
    pub adaptive_capacity: Option<f64>,     // ability to discover new viable configurations
    pub generative_capacity: Option<f64>,   // capacity to produce future resources and opportunities
    pub dependency_index: Option<f64>,      // proportion of network agents dependent on this source

    // Coupling relations (links, not inline fields)
    pub source_type: SourceType,            // Hydrological | Biological | Atmospheric | Knowledge | Social
    pub complex_interior: bool,             // always true for ecological sources; governs black-box stance

    // Stewardship (replaces primaryAccountable)
    pub stewarded_by: Vec<AgentPubKey>,     // agents with stewardship obligations (not ownership)

    pub created_at: Timestamp,
    pub last_condition_update: Timestamp,
}

pub enum SourceRegimeState {
    Pristine,        // minimal anthropogenic impact; high resilience
    Stable,          // functioning within normal variability; monitoring adequate
    Stressed,        // measurable degradation; precautionary governance active
    Degraded,        // significant loss of function; restoration required
    Critical,        // near tipping threshold; emergency governance possible
    Transformed,     // post-regime-shift; new stable state (may be lower function)
}

pub enum SourceType {
    Hydrological,    // watershed, river, groundwater, wetland
    Biological,      // forest, fishery, soil system, biodiversity
    Atmospheric,     // atmosphere, climate system
    KnowledgeCommons, // open-source repository, scientific commons
    SocialCommons,   // community, trust fabric
}
```

### 4.2 Ecological value vector (Layer 1 — informative)

The ecological value of a Source is multidimensional and cannot be collapsed into one metric (aligned with IPBES Values Assessment and OVN value theory). At Layer 1, the `SourceSpecification` should support expressing:

| Dimension | Description | Example metrics |
|---|---|---|
| **Sustenance** | Ongoing provision of economic resources | Water availability, biomass, fish population, pollination rates |
| **Regeneration** | Capacity to restore itself and other sources | Soil formation rate, carbon sequestration, water quality recovery |
| **Resilience** | Stabilisation of the broader socio-ecological system | Biodiversity index, redundancy, shock response |
| **Adaptive capacity** | Ability to evolve into new viable configurations | Genetic diversity, habitat diversity, innovation potential |
| **Generative capacity** | Capacity to produce future resources and opportunities not yet known | Ecosystem complexity, connectivity, carrying capacity |
| **Commons value** | Significance as shared infrastructure across the agent network | Number and diversity of dependent agents, dependency ratio |
| **Learning value** | Knowledge generated through observation and interaction | Monitoring outputs, governance improvements, model accuracy |

### 4.3 Source-to-Source links

```rust
pub enum SourceLinkType {
    Yields,        // Source yields a sub-Source (watershed → river)
    Conditions,    // Source conditions another Source (forest → river flow)
    ProvidedBy,    // inverse of Yields (river is provided by watershed)
}

pub struct SourceCouplingLink {
    pub from_source_hash: ActionHash,
    pub to_source_hash: ActionHash,
    pub link_type: SourceLinkType,
    pub coupling_strength: Option<f64>,    // 0.0–1.0; estimated from monitoring data
    pub notes: Option<String>,
}
```

---

## 5. Governance Requirements

### 5.1 Adaptive governance loop

Source-NDO governance operates as a **cybernetic loop** rather than a one-time rule evaluation. This extends the governance-as-operator pattern to complex, partially unknowable ecological systems:

```
Boundary events (extraction, discharge, restoration)
       ↓
Event ledger (accumulated on Source Layer 0 hash)
       ↓
Ecological interpretation (by scientists, local stewards, monitoring systems)
       ↓
Governance rule adaptation (GovernanceRule entries updated or replaced)
       ↓
Access affordances (who can do what, under what conditions, up to what quantity)
       ↓
Conditioned future events (agents interact with the Source under new rules)
       ↓ (loop)
```

The **black-box principle** governs this loop: stewards do not need to model the full interior of the watershed. They observe peripheral signals (withdrawals, pollutant loads, sensor readings, fish counts, flood events, seasonal variation, local knowledge). Governance adapts from these signals. As the source ledger grows, stewards can revise thresholds, add monitoring obligations, change access rules, or introduce graduated sanctions.

This is "beyond Ostrom" in the complexity-science sense: Ostrom's design principles assume a *complicated* resource system whose rules can be designed from adequate knowledge. Sources are *complex* systems with nonlinear dynamics and potential regime shifts. Rules must adapt continuously as the source ledger grows (Holling, 1973; Gunderson & Holling, 2002; Folke et al., 2005).

### 5.2 PropertyRegime constraints

Source-NDOs SHALL observe the following property regime constraints:

- **MUST be `Nondominium` or `CommonPool`**: `Private`, `Commons`, `Pool`, and `Collective` regimes are inappropriate for ecological sources — they imply ownership or enclosure that the Source primitive is designed to prevent.
- `PropertyRegime::Nondominium` is preferred: governance-embedded uncapturability, no `primaryAccountable`.
- `PropertyRegime::CommonPool` may apply to rivalrous consumable stock sources (e.g., a specific fish stock where the extraction quota is the primary governance mechanism).

### 5.3 Governance rule requirements (REQ-SOURCE-GOV-*)

**REQ-SOURCE-GOV-01**: Source-NDO governance MUST support **adaptive rule revision**: governance rules attached to a Source should be updatable through a defined governance process (not only by the initiator), reflecting changes in ecological interpretation. Rule version history SHALL be maintained.

**REQ-SOURCE-GOV-02**: Source-NDOs MUST support **access affordance rules** expressed as quantitative constraints on boundary events: maximum extraction quantity per period, maximum pollutant loading, minimum restoration obligation per extraction event, seasonal restrictions.

**REQ-SOURCE-GOV-03**: The governance evaluation for Source-NDO events MUST check current `SourceRegimeState`. Events that would push the source toward or past `tipping_threshold` MAY be blocked or require multi-validator approval under precautionary governance rules.

**REQ-SOURCE-GOV-04**: Source-NDOs SHOULD support **monitoring obligations** as a class of `GovernanceRule`: agents that extract from or discharge into a Source may be required to submit condition data as a precondition for continued access. Monitoring data updates `SourceProfile.regime_state` and related indicators.

**REQ-SOURCE-GOV-05**: `SourceRegimeState` transitions (e.g. `Stable → Stressed`, `Stressed → Degraded`) MUST be governance-validated — they require evidence (monitoring data, scientific assessment, community observation) and multi-validator approval, not unilateral declaration.

**REQ-SOURCE-GOV-06**: The governance module SHALL record all Source-NDO boundary events as `EconomicEvent` entries linked to the Source's Layer 0 hash, forming an auditable ledger of all extraction, loading, non-consumptive use, and restoration actions.

### 5.4 Stewardship model

Source-NDOs use **stewardship** rather than ownership:

| Concept | Standard NDO | Source-NDO |
|---|---|---|
| Custodian | `EconomicResource.custodian: AgentPubKey` | Not applicable (Sources are not held in custody) |
| Primary responsible | `primaryAccountable: AgentPubKey` | `stewardedBy: Vec<AgentPubKey>` — obligations, not rights |
| Role type | `PrimaryAccountableAgent` | `Steward` — a new functional role for Source governance |
| Transfer | Custody transfer event | Stewardship succession event (governance-validated) |

The `Steward` role carries **obligations** (monitoring, maintaining condition indicators, processing access requests, implementing governance decisions) without conferring **alienation rights**. No steward can privatise a Source-NDO.

### 5.5 Data sovereignty and knowledge integration

**REQ-SOURCE-GOV-07**: Source-NDOs MUST support attaching **qualitative and community-validated condition signals** to the event ledger, not only quantitative sensor data. Narrative observations, indigenous knowledge assessments, and community-validated condition reports are legitimate inputs to governance interpretation.

**REQ-SOURCE-GOV-08**: Sensitive ecological data (endangered species locations, sacred sites, private land-use details) attached to Source-NDO records SHALL be stored as Holochain private entries with capability-grant access control, following the `PrivatePersonData` model in `zome_person`. The PPR system's privacy model applies to stewardship participation data.

---

## 6. Lifecycle and Layer Activation

### 6.1 LifecycleStage for Source-NDOs

Source-NDOs use the same `LifecycleStage` enum as other NDOs, but the semantic mapping differs:

| LifecycleStage | Source-NDO meaning |
|---|---|
| `Ideation` | Source identified and named; Layer 0 only; minimal condition data |
| `Specification` | Boundary conditions defined; stakeholders identified; monitoring plan drafted |
| `Development` | Active monitoring established; governance rules being developed; stewards named |
| `Stable` | Governance rules active; monitoring operational; event ledger accumulating |
| `Active` | Full governance loop operational; regular rule revision cycle in place |
| `Hibernating` | Governance temporarily paused (e.g. seasonal closure, dispute resolution in progress) |
| `Deprecated` | Source governance superseded by a broader governance structure (e.g. a watershed-level Source-NDO supersedes a river-level one) |
| `EndOfLife` | Irreversible loss (e.g. geological change, complete ecosystem collapse); Layer 0 tombstone preserved as historical record |

### 6.2 Layer activation

Source-NDOs use the same three-layer model as all NDOs:

- **Layer 0**: `NondominiumIdentity` + `SourceProfile` extension; permanent anchor
- **Layer 1**: `SourceSpecification` — boundary definitions, monitoring framework, stakeholder map, ecological value vector expression; activated when governance framework is being formalised
- **Layer 2**: Economic events, commitments, claims, PPRs; activated when boundary events begin to be recorded

---

## 7. PPR Integration

Private Participation Receipts for Source-NDO interactions use the existing 16-category system with the following emphasis:

| PPR category | Source-NDO use |
|---|---|
| `ValidationActivity` | Monitoring data submission, condition assessment, governance interpretation |
| `RuleCompliance` | Compliance with extraction quotas, discharge limits, monitoring obligations |
| `MaintenanceCommitmentAccepted` / `MaintenanceFulfillmentCompleted` | Restoration commitments (reforestation, riparian restoration, remediation) |
| `DisputeResolutionParticipation` | Disputes about Source condition assessments or access affordances |
| `ResourceCreation` | Registration of a new Source-NDO and initial condition assessment |
| `GoodnFaithTransfer` | Stewardship succession — transfer of steward obligations to a new agent |

Stewardship participation records (monitoring contributions, governance interpretation events, restoration work) SHALL be PPR-eligible, enabling stewards to accumulate governance standing through contribution to Source health.

---

## 8. Requirements Summary (REQ-SOURCE-*)

### 8.1 Ontological requirements

**REQ-SOURCE-ONT-01**: The system SHALL recognise `Source` as a distinct ontological category for flow endpoints in economic events, separable from both `Agent` and `EconomicResource` (cf. `vf:Source` ValueFlows extension, §3).

**REQ-SOURCE-ONT-02**: Source-NDOs SHALL NOT require a `primaryAccountable` agent. The property regime SHALL be `Nondominium` or `CommonPool`. Governance SHALL reject any `GovernanceRule` that attempts to assign ownership of a Source-NDO.

**REQ-SOURCE-ONT-03**: The system SHALL support Source-to-Source links of types `yields`, `conditions`, and `providedBy` (§4.3) to represent source hierarchies and ecological coupling.

**REQ-SOURCE-ONT-04**: Source-NDOs SHALL be represented on the DHT as `NondominiumIdentity` entries with a linked `SourceProfile` extension, using the permanent Layer 0 hash as the event ledger anchor.

### 8.2 Data model requirements

**REQ-SOURCE-DATA-01**: `SourceProfile` SHALL record: `current_stock`, `flux_rate`, `assimilation_capacity`, `regime_state`, `resilience`, `tipping_threshold`, `adaptive_capacity`, `generative_capacity`, `dependency_index`, `source_type`, `complex_interior`, `stewarded_by` (§4.1).

**REQ-SOURCE-DATA-02**: `SourceRegimeState` SHALL progress through: `Pristine → Stable → Stressed → Degraded → Critical → Transformed`, with governance-validated transitions in both directions (§5.3, REQ-SOURCE-GOV-05).

**REQ-SOURCE-DATA-03**: The Layer 1 `SourceSpecification` SHOULD support the ecological value vector dimensions: Sustenance, Regeneration, Resilience, Adaptive Capacity, Generative Capacity, Commons Value, Learning Value (§4.2).

### 8.3 Event and governance requirements

See §5.3 (REQ-SOURCE-GOV-01 through REQ-SOURCE-GOV-08) for the full governance requirement set.

**REQ-SOURCE-EVENT-01**: Boundary events on Source-NDOs (extraction, loading, non-consumptive use, regeneration) SHALL be recorded as `EconomicEvent` entries with the Source's Layer 0 hash as the `resource_inventoried_as` target, regardless of whether the Source is provider or receiver.

**REQ-SOURCE-EVENT-02**: Extraction events from a Source SHALL decrement `SourceProfile.current_stock` (or its `flux_rate`-denominated period budget); loading events SHALL decrement `assimilation_capacity`. These updates SHALL be governance-validated, not directly writable by the extracting/discharging agent.

**REQ-SOURCE-EVENT-03**: Regeneration events (restoration, remediation) SHALL be able to increment `current_stock`, `flux_rate`, `assimilation_capacity`, or `resilience` through governance-validated `raise`-equivalent events, recording the contributing agent and PPR.

---

## 9. Implementation Phasing (informative)

| Phase | Deliverable |
|---|---|
| **Phase A** | `SourceProfile` entry type; `SourceType` and `SourceRegimeState` enums; Layer 0 + SourceProfile link; Source-to-Source coupling links; `Steward` role type |
| **Phase B** | `vf:Source` event role; boundary event recording (extraction, loading, regeneration); event-triggered `current_stock` and `assimilation_capacity` updates |
| **Phase C** | Adaptive governance loop: `SourceRegimeState` transitions; access affordance rules; monitoring obligation `GovernanceRule` type; precautionary blocking at `tipping_threshold` |
| **Phase D** | Ecological value vector expression in Layer 1 `SourceSpecification`; PPR integration for stewardship participation; ZKP-compatible proof of monitoring obligation fulfilment |
| **Phase E** | Cross-DNA source hierarchy links (watershed-level Source-NDO governing river-level Source-NDOs across different communities); federation-level source governance |

---

## 10. Relation to Complexity Oriented Programming

Source-NDO is a direct application of COP principles (see `complexity-oriented-programming` skill):

| COP principle | Source-NDO enactment |
|---|---|
| **Dynamic complexity matching** | Governance overhead grows from Layer 0 (Ideation, minimal) to full adaptive loop (Active); the system never requires complete ecological specification upfront |
| **Stigmergic coordination** | Source-NDOs modify the governance environment via their ledger: stewards respond to source condition signals rather than following explicit orders |
| **Anti-fragility** | The adaptive governance loop treats ecological stress events as information for rule revision, not as failures; the system gets better at governance as the ledger grows |
| **Path-dependency awareness** | `SourceRegimeState` history and event ledger preserve the full trajectory; governance rules carry their provenance |
| **Fractal composability** | Source hierarchies (watershed → river → water) use the same NDO primitives at every scale; governance principles are self-similar |
| **Probe-sense-respond** | The governance loop is explicitly cybernetic: boundary events probe; condition monitoring senses; governance rule adaptation responds |

---

## 11. Traceability

| Source | Normative IDs |
|---|---|
| `source-ndo-paper.md` §8 (Implementation) | REQ-SOURCE-ONT-01 – -04 |
| `source-ndo-paper.md` §4 (Black-box principle) | REQ-SOURCE-GOV-01, -03, -04 |
| `source-ndo-paper.md` §6 (Governance loop) | REQ-SOURCE-GOV-02, -06, REQ-SOURCE-EVENT-01 – -03 |
| Ostrom SES framework | REQ-SOURCE-ONT-01 (resource system = Source) |
| `ndo_prima_materia.md` §4 (three-layer model) | §6 (Layer activation) |
| `ndo_prima_materia.md` governance-as-operator | §5.1 (adaptive governance loop) |
| `resources.md` §4.4.3 (property regimes) | REQ-SOURCE-ONT-02 |
| `governance.md` §2.1 (governance-as-operator) | §5.1 |

---

*This is a normative post-MVP requirements document. Source-NDO does not modify existing REQ-NDO-* invariants (Layer 0 permanence, governance-as-operator, PPR privacy model). It extends the economic ontology at the flow-endpoint level and adds Source-specific governance patterns on top of the existing architecture.*
