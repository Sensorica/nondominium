# hREA Documentation

This folder contains documentation related to hREA, the Holochain implementation of the ValueFlows economic vocabulary. It covers Nondominium's integration strategy, the long-term maintainership roadmap, and a field-level compliance audit of hREA against the ValueFlows 1.0 ontology.

## Documents

| Document | Description |
|---|---|
| [Integration Strategy](./integration-strategy.md) | How Nondominium integrates hREA as its ValueFlows backend engine: architecture, cross-DNA call patterns, migration plan |
| [Strategic Roadmap](./strategic-roadmap.md) | Phase 1+2 maintainership proposal: VF 1.0 gap closure, stub validation implementation, JSON-LD interoperability API |
| [ValueFlows 1.0 Compliance Analysis](./valueflows-1.0-compliance.md) | Field-by-field audit of hREA `main-0.6` against VF 1.0 (~65% compliance), with P0/P1/P2 gap prioritization |

## Context

hREA serves as Nondominium's economic primitive layer. Nondominium's three zomes (person, resource, governance) delegate core ValueFlows types (EconomicResource, EconomicEvent, Agent, Commitment) to hREA via cross-DNA calls, keeping Nondominium focused on its specialized concerns: governance, privacy, and the PPR reputation system.

NDO v1.0's full capabilities depend on hREA reaching the compliance targets described in the strategic roadmap. The P0 gaps (`vf:Claim`, `effortQuantity`) in hREA must land before Nondominium's work-event recording and claim-based reciprocity workflows are available.

## Related Documents

- [NDO v1.0 Architecture Design](../specifications/ndo-v1-architecture-design.md): NDO's dependency on hREA and dual-DNA architecture
- [API Reference](../API_REFERENCE.md): Cross-DNA call patterns (Pattern 5: agent name resolution)
