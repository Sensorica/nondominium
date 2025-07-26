use crate::{GovernanceRuleInput, ResourceError};
use hdk::prelude::*;
use zome_resource_integrity::*;

#[derive(Debug, Serialize, Deserialize)]
pub struct ResourceSpecificationInput {
  pub name: String,
  pub description: String,
  pub category: String,
  pub image_url: Option<String>,
  pub tags: Vec<String>,
  pub governance_rules: Vec<GovernanceRuleInput>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateResourceSpecificationOutput {
  pub spec_hash: ActionHash,
  pub spec: ResourceSpecification,
  pub governance_rule_hashes: Vec<ActionHash>,
}

#[hdk_extern]
pub fn create_resource_specification(
  input: ResourceSpecificationInput,
) -> ExternResult<CreateResourceSpecificationOutput> {
  let agent_info = agent_info()?;
  let now = sys_time()?;

  // Validate input
  if input.name.trim().is_empty() {
    return Err(ResourceError::InvalidInput("Name cannot be empty".to_string()).into());
  }

  if input.description.trim().is_empty() {
    return Err(ResourceError::InvalidInput("Description cannot be empty".to_string()).into());
  }

  // TODO: In Phase 2, check that the calling agent is an Accountable Agent

  // First create all governance rules
  let mut governance_rule_hashes = Vec::new();

  for rule_input in input.governance_rules {
    let rule = GovernanceRule {
      rule_type: rule_input.rule_type,
      rule_data: rule_input.rule_data,
      enforced_by: rule_input.enforced_by,
      created_by: agent_info.agent_initial_pubkey.clone(),
      created_at: now,
    };

    let rule_hash = create_entry(&EntryTypes::GovernanceRule(rule))?;
    governance_rule_hashes.push(rule_hash);
  }

  // Create the resource specification
  let spec = ResourceSpecification {
    name: input.name,
    description: input.description,
    category: input.category.clone(),
    image_url: input.image_url,
    tags: input.tags.clone(),
    governance_rules: governance_rule_hashes.clone(),
    created_by: agent_info.agent_initial_pubkey.clone(),
    created_at: now,
    is_active: true, // New specs are active by default
  };

  let spec_hash = create_entry(&EntryTypes::ResourceSpecification(spec.clone()))?;

  // Create discovery links (inspired by R&O efficient query patterns)

  // 1. Global discovery anchor
  let all_specs_path = Path::from("resource_specifications");
  create_link(
    all_specs_path.path_entry_hash()?,
    spec_hash.clone(),
    LinkTypes::AllResourceSpecifications,
    (),
  )?;

  // 2. Category-based discovery (like ServiceType patterns)
  let category_path = Path::from(format!("specs_by_category_{}", input.category));
  create_link(
    category_path.path_entry_hash()?,
    spec_hash.clone(),
    LinkTypes::SpecsByCategory,
    LinkTag::new(input.category.as_str()),
  )?;

  // 3. Agent-owned specs for efficient "my specs" queries
  create_link(
    agent_info.agent_initial_pubkey.clone(),
    spec_hash.clone(),
    LinkTypes::AgentToOwnedSpecs,
    (),
  )?;

  // 4. Tag-based discovery for flexible queries
  for tag in &input.tags {
    let tag_path = Path::from(format!("specs_by_tag_{}", tag));
    create_link(
      tag_path.path_entry_hash()?,
      spec_hash.clone(),
      LinkTypes::SpecsByCategory, // Reuse for tags
      LinkTag::new(tag.as_str()),
    )?;
  }

  // Link governance rules to the specification
  for rule_hash in &governance_rule_hashes {
    create_link(
      spec_hash.clone(),
      rule_hash.clone(),
      LinkTypes::SpecificationToGovernanceRule,
      (),
    )?;
  }

  Ok(CreateResourceSpecificationOutput {
    spec_hash,
    spec,
    governance_rule_hashes,
  })
}

#[hdk_extern]
pub fn get_latest_resource_specification_record(
  original_action_hash: ActionHash,
) -> ExternResult<Option<Record>> {
  let links = get_links(
    GetLinksInputBuilder::try_new(
      original_action_hash.clone(),
      LinkTypes::ResourceSpecificationUpdates,
    )?
    .build(),
  )?;
  let latest_link = links
    .into_iter()
    .max_by(|link_a, link_b| link_a.timestamp.cmp(&link_b.timestamp));
  let latest_spec_hash = match latest_link {
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
  get(latest_spec_hash, GetOptions::default())
}

#[hdk_extern]
pub fn get_latest_resource_specification(
  original_action_hash: ActionHash,
) -> ExternResult<ResourceSpecification> {
  let record = get_latest_resource_specification_record(original_action_hash)?.ok_or(
    ResourceError::ResourceSpecNotFound("Resource specification record not found".to_string()),
  )?;

  record
    .entry()
    .to_app_option()
    .map_err(|e| {
      ResourceError::SerializationError(format!(
        "Failed to deserialize resource specification: {:?}",
        e
      ))
    })?
    .ok_or(
      ResourceError::ResourceSpecNotFound("Resource specification entry not found".to_string())
        .into(),
    )
}

#[derive(Serialize, Deserialize, Debug)]
pub struct UpdateResourceSpecificationInput {
  pub original_action_hash: ActionHash,
  pub previous_action_hash: ActionHash,
  pub updated_specification: ResourceSpecificationInput,
}

#[hdk_extern]
pub fn update_resource_specification(
  input: UpdateResourceSpecificationInput,
) -> ExternResult<Record> {
  let original_record = must_get_valid_record(input.original_action_hash.clone())?;

  // Verify the author
  let author = original_record.action().author().clone();
  if author != agent_info()?.agent_initial_pubkey {
    return Err(ResourceError::NotAuthor.into());
  }

  // Validate input
  if input.updated_specification.name.trim().is_empty() {
    return Err(ResourceError::InvalidInput("Name cannot be empty".to_string()).into());
  }

  let now = sys_time()?;
  let agent_info = agent_info()?;

  // Create updated governance rules
  let mut governance_rule_hashes = Vec::new();
  for rule_input in input.updated_specification.governance_rules {
    let rule = GovernanceRule {
      rule_type: rule_input.rule_type,
      rule_data: rule_input.rule_data,
      enforced_by: rule_input.enforced_by,
      created_by: agent_info.agent_initial_pubkey.clone(),
      created_at: now,
    };

    let rule_hash = create_entry(&EntryTypes::GovernanceRule(rule))?;
    governance_rule_hashes.push(rule_hash);
  }

  let updated_spec = ResourceSpecification {
    name: input.updated_specification.name,
    description: input.updated_specification.description,
    category: input.updated_specification.category,
    image_url: input.updated_specification.image_url,
    tags: input.updated_specification.tags,
    governance_rules: governance_rule_hashes.clone(),
    created_by: agent_info.agent_initial_pubkey.clone(),
    created_at: now,
    is_active: true,
  };

  let updated_spec_hash = update_entry(input.previous_action_hash, &updated_spec)?;

  create_link(
    input.original_action_hash,
    updated_spec_hash.clone(),
    LinkTypes::ResourceSpecificationUpdates,
    (),
  )?;

  // Link new governance rules to the specification
  for rule_hash in &governance_rule_hashes {
    create_link(
      updated_spec_hash.clone(),
      rule_hash.clone(),
      LinkTypes::SpecificationToGovernanceRule,
      (),
    )?;
  }

  let record =
    get(updated_spec_hash, GetOptions::default())?.ok_or(ResourceError::EntryOperationFailed(
      "Failed to retrieve updated resource specification".to_string(),
    ))?;

  Ok(record)
}

#[derive(Serialize, Deserialize, Debug)]
pub struct GetAllResourceSpecificationsOutput {
  pub specifications: Vec<ResourceSpecification>,
}

#[hdk_extern]
pub fn get_all_resource_specifications(_: ()) -> ExternResult<GetAllResourceSpecificationsOutput> {
  let path = Path::from("resource_specifications");
  let links = get_links(
    GetLinksInputBuilder::try_new(
      path.path_entry_hash()?,
      LinkTypes::AllResourceSpecifications,
    )?
    .build(),
  )?;

  let mut specifications = Vec::new();

  for link in links {
    if let Some(action_hash) = link.target.into_action_hash() {
      if let Some(record) = get(action_hash, GetOptions::default())? {
        if let Ok(Some(spec)) = record.entry().to_app_option::<ResourceSpecification>() {
          specifications.push(spec);
        }
      }
    }
  }

  Ok(GetAllResourceSpecificationsOutput { specifications })
}

#[derive(Serialize, Deserialize, Debug)]
pub struct GetResourceSpecificationProfileOutput {
  pub specification: Option<ResourceSpecification>,
}

#[hdk_extern]
pub fn get_resource_specification_profile(
  action_hash: ActionHash,
) -> ExternResult<GetResourceSpecificationProfileOutput> {
  if let Ok(spec) = get_latest_resource_specification(action_hash) {
    return Ok(GetResourceSpecificationProfileOutput {
      specification: Some(spec),
    });
  }

  Ok(GetResourceSpecificationProfileOutput {
    specification: None,
  })
}

#[derive(Serialize, Deserialize, Debug)]
pub struct GetResourceSpecWithRulesOutput {
  pub spec: ResourceSpecification,
  pub governance_rules: Vec<GovernanceRule>,
}

#[hdk_extern]
pub fn get_resource_specification_with_rules(
  spec_hash: ActionHash,
) -> ExternResult<GetResourceSpecWithRulesOutput> {
  // Get the specification
  let spec_record = get(spec_hash.clone(), GetOptions::default())?.ok_or(
    ResourceError::ResourceSpecNotFound("ResourceSpecification not found".to_string()),
  )?;

  let spec = match spec_record.entry().to_app_option() {
    Ok(Some(s)) => s,
    _ => {
      return Err(
        ResourceError::SerializationError("Invalid ResourceSpecification entry".to_string()).into(),
      )
    }
  };

  // Get the governance rules
  let rule_links = get_links(
    GetLinksInputBuilder::try_new(spec_hash, LinkTypes::SpecificationToGovernanceRule)?.build(),
  )?;
  let mut governance_rules = Vec::new();

  for rule_link in rule_links {
    if let Some(action_hash) = rule_link.target.into_action_hash() {
      if let Some(rule_record) = get(action_hash, GetOptions::default())? {
        if let Ok(Some(rule)) = rule_record.entry().to_app_option::<GovernanceRule>() {
          governance_rules.push(rule);
        }
      }
    }
  }

  Ok(GetResourceSpecWithRulesOutput {
    spec,
    governance_rules,
  })
}

#[hdk_extern]
pub fn get_my_resource_specifications(_: ()) -> ExternResult<Vec<Link>> {
  let agent_info = agent_info()?;
  get_links(
    GetLinksInputBuilder::try_new(
      agent_info.agent_initial_pubkey,
      LinkTypes::AgentToOwnedSpecs,
    )?
    .build(),
  )
}

#[hdk_extern]
pub fn get_resource_specifications_by_category(category: String) -> ExternResult<Vec<Record>> {
  let category_path = Path::from(format!("specs_by_category_{}", category));
  let links = get_links(
    GetLinksInputBuilder::try_new(category_path.path_entry_hash()?, LinkTypes::SpecsByCategory)?
      .build(),
  )?;

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

#[hdk_extern]
pub fn get_resource_specifications_by_tag(tag: String) -> ExternResult<Vec<Record>> {
  let tag_path = Path::from(format!("specs_by_tag_{}", tag));
  let links = get_links(
    GetLinksInputBuilder::try_new(tag_path.path_entry_hash()?, LinkTypes::SpecsByCategory)?.build(),
  )?;

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
