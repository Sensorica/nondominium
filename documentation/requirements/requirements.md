# nondominium - Requirements Document

## 1. Executive Summary

nondominium is a foundational infrastructure project aimed at enabling a new class of Resources that are organization-agnostic, uncapturable, and natively collaborative. These Resources are governed not by platforms or centralized authorities, but through embedded rules, transparent peer validation, and a comprehensive reputation system.

The project's central goal is to support a true sharing economy, overcoming the structural flaws of centralized platforms (centralization of power, censorship, unsuitable regulations).

Built on the Holochain framework and using the ValueFlows standard, nondominium allows any Agent to interact with these Resources in a permissionless but accountable environment, with automatic reputation tracking through Private Participation Receipts (PPRs).

## 2. Objective & Goals

### 2.1 Main Objective

Develop a new class of Resources that are:


- **Permissionless Access**: Anyone can Access Resources under defined governance rules
- **Organization Agnostic**: Exist independently of any single organization. Not owned or controlled by any single Agent or organization.
- **Capture Resistant or Unenclosable**: Uncapturable and resilient to monopolization. No Agent or group of Agents can control or delete Resources.
- **Self-governed**: Rules driven associated directly with the Resources, which govern interactions or Actions that Agents can take, as defined by the system. **Roles**: Set of Activities or types of interactions that an Agent can perform with respect to the Resource. Also related to Custody (responsibility), maintenance or improvements (obligations). **Access control**: Rules associated with Roles of Agents, membranes, to grant permissions to interact with Resources in specific ways, Role-related. Is pseudonymous.
- **Self-regulated**: Peer reviewed, verified and tested (quality control)
- **Shareable by Default**: Resources are designed for sharing from inception
- **Credentials and Reputation-enabled**: Built-in accountability through cryptographically-signed participation tracking
- **Process-aware**: Supporting structured Economic Processes (Use, Transport, Storage, Repair)
- **Fully specified**: Machine readable in terms of function, design architecture, standards (dimensions, tolerances, quality), etc.
- **Composable**: Resources can be combined into come complex resources, allow fork and remix
- **Hard to Clone**: Governance, set of rules and incentives to make unnecessary copying of a resource unlikely.
- **Lifecycle Managed**: Resources have managed lifecycles from creation through validation to end-of-life.
- **Traceable**: Full provenance and economic activity tracking, affiliation to component resources


### 2.2 Supporting Goals

1.  **Digital Representation**: Define machine-readable, digital, and material Resources as nondominium, implemented as DHT entries on Holochain
2.  **Proof-of-Concept Implementation**: Build and test a prototype of a distributed platform supporting Resource sharing under the nondominium property regime
3.  **Governance and Incentive Layer**: Implement all ValueFlows Actions and Economic Processes with embedded governance rules
4.  **Identity and Role System**: Develop Agent identity infrastructure supporting pseudonymity, credentials, and private entry identification
5.  **Reputation System**: Implement Private Participation Receipts (PPRs) for trustworthy, cumulative reputation tracking
6.  **Process Management**: Support structured Economic Processes with role-based access control

## 3. nondominium Resource Characteristics

nondominium Resources must exhibit the following characteristics:

- **REQ-RES-01: Permissionless Access**: Anyone can access nondominium Resources under defined governance rules. *Post-MVP note*: "defined governance rules" must be extensible to include `AffiliationState`-based conditions (e.g. `min_affiliation: ActiveAffiliate`) in addition to role-based conditions; see `REQ-AGENT-03`, `REQ-AGENT-05`, and `REQ-GOV-09` annotation below.
- **REQ-RES-02: Organization Agnostic**: Resources exist independently of any single organization and are associated with Agents according to their Roles. *Post-MVP note*: "Agents" must encompass all `AgentEntityType` variants (Individual, Collective, Project, Network, Bot) — see `REQ-AGENT-01` and `REQ-AGENT-02`; `EconomicResource.custodian` will expand from `AgentPubKey` to `AgentContext`.
- **REQ-RES-03: Capture Resistant**: No Agent or group can control, delete, or monopolize nondominium Resources
- **REQ-RES-04: Self-governed**: Governance rules are embedded within ResourceSpecifications and enforced programmatically
- **REQ-RES-05: Fully Specified**: Resources are machine-readable in terms of function, design, standards, and governance rules
- **REQ-RES-06: Hard to Clone**: Governance, incentives, and reputation systems make unnecessary copying unlikely
- **REQ-RES-07: Shareable by Default**: Resources are designed for sharing from inception
- **REQ-RES-08: Process-Enabled**: Resources can be used in structured Economic Processes (Use, Transport, Storage, Repair)
- **REQ-RES-09: Lifecycle Managed**: Resources have managed lifecycles from creation through validation to end-of-life

