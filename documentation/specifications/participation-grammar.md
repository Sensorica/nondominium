# Participation grammar — commitment and fulfillment

**Status:** Active (MVP)  
**Relates to:** `packages/ndo-ui` (`participation-grammar.ts`, `action-form-spec.ts`, `fulfillment-consent.ts`), `zome_gouvernance` (`propose_commitment`, `fulfill_commitment_closure`), `crates/shared/src/constraints.rs`

## Purpose

Generate agent roles, form defaults, and fulfill eligibility from **nature × regime × action family × surface × initiation**, instead of a flat per-action story matrix. This keeps Activity UX aligned with nondominium: resource-centric flows, regime-conditioned custody, and peer-production initiation (self-allocate or publish request).

## Ontological notes

- The **NDO is not an agent**. It is the attractor / seed value around which agents coalesce. The organization is that set of agents, not the NDO itself.
- **Beneficiary (derived):** for shared regimes, the beneficiary of work on the NDO is this NDO (commons face). It is **not** written as a third `AgentPubKey` on the wire in MVP.
- **`AgentContext` as project face** (dual-face collective) remains post-MVP. Do not put an NDO hash in `provider` / `receiver`.

## Semantic slots

| Slot | Meaning | MVP wire |
|------|---------|----------|
| **Performer** | Who does / will do the action | One of `Commitment.provider` or `Commitment.receiver` |
| **Witness** | Who countersigns / can raise peer scrutiny | The other of `provider` / `receiver` |
| **Beneficiary** | Who benefits | Derived = this NDO (not on wire) |
| **Custodian-now** | Who holds responsibility at this process phase | Derived from regime + phase; may equal performer during Work / Use / Move |

## Regime × nature predicates (witness / custodian)

| Classification | Custodian-now (derived) | Witness eligibility |
|----------------|-------------------------|---------------------|
| `Private` (any nature) | Singleton owner-custodian | Owner (or agent acting for owner) |
| `Pool` / `CommonPool` physical | Accountable agents; current holder is responsible | Any accountable peer |
| `Nondominium` physical | Accountable agents; current holder is responsible | Any accountable peer |
| `Commons` digital | Accountable stewards | Any accountable peer |
| `Collective` / `Public` | Treat like shared stewardship for MVP witness rules | Accountable peer (Soft until affiliation is live) |

MVP does not yet query DHT for “accountable” membership; the UI requires a **distinct second agent** (member picker). Affiliation-gated witness is a later seam.

`TransferCustody` under `Private` is ownership-relevant; under Pool / Nondominium it is responsibility handoff only (no enclosure). Capture resistance for raw `Transfer` / `Consume` / `Lower` on Nondominium remains in `check_capture_resistance`.

## Action families

| Family | Leaves | Notes |
|--------|--------|-------|
| **Labour** | `Work`, `Modify`, `Produce` | Modify ⊂ specialized work (repair / change). |
| **Location** | `Move`, `Accept` | Move ≃ transport; Accept pairs with transport delivery. |
| **AccessUse** | `AccessForUse`, `Use` | AccessForUse leads to Use; Use is physical/hybrid. |
| **Custody** | `TransferCustody`, `Transfer`, `InitialTransfer` | Always bilateral handoff. |
| **Stock** | `Consume`, `Lower`, `Raise` | Related to use / batch quantity. |
| **Remix** | `Combine`, `Separate` | Labour-like; regime/scope sensitive. |
| **Cite** | `Cite` | Citation of the NDO; no inventoriable qty. |

## Initiation modes

Orthogonal to the action leaf:

| Mode | Meaning |
|------|---------|
| `self_allocate` | Author is the performer; must name a distinct witness for commitment closure. |
| `publish_request` | Author is the witness / requester side; performer left empty for a peer to take. |

Deferred: `fulfill_request` (claim an open task), red-flag invalidation of logs.

Default on **commitment** forms for Labour / AccessUse / Location / Stock / Remix / Cite: `publish_request`.  
Custody transfers default author seed to **From** (`provider`) as the handoff initiator.

## Surface rules

| Surface | Agent mode |
|---------|------------|
| **Commitment** | Always **bilateral** when the commitment is expected to close via `fulfill_commitment_closure`: `provider !== receiver` required. |
| **Event** | May be `unilateralSame` for self-performed observation (Cite, Produce, Move, Consume, Lower, Raise, Combine, Separate). Bilateral leaves stay bilateral. |

Unilateral **commitments** that cannot close via countersign must not be creatable in the UI or zome for closure-bound actions.

## Wire mapping (performer / witness → provider / receiver)

| Family / leaf | Performer wire | Witness wire | Typical `publish_request` author seed |
|---------------|----------------|--------------|----------------------------------------|
| Labour (`Work`, `Modify`, `Produce`) | `provider` | `receiver` | `witness` (receiver) |
| `Use` | `receiver` (User) | `provider` (Custodian) | `performer` (receiver) |
| `AccessForUse` | `receiver` (Requester) | `provider` (Grantor) | `performer` (receiver) |
| `Move` | `provider` (Custodian) | `receiver` (Requestor) | `witness` (receiver) |
| `Accept` | `receiver` (Acceptor) | `provider` | `witness` (provider) — delivery proposed by provider |
| Custody (`Transfer*`) | `provider` (From) | `receiver` (To) | `performer` (provider) |
| Stock / Remix / Cite | `provider` | `receiver` | `witness` (receiver) |

Labels are family- and leaf-specific (e.g. Modify: Repairer / Custodian witness).

## Fulfill consent

`fulfill_commitment_closure`:

1. Caller must be `provider` or `receiver`.
2. Caller must **not** be the commitment action author (author consented by writing; other party initiates; author countersigns).
3. Commitment must not already have a Claim.

UI must gate Fulfill on (1)–(3), not only (2).

## Implementation map

| Layer | Location |
|-------|----------|
| Spec (this doc) | `documentation/specifications/participation-grammar.md` |
| Grammar predicates | `@nondominium/ndo-ui` `domain/participation-grammar.ts` |
| Form fields | `domain/action-form-spec.ts` (consumes grammar for agents) |
| Fulfill gating | `domain/fulfillment-consent.ts` |
| Profile expansion | `domain/ndo-ui-profile.ts` |
| hApp forms | `ui/.../CommitmentCreateForm.svelte`, `EconomicEventCreateForm.svelte`, `ActivityTab.svelte` |
| Zome | `propose_commitment` rejects `provider == receiver`; fulfillment error copy |

## Deferred seams

- Red-flag / invalidation of economic logs (governance).
- Task board: publish → claim (`fulfill_request`).
- Many-to-many custody / multi-party PPRs.
- `AgentContext` on provider/receiver; NDO project face as agent.
- DHT-backed “accountable agent” membership checks for witness eligibility.
