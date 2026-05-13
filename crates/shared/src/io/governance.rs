use crate::types::{BenefitClause, NdoLinkType, VfAction};
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
