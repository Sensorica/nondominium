# hREA Strategic Roadmap
## Phase 1+2 Proposal: Stabilization, VF 1.0 Alignment, and JSON-LD Interoperability

**Authors:** Sacha Pignot (Soushi888), Tiberius Brastaviceanu (Tibi)
**Organization:** Sensorica Open Value Network / hAppenings Community
**Status:** Draft — March 2026
**Repository:** [github.com/h-REA/hREA](https://github.com/h-REA/hREA)

> This document proposes Phase 1 and Phase 2 for the hREA maintainership transition. Phase 3 (ValueFlows DSL) and Phase 4 (ADAM integration) are outlined briefly as potential future evolutions but are out of scope for this proposal.

---

## Context

hREA is the Holochain implementation of the ValueFlows economic vocabulary, built on the REA (Resource-Event-Agent) accounting ontology. Its GraphQL API layer has been effectively abandoned, leaving the zome API as the de facto interface — but without adequate documentation, stabilization, or alignment with ValueFlows v1.0.

Sensorica, through its active development of Nondominium and sustained engagement with the ValueFlows community, is positioned to take on maintainership and drive hREA toward a more coherent and interoperable architecture. This document proposes a two-phase roadmap: foundational stabilization with full VF 1.0 alignment, followed by a JSON-LD interoperability layer that makes hREA a first-class citizen of the distributed ValueFlows ecosystem.

---

## Phase 1 — Stabilization and ValueFlows v1.0 Alignment

*Immediate priority*

### Goals

- Bring hREA's zome API into stable, documented shape
- Close all known gaps against the ValueFlows v1.0 ontology
- Enforce correctness at the DHT validation layer
- Make direct zome-to-zome and DNA-to-DNA calls a first-class integration pattern

### Work Items

**ValueFlows v1.0 gap closure**

A full compliance audit against the VF 1.0 TTL ontology (`https://w3id.org/valueflows/ont/vf#`) identified hREA main-0.6 at approximately 65% compliance. The following gaps are to be closed in priority order:

- **P0 — Critical:** Add `vf:Claim` entry type (coordinator + integrity zomes); add `settles` field to `ReaEconomicEvent`. Required for contribution accounting and invoicing workflows.
- **P0 — Critical:** Add `effortQuantity` to `ReaEconomicEvent`. Required for all `work` and `deliverService` action events — the primary use case in Open Value Networks.
- **P1:** Add `reciprocalRealizationOf` to `ReaEconomicEvent`; `reciprocalClauseOf` to `ReaCommitment`. Required for bilateral exchange event recording.
- **P1:** Add `mediumOfExchange` and `substitutable` to `ReaResourceSpecification`. Required for currency token and fungibility workflows.
- **P1:** Add `purpose` to `ReaProposal` (offer/request distinction). Required for Requests & Offers filtering.
- **P2:** `vf:SpatialThing` as a proper entry type (replace `Option<String>` location fields); `vf:BatchLotRecord`; missing Action effect dimensions (`locationEffect`, `stageEffect`, `stateEffect`, `containedEffect`, `createResource`, `eventQuantity`).

Full field-by-field gap analysis: `.local/hrea-valueflows-1.0-compliance.md`

**Stub validation implementation**

Every integrity zome validation function is currently a stub returning `ValidateCallbackResult::Valid` with a `// TODO` comment. This is the most consequential correctness gap: invalid entries can be written to the DHT by any non-compliant client. Phase 1 implements, at minimum:

- Action input/output constraint on `EconomicEvent` creation (using `get_builtin_action()`)
- Temporal consistency: `has_beginning < has_end` where both are present
- Quantity positivity check
- `provider`/`receiver` presence validation for transfer actions

This serves both the VF community (spec compliance) and any existing hREA users in production — external communities who cannot absorb silent data corruption during the transition.

**Zome API documentation**

With GraphQL retired as the primary interface, the zome call surface becomes the public API. It needs to be documented as such: function signatures, input/output types, capability grant requirements, and cross-zome call patterns. A concise reference guide targeting Holochain developers building on hREA.

**Direct call promotion**

Actively promote zome calls as the integration pattern for:

- Cross-zome calls within the same DNA (same-network composition)
- Cross-DNA bridge calls (composing hREA with other hApps like Nondominium, Requests & Offers)
- UI-direct calls via Holochain's conductor API

This removes the GraphQL indirection entirely for native Holochain consumers, reducing latency and eliminating a maintenance surface.

**Test coverage and CI**

Stabilization without tests is fragile. This phase introduces or restores comprehensive integration tests against the Holochain conductor and a robust CI pipeline.

---

## Phase 2 — JSON-LD API

*Interoperability layer for the outside world*

### Goals

- Expose hREA data in standard ValueFlows JSON-LD format
- Enable federation with non-Holochain ValueFlows implementations
- Provide a semantic foundation for external bridges (TikiWiki, Dolibarr, Solid pods)
- Establish a machine-readable VF compliance versioning mechanism

### Architecture: Two Complementary Layers

The JSON-LD layer is not a single component — it is two distinct layers operating at different levels, both required for complete interoperability.

**Layer 1 — Translation Zome (serialization)**

A `vf_jsonld` coordinator zome inside the hREA DNA. Core functions:

```rust
get_as_jsonld(hash: ActionHash) -> ExternResult<String>
get_vf_context(_: ()) -> ExternResult<String>
get_vf_compliance(_: ()) -> ExternResult<VfCompliance>
```

The zome reads any entry by hash, applies the official VF `@context`, and returns a well-formed JSON-LD document. Agent-controlled — no external party can alter how the agent's data is expressed. Because serialization logic lives in the same codebase as the structs, every Phase 1 addition (new fields, new entry types) propagates to JSON-LD output automatically.

**Layer 2 — External Gateway (exposure)**

A lightweight service (Tauri sidecar for desktop deployment, standalone process for server deployments) that calls the translation zome via the conductor API and exposes the JSON-LD output over HTTP. This is what Dolibarr, Bonfire, and Solid pods consume — they cannot call Holochain zomes directly.

The gateway reads `get_vf_context()` from the DNA to construct its `@context`. Both layers share one authoritative source — they cannot produce inconsistent output.

### VF Compliance Versioning

VF compliance is not a semantic version number — it is an enumerable field mapping. The compliance analysis proves this: every implemented and missing VF 1.0 property is known precisely. The versioning mechanism makes this machine-readable.

**Three artifacts working together:**

**1. A `VF_CONTEXT_URI` constant in the DNA**

```rust
// In coordinator/hrea/src/lib.rs
pub const VF_CONTEXT_URI: &str =
    "https://hrea.io/contexts/hrea-0.6_vf-1.0.jsonld";
```

The URI encodes both the hREA version and the VF version targeted. When structs change (new DNA), the constant changes. When VF updates, the constant changes. Both the translation zome and the external gateway read this single constant — they cannot diverge during version transitions.

**2. A versioned context document published at that URI**

Generated directly from the compliance analysis. `null` values are explicit about gaps — not silent:

```jsonld
{
  "@context": {
    "vf": "https://w3id.org/valueflows/ont/vf#",
    "hrea_version": "0.6",
    "vf_version": "1.0.0",
    "compliance_level": "partial",
    "EconomicEvent": "vf:EconomicEvent",
    "action": "vf:action",
    "effortQuantity": null,
    "settles": null
  }
}
```

**3. A `get_vf_compliance()` coordinator function**

Returns the full compliance profile at runtime — hREA version, VF version, compliance level, context URI, and the explicit list of missing fields. Any consuming system can inspect this before connecting.

**When VF updates arrive:** update the constant, publish a new context document at the new versioned URI. No consistency gap between the translation zome and the gateway — both read from the same DNA constant.

### URI Strategy

Holochain action hashes are content-addressed and globally unique — they make natural JSON-LD subject URIs:

```
hc://[dna-hash]/[action-hash]
```

Resolvable by any node with the DNA installed, preserving agent-centric semantics while providing the stable identity that JSON-LD requires.

### What This Unlocks

- **Cross-implementation federation:** A Nondominium node and a Django-based ValueFlows instance can exchange `EconomicEvent` records because they share JSON-LD context
- **SPARQL querying:** Aggregate ValueFlows data across a network for reporting and analysis
- **ERP bridges:** TikiWiki and Dolibarr can consume and produce hREA data via standard linked data patterns without custom protocol translation
- **Solid interop:** ValueFlows data expressed as Linked Data Notifications flows naturally into Solid pods

---

## Potential Future Evolutions

Phase 1+2 constitute the full scope of this proposal. The following directions are on the horizon but are not part of the current commitment.

**ValueFlows DSL** — A human-writable scripting language compiling to native zome calls, JSON-LD, and legacy GraphQL. The shareable contribution would be a formal ValueFlows AST targeting multiple backends — worth presenting to the VF community as companion tooling, not a competing standard.

**ADAM Integration** — Registering the ValueFlows DSL as an ADAM Language and surfacing hREA data as traversable Perspectives in the AD4M agent graph. The JSON-LD layer from Phase 2 makes this natural when the time comes: an hREA node that produces well-formed ValueFlows JSON-LD is already speaking the right dialect.

---

## Governance and Community

Taking on hREA maintainership is not only a technical commitment. It is a position of stewardship in the ValueFlows and Holochain ecosystems. The following principles should guide this work:

**Upstream coordination** — Changes that affect ValueFlows compliance should be discussed with Lynn Foster and the VF community before implementation. hREA is an implementation of a shared vocabulary, not a fork.

**Open maintainership** — The goal is not to control hREA but to revive it. Active solicitation of co-maintainers, clear contribution guides, and a public roadmap support a healthy transition. Struct changes in Phase 1 (adding `vf:Claim`, `effortQuantity`, location type migration) are breaking changes for existing hREA users. Clear migration guides and a deprecation window are part of the stabilization commitment — not an afterthought.

**Nondominium as reference implementation** — Sensorica's use of hREA through Nondominium provides the most concrete test of the zome API's real-world fitness. Feedback flows upstream: what breaks in practice gets fixed in hREA. The compliance analysis at `.local/hrea-valueflows-1.0-compliance.md` is the living source of truth for Phase 1 gap closure and the generator of the Phase 2 context documents.

**hAppenings ecosystem alignment** — Requests & Offers and other hAppenings hApps should benefit from hREA improvements. The JSON-LD work should be designed with multi-hApp composition in mind from the start.

---

## Summary Timeline

| Phase | Focus | Scope |
|-------|-------|-------|
| 1 | Stabilization + VF 1.0 gap closure + stub validation | **This proposal** |
| 2 | JSON-LD API (translation zome + gateway + compliance versioning) | **This proposal** |
| 3 | ValueFlows DSL | Potential future evolution |
| 4 | ADAM integration | Potential future evolution |

---

## References

- [ValueFlows specification](https://valueflo.ws)
- [VF 1.0 ontology](https://w3id.org/valueflows/ont/vf#)
- [hREA repository](https://github.com/h-REA/hREA)
- [Nondominium](https://github.com/sensorica/nondominium)
- [AD4M / ADAM](https://ad4m.dev)
- [JSON-LD](https://json-ld.org)
- [Holochain](https://holochain.org)
- [REA Ontology](http://www.reaontology.com)
- [Compliance analysis](.local/hrea-valueflows-1.0-compliance.md)
