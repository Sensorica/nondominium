
# nondominium - Product Requirements Document

## 1. Executive Summary

nondominium is a foundational infrastructure project aimed at enabling a new class of Resources that are organization-agnostic, uncapturable, and natively collaborative. These Resources are governed not by platforms or centralized authorities, but through embedded rules, transparent peer validation, and a comprehensive reputation system.

The project's central goal is to support a true sharing economy, overcoming the structural flaws of centralized platforms (centralization of power, censorship, unsuitable regulations).

Built on the Holochain framework and using the ValueFlows standard, nondominium allows any Agent to interact with these Resources in a permissionless but accountable environment, with automatic reputation tracking through Private Participation Receipts (PPRs).

## 2. Objective & Goals

### 2.1 Main Objective
Develop a new class of Resources that are:
-   **Organization-agnostic**: Not owned or controlled by any single Agent or organization
-   **Capture-resistant**: Uncapturable and resilient to monopolization
-   **Permissionless and shareable**: Accessible by default under defined governance rules
-   **Self-governing**: Integrated with embedded governance rules and peer validation
-   **Reputation-enabled**: Built-in accountability through cryptographically-signed participation tracking
-   **Process-aware**: Supporting structured Economic Processes (Use, Transport, Storage, Repair)

### 2.2 Supporting Goals
1.  **Digital Representation**: Define machine-readable, digital, and material Resources as nondominium, implemented as DHT entries on Holochain
2.  **Proof-of-Concept Implementation**: Build and test a prototype of a distributed platform supporting Resource sharing under the nondominium property regime
3.  **Governance and Incentive Layer**: Implement all ValueFlows Actions and Economic Processes with embedded governance rules
4.  **Identity and Role System**: Develop Agent identity infrastructure supporting pseudonymity, credentials, and private entry identification
5.  **Reputation System**: Implement Private Participation Receipts (PPRs) for trustworthy, cumulative reputation tracking
6.  **Process Management**: Support structured Economic Processes with role-based access control

## 3. nondominium Resource Characteristics

nondominium Resources must exhibit the following characteristics:

-   **REQ-RES-01: Permissionless Access**: Anyone can access nondominium Resources under defined governance rules
-   **REQ-RES-02: Organization Agnostic**: Resources exist independently of any single organization and are associated with Agents according to their Roles
-   **REQ-RES-03: Capture Resistant**: No Agent or group can control, delete, or monopolize nondominium Resources
-   **REQ-RES-04: Self-governed**: Governance rules are embedded within ResourceSpecifications and enforced programmatically
-   **REQ-RES-05: Fully Specified**: Resources are machine-readable in terms of function, design, standards, and governance rules
-   **REQ-RES-06: Hard to Clone**: Governance, incentives, and reputation systems make unnecessary copying unlikely
-   **REQ-RES-07: Shareable by Default**: Resources are designed for sharing from inception
-   **REQ-RES-08: Process-Enabled**: Resources can be used in structured Economic Processes (Use, Transport, Storage, Repair)
-   **REQ-RES-09: Lifecycle Managed**: Resources have managed lifecycles from creation through validation to end-of-life

## 4. User Roles & Stories

### 4.1 Simple Agent
A user who can search for nondominium Resources and contribute new ones. Linked to a general capability token.

**Identity & Onboarding**
-   **REQ-USER-S-01**: As a Simple Agent, I want to use the nondominium hApp with minimal effort and without permission
-   **REQ-USER-S-02**: As a Simple Agent, I want to complete my identity by associating private information (legal name, address, email, photo ID) with my Agent identity, stored as Holochain private entries

**Resource Discovery**
-   **REQ-USER-S-03**: As a Simple Agent, I want to search for available nondominium Resources and their specifications
-   **REQ-USER-S-04**: As a Simple Agent, I want to search for other Agents, view their public profiles and roles

**Resource Creation**
-   **REQ-USER-S-05**: As a Simple Agent, I want to create new nondominium Resources with embedded governance rules
-   **REQ-USER-S-06**: As a Simple Agent, I want to interact with Agents interested in accessing my created Resources

**First Transaction & Promotion**
-   **REQ-USER-S-07**: As a Simple Agent, I want to make my first transaction, transferring my new Resource to an Accountable Agent
-   **REQ-USER-S-08**: As a Simple Agent, I want to become an Accountable Agent after my first transaction is validated

### 4.2 Accountable Agent
A user who can signal intent to access Resources and participate in governance. Linked to a restricted capability token.

**Resource Access**
-   **REQ-USER-A-01**: As an Accountable Agent, I want to search for available nondominium Resources and their governance rules
-   **REQ-USER-A-02**: As an Accountable Agent, I want to search for other Agents and view their reputation summaries
-   **REQ-USER-A-03**: As an Accountable Agent, I want to create new nondominium Resources with embedded governance rules
-   **REQ-USER-A-04**: As an Accountable Agent, I want to signal intent to access Resources for specific Economic Processes (Use, Transport, Storage, Repair)

