# nondominium - Data Models

## Overview
This document contains the detailed data model specifications for the nondominium Holochain application, extracted from the main technical specifications document.

## `zome_person` Data Models

### AgentProfile
Public-facing information about an agent.

**Fields:**
- `agent_pub_key: AgentPubKey` - The public key of the agent
- `name: String` - The agent's chosen public name/pseudonym
- `avatar_url: Option<String>` - Optional avatar image URL

**Links:**
- `AllAgents -> AgentProfile` - Anchor for discovering all agent profiles

### PrivateProfile
Private Personal Identifiable Information (PII) stored as Holochain private entry.

**Fields:**
- `private_data: PrivateProfileData` - Encrypted personal information (legal name, address, email, photo ID hash)

**Links:**
- `AgentProfile -> PrivateProfile` - Links the public profile to the private data

### Role
Defines a specific role an agent can have (e.g., `User`, `Repair`, `Transport`, `Storage`).

**Fields:**
- `role_name: String` - Name of the role
- `validated_by: Option<AgentPubKey>` - The Accountable or Primary Accountable Agent who validated the role assignment
- `validation_receipt: Option<ActionHash>` - Link to the ValidationReceipt for this role assignment

**Links:**
- `AgentProfile -> Role` - Assigns a role to an agent

## `zome_resource` Data Models

### ResourceSpecification
A template for a class of nondominium resources.

**Fields:**
- `name: String` - Name of the resource specification
- `description: String` - Detailed description
- `image_url: Option<String>` - Optional image URL
- `governance_rules: Vec<GovernanceRule>` - Embedded rules for resource access and management

**Links:**
- `AllResourceSpecifications -> ResourceSpecification` - Anchor for discovery

### GovernanceRule
A rule embedded within a ResourceSpecification that defines how resources can be accessed and managed.

**Fields:**
- `rule_type: String` - e.g., "access_requirement", "usage_limit", "transfer_conditions"
- `rule_data: String` - JSON-encoded rule parameters
- `enforced_by: Option<AgentRole>` - Role required to enforce this rule

### EconomicResource
A concrete instance of a nondominium resource.

**Fields:**
- `conforms_to: ActionHash` - Link to the ResourceSpecification
- `quantity: f64` - Quantity of the resource
- `unit: String` - Unit of measurement
- `custodian: AgentPubKey` - The Primary Accountable Agent holding the resource

**Links:**
- `ResourceSpecification -> EconomicResource` - Find all resources of a type
- `AgentProfile -> EconomicResource` (as Custodian) - Link to the agent currently holding it

### EconomicProcess
Represents structured activities that transform Economic Resources or provide ecosystem services.

**Fields:**
- `process_type: String` - The type of process ("Use", "Transport", "Storage", "Repair")
- `name: String` - Human-readable name for the process instance
- `description: Option<String>` - Optional description of the specific process
- `required_role: String` - Agent role required to initiate this process
- `inputs: Vec<ActionHash>` - Links to EconomicResources that are inputs to the process
- `outputs: Vec<ActionHash>` - Links to EconomicResources that are outputs from the process
- `started_by: AgentPubKey` - Agent who initiated the process
- `started_at: Timestamp` - When the process was initiated
- `completed_at: Option<Timestamp>` - When the process was completed (None if ongoing)
- `location: Option<String>` - Physical or logical location where process occurs
- `status: ProcessStatus` - Current status of the process

**Links:**
- `AllEconomicProcesses -> EconomicProcess` - Discovery anchor for all processes
- `AgentProfile -> EconomicProcess` - Processes initiated by an agent
- `EconomicResource -> EconomicProcess` - Link resources to processes that use them
- `EconomicProcess -> EconomicEvent` - Events that occur within a process

### ProcessStatus
Enumeration representing the current state of an Economic Process.

**Values:**
- `Planned` - Process is planned but not yet started
- `InProgress` - Process is currently active
- `Completed` - Process has finished successfully
- `Suspended` - Process is temporarily paused
- `Cancelled` - Process was cancelled before completion
- `Failed` - Process failed to complete successfully

## `zome_governance` Data Models

### EconomicEvent
Records a consummated action on a resource.

