# Commitment Pool Experiment — Work Summary for Collaborators

**Audience:** people continuing this prototype (Grassroots Economics collaborators, Nondominium contributors, or anyone remapping Commitment Pooling onto Holochain).
**Branch:** `commitment-pool-experiment` (remote: `Sensorica/commitment-pool-experiment`)
**Companion how-to:** [Grassroots Commitment Pool](grassroots-commitment-pool.md) — runnable walkthrough, GE↔Nondominium mapping, out-of-scope list, code map.
**Status:** Runnable two-agent prototype. Experiment cut, not a production protocol or a merge-ready `dev` feature set.

This note explains **why** we carved the experiment out, **how** we did it (branch, design-system remix, DNA + UI), and **which decisions** we locked so someone else can build on top without reverse-engineering chat history.

---

## 1. Stated intention

Grassroots Economics (GE) works with **Commitment Pools**: communities list promises (commitments) about real things, admit them into a shared pool, fulfill them, and keep mutual receipts of participation.

Nondominium already had:

- Groups as cloned Group DNA cells (membership, discovery)
- NDOs as permanent Layer 0 identities (the *things* people coordinate around)
- ValueFlows Commitments / EconomicEvents / Claims in `zome_gouvernance`
- Bilateral Private Participation Receipts (PPRs) — but with a known integrity hole (issue #14: counterparty signature was a zero placeholder)

We wanted a **thin, runnable prototype** that maps GE’s pool language onto those primitives, so GE collaborators can *feel* admit → fulfill → PPR on Holochain without adopting the rest of the Nondominium roadmap (Unyt, Flowsta, Source-NDO, Perspectives, role-promotion ceremonies, etc.).

Design constraint from the start:

> Pool = Group. The thing committed about = NDO. The promise = Commitment. Fulfillment is one atomic coordinator call that writes observation + claim + real bilateral PPRs.

No separate “lab” app. No parallel ontology. Extend the existing Lobby → Group → NDO shell.

---

## 2. Branch / fork details

| Item | Detail |
|---|---|
| Branch name | `commitment-pool-experiment` |
| Forked from | `dev` at `e2fcc70` (*docs(ui): update prototype paths for Layer 0 Resource Perspective*) |
| Tracking remote | `Sensorica/commitment-pool-experiment` |
| Rough window | 2026-10-29 → 2026-10-30 (Measure through design-system Layer 1 / Governance alignment) |
| Intentional isolation | Experiment lives on this branch so GE / pool work does not block or pollute `dev` until the mapping is validated socially |

**Commit spine** (oldest → newest, experiment-specific):

1. `dcbc019` — `Measure` type; migrate quantity/unit → `{ numerical_value, has_unit }`
2. `0fc0ab3` — UI migration to Measure + explicit commitment receiver
3. `cc56ddf` — Group DNA: `CommitmentAnchor` admit / withdraw / `get_pool_contents`
4. `f7e06a2` — `NdoToCommitments` index + `get_commitments_for_ndo`
5. `11085b5` — `fulfill_commitment_closure` (fixes #14 — real countersign PPRs)
6. `09c86a1` — Sweettest coverage for fulfillment closure
7. `10b4ada` / `033a63a` — UI services + Activity / Pool / PPR surfaces
8. `3f26b6b` — collaboration brief (`documentation/Applications/grassroots-commitment-pool.md`)
9. `cc027ab` — pin / remix `@nondominium/ndo-ui` (Resource Perspective shell, Agent directory, NDO create wizard)
10. `3156120` — inventory foreshadow + digital locator on DNA + DS `ResourcesPanel` / Governance template picker
11. `be414ef` — `InstanceCreateForm` + EconomicEvent form resource-hash UX

Treat this branch as a **product slice**, not as “all of Nondominium.” Prefer rebasing or cherry-picking slices into `dev` after GE feedback, rather than merging the whole experiment blind.

---

## 3. Steps we took (narrative)

### Phase A — Make the pool protocol real on DHT

1. Introduce **`Measure`** so commitment / event / resource quantities share one ValueFlows-shaped type (number + unit), instead of ad-hoc `f64` + string pairs in the UI path.
2. Make commitment **receiver explicit** in propose/create flows (pool fulfillment needs a clear counterparty).
3. On the **Group DNA**, add `CommitmentAnchor`: a pointer onto the group DHT that *admits* a commitment living on an NDO cell. Admission does not copy or move the commitment. Withdrawal is a **status mark** (`Admitted` → `Withdrawn`), not a delete — the pool keeps memory.
4. On the **Nondominium DNA**, add `NdoToCommitments` + getters so Activity UI can list commitments for one NDO without scanning the world.
5. Replace the broken “issue PPR with fake counterparty signature” path with **`fulfill_commitment_closure`**: one call that (a) `call_remote` countersigns with the live counterparty, (b) writes `EconomicEvent`, (c) writes `Claim` with `fulfilled_by` = real event hash, (d) optionally updates `OperationalState`, (e) writes two bilateral PPRs with **verifiable** signatures.
6. Cover the happy path in Sweettest (run serial — `--test-threads 1`; parallel sweettests starve each other here).
7. Wire UI on **existing** Group and NDO views: Admit modal, Fulfill modal, Pool section, Participation claims panel. Document the walkthrough for GE.

### Phase B — Remix the design-system UI without losing the pool

The design system (`nondominium-design-system`, branch **`release-prototype`**) had already prototyped a **Resource Perspective** IA (Group Resource + Agent perspectives; NDO Overview / Resources / Governance / Composition / Activity). It did **not** include Commitment Pool UI.

We:

1. Vendored / pinned `@nondominium/ndo-ui` from the sibling checkout (`file:../../nondominium-design-system/packages/ndo-ui` + Vite aliases to `src` and `styles`). Comment in `ui/vite.config.ts`: pin **`release-prototype`**, not `master`.
2. Adopted DS chrome for Group shell, Agent directory / profile, NDO create wizard, tokens.
3. **Kept** Activity, Composition, Pool, Admit, Fulfill as **hApp-live** surfaces (ahead of the prototype, where some of those tabs were still “Soon”).
4. Gap analysis showed Layer 1 create was still a plain popup, and Governance was live but not using DS templates — so we locked a second plan (below) and implemented DNA + UI alignment for foreshadow fields and template → `RuleData` mapping.
5. Added EconomicResource **instance** create from Resources tab so the design-system “inventoried resource” path is usable end-to-end with events.

---

## 4. Design-system remix — what we pulled, what we didn’t

**Source of truth for chrome:** sibling repo `nondominium-design-system` @ `release-prototype` (HEAD at work time: `e37a2b9`).

**Pulled into the hApp:**

| Surface | Package / pattern |
|---|---|
| Tokens / Uno-friendly styles | `@nondominium/ndo-ui/styles` |
| Group Resource Perspective shell | `GroupView` remixed toward DS IA |
| Agent Perspective | `AgentDirectory`, `AgentProfileView` |
| NDO create | `NdoCreateWizard` |
| Layer 1 Resources | `ResourcesPanel` + `SpecificationFormModal` (via adapters) |
| Governance templates | `GovernanceTemplatePicker` → mapped creatable `RuleData` |

**Adapters:** `ui/src/lib/utils/ndo-ui-adapters.ts` — hashes, foreshadow fields, create inputs. Design-system types and DHT types are not identical; adapters are the boundary.

**Intentionally not mirrored 1:1:**

- Commitment Pool / Admit / Fulfill / PPR panels — **hApp-only** (GE experiment)
- Activity / Composition left **live** even where DS still said “Soon”
- Source-NDO fields in the DS Layer 1 form — **UI hidden / not persisted** (Source profile is post-MVP; see decisions)
- Full Perspectives / Intelligence / Work — still deferred / Soon in Group shell

---

## 5. What we added to the backend (and why)

### Group DNA — Commitment Pool pointer

- **`CommitmentAnchor`** entry + `admit_commitment` / `withdraw_commitment` / `get_pool_contents`
- Anchor carries full cross-cell coordinates (`group_hash`, `ndo_dna_hash`, `network_seed`, `identity_action_hash`, `commitment_action_hash`) plus status
- Updates may change **only** status fields (same immutability pattern as `NdoAnchor`)

**Why:** A pool is a *listing of promises*, not a second home for the commitment. The commitment stays authoritative on the NDO cell; the group DHT only remembers what this pool admitted. Withdrawing must not erase history (GE analytics / memory).

### Nondominium DNA — indexing + fulfillment

- **`NdoToCommitments`** + `get_commitments_for_ndo` / `_detailed`
- **`fulfill_commitment_closure`** with `call_remote` countersign (`countersign_fulfillment`)

**Why:** UI and pool admission need a scoped commitment list. Fulfillment must be a **two-sided act** (GE semantics) and must produce PPRs that actually verify (fix #14). We chose remote countersign over a full Holochain countersigning session: smaller atomicity unit, fails cleanly if the counterparty is offline, no half-session to unwind.

### Shared types — Measure + Layer 1 foreshadow

- **`Measure`** on commitment / event / resource quantity paths used by the experiment UI
- Additive optional fields on **`ResourceSpecification`**:
  - Inventory foreshadow: `inventory_intent`, `identification_pattern`, `default_unit`, `substitutable`
  - Digital locator: `digital_locator_kind`, `digital_locator`
- Enums: `InventoryIntent`, `IdentificationPattern`, `DigitalLocatorKind`
- Soft validation via `validate_spec_foreshadow`; coordinator `normalize_foreshadow` (e.g. Digital nature forces `NotApplicable` inventory and clears inventoriable fields)
- `serde(default)` so legacy entries without foreshadow remain readable

**Why:** The design-system Layer 1 form already collected these ValueFlows foreshadow fields. Leaving them client-only would teach collaborators a false model (“I filled inventory tracking but nothing stuck”). Extending DNA additively keeps backward compatibility and makes ResourcesPanel honest. Source-NDO fields were **not** added (out of experiment scope).

### Layer 0 Use / Consume + hard dual create

- Enums on shared crate: `EconomicMode` (`Use` \| `Consume`), `UseKind` (`Unit` \| `Capacity`), `ClosureReason` (`Depleted`, `Spoiled`, `Withdrawn`, `WrittenOff`, `DonatedRemainder`, `Other`)
- Additive fields on **`NondominiumIdentity`** (not DNA properties — avoid DnaHash churn): `economic_mode`, `use_kind`, `default_unit`, `identification_pattern`, `unique_id`, `max_concurrent_users`, `closure_reason`, `closure_note`
- `create_ndo` validates foreshadow; when mode is set and lifecycle is Layer-1-eligible, auto-creates Project-scoped `ResourceSpecification` + `EconomicResource` (Consume uses `initial_quantity`; Use/unit qty=1; Use/capacity also attaches a `capacity_limit` usage rule when `max_concurrent_users` is set). `NdoOutput` returns optional `specification_action_hash` / `economic_resource_action_hash` for that path.
- Wizard preselects mode-specific governance template IDs; hApp `NdoCreateWizard` applies creatable mappings onto the new spec after dual create (skips `capacity_limit` when dual create already wrote it).
- `UpdateLifecycleStageInput.closure_reason` required for Consume-mode terminal transitions; UI reason picker labels **Depleted** explicitly
- `UsageLimitData` extended with `max_concurrent_users` / `max_per_agent` for capacity and Consume packs
- Design-system wizard (`release-prototype`) asks Use/Consume after Physical/Hybrid; governance packs differ by mode; ui-kit has Physical Use/Consume create + enrich fixtures

### Tests

- Governance Sweettests for fulfillment closure and NDO-scoped commitment reads
- Resource Sweettests `resource_spec_persists_inventory_foreshadow` and `resource_spec_persists_digital_locator` (use `get_latest_resource_specification`, not a non-existent `get_resource_specification`)
- NDO Layer 0 Sweettests for Consume/Use hard dual create, Ideation foreshadow-only, and EndOfLife + `Depleted` closure reason

---

## 6. What we added to the frontend (and why)

| Area | What | Why |
|---|---|---|
| Pool UX | `PoolSection`, Admit / Fulfill modals on Group + NDO Activity | Make GE loop visible without a separate app |
| Activity | Commitment create (Measure + receiver), event create, PPR panel | Layer 2 observation path for the pool |
| Agent pickers | Nickname display + full pubkey under the hood; copy full key | Dense lists stay short; commitments need unambiguous receivers |
| Design-system shell | Group perspectives, Agent directory, NDO wizard, tokens | Align look/IA with `release-prototype` so GE and Nondominium share one visual language |
| Layer 1 | `ResourcesTab` → DS `ResourcesPanel`; deleted plain `SpecificationCreateModal` | Honest create/edit for specs including foreshadow |
| Governance | `GovernanceTemplatePicker` + `governance-template-map.ts`; Custom still uses `RuleEditorModal` | Templates that map to typed `RuleData` write now; others stay filtered / Soon |
| Instances | `InstanceCreateForm` on Resources tab | Inventoried specs need concrete `EconomicResource` instances for events |
| Wiring | Effect services / stores for admit, fulfill, pool contents, foreshadow fields | Keep zome calls out of `.svelte` (I1); adapters at the DS boundary |

---

## 7. Decisions we locked (and why)

These were explicit product decisions during the experiment. Treat them as defaults unless GE feedback overturns them.

| Decision | Choice | Rationale |
|---|---|---|
| What is a pool? | Group cell | Membership + discovery already exist; avoid a third DHT role |
| Where does the commitment live? | NDO cell | NDO is the object of coordination; pool only points |
| Admission authority (MVP) | Any group member may admit | Smallest social rule for a demo; governance of admission is a GE question, not hard-coded yet |
| Withdrawal model | Status mark, not delete | Pool memory / audit; matches “we once held this” |
| Fulfillment atomicity | `call_remote` countersign in one coordinator closure | Real bilateral PPRs; offline counterparty → clean fail |
| Fake PPR signatures | Forbidden | Issue #14 — unverifiable receipts are worse than none |
| Design-system pin | Sibling `release-prototype` via Vite file alias | Prototype IA is the Resource Perspective cut collaborators already saw |
| Layer 1 foreshadow | Persist inventory + digital locator on DNA | Form honesty; additive `Option` + `serde(default)` |
| Source fields in DS form | Out of DNA / not persisted this cut | Source-NDO is post-MVP; don’t pretend ecological Source profiles exist |
| Governance templates | Creatable IDs map to `RuleData` (`access_accountable`, `quota_extraction`, `maintenance_schedule`, `no_ownership_transfer`, `capacity_limit`, `max_per_agent`); rest filtered | Avoid writing stringly rules the integrity zome can’t express |
| Custom rules | Keep `RuleEditorModal` | Escape hatch when templates don’t fit |
| Activity / Composition / Pool | Stay live while adopting DS Resources/Governance chrome | Experiment value is the pool loop; don’t regress it to “Soon” |
| Separate lab route | No | Lobby → Group → NDO is enough |
| Merge to `dev` | Not automatic | Validate mapping with GE first; cherry-pick or rebase slices |
| Pool listing architecture | Group-side `CommitmentAnchor` (leave as-is) | See §8 — not CapabilitySlot; primary key is the Group |
| NDO inventoriable fork | **Use** vs **Consume** at Layer 0 for Physical/Hybrid only | NDO is first-order (thing or batch), not a category; Digital/Source skip the fork |
| Capacity | **Use subtype** (`use_kind = Capacity`) | Place with concurrent occupancy; equipment stays Use/unit; materials are Consume |
| Consume identity | NDO **is the batch/lot** | New delivery = new NDO; unit + initial quantity required at create |
| Hard dual create | When `economic_mode` set and lifecycle allows Layer 1 → auto `ResourceSpecification` + `EconomicResource` | Ideation stores mode foreshadow only; inventory waits for Specification+ |
| Batch closure | `EndOfLife` / `Deprecated` + **`closure_reason`** (incl. `Depleted`) | No new `Depleted` LifecycleStage; qty→0 uses reason `Depleted` |

**Locked plan shorthand** used in implementation chat for the DS alignment pass:

- **1C** — Persist inventory foreshadow + digital locator; adopt `ResourcesPanel` / `SpecificationFormModal`; Source out
- **2C** — `GovernanceTemplatePicker` → creatable `RuleData`; Custom editor retained; keep Activity / Composition / Pool live
- **Use/Consume** — DS wizard on `release-prototype`; DNA + adapters on this branch only (see §5 / §7)

---

## 8. Architecture: Group `CommitmentAnchor` vs capability surface

### 8.1 What we chose

Pool admission is implemented as a **first-class Group DNA entry** (`CommitmentAnchor`), patterned after **`NdoAnchor`**: thick cross-cell pointer + membership-scoped write + status-marker withdrawal. It is **not** a `CapabilitySlot` attachment from the NDO Layer 0 hash.

Normative capability surface: [`ndo_prima_materia.md` §6](../requirements/ndo_prima_materia.md) (REQ-NDO-CS-*). That substrate (`CapabilitySlot` link type, `CapabilitySlotTag`, `SlotType`) is **not implemented in Rust** as of this experiment.

### 8.2 Why leave as-is (accepted recommendation)

Capability slots optimize for *“what tools/operators are attached to this NDO?”* Commitment Pool optimizes for *“what promises has this community pool admitted?”*

| Concern | Capability surface | This experiment’s need |
|---|---|---|
| Primary key | NDO (or Person) identity hash | **Group** hash (GE: pool = Group) |
| Cheap query | Slots from a known NDO | **`get_pool_contents(group)`** without reverse-index gymnastics |
| Pointer richness | Thin typed link (+ tag) | Thick coords (NDO cell + commitment hash) + status/memory — same lesson that retired bare `SoftLink` for NDOs in favor of `NdoAnchor` |
| Who may attach | Permissionless-at-DHT (CS-02), trust later | **Group membership** membrane for admit |
| Withdrawal | Link delete vs trust filter (underspecified for “pool memory”) | Status mark `Admitted` → `Withdrawn`, history retained |
| Scope of change | Would require landing CS substrate first | Thin Group entry; fulfillment/PPRs stay on Nondominium DNA |

Same *spirit* as capability slots (pointer, don’t copy the commitment; don’t enlarge the NDO entry). Different **ownership and query direction**. Treating pool listing as a CS-only link from Layer 0 would invert the GE UI (Group → contents) unless a Group-side reverse index were added — at which point you largely reinvent `CommitmentAnchor`.

**Decision:** keep `CommitmentAnchor` for the experiment and for any near-term cherry-pick to `dev`. Do not block GE validation on implementing REQ-NDO-CS-*.

### 8.3 Future refactor — when capability surface lands in Rust

When `CapabilitySlot` / `SlotType` exist in `zome_resource` (and optionally on `Person` per G15), revisit pool discovery with a **hybrid**, not a naïve “delete anchors, only NDO→pool links”:

1. **Land CS substrate** — `LinkTypes::CapabilitySlot`, `CapabilitySlotTag`, `SlotType` (add something like `CommitmentPool` or use `CustomApp("CommitmentPool")`), attach/list APIs, Sweettests for CS-01–04.
2. **Optional NDO-facing slot** — from Layer 0 (or from the commitment action hash) → pool/group target, answering *“which pools list this NDO/commitment?”* without scanning all groups.
3. **Keep a Group-side index** — retain `CommitmentAnchor` (or a thinner successor) as the authoritative listing for `get_pool_contents`, membership-gated admit/withdraw, and withdrawn memory. Dual-write on admit/withdraw; document which side is source of truth for conflicts.
4. **Do not move** — `fulfill_commitment_closure`, Measure, `NdoToCommitments`, bilateral PPRs. Those stay on the Nondominium DNA regardless of listing architecture.
5. **Migrate** — experiment sandboxes may wipe; if anchors shipped on `dev`, write an additive migration that attaches CS links for existing admitted anchors and leaves Group entries in place until readers are cut over.

Trigger to start that work: CS implementation for Unyt/Flowsta/MOSS (prima materia §6.6–6.7), not GE demo polish alone. Until then, Group-side thick pointers remain the correct local fit — same architectural family as `NdoAnchor`.

---

## 9. What this experiment deliberately is *not*

Same spirit as the collaboration brief — restated so builders don’t “complete” the wrong thing:

- Pool-level admission governance (roles, quorum, affiliation gates)
- Mandatory governance-as-operator funnel for all writes
- Source-NDO / ecological Source profile
- Unyt settlement, Flowsta identity, hREA Phases 2–4 wiring as a product requirement
- Implementing CapabilitySlot solely to host pool listing (see §8 — deferred until CS lands for Unyt/Flowsta/MOSS)
- Global reputation scores (PPRs stay private)
- Mirroring the counterparty’s PPR onto *their* chain when they next come online (`mirror_counterparty_ppr` noted, not built)
- Publishing `@nondominium/ndo-ui` as a versioned npm package for this experiment (sibling path pin only)

---

## 10. How to build on top

1. **Read** [grassroots-commitment-pool.md](grassroots-commitment-pool.md) and run `AGENTS=2 bun run network` inside `nix develop`.
2. **Talk to GE** with the open questions in that brief (who admits vs fulfills; NDO constraints on pools; withdrawal vs archive; offline PPR mirror).
3. **If promoting to `dev`:** prefer small PRs — Measure, CommitmentAnchor, fulfillment closure, foreshadow fields, UI adapters — rather than one mega-merge of the experiment branch. Keep Group-side anchors (§8); do not rewrite pool onto CS in the same PR.
4. **If extending Layer 1:** keep foreshadow validation in `nondominium_shared::types::validate_spec_foreshadow`; add Sweettests that call `get_latest_resource_specification`.
5. **If extending governance templates:** add a mapping in `ui/src/lib/utils/governance-template-map.ts` only when a typed `RuleData` variant already exists; otherwise leave Soon.
6. **If refreshing design-system:** update the sibling `release-prototype` checkout and keep Vite aliases pointed at it until a real package version is cut.
7. **When CS lands:** follow the hybrid refactor in §8.3; do not drop `get_pool_contents` without a Group-side index.
8. **Sweettest tip:** serial threads for governance/resource pool tests; cold WASM per conductor can take many minutes on first run — slow ≠ stuck.

---

## 11. Key paths (quick index)

| Concern | Path |
|---|---|
| Collaboration brief / runbook | `documentation/Applications/grassroots-commitment-pool.md` |
| This work summary | `documentation/Applications/commitment-pool-experiment.md` |
| Capability surface (normative, not coded) | `documentation/requirements/ndo_prima_materia.md` §6, REQ-NDO-CS-* |
| `Measure` / foreshadow enums | `crates/shared/src/types.rs` |
| CommitmentAnchor | `dnas/group/zomes/coordinator/zome_group/src/commitment_anchor.rs` |
| Fulfillment closure | `dnas/nondominium/zomes/coordinator/zome_gouvernance/src/fulfillment.rs` |
| Spec create/normalize | `dnas/nondominium/zomes/coordinator/zome_resource/src/resource_specification.rs` |
| DS adapters | `ui/src/lib/utils/ndo-ui-adapters.ts` |
| Governance template map | `ui/src/lib/utils/governance-template-map.ts` |
| Vite DS pin | `ui/vite.config.ts` |
| Design-system package | `../nondominium-design-system/packages/ndo-ui` @ `release-prototype` |

---

*Living note for the experiment cut. Update when GE feedback changes the mapping, when slices land on `dev`, or when CapabilitySlot lands and §8.3 is executed.*
