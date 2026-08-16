# ADR-010 … ADR-013 — Per-NDO cells, group anchors, and DnaHash binding

**Status**: Accepted, implemented in v0.1.0 (PR #128, `Closes #120`)
**Scope**: NDO Layer 0 identity. Touches `documentation/requirements/ndo_prima_materia.md`'s
three-layer model, so it is load-bearing per `documentation/TELOS.md`.
**Long-form design of record**: `.local/nondominium-architecture-design-2026-08-08.md`
(kept out of the repo). This file is the in-repo record: it states the decisions,
the constraints that forced them, and where the code lives — enough to review or
revise the architecture without the local document.

---

## ADR-010 — One cloned cell per NDO ("model A")

**Decision.** Every NDO is its own cloned `ndo` DNA cell, provisioned on demand
(`workdir/happ.yaml`: role `ndo`, `deferred: true`, `clone_limit: 512`). The Layer 0
`NondominiumIdentity` genesis entry lives inside that cell, not in the shared
`nondominium` cell.

**Why.** An NDO is a coordination boundary, not a row: its members, its process
activity, and eventually its governance all want their own DHT. A shared cell makes
every NDO's traffic every agent's traffic and gives the NDO no identity of its own
beyond an action hash in someone else's DHT.

**Consequence.** The NDO's permanent identity becomes its `DnaHash` — see ADR-013.
Pre-migration NDOs still exist in the shared `nondominium` cell, so the read paths
keep a legacy fallback (`ndo.service.ts`).

## ADR-011 — Group DHTs anchor NDOs; there is no global registry

**Decision.** Discovery is per group. Each group clone cell holds `NdoAnchor` entries
(`dnas/group/zomes/integrity/zome_group_integrity`), one per NDO the group hosts,
carrying the full clone coordinates plus cached card fields. The Lobby's NDO browser
is the union of the agent's groups' anchors.

**Why.** A global registry re-centralises exactly what the group DHT already
decentralises, and it would make every NDO visible to every agent regardless of
membership.

**Consequence.** The anchor is the ONLY pointer any NDO read path follows. Three
things follow from that, and all three are enforced in code:

1. `createNdo` does not treat the anchor write as best-effort — an NDO whose anchor
   did not land is a cell nobody can reach again.
2. Associating an existing NDO with a second group means writing a second anchor
   (`NdoService.associateNdoWithGroup`), not a `SoftLink`. `SoftLink` remains a
   valid group entry type but is no longer part of NDO association.
3. Cached anchor fields drift: `refresh_ndo_anchor_lifecycle_stage` resolves an
   anchor **by NDO identity** (the client knows the NDO, not the anchor's
   original-vs-latest action hashes, which belong to the group's link graph) and
   re-syncs `lifecycle_stage` after a transition.

## ADR-012 — Anchor coordinates are a pinning check, not a trust assertion

**Decision.** A reader does not trust `anchor.ndo_dna_hash`. It re-derives the clone
from `(network_seed, properties)` and compares the resulting `DnaHash` to the
anchor's. Matching hashes prove the anchor names the cell it claims to.

**Consequence.** Client, zomes, and tests must derive the *same* hash from the same
inputs, which is why `NdoDnaProperties` has exactly one definition
(`crates/shared/src/types.rs`) that the UI mirror and the Sweettest suite both
follow. A hand-kept mirror already drifted once (a stale `initiator` field).

## ADR-013 — The DnaHash is bound to the NDO identity via DNA properties

**Decision.** The clone's DNA properties carry the immutable Layer 0 classification:

```rust
pub struct NdoDnaProperties {
  pub name: String,
  pub property_regime: PropertyRegime,
  pub resource_nature: ResourceNature,
  pub created_at: Timestamp,
}
```

`validate_create_nondominium_identity` (`dnas/nondominium/zomes/integrity/zome_resource`)
rejects a `create_ndo` whose `name` / `property_regime` / `resource_nature` diverge
from the cell's properties. Immutability is then hash physics, not a validation rule
someone can forget: changing a classification field means a different `DnaHash`,
i.e. a different network.

**Constraint that shaped it.** holochain 0.6.0 transports `create_clone_cell`
properties as `YamlProperties(serde_yaml::Value)`, which has no binary variant. An
`AgentPubKey` in properties hangs `createCloneCell` from the JS client, so
`initiator` is NOT bound by the DnaHash; it stays authoritative on the entry and is
cached on the anchor for display. `created_at` IS in the properties but is not
entry-validated (the entry uses `sys_time`, the properties use the client's
value) — the full mirror validation waits on a `create_ndo` refactor that reads
`dna_info().properties`.

**`created_at` is not a uniqueness source.** It is microseconds derived from a
millisecond wall clock. Two identically-classified NDOs created in the same
millisecond would share it; distinctness comes from the per-NDO `network_seed`,
which is also DnaHash input.

**Skip path.** On the shared `nondominium` cell (`properties: ~`), deserialising to
`NdoDnaProperties` fails and the binding check is skipped, so legacy shared-cell
NDOs keep working. A clone with malformed properties therefore gets no binding —
contained, because such a clone is a different `DnaHash` on a different network.

---

## Where this lives in code

| Concern | Location |
|---|---|
| `NdoDnaProperties` (the one definition) | `crates/shared/src/types.rs` |
| ADR-013 binding check | `dnas/nondominium/zomes/integrity/zome_resource/src/lib.rs` |
| `NdoAnchor` entry + update immutability | `dnas/group/zomes/integrity/zome_group_integrity/src/lib.rs` |
| Anchor externs (`create` / `get` / `update` / `refresh`) | `dnas/group/zomes/coordinator/zome_group/src/ndo_anchor.rs` |
| Clone provisioning (`createNdoCloneCell`, `ensureNdoCloneCell`) | `ui/src/lib/services/holochain.service.svelte.ts` |
| Anchor-driven read/write paths | `ui/src/lib/services/zomes/ndo.service.ts` |
| Rust coverage | `dnas/group/tests/src/ndo_anchor/mod.rs` |
| Browser coverage (2 conductors) | `ui/tests/e2e/specs/{core-flows,multi-agent}.spec.ts` |

## Open follow-ups

- Full ADR-013 mirror validation (`initiator`, `created_at`) behind a `create_ndo`
  refactor that reads `dna_info().properties`.
- Lifecycle transitions do not yet generate an `EconomicEvent`
  (REQ-NDO-LC-02 / LC-03); `transition_event_hash` is `null` in the MVP.
- Anchor cache convergence is pull-based; `remote_signal` push is `TODO(signals)`.
