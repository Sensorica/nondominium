# Complete Resource Specification — Design Record

> **Status: Phase B implemented (2026-08-11).** Predicate library (`constraints.rs`), typed `RuleData`, Layer-0 pointers / denormalized fields on `GovernanceRule` / `ResourceSpecification` / `Commitment` / `EconomicEvent`, Hard integrity enforcement, Soft advisory via parallel `evaluate_state_transition`, and dry-run query fns are in code. Remaining open items from §5: funnel vs parallel (defaulted to parallel; TODO documented), `Network` scope == `Public` at anchors, one-spec-per-NDO uniqueness best-effort only.
>
> This document is Phase B of the split named in `zome_resource_integrity::validate_create_nondominium_identity` — *"Phase A: all seven PropertyRegime variants are accepted at creation... Regime-driven governance enforcement... is Phase B."* Historical design rationale below is retained; **Current code status** lines mark what landed.

**Relates to:** `ndo_prima_materia.md`, `resources.md` (§4.4.3–§4.4.6, §6), `governance.md` (§1.2, §4.1), `specifications.md` (§3.2, §5)
**Sources cross-checked:** `crates/shared/src/types.rs`, `crates/shared/src/lib.rs`, `dnas/nondominium/zomes/integrity/zome_resource/src/lib.rs`, `dnas/nondominium/zomes/integrity/zome_gouvernance/src/lib.rs`, `dnas/nondominium/zomes/coordinator/zome_gouvernance/src/{commitment,economic_event}.rs`

---



## 0. Why a predicate library instead of a rules matrix

The starting problem: a resource's classification (`ResourceNature`, `PropertyRegime`, lifecycle maturity) should determine which governance rules and actions are coherent — e.g. `Move` doesn't apply to a `Digital` resource; a `Nondominium` resource can't have a rule that assigns ownership. The first instinct — a lookup table of `(nature, regime, action) → allowed` — was rejected: it forces every future addition to touch an ever-growing matrix, it can't express "warn but allow" vs. "block," and it duplicates the same regime/nature checks the enums *already* half-encode via helper methods like `is_uncapturable()`.

The chosen approach instead: small, composable **constraint predicates** — pure functions of `(classification, proposed thing) → Option<violation>` — assembled at each call site. This is the CDD/COP position that governance coherence is an emergent property of composing simple rules, not a property you can pre-enumerate in a table. New predicates append to a list; nothing else changes.

## 1. Decision log

Each entry: the decision, the reasoning, what was rejected and why, and current code status.

### 1.1 Rivalry derivation moves from `PropertyRegime` to `ResourceNature`

**Decision.** `is_rivalrous()` is removed from `PropertyRegime` (or demoted to a documented "default posture" helper, not authoritative). Authoritative rivalry derivation becomes a method on `ResourceNature`, with an explicit `Option<Rivalry>` override field for the cases nature gets wrong.

**Reasoning.** `resources.md` §4.4.3 is explicit that goods-type properties (rivalry, excludability) and property regime are *orthogonal*: "goods types exist independently of property regimes... `ResourceNature` and `Rivalry` describe the intrinsic characteristics of the resource. `PropertyRegime` describes the chosen governance arrangement." The **current code contradicts its own documentation**: `PropertyRegime::is_rivalrous()` classifies `Nondominium` as categorically non-rivalrous. That's wrong for a *physical* Nondominium resource — a community 3D printer under a Nondominium regime is still rivalrous; only one agent can print at a time. `ResourceNature` is a much better predictor: physical/hybrid things are rivalrous by default, digital/information things aren't. `Service` is genuinely ambiguous (a consultation slot is rivalrous; documented advice is not) — hence the override.

**Rejected alternative.** Keep deriving from `PropertyRegime`, treat the Nondominium-physical case as an acceptable simplification. Rejected because it's not a simplification, it's an actual falsehood the moment a physical Nondominium resource exists, which the roadmap explicitly anticipates (shared physical tools under Nondominium governance are a first-class use case, not an edge case).

**Schema.**

```rust
// crates/shared/src/types.rs
#[derive(Clone, PartialEq, Debug, Serialize, Deserialize)]
pub enum Rivalry { Rivalrous, NonRivalrous }

impl ResourceNature {
    pub fn default_rivalry(&self) -> Rivalry {
        match self {
            ResourceNature::Physical | ResourceNature::Hybrid => Rivalry::Rivalrous,
            ResourceNature::Digital | ResourceNature::Information => Rivalry::NonRivalrous,
            ResourceNature::Service => Rivalry::NonRivalrous, // ambiguous default; override expected
        }
    }
}
```

`NondominiumIdentity` gains `rivalry_override: Option<Rivalry>` — immutable after creation, same tier as `property_regime`/`resource_nature` (not one of the three conditionally-mutable fields `lifecycle_stage`/`successor_ndo_hash`/`hibernation_origin` already documented in the struct's own comments).

**Current code status.** ✅ Implemented. `Rivalry` enum, `ResourceNature::default_rivalry()`, demoted `PropertyRegime::is_rivalrous()` docs, and immutable `rivalry_override` on `NondominiumIdentity` (+ create_ndo / shared-types).

### 1.2 No `Transferability` field — decompose into what's actually regime-gated

**Decision.** Do not add a stored `Transferability` field. Ownership-transfer permission is already answered by `PropertyRegime::permits_ownership_transfer()`/`is_uncapturable()` (already in code, currently unused — see the `_regime_semantics_hook` placeholder). Custody-transfer, use-rights-transfer, and benefit-transfer remain ordinary governance-rule *policy*, not resource classification.

**Reasoning.** Checking `resources.md` §4.4.5's transfer-rights matrix cell by cell: across all seven `PropertyRegime` variants, only the *ownership* column is actually regime-determined (`Private`/`Collective` permit it, the other five don't). Custody, use-rights, and benefit transfer are "✅" for every single regime in that matrix — meaning regime carries zero discriminating information for those three transfer types. A `Transferability` field encoding four transfer-type flags would be storing three constants and one already-derivable fact.

**Rejected alternative.** A `TransferabilityProfile { ownership, custody, use_rights, benefit }` struct on Layer 0. Rejected because three of its four fields would never vary — that's not a classification, that's dead weight that looks like it means something and doesn't.

