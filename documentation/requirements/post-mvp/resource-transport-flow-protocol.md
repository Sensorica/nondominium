# Resource Transport/Flow Protocol (RTP-FP) Specification

**Version**: 0.2
**Date**: 2026-08-06
**Status**: 🔄 Post-MVP — conceptual specification. Grounded in implemented NDO Layer 0 + `OperationalState` foundations; the transport/flow **process** layer (Layer 2 activation, `EconomicProcess`, governance-as-operator transitions) is **not yet wired in code**.
**Framework**: Holochain HDK ^0.6.0 / HDI ^0.7.0, hREA ValueFlows
**License**: CAL-1.0 + AGPLv3 (project dual license)

**Relates to**:
- [`ndo_prima_materia.md`](../ndo_prima_materia.md) — NDO three-layer model, `LifecycleStage`, `OperationalState`, capability slots (REQ-NDO-L0/L1/L2, REQ-NDO-OS-*)
- [`../requirements.md`](../requirements.md) — Economic Process (REQ-PROC-*), PPR (REQ-PPR-*), governance (REQ-GOV-*) requirements
- [`../../specifications/specifications.md`](../../specifications/specifications.md) — `EconomicEvent`, `EconomicResource`, PPR data structures, governance-as-operator interface
- [`source-ndo-requirements.md`](source-ndo-requirements.md) / [`source-valueflows-integration.md`](source-valueflows-integration.md) — `Source` primitive and `vf:Source` boundary flows
- [`many-to-many-flows.md`](many-to-many-flows.md) — shared custody, resource pools, multi-party transfers
- [`../../IMPLEMENTATION_STATUS.md`](../../IMPLEMENTATION_STATUS.md) / [`../../implementation_plan.md`](../../implementation_plan.md) — current build state and phasing

## Abstract

The Resource Transport/Flow Protocol (RTP-FP) is a multi-dimensional protocol designed to facilitate low-friction resource flows in commons-based economies. Unlike static transfer protocols focused on ownership change, RTP-FP emphasizes the continuous movement, mutualization, and co-stewardship of shared resources throughout their complete lifecycle.

RTP-FP is **not a new subsystem**. It is a semantic layer over primitives that already exist (or are specified) in the Nondominium architecture: the NDO three-layer model, the `OperationalState` machine on `EconomicResource`, ValueFlows `EconomicEvent`/`Commitment`/`Claim` cycles, the Private Participation Receipt (PPR) system, the governance-as-operator pattern, and — where the flow originates in a generative system — the `Source`/`vf:Source` boundary-flow extension. This document maps the "transport" mental model onto those primitives and records what is implemented versus planned.

## 0. Alignment with Current Implementation

RTP-FP describes a **Layer 2 (Process) concern** over NDOs. It depends on foundations that are already built and on activation work that is in progress or planned. This section is the authoritative status anchor; the rest of the document uses the status markers ✅ implemented, 🔄 partial/prototype, ❌ not implemented.

