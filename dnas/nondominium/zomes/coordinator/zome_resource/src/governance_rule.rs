use crate::ResourceError;
use hdk::prelude::*;
use nondominium_shared::constraints::{
  check_rule_data_permitted, ConstraintViolation, ResourceClassification,
};
use nondominium_shared::rule_data::RuleData;
use nondominium_shared::types::{PropertyRegime, ResourceNature, Rivalry};
use zome_resource_integrity::*;

#[derive(Debug, Serialize, Deserialize)]
pub struct GovernanceRuleInput {
  pub rule_data: RuleData,
  pub enforced_by: Option<String>,
  pub ndo_identity_hash: ActionHash,
  pub property_regime: PropertyRegime,
  pub resource_nature: ResourceNature,
  pub rivalry_override: Option<Rivalry>,
  /// When set, also create `SpecificationToGovernanceRule` so the rule
  /// appears in `get_resource_specification_with_rules`.
  #[serde(default)]
  pub specification_hash: Option<ActionHash>,
}

#[hdk_extern]
pub fn create_governance_rule(input: GovernanceRuleInput) -> ExternResult<Record> {
  let agent_info = agent_info()?;

  let rule = GovernanceRule {
    rule_data: input.rule_data,
    enforced_by: input.enforced_by,
    ndo_identity_hash: input.ndo_identity_hash,
    property_regime: input.property_regime,
    resource_nature: input.resource_nature,
    rivalry_override: input.rivalry_override,
  };

  let rule_type = rule.rule_data.rule_type();
  let rule_hash = create_entry(&EntryTypes::GovernanceRule(rule.clone()))?;

  let record = get(rule_hash.clone(), GetOptions::default())?.ok_or(
    ResourceError::EntryOperationFailed("Failed to retrieve created governance rule".to_string()),
  )?;

  // Create discovery link
  let path = Path::from("governance_rules");
  create_link(
    path.path_entry_hash()?,
    rule_hash.clone(),
    LinkTypes::AllGovernanceRules,
    (),
  )?;

  // Create type-based discovery link (derived from RuleData discriminant)
  let type_path = Path::from(format!("rules_by_type_{}", rule_type));
  create_link(
    type_path.path_entry_hash()?,
    rule_hash.clone(),
    LinkTypes::RulesByType,
    LinkTag::new(rule_type.to_string()),
  )?;

  // Link to creator
  create_link(
    agent_info.agent_initial_pubkey,
    rule_hash.clone(),
    LinkTypes::AgentToOwnedRules,
    (),
  )?;

  if let Some(spec_hash) = input.specification_hash {
    create_link(
      spec_hash,
      rule_hash,
      LinkTypes::SpecificationToGovernanceRule,
      (),
    )?;
  }

  Ok(record)
}

/// Dry-run query: evaluate rule-definition constraints without writing.
/// Takes raw classification facts so the UI can check hypothetical rules before
/// any NDO / GovernanceRule entry exists.
#[derive(Debug, Serialize, Deserialize)]
pub struct CheckRuleDataConstraintsInput {
  pub property_regime: PropertyRegime,
  pub resource_nature: ResourceNature,
  pub rivalry_override: Option<Rivalry>,
  pub rule_data: RuleData,
}

#[hdk_extern]
pub fn check_rule_data_constraints(
  input: CheckRuleDataConstraintsInput,
) -> ExternResult<Vec<ConstraintViolation>> {
  let ctx = ResourceClassification {
    resource_nature: input.resource_nature,
    property_regime: input.property_regime,
    lifecycle_stage: None,
    rivalry_override: input.rivalry_override,
  };
  Ok(check_rule_data_permitted(&ctx, &input.rule_data))
}

#[hdk_extern]
pub fn get_latest_governance_rule_record(
  original_action_hash: ActionHash,
) -> ExternResult<Option<Record>> {
  let links_query = LinkQuery::try_new(
    original_action_hash.clone(),
    LinkTypes::GovernanceRuleUpdates,
  )?;
  let links = get_links(links_query, GetStrategy::default())?;
  let latest_link = links
    .into_iter()
    .max_by(|link_a, link_b| link_a.timestamp.cmp(&link_b.timestamp));
  let latest_rule_hash = match latest_link {
    Some(link) => link
      .target
      .clone()
      .into_action_hash()
      .ok_or(ResourceError::EntryOperationFailed(
        "Invalid action hash in link".to_string(),
      ))?,
    None => original_action_hash.clone(),
  };
  get(latest_rule_hash, GetOptions::default())
}

