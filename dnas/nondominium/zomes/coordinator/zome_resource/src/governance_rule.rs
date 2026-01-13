use crate::ResourceError;
use hdk::prelude::*;
use zome_resource_integrity::*;

fn something_to_do() -> Result<String, String> {

  todo!("Not yet implement")

}

#[derive(Debug, Serialize, Deserialize)]
pub struct GovernanceRuleInput {
  pub rule_type: String,
  pub rule_data: String,
  pub enforced_by: Option<String>,
}

#[hdk_extern]
pub fn create_governance_rule(input: GovernanceRuleInput) -> ExternResult<Record> {
  let agent_info = agent_info()?;

  // Validate input
  if input.rule_type.trim().is_empty() {
    return Err(ResourceError::InvalidInput("Rule type cannot be empty".to_string()).into());
  }

  if input.rule_data.trim().is_empty() {
    return Err(ResourceError::InvalidInput("Rule data cannot be empty".to_string()).into());
  }

  let rule = GovernanceRule {
    rule_type: input.rule_type,
    rule_data: input.rule_data,
    enforced_by: input.enforced_by,
  };

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

  // Create type-based discovery link
  let type_path = Path::from(format!("rules_by_type_{}", rule.rule_type));
  create_link(
    type_path.path_entry_hash()?,
    rule_hash.clone(),
    LinkTypes::RulesByType,
    LinkTag::new(rule.rule_type.as_str()),
  )?;

  // Link to creator
  create_link(
    agent_info.agent_initial_pubkey,
    rule_hash,
    LinkTypes::AgentToOwnedRules,
    (),
  )?;

  Ok(record)
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
    Some(link) => {
      link
        .target
        .clone()
        .into_action_hash()
        .ok_or(ResourceError::EntryOperationFailed(
          "Invalid action hash in link".to_string(),
        ))?
    }
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

  // Validate input
  if input.updated_rule.rule_type.trim().is_empty() {
    return Err(ResourceError::InvalidInput("Rule type cannot be empty".to_string()).into());
  }

  if input.updated_rule.rule_data.trim().is_empty() {
    return Err(ResourceError::InvalidInput("Rule data cannot be empty".to_string()).into());
  }

  let updated_rule = GovernanceRule {
    rule_type: input.updated_rule.rule_type,
    rule_data: input.updated_rule.rule_data,
    enforced_by: input.updated_rule.enforced_by,
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
    .map(|link| {
      GetInput::new(
        link
          .target
          .clone()
          .into_any_dht_hash()
          .expect("Failed to convert link target"),
        GetOptions::default(),
      )
    })
    .collect();
  let records = HDK.with(|hdk| hdk.borrow().get(get_input))?;
  let records: Vec<Record> = records.into_iter().flatten().collect();
  Ok(records)
}