## 4. User Roles & Stories

### 4.1 Simple Agent

A user who can search for nondominium Resources and contribute new ones. Linked to a general capability token.

**Identity & Onboarding**

- **REQ-USER-S-01**: As a Simple Agent, I want to use the nondominium hApp with minimal effort and without permission
- **REQ-USER-S-02**: As a Simple Agent, I want to complete my identity by associating private information (legal name, address, email, photo ID) with my Agent identity, stored as Holochain private entries

**Resource Discovery**

- **REQ-USER-S-03**: As a Simple Agent, I want to search for available nondominium Resources and their specifications
- **REQ-USER-S-04**: As a Simple Agent, I want to search for other Agents, view their public profiles and roles

**Resource Creation**

- **REQ-USER-S-05**: As a Simple Agent, I want to create new nondominium Resources with embedded governance rules
- **REQ-USER-S-06**: As a Simple Agent, I want to interact with Agents interested in accessing my created Resources

**First Transaction & Promotion**

- **REQ-USER-S-07**: As a Simple Agent, I want to make my first transaction, transferring my new Resource to an Accountable Agent
- **REQ-USER-S-08**: As a Simple Agent, I want to become an Accountable Agent after my first transaction is validated

### 4.2 Accountable Agent

A user who can signal intent to access Resources and participate in governance. Linked to a restricted capability token.

**Resource Access**

- **REQ-USER-A-01**: As an Accountable Agent, I want to search for available nondominium Resources and their governance rules
- **REQ-USER-A-02**: As an Accountable Agent, I want to search for other Agents and view their reputation summaries
- **REQ-USER-A-03**: As an Accountable Agent, I want to create new nondominium Resources with embedded governance rules
- **REQ-USER-A-04**: As an Accountable Agent, I want to signal intent to access Resources for specific Economic Processes (Use, Transport, Storage, Repair)

**Role & Process Management**

- **REQ-USER-A-05**: As an Accountable Agent, I want to acquire specialized roles (Transport, Repair, Storage) through validation
- **REQ-USER-A-06**: As an Accountable Agent, I want to initiate and complete Economic Processes according to my roles
- **REQ-USER-A-07**: As an Accountable Agent, I want to chain multiple process actions (e.g., transport → repair → transport) in a single commitment

**Validation & Governance**

- **REQ-USER-A-08**: As an Accountable Agent, I want to validate new Resources during first access events
- **REQ-USER-A-09**: As an Accountable Agent, I want to validate Agent identity information and first transactions
- **REQ-USER-A-10**: As an Accountable Agent, I want to validate Economic Process completions and outcomes

**Reputation & Participation**

- **REQ-USER-A-11**: As an Accountable Agent, I want to receive Private Participation Receipts for all my economic interactions
- **REQ-USER-A-12**: As an Accountable Agent, I want to view my reputation summary and participation history
- **REQ-USER-A-13**: As an Accountable Agent, I want to cryptographically sign participation claims to ensure authenticity

### 4.3 Primary Accountable Agent (Custodian)

The agent with physical possession (custodianship) of a material nondominium Resource.

**Custodial Responsibilities**

- **REQ-USER-P-01**: As a Primary Accountable Agent, I want all capabilities of an Accountable Agent
- **REQ-USER-P-02**: As a Primary Accountable Agent, I want to apply governance rules programmatically for access decisions
- **REQ-USER-P-03**: As a Primary Accountable Agent, I want to manage Resource custody transfers with full audit trails

**Advanced Governance**

- **REQ-USER-P-04**: As a Primary Accountable Agent, I want to validate specialized role requests from other Agents
- **REQ-USER-P-05**: As a Primary Accountable Agent, I want to participate in dispute resolution processes
- **REQ-USER-P-06**: As a Primary Accountable Agent, I want to initiate Resource end-of-life processes with proper validation

## 4.4 Agent Ontology Requirements (Post-MVP)

> **Status**: Post-MVP. Gaps identified against the OVN wiki ontology (15 years of commons-based peer production practice). See `documentation/archives/agent.md` for the full analysis. Requirements below are design targets for the generic NDO; the current MVP implements individual agents only.

### Agent Type Taxonomy

