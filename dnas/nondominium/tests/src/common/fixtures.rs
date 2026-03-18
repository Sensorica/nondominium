//! Sample data constructors for Sweettest.
//!
//! These mirror the TS `samplePerson`, `samplePrivateData`, etc. helpers
//! from `tests/src/nondominium/person/common.ts`.
//!
//! All governance enums (VfAction, ParticipationClaimType) are represented as
//! `String` to avoid importing integrity crates.  The serde serialisation of
//! Rust enums defaults to the variant name, so `"Transfer"`, `"CustodyTransfer"`,
//! etc. round-trip correctly.

use holochain::prelude::*;
use serde::{Deserialize, Serialize};

use super::mirrors::ParticipationClaimType;

// ── Role name constants ──────────────────────────────────────
// These MUST match the exact strings the `RoleType::from_str` validation accepts.

pub const ROLE_SIMPLE_AGENT: &str = "Simple Agent";
pub const ROLE_ACCOUNTABLE_AGENT: &str = "Accountable Agent";
pub const ROLE_PRIMARY_ACCOUNTABLE_AGENT: &str = "Primary Accountable Agent";
pub const ROLE_TRANSPORT_AGENT: &str = "Transport Agent";
pub const ROLE_REPAIR_AGENT: &str = "Repair Agent";
pub const ROLE_STORAGE_AGENT: &str = "Storage Agent";

// Semantic aliases matching the TS `TEST_ROLES` object
pub const ROLE_RESOURCE_STEWARD: &str = "Transport Agent";
pub const ROLE_RESOURCE_COORDINATOR: &str = "Accountable Agent";
pub const ROLE_FOUNDER: &str = "Primary Accountable Agent";

// ── Capability level constants ───────────────────────────────
// These match the strings returned by `get_person_capability_level`.

pub const CAP_MEMBER: &str = "member";
pub const CAP_STEWARDSHIP: &str = "stewardship";
pub const CAP_COORDINATION: &str = "coordination";
pub const CAP_GOVERNANCE: &str = "governance";

// ── Person fixtures ──────────────────────────────────────────

/// Input for `create_person` zome call.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PersonInput {
    pub name: String,
    pub avatar_url: Option<String>,
    pub bio: Option<String>,
}

/// Create a sample person input with sensible defaults.
pub fn sample_person(name: impl Into<String>) -> PersonInput {
    PersonInput {
        name: name.into(),
        avatar_url: Some("https://example.com/avatar.png".to_string()),
        bio: Some("A community member".to_string()),
    }
}

/// Input for `store_private_person_data` zome call.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PrivatePersonDataInput {
    pub legal_name: String,
    pub email: String,
    pub phone: Option<String>,
    pub address: Option<String>,
    pub emergency_contact: Option<String>,
    pub time_zone: Option<String>,
    pub location: Option<String>,
}

/// Create sample private data with sensible defaults.
pub fn sample_private_data(
    legal_name: impl Into<String>,
    email: impl Into<String>,
) -> PrivatePersonDataInput {
    PrivatePersonDataInput {
        legal_name: legal_name.into(),
        email: email.into(),
        phone: Some("+1-555-123-4567".to_string()),
        address: Some("123 Main St, Anytown, AT 12345".to_string()),
        emergency_contact: Some("Jane Doe, +1-555-987-6543".to_string()),
        time_zone: Some("America/New_York".to_string()),
        location: Some("New York, NY".to_string()),
    }
}

// ── Role fixtures ────────────────────────────────────────────

/// Input for `assign_person_role` zome call.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PersonRoleInput {
    pub agent_pubkey: AgentPubKey,
    pub role_name: String,
    pub description: Option<String>,
}

/// Create a sample role assignment input.
pub fn sample_role(agent: AgentPubKey, role_name: impl Into<String>) -> PersonRoleInput {
    PersonRoleInput {
        agent_pubkey: agent,
        role_name: role_name.into(),
        description: Some("A community role".to_string()),
    }
}

// ── Resource fixtures ────────────────────────────────────────

/// Governance rule input, nested inside resource specification creation.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GovernanceRuleInput {
    pub rule_type: String,
    pub rule_data: String,
    pub enforced_by: Option<String>,
}

/// Input for `create_resource_specification` zome call.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResourceSpecificationInput {
    pub name: String,
    pub description: String,
    pub category: String,
    pub image_url: Option<String>,
    pub tags: Vec<String>,
    pub governance_rules: Vec<GovernanceRuleInput>,
}

/// Create a sample resource specification input with one governance rule.
pub fn sample_resource_spec(name: impl Into<String>) -> ResourceSpecificationInput {
    ResourceSpecificationInput {
        name: name.into(),
        description: "A shared community resource".to_string(),
        category: "tools".to_string(),
        image_url: Some("https://example.com/tool.png".to_string()),
        tags: vec!["shared".to_string(), "community".to_string()],
        governance_rules: vec![GovernanceRuleInput {
            rule_type: "access_requirement".to_string(),
            rule_data: r#"{"min_member_level":"verified"}"#.to_string(),
            enforced_by: Some("Resource Steward".to_string()),
        }],
    }
}

