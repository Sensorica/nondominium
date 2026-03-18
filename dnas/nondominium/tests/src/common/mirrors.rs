//! Mirror structs for coordinator output types.
//!
//! Coordinator crates cannot be imported directly because they depend on `hdk`
//! which requires a WASM target.  These lightweight mirror structs replicate
//! the serialisation shape so Sweettest can deserialize zome call responses.

use holochain::prelude::*;
use serde::{Deserialize, Serialize};

// ── Person zome mirrors ──────────────────────────────────────

/// Mirror of `PersonProfileOutput` from `zome_person::person`.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PersonProfileOutput {
    pub person: Option<PersonMirror>,
    pub private_data: Option<PrivatePersonDataMirror>,
}

/// Mirror of `Person` from `zome_person_integrity`.
/// We keep a separate mirror rather than importing the integrity crate directly
/// so that tests remain decoupled from integrity compilation quirks.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PersonMirror {
    pub name: String,
    pub avatar_url: Option<String>,
    pub bio: Option<String>,
    #[serde(default)]
    pub hrea_agent_hash: Option<ActionHash>,
}

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
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReaAgentMirror {
    pub id: Option<ActionHash>,
    pub name: String,
    pub agent_type: String,
    pub image: Option<String>,
    pub classified_as: Option<Vec<String>>,
    pub note: Option<String>,
}

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
/// The `state` field is serialized as a string by the `ResourceState::Display` impl.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EconomicResourceMirror {
    pub quantity: f64,
    pub unit: String,
    pub custodian: AgentPubKey,
    pub current_location: Option<String>,
    pub state: zome_resource_integrity::ResourceState,
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
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProposeCommitmentOutput {
    pub commitment_hash: ActionHash,
    pub commitment: zome_gouvernance_integrity::Commitment,
}

/// Mirror of `LogEconomicEventOutput` from `zome_gouvernance::economic_event`.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LogEconomicEventOutput {
    pub event_hash: ActionHash,
    pub event: zome_gouvernance_integrity::EconomicEvent,
    pub ppr_claims: Option<IssueParticipationReceiptsOutputMirror>,
}

/// Mirror of `ClaimCommitmentOutput` from `zome_gouvernance::commitment`.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ClaimCommitmentOutput {
    pub claim_hash: ActionHash,
    pub claim: zome_gouvernance_integrity::Claim,
}

// ── PPR (Private Participation Receipts) mirrors ─────────────

/// Mirror of `IssueParticipationReceiptsOutput` from `zome_gouvernance::ppr`.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IssueParticipationReceiptsOutputMirror {
    pub provider_claim_hash: ActionHash,
    pub receiver_claim_hash: ActionHash,
    pub provider_claim: zome_gouvernance_integrity::PrivateParticipationClaim,
    pub receiver_claim: zome_gouvernance_integrity::PrivateParticipationClaim,
}

/// Mirror of `GetMyParticipationClaimsOutput` from `zome_gouvernance::ppr`.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GetMyParticipationClaimsOutput {
    pub claims: Vec<(ActionHash, zome_gouvernance_integrity::PrivateParticipationClaim)>,
    pub total_count: u32,
}

/// Mirror of `DeriveReputationSummaryOutput` from `zome_gouvernance::ppr`.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeriveReputationSummaryOutput {
    pub summary: zome_gouvernance_integrity::ReputationSummary,
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
    pub status: zome_person_integrity::DeviceStatus,
}
