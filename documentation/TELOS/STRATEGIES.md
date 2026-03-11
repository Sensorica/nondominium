# Strategies

> Active development and architectural strategies. These are the working principles that guide decisions in the current phase. They evolve as the project moves through its stages.

---

## 1. Foundation-First

Build person → resource → governance in sequence before any external integration. The foundation must be solid before the cathedral is built.

The temptation to integrate with hREA or TrueCommons before the core zomes are stable is real — it feels like progress. But integration work on an unstable foundation produces integration debt: every architectural change in the core ripples through the integration layer and doubles the rework cost. The foundation is complete when the three-zome architecture has full test coverage and consistent multi-agent behavior. Not before.

Current status: foundation largely complete (Phase 1 done, Phase 2 nearly done). The sequence has held.

## 2. Governance-as-Operator Architecture

Maintain strict separation between resource data (`zome_resource`) and governance logic (`zome_gouvernance`). Resist every temptation to add business logic to the data layer.

The pressure to blur this boundary will recur. When a new feature feels natural to implement in the resource zome, the question to ask is: "Is this data management, or is this governance?" If it involves evaluating a condition, issuing a receipt, or changing agent capability — it belongs in the governance zome. The data layer holds state. The governance layer transforms it.

Concrete rule: `zome_resource` never calls `zome_gouvernance`. The operator calls the data layer; the data layer does not call the operator.

## 3. ValueFlows Compliance at Every Level

Use the Knowledge/Plan/Observation ontology for all data structures. Never invent parallel economic vocabulary.

When a data design problem arises that ValueFlows does not cleanly address, the correct response is to study the ValueFlows specification more carefully — not to invent a Nondominium-specific workaround. The shared grammar is too valuable to compromise for a local convenience. If ValueFlows genuinely lacks vocabulary for a concept, the correct response is to contribute to the ValueFlows standard, not to fork the vocabulary.

## 4. PPR-Driven Trust

Build reputation as core infrastructure, not an add-on feature. Every validated economic interaction generates exactly two PPRs (bidirectional). No exceptions, no shortcuts.

The reputation system is only as useful as it is complete. If some interactions generate PPRs and others don't, the gaps become trust dead zones — places in the economic history where behavior is unrecorded and cannot be verified. Completeness is not optional. The PPR system is either always on or it is broken.

Corollary: every new Economic Process type must have its PPR categories specified before implementation begins. PPR is part of the process design, not an afterthought.

## 5. Documentation-First Development

Update specs before code. Treat the requirements documents as the source of truth that the code must manifest.

When implementation reveals a gap or contradiction in the specifications, the correct response is to update the spec first, get clarity on the intended behavior, and then implement. The alternative — implementing a guess and updating the spec to match — produces specification drift: documentation that describes what was built rather than what was intended.

Concrete practice: no new zome function without a corresponding requirement in the specs. If the function would be the first implementation of a pattern, write the pattern in the architecture documentation before writing the Rust.

## 6. hREA Strategic Alignment

Document the integration path for hREA even if implementation is in Phase 3. Architectural decisions made in Phase 2 must not foreclose the integration path.

The risk: building Nondominium's economic data model in ways that are incompatible with hREA's schema, then discovering the incompatibility at integration time. The mitigation: maintain awareness of hREA's data model during Phase 2, flag any schema decisions that would require translation at integration time, and prefer compatible designs when there is no other reason to choose differently.

Nondominium's specialized innovations (PPR system, embedded governance, progressive trust) are complementary to hREA, not competing with it. The integration should look like: hREA as the economic engine, Nondominium as the governance and reputation layer.

## 7. Sensorica Validation

PEP Master is the real-world test case. Every design decision is tested against the question: "Would this work for a collaborative medical device project between three organizations?"

This question has teeth. Medical device governance requires provenance certainty. Multi-organizational collaboration requires clear custody tracking and contribution accounting. The three-organization structure tests multi-reviewer validation at real stakes. The open-source commitment tests whether embedded governance rules can survive forking and redistribution.

If a design decision would fail the PEP Master test, it needs to be revisited — not because PEP Master is the only use case, but because it is the hardest version of the commons governance problem and passing the hardest version is the proof that the approach generalizes.
