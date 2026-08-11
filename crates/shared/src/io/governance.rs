use crate::constraints::ConstraintViolation;
use crate::types::{
  BenefitClause, LifecycleStage, NdoLinkType, OperationalState, PropertyRegime, ResourceNature,
  Rivalry, VfAction,
};
use hdi::prelude::*;
use serde::{Deserialize, Serialize};

/// Input to `create_agreement` in `zome_gouvernance/agreement.rs`.
#[derive(Debug, Serialize, Deserialize)]
pub struct CreateAgreementInput {
  pub ndo_identity_hash: ActionHash,
  pub clauses: Vec<BenefitClause>,
  pub primary_accountable: Vec<AgentPubKey>,
}

/// Input to `update_agreement` in `zome_gouvernance/agreement.rs`.
#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateAgreementInput {
  pub original_action_hash: ActionHash,
  pub clauses: Vec<BenefitClause>,
  pub primary_accountable: Vec<AgentPubKey>,
}

/// Input to `validate_contribution` in `zome_gouvernance/contribution.rs`.
#[derive(Debug, Serialize, Deserialize)]
pub struct ValidateContributionInput {
  pub provider: AgentPubKey,
  pub action: VfAction,
  pub work_log_group_dna_hash: Option<DnaHash>,
  pub work_log_action_hash: Option<ActionHash>,
  pub ndo_identity_hash: ActionHash,
  pub input_of: Option<ActionHash>,
  pub note: String,
  pub effort_quantity: Option<f64>,
  pub fulfills: Option<ActionHash>,
  pub has_point_in_time: Timestamp,
}

/// Input to `create_ndo_hard_link` in `zome_gouvernance/hard_link.rs`.
#[derive(Debug, Serialize, Deserialize)]
pub struct CreateNdoHardLinkInput {
  pub from_ndo_identity_hash: ActionHash,
  pub to_ndo_dna_hash: DnaHash,
  pub to_ndo_identity_hash: ActionHash,
  pub link_type: NdoLinkType,
  pub fulfillment_hash: ActionHash,
}

/// Input to `get_ndo_hard_links_by_type` in `zome_gouvernance/hard_link.rs`.
#[derive(Debug, Serialize, Deserialize)]
pub struct GetNdoHardLinksByTypeInput {
  pub ndo_identity_hash: ActionHash,
  pub link_type: NdoLinkType,
}

/// Subset of `NondominiumIdentity` fields needed for constraint evaluation.
/// Deserializes from the full Layer 0 entry (extra fields ignored by serde).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NdoClassificationView {
  pub property_regime: PropertyRegime,
  pub resource_nature: ResourceNature,
  pub lifecycle_stage: LifecycleStage,
  pub rivalry_override: Option<Rivalry>,
}

/// Wire-compatible view of `EconomicResource` for cross-zome transition requests.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EconomicResourceView {
  pub quantity: f64,
  pub unit: String,
  pub custodian: AgentPubKey,
  pub current_location: Option<String>,
  pub operational_state: OperationalState,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TransitionContext {
  pub target_location: Option<String>,
  pub quantity_change: Option<f64>,
  pub target_custodian: Option<AgentPubKey>,
  pub process_notes: Option<String>,
  pub process_context: Option<ActionHash>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GovernanceTransitionRequest {
  pub action: VfAction,
  pub resource: EconomicResourceView,
  pub ndo_identity_hash: ActionHash,
  pub requesting_agent: AgentPubKey,
  pub context: TransitionContext,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GovernanceTransitionResult {
  pub success: bool,
  pub new_resource_state: Option<EconomicResourceView>,
  /// Reserved for when event generation is wired; currently always None on this path.
  pub economic_event_hash: Option<ActionHash>,
  pub rejection_reasons: Option<Vec<String>>,
  pub next_steps: Option<Vec<String>>,
  /// Soft constraint violations — non-blocking advisory feedback.
  pub advisory_warnings: Option<Vec<String>>,
  /// Echo Soft violations in structured form for UI dry-run parity.
  pub soft_violations: Option<Vec<ConstraintViolation>>,
}

/// Dry-run input for action-constraint queries (hash-free / hypothetical).
#[derive(Debug, Serialize, Deserialize)]
pub struct CheckActionConstraintsInput {
  pub property_regime: PropertyRegime,
  pub resource_nature: ResourceNature,
  pub rivalry_override: Option<Rivalry>,
  pub action: VfAction,
}