- **REQ-AGENT-01: Agent Type Field**: Every agent context must carry an `AgentEntityType` discriminant: `Individual`, `Collective(String)`, `Project(ActionHash)`, `Network(ActionHash)`, `Bot { capabilities, operator }`, `ExternalOrganisation(String)`. The MVP supports `Individual` only; all other variants require post-MVP implementation.
- **REQ-AGENT-02: Collective Agents as NDOs**: Groups, working groups, projects, and network-level entities must be modelled as organisational NDOs (with their own `NondominiumIdentity`) rather than as a parallel agent type requiring new entry schemas. Individual agents hold roles in both their own profile and in organisational NDOs.
- **REQ-AGENT-03: Bot/AI Delegation**: A `DelegatedAgent` relationship must allow a `Person` to authorise an AI agent or bot to act on their behalf within a defined scope of capabilities and for a defined duration.

### Affiliation Spectrum

- **REQ-AGENT-04: Five-State Affiliation**: The system must model the OVN affiliation spectrum — UnaffiliatedStranger, CloseAffiliate, ActiveAffiliate, CoreAffiliate, InactiveAffiliate — as a *derived* (not stored) property computed algorithmically from PPR activity, recency, and contribution history. Binary "in/out" membership is insufficient for governance decisions.
- **REQ-AGENT-05: Affiliation Record**: Formal network entry must be formalised as an `AffiliationRecord` entry: the agent cryptographically signs acknowledgement of the Terms of Participation (ToP), the Nondominium & Custodian agreement, and the Benefit Redistribution Algorithm. This record is the prerequisite for `ActiveAffiliate` status.
- **REQ-AGENT-06: Configurable Role Taxonomy**: The `RoleType` enum must become configurable at the network level. Communities must be able to define their own role taxonomies rather than relying on the six predefined types (`SimpleAgent`, `AccountableAgent`, `PrimaryAccountableAgent`, `Transport`, `Repair`, `Storage`). Predefined roles become defaults, not constraints.

### Composable Profile

- **REQ-AGENT-07: AgentProfile View**: The system must expose a composable `AgentProfile` query that aggregates `Person`, `ReputationSummary`, `PersonRole` list, active commitment count, economic event counts, `CapabilitySlot` attachments, and network affiliations into a single queryable view. This view is computed from existing DHT data — it is not a new stored entry type.
- **REQ-AGENT-08: Social Graph**: The system must model peer relationships via an `AgentRelationship` bidirectional link type (typed: colleague, collaborator, trusted, voucher), stored privately. Social relations are part of agent wealth in the OVN model and must be legible to governance without being publicly exposed.
- **REQ-AGENT-09: Network Affiliations**: Agents must be able to hold membership in multiple NDO networks simultaneously. Cross-network affiliations must be modelled as typed links from `Person` to other NDO instance hashes, enabling agents to be bridge nodes between communities.
- **REQ-AGENT-10: Needs and Wants**: An optional `AgentNeedsWants` profile extension must allow agents to declare what resources they need and what they can offer, enabling matching at the network level.

### Identity, Privacy, and Portability

- **REQ-AGENT-11: CapabilitySlot on Agent**: The `Person` entry hash must serve as a stigmergic attachment surface (analogous to the resource-level CapabilitySlot) for external credential wallets, DID documents, reputation oracles, and professional networks. Agents can attach capabilities to their identity without modifying the core `Person` entry.
- **REQ-AGENT-12: Portable Credentials**: The system must support a `PortableCredential` structure — a cryptographically signed summary of an agent's roles and `ReputationSummary` — that can be verified by other Holochain networks. This implements the OVN requirement for cross-network identity portability.
- **REQ-AGENT-13: Zero-Knowledge Capability Proofs**: Agents must be able to prove capability eligibility (`I have at least N completed maintenance commitments`) without revealing the underlying PPR data. ZKP proofs break the false binary between full data disclosure (low privacy) and no disclosure (no accountability).
- **REQ-AGENT-14: Pseudonymous Participation Mode**: The system must support ephemeral participation: an agent contributes under a temporary key without linking to their `Person` entry. Contribution is recorded but unlinkable to physical identity. This is the individual-level participation tier in the OVN individual/person model.
- **REQ-AGENT-15: Sybil Resistance**: Network membership must support optional sybil-resistance mechanisms: social vouching (existing agents vouch for new agents), biometric opt-in, or integration with an external Proof-of-Personhood system, configurable per network as a membrane proof.

### Promotion Workflow Integrity

- **REQ-AGENT-16: Queryable Promotion Requests**: The `request_role_promotion` function must create a real, queryable `RolePromotionRequest` entry linked to both the requesting agent and an anchor for pending requests — not return a placeholder hash. Promotion requests must be discoverable by authorised approvers.

