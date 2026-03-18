//! Mirror structs for coordinator output types.
//!
//! Coordinator crates cannot be imported directly because they depend on `hdk`
//! which requires a WASM target.  Integrity crates cannot be linked together
//! because each emits C-level `__num_entry_types` / `__num_link_types` symbols
//! that conflict when multiple integrity crates are linked into one binary.
//!
//! These lightweight mirror structs replicate the serialisation shape so
//! Sweettest can deserialize zome call responses without importing any
//! integrity crate.

use holochain::prelude::*;
use serde::{Deserialize, Serialize};

// ── Local enum mirrors ─────────────────────────────────────

/// Mirror of `ResourceState` from `zome_resource_integrity`.
/// Variant names must match the serde serialisation of the real enum.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, Default)]
pub enum ResourceState {
    #[default]
    PendingValidation,
    Active,
    Maintenance,
    Retired,
    Reserved,
}

/// Mirror of `DeviceStatus` from `zome_person_integrity`.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum DeviceStatus {
    Active,
    Inactive,
    Revoked,
}

/// Mirror of `ParticipationClaimType` from `zome_gouvernance_integrity::ppr`.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum ParticipationClaimType {
    // Genesis Role - Network Entry
    ResourceCreation,
    ResourceValidation,
    // Core Usage Role - Custodianship
    CustodyTransfer,
    CustodyAcceptance,
    // Intermediate Roles - Specialized Services
    MaintenanceCommitmentAccepted,
    MaintenanceFulfillmentCompleted,
    StorageCommitmentAccepted,
    StorageFulfillmentCompleted,
    TransportCommitmentAccepted,
    TransportFulfillmentCompleted,
    GoodFaithTransfer,
    // Network Governance
    DisputeResolutionParticipation,
    ValidationActivity,
    RuleCompliance,
    // Resource End-of-Life Management
    EndOfLifeDeclaration,
    EndOfLifeValidation,
}

// ── Person zome mirrors ──────────────────────────────────────

/// Mirror of `PersonProfileOutput` from `zome_person::person`.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PersonProfileOutput {
    pub person: Option<PersonMirror>,
    pub private_data: Option<PrivatePersonDataMirror>,
}

/// Mirror of `Person` from `zome_person_integrity`.
/// Implements `TryFrom<SerializedBytes>` so it can be used with `Record::entry().to_app_option()`.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PersonMirror {
    pub name: String,
    pub avatar_url: Option<String>,
    pub bio: Option<String>,
    #[serde(default)]
    pub hrea_agent_hash: Option<ActionHash>,
}
holochain_serialized_bytes::holochain_serial!(PersonMirror);

/// Mirror of `PrivatePersonData` from `zome_person_integrity`.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PrivatePersonDataMirror {
    pub legal_name: String,
    pub email: String,
    pub phone: Option<String>,
    pub address: Option<String>,
    pub emergency_contact: Option<String>,
    pub time_zone: Option<String>,
    pub location: Option<String>,
}

/// Mirror of `GetAllPersonsOutput` from `zome_person::person`.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GetAllPersonsOutput {
    pub persons: Vec<PersonMirror>,
}

/// Mirror of `PersonRole` from `zome_person_integrity`.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PersonRoleMirror {
    pub role_name: String,
    pub description: Option<String>,
    pub assigned_to: AgentPubKey,
    pub assigned_by: AgentPubKey,
    pub assigned_at: Timestamp,
}

/// Mirror of `GetPersonRolesOutput` from `zome_person::role`.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GetPersonRolesOutput {
    pub roles: Vec<PersonRoleMirror>,
}

/// Mirror of hREA `ReaAgent` for cross-DNA bridge tests.
/// Implements `TryFrom<SerializedBytes>` so it can be used with `Record::entry().to_app_option()`.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReaAgentMirror {
    pub id: Option<ActionHash>,
    pub name: String,
    pub agent_type: String,
    pub image: Option<String>,
    pub classified_as: Option<Vec<String>>,
    pub note: Option<String>,
}
holochain_serialized_bytes::holochain_serial!(ReaAgentMirror);

// ── Resource zome mirrors ────────────────────────────────────

/// Mirror of `ResourceSpecification` from `zome_resource_integrity`.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResourceSpecMirror {
    pub name: String,
    pub description: String,
    pub category: String,
    pub image_url: Option<String>,
    pub tags: Vec<String>,
    pub is_active: bool,
}

/// Mirror of `ResourceSpecification` from `zome_resource_integrity` (full entry shape).
/// Used in `GetResourceSpecWithRulesOutput` mirrors that return the raw entry.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResourceSpecificationMirror {
    pub name: String,
    pub description: String,
    pub category: String,
    pub image_url: Option<String>,
    pub tags: Vec<String>,
    pub is_active: bool,
}

/// Mirror of `GovernanceRule` from `zome_resource_integrity`.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GovernanceRuleMirror {
    pub rule_type: String,
    pub rule_data: String,
    pub enforced_by: Option<String>,
}

/// Mirror of `CreateResourceSpecificationOutput` from `zome_resource::resource_specification`.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateResourceSpecOutput {
    pub spec_hash: ActionHash,
    pub spec: ResourceSpecMirror,
    pub governance_rule_hashes: Vec<ActionHash>,
}

/// Mirror of `GetAllResourceSpecificationsOutput` from `zome_resource::resource_specification`.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GetAllResourceSpecsOutput {
    pub specifications: Vec<ResourceSpecMirror>,
}

