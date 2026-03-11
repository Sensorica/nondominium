# Beliefs

> Core technical and philosophical convictions that guide every architectural decision. These are not preferences. They are load-bearing beliefs — remove any one of them and the design collapses into something it was never meant to be.

---

## 1. Governance Belongs in the Resource

External enforcement creates single points of failure. A governance system that lives outside the resource it governs is only as durable as the platform, institution, or agreement that hosts it. Embedded rules survive platform death. They survive organizational change. They survive the departure of the founding members. A ResourceSpecification with embedded governance rules is not subject to any external entity's continued goodwill.

This is why the resource zome is a pure data layer — and why the governance zome is the operator, not the resource zome. The rules are part of the resource's identity, not part of the application server's behavior.

## 2. Trust Emerges from Participation

Administrators cannot assign trust. They can assign roles — but role-based access without validated history is not trust, it is permission. In Nondominium, capabilities are earned through cryptographically-verified, validated economic participation.

Simple Agents become Accountable Agents when they complete their first validated transaction. Accountable Agents become Primary Accountable Agents through PPR milestones and role-specific validation. No one gets promoted by administrative decision. The progression emerges from the record — which is why the PPR system is core infrastructure, not an optional add-on.

## 3. Privacy and Accountability Are Not Opposites

The commons governance literature often presents a false choice: either agents are transparent (accountable but exposed) or they are private (protected but unaccountable). This is a design failure, not an inherent tension.

Private Participation Receipts resolve it: agents accumulate a cryptographically-signed reputation in their own source chain (private by default). They can selectively disclose reputation derivations to others without revealing the underlying receipts. Accountability without transparency. Trust without surveillance.

## 4. Agent Sovereignty Is Not Optional

Local control is not a feature to be added for user experience. It is the precondition for genuine commons governance. An agent who does not hold their own data, run their own node, and control their own capabilities is not a sovereign participant in the commons — they are a user of someone else's platform.

This is why Holochain's agent-centric architecture is not just technically interesting but philosophically required. The governance cannot be distributed if the agents are not genuinely local. Any shortcut — a "helper" server, a "relay" node that accumulates too much authority — is a step away from the commons and toward the platform.

## 5. ValueFlows Is the Economic Grammar

The commitment → claim → event cycle is the correct atomic unit of economic coordination. It is not one option among many — it is the structure that makes economic activity legible across agent boundaries. Communities using different deployment configurations can still read each other's economic records because they share the grammar.

This is why Nondominium enforces ValueFlows compliance at every level, including the Knowledge/Plan/Observation ontology. Inventing parallel economic vocabulary for convenience is the kind of technical debt that prevents interoperability at the Albedo stage.

## 6. Three Zomes, Three Concerns

Mixing resource data with governance logic creates fragility that is nearly impossible to untangle later. The governance-as-operator pattern enforces a clear contract: the resource zome holds state, the governance zome transforms it. Each can evolve independently. Governance schemes can be swapped without migrating resource data. New resource types can be added without touching governance logic.

This is not elegance for its own sake. It is the architectural choice that makes the Albedo possible: governance schemes that different communities can customize without rebuilding the data layer.

## 7. Capture Resistance Must Be Designed In

Capture resistance cannot be retrofitted. An architecture that centralizes any element of governance — even a small element, even temporarily, even for "administrative convenience" — is an architecture that can be captured at that element.

Multi-reviewer validation, edge-based dispute resolution, end-of-life protocols requiring multiple independent validators — these are not features added for robustness. They are the minimum viable capture resistance. Every time a shortcut is taken — one validator instead of three, an administrative override instead of a validation process — the shortcut is a potential capture point.

## 8. Progressive Trust Over Binary Access

The binary model (member vs. admin) is the governance equivalent of a light switch: on or off, full access or none. It creates pressure to grant full access early (friction for onboarding) or to never grant it (bureaucratic gatekeeping). Both failure modes are common in existing commons tools.

Simple → Accountable → Primary Accountable is better because it emerges from validated participation. The capability level is not assigned — it is earned. This means there is no bottleneck at the top and no risk of prematurely trusting unproven actors.

## 9. Holochain's Agent-Centric Model Is Not a Preference

It is the only architecture that genuinely distributes authority without simulating distribution with hidden central control. Proof-of-work blockchains distribute consensus at enormous energy cost. Proof-of-stake blockchains distribute validation among those who have already accumulated tokens. Layer-2 solutions distribute the illusion of distribution while settling on a centralized chain.

Agent-centric architectures distribute authority by giving each agent their own source chain, their own node, their own validation responsibilities. There is no global consensus to capture. There is no mining pool to monopolize. There is no settlement layer that can be controlled.

## 10. The Governance-as-Operator Pattern Is the Key Architectural Insight

Separating the operator (governance) from the data (resource) enables swappable governance without data migration. This is not just a technical convenience — it is the condition that makes community-customizable governance possible.

A community should be able to choose a different validation scheme for their ResourceSpecification without migrating their economic history. A community should be able to evolve their governance rules without forking the entire application. The governance-as-operator pattern is what makes this possible. Compromising it — even slightly, even for a good reason — closes off the Albedo pathway.