## 5. Economic Process Requirements

### 5.1 Core Process Types

- **REQ-PROC-01: Use Process**: Any Accountable Agent can initiate Use processes for accessing Resources without consuming them
- **REQ-PROC-02: Transport Process**: Only Agents with Transport role can initiate transport processes to move Resources between locations
- **REQ-PROC-03: Storage Process**: Only Agents with Storage role can initiate storage processes for temporary Resource custody
- **REQ-PROC-04: Repair Process**: Only Agents with Repair role can initiate repair processes that may change Resource state

### 5.2 Process Management

- **REQ-PROC-05: Process Initiation**: Agents must have appropriate roles to initiate specialized processes
- **REQ-PROC-06: Process Tracking**: All processes must be tracked with status, inputs, outputs, and completion state
- **REQ-PROC-07: Process Validation**: Process completions must be validated according to process-specific requirements
- **REQ-PROC-08: Process Chaining**: Agents with multiple roles can chain process actions within a single commitment
- **REQ-PROC-09: Process History**: Complete audit trail of all processes affecting each Resource

## 6. Governance & Validation Requirements

### 6.1 Resource Lifecycle Management

- **REQ-GOV-01: First Resource Requirement**: Simple Agents must create at least one Resource before accessing others
- **REQ-GOV-02: Resource Validation**: New Resources must be validated by Accountable Agents through peer review during first access
- **REQ-GOV-03: Agent Validation**: Simple Agents must be validated by Accountable Agents during their first transaction to become Accountable Agents. *Post-MVP note*: this workflow currently assumes individual agents only; post-MVP must support collective agent promotion workflows where the promotee is a Collective/Project/Network NDO and the promoter is its designated `PrimaryAccountableAgent` representative (ref G1, `REQ-GOV-16`).
- **REQ-GOV-04: Specialized Role Validation**: Transport, Repair, and Storage roles require validation by existing role holders

### 6.2 Validation Schemes

- **REQ-GOV-05: Role-Gated Validation**: Certain validations are restricted to Agents with specific roles. *Post-MVP note*: `ValidationReceipt.validator` is currently `AgentPubKey`; post-MVP must accept `AgentContext` to allow collective agent and bot validators within their declared scope (ref G1, `REQ-GOV-16`).
- **REQ-GOV-06: Multi-Reviewer Validation**: Support configurable validation schemes (2-of-3, N-of-M reviewers)
- **REQ-GOV-07: Process Validation**: Economic Process completions must be validated according to process-specific criteria

### 6.3 Governance Rules

- **REQ-GOV-08: Embedded Rules**: ResourceSpecifications must contain embedded governance rules for access and process management
- **REQ-GOV-09: Rule Enforcement**: Governance rules must be enforced programmatically across all interactions. *Post-MVP note*: the governance evaluation engine (`evaluate_transition`) must be extended to support `AffiliationState`-based rule conditions in addition to the current role-membership check. This requires a cross-zome query from `zome_governance` to `zome_person` to derive the requesting agent's `AffiliationState` before evaluating `GovernanceRule.rule_data["min_affiliation"]`. See `REQ-AGENT-03`, `REQ-AGENT-05`, `implementation_plan.md §3 [G2+Resource]`, and `governance-operator-architecture.md §2.1 TODO G2`.
- **REQ-GOV-10: Rule Transparency**: All governance rules must be publicly visible and machine-readable

### 6.4 End-of-Life Management

- **REQ-GOV-11: End-of-Life Declaration**: Resources reaching end-of-life must go through formal decommissioning process
- **REQ-GOV-12: End-of-Life Validation**: Multiple validators required for end-of-life declarations to prevent abuse
- **REQ-GOV-13: Challenge Period**: Time-delayed finalization with challenge period for end-of-life declarations

### 6.5 Affiliation and Collective Governance (Post-MVP)

> These requirements depend on post-MVP agent architecture (`REQ-AGENT-01` through `REQ-AGENT-07`)
> and the `AffiliationState`/`AffiliationRecord` system from `agent.md §4.2` and `§6.4`.

- **REQ-GOV-14: Affiliation-Based Governance Access** — governance processes gated by
  `AffiliationState` must be enforceable via `GovernanceRule.rule_data["min_affiliation"]`;
  the governance operator must cross-zome query `AffiliationState` from `zome_person`
  (refs G2, G6, `governance.md §3.6.2`)