/// Mirror of `EconomicResource` from `zome_resource_integrity`.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EconomicResourceMirror {
    pub quantity: f64,
    pub unit: String,
    pub custodian: AgentPubKey,
    pub current_location: Option<String>,
    pub state: ResourceState,
}

/// Mirror of `CreateEconomicResourceOutput` from `zome_resource::economic_resource`.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateEconomicResourceOutput {
    pub resource_hash: ActionHash,
    pub resource: EconomicResourceMirror,
}

/// Mirror of `GetAllEconomicResourcesOutput` from `zome_resource::economic_resource`.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GetAllEconomicResourcesOutput {
    pub resources: Vec<EconomicResourceMirror>,
}

// ── Governance / Commitment / Event mirrors ──────────────────

/// Mirror of `ProposeCommitmentOutput` from `zome_gouvernance::commitment`.
/// The `commitment` field is left as opaque JSON since tests mostly need the hash.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProposeCommitmentOutput {
    pub commitment_hash: ActionHash,
    pub commitment: serde_json::Value,
}

/// Mirror of `LogEconomicEventOutput` from `zome_gouvernance::economic_event`.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LogEconomicEventOutput {
    pub event_hash: ActionHash,
    pub event: serde_json::Value,
    pub ppr_claims: Option<IssueParticipationReceiptsOutputMirror>,
}

/// Mirror of `ClaimCommitmentOutput` from `zome_gouvernance::commitment`.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ClaimCommitmentOutput {
    pub claim_hash: ActionHash,
    pub claim: serde_json::Value,
}

// ── PPR (Private Participation Receipts) mirrors ─────────────

/// Mirror of `PerformanceMetrics` from `zome_gouvernance_integrity::ppr`.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PerformanceMetricsMirror {
    pub timeliness: f64,
    pub quality: f64,
    pub reliability: f64,
    pub communication: f64,
    pub overall_satisfaction: f64,
    pub notes: Option<String>,
}

/// Mirror of `CryptographicSignature` from `zome_gouvernance_integrity::ppr`.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CryptographicSignatureMirror {
    pub recipient_signature: Signature,
    pub counterparty_signature: Signature,
    pub signed_data_hash: [u8; 32],
    pub signing_timestamp: Timestamp,
}

/// Mirror of `PrivateParticipationClaim` from `zome_gouvernance_integrity::ppr`.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PrivateParticipationClaimMirror {
    // Standard ValueFlows fields
    pub fulfills: ActionHash,
    pub fulfilled_by: ActionHash,
    pub claimed_at: Timestamp,
    // PPR-specific extensions
    pub claim_type: ParticipationClaimType,
    pub performance_metrics: PerformanceMetricsMirror,
    pub bilateral_signature: CryptographicSignatureMirror,
    // Additional context
    pub counterparty: AgentPubKey,
    pub resource_hash: Option<ActionHash>,
    pub notes: Option<String>,
}

/// Mirror of `IssueParticipationReceiptsOutput` from `zome_gouvernance::ppr`.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IssueParticipationReceiptsOutputMirror {
    pub provider_claim_hash: ActionHash,
    pub receiver_claim_hash: ActionHash,
    pub provider_claim: PrivateParticipationClaimMirror,
    pub receiver_claim: PrivateParticipationClaimMirror,
}

/// Mirror of `GetMyParticipationClaimsOutput` from `zome_gouvernance::ppr`.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GetMyParticipationClaimsOutput {
    pub claims: Vec<(ActionHash, PrivateParticipationClaimMirror)>,
    pub total_count: u32,
}

/// Mirror of `ReputationSummary` from `zome_gouvernance_integrity::ppr`.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReputationSummaryMirror {
    pub total_claims: u32,
    pub average_performance: f64,
    pub creation_claims: u32,
    pub custody_claims: u32,
    pub service_claims: u32,
    pub governance_claims: u32,
    pub end_of_life_claims: u32,
    pub period_start: Timestamp,
    pub period_end: Timestamp,
    pub agent: AgentPubKey,
    pub generated_at: Timestamp,
}

/// Mirror of `DeriveReputationSummaryOutput` from `zome_gouvernance::ppr`.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeriveReputationSummaryOutput {
    pub summary: ReputationSummaryMirror,
    pub claims_included: u32,
}

// ── Capability-based sharing mirrors ─────────────────────────

/// Mirror of the grant output from `zome_person::capability_based_sharing`.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GrantPrivateDataAccessOutput {
    pub grant_hash: ActionHash,
    pub cap_secret: CapSecret,
    pub expires_at: Timestamp,
}

/// Mirror of the claim output from `zome_person::capability_based_sharing`.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreatePrivateDataCapClaimOutput {
    pub claim_hash: ActionHash,
}

/// Mirror of `FilteredPrivateData` from `zome_person_integrity`.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FilteredPrivateDataMirror {
    pub legal_name: Option<String>,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub address: Option<String>,
    pub emergency_contact: Option<String>,
    pub time_zone: Option<String>,
    pub location: Option<String>,
}

// ── Device mirrors ───────────────────────────────────────────

/// Mirror of `Device` from `zome_person_integrity`.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeviceMirror {
    pub device_id: String,
    pub device_name: String,
    pub device_type: String,
    pub owner_agent: AgentPubKey,
    pub owner_person: ActionHash,
    pub registered_at: Timestamp,
    pub last_active: Timestamp,
    pub status: DeviceStatus,
}
