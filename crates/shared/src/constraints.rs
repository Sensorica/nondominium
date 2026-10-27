//! Pure constraint predicates for resource-classification coherence.
//!
//! Ungated (no hdk/hdi). Shared by integrity validation, coordinator Soft feedback,
//! UI dry-run queries, and unit tests.

use crate::rule_data::{Accessibility, RuleData, TransferType};
use crate::types::{
  LifecycleStage, PropertyRegime, ResourceNature, ResourceScope, Rivalry, VfAction,
};
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

/// Pool and CommonPool govern subtractable use. Private and Collective do not:
/// a non-rivalrous resource can still be stewarded by one agent.
fn regime_assumes_subtraction(regime: &PropertyRegime) -> bool {
  matches!(regime, PropertyRegime::Pool | PropertyRegime::CommonPool)
}

/// Soft: a subtractable regime on a non-rivalrous classification.
///
/// Regime and rivalry stay orthogonal, so this is an advisory. A Hard rejection
/// would turn a wizard default into an integrity block the ontology does not state.
fn subtractable_regime_on_nonrivalrous(
  ctx: &ResourceClassification,
) -> Option<ConstraintViolation> {
  if ctx.effective_rivalry() != Rivalry::NonRivalrous
    || !regime_assumes_subtraction(&ctx.property_regime)
  {
    return None;
  }
  Some(ConstraintViolation {
    rule_id: "subtractable_regime_on_nonrivalrous".to_string(),
    message: format!(
      "{:?} assumes subtractable use, and this resource is non-rivalrous. \
       A seat or download cap is an access rule.",
      ctx.property_regime
    ),
    severity: ConstraintSeverity::Soft,
  })
}

/// Soft: a quantity-per-period usage limit meters subtraction.
///
/// A duration cap is left alone: it can be a booking window. `max_concurrent_users`
/// is not on typed `UsageLimitData`, so a capacity rule is invisible here until
/// that field exists.
fn quantity_limit_on_nonrivalrous(
  ctx: &ResourceClassification,
  rule_data: &RuleData,
) -> Option<ConstraintViolation> {
  let RuleData::UsageLimit(limit) = rule_data else {
    return None;
  };
  if limit.max_quantity_per_period.is_none() || ctx.effective_rivalry() != Rivalry::NonRivalrous {
    return None;
  }
  Some(ConstraintViolation {
    rule_id: "quantity_limit_on_nonrivalrous".to_string(),
    message: "A quantity-per-period limit meters subtractable use, and this resource \
              is non-rivalrous. A seat or download cap is an access rule."
      .to_string(),
    severity: ConstraintSeverity::Soft,
  })
}

/// Rule-definition coherence: which `RuleData` variants are permitted for a classification.
///
/// Ownership and gated-access checks read the regime. The rivalry checks read
/// `effective_rivalry()` (nature default, or `rivalry_override`). None of them
/// read `lifecycle_stage`.
pub fn check_rule_data_permitted(
  ctx: &ResourceClassification,
  rule_data: &RuleData,
) -> Vec<ConstraintViolation> {
  let mut violations = Vec::new();

  match rule_data {
    RuleData::TransferCondition(t) if t.transfer_type == TransferType::Ownership => {
      if !ctx.property_regime.permits_ownership_transfer() {
        violations.push(ConstraintViolation {
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
        });
      }
    }
    RuleData::AccessRequirement(a) if a.accessibility == Accessibility::Gated => {
      if ctx.property_regime.is_uncapturable() {
        violations.push(ConstraintViolation {
          rule_id: "gated_access_contradicts_permissionless_regime".to_string(),
          message: "Nondominium resources must remain permissionless (REQ-RES-01); \
                    'Gated' access creates a discretionary chokepoint."
            .to_string(),
          severity: ConstraintSeverity::Soft,
        });
      }
    }
    _ => {}
  }

  if let Some(violation) = subtractable_regime_on_nonrivalrous(ctx) {
    violations.push(violation);
  }
  if let Some(violation) = quantity_limit_on_nonrivalrous(ctx, rule_data) {
    violations.push(violation);
  }
  violations
}

