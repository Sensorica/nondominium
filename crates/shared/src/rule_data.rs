//! Typed governance rule payloads for `GovernanceRule.rule_data`.
//!
//! Ungated (no hdk/hdi) so integrity zomes, coordinator zomes, and unit tests
//! share one schema. `GovernanceRuleType` is derived from the `RuleData`
//! discriminant — never stored separately.

use serde::{Deserialize, Serialize};

/// Discriminant of a typed governance rule. Derived via `RuleData::rule_type()`.
#[derive(Clone, PartialEq, Debug, Serialize, Deserialize)]
pub enum GovernanceRuleType {
  AccessRequirement,
  UsageLimit,
  TransferCondition,
  MaintenanceSchedule,
}

impl std::fmt::Display for GovernanceRuleType {
  fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
    let s = match self {
      GovernanceRuleType::AccessRequirement => "AccessRequirement",
      GovernanceRuleType::UsageLimit => "UsageLimit",
      GovernanceRuleType::TransferCondition => "TransferCondition",
      GovernanceRuleType::MaintenanceSchedule => "MaintenanceSchedule",
    };
    write!(f, "{}", s)
  }
}

/// Accessibility posture for access-requirement rules.
#[derive(Clone, PartialEq, Debug, Serialize, Deserialize)]
pub enum Accessibility {
  Free,
  Credentialed,
  Gated,
}

#[derive(Clone, PartialEq, Debug, Serialize, Deserialize)]
pub struct AccessRequirementData {
  pub accessibility: Accessibility,
  pub required_role: Option<String>,
  pub min_affiliation: Option<String>,
}

#[derive(Clone, PartialEq, Debug, Serialize, Deserialize)]
pub struct UsageLimitData {
  pub max_duration_hours: Option<f64>,
  pub max_quantity_per_period: Option<f64>,
  pub period_days: Option<u32>,
}

/// Which kind of transfer a transfer-condition rule governs.
#[derive(Clone, PartialEq, Debug, Serialize, Deserialize)]
pub enum TransferType {
  Ownership,
  Custody,
  UseRights,
  Benefit,
}

#[derive(Clone, PartialEq, Debug, Serialize, Deserialize)]
pub struct TransferConditionData {
  pub transfer_type: TransferType,
  pub requires_validation: bool,
  pub validator_role: Option<String>,
}

#[derive(Clone, PartialEq, Debug, Serialize, Deserialize)]
pub struct MaintenanceScheduleData {
  pub interval_days: u32,
  pub required_role: Option<String>,
}

/// Tagged rule payload. Replaces the former `rule_type: String` + `rule_data: String` pair.
#[derive(Clone, PartialEq, Debug, Serialize, Deserialize)]
pub enum RuleData {
  AccessRequirement(AccessRequirementData),
  UsageLimit(UsageLimitData),
  TransferCondition(TransferConditionData),
  MaintenanceSchedule(MaintenanceScheduleData),
}

impl RuleData {
  pub fn rule_type(&self) -> GovernanceRuleType {
    match self {
      RuleData::AccessRequirement(_) => GovernanceRuleType::AccessRequirement,
      RuleData::UsageLimit(_) => GovernanceRuleType::UsageLimit,
      RuleData::TransferCondition(_) => GovernanceRuleType::TransferCondition,
      RuleData::MaintenanceSchedule(_) => GovernanceRuleType::MaintenanceSchedule,
    }
  }
}