**Fields:**
- `action: VfAction` - ValueFlows action enum (e.g., Transfer, Use, Produce, InitialTransfer, AccessForUse, TransferCustody)
- `provider: AgentPubKey` - Agent providing the resource/service
- `receiver: AgentPubKey` - Agent receiving the resource/service
- `resource_inventoried_as: ActionHash` - Link to the EconomicResource
- `affects: ActionHash` - Link to the EconomicResource that is affected
- `resource_quantity: f64` - Quantity of resource affected by the event
- `event_time: Timestamp` - When the event occurred
- `note: Option<String>` - Optional notes about the event

**Links:**
- `EconomicResource -> EconomicEvent` - History of events for a resource
- `EconomicProcess -> EconomicEvent` - Events that occur within a process context

### Commitment
An intention to perform an EconomicEvent.

**Fields:**
- `action: VfAction` - The intended ValueFlows action
- `provider: AgentPubKey` - Agent committing to provide
- `receiver: AgentPubKey` - Agent committing to receive
- `resource_inventoried_as: Option<ActionHash>` - Link to specific resource if applicable
- `resource_conforms_to: Option<ActionHash>` - Link to ResourceSpecification if general
- `input_of: Option<ActionHash>` - Optional link to an EconomicProcess
- `due_date: Timestamp` - When the commitment is due
- `note: Option<String>` - Optional commitment notes
- `committed_at: Timestamp` - When the commitment was made

**Links:**
- `AgentProfile -> Commitment` - Agent's outgoing/incoming commitments
- `EconomicProcess -> Commitment` - Commitments related to a process

### Claim
Fulfills a Commitment (public governance record).

**Fields:**
- `fulfills: ActionHash` - Link to the Commitment
- `fulfilled_by: ActionHash` - Link to the resulting EconomicEvent
- `claimed_at: Timestamp` - When the claim was created
- `note: Option<String>` - Optional notes about the claim fulfillment

**Links:**
- `Commitment -> Claim` - Shows a commitment has been actioned

### ValidationReceipt
Records validation of resources, events, or agent promotions by Accountable Agents.

**Fields:**
- `validator: AgentPubKey` - The agent performing the validation
- `validated_item: ActionHash` - Link to the item being validated
- `validation_type: String` - e.g., "resource_approval", "process_validation", "identity_verification"
- `approved: bool` - Whether the validation was approved or rejected
- `notes: Option<String>` - Optional validation notes

**Links:**
- `ValidatedItem -> ValidationReceipt` - Track all validations for an item

### ResourceValidation
Tracks the overall validation status of a resource requiring peer review.

**Fields:**
- `resource: ActionHash` - Link to the EconomicResource being validated
- `validation_scheme: String` - e.g., "2-of-3", "simple_majority"
- `required_validators: u32` - Number of validators needed
- `current_validators: u32` - Number of validators who have responded
- `status: String` - "pending", "approved", "rejected"

**Links:**
- `EconomicResource -> ResourceValidation` - One validation per resource

## Private Participation Receipt Data Models

### PrivateParticipationClaim (Private Entry)
A cryptographically signed receipt stored as a private entry that extends the ValueFlows Claim structure.

**Fields:**
- `fulfills: ActionHash` - Link to the Commitment fulfilled
- `fulfilled_by: ActionHash` - Link to the resulting EconomicEvent
- `claimed_at: Timestamp` - When the claim was created
- `claim_type: ParticipationClaimType` - Type of participation being claimed
- `counterparty: AgentPubKey` - The other agent involved in the bi-directional receipt
- `performance_metrics: PerformanceMetrics` - Quantitative measures of performance
- `bilateral_signature: CryptographicSignature` - Cryptographic proof of mutual agreement
- `interaction_context: String` - Context of the interaction
- `role_context: Option<String>` - Specific role context if applicable
- `resource_reference: Option<ActionHash>` - Link to the resource involved

**Privacy:** Stored as Holochain private entry accessible only to the owning agent

### ParticipationClaimType
Enumeration defining the types of participation claims that can be issued.