**Current code status.** Correctly not implemented (nothing to undo — this was a "don't build it" decision, and nothing has been built).

### 1.3 The predicate library lives in `crates/shared`, ungated

**Decision.** New module `crates/shared/src/constraints.rs`, added to `crates/shared/src/lib.rs` **outside** the `#[cfg(feature = "coordinator")]` gate (same tier as `types` and the existing `pub mod validation`), so it compiles for integrity zomes, coordinator zomes, and native test crates with zero `hdk`/`hdi` dependency.

**Reasoning.** Confirmed against the actual `lib.rs`: `validation` (the closest existing analog — pure string/URL/email checks) is deliberately ungated; everything gated behind `coordinator` uses `hdk::prelude::`* for cross-zome calls. The constraint predicates need to run inside `zome_resource_integrity`'s `validate()` callback, which cannot depend on `hdk` (integrity zomes use `hdi` only) — so they must be pure Rust with no `hdk`/`hdi` imports, following exactly the `validation` module's existing pattern. This also means the same function, unchanged, becomes reusable later (Stage 6) as the implementation behind a UI dry-run query, and is trivially unit-testable without any Holochain test harness.

**Schema.**

```rust
// crates/shared/src/constraints.rs — pure, no hdk/hdi imports
use crate::types::{PropertyRegime, ResourceNature, LifecycleStage, Rivalry, VfAction};

#[derive(Clone, Debug, PartialEq)]
pub struct ResourceClassification {
    pub resource_nature: ResourceNature,
    pub property_regime: PropertyRegime,
    /// `None` at call sites that haven't fetched it and don't need to (see §1.6).
    pub lifecycle_stage: Option<LifecycleStage>,
    pub rivalry_override: Option<Rivalry>,
}
impl ResourceClassification {
    pub fn effective_rivalry(&self) -> Rivalry {
        self.rivalry_override.clone().unwrap_or_else(|| self.resource_nature.default_rivalry())
    }
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub enum ConstraintSeverity { Hard, Soft }

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct ConstraintViolation {
    pub rule_id: &'static str,
    pub message: String,
    pub severity: ConstraintSeverity,
}

pub fn has_hard_violation(violations: &[ConstraintViolation]) -> bool {
    violations.iter().any(|v| v.severity == ConstraintSeverity::Hard)
}
```

**Current code status.** ✅ Implemented. `crates/shared/src/constraints.rs` (ungated) with `ResourceClassification`, `ConstraintSeverity`, `ConstraintViolation`, `has_hard_violation`, and action/rule predicates.

### 1.4 `Hard` vs `Soft` maps to *integrity vs coordinator*, not *zome_resource vs zome_gouvernance*

**Decision.** Severity determines which **layer** enforces a predicate, not which **zome**:

- **Hard** → integrity-zome `validate()`, wherever the relevant entry type actually lives. Unconditional, cryptographically enforced, can't be bypassed by calling a different coordinator function.
- **Soft** → coordinator function only. `ValidateCallbackResult` is a binary `Valid`/`Invalid(String)` — there is structurally no way for an integrity callback to return "accepted, but here's a warning." Only a coordinator return type can carry non-blocking feedback.

**Reasoning.** This was a real course-correction from an earlier "Hard→zome_resource, Soft→zome_gouvernance" framing that doesn't survive contact with the actual entry ownership: `zome_resource` has **no entry type that carries a** `VfAction` (`Commitment`/`EconomicEvent` are `zome_gouvernance` entries per the confirmed integrity zome). So a Hard capture-resistance check on an *action* (`check_capture_resistance`, below) is necessarily enforced inside `zome_gouvernance_integrity`, not `zome_resource`. What *does* land in `zome_resource` is the Hard check on a *rule definition* (`GovernanceRule` is confirmed to be a `zome_resource` entry). The zome split observed in earlier discussion was a byproduct of this deeper rule, not the rule itself — restating it this way generalizes correctly to new predicates without re-deriving the reasoning each time.

**Current code status.** N/A (this is an architectural principle, not code).

### 1.5 `RuleData` replaces `rule_type: String` + `rule_data: String`

**Decision.** `GovernanceRule.rule_type: String` and `rule_data: String` are replaced by a single tagged enum `rule_data: RuleData`, with `GovernanceRuleType` *derived* from the enum's variant via a `rule_type()` method rather than stored separately.

**Reasoning.** The confirmed current `validate_create_governance_rule` only checks that both strings are non-empty — there is no schema enforcement at all, exactly matching `resources.md`'s own gap listing ("`GovernanceRule.rule_data` is untyped JSON string... no schema enforcement, no tooling support, no peer validation of rule semantics"). A separate stored `rule_type` field alongside a variant-per-rule-type `RuleData` enum would be two sources of truth for the same fact, permanently — the enum's own discriminant already *is* the type.

**Schema.**

```rust
// crates/shared/src/rule_data.rs — ungated, pure
#[derive(Clone, PartialEq, Debug, Serialize, Deserialize)]
pub enum GovernanceRuleType { AccessRequirement, UsageLimit, TransferCondition, MaintenanceSchedule }

#[derive(Clone, PartialEq, Debug, Serialize, Deserialize)]
pub enum RuleData {
    AccessRequirement(AccessRequirementData),
    UsageLimit(UsageLimitData),
    TransferCondition(TransferConditionData),
    MaintenanceSchedule(MaintenanceScheduleData),
}
impl RuleData {
    pub fn rule_type(&self) -> GovernanceRuleType {
        match self {
            RuleData::AccessRequirement(_) => GovernanceRuleType::AccessRequirement,
            RuleData::UsageLimit(_) => GovernanceRuleType::UsageLimit,
            RuleData::TransferCondition(_) => GovernanceRuleType::TransferCondition,
            RuleData::MaintenanceSchedule(_) => GovernanceRuleType::MaintenanceSchedule,
        }
    }
}

#[derive(Clone, PartialEq, Debug, Serialize, Deserialize)]
pub enum Accessibility { Free, Credentialed, Gated }
#[derive(Clone, PartialEq, Debug, Serialize, Deserialize)]
pub struct AccessRequirementData {
    pub accessibility: Accessibility,
    pub required_role: Option<String>,
    pub min_affiliation: Option<String>,
}
#[derive(Clone, PartialEq, Debug, Serialize, Deserialize)]
pub struct UsageLimitData {
    pub max_duration_hours: Option<f64>,
    pub max_quantity_per_period: Option<f64>,
    pub period_days: Option<u32>,
}
#[derive(Clone, PartialEq, Debug, Serialize, Deserialize)]
pub enum TransferType { Ownership, Custody, UseRights, Benefit }
#[derive(Clone, PartialEq, Debug, Serialize, Deserialize)]
pub struct TransferConditionData {
    pub transfer_type: TransferType,
    pub requires_validation: bool,
    pub validator_role: Option<String>,
}
#[derive(Clone, PartialEq, Debug, Serialize, Deserialize)]
pub struct MaintenanceScheduleData { pub interval_days: u32, pub required_role: Option<String> }
```

