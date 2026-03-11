# Architecture

> Design philosophy — how and why the system is structured as it is. Not a technical reference (see `documentation/specs/` for implementation details), but the principles behind the choices: why this pattern, not another.

---

## The Governance-as-Operator Pattern

The most important architectural decision in Nondominium is the strict separation between resource data and governance logic.

**The pattern:**

- `zome_resource` = passive data layer (CRUD operations only, no business logic)
- `zome_gouvernance` = active operator (evaluation, enforcement, audit trail generation)
- `zome_person` = identity and access (capability tokens, progressive trust, private data)

The resource zome models economic reality: resources exist, have quantities, have custodians, have states. It does not evaluate whether a custody transfer is valid — that is governance. It does not issue reputation receipts — that is governance. It does not determine who can access a resource — that is governance mediated through person capabilities.

The governance zome is the operator: it evaluates whether the conditions encoded in a ResourceSpecification's governance rules are satisfied for a given action, generates the economic events that constitute the audit trail, issues ValidationReceipts, and triggers PPR generation.

**Why this separation enables the Albedo:** If governance logic lived in the resource zome, every change to governance rules would require data migration. If a community wanted a different validation scheme, they would need to fork the entire application. The governance-as-operator separation means that governance schemes are swappable: a community can change their validation requirements by updating the governance rules in their ResourceSpecification, not by modifying the application code.

**The iron rule:** `zome_resource` never calls `zome_gouvernance`. The operator acts on the data layer; the data layer does not call the operator.

---

## The Three-Level ValueFlows Ontology

Economic activity is modeled at three levels, following the ValueFlows standard:

**Knowledge Level** (what is possible) — `ResourceSpecification`: template for a class of resources, containing embedded governance rules, validation schemes, process requirements, and role definitions. This is the constitution of the resource — the rules that govern all instances.

**Plan Level** (what is intended) — `Commitment`: an intention to perform an economic action, with due date and validation requirements. `Process`: a structured activity (Use, Transport, Storage, Repair) initiated by an agent. This is the contract layer — promises made, conditions agreed to.

**Observation Level** (what happened) — `EconomicEvent`: a record of a completed action affecting a resource (VfAction enum). `ValidationReceipt`: a record of a governance decision (6 validation types). `PrivateParticipationClaim` (PPR): a cryptographically-signed record of one party's participation. This is the audit trail — the immutable record of what actually occurred.

Every workflow in Nondominium traverses all three levels in order: the ResourceSpecification defines what is possible, the Commitment records what is intended, the EconomicEvent and PPRs record what happened.

---

## The Progressive Trust Model

Agent capabilities are earned through validated participation, not assigned by administrators. Three tiers:

**Simple Agent** (general capability token)
- Entry condition: permissionless (any agent can join)
- Capabilities: create ResourceSpecifications, initiate first transaction
- Exit condition: first validated transaction complete → becomes Accountable Agent
- PPR eligibility: ResourceCreation and ResourceValidation upon validation

**Accountable Agent** (restricted capability token)
- Entry condition: completed first validated transaction
- Capabilities: access resources, validate Simple Agents, initiate Use processes
- Exit condition: PPR milestone threshold + specialized role validation → Primary Accountable
- PPR eligibility: Service processes, validation activities

**Primary Accountable Agent** (full capability token)
- Entry condition: PPR milestones + specialized role validation
- Capabilities: all economic processes including Transport, Storage, Repair; dispute resolution; end-of-life validation; role assignment for specialized roles
- PPR eligibility: all 16 categories including governance and end-of-life

**Why not binary (member/admin)?** Binary access creates two failure modes: (1) the friction trap — administrators resist promoting anyone because the jump from "no access" to "full access" is too large, resulting in perpetual gatekeeping; (2) the over-promotion trap — the jump is made prematurely to avoid friction, granting full authority to agents without demonstrated history. Progressive trust solves both: capabilities grow incrementally with demonstrated, validated participation.

---

## The PPR System

Every Commitment-Claim-Economic Event cycle generates exactly two Private Participation Receipts — one for each party in the interaction.

**Properties:**
- **Bidirectional**: every interaction generates exactly 2 receipts (both parties receive recognition)
- **Automatic**: generated as part of the Commitment-Claim-Event cycle, not as a separate administrative act
- **Cryptographically signed**: for authenticity and non-repudiation
- **Privately stored**: stored as private entries in each agent's source chain
- **Selectively disclosable**: agents can generate reputation derivations without revealing raw receipts

**16 PPR categories** organized by lifecycle phase:
- Genesis roles (network entry): ResourceCreation, ResourceValidation
- Core custody roles: CustodyTransfer, CustodyAcceptance
- Intermediate service roles: Maintenance, Storage, Transport, Repair, GoodFaithTransfer
- Network governance: DisputeResolution, ValidationActivity, RuleCompliance
- End-of-life: EndOfLifeDeclaration, EndOfLifeValidation

**Performance tracking** within each PPR: timeliness, quality, reliability, communication — four quantitative metrics attached to every receipt.

**Why this replaces centralized reputation:** A centralized reputation system is a platform that can be captured, corrupted, or discontinued. PPRs stored in the agent's source chain are not subject to any platform's continued goodwill. The agent carries their reputation; no intermediary holds it for them.

---

## The Agent-Centric Data Model

Every piece of data in Nondominium is authored by a specific agent and tied to their source chain.

**Public data** (written to the DHT, visible to all network participants):
- `Person` entries: name, avatar (the discoverable identity)
- `ResourceSpecification` entries: the resource template with embedded governance rules
- `EconomicResource` entries: the concrete resource instances
- `EconomicEvent` entries: the audit trail
- `ValidationReceipt` entries: the governance record
- Link structures: discovery anchors (`Path`-based), relationship links

**Private data** (stored in agent's source chain, not visible without explicit sharing):
- `EncryptedProfile` entries: PII (personal information, contact details)
- `PrivateParticipationClaim` entries: PPR receipts
- Capability grant records

**No global state.** The DHT provides shared knowledge — a distributed hash table where public entries are stored and replicated across DHT peers. But there is no global database. There is no server with an authoritative copy of the network state. Each agent's source chain is their own authoritative record of their own history.

This is the condition that makes agent sovereignty real: if your data lives on a server you don't control, the server controls your data. If your data lives in your source chain, you control your data.