**Values:**
- `ResourceContribution` - Receipt for creating and getting a resource validated
- `NetworkValidation` - Receipt for performing validation duties
- `ResponsibleTransfer` - Receipt for properly transferring resource custody
- `CustodyAcceptance` - Receipt for accepting resource custody responsibly
- `ServiceCommitmentAccepted` - Receipt for accepting a service commitment
- `GoodFaithTransfer` - Receipt for transferring resource in good faith for service
- `ServiceFulfillmentCompleted` - Receipt for completing a service successfully
- `MaintenanceFulfillment` - Receipt for completing maintenance service
- `StorageFulfillment` - Receipt for completing storage service
- `TransportFulfillment` - Receipt for completing transport service
- `EndOfLifeDeclaration` - Receipt for declaring resource end-of-life
- `EndOfLifeValidation` - Receipt for validating resource end-of-life
- `DisputeResolutionParticipation` - Receipt for constructive dispute resolution
- `GovernanceCompliance` - Receipt for consistent adherence to governance protocols

### PerformanceMetrics
Quantitative measures of agent performance in economic interactions.

**Fields:**
- `timeliness_score: f64` - How promptly the agent fulfilled commitments (0.0-1.0)
- `quality_score: f64` - Quality of service provided (0.0-1.0)
- `reliability_score: f64` - Consistency and dependability (0.0-1.0)
- `communication_score: f64` - Effectiveness of communication (0.0-1.0)
- `completion_rate: f64` - Percentage of commitments successfully completed
- `resource_condition_maintained: Option<bool>` - Whether resource condition was maintained
- `additional_metrics: Option<String>` - JSON-encoded additional context-specific metrics

### CryptographicSignature
Cryptographic proof of mutual agreement between agents.

**Fields:**
- `signer: AgentPubKey` - Agent who created the signature
- `signature: Signature` - Cryptographic signature of the receipt data
- `signed_data_hash: ActionHash` - Hash of the data that was signed
- `signature_algorithm: String` - Algorithm used for signing (e.g., "Ed25519")
- `created_at: Timestamp` - When the signature was created

### ReputationSummary
Aggregated reputation metrics derived from an agent's Private Participation Claims.

**Fields:**
- `agent: AgentPubKey` - The agent whose reputation is summarized
- `total_interactions: u32` - Total number of completed economic interactions
- `average_timeliness: f64` - Average timeliness score across all interactions
- `average_quality: f64` - Average quality score across all interactions
- `average_reliability: f64` - Average reliability score across all interactions
- `average_communication: f64` - Average communication score across all interactions
- `completion_rate: f64` - Overall percentage of commitments successfully completed
- `role_performance: HashMap<String, RolePerformance>` - Performance breakdown by role
- `recent_activity: Vec<RecentInteraction>` - Summary of recent interactions (last 30 days)
- `calculated_at: Timestamp` - When this summary was calculated

### RolePerformance
Performance metrics for a specific role.

**Fields:**
- `role_name: String` - The role (e.g., "Transport", "Repair", "Storage")
- `interaction_count: u32` - Number of interactions in this role
- `average_performance: f64` - Average performance score for this role
- `specialization_score: f64` - How specialized/expert the agent is in this role
- `last_activity: Timestamp` - Most recent activity in this role

### RecentInteraction
Summary of a recent economic interaction for reputation display.

**Fields:**
- `interaction_type: String` - Type of interaction
- `counterparty: AgentPubKey` - The other agent involved
- `performance_score: f64` - Overall performance in this interaction
- `interaction_date: Timestamp` - When the interaction occurred
- `resource_involved: Option<ActionHash>` - Resource that was involved

### ProcessValidationRequirements
Defines validation requirements for a specific Economic Process type.

**Fields:**
- `process_type: String` - The type of process
- `required_role: Option<String>` - Role required to initiate this process
- `minimum_validators: u32` - Minimum number of validators required
- `validation_scheme: String` - Validation scheme to use
- `completion_validation_required: bool` - Whether completion needs separate validation
- `performance_thresholds: PerformanceThresholds` - Minimum performance thresholds
- `special_requirements: Vec<String>` - Any special requirements

### PerformanceThresholds
Minimum performance thresholds for process validation.

**Fields:**
- `minimum_timeliness: f64` - Minimum acceptable timeliness score
- `minimum_quality: f64` - Minimum acceptable quality score
- `minimum_reliability: f64` - Minimum acceptable reliability score
- `minimum_communication: f64` - Minimum acceptable communication score
- `minimum_completion_rate: f64` - Minimum acceptable completion rate