- **REQ-GOV-15: AffiliationRecord Governance Ceremony** — signing an `AffiliationRecord`
  must generate a `Commitment`/`EconomicEvent`/`Claim` cycle in `zome_governance`, creating
  an auditable on-chain record of the Terms of Participation (ToP) signing event; this event
  triggers `AffiliationState → ActiveAffiliate` (refs G6, `governance.md §3.6.3`)

- **REQ-GOV-16: Collective Agent Governance Participation** — `ValidationReceipt`, PPR
  `counterparty`, `EconomicEvent.provider/receiver`, and `GovernanceTransitionRequest.requesting_agent`
  must accept `AgentContext` post-MVP; collective NDO governance requires designated-operator
  or N-of-M multi-sig patterns (refs G1, `governance.md §6.6`)

- **REQ-GOV-17: Sybil Resistance for Governance** — governance-tier role promotion
  (`AccountableAgent → PrimaryAccountableAgent`) must require either N-of-M active
  affiliate vouching or optional proof-of-personhood membrane proof (refs G9,
  `governance.md §5.3`)

- **REQ-GOV-18: Pseudonymous Governance Participation** — agents must be able to reach
  `ActiveAffiliate` status via pseudonymous `AgentPubKey` (no `Person` entry required);
  pseudonymous agents are blocked from governance roles requiring legal accountability
  (refs G10, `governance.md §5.3`)

## 7. Private Participation Receipt (PPR) Requirements

### 7.1 Receipt Generation

- **REQ-PPR-01: Bi-directional Issuance**: Every economic interaction generates exactly 2 receipts between participating Agents
- **REQ-PPR-02: Automatic Generation**: PPRs are automatically issued for all Commitment-Claim-Event cycles
- **REQ-PPR-03: Cryptographic Integrity**: All receipts are cryptographically signed for authenticity
- **REQ-PPR-04: Performance Tracking**: PPRs include quantitative performance metrics (timeliness, quality, reliability, communication)

### 7.2 Receipt Categories

- **REQ-PPR-05: Resource Creation**: Receipts for Resource creation and validation activities
- **REQ-PPR-06: Custody Transfer**: Receipts for responsible custody transfers and acceptances
- **REQ-PPR-07: Service Processes**: Receipts for service commitments and fulfillments (Transport, Repair, Storage)
- **REQ-PPR-08: Governance Participation**: Receipts for validation activities and governance compliance
- **REQ-PPR-09: End-of-Life**: Enhanced receipt requirements for end-of-life declarations and validations

### 7.3 Privacy & Security

- **REQ-PPR-10: Private Storage**: PPRs stored as Holochain private entries accessible only to owning Agent
- **REQ-PPR-11: Reputation Derivation**: Agents can derive and selectively share reputation summaries from their PPRs
- **REQ-PPR-12: Signature Validation**: System must validate cryptographic signatures of participation claims

### 7.4 Privacy Tiers and Cross-Network Portability (Post-MVP)

> **TODO**: The following requirements depend on post-MVP agent architecture (see `REQ-AGENT-12` through `REQ-AGENT-15` and `documentation/archives/agent.md` Sections 4.4–4.5).

- **REQ-PPR-13: Per-Interaction Privacy Level**: Agents must be able to choose their privacy level per interaction type: fully anonymous (no PPRs, no reputation accumulation), pseudonymous (PPRs linked to persistent pseudonym, not physical identity), or named (PPRs linked to public `Person` entry). The current model only supports named participation.
- **REQ-PPR-14: ZKP-Compatible Reputation Sharing**: The reputation summary derived from PPRs must be ZKP-compatible, allowing agents to produce proofs of the form "I have at least N claims of type T" without revealing the counterparties, timestamps, or raw scores. This is a prerequisite for privacy-preserving meritocracy — governance access based on contribution without requiring surveillance.
- **REQ-PPR-15: Cross-Network Reputation Export**: The `ReputationSummary` must be exportable as a `PortableCredential` (see `REQ-AGENT-12`), signed by a Primary Accountable Agent and countersigned by the claim owner, verifiable by receiving networks. Without portability, contribution history cannot flow across organisational boundaries, blocking growth of the P2P ecosystem.

## 8. Security & Access Control

### 8.1 Capability-Based Security

- **REQ-SEC-01: Capability Tokens**: Use capability tokens to manage access rights (general for Simple Agents, restricted for Accountable Agents)
- **REQ-SEC-02: Role-Based Access**: Economic Processes enforce role-based access control with validated credentials
- **REQ-SEC-03: Cross-Zome Validation**: Maintain transactional integrity across zome boundaries

