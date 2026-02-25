# Many-to-Many and Multi-Party Resource Flows (Post-MVP)

This document defines the **plan and requirements** for extending Nondominium beyond one-to-one custody transfers. The approach is to **extend the ValueFlows model** (EconomicEvent, Commitment, and related structures) to support multiple providers and multiple receivers, rather than using workarounds such as bundling pairwise events.

These requirements are **post-MVP** and will be developed after the first Nondominium proof-of-concept.

---

## 1. Context and Goals

### 1.1 Current State (MVP)

- **EconomicResource** has a single `custodian: AgentPubKey`.
- **EconomicEvent** and **Commitment** have single `provider: AgentPubKey` and `receiver: AgentPubKey`.
- **Transfer patterns**: Only one-to-one custody transfers are supported.
- **PPR**: Exactly two receipts per interaction (one per agent in the pair).

### 1.2 Target State (Post-MVP)

- Support **one-to-one**, **one-to-many**, **many-to-one**, and **many-to-many** custody and transfer patterns.
- Support **resource pools** (multiple resources under mixed regimes) transferred to one or many agents, with all current custodians of any resource in the pool required to consent.
- Support **shared custody** with optional **weights** and **roles** per custodian.
- Support **delegation** among co-custodians (e.g. one custodian holds legal responsibility or facility-management role).
- **Extend ValueFlows** data structures and semantics to n-ary participants; keep PPR issuance rules well-defined for multi-party flows.

### 1.3 Design Principle

**Extend ValueFlows, do not work around it.** EconomicEvent and Commitment (and any dependent types) shall be extended to allow multiple providers and/or multiple receivers where the domain requires it. Compatibility with existing one-to-one flows shall be preserved (e.g. single-provider/single-receiver as a special case).

---

## 2. Use Cases and Transfer Patterns

### 2.1 One-to-Many (Current Custodian Adds Co-Custodians)

- **Example**: Agent A is custodian of a physical space. A transfers custody so that A, B, C, D are all co-custodians (co-stewards). B, C, D can use and co-manage the space.
- **Pattern**: One provider (A), many receivers (A, B, C, D) or (B, C, D) if A relinquishes.
- **Applies to**: Shared spaces, shared digital resources (e.g. shared wallet, shared document list).

### 2.2 Many-to-One (All Co-Custodians Transfer to One Agent)

- **Example**: Agents B, C, D share custody of a CNC machine. The machine needs repair. All three must agree and co-sign a custody transfer to the repair agent R for a limited time.
- **Pattern**: Many providers (B, C, D), one receiver (R).
- **Applies to**: Repair, storage, or any handover that requires full consent of current co-custodians.

### 2.3 Many-to-Many (One Group Hands Over to Another Group)

- **Example**: B, C, D are co-custodians of a CNC in a makerspace. They transfer custody to another group E, F, G in a different makerspace, who will share responsibility. All of B, C, D agree; custody becomes E, F, G.
- **Pattern**: Many providers (B, C, D), many receivers (E, F, G).
- **Applies to**: Equipment handovers between groups, shared digital assets.

### 2.4 Pool Transfers (Multiple Resources, Mixed Regimes)

- **Example**: A pool contains resources under various property regimes. The entire pool is transferred to one agent or to a group. Every agent who is custodian or co-custodian of *any* resource in the pool must sign the transaction.
- **Pattern**: Many providers (all custodians across the pool), one or many receivers.
- **Applies to**: Bundled asset transfers, project handovers.

### 2.5 Delegation Among Co-Custodians

- **Example**: A physical space has co-custodians A, B, C, D. Legal responsibility (relationship with municipality or landlord) is delegated to one of them (e.g. A), not all. A can perform certain actions (sign contracts, represent to authority) on behalf of the group.
- **Requirement**: The system must support **roles** and **delegation** within the set of custodians so that specific actions can be restricted to a delegate without requiring every co-custodian to sign each time.

---

## 3. Plan (Implementation Phases)

### Phase 1: Data Model and Shared Custody

- Extend **EconomicResource** or introduce **SharedCustody** so that a resource can have multiple custodians with optional **weights** and **roles**.
- Define **ResourcePool** (optional) for grouping resources for pool transfers.
- Ensure backward compatibility: resources with a single custodian continue to work as today.

### Phase 2: ValueFlows Extension (Events and Commitments)