**Current code status.** ✅ Implemented. `crates/shared/src/rule_data.rs` with `GovernanceRuleType`, tagged `RuleData`, and payload structs; `GovernanceRule.rule_data: RuleData`.

### 1.6 `GovernanceRule` denormalizes Layer 0's *immutable* fields; the entry-vs-context split this forces

**Decision.** `GovernanceRule` gains `ndo_identity_hash: ActionHash` (direct pointer to Layer 0) plus denormalized copies of `property_regime`, `resource_nature`, and `rivalry_override` — all three chosen *because* they're immutable on `NondominiumIdentity`. `lifecycle_stage` is deliberately **not** denormalized because it's mutable and would drift.

**Reasoning.** This lets `validate_create_governance_rule` run `check_rule_data_permitted` with **zero DHT reads** — pure computation over the entry's own fields. Denormalizing a *mutable* field onto a different permanent entry would create exactly the staleness risk Stage 3 was designed to avoid (the copy silently becomes wrong the moment the source changes and nothing re-syncs it). This is why `ResourceClassification.lifecycle_stage` had to become `Option<LifecycleStage>` (§1.3) rather than required: `check_rule_data_permitted`'s two current checks (ownership-transfer permission, gated-accessibility-vs-Nondominium) only read `property_regime` — they never needed `lifecycle_stage` at all, so forcing this call site to fetch it just to fill a required struct field would reintroduce a DHT read that buys nothing.

**A generalization worth stating explicitly, since it recurred at every later stage:** *denormalize only immutable fields onto a different entry; read mutable ones live, at the point of validation, via* `must_get_valid_record`*.* This rule was re-derived independently for `ResourceSpecification` (§1.7) and for `Commitment`/`EconomicEvent` (§1.8) — it's the load-bearing principle of this whole document's enforcement design, not a one-off Stage 3 detail.

**Schema.**

```rust
pub struct GovernanceRule {
    pub rule_data: RuleData,           // was: rule_type: String, rule_data: String
    pub enforced_by: Option<String>,
    pub ndo_identity_hash: ActionHash, // NEW
    pub property_regime: PropertyRegime,   // NEW — denormalized, immutable source
    pub resource_nature: ResourceNature,   // NEW — denormalized, immutable source
    pub rivalry_override: Option<Rivalry>, // NEW — denormalized, immutable source
}
```

**Predicate + call site.**

```rust
// crates/shared/src/constraints.rs
pub fn check_rule_data_permitted(ctx: &ResourceClassification, rule_data: &RuleData) -> Vec<ConstraintViolation> {
    match rule_data {
        RuleData::TransferCondition(t) if t.transfer_type == TransferType::Ownership => {
            if ctx.property_regime.permits_ownership_transfer() { return vec![]; }
            vec![ConstraintViolation {
                rule_id: "ownership_transfer_not_permitted_by_regime",
                message: format!("{:?} does not permit ownership-transfer rules.", ctx.property_regime),
                severity: if ctx.property_regime.is_uncapturable() { ConstraintSeverity::Hard } else { ConstraintSeverity::Soft },
            }]
        }
        RuleData::AccessRequirement(a) if a.accessibility == Accessibility::Gated => {
            if ctx.property_regime.is_uncapturable() {
                vec![ConstraintViolation {
                    rule_id: "gated_access_contradicts_permissionless_regime",
                    message: "Nondominium resources must remain permissionless (REQ-RES-01); \
                              'Gated' access creates a discretionary chokepoint.".to_string(),
                    severity: ConstraintSeverity::Soft,
                }]
            } else { vec![] }
        }
        _ => vec![],
    }
}
```

```rust
// zome_resource_integrity/src/lib.rs — validate_create_governance_rule, revised
fn validate_create_governance_rule(rule: &GovernanceRule, _author: &AgentPubKey) -> ExternResult<ValidateCallbackResult> {
    let ctx = ResourceClassification {
        resource_nature: rule.resource_nature.clone(),
        property_regime: rule.property_regime.clone(),
        lifecycle_stage: None, // not needed by current predicates; zero-DHT-read preserved
        rivalry_override: rule.rivalry_override.clone(),
    };
    let violations = check_rule_data_permitted(&ctx, &rule.rule_data);
    if has_hard_violation(&violations) {
        let msg = violations.iter().filter(|v| v.severity == ConstraintSeverity::Hard)
            .map(|v| format!("[{}] {}", v.rule_id, v.message)).collect::<Vec<_>>().join("; ");
        return Ok(ValidateCallbackResult::Invalid(msg));
    }
    Ok(ValidateCallbackResult::Valid)
}
```

Same shape must be added to `validate_update_governance_rule`, currently a no-op ("For Phase 1, allow updates").

**Note on the "gated-accessibility-vs-Nondominium" check's severity.** It's Soft, not Hard, deliberately: it's a *declared-intent* contradiction (someone wrote a `Gated` rule on a Nondominium resource), not a mechanically-verifiable-and-blockable fact the way ownership-transfer permission is (that one has a Hard branch specifically when the regime is `is_uncapturable()`, because cryptographic uncapturability really is a hard architectural guarantee the code can enforce; general non-Nondominium regime mismatches stay Soft because they're policy preferences, not architecture).

**Current code status.** ✅ Implemented. `GovernanceRule` carries `ndo_identity_hash` + denormalized immutable classification fields; create/update validators run `check_rule_data_permitted` and reject Hard violations.