/// Input for `create_economic_resource` zome call.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EconomicResourceInput {
    pub spec_hash: ActionHash,
    pub quantity: f64,
    pub unit: String,
    pub current_location: Option<String>,
}

/// Create a sample economic resource input.
pub fn sample_economic_resource(spec_hash: ActionHash) -> EconomicResourceInput {
    EconomicResourceInput {
        spec_hash,
        quantity: 1.0,
        unit: "piece".to_string(),
        current_location: Some("Community Workshop".to_string()),
    }
}

// ── Device fixtures ──────────────────────────────────────────

/// Input for `register_device_for_person` zome call.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeviceInput {
    pub device_id: String,
    pub device_name: String,
    pub device_type: String,
    pub person_hash: ActionHash,
}

/// Create a sample device registration input.
pub fn sample_device(person_hash: ActionHash, device_id: impl Into<String>) -> DeviceInput {
    DeviceInput {
        device_id: device_id.into(),
        device_name: "My Test Device".to_string(),
        device_type: "desktop".to_string(),
        person_hash,
    }
}

// ── Governance / Commitment fixtures ─────────────────────────

/// Input for `propose_commitment` zome call.
/// The `action` field is a `String` matching the `VfAction` enum variant name
/// (e.g. `"Transfer"`, `"Work"`, `"Use"`).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProposeCommitmentInput {
    pub action: String,
    pub provider: AgentPubKey,
    pub resource_hash: Option<ActionHash>,
    pub resource_spec_hash: Option<ActionHash>,
    pub due_date: Timestamp,
    pub note: Option<String>,
}

/// Create a sample commitment (Transfer action, due in 24 hours).
pub fn sample_commitment(provider: AgentPubKey) -> ProposeCommitmentInput {
    let due_date_micros = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_micros() as i64
        + 24 * 60 * 60 * 1_000_000;

    ProposeCommitmentInput {
        action: "Transfer".to_string(),
        provider,
        resource_hash: None,
        resource_spec_hash: None,
        due_date: Timestamp::from_micros(due_date_micros),
        note: Some("Test commitment".to_string()),
    }
}

/// Input for `log_economic_event` zome call.
/// The `action` field is a `String` matching the `VfAction` enum variant name.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LogEconomicEventInput {
    pub action: String,
    pub provider: AgentPubKey,
    pub receiver: AgentPubKey,
    pub resource_inventoried_as: ActionHash,
    pub resource_quantity: f64,
    pub note: Option<String>,
    pub commitment_hash: Option<ActionHash>,
    pub generate_pprs: Option<bool>,
}

/// Input for `claim_commitment` zome call.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ClaimCommitmentInput {
    pub commitment_hash: ActionHash,
    pub fulfillment_note: Option<String>,
}

// ── PPR fixtures ─────────────────────────────────────────────

/// Performance metrics input matching `PerformanceMetrics` from governance integrity.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PerformanceMetricsInput {
    pub timeliness: f64,
    pub quality: f64,
    pub reliability: f64,
    pub communication: f64,
    pub overall_satisfaction: f64,
    pub notes: Option<String>,
}

/// Good default performance metrics (all 0.9).
pub fn sample_metrics() -> PerformanceMetricsInput {
    PerformanceMetricsInput {
        timeliness: 0.9,
        quality: 0.9,
        reliability: 0.9,
        communication: 0.9,
        overall_satisfaction: 0.9,
        notes: None,
    }
}

/// Input for `issue_participation_receipts` zome call.
/// The `claim_types` field uses `Vec<ParticipationClaimType>` (local mirror enum)
/// which serializes identically to the integrity crate's enum.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IssueParticipationReceiptsInput {
    pub fulfills: ActionHash,
    pub fulfilled_by: ActionHash,
    pub provider: AgentPubKey,
    pub receiver: AgentPubKey,
    pub claim_types: Vec<ParticipationClaimType>,
    pub provider_metrics: PerformanceMetricsInput,
    pub receiver_metrics: PerformanceMetricsInput,
    pub resource_hash: Option<ActionHash>,
    pub notes: Option<String>,
}

/// Input for `get_my_participation_claims` zome call.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GetMyParticipationClaimsInput {
    pub claim_type_filter: Option<ParticipationClaimType>,
    pub from_time: Option<Timestamp>,
    pub to_time: Option<Timestamp>,
    pub limit: Option<u32>,
}

/// Input for `derive_reputation_summary` zome call.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeriveReputationSummaryInput {
    pub period_start: Timestamp,
    pub period_end: Timestamp,
    pub claim_type_filter: Option<Vec<ParticipationClaimType>>,
}

// ── Capability-based sharing fixtures ────────────────────────

/// Input for `grant_private_data_access` zome call.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GrantPrivateDataAccessInput {
    pub agent_to_grant: AgentPubKey,
    pub fields_allowed: Vec<String>,
    pub context: String,
    pub expires_in_days: Option<u32>,
}

/// Input for `create_private_data_cap_claim` zome call.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreatePrivateDataCapClaimInput {
    pub grantor: AgentPubKey,
    pub cap_secret: CapSecret,
    pub context: String,
}

/// Input for `get_private_data_with_capability` zome call.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GetPrivateDataWithCapabilityInput {
    pub requested_fields: Vec<String>,
}
