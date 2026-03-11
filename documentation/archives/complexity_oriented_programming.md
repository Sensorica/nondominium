"Complexity Oriented Programming" doesn't exist as a formal paradigm yet, which makes it worth thinking through carefully. Here's how I'd frame it:

**The core intuition**

Most paradigms are *reduction* strategies. OOP encapsulates. FP eliminates side effects. Procedural linearizes. They all try to make complexity *disappear* through abstraction. Complexity Oriented Programming (COP) would invert this: instead of hiding complexity, it would *model it faithfully* and work with it as the primary material.

**What it would draw from**

Complexity science offers a clear vocabulary: emergence, feedback loops, attractors, phase transitions, edge of chaos, adaptive agents. COP would translate these into first-class programming concepts. You wouldn't fight emergence, you'd design for it. You wouldn't isolate components from their environment, you'd model the coupling.

**Key principles that could define it**

Rather than single sources of truth, you'd have *distributed state with coherence protocols*. Rather than deterministic pipelines, you'd have *adaptive feedback architectures*. Side effects wouldn't be contained, they'd be *typed as relational events* flowing through a graph. Time and context would be primary, not afterthoughts.

**Where it already exists implicitly**

Some things already approximate COP without naming it:
- Holochain's agent-centric model, where global coherence emerges from local validation rules
- Reactive/dataflow systems (signals, FRP)
- Actor model concurrency
- Cellular automata as computational substrate
- ValueFlows/REA, which models economic reality as flowing events rather than static entities

**The epistemological shift**

In classical paradigms, the programmer is a god who designs a closed system. In COP, the programmer is more like an ecologist who designs *conditions for emergence*. You write rules, thresholds, feedback sensitivity, and then you observe what arises. The system is never fully knowable from the source code alone.

**The honest tension**

The hard challenge is tooling. Debuggers, type systems, tests, all assume reducibility. COP would need new verification paradigms, probably closer to simulation and formal methods than unit tests.

Given your work on Nondominium and the recognition architecture framework, there's a strong argument that what you're building *is* COP in practice: protocol-level rules that produce economic coordination as emergent behavior, without a central orchestrator. The ValueFlows ontology isn't modeling a machine, it's modeling a living economic ecosystem.