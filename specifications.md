# Nondominium - Technical Specifications

## 1. Introduction

### 1.1 Purpose
This document provides the detailed technical specifications for the Nondominium Holochain application (hApp). It translates the `requirements.md` document into a concrete implementation plan for developers. It is based on the architecture described in the [Nondominium project document](https://www.sensorica.co/environment/hrea-demo-for-nrp-cas/nondominium).

### 1.2 Guiding Principles
-   **Explicit Naming**: Zomes and entry types will follow the naming convention proposed in the Nondominium document (`zome_person`, `zome_resource`, `zome_gouvernance`).
-   **ValueFlows Mapping**: While using the project's naming, the underlying data structures will be compliant with the ValueFlows vocabulary to ensure interoperability.
-   **Capability-Based Security**: Zome functions will be protected by Holochain's capability grant/claim mechanism to enforce the distinction between `Simple Agent` and `Accountable Agent` roles.

## 2. Holochain DNA and Zome Structure

The DNA will be composed of three coordinator zomes, each with its own corresponding integrity zome.

-   **`zome_person`**: Manages agent identity, profiles, roles, and validation.
-   **`zome_resource`**: Manages the lifecycle of Nondominium Resources and their specifications.
-   **`zome_gouvernance`**: Manages the interaction protocols: commitments, claims, and events.

## 3. Data Structures (Integrity Zome Entries)

### 3.1. `zome_person` Entries

#### 3.1.1. `Person`
-   **Description**: Stores the public-facing profile of an agent. Satisfies `REQ-USER-S-02`.
-   **Fields**:
    -   `name: String`: The agent's public pseudonymous name.
    -   `avatar_url: Option<String>`
-   **Links**:
    -   `AllPeople -> Person`: Anchor for discovering all people in the network.

#### 3.1.2. `EncryptedAgentData`
-   **Description**: Stores an agent's private, encrypted Personal Identifiable Information (PII). The agent can grant decryption keys to other agents (e.g., for validation). Satisfies `REQ-USER-S-02`.
-   **Fields**:
    -   `encrypted_bytes: Vec<u8>`: Encrypted blob containing data like legal name, address, email, photo ID reference.
-   **Links**:
    -   `Person (ActionHash) -> EncryptedAgentData`: Links private data to a public profile.

#### 3.1.3. `Role`
-   **Description**: Defines a specific role an agent can have, such as `Repair`, `Transport`, or `Storage`. Fulfills `REQ-USER-A-04`.
-   **Fields**:
    -   `role_name: String`
-   **Links**:
    -   `Person (ActionHash) -> Role`: Assigns a role to a person. The link tag can store metadata like who validated the role assignment and when.

### 3.2. `zome_resource` Entries

#### 3.2.1. `ResourceSpecification`
-   **Description**: ValueFlows concept for a *type* of resource. Fulfills `REQ-RES-05`.
-   **Fields**:
    -   `name: String`
    -   `description: String`
-   **Links**:
    -   `AllResourceSpecifications -> ResourceSpecification`: Anchor for discovery.

#### 3.2.2. `Resource`
-   **Description**: Represents a concrete `EconomicResource` in the ValueFlows vocabulary. A specific instance of a Nondominium resource. Fulfills `REQ-RES-01` to `REQ-RES-07`.
-   **Fields**:
    -   `conforms_to: ActionHash`: Link to its `ResourceSpecification`.
    -   `quantity: f64`
    -   `unit: String`
    -   `custodian: AgentPubKey`: The `Primary Accountable Agent` who currently holds the resource.
-   **Links**:
    -   `ResourceSpecification (ActionHash) -> Resource`: To find all resources of a certain type.
    -   `Person (ActionHash) -> Resource` (as Custodian): To find all resources a person has custody of.

### 3.3. `zome_gouvernance` Entries
The `Governance` entry type from the document is implemented as a set of ValueFlows entries that model interaction protocols.

#### 3.3.1. `Commitment`
-   **Description**: A promise to perform a future `EconomicEvent`. Fulfills `REQ-USER-A-03`.
-   **Fields**:
    -   `action: String`: e.g., "transfer_custody", "use".
    -   `provider: AgentPubKey`
    -   `receiver: AgentPubKey`
    -   `resource_spec: ActionHash`
    -   `quantity: f64`
    -   `due_date: Timestamp`
-   **Links**:
    -   `Person (ActionHash) -> Commitment`: To track an agent's commitments.

#### 3.3.2. `Claim`
-   **Description**: An action to fulfill a `Commitment`, which triggers an `EconomicEvent`.
-   **Fields**:
    -   `fulfills: ActionHash`: Link to the `Commitment`.
    -   `fulfilled_by: ActionHash`: Link to the resulting `EconomicEvent`.
-   **Links**:
    -   `Commitment (ActionHash) -> Claim`: To show a commitment has been fulfilled.

#### 3.3.3. `EconomicEvent`
-   **Description**: Records a completed transaction or action. Key for `REQ-USER-S-07`.
-   **Fields**:
    -   `action: String`: e.g., "transfer_custody".
    -   `provider: AgentPubKey`
    -   `receiver: AgentPubKey`
    -   `resource_inventoried_as: ActionHash`: Link to the specific `Resource`.
    -   `quantity: f64`

## 4. Zome Functions (Coordinator Zomes) & Security

Access to functions will be managed by two capability tokens: `general_access` (for Simple Agents) and `restricted_access` (for Accountable Agents).

### 4.1. `zome_person` Functions
-   `create_person(name: String, avatar_url: Option<String>) -> Record`: Creates a `Person` entry.
    -   **Capability**: `general_access`
-   `store_encrypted_data(data: Vec<u8>) -> ActionHash`: Creates an `EncryptedAgentData` entry.
    -   **Capability**: `general_access`
-   `validate_agent(simple_agent: AgentPubKey, simple_agent_first_resource: ActionHash) -> ValidationReceipt`: Allows an Accountable Agent to validate a Simple Agent, granting them the `restricted_access` capability. Fulfills `REQ-USER-S-08` and `REQ-USER-A-06`.
    -   **Capability**: `restricted_access`

### 4.2. `zome_resource` Functions
-   `create_resource_specification(name: String, description: String) -> Record`:
    -   **Capability**: `restricted_access` (Initially, only Accountable Agents define new types).
-   `create_resource(spec_hash: ActionHash, quantity: f64, unit: String) -> Record`: Creates a `Resource`. This is the first step for a Simple Agent (`REQ-USER-S-05`).
    -   **Capability**: `general_access`

### 4.3. `zome_gouvernance` Functions
-   `propose_commitment(action: String, receiver: AgentPubKey, resource_spec: ActionHash, quantity: f64, due: Timestamp) -> Record`:
    -   **Capability**: `restricted_access` (`REQ-USER-A-03`)
-   `accept_commitment(commitment_hash: ActionHash) -> Record`:
    -   **Capability**: `restricted_access`
-   `claim_commitment(commitment_hash: ActionHash, resource_id: ActionHash) -> Record`: Fulfills a commitment and creates the corresponding `EconomicEvent`.
    -   **Capability**: `restricted_access`
-   `log_initial_transfer(resource_hash: ActionHash, receiver: AgentPubKey, quantity: f64) -> Record`: A simplified function for a `Simple Agent`'s first transaction (`REQ-USER-S-07`).
    -   **Capability**: `general_access` 