# hREA Strategic Roadmap

## Phases 1 and 2: Stabilization, VF 1.0 Alignment, and Interoperability

**Status:** Draft, March 2026
**Repository:** [github.com/h-REA/hREA](https://github.com/h-REA/hREA)

> This document proposes Phases 1 and 2 for an hREA maintainership transition. Phase 3 (ValueFlows DSL) and Phase 4 (ADAM integration) are mentioned briefly as potential future directions but are out of scope for this proposal.

---

## Context

hREA is the Holochain implementation of the ValueFlows economic vocabulary, built on the REA (Resource-Event-Agent) accounting ontology. Its GraphQL API layer has been effectively abandoned, leaving the zome API as the de facto interface, but without adequate documentation, stabilization, or alignment with ValueFlows v1.0.

This document proposes a two-phase roadmap: foundational stabilization with full VF 1.0 alignment, followed by an interoperability layer that makes hREA a first-class citizen of the distributed ValueFlows ecosystem. Phase 2 presents an open question for community discussion: whether to revive the existing GraphQL API or adopt a JSON-LD approach.

---

## Phase 1: Stabilization and ValueFlows v1.0 Alignment

_Immediate priority_

### Goals

- Bring hREA's zome API into stable, documented shape
- Close all known gaps against the ValueFlows v1.0 ontology
- Enforce correctness at the DHT validation layer
- Make direct zome-to-zome and DNA-to-DNA calls a first-class integration pattern

### Work Items

**ValueFlows v1.0 gap closure**

A full compliance audit against the VF 1.0 TTL ontology (`https://w3id.org/valueflows/ont/vf#`) identified hREA main-0.6 at approximately 65% compliance. The following gaps are to be closed in priority order:

- **P0 (Critical):** Add `vf:Claim` entry type (coordinator + integrity zomes); add `settles` field to `ReaEconomicEvent`. Required for contribution accounting and invoicing workflows.
- **P0 (Critical):** Add `effortQuantity` to `ReaEconomicEvent`. Required for all `work` and `deliverService` action events, the primary use case in Open Value Networks.
- **P1:** Add `reciprocalRealizationOf` to `ReaEconomicEvent`; `reciprocalClauseOf` to `ReaCommitment`. Required for bilateral exchange event recording.
- **P1:** Add `mediumOfExchange` and `substitutable` to `ReaResourceSpecification`. Required for currency token and fungibility workflows.
- **P1:** Add `purpose` to `ReaProposal` (offer/request distinction). Required for Requests and Offers filtering.
- **P2:** `vf:SpatialThing` as a proper entry type (replace `Option<String>` location fields); `vf:BatchLotRecord`; missing Action effect dimensions (`locationEffect`, `stageEffect`, `stateEffect`, `containedEffect`, `createResource`, `eventQuantity`).

Full field-by-field gap analysis: `.local/hrea-valueflows-1.0-compliance.md`

**Stub validation implementation**

Every integrity zome validation function is currently a stub returning `ValidateCallbackResult::Valid` with a `// TODO` comment. This is the most consequential correctness gap: invalid entries can be written to the DHT by any non-compliant client. Phase 1 implements, at minimum:

- Action input/output constraint on `EconomicEvent` creation (using `get_builtin_action()`)
- Temporal consistency: `has_beginning < has_end` where both are present
- Quantity positivity check
- `provider`/`receiver` presence validation for transfer actions

This serves both the VF community (spec compliance) and any existing hREA users in production, meaning external communities who cannot absorb silent data corruption during the transition.

**Zome API documentation**

With GraphQL retired as the primary interface, the zome call surface becomes the public API. It needs to be documented as such: function signatures, input/output types, capability grant requirements, and cross-zome call patterns. A concise reference guide targeting Holochain developers building on hREA.

**Direct call promotion**

Actively promote zome calls as the integration pattern for:

- Cross-zome calls within the same DNA (same-network composition)
- Cross-DNA bridge calls (composing hREA with other hApps)
- UI-direct calls via Holochain's conductor API

This removes the GraphQL indirection entirely for native Holochain consumers, reducing latency and eliminating a maintenance surface.

**Test coverage and CI**

Stabilization without tests is fragile. This phase introduces or restores comprehensive integration tests against the Holochain conductor and a robust CI pipeline.

---

## Phase 2: Semantic Interoperability

_An invitation to the community_

### The Question

Phase 1 establishes a clean, documented zome API for native Holochain consumers. Phase 2 asks a broader question: how should hREA present itself to the wider semantic web?

The ValueFlows vocabulary is grounded in RDF and W3C linked data standards. hREA implements that vocabulary on an agent-centric substrate. The opportunity in Phase 2 is to make that implementation legible to the outside world, whether that means other ValueFlows nodes, external applications, or federated social and economic networks. The right approach depends on where the ecosystem is heading and where effort is best spent. This section presents three directions and invites community discussion before any Phase 2 work begins.

---

### Option A: Maintain and Improve the GraphQL API

The existing GraphQL layer already exists as a codebase surface, and parts of the ecosystem may depend on it. Reviving it would mean:

- Auditing and updating the schema to match the Phase 1 VF 1.0 additions
- Restoring CI coverage for the GraphQL layer
- Continuing to maintain a translation layer between Holochain's entry model and GraphQL types

Tradeoffs: familiar to existing integrators, compatible with tools that already target the hREA GraphQL schema. Carries ongoing maintenance overhead. Does not provide semantic interoperability with non-GraphQL ValueFlows nodes.

---

### Option B: JSON-LD Serialization Layer

Retire GraphQL as the primary external interface and replace it with a JSON-LD serialization layer grounded in the official ValueFlows vocabulary.

Tradeoffs: aligns with W3C linked data standards, enables federation with non-Holochain VF implementations, supports SPARQL querying and Solid pod interop. Requires migrating existing integrators away from GraphQL. A larger upfront investment than reviving the existing API.

**On the transport layer:** the Holochain Foundation's [`hc-http-gw`](https://github.com/holochain/hc-http-gw) (and Holo's Web Bridge for hosted deployments) already provides a ready-made HTTP-to-zome bridge, eliminating the need to build a custom gateway process. The architecture then reduces to building the translation zome only. External clients send an HTTP request, the gateway dispatches it as a zome call, and the translation zome returns a well-formed JSON-LD document directly.