- Extend **EconomicEvent** to support:
  - `providers: Vec<AgentPubKey>` and `receiver: AgentPubKey`, or
  - `providers: Vec<AgentPubKey>` and `receivers: Vec<AgentPubKey>` (full n-to-m).
- Extend **Commitment** similarly (multiple providers, multiple receivers).
- Define validation rules: when multiple providers are present, policy may require that all (or a weighted threshold) have agreed before the event is valid.
- Keep **Claim** and **EconomicEvent** linkage clear (one Commitment fulfilled by one EconomicEvent; the event itself may be n-ary).

### Phase 3: Multi-Party Consent and Execution

- Introduce **multi-party consent** for transfers that change custody when there are multiple current custodians:
  - Either encode consent in the Commitment/Event (e.g. list of signatories), or
  - Introduce a lightweight **CustodyTransferProposal** (or equivalent) that collects signatures and, when satisfied, creates the EconomicEvent and updates custody.
- Define execution semantics: when all required providers have signed, custody is updated and the event is recorded.

### Phase 4: Delegation (Resource-Scoped)

- Introduce **ResourceDelegation** (or equivalent): which agent(s) may perform which actions on behalf of which co-custodians for a given resource or pool.
- Roles (e.g. `legal_delegate`, `facility_manager`) and optional **allowed_actions**.
- Governance checks: before executing an action, verify either direct custodianship or a valid delegation for that action.

### Phase 5: PPR Distribution for Multi-Party Flows

- Define how **Private Participation Receipts** are generated when providers and/or receivers are multiple:
  - Which agents receive PPRs.
  - How to attribute responsibility (e.g. delegate vs full group, weights).
- Extend PPR structures as needed (e.g. `on_behalf_of`, `role_context`) so reputation and OVN accounting can attribute correctly.
- Ensure backward compatibility: one-to-one flows still produce exactly two PPRs as today.

### Phase 6: Pool Transfers and Cross-Resource Consent

- Implement **pool transfer** flows: gather all custodians of all resources in the pool, require their consent, then create events and update custody for each resource (or define a single composite event type for pools).
- Define how PPRs are distributed when a pool is transferred (per resource, per agent, or aggregated as specified).

---

## 4. Requirements

### 4.1 Shared Custody and Weights/Roles

- **REQ-MMF-01 – Multiple Custodians**: The system shall support resources for which more than one agent holds custody (co-custodians).
- **REQ-MMF-02 – Backward Compatibility**: Resources with a single custodian shall remain supported and behave as in the current MVP (single `custodian` or single-member shared custody).
- **REQ-MMF-03 – Weights (Optional)**: For resources with multiple custodians, the system shall support optional **weights** (e.g. shares) per custodian for responsibility, benefit, or voting.
- **REQ-MMF-04 – Roles (Optional)**: For resources with multiple custodians, the system shall support optional **roles** per custodian (e.g. `legal_delegate`, `facility_manager`) to support delegation of specific actions to one or a subset of custodians.
- **REQ-MMF-05 – Thresholds (Optional)**: The system shall support optional **threshold rules** (e.g. "transfers require consent of custodians representing ≥ 80% of weight") for multi-party decisions.

### 4.2 ValueFlows Extension (Events and Commitments)

- **REQ-MMF-06 – Multiple Providers**: EconomicEvent and Commitment shall support **multiple providers** (e.g. `providers: Vec<AgentPubKey>`), with single-provider as a special case.
- **REQ-MMF-07 – Multiple Receivers**: EconomicEvent and Commitment shall support **multiple receivers** (e.g. `receivers: Vec<AgentPubKey>`), with single-receiver as a special case.
- **REQ-MMF-08 – ValueFlows Compliance**: Extensions shall remain consistent with ValueFlows vocabulary and semantics; where the standard does not define n-ary flows, Nondominium shall define a minimal, documented extension.
- **REQ-MMF-09 – Validation of n-ary Events**: The system shall validate that all required providers (or a defined subset/threshold) have consented before an EconomicEvent involving multiple providers is considered valid and executed.
- **REQ-MMF-10 – Claim-Event Linkage**: Each Commitment shall still be fulfilled by at most one EconomicEvent; that event may reference multiple providers and/or multiple receivers.

### 4.3 Transfer Patterns