/// Soft: Move does not apply to Digital resources.
pub fn check_transport_applicability(
  ctx: &ResourceClassification,
  action: &VfAction,
) -> Option<ConstraintViolation> {
  let is_move = matches!(action, VfAction::Move);
  let is_non_physical = matches!(ctx.resource_nature, ResourceNature::Digital);
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

/// Hard: an open-access regime cannot narrow its Layer 1 specification below
/// `Public` scope.
///
/// `Nondominium` is uncapturable by design and `Public` is open-access by policy of
/// the stewarding body. Scoping either one to a single project or network is enclosure
/// by visibility: the resource stays technically unownable while becoming undiscoverable
/// to everyone outside the narrowing group, which is the outcome REQ-RES-03 exists to
/// prevent. Scope is the one Layer 1 field that can quietly undo a Layer 0 guarantee,
/// so it is Hard rather than advisory.
pub fn check_scope_coherence(
  ctx: &ResourceClassification,
  scope: &ResourceScope,
) -> Option<ConstraintViolation> {
  let open_access = matches!(
    ctx.property_regime,
    PropertyRegime::Nondominium | PropertyRegime::Public
  );
  if !open_access || matches!(scope, ResourceScope::Public) {
    return None;
  }
  Some(ConstraintViolation {
    rule_id: "open_regime_requires_public_scope".to_string(),
    message: format!(
      "A {:?} resource cannot carry {:?} scope; it implies Public scope (REQ-RES-03).",
      ctx.property_regime, scope
    ),
    severity: ConstraintSeverity::Hard,
  })
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
  use crate::rule_data::{AccessRequirementData, TransferConditionData, UsageLimitData};

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
      ResourceNature::Digital,
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
    assert_eq!(
      v[0].rule_id,
      "gated_access_contradicts_permissionless_regime"
    );
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

  #[test]
  fn nondominium_rejects_project_scope() {
    let v = check_scope_coherence(
      &ctx(ResourceNature::Physical, PropertyRegime::Nondominium, None),
      &ResourceScope::Project,
    )
    .expect("Project scope on Nondominium is a Hard violation");
    assert_eq!(v.rule_id, "open_regime_requires_public_scope");
    assert_eq!(v.severity, ConstraintSeverity::Hard);
  }

  #[test]
  fn nondominium_rejects_network_scope() {
    // Network is narrower than Public at the discovery layer, so it encloses too.
    let v = check_scope_coherence(
      &ctx(ResourceNature::Digital, PropertyRegime::Nondominium, None),
      &ResourceScope::Network,
    );
    assert!(v.is_some(), "Network scope on Nondominium must be rejected");
  }

  #[test]
  fn public_regime_rejects_project_scope() {
    let v = check_scope_coherence(
      &ctx(ResourceNature::Physical, PropertyRegime::Public, None),
      &ResourceScope::Project,
    );
    assert!(
      v.is_some(),
      "Project scope on a Public regime must be rejected"
    );
  }

  #[test]
  fn open_regimes_accept_public_scope() {
    for regime in [PropertyRegime::Nondominium, PropertyRegime::Public] {
      assert!(
        check_scope_coherence(
          &ctx(ResourceNature::Physical, regime.clone(), None),
          &ResourceScope::Public,
        )
        .is_none(),
        "Public scope is the only coherent scope for {regime:?} and must be accepted"
      );
    }
  }

  #[test]
  fn subtractable_regime_is_soft_on_nonrivalrous() {
    for regime in [PropertyRegime::Pool, PropertyRegime::CommonPool] {
      let v = check_rule_data_permitted(
        &ctx(ResourceNature::Digital, regime.clone(), None),
        &RuleData::AccessRequirement(AccessRequirementData {
          accessibility: Accessibility::Free,
          required_role: None,
          min_affiliation: None,
        }),
      );
      assert!(!has_hard_violation(&v));
      assert_eq!(v.len(), 1);
      assert_eq!(v[0].rule_id, "subtractable_regime_on_nonrivalrous");
      assert_eq!(v[0].severity, ConstraintSeverity::Soft);
    }
  }

  #[test]
  fn rivalrous_override_clears_subtractable_regime_warning() {
    let v = check_rule_data_permitted(
      &ctx(
        ResourceNature::Digital,
        PropertyRegime::CommonPool,
        Some(Rivalry::Rivalrous),
      ),
      &RuleData::AccessRequirement(AccessRequirementData {
        accessibility: Accessibility::Free,
        required_role: None,
        min_affiliation: None,
      }),
    );
    assert!(v.is_empty());
  }

  #[test]
  fn private_nonrivalrous_is_coherent() {
    let v = check_rule_data_permitted(
      &ctx(ResourceNature::Digital, PropertyRegime::Private, None),
      &RuleData::AccessRequirement(AccessRequirementData {
        accessibility: Accessibility::Free,
        required_role: None,
        min_affiliation: None,
      }),
    );
    assert!(v.is_empty());
  }

  #[test]
  fn quantity_limit_is_soft_on_nonrivalrous() {
    let v = check_rule_data_permitted(
      &ctx(ResourceNature::Digital, PropertyRegime::Commons, None),
      &RuleData::UsageLimit(UsageLimitData {
        max_duration_hours: None,
        max_quantity_per_period: Some(10.0),
        period_days: Some(30),
      }),
    );
    assert!(!has_hard_violation(&v));
    assert_eq!(v.len(), 1);
    assert_eq!(v[0].rule_id, "quantity_limit_on_nonrivalrous");
  }

  #[test]
  fn duration_limit_on_nonrivalrous_is_allowed() {
    let v = check_rule_data_permitted(
      &ctx(ResourceNature::Digital, PropertyRegime::Commons, None),
      &RuleData::UsageLimit(UsageLimitData {
        max_duration_hours: Some(2.0),
        max_quantity_per_period: None,
        period_days: None,
      }),
    );
    assert!(v.is_empty());
  }

  #[test]
  fn quantity_limit_on_rivalrous_common_pool_is_allowed() {
    let v = check_rule_data_permitted(
      &ctx(ResourceNature::Physical, PropertyRegime::CommonPool, None),
      &RuleData::UsageLimit(UsageLimitData {
        max_duration_hours: None,
        max_quantity_per_period: Some(10.0),
        period_days: Some(30),
      }),
    );
    assert!(v.is_empty());
  }

  #[test]
  fn closed_regimes_accept_any_scope() {
    // Regime and scope are orthogonal everywhere except the open-access regimes; a
    // Commons or Private resource may legitimately be scoped to one project.
    for regime in [
      PropertyRegime::Private,
      PropertyRegime::Commons,
      PropertyRegime::Collective,
      PropertyRegime::Pool,
      PropertyRegime::CommonPool,
    ] {
      for scope in [
        ResourceScope::Project,
        ResourceScope::Network,
        ResourceScope::Public,
      ] {
        assert!(
          check_scope_coherence(&ctx(ResourceNature::Physical, regime.clone(), None), &scope)
            .is_none(),
          "{regime:?} must accept {scope:?}"
        );
      }
    }
  }
}