```
External client
    ↓  HTTP GET
hc-http-gw / Holo Web Bridge
    ↓  zome call
vf_jsonld translation zome  ←  the only custom component
    ↓  JSON-LD string
hc-http-gw (passes through)
    ↓  HTTP response
External client receives JSON-LD
```

The full architecture for the translation zome and compliance versioning mechanism is specified below as a concrete reference, should the community choose this direction.

---

### Option C: ActivityPub Federation

The ValueFlows community outside Holochain is already building federation through ActivityPub. Bonfire (the Fediverse platform) supports ValueFlows as an ActivityPub extension, and active Fediverse Enhancement Proposals (FEPs) address federated marketplaces and work coordination using the ValueFlows vocabulary. ActivityPub serializes natively in JSON-LD.

This path does not require building a new gateway or serialization layer. It means implementing the ActivityPub protocol on top of hREA's data, joining an existing and growing federation network.

Tradeoffs: strong community momentum, JSON-LD native, interoperable with the entire Fediverse. Requires ActivityPub protocol implementation, a meaningful additional scope. hREA would need to speak both its native zome API and ActivityPub.

---

_The options are not mutually exclusive. A combination (for example, Option B as a read layer and Option C as a federation layer) is worth discussing. The goal of Phase 2 is not to select an architecture in isolation but to align with where the ValueFlows and Holochain communities are heading together._

---

### Option B Reference Architecture

_This section specifies the JSON-LD approach in detail as a concrete proposal. It is presented for community review, not as a decided direction._

**Translation Zome (the only custom component)**

A `vf_jsonld` coordinator zome inside the hREA DNA. Core functions:

```rust
get_as_jsonld(hash: ActionHash) -> ExternResult<String>
get_vf_context(_: ()) -> ExternResult<String>
get_vf_compliance(_: ()) -> ExternResult<VfCompliance>
```

The zome reads any entry by hash, applies the official VF `@context`, and returns a well-formed JSON-LD document. Agent-controlled, meaning no external party can alter how the agent's data is expressed. Every Phase 1 addition (new fields, new entry types) propagates to JSON-LD output automatically because the serialization logic lives in the same codebase as the structs.

### VF Compliance Versioning

VF compliance is not a semantic version number, it is an enumerable field mapping. The compliance analysis proves this: every implemented and missing VF 1.0 property is known precisely. The versioning mechanism makes this machine-readable.

