//! Governance-as-operator transition evaluation (Phase B).
//!
//! Parallel path alongside `propose_commitment` / `log_economic_event` —
//! Soft advisory UX lives here; Hard gates are still enforced by integrity
//! validation regardless of which coordinator entry point is used.
//!
//! TODO(§5 item 2): decide whether existing write paths should funnel through
//! this function or remain parallel. Currently parallel by design.

use hdk::prelude::*;
use nondominium_shared::constraints::{
  check_action_permitted, soft_violation_messages, ConstraintSeverity, ResourceClassification,
};
use nondominium_shared::io::governance::{
  GovernanceTransitionRequest, GovernanceTransitionResult, NdoClassificationView,
};
use nondominium_shared::{call_resource_zome, GovernanceError};

#[hdk_extern]
pub fn evaluate_state_transition(
  request: GovernanceTransitionRequest,
) -> ExternResult<GovernanceTransitionResult> {
  let ndi: Option<NdoClassificationView> =
    call_resource_zome("get_ndo", request.ndo_identity_hash.clone())?;

  let ndi = ndi.ok_or(GovernanceError::EntryOperationFailed(
    "NondominiumIdentity not found for transition request".to_string(),
  ))?;

  let ctx = ResourceClassification {
    resource_nature: ndi.resource_nature,
    property_regime: ndi.property_regime,
    lifecycle_stage: Some(ndi.lifecycle_stage),
    rivalry_override: ndi.rivalry_override,
  };

  let violations = check_action_permitted(&ctx, &request.action);
  let (hard, soft): (Vec<_>, Vec<_>) = violations
    .into_iter()
    .partition(|v| v.severity == ConstraintSeverity::Hard);

  if !hard.is_empty() {
    return Ok(GovernanceTransitionResult {
      success: false,
      new_resource_state: None,
      economic_event_hash: None,
      rejection_reasons: Some(
        hard
          .iter()
          .map(|v| format!("[{}] {}", v.rule_id, v.message))
          .collect(),
      ),
      next_steps: None,
      advisory_warnings: None,
      soft_violations: None,
    });
  }

  // Soft warnings surface as advisory; no event generation yet (net-new operator path).
  let advisory = soft_violation_messages(&soft);
  Ok(GovernanceTransitionResult {
    success: true,
    new_resource_state: Some(request.resource),
    economic_event_hash: None,
    rejection_reasons: None,
    next_steps: None,
    advisory_warnings: (!advisory.is_empty()).then_some(advisory),
    soft_violations: (!soft.is_empty()).then_some(soft),
  })
}