### 1.7 `Scope` moves to Layer 1 (`ResourceSpecification`), not Layer 0 — and needs its own immutable pointer field

**Decision.** `ResourceScope { Project, Network, Public }` is a mutable field on `ResourceSpecification`, not `NondominiumIdentity`. `ResourceSpecification` also gains `ndo_identity_hash: ActionHash` (immutable after creation) and one new link type, `NdoToSpecification` (Layer 0 → Layer 1 only; no reverse link needed).

**Reasoning — why Layer 1, not Layer 0 (as** `resources.md` **§6.1's own forward-map sketch originally placed it).** Scope is revisable: a Project-scoped design tool can mature into a Public commons resource without anything about its *foundational identity* (nature, regime) changing. That's the same mutability profile as `lifecycle_stage`, not `property_regime`/`resource_nature` — Layer 0 is reserved for facts frozen at creation (per the file's own extensive immutability enforcement in `validate_update_nondominium_identity`); Scope doesn't belong there.

**Reasoning — why** `ndo_identity_hash` **must be a *field*, not just resolved via the link.** Integrity zomes should not rely on `get_links` for anything that needs to be deterministic — a validating peer may not yet have gossiped every relevant link, so link-based lookups are a known, accepted-but-real limitation for validation-time correctness. `must_get_valid_record(some_hash)` on a hash *known in advance* (a field) is the sanctioned deterministic read; `get_links` is not. Since the lifecycle-gate check below (§1.7.1) needs to reliably resolve "which NDO does this spec belong to" *during* `ResourceSpecification`'s own entry validation, that pointer has to already be sitting in the entry, not discoverable only via a link traversal.

Given the field exists, a reverse `SpecificationToNdo` link would be redundant — the field already answers "given a spec, find its NDO" with one `get()`, cheaper than a link traversal. Only one link direction is needed: `NdoToSpecification` (Layer 0 → Layer 1), for "given an NDO, find its spec."

#### 1.7.1 New constraint: Layer 1 can't outrun Layer 0's own claimed maturity

**Decision.** Creating a `ResourceSpecification` is rejected (Hard) if the linked NDO's `lifecycle_stage` is `Ideation`, `Hibernating`, `Deprecated`, or `EndOfLife`.

**Reasoning.** `LifecycleStage::Specification` is already documented (in the enum's own doc comments and `resources.md`) as the stage at which "Layer 1 activating." Allowing a brand-new `ResourceSpecification` to attach to an `Ideation`-stage NDO would let Layer 1 exist for a resource that hasn't itself claimed to be ready for it — directly contradicting the three-layer model's entire premise that coordination overhead should track actual maturity, not the reverse. Excluding `Hibernating`/`Deprecated`/`EndOfLife` too: Hibernating's own semantics ("Layer 0 active; Layers 1+2 dormant but recoverable") implies Layer 1 should already exist *before* hibernating, not be newly created during it; Deprecated/EndOfLife are terminal, so activating a *new* specification for a resource already being retired doesn't make sense.

**Where this validates, and why not at the** `CreateLink` **op.** An earlier pass considered validating this at `NdoToSpecification`'s `CreateLink` op. Rejected in favor of validating inside `validate_create_resource_spec` (an entry-creation validator) instead, for two concrete reasons: (1) this file's own `OpRecord::CreateLink { .. }` arm is currently an explicit `// TODO(next-pr)` stub with unhandled field shape — building on top of unfinished, unverified plumbing adds risk for no benefit; (2) validating at entry-creation reuses the per-entry-type dispatch this file already has for every other entry (`validate_create_resource_spec`, `validate_create_economic_resource`, etc.), rather than introducing a second, structurally different validation path.

**Schema and validator.**

```rust
#[derive(Clone, PartialEq, Debug, Serialize, Deserialize)]
pub enum ResourceScope { Project, Network, Public }

pub struct ResourceSpecification {
    pub name: String,
    pub description: String,
    pub category: String,
    pub image_url: Option<String>,
    pub tags: Vec<String>,
    pub is_active: bool,
    pub scope: ResourceScope,           // NEW — mutable
    pub ndo_identity_hash: ActionHash,  // NEW — immutable after creation
}
```

```rust
fn validate_create_resource_spec(spec: &ResourceSpecification, _author: &AgentPubKey) -> ExternResult<ValidateCallbackResult> {
    // ...existing name/description checks (unchanged)...
    let ndo_record = must_get_valid_record(spec.ndo_identity_hash.clone())?;
    let ndi: NondominiumIdentity = ndo_record.entry().to_app_option()
        .map_err(|e| wasm_error!(WasmErrorInner::Guest(format!("{:?}", e))))?
        .ok_or(wasm_error!(WasmErrorInner::Guest("Linked NDO entry not found".into())))?;
    let ineligible = matches!(ndi.lifecycle_stage,
        LifecycleStage::Ideation | LifecycleStage::Hibernating | LifecycleStage::Deprecated | LifecycleStage::EndOfLife);
    if ineligible {
        return Ok(ValidateCallbackResult::Invalid(format!(
            "Cannot activate Layer 1 while the NDO is {:?}.", ndi.lifecycle_stage
        )));
    }
    Ok(ValidateCallbackResult::Valid)
}
```

`validate_update_resource_spec` (currently a no-op, "For Phase 1, allow updates") needs one addition: reject any update where `new_entry.ndo_identity_hash != original.ndo_identity_hash` — a spec must never be silently reparented to a different NDO. `scope` and the other fields remain freely updatable for Phase 1, consistent with the existing comment's stated intent.

**A caveat to state plainly, not paper over.** Should an NDO ever have more than one `ResourceSpecification`? No — subsequent revisions should go through the existing `ResourceSpecificationUpdates` link chain, not a second `create_resource_specification` call. Enforcing "no second spec for this NDO" mechanically would need a `get_links`-based uniqueness check inside validation, which carries the same non-determinism caveat as above — a best-effort deterrent, not a guarantee. Worth documenting as a known, accepted limitation rather than claiming airtight uniqueness.

#### 1.7.2 Scope's discovery consequence is partial, and honestly so

**Decision.** `create_resource_specification` conditionally skips adding the spec to the global `AllResourceSpecifications` anchor when `scope == Project`. That's the full extent of what `zome_resource` alone can enforce.

**Reasoning.** The fuller promise in `resources.md` §4.7 — "a project-scoped resource should only be visible to project participants" — reaches into the Group DNA, a physically separate DNA from `nondominium` (per `ui_architecture.md` §7.2, group↔NDO association is a `SoftLink` created from the UI layer, `ndo.service.ts`, on the *group clone cell*, not on anything `zome_resource` owns). No DNA can validate or enforce facts about a different DNA's link state. So `Scope::Project`'s real meaning here is: real stored data + local anchor-gating inside this DNA + an advisory signal the UI/service layer is expected to respect when deciding whether to also register in the Lobby-wide view — not a guarantee `zome_resource` makes unilaterally. `Network` scope is honestly weaker still: no network-layer governance/federation anchor exists yet (`governance.md` §4.1's own gap table confirms this), so at the DHT-anchor level it currently behaves identically to `Public` until that infrastructure exists.

**Current code status.** ✅ Implemented. `ResourceScope` on `ResourceSpecification`; immutable `ndo_identity_hash`; `NdoToSpecification` link; lifecycle-gate + no-reparent validators; Project skips global anchor (`Network` behaves as `Public` at anchors — documented gap).

### 1.8 Action-execution enforcement needs a Layer 0 pointer on `Commitment`/`EconomicEvent`, and a cross-zome interface that doesn't exist yet

**Decision.** `Commitment` and `EconomicEvent` (both `zome_gouvernance` entries) each gain `ndo_identity_hash: ActionHash`. The Hard-severity action predicates (`check_capture_resistance`, `check_transport_applicability`, composed as `check_action_permitted`) are enforced inside `zome_gouvernance_integrity`'s `validate_create_commitment`/`validate_create_economic_event` (new validators — currently these entry types have **no dedicated validation logic at all** beyond `PrivateParticipationClaim`/`NdoHardLink`/`Contribution`/`Agreement`, confirmed in the integrity `validate()` dispatch). Soft-severity results additionally surface through a new `GovernanceTransitionRequest`/`GovernanceTransitionResult` coordinator-level interface, which — confirmed against `commitment.rs`/`economic_event.rs` — must be **built from scratch**, not "wired into."

**Reasoning for the field.** Same principle as §1.6/§1.7: resolving classification via `EconomicResource` → `ResourceSpecification.ndo_identity_hash` → `NondominiumIdentity` would be a two-hop chain through a link (`SpecificationToResource`) that, per the confirmed current struct, `EconomicResource` doesn't even carry as a *field* — the relationship exists **only** as a link, which is worse for integrity-time determinism than the already-flagged link-reliance concern in §1.7. Giving `Commitment`/`EconomicEvent` their own direct `ndo_identity_hash`, mirroring `GovernanceRule` and `ResourceSpecification`, avoids the multi-hop resolution and keeps every place that needs Layer-0 context consistent: a direct pointer, not an inferred chain.

**Predicates (unchanged from earlier design, now correctly scoped to zome_gouvernance_integrity).**

```rust
pub fn check_transport_applicability(ctx: &ResourceClassification, action: &VfAction) -> Option<ConstraintViolation> {
    let is_move = matches!(action, VfAction::Move);
    let is_non_physical = matches!(ctx.resource_nature, ResourceNature::Digital | ResourceNature::Information);
    if is_move && is_non_physical {
        return Some(ConstraintViolation {
            rule_id: "no_transport_for_non_physical_nature",
            message: format!("Transport (Move) does not apply to a {:?} resource.", ctx.resource_nature),
            severity: ConstraintSeverity::Soft,
        });
    }
    None
}

pub fn check_capture_resistance(ctx: &ResourceClassification, action: &VfAction) -> Option<ConstraintViolation> {
    if !ctx.property_regime.is_uncapturable() { return None; }
    let forbidden = matches!(action, VfAction::Transfer | VfAction::Consume | VfAction::Lower);
    if forbidden {
        return Some(ConstraintViolation {
            rule_id: "nondominium_no_unilateral_capture",
            message: format!("{:?} is not permitted on a Nondominium resource (REQ-RES-03).", action),
            severity: ConstraintSeverity::Hard,
        });
    }
    None
}

pub fn check_action_permitted(ctx: &ResourceClassification, action: &VfAction) -> Vec<ConstraintViolation> {
    [check_capture_resistance(ctx, action), check_transport_applicability(ctx, action)]
        .into_iter().flatten().collect()
}
```

**Integrity enforcement (new — both** `Commitment` **and** `EconomicEvent`**, deliberately, not just events).**

```rust
// zome_gouvernance_integrity — new validators, wired into the existing OpEntry::CreateEntry dispatch
fn validate_create_economic_event(event: &EconomicEvent, _author: &AgentPubKey) -> ExternResult<ValidateCallbackResult> {
    let ndi = fetch_ndo_classification(&event.ndo_identity_hash)?; // helper: must_get_valid_record + decode
    let hard: Vec<_> = check_action_permitted(&ndi, &event.action).into_iter()
        .filter(|v| v.severity == ConstraintSeverity::Hard).collect();
    if !hard.is_empty() {
        return Ok(ValidateCallbackResult::Invalid(
            hard.iter().map(|v| format!("[{}] {}", v.rule_id, v.message)).collect::<Vec<_>>().join("; ")
        ));
    }
    Ok(ValidateCallbackResult::Valid)
}
// validate_create_commitment: identical shape, applied to Commitment.action
```

Applying the Hard check to `Commitment` (intent) as well as `EconomicEvent` (what happened) is deliberate: blocking the *intent* to `Transfer` a Nondominium resource is strictly better than letting the commitment through and only failing at fulfillment — this is exactly the "take away the possibility of undesirable action alternatives" embedded-governance principle already stated in `governance.md` §1.2.

**Coordinator-level Soft feedback — genuinely new interface, not existing plumbing.**

```rust
// zome_gouvernance/src/lib.rs (io types) — new
pub struct GovernanceTransitionRequest {
    pub action: VfAction,
    pub resource: EconomicResource,
    pub ndo_identity_hash: ActionHash,
    pub requesting_agent: AgentPubKey,
    pub context: TransitionContext,
}
pub struct GovernanceTransitionResult {
    pub success: bool,
    pub new_resource_state: Option<EconomicResource>,
    pub economic_event: Option<EconomicEvent>,
    pub validation_receipts: Vec<ValidationReceipt>,
    pub rejection_reasons: Option<Vec<String>>,
    pub next_steps: Option<Vec<String>>,
    pub advisory_warnings: Option<Vec<String>>, // NEW — Soft violations; distinct from next_steps,
                                                 // which implies the caller must still act
}

#[hdk_extern]
pub fn evaluate_state_transition(request: GovernanceTransitionRequest) -> ExternResult<GovernanceTransitionResult> {
    let ndi: NondominiumIdentity = nondominium_shared::call_resource_zome("get_ndo", &request.ndo_identity_hash)?;
    let ctx = ResourceClassification {
        resource_nature: ndi.resource_nature.clone(),
        property_regime: ndi.property_regime.clone(),
        lifecycle_stage: Some(ndi.lifecycle_stage.clone()),
        rivalry_override: ndi.rivalry_override.clone(),
    };
    let (hard, soft): (Vec<_>, Vec<_>) = check_action_permitted(&ctx, &request.action)
        .into_iter().partition(|v| v.severity == ConstraintSeverity::Hard);
    if !hard.is_empty() {
        return Ok(GovernanceTransitionResult {
            success: false,
            rejection_reasons: Some(hard.iter().map(|v| format!("[{}] {}", v.rule_id, v.message)).collect()),
            new_resource_state: None, economic_event: None, validation_receipts: vec![],
            next_steps: None, advisory_warnings: None,
        });
    }
    // ...rule evaluation / event generation (net-new; nothing to reuse yet)...
    Ok(GovernanceTransitionResult {
        success: true,
        advisory_warnings: (!soft.is_empty()).then(|| soft.iter().map(|v| format!("[{}] {}", v.rule_id, v.message)).collect()),
        rejection_reasons: None, next_steps: None,
        new_resource_state: None, economic_event: None, validation_receipts: vec![], // filled in by real logic
    })
}
```

`external_local_call`/`call_resource_zome` already exist in `crates/shared/src/lib.rs` (confirmed) — the cross-zome call above uses real, existing plumbing, not a hypothetical.

**Open question this document cannot resolve on its own.** `propose_commitment`, `claim_commitment`, and `log_economic_event` (confirmed current signatures) return plain `{ commitment_hash, commitment }` / `{ event_hash, event, ppr_claims }` structs, not `GovernanceTransitionResult`. If these remain the actual entry points agents call (as opposed to routing everything through `evaluate_state_transition`), `advisory_warnings` has no return-type home on those paths, and each would need the same `{ ..., advisory_warnings }` extension individually. The Hard gate is safe regardless (it lives in integrity validation, which fires no matter which coordinator function got there) — only the Soft/advisory-warning UX depends on this. Resolving it requires a decision on whether `evaluate_state_transition` becomes the single funnel these existing functions call internally, or a parallel path — genuinely open, not something to resolve unilaterally here.

**Current code status.** ✅ Implemented. `ndo_identity_hash` on `Commitment`/`EconomicEvent`; create validators enforce Hard action predicates; `GovernanceTransitionRequest`/`Result` + parallel `evaluate_state_transition`; dry-run `check_action_constraints` / `check_rule_data_constraints`. Funnel of write paths remains open (TODO in `transition.rs`).

## 2. Consolidated schema diff (all stages, one view)


| Type                                                                          | File                                          | Change                                                                                                                                             | Breaking?                                                             |
| ----------------------------------------------------------------------------- | --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| `PropertyRegime`                                                              | `crates/shared/src/types.rs`                  | Remove/demote `is_rivalrous()`                                                                                                                     | No (method removal — check all current callers first)                 |
| `ResourceNature`                                                              | `crates/shared/src/types.rs`                  | Add `default_rivalry()`                                                                                                                            | No (additive method)                                                  |
| *(new)* `Rivalry`                                                             | `crates/shared/src/types.rs`                  | New enum                                                                                                                                           | N/A                                                                   |
| `NondominiumIdentity`                                                         | `zome_resource_integrity`                     | + `rivalry_override: Option<Rivalry>`                                                                                                              | **Yes** — new required-shape field on an existing entry type (see §4) |
| *(new)* `ResourceClassification`, `ConstraintViolation`, `ConstraintSeverity` | `crates/shared/src/constraints.rs` (new file) | New pure predicate library                                                                                                                         | N/A                                                                   |
| `GovernanceRule`                                                              | `zome_resource_integrity`                     | `rule_type: String` + `rule_data: String` → `rule_data: RuleData`; + `ndo_identity_hash`, `property_regime`, `resource_nature`, `rivalry_override` | **Yes** — field replacement, not additive                             |
| *(new)* `RuleData`, `GovernanceRuleType`, payload structs                     | `crates/shared/src/rule_data.rs` (new file)   | New typed rule schema                                                                                                                              | N/A                                                                   |
| `ResourceSpecification`                                                       | `zome_resource_integrity`                     | + `scope: ResourceScope`, `ndo_identity_hash: ActionHash`                                                                                          | **Yes** — new non-optional field                                      |
| *(new)* `NdoToSpecification`                                                  | `zome_resource_integrity` `LinkTypes`         | New link type                                                                                                                                      | No (additive to enum)                                                 |
| `Commitment`                                                                  | `zome_gouvernance_integrity`                  | + `ndo_identity_hash: ActionHash`                                                                                                                  | **Yes**                                                               |
| `EconomicEvent`                                                               | `zome_gouvernance_integrity`                  | + `ndo_identity_hash: ActionHash`                                                                                                                  | **Yes**                                                               |
| *(new)* `GovernanceTransitionRequest`/`Result`                                | `zome_gouvernance` coordinator                | New cross-zome interface                                                                                                                           | N/A (new, not replacing)                                              |


Five rows are marked breaking in a way that isn't a simple additive `#[serde(default)]`-style change (the pattern already used successfully for `successor_ndo_hash`/`hibernation_origin` on `NondominiumIdentity`) — because a non-optional `ActionHash` field has no sensible default, and `rule_type`/`rule_data: String → RuleData` is a type replacement, not an addition. This is Stage 7's actual subject — see §4, now resolved: direct breaking replacement, no migration shim, for all five.

## 3. Enforcement architecture summary

```
Rule-definition coherence (GovernanceRule.rule_data)
    → zome_resource_integrity::validate_create/update_governance_rule
    → check_rule_data_permitted(ctx, rule_data)  [zero DHT reads; ctx built from denormalized fields]
    → Hard → ValidateCallbackResult::Invalid (unconditional)
    → Soft → currently unsurfaced at this layer (integrity can't warn) — see §6 for the UI-facing route

Action-execution coherence (Commitment.action / EconomicEvent.action)
    → zome_gouvernance_integrity::validate_create_commitment/economic_event
    → check_action_permitted(ctx, action)  [ctx built via must_get_valid_record(ndo_identity_hash)]
    → Hard → ValidateCallbackResult::Invalid (unconditional; fires regardless of coordinator entry point)
    → Soft → not blocked here (same integrity-callback limitation)

    zome_gouvernance coordinator::evaluate_state_transition (NEW)
    → same check_action_permitted, same ctx (fetched via cross-zome call to zome_resource::get_ndo)
    → Hard → GovernanceTransitionResult{ success: false, rejection_reasons }
    → Soft → GovernanceTransitionResult{ success: true, advisory_warnings }
```



## 4. Migration strategy for `GovernanceRule` and the other breaking changes — Stage 7

**Reframing from the original single-entry-type framing.** This started as "`GovernanceRule`'s migration strategy" alone. Tracing every breaking change in §2 makes clear it's actually **one policy decision needed for four struct changes** (five, counting `NondominiumIdentity.rivalry_override`): `GovernanceRule` (§1.6), `ResourceSpecification` (§1.7), `Commitment` and `EconomicEvent` (§1.8) all add non-optional fields or replace typed fields with no sensible default — none of them can use the `#[serde(default)]` pattern already proven on `NondominiumIdentity`'s `successor_ndo_hash`/`hibernation_origin`, because that pattern only works for genuinely *additive optional* fields, and three of these four changes aren't that shape. (`rivalry_override: Option<Rivalry>` on `NondominiumIdentity` *could* technically use the `#[serde(default)]` trick since it's already `Option`-shaped — but per the decision below, that trick is no longer needed for any of the five.)

**The question this document could not resolve on its own.** Whether any currently-running network — a shared dev conductor, a testnet, anything beyond ephemeral local `hc sandbox` instances that get reset — holds real `GovernanceRule`/`ResourceSpecification`/`Commitment`/`EconomicEvent` entries anyone needs preserved. Every one of these entry types is independently described in the project's own documentation as effectively unused placeholder scaffolding (`GovernanceRule.rule_data` explicitly called "completely untyped... ToDo" in `resources.md`; `ResourceSpecification` described as "legacy resource/spec links"; `propose_commitment`/`log_economic_event` carrying literal `// TODO: In Phase 2` comments for basic authorization) — but that was an assumption about deployment state, not a fact derivable from source code alone, so it required explicit confirmation rather than being decided unilaterally.

**Decision (confirmed 2026-08-11, developer-confirmed on this document, line above).** No currently-running network holds `GovernanceRule`/`ResourceSpecification`/`Commitment`/`EconomicEvent`/`NondominiumIdentity` data that needs to be preserved. **Option (a) — direct breaking replacement — is adopted for all five struct changes**, executed together as one coordinated pre-launch schema revision rather than five separate migrations:

- `NondominiumIdentity` gains `rivalry_override: Option<Rivalry>` directly (§1.1).
- `GovernanceRule.rule_type: String` + `rule_data: String` are replaced in place by `rule_data: RuleData`, plus the three new denormalized fields (§1.6).
- `ResourceSpecification` gains `scope: ResourceScope` and `ndo_identity_hash: ActionHash` directly (§1.7).
- `Commitment` and `EconomicEvent` each gain `ndo_identity_hash: ActionHash` directly (§1.8).

Concretely, this means: **no `#[serde(default)]` legacy-field shims, no dual-field transition period, no `V2` entry types.** Existing entries of these five types in any local `hc sandbox` DHT become undeserializable after the change — accepted, since none hold data worth preserving. This mirrors how `NondominiumIdentity` itself was introduced originally (a genuinely new struct via PR #80/#84), not a migration from something older.

**Options (b) dual-field transition and (c) new `V2` entry type remain documented (not deleted) as the fallback path** for any *future* breaking change to these same five entry types, made *after* real data exists on a shared network. At that point this section's precedent no longer applies and the decision must be re-made against the then-current deployment state.

## 5. Carried-forward open items

1. ~~Migration policy for the five breaking schema changes~~ — **resolved**, see §4: option (a), direct breaking replacement, confirmed no real data at stake.
2. **Whether** `propose_commitment`**/**`claim_commitment`**/**`log_economic_event` **route through** `evaluate_state_transition` **or remain parallel paths** — **defaulted to parallel** in Phase B; Soft UX uses `evaluate_state_transition` / dry-run queries. Funnel remains a documented TODO in `transition.rs`.
3. `Network`**-scope discovery has no real mechanism yet** — behaves as `Public` until network-layer federation exists; documented as a known gap, not solved here (§1.7.2). Still open.
4. **Best-effort, not guaranteed, uniqueness** for "one `ResourceSpecification` per NDO" (§1.7.1) — a `get_links`-based check, inherently non-deterministic under gossip timing. Still open.



## 6. UI query surface for resolved constraints

**Decision.** Expose the pure predicates as read-only, non-mutating coordinator query functions, rather than porting the logic to TypeScript. The UI calls these *before* attempting the real write, to preemptively show blocking errors and non-blocking warnings in creation/editing forms.

**Reasoning.** `crates/shared/src/constraints.rs`'s deliberate purity (§1.3 — no `hdk`/`hdi` dependency) means a `#[hdk_extern]` wrapper around them is nearly trivial plumbing, and there is exactly one implementation shared by three consumers: integrity validation (direct import), UI dry-run query (thin coordinator wrapper), and unit tests (direct import, no Holochain harness needed). Porting the same logic to TypeScript would create a second implementation that can silently drift from the Rust source of truth — the one thing this whole predicate-based design was built to avoid (a duplicated, driftable table).

**Two separate query functions, mirroring the two predicate groups — not one combined endpoint** (avoiding the same "kitchen sink" problem `ResourceClassification` itself had to be fixed for in §1.6):

```rust
// zome_resource coordinator — new
#[derive(Serialize, Deserialize)]
pub struct CheckRuleDataConstraintsInput {
    pub property_regime: PropertyRegime,
    pub resource_nature: ResourceNature,
    pub rivalry_override: Option<Rivalry>,
    pub rule_data: RuleData,
}
#[hdk_extern]
pub fn check_rule_data_constraints(input: CheckRuleDataConstraintsInput) -> ExternResult<Vec<ConstraintViolation>> {
    let ctx = ResourceClassification {
        resource_nature: input.resource_nature, property_regime: input.property_regime,
        lifecycle_stage: None, rivalry_override: input.rivalry_override,
    };
    Ok(check_rule_data_permitted(&ctx, &input.rule_data))
}
```

```rust
// zome_gouvernance coordinator — new
#[derive(Serialize, Deserialize)]
pub struct CheckActionConstraintsInput {
    pub property_regime: PropertyRegime,
    pub resource_nature: ResourceNature,
    pub rivalry_override: Option<Rivalry>,
    pub action: VfAction,
}
#[hdk_extern]
pub fn check_action_constraints(input: CheckActionConstraintsInput) -> ExternResult<Vec<ConstraintViolation>> {
    let ctx = ResourceClassification {
        resource_nature: input.resource_nature, property_regime: input.property_regime,
        lifecycle_stage: None, rivalry_override: input.rivalry_override,
    };
    Ok(check_action_permitted(&ctx, &input.action))
}
```

**Why the input takes raw classification facts, not an existing entry hash.** The most valuable use case is *hypothetical* — a rule-authoring form should be able to show "here's what would go wrong" while the agent is still filling out `NdoCreateModal.svelte` or a rule-editing form, before any `NondominiumIdentity`/`GovernanceRule` entry exists to fetch. A hash-based signature would only work for editing existing entries, missing the creation-time case entirely.

**TypeScript mirror types** (in `packages/shared-types`, alongside the existing `PropertyRegime`/`NdoDescriptor` types per `specifications.md` §7.1): `ConstraintSeverity` (`'Hard' | 'Soft'`), `ConstraintViolation { rule_id: string; message: string; severity: ConstraintSeverity }`. These carry no logic — just the shape needed to render the zome's JSON response; they cannot drift into duplicated *logic* the way a ported predicate function could.

**Current code status.** ✅ Implemented. `check_rule_data_constraints` (resource) and `check_action_constraints` (governance) plus TS mirror types in `packages/shared-types`. Svelte form wiring remains indicative / out of scope for Phase B.

**UI call sites** (indicative, not exhaustive — the specific components would need their own review pass):

- A rule-editing UI, once one exists, calling `check_rule_data_constraints` with the NDO's known `property_regime`/`resource_nature` plus the drafted `RuleData` as the agent edits it — Hard violations disable submit, Soft violations show as inline warnings.
- Wherever action proposals are initiated (`propose_commitment`/`log_economic_event` triggers) calling `check_action_constraints` the same way.
- `NdoCreateModal.svelte` needs no round-trip for the `Service`-nature rivalry ambiguity specifically — that's a static fact derivable from `ResourceNature` alone (`Service` has no confident default), so a client-side lookup/copy hint suffices without a server call.

Debouncing/memoizing these calls client-side is a normal Svelte 5 `$effect` concern, not a protocol design question.

## 7. Sound implementation order

Given the dependency chain traced through §1–§6, a coherent build order (not a timeline — no estimates implied):

1. **§1.1 Rivalry** — `Rivalry` enum, `ResourceNature::default_rivalry()`, `NondominiumIdentity.rivalry_override`. Independent of everything else; unblocks all downstream `ResourceClassification` usage.
2. **§1.3 Predicate library skeleton** — `crates/shared/src/constraints.rs` with `ResourceClassification`, `ConstraintViolation`, `ConstraintSeverity`, and `has_hard_violation`. No predicates yet; just the shared vocabulary.
3. **§1.5** `RuleData` — `crates/shared/src/rule_data.rs`. Independent of the predicate library itself, but predicates in step 4 depend on its types existing.
4. **§1.6** `check_rule_data_permitted` **+** `GovernanceRule` **schema + integrity wiring** — the first end-to-end enforcement path, and the simplest one (zero DHT reads), making it the best first proof that the whole architecture works before committing to the heavier §1.8 cross-zome path.
5. **§1.7** `ResourceSpecification` **schema +** `NdoToSpecification` **link + lifecycle-gate validator** — independent of step 4's predicates; can be built in parallel once step 1 lands.
6. **§1.8** `check_action_permitted` **+** `Commitment`**/**`EconomicEvent` **schema +** `zome_gouvernance_integrity` **wiring** — depends on step 1 (Rivalry) and step 2 (predicate vocabulary); the heaviest step, since it also requires the first real `must_get_valid_record`-based cross-entry read in a hot validation path.
7. **§1.8** `GovernanceTransitionRequest`**/**`evaluate_state_transition` — net-new coordinator interface; can start once step 6's Hard gate exists, since the Hard gate protects correctness regardless of which coordinator surface is used, buying time to resolve the "single funnel vs. parallel paths" open question (§5, item 2) without blocking on it.
8. ~~§4 Migration decision~~ — **resolved** (§4: option (a), direct breaking replacement, confirmed no real persisted data on any running network). No longer a gate in front of steps 4–6; each of those steps applies its struct change directly, with no `#[serde(default)]` shim, dual-field period, or `V2` type.
9. **§6 UI query functions** — depend only on steps 2–3 (the pure predicate functions) and can be built in parallel with 4–7 once those exist, since they're thin wrappers with no dependency on the entry-schema changes themselves.

With step 8 resolved, the sequence 1 → 2 → 3 → 4 → 5 → 6 → 7 (with 9 parallelizable alongside 4–7) is now fully unblocked and ready to execute in order.