### 8.2 Privacy Architecture

- **REQ-SEC-04: Private Identity**: Personal identification information stored as Holochain private entries
- **REQ-SEC-05: Private Receipts**: Participation receipts stored privately while enabling reputation derivation
- **REQ-SEC-06: Selective Disclosure**: Agents control what private information to share and with whom

### 8.3 Network Security

- **REQ-SEC-07: Membrane Validation**: DNA membrane controls network entry (permissionless for PoC with validation hooks)
- **REQ-SEC-08: Dispute Resolution**: Edge-based dispute resolution involving recent interaction partners
- **REQ-SEC-09: Reputation Protection**: False claims and end-of-life abuse severely impact Agent reputation

## 9. Technical Architecture Requirements

### 9.1 Zome Structure

The hApp must be structured with three zomes:

- **`zome_person`**: Agent identity, roles, reputation, and private data management
- **`zome_resource`**: Resource specifications, economic resources, and process management (pure data model)
- **`zome_governance`**: Validation, commitments, claims, and PPR issuance

### 9.2 ValueFlows Compliance

- **REQ-ARCH-01: REA Model**: Implement Resources, Events, Agents pattern with Economic Processes
- **REQ-ARCH-02: Standard Actions**: Support all relevant ValueFlows actions with nondominium-specific extensions
- **REQ-ARCH-03: Multi-Layer Ontology**: Support Knowledge, Plan, and Observation levels

### 9.3 Modular Governance Architecture

**REQ-ARCH-07: Modular Governance**: The resource zome operates as a pure data model, while the governance zome operates as a state transition operator. This separation enables independent evolution of data structures and governance rules.

**Business Benefits**:
- **Swappable Governance**: Governance rules can be updated without modifying resource data structures
- **Independent Evolution**: Data model and governance logic can evolve separately
- **Clear Separation of Concerns**: Data management separated from business logic enforcement
- **Testability**: Governance logic can be tested independently of data management

**REQ-ARCH-08: Swappable Governance**: Governance rules and validation logic must be modifiable without changing the resource data model. Different governance schemes can be applied to the same resource types.

**Business Value**:
- **Future-Proof**: System can adapt to new governance requirements without data migration
- **Multi-Tenancy**: Different governance rules can be applied in different contexts
- **Experimentation**: New governance approaches can be tested without disrupting existing data

**REQ-ARCH-09: Cross-Zome Interface**: Well-defined interfaces between resource and governance zomes must support all state transitions while maintaining clear separation of responsibilities.

**Interface Requirements**:
- **State Transition Requests**: Resource zome requests state changes from governance zome
- **Governance Decisions**: Governance zome provides validation and new state decisions
- **Event Generation**: All state changes must generate corresponding economic events
- **Audit Trail**: Complete history of governance decisions and state changes

**REQ-ARCH-10: Event-Driven State Changes**: All resource state changes must generate corresponding economic events to maintain complete ValueFlows compliance and audit trails.

**Event Requirements**:
- **Complete History**: Every state transition must be recorded as an economic event
- **Governance Context**: Events must include governance decision context
- **ValueFlows Compliance**: Events must follow ValueFlows standard patterns
- **Reputation Integration**: Events must support PPR generation for reputation tracking

### 9.4 Data Integrity

- **REQ-ARCH-04: Entry Validation**: Comprehensive validation logic in integrity zomes
- **REQ-ARCH-05: Link Management**: Proper linking between related entries across zomes
- **REQ-ARCH-06: State Management**: Resource and process state tracking with proper transitions

## 10. Future Enhancements

### Phase 2 Requirements

- Advanced governance rule engines with conditional logic
- Automated validation workflows and smart contracts
- Enhanced dispute resolution mechanisms
- Cross-network resource sharing protocols

### Phase 3 Requirements

- Integration with external governance systems
- Advanced reputation algorithms and trust networks
- Scalable validation schemes for large networks
- Economic incentive mechanisms and value accounting

## 11. Future Development: Architecture Variants for P2P and Organizational Contexts

### 11.1 Context Overview

As Nondominium evolves beyond proof-of-concept, two distinct deployment contexts emerge:

- **Pure P2P Context**: Individual humans directly using Nondominium for peer-to-peer resource sharing
- **Organizational Context**: Organizations (using ERPs or web platforms like Tiki) accessing Nondominium through bridge services

While the core ValueFlows logic and resource model remain consistent, the governance, identity, and security layers require significant architectural adaptations to serve both contexts effectively.

### 11.2 Identity & Delegation Requirements

#### Pure P2P Context

