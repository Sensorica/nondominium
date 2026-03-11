# Glossary

> Key terms defined precisely. When in doubt about what a term means in this codebase, this file is the reference. Terms that appear in ValueFlows are defined consistently with the ValueFlows specification.

---

## A

**Agent** — A participant in the Nondominium network. Each agent runs their own Holochain node, holds their own source chain, and earns their own capabilities through validated participation.

**Agent-Centric Architecture** — An architectural model in which each participant runs their own node and holds their own data, as contrasted with state-centric (blockchain) architectures where all participants share a single global state. Holochain is agent-centric.

**Accountable Agent** — The second tier in the progressive trust model. An agent who has completed their first validated transaction. Can access resources, validate Simple Agents, and initiate Use processes.

---

## C

**Capability Token** — A Holochain mechanism granting specific permissions to specific agents. In Nondominium, capability tokens define the three tiers of the progressive trust model: general (Simple Agent), restricted (Accountable Agent), and full (Primary Accountable Agent).

**Capture Resistance** — The property of a system that makes it structurally difficult for any single agent or group to monopolize or control a shared resource. Designed in from the beginning; cannot be retrofitted.

**Claim** — A ValueFlows entry linking a Commitment to the Economic Events that fulfill it.

**Commitment** — A ValueFlows entry recording an intention to perform an economic action, with a due date and validation requirements.

**Commons** — Resources governed collectively by a community under rules the community defines. Neither private property nor state-owned. The governance authority resides with the community, not an external platform or institution.

**Custodian** — The agent currently holding responsibility for an Economic Resource. Custodianship is tracked explicitly; custody transfer generates a specific PPR category.

---

## D

**DHT (Distributed Hash Table)** — The peer-to-peer network layer in Holochain where shared (public) data is stored and replicated across DHT peers without a central server. Each agent holds a portion of the DHT.

---

## E

**Economic Event** — A ValueFlows entry recording a completed action that affected an Economic Resource. Identified by a `VfAction` type (Transfer, Move, Use, Produce, Work, Modify, Combine, Separate, etc.). The observation layer of the three-level ontology.

**Economic Process** — A structured economic activity in Nondominium. Four types: Use (Accountable Agent), Transport (Primary Accountable Agent), Storage (Primary Accountable Agent), Repair (Primary Accountable Agent).

**Economic Resource** — A ValueFlows entry representing a concrete instance of a resource type, with quantity, unit, current custodian, location, state, and embedded governance rules inherited from its ResourceSpecification.

**Embedded Governance** — Governance rules carried inside the ResourceSpecification itself, rather than enforced by an external platform, server, or authority. The core architectural principle of Nondominium.

---

## G

**Governance-as-Operator** — The architectural pattern in Nondominium that separates resource data (`zome_resource`, passive) from governance logic (`zome_gouvernance`, active operator). The governance zome evaluates conditions and acts on the resource zome; the resource zome does not call the governance zome.

---

## H

**hREA** — Holochain implementation of the REA (Resource-Event-Agent) accounting standard and ValueFlows vocabulary. The strategic integration target for Nondominium in Phase 3. hREA provides the economic engine; Nondominium provides the governance and reputation layer.

---

## M

**Moss** — A privacy-first groupware platform built on Holochain. The initial deployment target for Nondominium as a real-world environment with existing communities.

---

## N

**Nigredo** — The first stage of the alchemical Great Work: dissolution. Nondominium's current stage — dissolving platform-captured resources into commons-governed resources. See `ALCHEMY/GREAT_WORK.md`.

**Nondominium** — From Latin "non" (not) + "dominium" (ownership, mastery, lordship). The condition of a resource that is governed but not possessed by any single agent. Governance without ownership.

---

## O

**Open Value Network (OVN)** — An organizational model pioneered by Sensorica in which contributors log value, governance is distributed, and rewards flow proportionally to contribution. Nondominium provides the technical infrastructure for OVN resource governance.

---

## P

**PPR (Private Participation Receipt)** — A cryptographically-signed receipt recording one party's participation in an economic interaction. Generated in pairs (bidirectional) for every Commitment-Claim-Economic Event cycle. Stored as private entries in each agent's source chain; selectively disclosable. 16 categories covering the full resource lifecycle.

**Prima Materia** — The raw material being transmuted by the alchemical Work. For Nondominium, the prima materia is the economic resources currently imprisoned in platform-dependent governance. See `ALCHEMY/PRIMA_MATERIA.md`.

**Primary Accountable Agent** — The third tier in the progressive trust model. Achieved through PPR milestone thresholds and specialized role validation. Full capability token. Access to all economic processes, dispute resolution, end-of-life validation, and role assignment for specialized roles.

**Progressive Trust Model** — The three-tier agent capability progression in Nondominium: Simple Agent → Accountable Agent → Primary Accountable Agent. Capabilities earned through validated participation, not assigned by administrators.

---

## R

**ResourceSpecification** — A ValueFlows entry defining a template (class) for a type of resource. Contains embedded governance rules: access requirements, usage limits, transfer conditions, maintenance obligations, end-of-life protocols. All EconomicResource instances inherit their governance from their ResourceSpecification.

**Rubedo** — The third stage of the alchemical Great Work: completion. The vision in which commons resources govern themselves completely without platform dependency and the governance-as-operator pattern has become self-replicating across the ecosystem. See `ALCHEMY/GREAT_WORK.md`.

---

## S

**Simple Agent** — The first tier in the progressive trust model. Entry is permissionless under the DNA's membrane rules. General capability token. Can create ResourceSpecifications and initiate a first transaction.

**Source Chain** — Each agent's own cryptographically-linked chain of authored entries. The agent's authoritative record of their own history. Not replicated to the DHT unless the entry is public. Private data lives exclusively in the source chain.

**Stigmergic Coordination** — Self-organization through traces left in a shared environment. Agents coordinate without direct communication by responding to economic events in the shared record. Nondominium's economic event trail enables stigmergic coordination at the commons level.

---

## T

**TrueCommons** — A higher-level peer production system planned to be built on top of Nondominium. Adds contribution accounting and benefit redistribution to the resource governance layer.

---

## V

**ValidationReceipt** — An entry recording a governance decision. Six validation types: `resource_approval`, `process_validation`, `identity_verification`, `role_assignment`, `agent_promotion`, `end_of_life_validation`. Part of the observation layer.

**ValueFlows** — An open standard vocabulary for describing economic coordination between agents, resources, and processes. Implements the Resource-Event-Agent (REA) accounting ontology. Provides the three-level ontology (Knowledge / Plan / Observation) that structures all of Nondominium's data model.

**VfAction** — The enumerated vocabulary of possible economic actions in ValueFlows. Examples: Transfer, Move, Use, Produce, Work, Modify, Combine, Separate. Every Economic Event is identified by a VfAction.