| RTP-FP building block | Canonical primitive | Status | Source |
|---|---|---|---|
| Resource identity anchor | `NondominiumIdentity` (NDO Layer 0) | ✅ Implemented | `ndo_prima_materia.md` §4; `IMPLEMENTATION_STATUS.md` |
| Transport/flow status of an instance | `OperationalState` on `EconomicResource` (7 states) | ✅ Data layer (REQ-NDO-OS-01) | `crates/shared/src/types.rs`; `resources.md` §2.1 |
| Maturity phase of the resource design | `LifecycleStage` on Layer 0 (10 stages) | ✅ Implemented | `ndo_prima_materia.md` §5 |
| Movement/custody events | `EconomicEvent` + 16 `VfAction` variants | ✅ Implemented | `specifications.md` §3.3.1 |
| Single custodian | `EconomicResource.custodian: AgentPubKey` | ✅ Implemented (individual only) | `specifications.md` §3.2.3 |
| Intent → observation cycle | `Commitment` → `EconomicEvent` → `Claim` | ✅ Implemented | `specifications.md` §3.3 |
| Accountability receipts | 16 `ParticipationClaimType` PPR categories | 🔄 Prototype | `requirements.md` §7.2 |
| Transport/Storage/Repair/Use **as processes** | `EconomicProcess` + role gating | ❌ Not implemented end-to-end | `IMPLEMENTATION_STATUS.md`; REQ-PROC-01..09 |
| Legal-dimension transitions | Governance-as-operator (Request→Evaluate→Apply) | ❌ Not implemented (REQ-NDO-OS-02..05) | `specifications.md` §3; `resources.md` §2.4 |
| Layer 2 activation (process ↔ NDO) | `NDOToProcess` link | ❌ Post-MVP (REQ-NDO-L2-01) | `ndo_prima_materia.md` §4 |
| Layer 1 activation (spec/assets ↔ NDO) | `NDOToSpecification`, `DigitalAsset` slots | 🔄 In progress (REQ-NDO-L1-01/06) | `ndo_prima_materia.md` §4 |
| Flow originating in a generative system | `Source`/`SourceProfile`, `vf:Source`, `Extract` | ❌ Post-MVP (REQ-SOURCE-*) | `source-ndo-requirements.md`; `source-valueflows-integration.md` |
| Cross-NDO/federated flows | `NdoHardLink`, `Contribution`, `Agreement` | ✅ Implemented (#103) | `resources.md` §2.5 |

**Design consequence.** Transport is a *process running on an instance*, so it belongs to `OperationalState` (transient condition) and Layer 2 (`EconomicEvent`/`Commitment`/`Claim`), **not** to `LifecycleStage` (design maturity on Layer 0). Moving a `Prototype`-stage NDO's instance does not advance it toward `Stable`; it only sets that instance `InTransit`. This orthogonality (REQ-NDO-OS-01) is load-bearing for the whole protocol.

## 1. Fundamental Concepts

### 1.1 Transport vs Transfer Paradigm

**Traditional Transfer Protocol**:

- Linear ownership change: A → B
- Static endpoint focus
- Private ownership model
- Single transaction view

**Resource Transport/Flow Protocol**:

- Multi-dimensional flow: A ↔ Network ↔ B ↔ Network...
- Continuous lifecycle perspective
- Commons-based stewardship (custody, not ownership; preserves the `Nondominium`/`Pool`/`CommonPool` property regimes)
- Multi-agent participation view

In ValueFlows terms, "transfer" is the `Transfer` action (ownership + custody change); RTP-FP privileges `TransferCustody` (custody change preserving the property regime), `Move` (location change, same custodian), and `AccessForUse` (access without custody change). Ownership-changing `Transfer` remains available but is the exception, not the default, for commons resources.

### 1.2 Core Principles

1. **Non-Linear Resource Flows**: Resources participate in circulation within commons networks rather than one-way supply chains.
2. **Custodial Stewardship**: Resources have custodians, not owners, with responsibilities and benefits. Custody is recorded on `EconomicResource.custodian` and changed via `TransferCustody`/`CustodyTransfer` events.
3. **Multi-Dimensional Tracking**: Simultaneous tracking across physical, custodial, value, legal, and information dimensions — each mapped to a concrete primitive (§2).
4. **Lifecycle Completeness**: End-to-end management from creation (`Ideation`/`PendingValidation`) through decommissioning (`EndOfLife`), spanning both `LifecycleStage` and `OperationalState`.
5. **Low-Friction Movement**: Minimal transaction overhead for shared-resource circulation, achieved through implicit validation, bilateral receipts, and role-gated processes.

## 2. Multi-Dimensional Resource Flow Model

### 2.1 Five Transport Dimensions

Each dimension is a *view* over existing primitives, not a separate ledger. The table below is the reconciliation of the original RTP-FP dimensions with the current data model.

| Dimension | What it tracks | Canonical primitive(s) | Status |
|---|---|---|---|
| **Physical** | Location, transport condition of an instance | `EconomicResource.current_location` + `OperationalState` (`InTransit`, `InStorage`) + `Move`/`VfAction` events | ✅ data layer; ❌ transition enforcement |
| **Custodial** | Who holds the resource, custody history | `EconomicResource.custodian` + `TransferCustody`/`CustodyTransfer`/`CustodyAcceptance` events + PPR | ✅ single custodian; 🔄 many-to-many post-MVP |
| **Value** | Condition, utility, reliability over time | `OperationalState` (`InMaintenance`, `InUse`) + derived `reliability_score` (from repair/maintenance events) | ✅ operational; 🔄 reliability derivation post-MVP |
| **Legal** | Rights/permissions shifting | `GovernanceRule` (Layer 1) evaluated by governance-as-operator; capability tokens | 🔄 rules persisted; ❌ operator enforcement |
| **Information** | Docs, provenance, maintenance records | DHT links; Layer 1 `DigitalAsset` capability slots; `NdoHardLink` provenance; PPR history | 🔄 Layer 1 activation in progress |

#### 2.1.1 Physical Dimension

- **Definition**: Resource movement through space.
- **Primitive**: `OperationalState::InTransit` / `InStorage` on the `EconomicResource`, plus `current_location: Option<String>`, updated by `Move` (location change, same custodian) or `Transfer`/`TransferCustody` (location + custody change) `EconomicEvent`s.
- **Note**: External telemetry (GPS/RFID/IoT) is an *ingestion source* that populates `current_location` or triggers state changes; it is not itself on the DHT. It maps to REQ-FUT-ORG-BRG-* bridge concerns.

#### 2.1.2 Custodial Dimension

- **Definition**: Resource changes custodian/steward.
- **Primitive**: `EconomicResource.custodian` mutated through a `TransferCustody` event; provenance captured by the `CustodianToResource` link and the `EconomicEvent` history. Multi-custodian / shared-custody flows are **post-MVP** ([`many-to-many-flows.md`](many-to-many-flows.md)).
- **Accountability**: each custody handoff issues bilateral PPRs (`CustodyTransfer` / `CustodyAcceptance`) — see §5.

#### 2.1.3 Value Dimension

- **Definition**: The resource's condition/utility transforms through use and service.
- **Primitive**: `OperationalState::InUse` / `InMaintenance`, plus (post-MVP) a derived `reliability_score` accumulated from repair/maintenance/incident events (`resources.md` §6.5). The *design* of the resource lives in Layer 1 `ResourceSpecification`; the *condition of an instance* lives on the `EconomicResource`.

#### 2.1.4 Legal Dimension

- **Definition**: Rights and responsibilities shift as the resource flows.
- **Primitive**: `GovernanceRule` entries (Layer 1, linked to `ResourceSpecification`) evaluated by the **governance-as-operator** (`request_resource_transition` → `evaluate_state_transition` → apply). Access is gated by capability tokens and role checks. Post-MVP, rules may also gate on `AffiliationState` (REQ-GOV-14) and, for generative systems, on `SourceRegimeState` (REQ-SOURCE-GOV-03).
- **Status**: `GovernanceRule` persistence is implemented; the operator that *enforces* transitions on `OperationalState` is **not yet built** (REQ-NDO-OS-02..05).

#### 2.1.5 Information Dimension

- **Definition**: Data and metadata that travel with the resource.
- **Primitive**: DHT link architecture — Layer 1 `DigitalAsset` capability slots for files/manifests (REQ-NDO-L1-06), `NdoHardLink` (`DerivedFrom`/`Component`/`Supersedes`) for provenance, and the resource's `EconomicEvent`/PPR history for maintenance and custody records. Digital integrity (chunked SHA-256/Merkle) is specified in [`digital-resource-integrity.md`](digital-resource-integrity.md).

### 2.2 Non-Linear Flow Patterns

```
Traditional Supply Chain:
Producer → Distributor → Retailer → Consumer
     ↓          ↓           ↓         ↓
  Linear      Static   Point-to-Point   Endpoint

Resource Flow Network:
    Agent A ↔ Resource Hub ↔ Agent C
       ↕           ↕           ↕
    Resource    Resource    Resource
   Pool Alpha   Pool Beta   Pool Gamma
       ↕           ↕           ↕
    Agent B ↔ Resource Hub ↔ Agent D

Dynamic, Circular, Multi-path Resource Circulation
```

Where a flow originates in a **generative system** (a watershed, forest, fishery, or knowledge commons), the "producer" node is a **Source-NDO**, not an agent, and the first hop is an `Extract` boundary event rather than a `Produce` (§6).

## 3. Protocol Architecture

### 3.1 Holochain Integration

#### 3.1.1 DNA / Zome Distribution

- **`zome_person`**: Agent identity, roles, custodial relationships, private data, PPR storage.
- **`zome_resource`**: NDO Layer 0 identity (`NondominiumIdentity`), `ResourceSpecification`, `EconomicResource` + `OperationalState`, `GovernanceRule` persistence (pure data model).
- **`zome_gouvernance`**: `EconomicEvent`, `Commitment`, `Claim`, `ValidationReceipt`, PPR issuance, and (planned) the governance-as-operator that evaluates transitions and generates events.

#### 3.1.2 DHT Architecture Benefits

- **Agent-Centric Views**: Each agent maintains their own perspective (source chain) of resource flows.
- **Multi-Source Truth**: No single point of failure; distributed peer validation.
- **Cross-DNA Coordination**: Federated flows across group/lobby DNAs via `NdoHardLink` and the Lobby DNA.
- **Privacy Preservation**: PPRs are private entries; public validation via `ValidationReceipt`.

### 3.2 NDO Layer Placement

RTP-FP operates across all three NDO layers, but its "moving parts" are Layer 2:

- **Layer 0 (`NondominiumIdentity`)** — the permanent identity the flow is *about*; carries `LifecycleStage`, `PropertyRegime`, `ResourceNature`. Always present. ✅
- **Layer 1 (`ResourceSpecification` via `NDOToSpecification`)** — the design, `GovernanceRule`s (legal dimension), and `DigitalAsset` slots (information dimension). Activation in progress (REQ-NDO-L1-01/06). 🔄
- **Layer 2 (Process via `NDOToProcess`)** — the transport/storage/repair/use activity: `Commitment`, `EconomicEvent`, `Claim`, PPR. `EconomicResource` instances attach through Layer 2 (REQ-NDO-L2-06). ❌ activation post-MVP.

A transport journey is therefore a **Layer 2 process** over one NDO identity, mutating one or more `EconomicResource` instances' `OperationalState`.

### 3.3 OperationalState — The Canonical Transport State Machine

The transport/flow status the original RTP-FP called "transport status" is the implemented `OperationalState` enum on `EconomicResource` (REQ-NDO-OS-01):

```
PendingValidation → Available → Reserved → InTransit  → Available
                              ↘         ↘ InStorage    → Available
                                        ↘ InMaintenance→ Available
                                        ↘ InUse        → Available
```

- A transport process typically drives `Available → Reserved → InTransit → Available` (at the new custodian/location).
- Storage and repair drive `→ InStorage` / `→ InMaintenance` and back.
- `OperationalState` is **orthogonal** to `LifecycleStage`: an `Active`-stage NDO can have an `InMaintenance` instance; a `Prototype` can be `InTransit`.

**Governance-as-operator dependency (❌ not implemented).** Each `OperationalState` transition *should* be requested by an agent, evaluated against Layer 1 `GovernanceRule`s by `zome_gouvernance`, applied to the `EconomicResource`, and recorded as an `EconomicEvent` (REQ-NDO-OS-02..05, REQ-ARCH-10). Today `update_operational_state` mutates state directly without operator evaluation; wiring the operator is a prerequisite for the legal dimension.

## 4. Protocol Operations

### 4.1 Resource Lifecycle Phases

RTP-FP phases span two orthogonal axes. The table maps each RTP-FP phase to `LifecycleStage` (Layer 0, design maturity) and `OperationalState` (instance condition).

| RTP-FP phase | `LifecycleStage` (Layer 0) | `OperationalState` (instance) |
|---|---|---|
| Genesis — network entry | `Ideation` → `Specification` → … | `PendingValidation` → `Available` |
| Active use — circulation | `Active` / `Distributed` | `Reserved` / `InTransit` / `InUse` |
| Service — maintenance/enhancement | (unchanged) | `InStorage` / `InMaintenance` |
| End-of-life — decommissioning | `Deprecated` → `EndOfLife` | terminal (instance retired) |

#### 4.1.1 Genesis Phase — Network Entry

- NDO Layer 0 creation (`create_ndo`); optional Layer 1 activation (`NDOToSpecification`) when a spec exists.
- First `EconomicResource` instance created at `PendingValidation`; peer validation (`validate_new_resource`) moves it to `Available`.
- Genesis PPRs: `ResourceCreation` (creator) + `ResourceValidation` (validator).

#### 4.1.2 Active Use Phase — Resource Circulation

- Custody transfers (`TransferCustody`) and location moves (`Move`) between agents.
- `OperationalState` cycles `Available ↔ Reserved ↔ InTransit ↔ InUse`.
- Usage and condition monitoring feed the value dimension.

#### 4.1.3 Service Phase — Maintenance & Enhancement

- Transport → repair → transport → storage chains executed by role-holding agents (`Transport`, `Repair`, `Storage`).
- Drives `InTransit` / `InMaintenance` / `InStorage`. **Note**: these are specified as `EconomicProcess` types (REQ-PROC-02/03/04) but are **not yet implemented end-to-end**.

#### 4.1.4 End-of-Life Phase — Responsible Decommissioning

- `EndOfLife` declaration with multi-validator confirmation and a challenge period (REQ-GOV-11/12/13).
- PPRs: `EndOfLifeDeclaration` + `EndOfLifeValidation`.
- Layer 0 survives as a permanent tombstone; only `lifecycle_stage` reflects termination.

### 4.2 Low-Friction Design Patterns

#### 4.2.1 Implicit Resource Validation

- For trusted agents, resource validation rides on agent validation; no separate validation receipts for standard transfers. PPR-based reliability substitutes for per-transfer inspection.

#### 4.2.2 Bilateral Receipt Generation

- Exactly 2 PPRs per economic interaction (REQ-PPR-01), one per counterparty, bilaterally signed. In the MVP one-to-one model this is pairwise-bilateral; multi-party issuance is post-MVP ([`many-to-many-flows.md`](many-to-many-flows.md)).

#### 4.2.3 Good-Faith Transfers

- Custody handed to a service provider on the strength of an accepted `Commitment`, with minimal validation overhead and an atomic commitment/fulfillment cycle. PPR: `GoodFaithTransfer`.

## 5. PPR Integration

RTP-FP uses the canonical 16 `ParticipationClaimType` categories (`requirements.md` §7.2) — it does **not** define new receipt types. The transport-relevant subset:

| Flow event | Provider-side PPR | Receiver-side PPR |
|---|---|---|
| Resource creation + validation | `ResourceCreation` | `ResourceValidation` |
| Custody handoff | `CustodyTransfer` | `CustodyAcceptance` |
| Transport service (commit) | `TransportCommitmentAccepted` | `GoodFaithTransfer` |
| Transport service (fulfill) | `TransportFulfillmentCompleted` | `CustodyAcceptance` |
| Storage service | `StorageCommitmentAccepted` | `StorageFulfillmentCompleted` |
| Maintenance/repair service | `MaintenanceCommitmentAccepted` | `MaintenanceFulfillmentCompleted` |
| Governance/validation activity | `ValidationActivity` / `RuleCompliance` | — |
| End-of-life | `EndOfLifeDeclaration` | `EndOfLifeValidation` |

**Properties** (unchanged from the PPR system): private entries, never globally aggregated, bilaterally signed, weighted `PerformanceMetrics` (timeliness 0.25, quality 0.30, reliability 0.25, communication 0.20). Reputation is derived by the owning agent as a `ReputationSummary` and selectively shared.

### 5.1 Role Chaining Support

- Multi-role agents (e.g. `Transport` + `Repair` + `Storage`) can chain actions (receive → transport → repair → transport → deliver) within a single commitment (REQ-USER-A-07), with intermediate `OperationalState` transitions self-managed and each leg generating its own bilateral PPRs.

## 6. Source-Originated Flows (Post-MVP)

> **Status**: ❌ Post-MVP. Depends on the `Source`/`vf:Source` extension ([`source-ndo-requirements.md`](source-ndo-requirements.md), [`source-valueflows-integration.md`](source-valueflows-integration.md)). Not required for ordinary flows between agents.

When a flow **originates in or discharges into a generative system** (watershed, forest, fishery, knowledge commons), the endpoint is a **Source-NDO**, not an agent. RTP-FP extends to boundary flows as follows.

### 6.1 Boundary Events

`EconomicEvent` gains two additive optional fields (Option B in `source-valueflows-integration.md` §2.2):

```rust
pub source_provider: Option<ActionHash>,  // Source Layer 0 hash (extraction / non-consumptive use)
pub source_receiver: Option<ActionHash>,  // Source Layer 0 hash (loading / pollution)
```

Integrity rule: exactly one of `{ provider, source_provider }` set on the initiating side (same for the receiver). Agent↔Agent events are unchanged.

| Boundary flow | Action | Endpoint | Effect on `SourceProfile` |
|---|---|---|---|
| Extraction (water, timber, fish) | `Extract` (proposed 17th `VfAction`) | `source_provider` = Source | debits `current_stock` / period quota |
| Loading / pollution | `Produce` with `source_receiver` | `source_receiver` = Source | debits `assimilation_capacity` |
| Regeneration / restoration | `Raise` on the Source | `source_receiver` = Source | credits stock / resilience |
| Non-consumptive use | `Use` with `source_provider` | `source_provider` = Source | affects `regime_state`, no stock change |

Until `Extract` lands, `Lower` on the Source plus `Raise`/`Transfer` on the derived Resource is an acceptable interim mapping (`source-valueflows-integration.md` §2.8).

### 6.2 Transport of Source-Yielded Resources

The extracted quantity becomes an ordinary `EconomicResource` instance the moment it is inventoried; from there the standard RTP-FP dimensions and `OperationalState` machine apply. The **transport journey of extracted units is agent↔agent**; only the **first hop** (the extraction) touches the Source. This keeps depletion visible on the Source ledger while reusing the entire transport/custody/PPR machinery downstream.

### 6.3 Adaptive Governance Coupling

For Source-originated flows the legal dimension is **adaptive** (REQ-SOURCE-GOV-01..08): boundary events accumulate on the Source Layer 0 hash → stewards interpret condition → `GovernanceRule`s and access affordances (quotas, seasonal limits) are revised → future extraction/transport requests are re-evaluated. Precautionary blocking applies near `tipping_threshold` (REQ-SOURCE-GOV-03). Stewardship uses `stewardedBy` / the `Steward` role, never `custodian`/ownership.

## 7. Data Structures

> **Important**: The structs below are **design-level projections**, not literal Holochain entry types. RTP-FP does not introduce a `ResourceFlowEvent` entry. The persisted entries are the existing `EconomicEvent`, `EconomicResource` (with `OperationalState`), `Commitment`, `Claim`, `PrivateParticipationClaim`, and (post-MVP) `SourceProfile`. The projections describe how a client composes a "flow view" by reading those entries plus their links.

### 7.1 Persisted primitive — `EconomicEvent` (ground truth)

```rust
// zome_gouvernance (specifications.md §3.3.1; +source fields per source-valueflows-integration.md §2.2)
pub struct EconomicEvent {
    pub action: VfAction,                      // 16 variants (+ proposed Extract)
    pub provider: AgentPubKey,                 // XOR source_provider (post-MVP)
    pub receiver: AgentPubKey,                 // XOR source_receiver (post-MVP)
    pub resource_inventoried_as: ActionHash,   // the EconomicResource
    pub affects: ActionHash,                   // the EconomicResource affected
    pub resource_quantity: f64,
    pub event_time: Timestamp,
    pub note: Option<String>,
    // Post-MVP Source boundary endpoints:
    pub source_provider: Option<ActionHash>,   // Source Layer 0 hash
    pub source_receiver: Option<ActionHash>,   // Source Layer 0 hash
}
```

### 7.2 Persisted primitive — `EconomicResource` with `OperationalState`

```rust
// zome_resource (specifications.md §3.2.3; resources.md §2.1)
pub struct EconomicResource {
    pub conforms_to: ActionHash,               // Layer 1 ResourceSpecification
    pub quantity: f64,
    pub unit: String,
    pub custodian: AgentPubKey,                // single custodian (many-to-many post-MVP)
    pub current_location: Option<String>,      // physical dimension
    pub operational_state: OperationalState,   // transport/flow status
}

pub enum OperationalState {
    PendingValidation, Available, Reserved,
    InTransit, InStorage, InMaintenance, InUse,
}
```

### 7.3 Design-level projection — Flow View (client-composed)

```rust
// NOT an entry. Composed by a client/read model from the entries above + links + PPRs.
pub struct ResourceFlowView {
    pub ndo_identity: ActionHash,              // Layer 0 NondominiumIdentity
    pub lifecycle_stage: LifecycleStage,       // Layer 0 maturity
    pub instance: ActionHash,                  // EconomicResource
    pub operational_state: OperationalState,   // physical/value dimension
    pub custodian: AgentPubKey,                // custodial dimension
    pub custody_history: Vec<ActionHash>,      // TransferCustody EconomicEvents
    pub applicable_rules: Vec<ActionHash>,     // Layer 1 GovernanceRule (legal dimension)
    pub information_links: Vec<ActionHash>,    // DigitalAsset slots, NdoHardLinks (info dimension)
    pub participation_receipts: Vec<ActionHash>, // owning agent's PPRs
    pub source_origin: Option<ActionHash>,     // Source Layer 0 hash if boundary-originated
}
```

## 8. Security & Governance

### 8.1 Cryptographic Security

- Bilaterally signed PPRs; private entries with public `ValidationReceipt`s.
- Agent identity via Holochain source chains; capability-token-gated zome functions (`general_access` / `restricted_access`).
- Append-only, tamper-evident audit trail (Layer 0 permanence + event history).

### 8.2 Governance Mechanisms

- Governance-as-operator evaluates transitions against Layer 1 `GovernanceRule`s (❌ enforcement pending).
- Multi-validator schemes (`2-of-3`, `N-of-M`) for critical operations (REQ-GOV-06).
- Challenge periods for end-of-life and disputed transitions (REQ-GOV-13).
- Role-based access and validated functional credentials (`Transport`/`Repair`/`Storage`).
- Post-MVP: `AffiliationState`-gated access (REQ-GOV-14) and, for Sources, `SourceRegimeState`-conditional precautionary rules (REQ-SOURCE-GOV-03).

### 8.3 Attack-Vector Mitigation

- End-of-life abuse: multi-validator + challenge period.
- Monopolization: usage-pattern analysis over event history; property-regime constraints (no alienation of `Nondominium`).
- Sybil resistance: agent validation, social vouching, optional Tier-2 identity (post-MVP, REQ-GOV-17).
- Double-custody prevention: commitment tracking + single-custodian invariant (until many-to-many lands with explicit weights).

## 9. Use Cases & Applications

### 9.1 Tool Libraries & Makerspaces

Tool sharing with maintenance scheduling, custody handoff PPRs, and usage-based cost distribution. `Pool` property regime; `OperationalState` cycles `Available ↔ Reserved ↔ InUse ↔ InMaintenance`.

### 9.2 Transportation Pools

Vehicle sharing and fleet management with route/segment tracking (`InTransit`), maintenance cost allocation, and environmental-impact records.

### 9.3 Equipment Rental & Sharing

Industrial equipment networks with condition monitoring (value dimension → reliability), liability management (legal dimension → `GovernanceRule`), and cross-organizational optimization.

### 9.4 Digital Resource Commons

Software/service and knowledge sharing. `Digital`/`Information` nature, `Commons`/`Nondominium` regimes; Layer 1 `DigitalAsset` slots + digital integrity manifests carry the information dimension. Non-rivalrous, so "transport" collapses to access/replication rather than custody handoff.

### 9.5 Ecological Commons (Source-Originated)

Water abstraction, timber, or fisheries: extraction is a boundary `Extract` event on a Source-NDO (§6); downstream distribution reuses the full transport machinery. Adaptive stewardship governs quotas.

## 10. Future Extensions

### 10.1 Advanced Features

- Reputation-weighted routing/allocation, predictive maintenance from reliability scores.
- Governance-as-operator with typed `GovernanceRule`s (`EconomicAgreement` via Unyt, `IdentityVerification` via Flowsta).
- Cross-DNA / cross-network interoperability via federation primitives and portable credentials.

### 10.2 Protocol Evolution

- Many-to-many custody (weighted shared custody, resource pools, co-custodian delegation).
- Resource-type-specific and region-specific rule modules.
- Full `Source`/`vf:Source` activation with adaptive stewardship.

## 11. Implementation Roadmap

Aligned with [`implementation_plan.md`](../../implementation_plan.md) phases. RTP-FP itself is an **extended post-MVP specification**; it becomes fully realizable only once Layer 2 activation and the governance operator land.

| RTP-FP milestone | Prerequisite (implementation_plan) | Status |
|---|---|---|
| **M0 — Foundations** (identity, operational state, events, PPR prototype) | Phase 1 (Foundation) + `OperationalState` data layer | ✅ Delivered |
| **M1 — Layer 1 activation** (`NDOToSpecification`, `GovernanceRule` link, `DigitalAsset` slots) | Phase 2 (Layer 1) | 🔄 In progress |
| **M2 — Process layer & governance operator** (`EconomicProcess`, `NDOToProcess`, `request_resource_transition`/`evaluate_state_transition`, operational-state transitions generate events) | Phase 2/3 (Layer 2 + governance-as-operator) | ❌ Planned |
| **M3 — Full PPR issuance for transport chains** (transport/storage/repair categories on real commitment cycles) | Phase 3 (PPR) | ❌ Planned |
| **M4 — Many-to-many flows** (shared custody, pools) | Post-MVP ([`many-to-many-flows.md`](many-to-many-flows.md)) | ❌ Planned |
| **M5 — Source-originated flows** (`vf:Source`, `Extract`, adaptive stewardship) | Post-MVP ([`source-ndo-requirements.md`](source-ndo-requirements.md), §12.7) | ❌ Planned |

## 12. Conclusion

The Resource Transport/Flow Protocol reframes resource movement from static, ownership-based transfer to dynamic, commons-based flow. Its contribution is **semantic and integrative**: it maps the five transport dimensions onto primitives that already exist in Nondominium (`OperationalState`, `EconomicEvent`/`Commitment`/`Claim`, PPR, `GovernanceRule`, the NDO three-layer model) and onto those that are specified for generative systems (`Source`/`vf:Source`).

Concretely, RTP-FP is a **Layer 2 process concern** driving the `OperationalState` machine on `EconomicResource` instances, evaluated by the governance-as-operator against Layer 1 rules, and made accountable by the bilateral PPR system. As Layer 1 activation completes and the process layer and governance operator are wired, this specification becomes directly implementable rather than aspirational.

---

_This specification is a living document. It will evolve as Layer 1/Layer 2 activation, the governance operator, many-to-many flows, and the Source primitive are implemented. Status markers in this document should be updated against [`IMPLEMENTATION_STATUS.md`](../../IMPLEMENTATION_STATUS.md) as work lands._
