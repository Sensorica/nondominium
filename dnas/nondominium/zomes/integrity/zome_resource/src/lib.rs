use hdi::prelude::*;

// TODO: Add transport state
#[derive(Clone, PartialEq, Debug, Serialize, Deserialize, Default)]
pub enum ResourceState {
  #[default]
  PendingValidation,
  Active,
  Maintenance,
  Retired,
  Reserved,
}

impl std::fmt::Display for ResourceState {
  fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
    match self {
      ResourceState::PendingValidation => write!(f, "pending_validation"),
      ResourceState::Active => write!(f, "active"),
      ResourceState::Maintenance => write!(f, "maintenance"),
      ResourceState::Retired => write!(f, "retired"),
      ResourceState::Reserved => write!(f, "reserved"),
    }
  }
}

#[hdk_entry_helper]
#[derive(Clone, PartialEq)]
pub struct ResourceSpecification {
  pub name: String,
  pub description: String,
  pub category: String, // For efficient categorized queries (like ServiceType)
  pub image_url: Option<String>,
  pub tags: Vec<String>, // For flexible discovery and filtering
  pub is_active: bool, // For filtering active vs inactive specs
}

#[hdk_entry_helper]
#[derive(Clone, PartialEq)]
pub struct GovernanceRule {
  pub rule_type: String, // e.g., "access_requirement", "usage_limit", "transfer_conditions"
  pub rule_data: String, // JSON-encoded rule parameters
  pub enforced_by: Option<String>, // Role required to enforce this rule
}

#[hdk_entry_helper]
#[derive(Clone, PartialEq)]
pub struct EconomicResource {
  pub quantity: f64,
  pub unit: String,
  pub custodian: AgentPubKey, // The Primary Accountable Agent holding the resource
  pub current_location: Option<String>, // Physical or virtual location TODO: use an enum
  pub state: ResourceState,
}

#[hdk_entry_types]
#[unit_enum(UnitEntryTypes)]
#[derive(Serialize, Deserialize, SerializedBytes)]
pub enum EntryTypes {
  ResourceSpecification(ResourceSpecification),
  EconomicResource(EconomicResource),
  GovernanceRule(GovernanceRule),
}

#[hdk_link_types]
#[derive(Serialize, Deserialize)]
pub enum LinkTypes {
  // Discovery anchors (inspired by Requests & Offers patterns)
  AllResourceSpecifications,
  AllEconomicResources,
  AllGovernanceRules,

  // Hierarchical linking for efficient queries
  SpecificationToResource,       // ResourceSpec -> EconomicResource
  CustodianToResource,           // Agent -> Resources they custody
  SpecificationToGovernanceRule, // ResourceSpec -> GovernanceRules

  // Agent-centric patterns (from R&O)
  AgentToOwnedSpecs,       // Agent -> ResourceSpecs they created
  AgentToManagedResources, // Agent -> Resources they manage
  AgentToOwnedRules,       // Agent -> GovernanceRules they created

  // Service-type patterns (inspired by R&O ServiceType queries)
  SpecsByCategory,     // Category -> ResourceSpecs
  ResourcesByLocation, // Location -> EconomicResources
  ResourcesByState,    // ResourceState -> EconomicResources

  // Governance patterns
  RulesByType,          // RuleType -> GovernanceRules
  ResourceToValidation, // EconomicResource -> ValidationRecords

  // Update patterns (following person zome)
  ResourceSpecificationUpdates, // Original -> Updated ResourceSpec
  EconomicResourceUpdates,      // Original -> Updated EconomicResource
  GovernanceRuleUpdates,        // Original -> Updated GovernanceRule
}

#[hdk_extern]
pub fn genesis_self_check(_data: GenesisSelfCheckData) -> ExternResult<ValidateCallbackResult> {
  Ok(ValidateCallbackResult::Valid)
}

pub fn validate_agent_joining(
  _agent_pub_key: AgentPubKey,
  _membrane_proof: &MembraneProof,
) -> ExternResult<ValidateCallbackResult> {
  // For this proof of concept, access is permissionless
  Ok(ValidateCallbackResult::Valid)
}

