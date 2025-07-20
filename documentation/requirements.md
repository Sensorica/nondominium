
# Nondominium - Product Requirements Document

## 1. Executive Summary

Nondominium is a foundational infrastructure project aimed at enabling a new class of Resources that are organization-agnostic, uncapturable, and natively collaborative. These Resources are governed not by platforms or centralized authorities, but through embedded rules and transparent peer validation.

The project’s central goal is to support a true sharing economy, overcoming the structural flaws of centralized platforms (centralization of power, censorship, unsuitable regulations).

Built on the Holochain framework and using the Valueflows language, Nondominium allows any Agent to interact with these resources in a permissionless but accountable environment.

## 2. Objective & Goals

### 2.1 Main Objective
Develop a new class of Resources that are:
-   Organization-agnostic (not owned or controlled by any single Agent or organization).
-   Capture-resistant (uncapturable and resilient to monopolization).
-   Permissionless and shareable by default.
-   Integrated with a governance system to diminish friction due to mistrust between Agents.
-   Implemented on decentralized infrastructure (Holochain) using the Valueflows standard.

### 2.2 Supporting Goals
1.  **Digital Representation of Nondominium Resources**: Define machine-readable, digital, and material Resources as Nondominium, implemented as DHT entries on Holochain.
2.  **Proof-of-Concept Implementation**: Build and test a prototype of a distributed platform that supports the sharing of Resources under the Nondominium property regime.
3.  **Governance and Incentive Layer**: Implement all Actions related to Resources as defined in Valueflows. A key incentive is that Agents must create a Nondominium Resource themselves before they can interact with other Resources in the network.
4.  **Identity and Role System**: Develop an Agent identity infrastructure that supports pseudonymity, credentials, and encrypted identification information.

## 3. Resource Characteristics

Nondominium Resources must exhibit the following characteristics:

-   **REQ-RES-01: Permissionless Access**: Anyone can access Resources under defined rules.
-   **REQ-RES-02: Organization Agnostic**: Resources must exist independently of any single organization and be associated directly with Agents according to their Roles.
-   **REQ-RES-03: Capture Resistant**: No Agent or group of Agents can control or delete Resources.
-   **REQ-RES-04: Self-governed**: Rules governing interactions (Actions) are embedded within the Resources themselves. This includes Role-based access control.
-   **REQ-RES-05: Fully Specified**: Resources must be machine-readable in terms of function, design, standards, etc.
-   **REQ-RES-06: Hard to Clone**: The combination of governance and incentives should make unnecessary copying of a resource unlikely.
-   **REQ-RES-07: Shareable by Default**: Resources are designed for sharing from their inception.

## 4. User Roles & Stories

### 4.1 Simple Agent
A user who can search for resources and contribute new ones. This role is linked to a general capability token.

-   **REQ-USER-S-01**: As a Simple Agent, I want to use the Nondominium hApp with little effort and without permission.
-   **REQ-USER-S-02**: As a Simple Agent, I want to be able to complete my identity, associating encrypted information like legal name, physical address, email, and a photo ID with my Agent identity.
-   **REQ-USER-S-03**: As a Simple Agent, I want to search for available Nondominium Resources.
-   **REQ-USER-S-04**: As a Simple Agent, I want to search for other Agents, see their Roles, and view the Resources they have custody of.
-   **REQ-USER-S-05**: As a Simple Agent, I want to be able to create a new Nondominium Resource, making it visible to other Agents.
-   **REQ-USER-S-06**: As a Simple Agent, I want to be able to interact with other Agents who want to access the Nondominium Resource anyone has created.
-   **REQ-USER-S-07**: As a Simple Agent, I want to be able to make my first transaction, transferring my new Nondominium Resource to an Accountable Agent.
-   **REQ-USER-S-08**: As a Simple Agent, I want to be able to become an Accountable Agent after my first transaction is validated by another Accountable Agent.

### 4.2 Accountable Agent
A user who can signal intent to access a resource. This role is linked to a restricted capability token.