- **REQ-FUT-P2P-ID-01**: Support direct 1:1 mapping between human individuals and Holochain agent keys
- **REQ-FUT-P2P-ID-02**: Enable personal device-based key management with biometric or password protection
- **REQ-FUT-P2P-ID-03**: Support direct agency where the individual is the sole signer and decision-maker

#### Organizational Context

- **REQ-FUT-ORG-ID-01**: Support organizational agent identities representing legal entities (e.g., "Acme Corp")
- **REQ-FUT-ORG-ID-02**: Implement delegation pattern where employee keys can sign on behalf of organizational agents
- **REQ-FUT-ORG-ID-03**: Support scoped delegations with specific capabilities (e.g., "Transport only", "Use up to $1000 value")
- **REQ-FUT-ORG-ID-04**: Support time-limited delegations with automatic expiry
- **REQ-FUT-ORG-ID-05**: Enable immediate delegation revocation (e.g., when employee leaves) without changing organizational identity
- **REQ-FUT-ORG-ID-06**: Track which delegate performed which action for internal organizational audit
- **REQ-FUT-ORG-ID-07**: Support delegation hierarchies (e.g., manager delegates to team lead, who delegates to employees)

### 11.3 Reputation & Accountability Requirements

#### Pure P2P Context

- **REQ-FUT-P2P-REP-01**: All reputation (PPRs) accrues directly to the individual agent
- **REQ-FUT-P2P-REP-02**: Support full reputation portability across contexts and networks
- **REQ-FUT-P2P-REP-03**: New users start with zero reputation and build it through transactions

#### Organizational Context

- **REQ-FUT-ORG-REP-01**: External reputation accrues to the organizational agent, not individual delegates
- **REQ-FUT-ORG-REP-02**: Support internal attribution linking PPRs to specific delegates (hashed/private)
- **REQ-FUT-ORG-REP-03**: Enable organizational reputation inheritance for new delegates
- **REQ-FUT-ORG-REP-04**: Distinguish between organizational performance and individual delegate performance
- **REQ-FUT-ORG-REP-05**: Support aggregation of delegate performance into organizational reputation metrics
- **REQ-FUT-ORG-REP-06**: Maintain privacy of internal organizational structure while supporting accountability

### 11.4 Governance & Decision-Making Requirements

#### Pure P2P Context

- **REQ-FUT-P2P-GOV-01**: Support ad-hoc, autonomous decision-making by individuals
- **REQ-FUT-P2P-GOV-02**: Enable social negotiation of resource access terms
- **REQ-FUT-P2P-GOV-03**: Support simple template-based governance rules

#### Organizational Context

- **REQ-FUT-ORG-GOV-01**: Support policy-driven, automated decision-making based on organizational rules
- **REQ-FUT-ORG-GOV-02**: Enable automated approval of resource requests based on criteria (e.g., credit score thresholds)
- **REQ-FUT-ORG-GOV-03**: Support multi-signature requirements for high-value transactions
- **REQ-FUT-ORG-GOV-04**: Enable threshold-based governance (e.g., 2-of-3 delegates must approve)
- **REQ-FUT-ORG-GOV-05**: Support integration with organizational policy engines
- **REQ-FUT-ORG-GOV-06**: Enable organizational administrators to configure governance rules without code changes

### 11.5 Custody & Ownership Requirements

#### Pure P2P Context

- **REQ-FUT-P2P-OWN-01**: Support convergent custody and ownership (same person)
- **REQ-FUT-P2P-OWN-02**: Handle temporary custody transfers (lending) and permanent ownership transfers (selling/giving)
- **REQ-FUT-P2P-OWN-03**: Simple custody validation based on physical possession

#### Organizational Context

- **REQ-FUT-ORG-OWN-01**: Support divergent custody and ownership (organization owns, employee holds custody)
- **REQ-FUT-ORG-OWN-02**: Track internal organizational custody transfers without triggering ownership change events
- **REQ-FUT-ORG-OWN-03**: Support location tracking for organizational resources
- **REQ-FUT-ORG-OWN-04**: Enable attachment of legal contracts (hashed PDFs) to commitments and events
- **REQ-FUT-ORG-OWN-05**: Distinguish between internal organizational moves and external transfers
- **REQ-FUT-ORG-OWN-06**: Support organizational inventory reconciliation with Nondominium state

### 11.6 Device & Session Management Requirements

#### Pure P2P Context

