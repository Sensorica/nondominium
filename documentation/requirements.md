
# nondominium - Product Requirements Document

## 1. Executive Summary

nondominium is a foundational infrastructure project aimed at enabling a new class of Resources that are organization-agnostic, uncapturable, and natively collaborative. These Resources are governed not by platforms or centralized authorities, but through embedded rules and transparent peer validation.

The project’s central goal is to support a true sharing economy, overcoming the structural flaws of centralized platforms (centralization of power, censorship, unsuitable regulations).

Built on the Holochain framework and using the Valueflows language, nondominium allows any Agent to interact with these Resources in a permissionless but accountable environment.

## 2. Objective & Goals

### 2.1 Main Objective
Develop a new class of Resources that are:
-   Organization-agnostic (not owned or controlled by any single Agent or organization).
-   Capture-resistant (uncapturable and resilient to monopolization).
-   Permissionless and shareable by default.
-   Integrated with a governance system to diminish friction due to mistrust between Agents.
-   Implemented on decentralized infrastructure (Holochain) using the Valueflows standard.

### 2.2 Supporting Goals
1.  **Digital Representation of nondominium Resources**: Define machine-readable, digital, and material Resources as nondominium, implemented as DHT entries on Holochain.
2.  **Proof-of-Concept Implementation**: Build and test a prototype of a distributed platform that supports the sharing of Resources under the nondominium property regime.
3.  **Governance and Incentive Layer**: Implement all Actions related to nondominium Resources as defined in Valueflows. A key incentive is that Agents must create a nondominium Resource themselves before they can interact with other nondominium Resources in the network.
4.  **Identity and Role System**: Develop an Agent identity infrastructure that supports pseudonymity, credentials, and private entry identification information (stored as Holochain private entries, not as encrypted blobs; see https://developer.holochain.org/build/entries/).

## 3. nondominium Resource Characteristics

nondominium Resources must exhibit the following characteristics:

-   **REQ-RES-01: Permissionless Access**: Anyone can access nondominium Resources under defined rules.
-   **REQ-RES-02: Organization Agnostic**: nondominium Resources must exist independently of any single organization and be associated directly with Agents according to their Roles.
-   **REQ-RES-03: Capture Resistant**: No Agent or group of Agents can control or delete nondominium Resources.
-   **REQ-RES-04: Self-governed**: Rules governing interactions (Actions) are embedded within the Resources themselves. This includes Role-based access control.
-   **REQ-RES-05: Fully Specified**: nondominium Resources must be machine-readable in terms of function, design, standards, etc.
-   **REQ-RES-06: Hard to Clone**: The combination of governance and incentives should make unnecessary copying of a nondominium Resource unlikely.
-   **REQ-RES-07: Shareable by Default**: nondominium Resources are designed for sharing from their inception.

## 4. User Roles & Stories

### 4.1 Simple Agent
A user who can search for nondominium Resources and contribute new ones. This role is linked to a general capability token.

-   **REQ-USER-S-01**: As a Simple Agent, I want to use the nondominium hApp with little effort and without permission.
-   **REQ-USER-S-02**: As a Simple Agent, I want to be able to complete my identity, associating private information like legal name, physical address, email, and a photo ID with my Agent identity, stored as a Holochain private entry.
-   **REQ-USER-S-03**: As a Simple Agent, I want to search for available nondominium Resources.
-   **REQ-USER-S-04**: As a Simple Agent, I want to search for other Agents, see their Roles, and view the nondominium Resources they have custody of.
-   **REQ-USER-S-05**: As a Simple Agent, I want to be able to create a new nondominium Resource, making it visible to other Agents.
-   **REQ-USER-S-06**: As a Simple Agent, I want to be able to interact with other Agents who want to access the nondominium Resource that I created.
-   **REQ-USER-S-07**: As a Simple Agent, I want to be able to make my first transaction, transferring my new nondominium Resource to an Accountable Agent.
-   **REQ-USER-S-08**: As a Simple Agent, I want to be able to become an Accountable Agent after my first transaction is validated by another Accountable Agent.

### 4.2 Accountable Agent
A user who can signal intent to access a nondominium resource. This role is linked to a restricted capability token.

-   **REQ-USER-A-01**: As an Accountable Agent, I want to be able to search for available nondominium Resources.
-   **REQ-USER-A-02**: As an Accountable Agent, I want to search for other Agents, see their Roles, and view their history.
-   **REQ-USER-S-03**: As a Simple Agent, I want to be able to create a new nondominium Resource, making it visible to other Agents.
-   **REQ-USER-A-04**: As an Accountable Agent, I want to be able to signal my intent to access a nondominium Resource (for use, repair, transport, or storage), depending on my Roles.
-   **REQ-USER-A-05**: As an Accountable Agent, I want to be able to acquire Roles such as `Repair`, `Transport`, and/or `Storage`.
-   **REQ-USER-A-06**: As an Accountable Agent, I want to be able to validate Agents, nondominium Resources, and Processes.
-   **REQ-USER-A-07**: As an Accountable Agent, I want to be able to validate the identity information of a Simple Agent who is engaging in their first transaction.
-   **REQ-USER-A-08**: As an Accountable Agent, I want to perform peer-validation on a newly created nondominium Resource during its first access event to ensure it meets the network's standards.
-   **REQ-USER-A-09**: As an Accountable Agent, I want to validate events related to core processes like Storage, Repair, and Transport to ensure the actions taken are legitimate.

### 4.3 Primary Accountable Agent (Custodian)
The agent who has physical possession (custodianship) of a material nondominium Resource.

-   **REQ-USER-P-01**: As a Primary Accountable Agent, I want to be able to do everything an Accountable Agent can do.
-   **REQ-USER-P-02**: As a Primary Accountable Agent, I want to be able to apply governance rules programmatically, so that decisions about access are transparent and fair.
-   **REQ-USER-P-03**: As a Primary Accountable Agent, I want to hold shared credentials with access conditions, so that nondominium Resources are protected but not centralized.
-   **REQ-USER-P-04**: As a Primary Accountable Agent, I want to be able to interact with other Agents to arrange access for use, repair, transport, or storage.

## 5. Governance & Incentive Requirements

### 5.1 Resource Creation Incentive
-   **REQ-GOV-01: First Resource Requirement**: Simple Agents must create at least one nondominium Resource before they can access nondominium Resources created by other Agents in the network.
### 5.2 Validation Requirements
-   **REQ-GOV-02: Resource Validation**: New nondominium Resources must be validated by existing Accountable Agents through a peer review process before being fully accepted into the network.
    -   **Eligibility**: All newly created nondominium Resources that are set to "available", "needs repair" (for material resources), or "needs storage" (for material resources) are eligible for validation.
    -   **Validation Process**:
        1. The Agent (Simple Agent, Accountable Agent, etc.) creates a new nondominium Resource and sets its status to "available", "needs repair", or "needs storage". At this moment the new Resource is in state "pending validation".
        2. The Agent initiates a transaction, offering the Resource to an Accountable Agent who has expressed interest in accessing it.
        3. The Accountable Agent (acting as Primary Accountable Agent, Repair Agent, or Storage Agent depending on the resource status) reviews the Resource during the first access event for this new Resource.
        4. The Accountable Agent validates the Resource's description, functionality, and compliance with network standards.
        5. Upon successful validation, a ValidationReceipt is issued, and the resource is fully accepted into the network. The Resource is set to state "validated".
        6. If no Accountable Agent expresses interest in the Resource, it remains as "pending validation" until interest is shown.
    -   **Criteria for Validation**:
        - Resource matches its description and metadata
        - Resource complies with network standards and governance rules
        - Resource is functional and safe for intended use
        - Resource creator Agent has provided necessary documentation
    -   **Revocation**: Resource validation can be revoked if subsequent use reveals the Resource does not meet standards, as determined by a validation process involving other Accountable Agents.
-   **REQ-GOV-03: Agent Validation**: Simple Agents must be validated by Accountable Agents or Primary Agents to be promoted to  Accountable Agents.
    -   **Eligibility**: Only Simple Agents who are in the process of completing their first least nondominium Resource creation, as they initiate their first transaction, are eligible for validation.
    -   **Validation Process**:
        1. The Simple Agent requests promotion to Accountable Agent status during their first nondominium Resource transfer.
        2. The request is reviewed by one existing Accountable Agents who has expressed interest in accessing the aforementioned newlly created nondominium Resource.
        3. The reviewing agent validats the applicant's identity (via private entry), review their Resource creation, and assess compliance with network rules.
        4. Upon successful validation, a ValidationReceipt is issued, and the Agent is promoted to Accountable Agent status.
        5. The system may require a minimum number of validators (e.g., 2-of-3 or majority) depending on network policy.
    -   **Criteria for Validation**:
        - Verified Resource per REQ-GOV-03: Resource Validation
        - Verified identity and profile (private entry)
        - Compliance with network rules and standards
    -   **Revocation**: Accountable Agent status can be revoked if the Agent violates governance rules, as determined by a validation process involving other Accountable or Primary Accountable Agents.
-   **REQ-GOV-04: Specialized Role Validation**: Agents seeking to acquire specialized roles such as `Transport`, `Repair`, and `Storage` must undergo additional validation:
    -   **Eligibility**: Only Accountable Agents or Primary Accountable Agents may request these roles.
    -   **Validation Process**:
        1. The agent submits a request to acquire a specialized role (Transport, Repair, or Storage).
        2. The request is reviewed by one or more existing Primary Accountable Agents who already hold the relevant role.
        3. The reviewing agents validate the applicant's credentials, history, and, if required, their identity and prior actions.
        4. Upon successful validation, a ValidationReceipt is issued, and the role is granted to the agent.
        5. The system may require a minimum number of validators (e.g., 2-of-3 or majority) depending on the resource or process sensitivity.
    -   **Criteria for Validation**:
        - Demonstrated trustworthiness and accountability (e.g., successful prior transactions, positive validation history)
        - Sufficient knowledge or credentials for the requested role
        - Compliance with any additional governance rules or obligations (e.g., maintenance standards for Storage, safety for Transport)
    -   **Revocation**: Roles can be revoked if the agent violates governance rules, as determined by a validation process involving other Primary Accountable Agents.
-   **REQ-GOV-05: Role-Gated Validation**: Certain types of validation should be restricted to Agents with specific Roles (e.g., only agents with "Maintainer" role can validate repair processes).
-   **REQ-GOV-06: Multi-Reviewer Validation**: The system should support configurable validation schemes (e.g., 2-of-3, N-of-M reviewers) for nondominium Resource approval.

### 5.3 Resource Governance Rules
-   **REQ-GOV-07: Embedded Rules**: Each ResourceSpecification must contain embedded governance rules that define how nondominium Resources of that type can be accessed for use, repair, transport or storage.
-   **REQ-GOV-08: Rule Enforcement**: The system must programmatically enforce the governance rules embedded in ResourceSpecifications.
-   **REQ-GOV-09: Rule Transparency**: All governance rules must be publicly visible and machine-readable.

## 6. Security & Access Control

-   **REQ-SEC-01: Capability-Based Security**: The system must use capability tokens to manage access rights. A general token for `Simple Agents` and a restricted token for `Accountable Agents`.
-   **REQ-SEC-02: Membrane**: The DNA must have a validation function (membrane) to control who can join the network. For this proof of concept, access is permissionless, but the hook should exist.
-   **REQ-SEC-03: Private Identity**: All personal identification information associated with an Agent's profile must be stored as a Holochain private entry (not as an encrypted blob). See https://developer.holochain.org/build/entries/.

## 7. Proposed hApp Architecture
The hApp should be structured with the following zomes:
-   `zome_person` (zome_Person in original document)
-   `zome_resource` (zome_Resource in original document) 
-   `zome_gouvernance` (zome_Gouvernance in original document)

### 7.1 Entry Types
The system will implement the following primary entry types:
-   **Person**: Agent identity and profile information
-   **Resource**: Economic resources and their specifications
-   **Governance**: Rules, validations, commitments, and claims 