#[hdk_extern]
pub fn get_latest_governance_rule(
  original_action_hash: ActionHash,
) -> ExternResult<GovernanceRule> {
  let record = get_latest_governance_rule_record(original_action_hash)?.ok_or(
    ResourceError::GovernanceRuleNotFound("Governance rule record not found".to_string()),
  )?;

  record
    .entry()
    .to_app_option()
    .map_err(|e| {
      ResourceError::SerializationError(format!("Failed to deserialize governance rule: {:?}", e))
    })?
    .ok_or(
      ResourceError::GovernanceRuleNotFound("Governance rule entry not found".to_string()).into(),
    )
}

#[derive(Serialize, Deserialize, Debug)]
pub struct UpdateGovernanceRuleInput {
  pub original_action_hash: ActionHash,
  pub previous_action_hash: ActionHash,
  pub updated_rule: GovernanceRuleInput,
}

#[hdk_extern]
pub fn update_governance_rule(input: UpdateGovernanceRuleInput) -> ExternResult<Record> {
  let original_record = must_get_valid_record(input.original_action_hash.clone())?;

  // Verify the author
  let author = original_record.action().author().clone();
  if author != agent_info()?.agent_initial_pubkey {
    return Err(ResourceError::NotAuthor.into());
  }

  let updated_rule = GovernanceRule {
    rule_data: input.updated_rule.rule_data,
    enforced_by: input.updated_rule.enforced_by,
    ndo_identity_hash: input.updated_rule.ndo_identity_hash,
    property_regime: input.updated_rule.property_regime,
    resource_nature: input.updated_rule.resource_nature,
    rivalry_override: input.updated_rule.rivalry_override,
  };

  let updated_rule_hash = update_entry(input.previous_action_hash, &updated_rule)?;

  create_link(
    input.original_action_hash,
    updated_rule_hash.clone(),
    LinkTypes::GovernanceRuleUpdates,
    (),
  )?;

  let record = get(updated_rule_hash, GetOptions::default())?.ok_or(
    ResourceError::EntryOperationFailed("Failed to retrieve updated governance rule".to_string()),
  )?;

  Ok(record)
}

#[derive(Serialize, Deserialize, Debug)]
pub struct GetAllGovernanceRulesOutput {
  pub rules: Vec<GovernanceRule>,
}

#[hdk_extern]
pub fn get_all_governance_rules(_: ()) -> ExternResult<GetAllGovernanceRulesOutput> {
  let path = Path::from("governance_rules");

  let links_query = LinkQuery::try_new(path.path_entry_hash()?, LinkTypes::AllGovernanceRules)?;
  let links = get_links(links_query, GetStrategy::default())?;

  let mut rules = Vec::new();

  for link in links {
    if let Some(action_hash) = link.target.into_action_hash() {
      if let Some(record) = get(action_hash, GetOptions::default())? {
        if let Ok(Some(rule)) = record.entry().to_app_option::<GovernanceRule>() {
          rules.push(rule);
        }
      }
    }
  }

  Ok(GetAllGovernanceRulesOutput { rules })
}

#[derive(Serialize, Deserialize, Debug)]
pub struct GovernanceRuleProfileOutput {
  pub rule: Option<GovernanceRule>,
}

#[hdk_extern]
pub fn get_governance_rule_profile(
  action_hash: ActionHash,
) -> ExternResult<GovernanceRuleProfileOutput> {
  if let Ok(rule) = get_latest_governance_rule(action_hash) {
    return Ok(GovernanceRuleProfileOutput { rule: Some(rule) });
  }

  Ok(GovernanceRuleProfileOutput { rule: None })
}

#[hdk_extern]
pub fn get_my_governance_rules(_: ()) -> ExternResult<Vec<Link>> {
  let agent_info = agent_info()?;
  let links_query = LinkQuery::try_new(
    agent_info.agent_initial_pubkey,
    LinkTypes::AgentToOwnedRules,
  )?;

  get_links(links_query, GetStrategy::default())
}

#[hdk_extern]
pub fn get_governance_rules_by_type(rule_type: String) -> ExternResult<Vec<Record>> {
  let type_path = Path::from(format!("rules_by_type_{}", rule_type));

  let links_query = LinkQuery::try_new(type_path.path_entry_hash()?, LinkTypes::RulesByType)?;

  let links = get_links(links_query, GetStrategy::default())?;

  let get_input: Vec<GetInput> = links
    .into_iter()
    .filter_map(|link| {
      link
        .target
        .clone()
        .into_any_dht_hash()
        .map(|hash| GetInput::new(hash, GetOptions::default()))
    })
    .collect();
  let records = HDK.with(|hdk| hdk.borrow().get(get_input))?;
  let records: Vec<Record> = records.into_iter().flatten().collect();
  Ok(records)
}
