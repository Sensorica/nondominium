# Grassroots Economics × Nondominium — Commitment Pool experiment

**Audience:** Grassroots Economics (GE) collaborators trying Commitment Pooling on Holochain, without adopting the rest of the Nondominium roadmap.
**Branch:** `commitment-pool-experiment`
**Status:** Runnable two-agent prototype. Not a production protocol.

This is a thin mapping: GE's Commitment Pool is a **Group**. The things people commit *about* are **NDOs**. The promises themselves are ValueFlows **Commitments**. Fulfillment is one coordinator call that writes the observation, the claim, and both bilateral Private Participation Receipts (PPRs).

## What you can try

Two agents, one group-as-pool, one NDO, a commitment that gets admitted and then fulfilled.

1. Agent A creates a Group (this *is* the pool).
2. Agent A creates an NDO from inside that Group (a bicycle, a workshop hour, a bag of maize — whatever).
3. Agent A proposes a Commitment on the NDO (Activity tab): action, provider, receiver, optional quantity (`Measure`: number + unit).
4. Any group member **Admits** that commitment into the pool. Admission is a pointer on the Group DHT (`CommitmentAnchor`). It does not move or copy the commitment. The NDO does not have to "belong" to the pool.
5. Provider or receiver **Fulfills** the commitment. Both agents must be online: fulfillment countersigns over `call_remote`, then writes:
   - `EconomicEvent` (what actually happened)
   - `Claim.fulfilled_by` = the real event hash
   - optional `OperationalState` update on the resource
   - two `PrivateParticipationClaim` entries with **real** co-signatures (this is the fix for issue #14)
6. Withdrawal from the pool is a **status mark** (`Admitted` → `Withdrawn`), not a delete. The pool remembers what it once held.

## Mapping

| Grassroots idea | Nondominium thing | Where it lives |
|---|---|---|
| Pool | Group (cloned Group DNA cell) | Group DHT |
| Pool membership | Group membership | Group DHT |
| The thing committed | NDO (`NondominiumIdentity`) | that NDO's own cloned cell |
| Promise | ValueFlows `Commitment` | NDO cell, `zome_gouvernance` |
| Pool listing | `CommitmentAnchor` | Group DHT |
| Observation | ValueFlows `EconomicEvent` | NDO cell |
| "This event fulfills that promise" | ValueFlows `Claim` | NDO cell |
| Mutual receipt | Bilateral PPR (`PrivateParticipationClaim`) | private entries on the fulfiller's source chain |
| Quantity | `Measure { numerical_value, has_unit }` | shared type on Commitment, Event, Resource |

Two read APIs keep the sides independent:

- `get_pool_contents(group_hash)` on Group DNA — every anchor ever admitted, including withdrawn (filter `anchor.status` client-side).
- `get_commitments_for_ndo(ndo_identity_hash)` on Nondominium DNA — commitments linked to one NDO. The UI uses the `_detailed` variant so it also has the action hash needed to admit or fulfill.

## Run it

From the repo root, inside `nix develop`:

```bash
git submodule update --init --recursive
bun install
bun run build:happ
AGENTS=2 bun run network
```

Two browser tabs open (ports `5173` and `5174`), one per agent, isolated `localStorage`. Create a profile if prompted. Then:

- **Lobby** → Create Group → Create NDO
- Open the NDO → **Activity** → New commitment → Admit to pool / Fulfill
- Open the Group → **Commitment pool** section (withdraw lives here)
- Activity tab also lists **My participation claims** (private; only the calling agent sees them)

Fulfillment fails cleanly if the counterparty is offline. That is intentional: a PPR is a two-sided act.

## What this is *not*

Out of scope for this experiment, on purpose:

- Pool-level admission governance (any member may admit)
- Role promotion, governance-as-operator as the mandatory write path
- `EconomicProcess` entry type
- Composition tab, Perspectives, Source-NDOs
- Unyt, Flowsta, hREA Phases 2–4
- A separate "lab" route — the UI is the existing Group and NDO views

PPRs stay private. There is no global reputation score.

## Code map

| Piece | Path |
|---|---|
| `Measure` | `crates/shared/src/types.rs` |
| `propose_commitment` (explicit receiver) | `dnas/nondominium/zomes/coordinator/zome_gouvernance/src/commitment.rs` |
| `fulfill_commitment_closure` + countersign | `…/fulfillment.rs` |
| `CommitmentAnchor` integrity | `dnas/group/zomes/integrity/zome_group/src/` |
| admit / withdraw / `get_pool_contents` | `dnas/group/zomes/coordinator/zome_group/src/commitment_anchor.rs` |
| Sweettests | `dnas/nondominium/tests/src/governance/mod.rs` (`get_commitments_for_ndo_scopes_results`, `fulfill_commitment_closure_happy_path`) |
| UI — NDO Activity | `ui/src/lib/components/ndo/ActivityTab.svelte` |
| UI — Group pool | `ui/src/lib/components/group/PoolSection.svelte` |

Run the two Sweettests **serially** (`-- --test-threads 1`). Parallel sweettests on this suite starve each other and expire Holochain zome-call nonces (~5 min window).

## Next conversation with GE

Useful questions this prototype is meant to make concrete, not to answer in code:

- Who should be allowed to *admit* vs *fulfill*? (today: any group member admits; only provider/receiver fulfill)
- Should a pool constrain *which NDOs* it will list, or stay NDO-agnostic?
- Is withdrawal the right memory model, or do you want an explicit archive / supersede relation?
- Do you want the counterparty's PPR mirrored onto *their* source chain when they next come online? (`mirror_counterparty_ppr` is noted in `fulfillment.rs` and not built)