**Role & Process Management**
-   **REQ-USER-A-05**: As an Accountable Agent, I want to acquire specialized roles (Transport, Repair, Storage) through validation
-   **REQ-USER-A-06**: As an Accountable Agent, I want to initiate and complete Economic Processes according to my roles
-   **REQ-USER-A-07**: As an Accountable Agent, I want to chain multiple process actions (e.g., transport → repair → transport) in a single commitment

**Validation & Governance**
-   **REQ-USER-A-08**: As an Accountable Agent, I want to validate new Resources during first access events
-   **REQ-USER-A-09**: As an Accountable Agent, I want to validate Agent identity information and first transactions
-   **REQ-USER-A-10**: As an Accountable Agent, I want to validate Economic Process completions and outcomes

**Reputation & Participation**
-   **REQ-USER-A-11**: As an Accountable Agent, I want to receive Private Participation Receipts for all my economic interactions
-   **REQ-USER-A-12**: As an Accountable Agent, I want to view my reputation summary and participation history
-   **REQ-USER-A-13**: As an Accountable Agent, I want to cryptographically sign participation claims to ensure authenticity

### 4.3 Primary Accountable Agent (Custodian)
The agent with physical possession (custodianship) of a material nondominium Resource.

**Custodial Responsibilities**
-   **REQ-USER-P-01**: As a Primary Accountable Agent, I want all capabilities of an Accountable Agent
-   **REQ-USER-P-02**: As a Primary Accountable Agent, I want to apply governance rules programmatically for access decisions
-   **REQ-USER-P-03**: As a Primary Accountable Agent, I want to manage Resource custody transfers with full audit trails

**Advanced Governance**
-   **REQ-USER-P-04**: As a Primary Accountable Agent, I want to validate specialized role requests from other Agents
-   **REQ-USER-P-05**: As a Primary Accountable Agent, I want to participate in dispute resolution processes
-   **REQ-USER-P-06**: As a Primary Accountable Agent, I want to initiate Resource end-of-life processes with proper validation

## 5. Economic Process Requirements

### 5.1 Core Process Types
-   **REQ-PROC-01: Use Process**: Any Accountable Agent can initiate Use processes for accessing Resources without consuming them
-   **REQ-PROC-02: Transport Process**: Only Agents with Transport role can initiate transport processes to move Resources between locations
-   **REQ-PROC-03: Storage Process**: Only Agents with Storage role can initiate storage processes for temporary Resource custody
-   **REQ-PROC-04: Repair Process**: Only Agents with Repair role can initiate repair processes that may change Resource state

### 5.2 Process Management
-   **REQ-PROC-05: Process Initiation**: Agents must have appropriate roles to initiate specialized processes
-   **REQ-PROC-06: Process Tracking**: All processes must be tracked with status, inputs, outputs, and completion state
-   **REQ-PROC-07: Process Validation**: Process completions must be validated according to process-specific requirements
-   **REQ-PROC-08: Process Chaining**: Agents with multiple roles can chain process actions within a single commitment
-   **REQ-PROC-09: Process History**: Complete audit trail of all processes affecting each Resource

## 6. Governance & Validation Requirements

### 6.1 Resource Lifecycle Management
-   **REQ-GOV-01: First Resource Requirement**: Simple Agents must create at least one Resource before accessing others
-   **REQ-GOV-02: Resource Validation**: New Resources must be validated by Accountable Agents through peer review during first access
-   **REQ-GOV-03: Agent Validation**: Simple Agents must be validated by Accountable Agents during their first transaction to become Accountable Agents
-   **REQ-GOV-04: Specialized Role Validation**: Transport, Repair, and Storage roles require validation by existing role holders

### 6.2 Validation Schemes
-   **REQ-GOV-05: Role-Gated Validation**: Certain validations are restricted to Agents with specific roles
-   **REQ-GOV-06: Multi-Reviewer Validation**: Support configurable validation schemes (2-of-3, N-of-M reviewers)
-   **REQ-GOV-07: Process Validation**: Economic Process completions must be validated according to process-specific criteria

### 6.3 Governance Rules
-   **REQ-GOV-08: Embedded Rules**: ResourceSpecifications must contain embedded governance rules for access and process management
-   **REQ-GOV-09: Rule Enforcement**: Governance rules must be enforced programmatically across all interactions
-   **REQ-GOV-10: Rule Transparency**: All governance rules must be publicly visible and machine-readable