**Three artifacts working together:**

**1. A `VF_CONTEXT_URI` constant in the DNA**

```rust
// In coordinator/hrea/src/lib.rs
pub const VF_CONTEXT_URI: &str =
    "https://hrea.io/contexts/hrea-0.6_vf-1.0.jsonld";
```

The URI encodes both the hREA version and the VF version targeted. When structs change (new DNA), the constant changes. When VF updates, the constant changes. Both the translation zome and the external gateway read this single constant and cannot diverge during version transitions.

**2. A versioned context document published at that URI**

Generated directly from the compliance analysis. `null` values are explicit about gaps, not silent:

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

Returns the full compliance profile at runtime: hREA version, VF version, compliance level, context URI, and the explicit list of missing fields. Any consuming system can inspect this before connecting.

**When VF updates arrive:** update the constant, publish a new context document at the new versioned URI. No consistency gap between the translation zome and the gateway.

### URI Strategy

Holochain action hashes are content-addressed and globally unique, making them natural JSON-LD subject URIs:

```
hc://[dna-hash]/[action-hash]
```

Resolvable by any node with the DNA installed, preserving agent-centric semantics while providing the stable identity that JSON-LD requires.

### What This Unlocks

- **Cross-implementation federation:** Holochain-based and non-Holochain ValueFlows nodes can exchange `EconomicEvent` records because they share JSON-LD context
- **SPARQL querying:** Aggregate ValueFlows data across a network for reporting and analysis
- **Application bridges:** Any application can consume and produce hREA data via standard linked data patterns without custom protocol translation
- **Solid interop:** ValueFlows data expressed as Linked Data Notifications flows naturally into Solid pods

---

## Potential Future Directions

Phases 1 and 2 constitute the full scope of this proposal. Two directions are on the horizon as potential future evolutions, each subject to separate community discussion: a **ValueFlows DSL** (a human-writable scripting language compiling to native zome calls and JSON-LD) and **ADAM integration** (registering hREA data as traversable Perspectives in an agent-centric graph layer, made natural by the JSON-LD foundation from Phase 2).

---

## Governance and Community

Taking on hREA maintainership is not only a technical commitment. It is a position of stewardship in the ValueFlows and Holochain ecosystems. The following principles should guide this work:

**Upstream coordination:** Changes that affect ValueFlows compliance should be discussed with the ValueFlows specification maintainers and community before implementation. hREA is an implementation of a shared vocabulary, not a fork.

**Open maintainership:** The goal is not to control hREA but to revive it. Active solicitation of co-maintainers, clear contribution guides, and a public roadmap support a healthy transition. Struct changes in Phase 1 (adding `vf:Claim`, `effortQuantity`, location type migration) are breaking changes for existing hREA users. Clear migration guides and a deprecation window are part of the stabilization commitment, not an afterthought.

**Reference implementations:** Active use of hREA in production hApps provides the most concrete test of the zome API's real-world fitness. Feedback flows upstream: what breaks in practice gets fixed in hREA. The compliance analysis at `.local/hrea-valueflows-1.0-compliance.md` is the living source of truth for Phase 1 gap closure and the generator of the Phase 2 context documents.

**Multi-hApp composition:** hApps building on hREA should benefit from these improvements. The interoperability work should be designed with multi-hApp composition in mind from the start.

---

## Summary Timeline

| Phase | Focus                                                                                   | Scope             |
| ----- | --------------------------------------------------------------------------------------- | ----------------- |
| 1     | Stabilization + VF 1.0 gap closure + stub validation                                    | This proposal     |
| 2     | Semantic interoperability (GraphQL, JSON-LD, or ActivityPub: open community discussion) | This proposal     |
| 3     | ValueFlows DSL                                                                          | Future discussion |
| 4     | ADAM integration                                                                        | Future discussion |

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
- [Holochain HTTP Gateway (hc-http-gw)](https://github.com/holochain/hc-http-gw)
- [Holo Web Bridge](https://holo.host/blog/introducing-cloud-nodes-web-bridge-for-holochain-7WCp2eKjHD4/)
- [ActivityPub specification](https://www.w3.org/TR/activitypub/)
- [Bonfire: ValueFlows + ActivityPub](https://bonfirenetworks.org)
- [Compliance analysis](.local/hrea-valueflows-1.0-compliance.md)
