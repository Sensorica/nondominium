use crate::ResourceError;
use hdk::prelude::*;
use nondominium_shared::rule_data::RuleData;
use nondominium_shared::types::ResourceScope;
use zome_resource_integrity::*;

/// Nested rule payload when creating a spec — classification is denormalized from the NDO.
#[derive(Debug, Serialize, Deserialize)]
pub struct NestedGovernanceRuleInput {
  pub rule_data: RuleData,
  pub enforced_by: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ResourceSpecificationInput {
  pub name: String,
  pub description: String,
  pub category: String,
  pub image_url: Option<String>,
  pub tags: Vec<String>,
  pub scope: ResourceScope,
  pub ndo_identity_hash: ActionHash,
  pub governance_rules: Vec<NestedGovernanceRuleInput>,
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

  // Validate input
  if input.name.trim().is_empty() {
    return Err(ResourceError::InvalidInput("Name cannot be empty".to_string()).into());
  }

  if input.description.trim().is_empty() {
    return Err(ResourceError::InvalidInput("Description cannot be empty".to_string()).into());
  }

  // Resolve Layer 0 for denormalized fields on nested governance rules + lifecycle gate
  // (integrity also enforces the lifecycle gate).
  let ndo: NondominiumIdentity = get(input.ndo_identity_hash.clone(), GetOptions::default())?
    .and_then(|r| r.entry().to_app_option().ok().flatten())
    .ok_or(ResourceError::EntryOperationFailed(
      "Linked NondominiumIdentity not found".to_string(),
    ))?;

  // First create all governance rules (denormalize immutable Layer 0 fields)
  let mut governance_rule_hashes = Vec::new();

  for rule_input in input.governance_rules {
    let rule = GovernanceRule {
      rule_data: rule_input.rule_data,
      enforced_by: rule_input.enforced_by,
      ndo_identity_hash: input.ndo_identity_hash.clone(),
      property_regime: ndo.property_regime.clone(),
      resource_nature: ndo.resource_nature.clone(),
      rivalry_override: ndo.rivalry_override.clone(),
    };

    let rule_type = rule.rule_data.rule_type();
    let rule_hash = create_entry(&EntryTypes::GovernanceRule(rule))?;
    governance_rule_hashes.push(rule_hash.clone());

    // Create discovery link for this governance rule (same as in create_governance_rule)
    let rules_path = Path::from("governance_rules");
    create_link(
      rules_path.path_entry_hash()?,
      rule_hash.clone(),
      LinkTypes::AllGovernanceRules,
      (),
    )?;

    // Create type-based discovery link
    let type_path = Path::from(format!("rules_by_type_{}", rule_type));
    create_link(
      type_path.path_entry_hash()?,
      rule_hash.clone(),
      LinkTypes::RulesByType,
      LinkTag::new(rule_type.to_string()),
    )?;
  }

  // Resolve the NDO's current state and record which action we observed, so
  // integrity can gate on the live lifecycle stage rather than the
  // creation-time one. Callers never supply this — deriving it here is what
  // keeps honest clients correct by construction.
  let ndo_state_hash = crate::ndo_identity::resolve_latest_ndo_record(
    input.ndo_identity_hash.clone(),
  )?
  .ok_or(ResourceError::EntryOperationFailed(
    "NondominiumIdentity not found for ndo_identity_hash".to_string(),
  ))?
  .action_address()
  .clone();

  // Create the resource specification
  let spec = ResourceSpecification {
    name: input.name,
    description: input.description,
    category: input.category.clone(),
    image_url: input.image_url,
    tags: input.tags.clone(),
    is_active: true, // New specs are active by default
    scope: input.scope.clone(),
    ndo_identity_hash: input.ndo_identity_hash.clone(),
    ndo_state_hash,
  };

  let spec_hash = create_entry(&EntryTypes::ResourceSpecification(spec.clone()))?;

  // Layer 0 → Layer 1 activation link
  create_link(
    input.ndo_identity_hash.clone(),
    spec_hash.clone(),
    LinkTypes::NdoToSpecification,
    (),
  )?;

  // Discovery links (inspired by R&O efficient query patterns)

  // 1. Global discovery anchor — skipped for Project scope (§1.7.2).
  // Network currently behaves as Public at the DHT-anchor level until
  // network-layer federation exists.
  if input.scope != ResourceScope::Project {
    let all_specs_path = Path::from("resource_specifications");
    create_link(
      all_specs_path.path_entry_hash()?,
      spec_hash.clone(),
      LinkTypes::AllResourceSpecifications,
      (),
    )?;
  }

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
  let links_query = LinkQuery::try_new(
    original_action_hash.clone(),
    LinkTypes::ResourceSpecificationUpdates,
  )?;
  let links = get_links(links_query, GetStrategy::default())?;
  let latest_link = links
    .into_iter()
    .max_by(|link_a, link_b| link_a.timestamp.cmp(&link_b.timestamp));
  let latest_spec_hash = match latest_link {
    Some(link) => link
      .target
      .clone()
      .into_action_hash()
      .ok_or(ResourceError::EntryOperationFailed(
        "Invalid action hash in link".to_string(),
      ))?,
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

  let original_spec: ResourceSpecification = original_record
    .entry()
    .to_app_option()
    .map_err(|e| {
      ResourceError::SerializationError(format!(
        "Failed to deserialize original ResourceSpecification: {:?}",
        e
      ))
    })?
    .ok_or(ResourceError::ResourceSpecNotFound(
      "Original ResourceSpecification entry not found".to_string(),
    ))?;

  // Validate input
  if input.updated_specification.name.trim().is_empty() {
    return Err(ResourceError::InvalidInput("Name cannot be empty".to_string()).into());
  }

  // Cannot reparent — integrity also enforces this
  if input.updated_specification.ndo_identity_hash != original_spec.ndo_identity_hash {
    return Err(ResourceError::InvalidInput(
      "ResourceSpecification ndo_identity_hash is immutable".to_string(),
    )
    .into());
  }

  let ndo: NondominiumIdentity = get(
    original_spec.ndo_identity_hash.clone(),
    GetOptions::default(),
  )?
  .and_then(|r| r.entry().to_app_option().ok().flatten())
  .ok_or(ResourceError::EntryOperationFailed(
    "Linked NondominiumIdentity not found".to_string(),
  ))?;

  // Create updated governance rules
  let mut governance_rule_hashes = Vec::new();
  for rule_input in input.updated_specification.governance_rules {
    let rule = GovernanceRule {
      rule_data: rule_input.rule_data,
      enforced_by: rule_input.enforced_by,
      ndo_identity_hash: original_spec.ndo_identity_hash.clone(),
      property_regime: ndo.property_regime.clone(),
      resource_nature: ndo.resource_nature.clone(),
      rivalry_override: ndo.rivalry_override.clone(),
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
    is_active: true,
    scope: input.updated_specification.scope,
    ndo_identity_hash: original_spec.ndo_identity_hash,
    // Carried over, not re-resolved: this records the state under which Layer 1
    // was *activated*, and editing a spec's name does not re-activate it.
    ndo_state_hash: original_spec.ndo_state_hash,
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
  /// Same length and order as `specifications`: the original creation `ActionHash` of each spec (from the anchor link target).
  pub action_hashes: Vec<ActionHash>,
}

#[hdk_extern]
pub fn get_all_resource_specifications(_: ()) -> ExternResult<GetAllResourceSpecificationsOutput> {
  let path = Path::from("resource_specifications");

  let links_query = LinkQuery::try_new(
    path.path_entry_hash()?,
    LinkTypes::AllResourceSpecifications,
  )?;
  let links = get_links(links_query, GetStrategy::default())?;

  let mut specifications = Vec::new();
  let mut action_hashes = Vec::new();

  for link in links {
    if let Some(action_hash) = link.target.into_action_hash() {
      if let Some(record) = get(action_hash.clone(), GetOptions::default())? {
        if let Ok(Some(spec)) = record.entry().to_app_option::<ResourceSpecification>() {
          specifications.push(spec);
          action_hashes.push(action_hash);
        }
      }
    }
  }

  Ok(GetAllResourceSpecificationsOutput {
    specifications,
    action_hashes,
  })
}

/// List Layer 1 specifications activated from a given Layer 0 NDO identity.
#[hdk_extern]
pub fn get_specifications_for_ndo(
  ndo_identity_hash: ActionHash,
) -> ExternResult<GetAllResourceSpecificationsOutput> {
  let links_query = LinkQuery::try_new(ndo_identity_hash, LinkTypes::NdoToSpecification)?;
  let links = get_links(links_query, GetStrategy::default())?;

  let mut specifications = Vec::new();
  let mut action_hashes = Vec::new();

  for link in links {
    if let Some(action_hash) = link.target.into_action_hash() {
      if let Some(record) = get(action_hash.clone(), GetOptions::default())? {
        if let Ok(Some(spec)) = record.entry().to_app_option::<ResourceSpecification>() {
          specifications.push(spec);
          action_hashes.push(action_hash);
        }
      }
    }
  }

  Ok(GetAllResourceSpecificationsOutput {
    specifications,
    action_hashes,
  })
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
  pub specification: ResourceSpecification,
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
  let rule_links_query = LinkQuery::try_new(spec_hash, LinkTypes::SpecificationToGovernanceRule)?;
  let rule_links = get_links(rule_links_query, GetStrategy::default())?;

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
    specification: spec,
    governance_rules,
  })
}

#[hdk_extern]
pub fn get_my_resource_specifications(_: ()) -> ExternResult<Vec<Link>> {
  let agent_info = agent_info()?;

  let links_query = LinkQuery::try_new(
    agent_info.agent_initial_pubkey,
    LinkTypes::AgentToOwnedSpecs,
  )?;
  get_links(links_query, GetStrategy::default())
}

#[hdk_extern]
pub fn get_resource_specifications_by_category(category: String) -> ExternResult<Vec<Record>> {
  let category_path = Path::from(format!("specs_by_category_{}", category));
  let links_query =
    LinkQuery::try_new(category_path.path_entry_hash()?, LinkTypes::SpecsByCategory)?;
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

#[hdk_extern]
pub fn get_resource_specifications_by_tag(tag: String) -> ExternResult<Vec<Record>> {
  let tag_path = Path::from(format!("specs_by_tag_{}", tag));
  let links_query = LinkQuery::try_new(tag_path.path_entry_hash()?, LinkTypes::SpecsByCategory)?;
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