#[hdk_extern]
pub fn validate(op: Op) -> ExternResult<ValidateCallbackResult> {
  match op.flattened::<EntryTypes, LinkTypes>()? {
    FlatOp::StoreEntry(store_entry) => match store_entry {
      OpEntry::CreateEntry { app_entry, action } => match app_entry {
        EntryTypes::ResourceSpecification(spec) => {
          validate_create_resource_spec(&spec, &action.author)
        }
        EntryTypes::EconomicResource(resource) => {
          validate_create_economic_resource(&resource, &action.author)
        }
        EntryTypes::GovernanceRule(rule) => validate_create_governance_rule(&rule, &action.author),
      },
      OpEntry::UpdateEntry {
        app_entry, action, ..
      } => match app_entry {
        EntryTypes::ResourceSpecification(spec) => {
          validate_update_resource_spec(&spec, &action.author)
        }
        EntryTypes::EconomicResource(resource) => {
          validate_update_economic_resource(&resource, &action.author)
        }
        EntryTypes::GovernanceRule(rule) => validate_update_governance_rule(&rule, &action.author),
      },
      _ => Ok(ValidateCallbackResult::Valid),
    },
    FlatOp::StoreRecord(OpRecord::CreateLink { .. }) => {
      // Validate link creation
      Ok(ValidateCallbackResult::Valid)
    }
    _ => Ok(ValidateCallbackResult::Valid),
  }
}

fn validate_create_resource_spec(
  spec: &ResourceSpecification,
  _author: &AgentPubKey,
) -> ExternResult<ValidateCallbackResult> {
  if spec.name.trim().is_empty() {
    return Ok(ValidateCallbackResult::Invalid(
      "Resource specification name cannot be empty".to_string(),
    ));
  }

  if spec.name.len() > 100 {
    return Ok(ValidateCallbackResult::Invalid(
      "Resource specification name too long".to_string(),
    ));
  }

  if spec.description.trim().is_empty() {
    return Ok(ValidateCallbackResult::Invalid(
      "Resource specification description cannot be empty".to_string(),
    ));
  }

  Ok(ValidateCallbackResult::Valid)
}

fn validate_create_economic_resource(
  resource: &EconomicResource,
  _author: &AgentPubKey,
) -> ExternResult<ValidateCallbackResult> {
  if resource.quantity <= 0.0 {
    return Ok(ValidateCallbackResult::Invalid(
      "Resource quantity must be positive".to_string(),
    ));
  }

  if resource.unit.trim().is_empty() {
    return Ok(ValidateCallbackResult::Invalid(
      "Resource unit cannot be empty".to_string(),
    ));
  }

  Ok(ValidateCallbackResult::Valid)
}

fn validate_create_governance_rule(
  rule: &GovernanceRule,
  _author: &AgentPubKey,
) -> ExternResult<ValidateCallbackResult> {
  if rule.rule_type.trim().is_empty() {
    return Ok(ValidateCallbackResult::Invalid(
      "Governance rule type cannot be empty".to_string(),
    ));
  }

  if rule.rule_data.trim().is_empty() {
    return Ok(ValidateCallbackResult::Invalid(
      "Governance rule data cannot be empty".to_string(),
    ));
  }

  Ok(ValidateCallbackResult::Valid)
}

fn validate_update_resource_spec(
  _spec: &ResourceSpecification,
  _author: &AgentPubKey,
) -> ExternResult<ValidateCallbackResult> {
  // For Phase 1, allow updates
  // Phase 2 will add governance-based update validation
  Ok(ValidateCallbackResult::Valid)
}

fn validate_update_economic_resource(
  _resource: &EconomicResource,
  _author: &AgentPubKey,
) -> ExternResult<ValidateCallbackResult> {
  // For Phase 1, allow updates
  // Phase 2 will add custody transfer validation
  Ok(ValidateCallbackResult::Valid)
}

fn validate_update_governance_rule(
  _rule: &GovernanceRule,
  _author: &AgentPubKey,
) -> ExternResult<ValidateCallbackResult> {
  // For Phase 1, allow updates
  // Phase 2 will add proper governance rule update validation
  Ok(ValidateCallbackResult::Valid)
}
