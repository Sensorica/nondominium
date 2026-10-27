---
name: complexity-oriented-programming
description: >-
  Apply Complexity Driven Development (CDD) and Complexity Oriented Programming
  (COP) principles when writing requirements, architecting systems, or
  implementing code. Treats software as an evolving coordination structure
  rather than a deterministic machine. Use when designing distributed,
  peer-to-peer, agent-centric, governance-heavy, or commons-based systems; when
  a user mentions complexity, coordination, emergence, holonic/fractal
  architecture, stigmergy, governance-as-operator, agent-centric design, or
  Nondominium/Holochain/AD4M-style systems; or when reviewing an architecture
  for resilience and evolvability under rising complexity.
---

# Complexity Oriented Programming (COP / CDD)

Treat software not as a deterministic mechanism executing instructions, but as an **evolving coordination structure**. Shift the design target from *control and execution* to *coordination and emergence*. The goal is systems that stay coherent, adaptable, and intelligent as complexity grows — not systems that minimize complexity at the cost of rigidity.

The design unit is not `function → class → module`. It is `agent → process → resource → relation → network → ecosystem`.

## When to apply

Apply this skill across three activities: writing **requirements/specifications**, designing **architecture**, and **implementing** code. At each, run the relevant checks below and surface trade-offs to the human before committing to a centralized, rigid, or hard-coded approach.

## The six principles (and what to check)

1. **Dynamic Complexity Matching** — coordination overhead must match the *actual* social complexity of the task, not the imagined maximum.
   - Check: Are we forcing heavy governance/schema/validation onto something that is still just an idea? Start with a lightweight identity anchor; activate deeper layers only when real coordination demands it.
   - Check (subsidiarity): Are decisions being made centrally that could be resolved locally? Push authority to the edges. Global coordination should emerge from local interactions, not be imposed top-down.

2. **Governance-as-Operator** — decouple the data substrate from the regulatory/state-transition logic.
   - Check: Is business/governance logic hard-coded into core data models? Separate raw data from the logic that evaluates state transitions, so rules can evolve without destructive data migrations.

3. **Stigmergic Coordination** — agents coordinate by modifying a shared environment, not via top-down orchestrators.
   - Check: Is there a central controller telling everyone what to do? Prefer discoverable traces, reputation signals (e.g. participation receipts), and attachable capability slots over a mediating orchestrator.

4. **Fractal Composability** — organizational and architectural patterns apply recursively across scales.
   - Check: Do team-scale, network-scale, and federation-scale coordination use different mechanisms? Unify them. The rules for one agent should scale to a collective acting as a single holon.

5. **Path-Dependency Awareness** — past choices silently constrain present options.
   - Check: Before a refactor or major design decision, scan commit history and codebase evolution. Warn the developer when a current choice is blindly inherited from a legacy decision, and offer a path that breaks the lock-in.

6. **Anti-Fragility** — design systems that gain from stress, not just survive it.
   - Check: When a component fails, an agent misbehaves, or a dispute arises, does the system merely recover — or does it generate data (PPRs, verification caches, governance signals) that makes it smarter? If disruption only costs, the system is fragile. If it also teaches, it is anti-fragile.

## Activity-specific guidance

### Requirements & specifications
- Design for **progressive activation**, not a finished global state. Allow an artifact to begin as low-complexity intent and accrue structure over time.
- Treat actors as **holons**: ensure requirements hold whether the actor is a single human, an AI agent, or an entire organization. Avoid assuming a flat individualistic hierarchy.
- Treat resources as **autonomous entities** with embedded governance, identity, and lifecycle — not passive data objects. A resource should carry its own rules and exist independently of any hosting platform.

### System architecture
- Implement **Governance-as-Operator** (separate substrate from regulatory signaling).
- Use **stigmergic coordination** instead of central orchestrators where feasible.
- Ensure **fractal composability** — recursive primitives across scales.
- Design **trust propagation** through composition hierarchies: local verification at each level (component, assembly, system) should produce global coherence. When a component changes, only affected verification paths need re-evaluation.

### Implementation & coding
- Prefer **agent-centric data models** over a single global-consensus bottleneck; let global coherence emerge from local, peer-validated rules.
- Treat rules as **mutable data** ("Social DNA") the system can amend over time, rather than hard-coded constants.
- Enforce **path-dependency awareness** during refactors and major changes.
- Model resource **composition** as a fractal structure: Atomic (base, no sub-components), Component (reusable part), Composite (assembly of components). Each level should be independently verifiable, with trust propagating upward through the hierarchy.

## Interaction guidance

If asked to build a heavily centralized, monolithic, CRUD-only system, build it — but first briefly surface the COP alternative and the trade-off (e.g. "we could separate the data substrate from governance logic so rules can evolve organically — worth it?"). Do not lecture; offer the choice, then proceed with the user's decision.

## Evaluation lens

Judge a design by systemic viability, not just velocity or defect rate:
- **Anti-fragility** — the system improves from stress: disputes generate better governance data, failures populate verification caches, adversarial behavior strengthens reputation signals.
- **Evolvability** — rules (Layer 1 "Social DNA") can change without breaking the identity substrate (Layer 0).
- **Coordination capacity** — heterogeneous agents collaborate without central mediation.
- **Holonic health** — collectives function without crushing the autonomy of their parts.
- **Trust composability** — verification and integrity compose through fractal hierarchies without requiring global re-verification when local components change.

## Additional resources

- Full methodology specification: [methodology.md](methodology.md)
