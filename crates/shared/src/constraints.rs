//! Pure constraint predicates for resource-classification coherence.
//!
//! Ungated (no hdk/hdi). Shared by integrity validation, coordinator Soft feedback,
//! UI dry-run queries, and unit tests.

use crate::rule_data::{Accessibility, RuleData, TransferType};
use crate::types::{LifecycleStage, PropertyRegime, ResourceNature, Rivalry, VfAction};
use serde::{Deserialize, Serialize};

/// Lightweight, non-persisted classification facts for predicate evaluation.
#[derive(Clone, Debug, PartialEq)]
pub struct ResourceClassification {
  pub resource_nature: ResourceNature,
  pub property_regime: PropertyRegime,
  /// `None` at call sites that don't need lifecycle (e.g. rule-definition checks).
  pub lifecycle_stage: Option<LifecycleStage>,
  pub rivalry_override: Option<Rivalry>,
}

impl ResourceClassification {
  pub fn effective_rivalry(&self) -> Rivalry {
    self
      .rivalry_override
      .clone()
      .unwrap_or_else(|| self.resource_nature.default_rivalry())
  }
}

/// Hard = integrity-zome block; Soft = coordinator/UI advisory only.
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub enum ConstraintSeverity {
  Hard,
  Soft,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct ConstraintViolation {
  pub rule_id: String,
  pub message: String,
  pub severity: ConstraintSeverity,
}

pub fn has_hard_violation(violations: &[ConstraintViolation]) -> bool {
  violations
    .iter()
    .any(|v| v.severity == ConstraintSeverity::Hard)
}

/// Format Hard violations into a single integrity-rejection message.
pub fn hard_violation_message(violations: &[ConstraintViolation]) -> String {
  violations
    .iter()
    .filter(|v| v.severity == ConstraintSeverity::Hard)
    .map(|v| format!("[{}] {}", v.rule_id, v.message))
    .collect::<Vec<_>>()
    .join("; ")
}

/// Soft advisory strings for coordinator / UI surfaces.
pub fn soft_violation_messages(violations: &[ConstraintViolation]) -> Vec<String> {
  violations
    .iter()
    .filter(|v| v.severity == ConstraintSeverity::Soft)
    .map(|v| format!("[{}] {}", v.rule_id, v.message))
    .collect()
}

/// Rule-definition coherence: which `RuleData` variants are permitted for a classification.
pub fn check_rule_data_permitted(
  ctx: &ResourceClassification,
  rule_data: &RuleData,
) -> Vec<ConstraintViolation> {
  match rule_data {
    RuleData::TransferCondition(t) if t.transfer_type == TransferType::Ownership => {
      if ctx.property_regime.permits_ownership_transfer() {
        return vec![];
      }
      vec![ConstraintViolation {
        rule_id: "ownership_transfer_not_permitted_by_regime".to_string(),
        message: format!(
          "{:?} does not permit ownership-transfer rules.",
          ctx.property_regime
        ),
        severity: if ctx.property_regime.is_uncapturable() {
          ConstraintSeverity::Hard
        } else {
          ConstraintSeverity::Soft
        },
      }]
    }
    RuleData::AccessRequirement(a) if a.accessibility == Accessibility::Gated => {
      if ctx.property_regime.is_uncapturable() {
        vec![ConstraintViolation {
          rule_id: "gated_access_contradicts_permissionless_regime".to_string(),
          message: "Nondominium resources must remain permissionless (REQ-RES-01); \
                    'Gated' access creates a discretionary chokepoint."
            .to_string(),
          severity: ConstraintSeverity::Soft,
        }]
      } else {
        vec![]
      }
    }
    _ => vec![],
  }
}

/// Soft: Move does not apply to Digital/Information resources.
pub fn check_transport_applicability(
  ctx: &ResourceClassification,
  action: &VfAction,
) -> Option<ConstraintViolation> {
  let is_move = matches!(action, VfAction::Move);
  let is_non_physical = matches!(
    ctx.resource_nature,
    ResourceNature::Digital | ResourceNature::Information
  );
  if is_move && is_non_physical {
    return Some(ConstraintViolation {
      rule_id: "no_transport_for_non_physical_nature".to_string(),
      message: format!(
        "Transport (Move) does not apply to a {:?} resource.",
        ctx.resource_nature
      ),
      severity: ConstraintSeverity::Soft,
    });
  }
  None
}

/// Hard: Transfer / Consume / Lower forbidden on uncapturable (Nondominium) regimes.
pub fn check_capture_resistance(
  ctx: &ResourceClassification,
  action: &VfAction,
) -> Option<ConstraintViolation> {
  if !ctx.property_regime.is_uncapturable() {
    return None;
  }
  let forbidden = matches!(
    action,
    VfAction::Transfer | VfAction::Consume | VfAction::Lower
  );
  if forbidden {
    return Some(ConstraintViolation {
      rule_id: "nondominium_no_unilateral_capture".to_string(),
      message: format!(
        "{:?} is not permitted on a Nondominium resource (REQ-RES-03).",
        action
      ),
      severity: ConstraintSeverity::Hard,
    });
  }
  None
}

/// Compose action-execution predicates.
pub fn check_action_permitted(
  ctx: &ResourceClassification,
  action: &VfAction,
) -> Vec<ConstraintViolation> {
  [
    check_capture_resistance(ctx, action),
    check_transport_applicability(ctx, action),
  ]
  .into_iter()
  .flatten()
  .collect()
}

#[cfg(test)]
mod tests {
  use super::*;
  use crate::rule_data::{AccessRequirementData, TransferConditionData};

  fn ctx(
    nature: ResourceNature,
    regime: PropertyRegime,
    rivalry_override: Option<Rivalry>,
  ) -> ResourceClassification {
    ResourceClassification {
      resource_nature: nature,
      property_regime: regime,
      lifecycle_stage: None,
      rivalry_override,
    }
  }

  #[test]
  fn default_rivalry_physical_is_rivalrous() {
    assert_eq!(
      ResourceNature::Physical.default_rivalry(),
      Rivalry::Rivalrous
    );
    assert_eq!(
      ResourceNature::Digital.default_rivalry(),
      Rivalry::NonRivalrous
    );
  }

  #[test]
  fn effective_rivalry_honours_override() {
    let c = ctx(
      ResourceNature::Service,
      PropertyRegime::Commons,
      Some(Rivalry::Rivalrous),
    );
    assert_eq!(c.effective_rivalry(), Rivalry::Rivalrous);
  }

  #[test]
  fn ownership_transfer_hard_on_nondominium() {
    let c = ctx(ResourceNature::Physical, PropertyRegime::Nondominium, None);
    let rule = RuleData::TransferCondition(TransferConditionData {
      transfer_type: TransferType::Ownership,
      requires_validation: false,
      validator_role: None,
    });
    let v = check_rule_data_permitted(&c, &rule);
    assert!(has_hard_violation(&v));
    assert_eq!(v[0].rule_id, "ownership_transfer_not_permitted_by_regime");
  }

  #[test]
  fn ownership_transfer_soft_on_commons() {
    let c = ctx(ResourceNature::Digital, PropertyRegime::Commons, None);
    let rule = RuleData::TransferCondition(TransferConditionData {
      transfer_type: TransferType::Ownership,
      requires_validation: false,
      validator_role: None,
    });
    let v = check_rule_data_permitted(&c, &rule);
    assert!(!has_hard_violation(&v));
    assert_eq!(v[0].severity, ConstraintSeverity::Soft);
  }

  #[test]
  fn gated_access_soft_on_nondominium() {
    let c = ctx(ResourceNature::Digital, PropertyRegime::Nondominium, None);
    let rule = RuleData::AccessRequirement(AccessRequirementData {
      accessibility: Accessibility::Gated,
      required_role: None,
      min_affiliation: None,
    });
    let v = check_rule_data_permitted(&c, &rule);
    assert!(!has_hard_violation(&v));
    assert_eq!(v[0].rule_id, "gated_access_contradicts_permissionless_regime");
  }

  #[test]
  fn capture_resistance_blocks_transfer_on_nondominium() {
    let c = ctx(ResourceNature::Physical, PropertyRegime::Nondominium, None);
    let v = check_action_permitted(&c, &VfAction::Transfer);
    assert!(has_hard_violation(&v));
    assert_eq!(v[0].rule_id, "nondominium_no_unilateral_capture");
  }

  #[test]
  fn transport_soft_for_digital_move() {
    let c = ctx(ResourceNature::Digital, PropertyRegime::Commons, None);
    let v = check_action_permitted(&c, &VfAction::Move);
    assert!(!has_hard_violation(&v));
    assert_eq!(v[0].severity, ConstraintSeverity::Soft);
    assert_eq!(v[0].rule_id, "no_transport_for_non_physical_nature");
  }

  #[test]
  fn use_allowed_on_nondominium() {
    let c = ctx(ResourceNature::Physical, PropertyRegime::Nondominium, None);
    let v = check_action_permitted(&c, &VfAction::Use);
    assert!(v.is_empty());
  }
}