- **REQ-FUT-P2P-DEV-01**: Support personal, single-user devices
- **REQ-FUT-P2P-DEV-02**: Simple biometric or password-based security
- **REQ-FUT-P2P-DEV-03**: Keys stored securely on personal devices
- **REQ-FUT-P2P-DEV-04**: Support standard consumer mobile platforms (iOS, Android)

#### Organizational Context

- **REQ-FUT-ORG-DEV-01**: Support shared devices (e.g., warehouse tablets used by multiple employees)
- **REQ-FUT-ORG-DEV-02**: Enable rapid delegate login/logout on shared devices
- **REQ-FUT-ORG-DEV-03**: Support BYOD (Bring Your Own Device) with organizational key management
- **REQ-FUT-ORG-DEV-04**: Integrate with organizational IAM/SSO systems (OAuth, SAML)
- **REQ-FUT-ORG-DEV-05**: Map organizational authentication tokens to Holochain capability tokens
- **REQ-FUT-ORG-DEV-06**: Support enterprise device management policies
- **REQ-FUT-ORG-DEV-07**: Enable remote device key revocation for security

### 11.7 Bridge Integration Requirements

#### Organizational Context (ERP/Web Platform Bridges)

- **REQ-FUT-ORG-BRG-01**: Support RESTful bridge services using Node.js and `@holochain/client`
- **REQ-FUT-ORG-BRG-02**: Enable bidirectional synchronization between organizational systems and Nondominium
- **REQ-FUT-ORG-BRG-03**: Support real-time signal forwarding from Holochain to organizational systems
- **REQ-FUT-ORG-BRG-04**: Enable batch operations for efficiency in organizational contexts
- **REQ-FUT-ORG-BRG-05**: Support caching strategies for frequently accessed organizational data
- **REQ-FUT-ORG-BRG-06**: Enable webhook-based event notification to organizational systems
- **REQ-FUT-ORG-BRG-07**: Support organizational resource publishing from ERP inventory systems
- **REQ-FUT-ORG-BRG-08**: Enable organizational authentication mapping (OAuth/session tokens to agent keys)
- **REQ-FUT-ORG-BRG-09**: Support deployment via Docker containerization for organizational IT environments
- **REQ-FUT-ORG-BRG-10**: Enable organizational administrators to monitor bridge health and performance

### 11.8 Architecture Modularity Requirements

- **REQ-FUT-ARCH-01**: Design modular architecture supporting both P2P and organizational contexts
- **REQ-FUT-ARCH-02**: Core ValueFlows and resource model must remain context-agnostic
- **REQ-FUT-ARCH-03**: Governance and identity layers must support pluggable implementations
- **REQ-FUT-ARCH-04**: Support seamless interoperability between P2P agents and organizational agents
- **REQ-FUT-ARCH-05**: Enable organizations to act as agents in the P2P network with equal standing
- **REQ-FUT-ARCH-06**: Support mixed-mode transactions (P2P individual borrowing from organization)
- **REQ-FUT-ARCH-07**: Maintain unified reputation and trust framework across contexts

### 11.9 Privacy & Compliance Requirements

#### Pure P2P Context

- **REQ-FUT-P2P-PRIV-01**: Minimize data collection to essential transaction information
- **REQ-FUT-P2P-PRIV-02**: User controls all personal data disclosure
- **REQ-FUT-P2P-PRIV-03**: Support pseudonymous participation

#### Organizational Context

- **REQ-FUT-ORG-PRIV-01**: Support organizational data retention and audit requirements
- **REQ-FUT-ORG-PRIV-02**: Enable compliance with organizational security policies
- **REQ-FUT-ORG-PRIV-03**: Support organizational data export for regulatory compliance
- **REQ-FUT-ORG-PRIV-04**: Maintain separation between organizational data and public DHT data
- **REQ-FUT-ORG-PRIV-05**: Support organizational right-to-delete while preserving transaction integrity

### 11.10 Implementation Priority

**Phase 1 (Current)**: Pure P2P implementation with direct agent-person mapping

**Phase 2 (Future Development)**: 
- Delegation pattern implementation
- Organizational reputation aggregation
- Basic bridge service architecture

**Phase 3 (Future Development)**:
- Advanced multi-signature governance
- Enterprise device and session management
- Full IAM/SSO integration
- Production-ready organizational bridges

## 12. Success Criteria

The nondominium system is successful when:

1. Resources remain organization-agnostic and capture-resistant
2. Governance is transparent, fair, and community-driven
3. Reputation system enables trust without central authority
4. Economic Processes support real-world sharing scenarios
5. System scales while maintaining decentralized principles
6. Privacy is preserved while enabling accountability