### 6.4 End-of-Life Management
-   **REQ-GOV-11: End-of-Life Declaration**: Resources reaching end-of-life must go through formal decommissioning process
-   **REQ-GOV-12: End-of-Life Validation**: Multiple validators required for end-of-life declarations to prevent abuse
-   **REQ-GOV-13: Challenge Period**: Time-delayed finalization with challenge period for end-of-life declarations

## 7. Private Participation Receipt (PPR) Requirements

### 7.1 Receipt Generation
-   **REQ-PPR-01: Bi-directional Issuance**: Every economic interaction generates exactly 2 receipts between participating Agents
-   **REQ-PPR-02: Automatic Generation**: PPRs are automatically issued for all Commitment-Claim-Event cycles
-   **REQ-PPR-03: Cryptographic Integrity**: All receipts are cryptographically signed for authenticity
-   **REQ-PPR-04: Performance Tracking**: PPRs include quantitative performance metrics (timeliness, quality, reliability, communication)

### 7.2 Receipt Categories
-   **REQ-PPR-05: Resource Creation**: Receipts for Resource creation and validation activities
-   **REQ-PPR-06: Custody Transfer**: Receipts for responsible custody transfers and acceptances
-   **REQ-PPR-07: Service Processes**: Receipts for service commitments and fulfillments (Transport, Repair, Storage)
-   **REQ-PPR-08: Governance Participation**: Receipts for validation activities and governance compliance
-   **REQ-PPR-09: End-of-Life**: Enhanced receipt requirements for end-of-life declarations and validations

### 7.3 Privacy & Security
-   **REQ-PPR-10: Private Storage**: PPRs stored as Holochain private entries accessible only to owning Agent
-   **REQ-PPR-11: Reputation Derivation**: Agents can derive and selectively share reputation summaries from their PPRs
-   **REQ-PPR-12: Signature Validation**: System must validate cryptographic signatures of participation claims

## 8. Security & Access Control

### 8.1 Capability-Based Security
-   **REQ-SEC-01: Capability Tokens**: Use capability tokens to manage access rights (general for Simple Agents, restricted for Accountable Agents)
-   **REQ-SEC-02: Role-Based Access**: Economic Processes enforce role-based access control with validated credentials
-   **REQ-SEC-03: Cross-Zome Validation**: Maintain transactional integrity across zome boundaries

### 8.2 Privacy Architecture
-   **REQ-SEC-04: Private Identity**: Personal identification information stored as Holochain private entries
-   **REQ-SEC-05: Private Receipts**: Participation receipts stored privately while enabling reputation derivation
-   **REQ-SEC-06: Selective Disclosure**: Agents control what private information to share and with whom

### 8.3 Network Security
-   **REQ-SEC-07: Membrane Validation**: DNA membrane controls network entry (permissionless for PoC with validation hooks)
-   **REQ-SEC-08: Dispute Resolution**: Edge-based dispute resolution involving recent interaction partners
-   **REQ-SEC-09: Reputation Protection**: False claims and end-of-life abuse severely impact Agent reputation

## 9. Technical Architecture Requirements

### 9.1 Zome Structure
The hApp must be structured with three zomes:
-   **`zome_person`**: Agent identity, roles, reputation, and private data management
-   **`zome_resource`**: Resource specifications, economic resources, and process management
-   **`zome_governance`**: Validation, commitments, claims, and PPR issuance

### 9.2 ValueFlows Compliance
-   **REQ-ARCH-01: REA Model**: Implement Resources, Events, Agents pattern with Economic Processes
-   **REQ-ARCH-02: Standard Actions**: Support all relevant ValueFlows actions with nondominium-specific extensions
-   **REQ-ARCH-03: Multi-Layer Ontology**: Support Knowledge, Plan, and Observation levels

### 9.3 Data Integrity
-   **REQ-ARCH-04: Entry Validation**: Comprehensive validation logic in integrity zomes
-   **REQ-ARCH-05: Link Management**: Proper linking between related entries across zomes
-   **REQ-ARCH-06: State Management**: Resource and process state tracking with proper transitions

## 10. Future Enhancements

### Phase 2 Requirements
-   Advanced governance rule engines with conditional logic
-   Automated validation workflows and smart contracts
-   Enhanced dispute resolution mechanisms
-   Cross-network resource sharing protocols

### Phase 3 Requirements
-   Integration with external governance systems
-   Advanced reputation algorithms and trust networks
-   Scalable validation schemes for large networks
-   Economic incentive mechanisms and value accounting

## 11. Success Criteria

The nondominium system is successful when:
1. Resources remain organization-agnostic and capture-resistant
2. Governance is transparent, fair, and community-driven
3. Reputation system enables trust without central authority
4. Economic Processes support real-world sharing scenarios
5. System scales while maintaining decentralized principles
6. Privacy is preserved while enabling accountability 