- **REQ-MMF-11 – One-to-Many Transfer**: The system shall support custody transfers from one agent to a set of agents (one-to-many), including the case where the original custodian remains in the set (co-stewardship).
- **REQ-MMF-12 – Many-to-One Transfer**: The system shall support custody transfers from a set of agents to one agent (many-to-one), requiring consent of all current custodians (or a defined threshold).
- **REQ-MMF-13 – Many-to-Many Transfer**: The system shall support custody transfers from a set of agents to another set of agents (many-to-many), with consent and execution semantics clearly defined.
- **REQ-MMF-14 – Pool Transfers**: The system shall support transfers of a **pool of resources** to one or more agents, where every custodian (or co-custodian) of any resource in the pool must consent (or meet a defined threshold) before the transfer is executed.

### 4.4 Delegation Among Co-Custodians

- **REQ-MMF-15 – Resource-Scoped Delegation**: The system shall support **delegation** of specific actions (e.g. sign contract, represent to municipality) to one or more agents on behalf of the co-custodians of a resource or pool.
- **REQ-MMF-16 – Delegation Roles**: Delegation shall be expressible with **role labels** (e.g. `legal_delegate`, `facility_manager`) and optional **allowed_actions** so that only delegated actions can be performed by the delegate without full co-custodian consent.
- **REQ-MMF-17 – Delegation Revocation**: Delegation shall be revocable; revocation shall not require changing the set of co-custodians.
- **REQ-MMF-18 – Governance Check**: Before executing an action that affects a resource with multiple custodians, the system shall verify that the acting agent is either a custodian or a valid delegate for that action.

### 4.5 PPR Distribution and Attribution

- **REQ-MMF-19 – PPR for Multi-Party Events**: The system shall define and implement rules for **issuing Private Participation Receipts** when an EconomicEvent has multiple providers and/or multiple receivers.
- **REQ-MMF-20 – Attribution Semantics**: PPR issuance shall support clear **attribution** of responsibility (e.g. which agents are credited or debited for the interaction), including optional **weights** and **roles** (e.g. delegate vs full group).
- **REQ-MMF-21 – Delegation Context in PPR**: When an action is performed by a delegate on behalf of co-custodians, PPRs shall carry context (e.g. `on_behalf_of`, `role_context`) so that reputation and OVN accounting can attribute correctly to both the delegate and the group.
- **REQ-MMF-22 – Backward Compatibility of PPR**: One-to-one flows shall continue to generate exactly two PPRs per interaction as in the current MVP; multi-party flows shall have a documented, deterministic PPR distribution rule.

### 4.6 Integration and Consistency

- **REQ-MMF-23 – Governance-as-Operator**: Multi-party transfers and delegation shall integrate with the existing **governance-as-operator** architecture (resource zome requests transitions; governance zome evaluates and authorizes).
- **REQ-MMF-24 – Economic Processes**: Use, Transport, Storage, and Repair processes shall be extensible to multi-party custody where applicable (e.g. many-to-one transfer to repair agent).
- **REQ-MMF-25 – Digital and Material**: The same transfer patterns and delegation model shall apply to both **material** and **digital** resources (e.g. shared wallet, shared document list).

### 4.7 Documentation and Interoperability

- **REQ-MMF-26 – Extension Documentation**: The ValueFlows extensions (n-ary providers/receivers, shared custody, delegation) shall be documented for interoperability and potential upstream contribution to ValueFlows or related standards.
- **REQ-MMF-27 – Migration Path**: The design shall allow a clear **migration path** from current one-to-one-only data to the extended model without breaking existing records.

---

## 5. Relationship to Other Post-MVP Work

- **Versioning** (see `versioning.md`): Versioning of resources and of the Nondominium hApp is independent but complementary; multi-party flows may apply to versioned resources and to forks.
- **Future architecture (P2P vs organizational)** (see `requirements.md` section 11): Delegation in many-to-many flows aligns with organizational delegation (org → employee); resource-scoped delegation is a subset that can share concepts and data structures.
- **Digital Resource Integrity** (see `digital-resource-integrity.md`): Shared custody and pool transfers may involve resources with integrity manifests; verification and attribution should remain consistent.

---

## 6. Post-MVP Status

These requirements are **explicitly post-MVP**. The first Nondominium proof-of-concept will implement only one-to-one custody transfers. Implementation of many-to-many flows, shared custody with weights/roles, resource-scoped delegation, and extended PPR distribution will follow in a later phase, in line with the plan above.