-   **REQ-USER-A-01**: As an Accountable Agent, I want to be able to search for available Nondominium Resources.
-   **REQ-USER-A-02**: As an Accountable Agent, I want to search for other Agents, see their Roles, and view their history.
-   **REQ-USER-A-03**: As an Accountable Agent, I want to be able to signal my intent to access a Nondominium Resource (for use, repair, transport, or storage), depending on my Roles.
-   **REQ-USER-A-04**: As an Accountable Agent, I want to be able to acquire Roles such as `Repair`, `Transport`, and/or `Storage`.
-   **REQ-USER-A-05**: As an Accountable Agent, I want to be able to validate Agents, Resources, and Processes.
-   **REQ-USER-A-06**: As an Accountable Agent, I want to be able to validate the identity information of a Simple Agent who is engaging in their first transaction.
-   **REQ-USER-A-07**: As an Accountable Agent, I want to perform peer-validation on a newly created Nondominium Resource during its first access event to ensure it meets the network's standards.
-   **REQ-USER-A-08**: As an Accountable Agent, I want to validate events related to core processes like Storage, Repair, and Transport to ensure the actions taken are legitimate.

### 4.3 Primary Accountable Agent (Custodian)
The agent who has physical possession (custodianship) of a material Nondominium Resource.

-   **REQ-USER-P-01**: As a Primary Accountable Agent, I want to be able to do everything an Accountable Agent can do.
-   **REQ-USER-P-02**: As a Primary Accountable Agent, I want to be able to apply governance rules programmatically, so that decisions about access are transparent and fair.
-   **REQ-USER-P-03**: As a Primary Accountable Agent, I want to hold shared credentials with access conditions, so that resources are protected but not centralized.
-   **REQ-USER-P-04**: As a Primary Accountable Agent, I want to be able to interact with other Agents to arrange access for use, repair, transport, or storage.

## 5. Governance & Incentive Requirements

### 5.1 Resource Creation Incentive
-   **REQ-GOV-01: First Resource Requirement**: Simple Agents must create at least one Nondominium Resource before they can access resources created by others in the network.
-   **REQ-GOV-02: Resource Transfer Validation**: The first transaction (transfer) of a newly created resource must be validated by an Accountable Agent before the creating Simple Agent can be promoted to Accountable Agent status.

### 5.2 Validation Requirements
-   **REQ-GOV-03: Peer Validation**: New resources must be validated by existing Accountable Agents through a peer review process before being fully accepted into the network.
-   **REQ-GOV-04: Multi-Reviewer Validation**: The system should support configurable validation schemes (e.g., 2-of-3, N-of-M reviewers) for resource approval.
-   **REQ-GOV-05: Role-Gated Validation**: Certain types of validation should be restricted to Agents with specific Roles (e.g., only agents with "Maintainer" role can validate repair processes).

### 5.3 Resource Governance Rules
-   **REQ-GOV-06: Embedded Rules**: Each ResourceSpecification must contain embedded governance rules that define how resources of that type can be accessed, used, and transferred.
-   **REQ-GOV-07: Rule Enforcement**: The system must programmatically enforce the governance rules embedded in ResourceSpecifications.
-   **REQ-GOV-08: Rule Transparency**: All governance rules must be publicly visible and machine-readable.

## 6. Security & Access Control

-   **REQ-SEC-01: Capability-Based Security**: The system must use capability tokens to manage access rights. A general token for `Simple Agents` and a restricted token for `Accountable Agents`.
-   **REQ-SEC-02: Membrane**: The DNA must have a validation function (membrane) to control who can join the network. For this proof of concept, access is permissionless, but the hook should exist.
-   **REQ-SEC-03: Encrypted Identity**: All personal identification information associated with an Agent's profile must be stored encrypted.

## 7. Proposed hApp Architecture
As per the source document, the hApp should be structured with the following zomes:
-   `zome_person` (zome_Person in original document)
-   `zome_resource` (zome_Resource in original document) 
-   `zome_gouvernance` (zome_Gouvernance in original document)

### 7.1 Entry Types
The system will implement the following primary entry types:
-   **Person**: Agent identity and profile information
-   **Resource**: Economic resources and their specifications
-   **Governance**: Rules, validations, commitments, and claims 