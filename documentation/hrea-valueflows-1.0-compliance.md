# hREA ValueFlows 1.0 Compliance Analysis

**Branch:** `vendor/hrea` — detached HEAD at `fc3b5e78`
**VF Spec Version:** 1.0.0 (CC-BY-SA 4.0)
**VF Ontology source:** `https://w3id.org/valueflows/ont/vf#`
**Analysis date:** 2026-03-25
**Analysts:** Soushi888, SoushAI

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Methodology](#methodology)
3. [Overall Compliance Score](#overall-compliance-score)
4. [Missing Entity Types](#missing-entity-types)
5. [Field-Level Gaps by Entity](#field-level-gaps-by-entity)
6. [Action Model Gaps](#action-model-gaps)
7. [Validation Gaps](#validation-gaps)
8. [Naming and Structural Observations](#naming-and-structural-observations)
9. [Recommendations](#recommendations)
10. [Appendix: Full Field Mapping Tables](#appendix-full-field-mapping-tables)

---

## Executive Summary

hREA `main-0.6` implements the structural core of the ValueFlows 1.0 ontology competently: the foundational economic flow cycle (Agent, EconomicResource, EconomicEvent, Process) is present and linked correctly. The planning layer (Intent, Commitment, Plan, Proposal) and the knowledge layer (ResourceSpecification, ProcessSpecification, Recipe*) are scaffolded with correct relational structure.

However, **five VF 1.0 entity classes are entirely absent**, **the Action model covers only 4 of 10 effect dimensions**, **all entry validation functions are stubs with no business rule enforcement**, and **several field-level gaps break round-trip interoperability** with other VF-compliant systems (e.g., Bonfire).

**Overall estimated compliance: ~65%**

The most consequential gap for immediate interoperability is the absence of `vf:Claim` and the missing `effortQuantity` on `EconomicEvent`. The most consequential gap for long-term correctness is the wholesale absence of validation logic.

---

## Methodology

Analysis performed by:

1. **Reading the VF 1.0 TTL ontology** via the HTML rendering at
   `http://ontprox.dev.opensourceecology.de/?uri=https://codeberg.org/valueflows/pages/raw/branch/main/assets/all_vf.TTL`
   extracting all class definitions, properties, ranges, and named individuals.

2. **Reading every Rust integrity zome struct** in
   `vendor/hrea/dnas/hrea/zomes/integrity/hrea/src/`
   cataloguing all fields and their types.

3. **Reading the coordinator zome** public function signatures in
   `vendor/hrea/dnas/hrea/zomes/coordinator/hrea/src/`

4. **Reading the action builtins** in
   `vendor/hrea/dnas/hrea/zomes/coordinator/hrea/vf_actions/src/builtins.rs`

5. **Cross-referencing** hREA struct fields against VF 1.0 property names and ranges.

No compilation or runtime testing was performed. All findings are structural (type-level) only.

---

## Overall Compliance Score

| Domain | Score | Notes |
|--------|-------|-------|
| Core entity presence | 15/20 | 5 entities absent |
| Field coverage (present entities) | ~75% | See per-entity tables below |
| Action model | 4/10 effects | Missing 6 effect dimensions |
| Validation / business rules | 0% | All stubs |
| **Overall** | **~65%** | |

---

## Missing Entity Types

These VF 1.0 classes have **no corresponding entry type** in hREA `main-0.6`.

### 1. `vf:Claim` (P0 — Critical)

**VF 1.0 definition:** "A claim for future economic event(s) in reciprocity for events already occurred."

**Key properties:**
- `vf:triggeredBy` (EconomicEvent) — the event that triggers the claim
- `vf:settles` on EconomicEvent — the event that settles an open claim

**Impact on hREA:** `ReaEconomicEvent` has no `settles` field. Any VF workflow using claim-based reciprocity (invoicing, contribution tracking in OVNs) cannot be expressed. This breaks Nondominium's planned contribution accounting workflow.

**Implementation path:** Add `ReaClaim` integrity entry type; add `settles: Option<Vec<ActionHash>>` to `ReaEconomicEvent`.

---

### 2. `vf:SpatialThing` (P1)

**VF 1.0 definition:** "Data locating something relative to Earth, usually fixed location."

**Key properties:** `latitude`, `longitude`, `altitude`, `mappableAddress`, `hasDetailedGeometry`

**Current hREA state:** All location fields across all entry types (`ReaEconomicEvent.at_location`, `ReaEconomicResource.current_location`, `ReaProcess` implied) are `Option<String>`. This is a plain text field, not a structured location object.

**Impact:** Interoperability with location-aware VF clients or Bonfire's SpatialThing support is broken. Cross-system queries on location cannot be typed.

**Implementation path:** Add `ReaSpatialThing` entry type. Replace `*_location: Option<String>` fields with `*_location: Option<ActionHash>` referencing a `ReaSpatialThing`.

---

### 3. `vf:BatchLotRecord` (P2)

**VF 1.0 definition:** "Document containing detail related to production of particular batch or lot."

**Key properties:** `batchLotCode (string)`, `expirationDate (dateTimeStamp)`

**Current hREA state:** `ReaEconomicResource.lot: Option<String>` — stores just a code string. Expiration date is not present.

**Impact:** Perishable goods tracking, pharmaceutical lot tracking, and any time-bounded batch workflow cannot express lot expiration.

**Implementation path:** Add `ReaBatchLotRecord` entry type. Change `lot: Option<String>` to `of_batch_lot: Option<ActionHash>` on `ReaEconomicResource`.

---

### 4. `vf:AgreementBundle` (P2)

**VF 1.0 definition:** "Grouping of agreements for bundled line item reciprocity."

**Current hREA state:** No equivalent. `ReaAgreement` has no `bundledIn` field.

**Impact:** Multi-party trade agreements with line items cannot be grouped. Nondominium's multi-resource governance commitments may require this.

**Implementation path:** Add `ReaAgreementBundle` entry type; add `bundled_in: Option<ActionHash>` to `ReaAgreement`.

---

### 5. `vf:ProposalList` (P2)

**VF 1.0 definition:** "Grouping of proposals for publishing."

**Current hREA state:** No equivalent. `ReaProposal` has no `listed_in` field.

**Impact:** Marketplace-style proposal catalogues (e.g., hAppenings Requests & Offers grouped by category) cannot be expressed at the VF ontology level.

**Implementation path:** Add `ReaProposalList` entry type; add `listed_in: Option<ActionHash>` to `ReaProposal`.

---

## Field-Level Gaps by Entity

### `vf:EconomicEvent` / `ReaEconomicEvent`

| VF 1.0 Property | hREA Field | Status | Notes |
|-----------------|------------|--------|-------|
| `vf:action` | `rea_action: String` | PRESENT | Naming differs (rea_ prefix) |
| `vf:provider` | `provider: Option<ActionHash>` | PRESENT | |
| `vf:receiver` | `receiver: Option<ActionHash>` | PRESENT | |
| `vf:resourceInventoriedAs` | `resource_inventoried_as: Option<ActionHash>` | PRESENT | |
| `vf:toResourceInventoriedAs` | `to_resource_inventoried_as: Option<ActionHash>` | PRESENT | |
| `vf:resourceQuantity` | `resource_quantity: Option<QuantityValue>` | PRESENT | |
| `vf:effortQuantity` | *(absent)* | **MISSING** | P0 — needed for work/service events |
| `vf:hasBeginning` | `has_beginning: Option<Timestamp>` | PRESENT | |
| `vf:hasEnd` | `has_end: Option<Timestamp>` | PRESENT | |
| `vf:hasPointInTime` | `has_point_in_time: Option<Timestamp>` | PRESENT | |
| `vf:toLocation` | `at_location: Option<String>` | PARTIAL | String only, not SpatialThing |
| `vf:fulfills` | `fulfills: Option<Vec<ActionHash>>` | PRESENT | |
| `vf:satisfies` | `satisfies: Option<Vec<ActionHash>>` | PRESENT | |
| `vf:realizationOf` | `realization_of: Option<ActionHash>` | PRESENT | |
| `vf:reciprocalRealizationOf` | *(absent)* | **MISSING** | Needed for bilateral exchange events |
| `vf:corrects` | `corrects: Option<ActionHash>` | PRESENT | |
| `vf:settles` | *(absent)* | **MISSING** | Blocked by missing Claim entity |
| `vf:triggeredBy` | `triggered_by: Option<ActionHash>` | PRESENT | Causal event chain |
| `vf:inScopeOf` | `in_scope_of: Option<Vec<ActionHash>>` | PRESENT | |
| `vf:inputOf` | `input_of: Option<ActionHash>` | PRESENT | |
| `vf:outputOf` | `output_of: Option<ActionHash>` | PRESENT | |

**Gaps:** `effortQuantity` (P0), `reciprocalRealizationOf` (P1), `settles` (blocked by Claim).
Extra hREA field: `agreed_in: Option<String>` — not in VF 1.0 ontology.

---

### `vf:EconomicResource` / `ReaEconomicResource`

| VF 1.0 Property | hREA Field | Status | Notes |
|-----------------|------------|--------|-------|
| `vf:conformsTo` | `conforms_to: Option<ActionHash>` | PRESENT | |
| `vf:trackingIdentifier` | `tracking_identifier: Option<String>` | PRESENT | |
| `vf:accountingQuantity` | `accounting_quantity: Option<QuantityValue>` | PRESENT | |
| `vf:onhandQuantity` | `onhand_quantity: Option<QuantityValue>` | PRESENT | |
| `vf:currentLocation` | `current_location: Option<String>` | PARTIAL | String, not SpatialThing |
| `vf:currentVirtualLocation` | *(absent)* | **MISSING** | URI field for digital resources |
| `vf:currentCurrencyLocation` | *(absent)* | **MISSING** | String field for financial assets |
| `vf:primaryAccountable` | `primary_accountable: Option<ActionHash>` | PRESENT | |
| `vf:containedIn` | `contained_in: Option<ActionHash>` | PRESENT | |
| `vf:ofBatchLot` | `lot: Option<String>` | PARTIAL | Stored as string; BatchLotRecord absent |
| `vf:unitOfEffort` | `unit_of_effort: Option<ActionHash>` | PRESENT | |
| `vf:resourceClassifiedAs` | `resource_classified_as` (via conforms_to) | PARTIAL | |
| `vf:stage` | `stage: Option<ActionHash>` | PRESENT | |
| `vf:state` | `state: Option<String>` | PRESENT | |

Extra hREA fields: `name`, `image`, `note` — supplementary, not in VF core ontology.

---

### `vf:Commitment` / `ReaCommitment`

| VF 1.0 Property | hREA Field | Status | Notes |
|-----------------|------------|--------|-------|
| `vf:action` | `rea_action: Option<String>` | PRESENT | Note: optional in hREA, implied required in VF |
| `vf:provider` | `provider: Option<ActionHash>` | PRESENT | |
| `vf:receiver` | `receiver: Option<ActionHash>` | PRESENT | |
| `vf:resourceInventoriedAs` | `resource_inventoried_as: Option<ActionHash>` | PRESENT | |
| `vf:resourceQuantity` | `resource_quantity: Option<QuantityValue>` | PRESENT | |
| `vf:effortQuantity` | `effort_quantity: Option<QuantityValue>` | PRESENT | |
| `vf:hasBeginning` | `has_beginning: Option<Timestamp>` | PRESENT | |
| `vf:hasEnd` | `has_end: Option<Timestamp>` | PRESENT | |
| `vf:due` | `due: Option<Timestamp>` | PRESENT | |
| `vf:clauseOf` | `clause_of: Option<ActionHash>` | PRESENT | |
| `vf:reciprocalClauseOf` | *(absent)* | **MISSING** | Needed for bilateral agreement commitments |
| `vf:independentDemandOf` | `independent_demand_of: Option<ActionHash>` | PRESENT | |
| `vf:satisfies` | `satisfies: Option<ActionHash>` | PRESENT | |
| `vf:finished` | `finished: Option<bool>` | PRESENT | |
| `vf:inScopeOf` | `in_scope_of: Option<Vec<ActionHash>>` | PRESENT | |

**Gap:** `reciprocalClauseOf` (P1).

---

### `vf:Agent` / `ReaAgent`

| VF 1.0 Property | hREA Field | Status | Notes |
|-----------------|------------|--------|-------|
| `vf:primaryLocation` | *(absent)* | **MISSING** | Location of the agent |
| Subclasses: Person, Organization, EcologicalAgent | `agent_type: String` | PARTIAL | Flat string instead of proper subclassing |

Extra hREA fields: `name` (required), `image`, `classified_as`, `note`.

**Structural observation:** VF 1.0 defines Agent as an abstract class with three concrete subclasses. hREA uses a single `ReaAgent` with `agent_type: String` (e.g., `"Person"`, `"Organization"`). This is pragmatic for Holochain (avoids three entry types with near-identical structure), but breaks strict ontology alignment. A VF-compliant GraphQL layer must map these correctly.

---

### `vf:ResourceSpecification` / `ReaResourceSpecification`

| VF 1.0 Property | hREA Field | Status | Notes |
|-----------------|------------|--------|-------|
| `vf:defaultUnitOfResource` | `default_unit_of_resource: Option<ActionHash>` | PRESENT | |
| `vf:defaultUnitOfEffort` | `default_unit_of_effort: Option<ActionHash>` | PRESENT | |
| `vf:mediumOfExchange` | *(absent)* | **MISSING** | Boolean — is this resource a currency? |
| `vf:substitutable` | *(absent)* | **MISSING** | Boolean — fungible with same spec? |

**Impact:** Currency tokens and fungibility cannot be expressed. Nondominium's Unyt integration (§6.6 in NDO spec) depends on `mediumOfExchange`.

---

### `vf:Intent` / `ReaIntent`

| VF 1.0 Property | hREA Field | Status | Notes |
|-----------------|------------|--------|-------|
| `vf:action` | `rea_action: String` | PRESENT | |
| `vf:provider` | `provider: Option<ActionHash>` | PRESENT | |
| `vf:receiver` | `receiver: Option<ActionHash>` | PRESENT | |
| `vf:resourceQuantity` | `resource_quantity: Option<QuantityValue>` | PRESENT | |
| `vf:effortQuantity` | `effort_quantity: Option<QuantityValue>` | PRESENT | |
| `vf:availableQuantity` | `available_quantity: Option<QuantityValue>` | PRESENT | |
| `vf:minimumQuantity` | `minimum_quantity: Option<QuantityValue>` | PRESENT | |
| `vf:hasBeginning` | `has_beginning: Option<Timestamp>` | PRESENT | |
| `vf:hasEnd` | `has_end: Option<Timestamp>` | PRESENT | |
| `vf:due` | `due: Option<Timestamp>` | PRESENT | |
| `vf:finished` | `finished: Option<bool>` | PRESENT | |

Intent is one of the more complete implementations. Extra hREA fields: `image`, `agreed_in`, `in_scope_of`.

---

### `vf:Proposal` / `ReaProposal`

| VF 1.0 Property | hREA Field | Status | Notes |
|-----------------|------------|--------|-------|
| `vf:publishes` | `publishes: Option<Vec<ActionHash>>` | PRESENT | |
| `vf:reciprocal` | `reciprocal: Option<Vec<ActionHash>>` | PRESENT | |
| `vf:unitBased` | `unit_based: Option<bool>` | PRESENT | |
| `vf:proposedTo` | `proposed_to: Option<Vec<ActionHash>>` | PRESENT | |
| `vf:purpose` | *(absent)* | **MISSING** | ProposalPurpose enum (offer/request) |
| `vf:eligibleLocation` | *(absent)* | **MISSING** | SpatialThing — geographic eligibility |
| `vf:listedIn` | *(absent)* | **MISSING** | ProposalList reference |

Extra hREA fields: `name`, `has_beginning`, `has_end`, `created`, `note`.

---

### `vf:Agreement` / `ReaAgreement`

| VF 1.0 Property | hREA Field | Status | Notes |
|-----------------|------------|--------|-------|
| `vf:stipulates` | *(via links)* | PARTIAL | Relationship exists via Commitment.clauseOf |
| `vf:stipulatesReciprocal` | *(absent)* | **MISSING** | Second side of bilateral agreement |
| `vf:realizes` | *(via links)* | PARTIAL | Inverse: EconomicEvent.realizationOf |
| `vf:realizesReciprocal` | *(absent)* | **MISSING** | Second side of bilateral realization |
| `vf:bundledIn` | *(absent)* | **MISSING** | AgreementBundle reference |

hREA `ReaAgreement` has only `name`, `created`, `note`. Agreement is severely under-specified relative to VF 1.0. Bilateral exchange workflows (standard in OVN contexts) cannot be fully expressed.

---

### `vf:Plan` / `ReaPlan`

| VF 1.0 Property | hREA Field | Status | Notes |
|-----------------|------------|--------|-------|
| `vf:planIncludes` (Process) | *(via links)* | PRESENT | ReaPlanToReaProcesses link |
| `vf:planIncludes` (Commitment) | *(via links)* | PRESENT | ReaPlanToReaCommitments link |
| `vf:hasIndependentDemand` | `independent_demand_of` (inverse) | PRESENT | Expressed on Commitment side |

Plan is relatively well-implemented. Extra hREA fields: `name`, `due`, `note`, `in_scope_of`, `created`.

---

### `vf:Process` / `ReaProcess`

| VF 1.0 Property | hREA Field | Status | Notes |
|-----------------|------------|--------|-------|
| `vf:basedOn` | `based_on: Option<ActionHash>` | PRESENT | |
| `vf:hasInput` | *(via links)* | PRESENT | ReaProcessToReaEconomicEventInputs |
| `vf:hasOutput` | *(via links)* | PRESENT | ReaProcessToReaEconomicEventOutputs |
| `vf:inScopeOf` | `in_scope_of: Option<Vec<ActionHash>>` | PRESENT | |
| `vf:hasBeginning` | `has_beginning: Option<Timestamp>` | PRESENT | |
| `vf:hasEnd` | `has_end: Option<Timestamp>` | PRESENT | |
| `vf:finished` | `finished: Option<bool>` | PRESENT | |

Process is well-implemented. Extra hREA fields: `before`, `after`, `classified_as`, `planned_within`, `note`.

---

### `vf:RecipeProcess` / `ReaRecipeProcess`

| VF 1.0 Property | hREA Field | Status | Notes |
|-----------------|------------|--------|-------|
| `vf:hasRecipeInput` | *(via links)* | PRESENT | |
| `vf:hasRecipeOutput` | *(via links)* | PRESENT | |
| `vf:hasDuration` | *(absent)* | **MISSING** | Measure — planned process duration |
| `vf:processConformsTo` | `process_conforms_to: Option<ActionHash>` | PRESENT | |
| `vf:processClassifiedAs` | *(absent)* | **MISSING** | Classification URI |

---

### `vf:Unit` / `ReaUnit`

| VF 1.0 Property | hREA Field | Status | Notes |
|-----------------|------------|--------|-------|
| `vf:symbol` | `symbol: String` | PRESENT | |
| `vf:omUnitIdentifier` | `om_unit_identifier: String` | PRESENT | |

Extra hREA field: `label` (human-readable name) — not in VF core but harmless.

---

## Action Model Gaps

VF 1.0 defines the `vf:Action` class with **10 effect properties**. hREA implements **4**.

| VF 1.0 Effect Property | hREA Field | Status | Meaning |
|------------------------|------------|--------|---------|
| `vf:accountingEffect` | `accounting_effect` (ActionEffect enum) | PRESENT | Change to rights/accounting |
| `vf:onhandEffect` | `onhand_effect` (ActionEffect enum) | PRESENT | Change to physical custody |
| `vf:inputOutput` | `input_output` (ProcessType enum) | PRESENT | Input / Output / NotApplicable |
| `vf:pairsWith` | `pairs_with: String` | PRESENT | Reciprocal action ID |
| `vf:accountableEffect` | *(absent)* | **MISSING** | Change to accountability |
| `vf:locationEffect` | *(absent)* | **MISSING** | Change to current location |
| `vf:stageEffect` | *(absent)* | **MISSING** | Change to stage/specification |
| `vf:stateEffect` | *(absent)* | **MISSING** | Change to state string |
| `vf:containedEffect` | *(absent)* | **MISSING** | Change to containedIn |
| `vf:createResource` | *(absent)* | **MISSING** | Whether this action creates a new resource |
| `vf:eventQuantity` | *(absent)* | **MISSING** | What quantity field(s) are used |

**Impact:** The missing action effects mean that rule-based resource mutation (auto-updating location, stage, state, containment when an event is recorded) cannot be derived from the action definition alone. Systems consuming hREA must hardcode these rules outside the action model.

This is particularly impactful for `transfer_custody` (no `locationEffect` to auto-update `current_location`) and `modify`/`accept` (no `stageEffect` or `stateEffect`).

---

## Validation Gaps

Every integrity zome validation function in `vendor/hrea` that should enforce VF business rules is a stub:

```rust
// TODO: add the appropriate validation rules
Ok(ValidateCallbackResult::Valid)
```

This affects **all entry types** for create, update, and delete operations.

Specific rules that are absent at the DHT validation level:

| Rule | VF Requirement | Current State |
|------|---------------|---------------|
| Action input/output constraint | `produce` must have `output_of`; `consume` must have `input_of` | Unenforced |
| Temporal consistency | `has_beginning` must be before `has_end` | Unenforced |
| Quantity sign | Quantities must be positive | Unenforced |
| Inventory effect on event | Creating a `produce` event should increment resource quantity | Not auto-applied |
| Transfer agent consistency | `transfer` requires both provider and receiver | Unenforced |
| Commitment satisfaction | A satisfied commitment must reference a real intent | Unenforced |
| Claim settlement | A settled claim must match the original triggering event | Unenforced (Claim absent) |
| Action validity | `rea_action` string must reference a known action | Unenforced at integrity level |

**Architectural note:** Holochain's validation layer (integrity zome) is the correct place for these rules because validation runs deterministically on every peer. Leaving these as stubs means: (a) corrupted state can be written to the DHT by non-compliant clients, and (b) hREA cannot claim DHT-level VF correctness guarantees.

---

## Naming and Structural Observations

These are not gaps but noteworthy observations for maintainers.

**`rea_` prefix vs `vf:` namespace.** All hREA types use a `ReaX` / `rea_x` naming convention. This is internal to the Holochain zome layer and is correctly abstracted away by the GraphQL module. The GraphQL types should map to VF names (`EconomicEvent`, not `ReaEconomicEvent`). Verify this mapping is complete in `modules/vf-graphql-holochain/`.

**`agreed_in: Option<String>` on EconomicEvent and Commitment.** This field does not appear in the VF 1.0 ontology. It appears to be a legacy field or a custom extension. Its semantics overlap with `realization_of (Agreement)`. Clarify intent and either map it to a proper VF property or document it as an hREA extension.

**Proposal embeds `publishes` and `reciprocal` inline.** VF 1.0 expresses these as relationships via ProposedIntent (`vf:publishedIn`). hREA stores them as `Vec<ActionHash>` directly on Proposal. This is a denormalized approach that works but diverges from the VF graph model. ProposedIntent as a separate entity is missing.

**`RecipeExchange` vs `Recipe`.** VF 1.0 defines a `vf:Recipe` class (with `recipeIncludes` and `primaryOutput`) distinct from `vf:RecipeExchange`. hREA's `ReaRecipeExchange` maps to VF's `RecipeExchange` but there is no equivalent of VF's `Recipe` wrapper class in hREA. If recipes need a primary output specification, this wrapper is needed.

---

## Recommendations

### P0 — Critical (breaks core VF workflows)

**P0-1: Add `vf:Claim` entry type**
- Create `integrity/hrea/src/rea_claim.rs` with `triggeredBy: ActionHash` (required) and standard CRUD
- Add `settles: Option<Vec<ActionHash>>` to `ReaEconomicEvent`
- Add coordinator functions: `create_rea_claim`, `get_latest_rea_claim`, `get_claims_triggered_by_event`
- Required for: contribution accounting in Nondominium, invoicing workflows in hAppenings

**P0-2: Add `effortQuantity` to `ReaEconomicEvent`**
- Add `effort_quantity: Option<QuantityValue>` to the `ReaEconomicEvent` struct
- Required for: all `work` and `deliverService` action events, which are the primary use case in OVN contribution tracking

### P1 — Important (breaks interoperability with other VF systems)

**P1-1: Add `reciprocalRealizationOf` to `ReaEconomicEvent`**
- Add `reciprocal_realization_of: Option<ActionHash>` referencing a `ReaAgreement`
- Required for: bilateral exchange event recording (standard trade)

**P1-2: Add `reciprocalClauseOf` to `ReaCommitment`**
- Add `reciprocal_clause_of: Option<ActionHash>` referencing a `ReaAgreement`
- Required for: bilateral agreement clauses (the "I commit to X in exchange for Y" pattern)

**P1-3: Add `mediumOfExchange` and `substitutable` to `ReaResourceSpecification`**
- Add `medium_of_exchange: Option<bool>` and `substitutable: Option<bool>`
- Required for: Nondominium Unyt integration (§6.6 NDO spec) and hAppenings fungible offer matching

**P1-4: Implement core validation rules in integrity zome**
- At minimum: action input/output constraint validation on `ReaEconomicEvent` creation
- Temporal constraint: `has_beginning < has_end` where both present
- The `validate_create_rea_economic_event` already validates foreign keys — extend it with action-based process link validation using `get_builtin_action()`

**P1-5: Add `purpose` to `ReaProposal`**
- Add `purpose: Option<String>` (using a string enum: `"offer"` / `"request"`) or a proper `ProposalPurpose` entry type
- Required for: hAppenings Requests & Offers UI distinction between offers and requests

### P2 — Significant (completes the ontology)

**P2-1: Add `vf:SpatialThing` entry type and replace string location fields**
- Create `ReaSpatialThing` with `mappable_address`, `lat`, `lon`, `alt` fields
- Replace `at_location: Option<String>` with `at_location: Option<ActionHash>` everywhere
- This is a breaking change — requires migration logic or a versioned approach

**P2-2: Add `vf:BatchLotRecord` entry type**
- Create `ReaBatchLotRecord` with `batch_lot_code: String`, `expiration_date: Option<Timestamp>`
- Replace `lot: Option<String>` on `ReaEconomicResource` with `of_batch_lot: Option<ActionHash>`

**P2-3: Add missing Action effect fields**
- Add `location_effect`, `stage_effect`, `state_effect`, `contained_effect`, `create_resource`, `event_quantity` to the `Action` struct
- Update `builtins.rs` with values from VF 1.0 spec for each action
- This enables rule-based resource mutation derivation from action definitions

**P2-4: Add `hasDuration` and `processClassifiedAs` to `ReaRecipeProcess`**
- Add `has_duration: Option<QuantityValue>` (time measure) and `process_classified_as: Option<Vec<String>>`

**P2-5: Add `vf:AgreementBundle` and expand `ReaAgreement`**
- Create `ReaAgreementBundle` entry type
- Add `bundled_in: Option<ActionHash>` to `ReaAgreement`

**P2-6: Add `primaryLocation` to `ReaAgent`**
- Add `primary_location: Option<ActionHash>` (or `Option<String>` if SpatialThing not yet implemented)

---

## Appendix: Full Field Mapping Tables

### Actions — 18 built-in actions present

| Action ID | Accounting Effect | Onhand Effect | I/O | Pairs With |
|-----------|------------------|---------------|-----|-----------|
| dropoff | Decrement | Decrement | Output | pickup |
| pickup | Increment | Increment | Input | dropoff |
| consume | Decrement | Decrement | Input | notApplicable |
| use | NoEffect | NoEffect | Input | notApplicable |
| work | NoEffect | NoEffect | Input | notApplicable |
| cite | NoEffect | NoEffect | Input | notApplicable |
| produce | Increment | Increment | Output | notApplicable |
| accept | NoEffect | Decrement | Input | modify |
| modify | NoEffect | Increment | Output | accept |
| pass | NoEffect | NoEffect | Output | accept |
| fail | NoEffect | NoEffect | Output | accept |
| deliver-service | NoEffect | NoEffect | Output | notApplicable |
| transfer-all-rights | DecrementIncrement | NoEffect | NotApplicable | notApplicable |
| transfer-custody | NoEffect | DecrementIncrement | NotApplicable | notApplicable |
| transfer | DecrementIncrement | DecrementIncrement | NotApplicable | notApplicable |
| move | DecrementIncrement | DecrementIncrement | NotApplicable | notApplicable |
| raise | Increment | Increment | NotApplicable | notApplicable |
| lower | Decrement | Decrement | NotApplicable | notApplicable |

All 18 VF 1.0 built-in actions are present. Action effect dimensions are missing (see Action Model Gaps above).

### Entry Types — Presence Summary

| VF 1.0 Class | hREA Entry Type | Present |
|-------------|----------------|---------|
| vf:Agent | ReaAgent | YES |
| vf:EconomicResource | ReaEconomicResource | YES |
| vf:EconomicEvent | ReaEconomicEvent | YES |
| vf:Process | ReaProcess | YES |
| vf:Commitment | ReaCommitment | YES |
| vf:Intent | ReaIntent | YES |
| vf:Agreement | ReaAgreement | YES |
| vf:Plan | ReaPlan | YES |
| vf:Proposal | ReaProposal | YES |
| vf:ResourceSpecification | ReaResourceSpecification | YES |
| vf:ProcessSpecification | ReaProcessSpecification | YES |
| vf:RecipeFlow | ReaRecipeFlow | YES |
| vf:RecipeProcess | ReaRecipeProcess | YES |
| vf:RecipeExchange | ReaRecipeExchange | YES |
| vf:Unit | ReaUnit | YES |
| vf:Claim | *(absent)* | **NO** |
| vf:SpatialThing | *(absent)* | **NO** |
| vf:BatchLotRecord | *(absent)* | **NO** |
| vf:AgreementBundle | *(absent)* | **NO** |
| vf:ProposalList | *(absent)* | **NO** |

### Link Types — 30 relationship links defined

hREA defines 56 link types in the integrity zome covering: update chains (immutable), discovery anchors (AllX), process I/O links, agent-to-flow links, planning links (agreement/plan/commitment), satisfaction/fulfillment links, and recipe structure links. These are implementation-level constructs; VF 1.0 expresses these as object properties on the classes. No significant link-level gaps were identified beyond those caused by missing entry types.
