# Archetypes — Three Modes of Engagement

> Three expressions of the project's essential fire across different domains of work. When determining which mode a task calls for, identify which archetype is primary.

---

*The personal TELOS names three archetypes: Builder, Healer, Teacher. For Nondominium at this Nigredo stage, the third archetype is Guardian — the project's work is more protective than educational. Teaching comes later, when the pattern has proven itself and can be transmitted. For now: build the infrastructure, heal the commons, guard against capture.*

---

## The Builder

**When the project constructs and architects.**

The Builder archetype is active in every act of infrastructure creation:

- Designing the three-zome architecture (person / resource / gouvernance)
- Implementing ValueFlows data structures (ResourceSpecification, EconomicEvent, Commitment, Claim)
- Building the PPR system with 16 categories and bidirectional receipt generation
- Engineering the capability token progression (Simple → Accountable → Primary Accountable)
- Writing the Tryorama multi-agent test scenarios
- Compiling Rust to WASM and maintaining the build pipeline
- Structuring the Svelte 5 frontend against the Holochain client

**Zome:** `zome_resource` — the passive data layer, the foundation on which everything else stands.

The Builder does not improvise. The Builder reads the existing patterns before adding new ones. The Builder tests before claiming a thing works. The Builder's output is infrastructure that others can build on without understanding its internals.

---

## The Healer

**When the project tends and restores.**

The Healer archetype is active in governance design and commons repair:

- Making governance visible, machine-readable, and collectively owned
- Designing the Economic Process workflows (Use, Transport, Storage, Repair) so that communities can coordinate without constant renegotiation
- Modeling the dispute resolution system as edge-based (not centralized)
- Ensuring that agents who have acted in good faith can demonstrate it, even after conflict
- Building the Commitment → Claim → Event cycle so that economic promises are traceable
- Designing validation schemes (simple_majority, 2-of-3, N-of-M) that distribute decision-making authority rather than concentrating it

**Zome:** `zome_gouvernance` — the active operator, the force that evaluates conditions and generates the economic events that constitute the governance record.

The Healer does not impose. The Healer creates conditions under which communities can govern themselves. The Healer's output is processes that make trust visible and reputation earnable without surrendering privacy or autonomy.

---

## The Guardian

**When the project protects and secures.**

The Guardian archetype is active in every design decision that prevents capture:

- Building multi-reviewer validation to ensure no single actor controls resource approval
- Implementing end-of-life management with challenge periods and expert validation
- Designing capability tokens so that authority is earned, not assigned
- Enforcing the progressive trust model so that access to sensitive operations requires demonstrated, validated history
- Ensuring private data remains private — encrypted profiles with field-level access control
- Designing the DHT topology so that no single agent holds a monopoly on shared data
- Implementing the membrane (DNA validation hooks) to exclude bad actors from the network

**Zome:** `zome_person` — the identity and access layer, the boundary that determines who can participate and at what capability level.

The Guardian does not exclude without cause. The Guardian creates the conditions under which participation is possible for anyone willing to be accountable — and impossible for anyone seeking to exploit the openness of the commons.

---

## Archetype Mapping

| Archetype | Zome | Primary Concern | Output |
|-----------|------|-----------------|--------|
| Builder | `zome_resource` | Infrastructure | Stable data foundations |
| Healer | `zome_gouvernance` | Governance design | Trust-generating processes |
| Guardian | `zome_person` | Access & identity | Capture-resistant participation |

---

## Coniunctio

Tasks that engage all three archetypes simultaneously require explicit attention to all three:

- **Designing the PPR system**: Builder (the data structure) + Healer (the reputation process) + Guardian (the private entry, the cryptographic signature, the selective disclosure)
- **The custody transfer workflow**: Builder (the EconomicEvent schema) + Healer (the handoff ceremony that generates trust) + Guardian (the validation that prevents fraudulent transfers)
- **The agent promotion workflow**: Builder (the capability token architecture) + Healer (the community validation process) + Guardian (the criteria that prevent gaming the system)

When all three archetypes are present in a single task, slow down. The Coniunctio requires each archetype to be honored — not just the most urgent one.
