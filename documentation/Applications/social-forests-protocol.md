# Social Forests Protocol × Nondominium, a Comparative Analysis

**Prepared:** 2026-04-30
**Revised:** 2026-08-27
**Scope:** Architectural, economic, and governance comparison. A forest is treated as a **Source** (generative system), not as an owned RWA. Extracted units (timber, carbon credits, seedling lots) and financial instruments derived from them remain Resources / RWAs. Source-NDO is a specified post-MVP application profile; Layer 0 identity, Lobby → Group → NDO holarchy, and per-NDO cells are implemented.

---

## 1. Executive Summary

[Social Forests Protocol](https://github.com/G0vermind/social-forests-protocol) and [Nondominium](https://github.com/Sensorica/nondominium/tree/dev) are both working on the same hard problem: making real-world ecological systems legible, accountable, and governable on distributed infrastructure. But they solve it from opposite ends.

**Social Forests** enters from the market side. It builds a B2B2C commercial stack on Stellar to financialize physical trees as NFTs, distribute green cashback to consumers, and give companies verifiable ESG compliance. It is a product with a supply chain, a fiat on-ramp, and a gamified consumer loop. It tokenizes nature to make sustainability profitable.

**Nondominium** enters from the commons side. It builds a governance-first data layer on Holochain to track resources through their full lifecycle, with contribution-based access, bilateral accountability, and Ostromian governance rules baked in at the protocol level. Since the original version of this analysis, that model has a third ontological primitive: **`Source`**. A forest, watershed, or fishery is neither an owned `EconomicResource` nor an intentional Agent. It is a generative, non-ownable, partially unknowable system that *yields* resources, *receives* ecological effects, and *conditions* future possibilities. Nondominium models the forest as something held in common and *stewarded* — not something owned.

The NDO primitive is not a token. It is a permanent identity anchor (`NondominiumIdentity`, bound to a per-NDO cloned cell whose `DnaHash` is the network identity) with a property regime, a resource nature, and a lifecycle — from ideation through active use to tombstone. Applied to Social Forests' domain:

- The **forest** (and, at larger scale, the watershed that contains it) is a **Source-NDO**. It has no `primaryAccountable` owner. Stewards carry obligations, not alienation rights. Boundary events — planting, harvest, biomass measurement, restoration — accumulate on its Layer 0 hash. Governance adapts from that ledger.
- A **tree, timber lot, or carbon quantity** is a **Resource** yielded by that Source: inventoriable, custodied, transferable under rules.
- A **MOGNO NFT / LEAF position** is a financial instrument *derived from* those yields. It attaches to the NDO via a `CapabilitySlot::DigitalAsset` (and, later, `UnytAgreement`) without becoming the identity of the forest.

The two projects remain **deeply complementary at the infrastructure layer**, have **significant conceptual convergences** (both invented similar two-layer asset models independently; both treat the physical system as something you measure at the boundary rather than fully model), and have **six irreconcilable exclusion zones** where they do the same job in architecturally incompatible ways. The sixth — ontological category — was not nameable in the April 2026 draft. It is now the deepest structural split: Social Forests makes the tree an RWA; Nondominium makes the forest a Source.

---

## 2. Project Overviews

### 2.1 Social Forests Protocol

| Dimension | Detail |
| --- | --- |
| **Network** | Stellar Soroban (WASM smart contracts, global ledger) |
| **RWA type** | African Mahogany tree (*Khaya senegalensis*), Brazil/Ceará |
| **Token** | LEAF (SEP-41 fungible, 100M cap) + MOGNO (fractional NFT, 0.001–0.1 MOGNO) |
| **Business model** | B2B2C — companies buy ESG impact via Stripe; consumers earn green cashback |
| **Governance** | Admin-key controlled (Phase 1); $FLORA DAO planned (Phase 3) |
| **Oracle** | Proof of Flourishing (PoF) — AI + satellite biomass/carbon validation |
| **Physical supply chain** | Viveiro Maravilha (seedlings) → field growth → Sómogno (processing) → Pecém Port (export) |
| **Status** | Phase 1 — Testnet; contracts `rwa_vault`, `sbt_reputation`, `hero_journey` in development |

**Core loop:** Company enters via Stripe → buys RWA fractions → configures green cashback → consumer earns LEAF tokens via missions → consumer burns LEAF to forge NFT → NFT represents real tree fraction → oracle validates physical growth annually → company earns ESG badge.

**Three smart contracts:**

- `rwa_vault` (MognoVault): LEAF token mint/burn, B2B investment with community fund split, supply cap enforcement.
- `sbt_reputation`: Soulbound (non-transferable) impact points distributed by verified companies to consumers.
- `hero_journey`: NFT forging, rarity evolution (Plantador → Cultivador → Guardiao → Protetor → Lenda), annual tree growth records (`TreeAnnualRecord`), B2B mission pools, ESG Merkle root bridge (Vereda.Verify).

**Architecturally notable:** The `hero_journey` contract explicitly decouples Rarity (user commitment — driven by LEAF burned) from `TreeAnnualRecord` (physical tree growth — written by the oracle). A Plantador NFT can represent a 10-year-old tree. This is a deliberate and sophisticated design choice.

### 2.2 Nondominium — NDO, Resource, and Source

| Dimension | Detail |
| --- | --- |
| **Network** | Holochain (agent-centric DHT, no global ledger) |
| **What can be an NDO** | Any Resource (Physical, Digital, Service, Hybrid, Information) **or** a **Source** (generative ecological / knowledge system) |
| **Identity anchor** | `NondominiumIdentity` (Layer 0) inside a **cloned `ndo` cell per NDO**. Permanent identity is the cell's `DnaHash`, bound to immutable classification fields via DNA properties (ADR-010 / ADR-013). Deletes are always invalid. |
| **Holarchy** | Lobby DHT (federation entry) → Group cloned cells → NDO cloned cells. Groups discover NDOs via `NdoAnchor`. Cross-NDO composition via `NdoHardLink` (`Component`, `DerivedFrom`, `Supersedes`). |
| **Economic model** | ValueFlows 1.0 (Agent + Resource, via hREA DNA). **Post-MVP Source profile:** `vf:Source` as a third flow endpoint, plus `extract` / loading / regeneration boundary events. |
| **Governance** | Ostromian `GovernanceRule` — specified as evaluated before every state transition (Governance-as-Operator: specified, not yet coded). Source-NDOs add an **adaptive loop**: boundary events → ledger → ecological interpretation → rule revision → conditioned access. |
| **Accountability** | PPR (`PrivateParticipationClaim`) — bilateral cryptographic, 16-category, non-deletable (prototype issuance; privacy-preserving storage still incomplete). |
| **Property regimes** | Seven variants: Private, Commons, Collective, Pool, CommonPool, Public, **Nondominium**. Source-NDOs may only be `Nondominium` or `CommonPool`. |
| **Status** | Layer 0 + Lobby/Group/NDO holarchy **implemented**. Layers 1–2 activation links, CapabilitySlots, Governance-as-Operator, and Source-NDO (`SourceProfile`, `vf:Source`) are **specified, not yet in code**. |

**Three ontological categories** (Source-enabled applications):

```
AGENT     — acts, intends, commits, bears responsibility
RESOURCE  — appropriable, inventoriable output (timber, water m³, a tool, a carbon lot)
SOURCE    — generative system that yields Resources, receives effects,
            conditions other Sources; not owned, not an agent
```

Ostrom's SES mapping is direct: Source = *resource system*; Resource = *resource unit*; `GovernanceRule` = *governance system*; Agents (+ `Steward` role) = *users*.

**The NDO three-layer model** (same layers for Resource-NDOs and Source-NDOs):

```
Layer 2 — PROCESS       (EconomicEvents, Commitments, PPRs; for Sources: boundary events)
     ↑ activated by NDOToProcess link
Layer 1 — SPECIFICATION (ResourceSpecification + GovernanceRules;
                         for Sources: SourceSpecification + ecological value vector)
     ↑ activated by NDOToSpecification link
Layer 0 — IDENTITY      (NondominiumIdentity — permanent;
                         for Sources: + linked SourceProfile)
```

**A Ceará mahogany forest as Source-NDO** (the object Social Forests financializes *from*):

- **Layer 0:** `NondominiumIdentity` — name, `PropertyRegime::Nondominium`, `ResourceNature::Physical`, `LifecycleStage` (governance maturity of the NDO artefact). Linked `SourceProfile`: `SourceType::Biological`, `complex_interior: true`, `regime_state` (Pristine → Transformed), stock / flux / assimilation / resilience / tipping threshold, `stewarded_by` (obligations, never ownership). Permanent. Undeletable. No `primaryAccountable`.
- **Layer 1:** `SourceSpecification` — spatial boundary, species mix, monitoring plan, access-affordance templates (harvest quotas, restoration-per-extraction, seasonal closures), ecological value vector (Sustenance, Regeneration, Resilience, Adaptive Capacity, Generative Capacity, Commons Value, Learning Value).
- **Layer 2:** Boundary `EconomicEvent`s — `extract` (timber, seedlings leaving the nursery), loading (agrochemical runoff into a coupled river Source), `raise` / regeneration (replanting, riparian restoration). PPRs for stewardship, monitoring, and restoration work.

**What the forest *yields*** (these are Resources, and these are what can become RWAs):

- Seedling lots, standing timber, processed mahogany, kg CO₂ — `EconomicResource` instances with `accounting_quantity` / `onhand_quantity`, custodian, `OperationalState`.
- Source-to-Source coupling: the forest **conditions** a river / watershed Source (infiltration, flow stability). A watershed Source **yields** the forest as a sub-Source.

**Capability surface** (specified, not yet coded): `CapabilitySlot::DigitalAsset` on Layer 0 is the designed attachment point for Social Forests' Stellar NFT / vault contract address. `UnytAgreement` is the later settlement-attachment point. Neither slot *is* the forest.

---

## 3. Convergences — Where Both Projects Arrived Independently at the Same Design

These are structural homologies: places where the two projects, working independently on different stacks, invented the same solution.

### 3.1 The Two-Layer Asset State Model — now three on the NDO side

This remains the most striking convergence.

**Social Forests** explicitly separates Rarity (user commitment) from `TreeAnnualRecord` (physical reality). The contract code comment reads: *"This rarity represents the USER's effort (leaves burned), NOT the age or growth stage of the physical tree."*

**Nondominium** explicitly separates `LifecycleStage` (on `NondominiumIdentity`, the resource's or Source-NDO's maturity as a *social / governance artefact*) from `OperationalState` (on `EconomicResource`, the current physical/operational condition of a *unit*). Source-NDOs add a third orthogonal dimension: **`SourceRegimeState`** on `SourceProfile` — ecological condition of the generative system (Pristine, Stable, Stressed, Degraded, Critical, Transformed). That third dimension has no counterpart in Social Forests' NFT identity; it is closest to fields *inside* `TreeAnnualRecord` (health, carbon, height), which NDO would treat as condition signals on the Source, not as attributes of a token.

Both projects discovered that a real-world ecological asset has (at minimum) two orthogonal state dimensions: **the social/commitment state** and **the physical/material state**. Neither can be reduced to the other. NDO now says there are *three* for a forest: artefact maturity, unit condition, and Source regime.

| Dimension | Social Forests | Nondominium |
| --- | --- | --- |
| Social / commitment state | Rarity (Plantador → Lenda) | `LifecycleStage` (Ideation → Active → EndOfLife) — maturity of the NDO artefact |
| Physical / material state (unit) | `TreeAnnualRecord` (height, carbon, health) | `OperationalState` + `EconomicEvent` history on yielded Resources |
| Ecological regime (system) | Implicit in oracle records; not a first-class object | `SourceRegimeState` on `SourceProfile` (governance-validated) |
| Who writes social state | User (burns LEAF) | Governance (validated transitions; MVP: initiator-only) |
| Who writes physical / regime state | Oracle (PoF, AI + satellite) | Custodian (units) / Stewards + validators (Source condition) |
| Decoupled? | ✅ Explicitly | ✅ By design |

### 3.2 Non-Transferable Contribution Records

**Social Forests:** `SoulboundNonTransferable` — `transfer_reputation` always panics. Impact points accumulate per address, cannot be moved. Enforced at the smart contract level.

**Nondominium:** PPR entries are private, bilaterally signed, and permanently immutable. Deleting a Person is invalid. The protocol makes it architecturally impossible to erase contribution history. For Source-NDOs, stewardship (monitoring, restoration, rule compliance, succession) is PPR-eligible — standing accrues from contribution to Source *health*, not from token burn.

Both projects independently concluded that contribution records must be soul-bound to their author. Neither allows reputation laundering.

### 3.3 Validation-Gated State Transitions

**Social Forests:** PoF oracle must validate physical growth before tokens are minted. `admin_mint` is gated by oracle confirmation. Tree records require the oracle's admin signature.

**Nondominium:** Every lifecycle transition is specified to be gated by `zome_gouvernance` evaluating `GovernanceRule` entries. Prototype → Stable requires N-of-M peer validation (`Accept` action). Source-NDO `SourceRegimeState` transitions (e.g. Stable → Stressed) MUST be governance-validated with evidence — not a unilateral write, and not an admin key. (Governance-as-Operator evaluation is specified, not yet coded; MVP lifecycle updates are initiator-only.)

Both require external validation before economic state advances. The oracle in Social Forests maps to the validator / steward network in Nondominium — with the difference that NDO treats the oracle as *one kind of agent among others*, not as a privileged writer.

### 3.4 Permanent, Undeletable Identity Anchors

**Social Forests:** NFT IDs are permanent on-chain (no burn mechanism for the NFT identity itself; burning the NFT via the evolution mechanic transforms it, not deletes it).

**Nondominium:** `NondominiumIdentity` deletion is always invalid. Person entries cannot be deleted. Per-NDO cloned cells bind immutable classification (name, property regime, resource nature) into the `DnaHash` itself: changing those fields is a different network, not an edit (ADR-013). Source-NDOs use the same permanence: the forest's Layer 0 hash is the ledger of every extraction, loading, and restoration event for as long as the record exists, including as an EndOfLife tombstone.

Both treat the identity anchor as something that must outlive any particular use of the asset.

### 3.5 Quantity Duality (Accounting vs Physical)

**Social Forests:** MOGNO fraction (`mogno_fraction_for_rarity`) represents the on-books ownership share; `TreeAnnualRecord` carries the physical quantity (height, `carbon_kg`). These are separate fields, separately updated.

**Nondominium:** `EconomicResource` has both `accounting_quantity` (committed / on-books) and `onhand_quantity` (physically available). VF 1.0 compliance requires both. For a Source, a further split appears: **unit quantities** live on yielded Resources; **system quantities** (`current_stock`, `flux_rate`, `assimilation_capacity`) live on `SourceProfile` and are debited/credited by boundary events. Token fractions are a third quantity, and they do not belong on the Source.

### 3.6 Black-Box Measurement of a Complex System

**Social Forests' PoF** does not attempt to simulate the mahogany stand's interior (mycorrhizae, understory, hydrology). It observes periphery: satellite biomass, carbon, annual growth. The oracle writes a boundary record.

**Source-NDO** states the same epistemic rule as architecture: `complex_interior: true`. Stewards do not model the forest's full interior. They record boundary events, sense regime, and adapt governance (Ashby; Cynefin probe–sense–respond; Holling / Panarchy). The PoF feed is, in NDO terms, one class of monitoring input among others — including qualitative and community-validated observations (REQ-SOURCE-GOV-07).

Both projects independently refused the high-modernist fantasy of a complete ecological twin as a precondition for action.

---

## 4. Complementarities — Where Each Project Fills the Other's Gap

### 4.1 Infrastructure Layers (Non-Overlapping)

Social Forests provides what Nondominium does not have:

- **DeFi rails** — Stellar's AMM, secondary marketplace, USDC/USDT liquidity
- **Fiat on-ramp** — Stripe MPP (Master Payment Platform) for institutional B2B entry
- **NFT standard** — SEP-41, tradeable fractional ownership
- **Carbon credit tokenization** — C-CRED/C-DEBT accounting (planned Phase 3)
- **Export infrastructure** — Pecém Port, physical supply chain from seedling to export
- **Oracle product** — PoF as a working (or near-working) measurement pipeline

Nondominium provides what Social Forests does not have:

- **Source primitive** — an honest object for the forest as resource *system*, so extraction is not a phantom `raise` and the stand is not assigned a fictional owner
- **Governance distribution** — `GovernanceRule` evaluated before every action; no master admin key required (specified invariant; operator path not yet coded)
- **Rich agent identity** — layered individual/person model, field-level capability grants, portable credentials, W3C DID via Flowsta (specified)
- **Contribution accounting** — ValueFlows-compliant EconomicEvents, effort tracking, commitment history; stewardship PPRs
- **Commons governance** — Ostromian rules, property-regime taxonomy, non-alienable Nondominium regime; adaptive loop for complex Sources
- **Holonic composition** — Lobby → Group → NDO cells; NDOs compose via `NdoHardLink`; a watershed Source can yield a forest Source which yields timber Resources

**Integration scenario:** A forest estate registered as a Source-NDO (stewardship, regime state, contribution accounting, coupling to a watershed) could have its *tokenizable yields* — tree fractions, carbon lots — issued via Social Forests' `rwa_vault` on Stellar (DeFi, cashback, ESG). The Source-NDO provides the governance and accountability layer for the *system*. Social Forests provides the financial layer for *instruments derived from yields*. `CapabilitySlot::DigitalAsset` on the Source (or on a child Resource-NDO for a specific stand / vintage) is the designed attachment point for the Stellar NFT.

**Directional asymmetry — which expansion is easier?** NDO expanding toward Social Forests' complementary capabilities is still architecturally easier than the reverse. NDO already has a designed bridge surface — `CapabilitySlot::DigitalAsset` — whose purpose is to reference an external digital asset (including a Stellar contract address) without NDO implementing DeFi. Unyt (`UnytAgreement` slot) is the in-family settlement path for the same job. The expansion is additive: NDO's governance-as-operator invariant is untouched; financial instruments live elsewhere.

Social Forests expanding toward NDO's complementary capabilities is the harder direction. Distributed governance without an admin override, private bilateral contribution records, non-alienable property regimes, and a **non-ownable Source** are not features that bolt onto Stellar. They conflict with global shared state, a public ledger, admin-key trust, and the RWA premise that the tree *is* the token. Social Forests' own roadmap acknowledges part of this: Phase 3's DAO transition is where they would rebuild governance from scratch. NDO is already what that DAO would need to become — and Source-NDO is already what the *forest object* in that DAO would need to be.

The practical first integration move remains NDO-led: register the forest as a Source-NDO first, attach the Stellar contract via `CapabilitySlot`, and let Social Forests remain the financial interface without requiring changes to its current architecture.

### 4.2 Governance Evolution

Social Forests' governance roadmap explicitly targets DAO transition in Phase 3 ($FLORA governance token). The current admin-key model is acknowledged as temporary.

Nondominium's governance layer is designed to be exactly what Social Forests would transition to: role-based access, rules evaluated before transitions, N-of-M validation for sensitive operations. For a forest, that layer is **adaptive**: quotas, restoration obligations, and seasonal closures revise as `SourceRegimeState` and the event ledger change — not a one-shot constitution.

**Complementarity:** Social Forests' Phase 3 DAO could be built on Nondominium's `GovernanceRule` infrastructure. The $FLORA token could be a `ResourceSpecification` with `medium_of_exchange: true` on the NDO side, with allocation governed by contribution-based access (PPR → `ReputationSummary` → governance participation), including stewardship PPRs from local monitors and restoration crews. PoF becomes a `ValidationReceipt` issuer — a recognized validator role — not a bypass of the operator.

### 4.3 Consumer Identity vs. Agent Identity

Social Forests treats consumers as Stellar wallet addresses + SBT impact point accumulators. There is no composable consumer profile, no portable reputation beyond the single contract, no cross-protocol identity.

Nondominium's agent model (even in MVP form) provides: field-level capability grants, multi-device support, permanent Person anchors, role-based access, and a roadmap to Flowsta-based W3C DID portability (`FlowstaIdentity` CapabilitySlot on the `Person` hash). Source-enabled applications add a **`Steward`** functional role: obligations without alienation rights, distinct from `PrimaryAccountableAgent` custody of timber lots.

**Complementarity:** Social Forests consumers could have their LEAF/SBT history attributed to a Nondominium Person (via `CapabilitySlot::FlowstaIdentity` or `DigitalAsset`). Their Nondominium PPR reputation could then be used as a governance signal in Social Forests' DAO phase — e.g., active contributors and forest stewards (algorithmically derived from PPR activity) get governance weight, not just token holders.

### 4.4 Carbon Measurement vs. Resource and Source Accounting

Social Forests has specific, oracle-validated carbon data: `carbon_kg` in `TreeAnnualRecord`, carbon credits derived from leaf circulation.

Nondominium has generic, ValueFlows-compliant quantity tracking: `QuantityValue { has_numerical_value: f64, has_unit: ActionHash }`. With a Unit of `{ label: "kilogram CO2", symbol: "kgCO2" }`, Nondominium can track carbon as an `EconomicResource` quantity *yielded by* the forest Source. It has no oracle infrastructure of its own. Source-NDO additionally records whether sequestration is a *system condition* (flux / generative capacity on `SourceProfile`) or an *appropriated credit* (a Resource that can be sold). Collapsing those two is how carbon markets greenwash: they sell the instrument as if it were the forest.

**Complementarity:** Social Forests' PoF oracle generates trusted physical measurements. Nondominium's `ResourceValidation` + `ValidationReceipt` (and Source monitoring-obligation rules) provide the peer-reviewed audit trail. Together: oracle produces the raw data; NDO governance validates and records it — as a boundary event on the Source *and/or* as a `Modify` / quantity update on a carbon Resource, depending on whether the number describes system condition or an appropriated unit.

### 4.5 B2B ESG vs. Commons / Source Governance

Social Forests' B2B model serves institutional buyers who need verifiable ESG compliance for regulatory and marketing purposes. The ESG Merkle root (`set_esg_merkle_root`) enables auditable certification.

Nondominium's commons governance serves communities managing shared resource *systems* under Ostromian rules — not corporations buying carbon offsets. Source-NDO makes that distinction executable: the forest is not for sale; services *derived from* its yields can be.

**Complementarity:** These are different customer segments that can coexist around the same physical forest. The forest is governed as a Source (NDO side: `Nondominium` regime, `stewardedBy`, `GovernanceRules`, PPR-based contribution accounting among local stewards). Its carbon sequestration *credits* — Resources yielded, not the Source itself — are sold to institutional ESG buyers via Social Forests' B2B pipeline. Local stewards earn from the cashback model while retaining governance control via NDO's non-alienable property regime. Harvest of mahogany for export is an `extract` event against the Source, gated by access affordances (quota, restoration obligation), not a mint of the forest's identity.

### 4.6 Source Ledger vs. RWA Market (new)

Social Forests is strong at making a tree fraction *liquid*. Nondominium (Source profile) is strong at making a forest *accountable as a system*: depletion visible, pollution visible, regeneration visible, coupling to watershed visible.

Neither job replaces the other. A liquid NFT with no Source ledger can still hide over-extraction behind a healthy-looking token. A Source ledger with no market rails can still leave stewards unpaid. The complementarity is: **NDO records what happened to the system; Social Forests prices claims on yields.**

---

## 5. Zones of Exclusion — Where Both Do the Same Thing Incompatibly

These are the places where a joint deployment must choose one model and abandon the other. They cannot be run simultaneously for the same object without producing contradictions.

### 5.1 ⛔ RWA / Source Identity Model

| | **Social Forests** | **Nondominium** |
| --- | --- | --- |
| **Identity anchor** | NFT `nft_id: u32` (counter, integer, mutable rarity) | `NondominiumIdentity` in a cloned cell; network identity = `DnaHash` (immutable classification) |
| **What the identity *is*** | A property of the current owner's commitment level (rarity evolves) | A property of the object itself. For a forest: a **Source** — unowned. For timber: a Resource. |
| **Permanence** | NFT can be evolved / transformed (rarity changes) | Identity immutable after creation; `lifecycle_stage` and Source condition are the mutable faces |
| **Deletion** | No explicit burn for identity (transformation only) | Explicitly always invalid to delete |
| **What it carries** | Owner address, rarity, MOGNO fraction | Name, property regime, resource nature, initiator, lifecycle; SourceProfile: regime, stewards, stock/flux |

**Why incompatible:** The NFT model treats identity as a property of the current owner's commitment level. The NDO model treats identity as a property of the object, independent of any owner — and for a forest, forbids an owner altogether (REQ-SOURCE-ONT-02). A tree cannot simultaneously be a `u32` NFT (whose meaning changes when the owner burns LEAF) and a Source-NDO (whose meaning is fixed at creation and whose regime forbids alienation). Deploying both as *the identity of the same forest* produces two divergent truths about what the forest *is*. The resolution is not a merge: the NFT may identify a *claim on a yield*; the Source-NDO identifies the *system*.

### 5.2 ⛔ Contribution / Reputation Record

| | **Social Forests (`sbt_reputation`)** | **Nondominium (PPR)** |
| --- | --- | --- |
| **Type** | `i128` integer counter per address | Structured entry with 16 categories, performance metrics |
| **Directionality** | Unilateral (company distributes to user) | Bilateral (both parties sign) |
| **Privacy** | Public on-chain (Stellar storage) | Private by default (Holochain private entry) |
| **Portability** | Non-transferable but permanently public | Non-transferable and private (agent-controlled disclosure) |
| **Semantics** | "How much green cashback you received" | "What you did, how well, with whom, in what category" — including stewardship of a Source |

**Why incompatible:** Both claim to be the system of record for a user's contribution to a sustainability mission. The SBT is a public accumulator of cashback; the PPR is a private bilateral receipt of work and care. They encode different answers to "what counts as a contribution." Deploying both for the same action creates two incompatible contribution records with no canonical resolution. A joint deployment should pick PPR as the contribution record and treat SBT as a *derived marketing / cashback counter* — or the reverse, and accept that stewardship quality is invisible.

### 5.3 ⛔ Governance Access Control

| | **Social Forests** | **Nondominium** |
| --- | --- | --- |
| **Model** | Single admin key controls: pause, mint, oracle, company whitelist | `GovernanceRule` evaluated by `zome_gouvernance` before every state transition |
| **Override** | Admin can call any function at any time | No transition possible without rule evaluation; no admin bypass |
| **Company verification** | `register_company` / `revoke_company` (admin-only) | `GovernanceRule::AccessRequirement` + role-based `CapabilityLevel`; Source access affordances (quotas, restoration-per-extract) |
| **Trust assumption** | Admin key holder is trusted | No single point of trust; rules are evaluated, not bypassed |
| **Source-specific** | n/a | Precautionary blocking at `tipping_threshold`; regime transitions multi-validated |

**Why incompatible:** Nondominium's non-negotiable boundary is that `zome_gouvernance` evaluates rules before any economic action — this is described as non-negotiable. It enables swappable governance without touching the data model. An admin key that can directly mint, pause, or whitelist is architecturally incompatible with this invariant. You cannot graft Social Forests' admin model onto NDO governance — least of all onto a Source-NDO, whose entire point is that no agent can own or override the forest. Social Forests may keep an admin key *on the financial contracts* (the outside); it cannot be the governor of the Source.

### 5.4 ⛔ Lifecycle Progression Semantics

| | **Social Forests (Rarity)** | **Nondominium (`LifecycleStage`)** | **Nondominium (`SourceRegimeState`)** |
| --- | --- | --- | --- |
| **What progresses** | The **owner's commitment** (LEAF burned) | The **artefact's maturity** (peer-validated) | The **system's ecological regime** |
| **Who triggers** | User voluntarily burns tokens | Governance evaluates agent-submitted transition | Stewards + validators, with evidence |
| **Reversible?** | No (no downgrade mechanic) | Yes — any stage can go to Hibernating; can return | Yes — both directions, governance-validated |
| **External validation** | Not required for rarity evolution | Required for Prototype → Stable (N-of-M) | Required for every regime change |
| **Terminal state** | Lenda (maximum commitment) | EndOfLife (tombstone) | Transformed (post-regime-shift) or EndOfLife (collapse) |

**Why incompatible:** These progressions answer different questions. Social Forests asks "how committed is this owner?" NDO `LifecycleStage` asks "how mature is this governance object?" NDO `SourceRegimeState` asks "how is this forest doing?" Representing Rarity as `LifecycleStage` would erase owner-commitment semantics. Representing `LifecycleStage` or `SourceRegimeState` as Rarity would erase peer validation, reversibility, and ecology. They cannot be merged. In a joint deployment, Rarity stays on the NFT; `LifecycleStage` stays on the NDO artefact; `SourceRegimeState` stays on the forest.

### 5.5 ⛔ Execution Environment

| | **Social Forests** | **Nondominium** |
| --- | --- | --- |
| **Platform** | Stellar Soroban (WASM, global ledger, EVM-adjacent) | Holochain (agent-centric DHT, no global consensus) |
| **State model** | Global shared state (all nodes agree) | Agent-owned source chains + local DHT shards; one cloned cell per NDO |
| **Contract calls** | Synchronous cross-contract calls (Soroban) | Async cross-zome / cross-DNA calls (Holochain) |
| **Token standard** | SEP-41 (Stellar) | No native token standard (ValueFlows via hREA; Unyt settlement specified) |
| **DeFi interop** | Native (Stellar DEX, USDC, AMM) | None natively (`CapabilitySlot` / Unyt bridge planned) |

**Why incompatible:** A Soroban contract cannot call a Holochain zome. A Holochain DHT entry cannot be read by a Soroban contract. The two platforms have fundamentally different execution models (global consensus vs. agent-local validation), different storage models (contract storage vs. source chain + DHT), and different token semantics (fungible global balance vs. ValueFlows `EconomicResource` / Source boundary event). Any integration requires an explicit bridge layer — it cannot be implicit.

### 5.6 ⛔ Ontological Category (new)

| | **Social Forests** | **Nondominium (Source profile)** |
| --- | --- | --- |
| **What the forest is** | A bundle of tokenizable trees (RWAs) | A **Source**: generative, non-ownable, black-boxed |
| **What the tree is** | The RWA | Either a Resource unit yielded by the Source, or a measurement target — not an owner-keyed identity |
| **Ownership** | Fractional NFT ownership of the tree | Forbidden on the Source (`Nondominium` / `CommonPool` only). Ownership, if any, applies to *yields* (timber lots, credits) under governance |
| **Economic event for harvest** | Implicit in supply chain / mint | `extract` from Source → Resource in an Agent's custody; Source `current_stock` decrements |
| **Primary accountable** | Token owner / admin | None on the Source; `stewardedBy` obligations |

**Why incompatible:** This is the exclusion the April draft could only phrase as philosophy. ValueFlows 1.0 has Agent and Resource. Modeling a forest as `EconomicResource` forces a `primaryAccountable` — the inverse of the Nondominium regime — and makes harvest a `raise` (resource-from-nowhere) unless a fictional stock is pre-minted. Modeling it as an Agent attributes intention it does not have. Social Forests' RWA *is* that first fiction, made liquid: the tree is owned because the token is owned. Source-NDO exists specifically to refuse that fiction. You can sell claims on yields. You cannot, on the NDO side, sell the Source. A joint deployment that registers "the forest" as both NFT collection and Source-NDO without a yield/instrument boundary will contradict REQ-SOURCE-ONT-02 on day one.

---

## 6. Integration Architecture Proposals

Given the above analysis, three integration patterns remain feasible. All three now assume the forest is a Source-NDO, not an RWA.

### 6.1 Source-NDO as Governance Layer, Social Forests as Financial Layer

```
Physical forest (Ceará mahogany stand)
       │
       ▼
Source-NDO  (Holochain cloned cell; DnaHash identity)
  ├── SourceProfile (Biological, regime_state, stock/flux, stewardedBy)
  ├── GovernanceRules (quotas, restoration-per-extract, monitoring obligations)
  ├── Boundary EconomicEvents (extract, loading, regeneration)
  ├── PPRs (bilateral accountability among local stewards)
  ├── Coupling → Watershed Source (forest conditions hydrology)
  └── CapabilitySlot::DigitalAsset ──────────────────────────────┐
                                                                  │
                                                                  ▼
                                                    rwa_vault on Stellar
                                                    ├── LEAF tokens (consumer cashback)
                                                    ├── MOGNO NFT fractions (claims on yields)
                                                    └── CompanyBadge (ESG certification)
```

The Source-NDO anchors governance and contribution accounting for the stewards managing the forest. Social Forests handles tokenization, DeFi, and B2B ESG sales of *derived instruments*. The NFT is not the forest. `CapabilitySlot::DigitalAsset` links the Source (or a child Resource-NDO for a vintage / plot) to the Stellar contract address.

Harvest / export (Viveiro → field → Sómogno → Pecém) appears on the NDO side as `extract` events against the Source, producing timber Resources whose custody can move through the physical chain. Minting MOGNO is a financial event about those yields, not a second identity for the stand.

### 6.2 Social Forests' Phase 3 DAO Built on NDO Governance

Replace Social Forests' admin key *for forest governance* with an NDO governance layer (the financial contracts may retain operational keys):

- $FLORA token becomes an NDO `ResourceSpecification` with `medium_of_exchange: true`
- Token holder governance weight derived from NDO `ReputationSummary` (PPR-based contribution, including stewardship) rather than token count alone
- Company verification (`register_company`) becomes a `GovernanceRule::AccessRequirement` evaluated by NDO's `zome_gouvernance`
- PoF oracle becomes a `ValidationReceipt` issuer — a recognized validator / monitoring agent within the NDO's agent model, feeding `SourceProfile` condition updates
- Harvest, mint, and ESG badge issuance become downstream of Source access affordances (quota not exceeded, restoration committed, regime not past `tipping_threshold`)

### 6.3 Shared Consumer / Steward Identity via Flowsta DID

Social Forests consumers (and, separately, local stewards) get a Flowsta W3C DID. This DID is simultaneously:

- The identity behind their Stellar wallet (Social Forests' LEAF/SBT holder)
- A `FlowstaIdentity` CapabilitySlot on their NDO Person entry

Their LEAF/SBT history is then attributable to their NDO agent identity, enabling:

- Portable reputation across protocols
- Affiliation state derivation (active/core affiliate based on mission completion *and* stewardship PPRs)
- Governance weight in any NDO-governed Source that chooses to recognize Social Forests participation as contribution evidence — without making cashback the definition of contribution

---

## 7. Summary Table

| Dimension | Social Forests | Nondominium | Relationship |
| --- | --- | --- | --- |
| **What the forest is** | Bundle of tokenizable trees (RWA) | **Source** (generative, unowned) | ⛔ Exclusion |
| **RWA / unit identity** | NFT id (`u32`, owner-evolving) | Resource-NDO / `EconomicResource` yielded by the Source; `DnaHash` + `NondominiumIdentity` | ⛔ Exclusion (if used as forest identity) |
| **Two-/three-layer asset model** | Rarity + `TreeAnnualRecord` | `LifecycleStage` + `OperationalState` + `SourceRegimeState` | ✅ Convergence |
| **Black-box measurement** | PoF (satellite / AI at the boundary) | `complex_interior` + boundary-event ledger | ✅ Convergence |
| **Non-transferable reputation** | SBT (public, unilateral) | PPR (private, bilateral; stewardship-eligible) | ⛔ Exclusion |
| **Validation-gated transitions** | PoF oracle required | N-of-M peer / steward validation required | ✅ Convergence |
| **Permanent identity anchors** | NFT permanence | Layer 0 undeletable; `DnaHash` binding | ✅ Convergence |
| **Governance model** | Admin key (Phase 1) / DAO (Phase 3) | `GovernanceRule` (distributed, evaluated) + Source adaptive loop | ⛔ Exclusion |
| **Lifecycle progression** | Owner commitment (Rarity) | Artefact maturity (`LifecycleStage`) ≠ ecological regime | ⛔ Exclusion |
| **Execution environment** | Stellar Soroban | Holochain DHT (Lobby / Group / per-NDO cells) | ⛔ Exclusion |
| **Financial instruments** | LEAF, MOGNO NFT, AMM, Stripe | Unyt Agreement stub, no native DeFi; `DigitalAsset` / `UnytAgreement` slots | 🔄 Complementary |
| **Supply chain** | Full (seedlings → export) | None natively; `extract` + custody events can *record* it | 🔄 Complementary |
| **Agent / consumer identity** | Wallet address + SBT counter | Layered identity + PPR + DID; `Steward` role | 🔄 Complementary |
| **Carbon measurement** | Oracle-specific (PoF, kgCO2) | Generic `QuantityValue` + Source flux / generative capacity | 🔄 Complementary |
| **B2B / institutional layer** | Stripe MPP, ESG badge, C-DEBT | None natively | 🔄 Complementary |
| **Commons / Source governance** | None (DAO stub) | Ostromian rules, Nondominium regime, adaptive Source loop | 🔄 Complementary |
| **Holonic composition** | Single-asset / collection contracts | Lobby → Group → NDO; Source yields Source; `NdoHardLink` | 🔄 Complementary |

**Legend:** ✅ Convergence (independently invented the same solution) · 🔄 Complementary (fills the other's gap) · ⛔ Exclusion (mutually incompatible for the same object)

---

## 8. Conclusion

Social Forests and Nondominium are **not competitors**. They serve different actors (B2B2C market participants vs. commons stewards), run on different infrastructure (Stellar vs. Holochain), and have different economic philosophies (programmable prosperity vs. contribution-based commons governance).

Their convergences are intellectually significant: two independent teams building on different stacks both arrived at a two-layer asset state model, permanent non-transferable contribution records, validation-gated transitions, and a refusal to fully model the interior of a living stand. This suggests these patterns are **load-bearing solutions to real problems** in ecological-economic infrastructure, not implementation accidents.

Their complementarities are practically significant: a forest that needs both commons / Source governance (for the stewards) and carbon-market access (for institutional ESG buyers) needs both protocols. NDO provides the governance and accountability substrate for the *system*; Social Forests provides the financial and commercial rails for *claims on yields*. The CapabilitySlot surface on NDO Layer 0 is the designed integration point.

Their exclusion zones are real but bounded: they concern identity models, governance models, reputation models, lifecycle semantics, execution environments, and — now explicitly — **ontological category**. A joint deployment must choose one model in each exclusion zone. The most natural resolution is **Source-NDO for the forest (the inside)** and **Social Forests for financialization of yields (the outside interface to markets)**, with an explicit bridge at the boundary. Do not register the forest as an NFT collection *and* as a Source without that split.

The deepest tension is philosophical: Social Forests makes nature profitable to protect it. Nondominium makes nature ungovernable-for-extraction to protect it. These are not the same bet about how change happens — but they are not mutually exclusive bets either, **once the object of each bet is named correctly**. A forest stewarded as a Source-NDO can still have carbon sequestration *credits* sold commercially via Social Forests. The NDO's `PropertyRegime::Nondominium` (uncapturable, contribution-based access, no alienation, `stewardedBy` not `primaryAccountable`) governs who can steward the forest. Social Forests' RWA mechanism governs who can own a financial instrument *derived from* the forest's yields. These can coexist if the boundary between Source and instrument is kept explicit and respected.

**The philosophical / economic approach between these two projects runs deep.**

**Social Forests** inherits the web3 philosophy and economic paradigm: *greed, if properly framed, leads to good*.

The model is the following: you need an institution (UN + local governments) to enforce SDGs. That creates a cost for companies that exploit the resource. A percentage of that cost is passed to people and to locals who replenish the resource. The resource is an RWA. The tree *is* the token.

**Nondominium** inherits from the commons philosophy and economic paradigm: *commons, if properly governed, leads to good*.

The model is the following: no need for higher-level institutions to enforce doing good. Locals steward the commons. Access is gated by local governance associated with the object. Changes in the state of the object are governance-gated (no tree is cut if the rules are not respected). Companies must respect the rules before accessing yields. They can be bound by that governance (legal binding) to pay local agents to replenish, and those locals are also bound to do so. Accountability on both sides.

With **Source**, that object is named. The forest is not a Resource waiting to be owned. It is a generative system. Harvest is `extract`, not mint. Pollution of a coupled river is a loading event into a Source, not an externality off-ledger. Restoration is `raise` of Source condition, not a press release. The RWA, if it exists, is a claim on a yield — timber, a carbon lot, a seedling — not a title to the Source.

The source of truth differs in both cases: an oracle (a special agent) in Social Forests; locals plus other types of agents (local government, national government, agencies, scientists, indigenous knowledge holders) in Nondominium. Validation and oversight is more diversified and can be distributed in Nondominium; all agents are bound through agreements related to the Source's governance. PoF can sit inside that set as a monitor. It cannot replace it, and it cannot be the owner of the forest.

---

## Appendix — What changed in this revision

This document was originally prepared 2026-04-30, treating the NDO primitive as an RWA throughout. Comments on that draft asked that **Source** be inserted as a new primitive. This revision does that, and updates Nondominium facts that have landed since:

| Area | April 2026 draft | August 2026 |
| --- | --- | --- |
| Forest ontology | Tree as NDO-RWA | Forest as **Source-NDO**; timber / carbon as **Resources**; NFT as **instrument** |
| Identity | `NondominiumIdentity` as ActionHash | Per-NDO cloned cell; identity = `DnaHash` (ADR-010–013) |
| Architecture | Three-zome DNA, design phase | Lobby → Group → NDO holarchy implemented; Layer 0 shipped (PR #80) |
| Property regimes | Six listed | Seven (`Public` added); Sources restricted to `Nondominium` / `CommonPool` |
| State model | `LifecycleStage` vs `OperationalState` | Plus `SourceRegimeState` for Sources |
| Exclusion zones | Five | Six (ontological category) |
| Integration | CapabilitySlot::DigitalAsset | Unchanged as bridge; Source is the *inside* object the slot hangs from |
| Honesty about code | Implied more completeness | Source-NDO, CapabilitySlots, Governance-as-Operator: **specified, not implemented** |

Social Forests Protocol facts are unchanged from the April draft (Phase 1 testnet, three contracts, PoF, B2B2C loop).
