# Goals

> Development goals organized by phase. Updated as phases complete and new ones begin.

---

## Phase 1 — Complete: Person Management

The foundation of identity, access, and progressive trust.

- [x] Agent identity management with public name/avatar (Person entry)
- [x] Private profile (EncryptedProfile) with PII stored in agent's source chain
- [x] Field-level private data access control (7-day expiration)
- [x] Capability token architecture (general → restricted → full)
- [x] Role-based access control with validated credentials
- [x] PPR integration in person zome (receipt generation for identity validation)
- [x] Agent promotion workflow (Simple → Accountable → Primary Accountable)
- [x] Membrane protection (DNA validation hook excludes unauthorized agents)

---

## Phase 2 — In Progress: Resource Lifecycle and Governance

The core Work: making resources carry their own governance.

- [x] ResourceSpecification with embedded governance rules
- [x] EconomicResource lifecycle management (create, update, transfer, end-of-life)
- [x] Governance-as-operator architecture (resource zome = passive data, governance zome = active operator)
- [x] Economic Processes: Use (Accountable Agent), Transport (Primary), Storage (Primary), Repair (Primary)
- [x] Commitment → Claim → Economic Event cycle (ValueFlows three-level ontology)
- [x] Multi-reviewer validation schemes (simple_majority, 2-of-3, N-of-M, consensus)
- [x] ValidationReceipt with 6 validation types
- [x] Agent promotion workflows (role-specific validation for Transport, Repair, Storage)
- [x] End-of-life management with challenge periods and multi-expert validation
- [x] PPR system: 16 categories, bidirectional receipt generation, cryptographic signing
- [x] Custody transfer flow with complete audit trail and bidirectional PPRs
- [x] Dispute resolution (edge-based, recent interaction partners, legal procedure triggers)
- [ ] Enhanced security implementation (final hardening pass)

---

## Phase 3 — Next: Integration and Maturation

Making the foundation carry a cathedral.

- [ ] hREA integration strategy: documentation of integration path, architectural alignment analysis
- [ ] hREA proof of concept: Nondominium governance layer over hREA economic engine
- [ ] Moss ecosystem deployment: packaging for Moss groupware environment
- [ ] TrueCommons integration: contribution accounting and benefit redistribution layer
- [ ] PPR performance testing: system behavior at scale (100+ agents, 1000+ interactions)
- [ ] Frontend UI completion: Svelte 5 interface for all core workflows
- [ ] Sensorica pilot: first real community deployment with PEP Master as validation case
- [ ] Developer documentation: technical guide for communities deploying Nondominium

---

## Long-Term Vision Goals

These are not sprint items — they are markers of the Albedo and Rubedo stages:

- Nondominium deployed in Moss by communities outside Sensorica (Albedo marker)
- PPR pattern adopted by other Holochain projects (Albedo marker)
- Governance-as-operator pattern appearing in independent Holochain designs (Rubedo marker)
- A community using Nondominium without ever contacting its original authors (Rubedo marker)
