use crate::person::get_agent_person;
use crate::PersonError;
use hdk::prelude::*;
use nondominium_utils::call_governance_zome;
use zome_person_integrity::*;

// Cross-zome call structure for governance validation
#[derive(Serialize, Deserialize, Debug)]
pub struct ValidateSpecializedRoleInput {
  pub agent: AgentPubKey,
  pub requested_role: String,
  pub credentials: Option<String>,
  pub validation_history: Option<ActionHash>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PersonRoleInput {
  pub agent_pubkey: AgentPubKey,
  pub role_name: String,
  pub description: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ValidationResult {
  pub is_valid: bool,
  pub validated_data: Option<std::collections::HashMap<String, String>>,
  pub validation_context: String,
  pub validated_at: Timestamp,
  pub error_message: Option<String>,
}
#[derive(Debug, Serialize, Deserialize)]
pub struct PromoteAgentInput {
  pub target_agent: AgentPubKey,
  pub target_role: String,
  pub justification: String,
  pub validate_private_data: bool,
  pub grant_hash: Option<ActionHash>,
} // Whether to validate private data requirements

#[derive(Debug, Serialize, Deserialize)]
pub struct RolePromotionRequest {
  pub target_role: String,
  pub justification: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ApprovePromotionInput {
  pub request_hash: ActionHash,
  pub target_agent: AgentPubKey,
  pub target_role: String,
  pub approval_notes: Option<String>,
}

#[hdk_extern]
pub fn assign_person_role(input: PersonRoleInput) -> ExternResult<Record> {
  let agent_info = agent_info()?;

  // Check if this is a specialized role that requires governance validation
  let specialized_roles = ["Transport Agent", "Repair Agent", "Storage Agent"];
  if specialized_roles.contains(&input.role_name.as_str()) {
    // Call governance zome for specialized role validation
    // This implements REQ-GOV-04: Specialized Role Validation
    let _validation_result = call(
      CallTargetCell::Local,
      "zome_gouvernance",
      "validate_specialized_role".into(),
      None,
      &ValidateSpecializedRoleInput {
        agent: input.agent_pubkey.clone(),
        requested_role: input.role_name.clone(),
        credentials: None,        // TODO: Add credentials support
        validation_history: None, // TODO: Link to validation history
      },
    )?;
  }

  let role = PersonRole {
    role_name: input.role_name,
    description: input.description,
    assigned_to: input.agent_pubkey.clone(),
    assigned_by: agent_info.agent_initial_pubkey,
    assigned_at: sys_time()?,
  };

  let role_hash = create_entry(&EntryTypes::PersonRole(role.clone()))?;
  let record = get(role_hash.clone(), GetOptions::default())?.ok_or(
    PersonError::EntryOperationFailed("Failed to retrieve created role".to_string()),
  )?;

  // Link from person to role using Person-centric approach
  let person_hash = match get_agent_person(input.agent_pubkey.clone())? {
    Some(hash) => hash,
    None => {
      return Err(PersonError::PersonNotFound("No person found for agent".to_string()).into())
    }
  };

  create_link(person_hash, role_hash, LinkTypes::PersonToRoles, ())?;

  Ok(record)
}

#[hdk_extern]
pub fn get_latest_person_role_record(
  original_action_hash: ActionHash,
) -> ExternResult<Option<Record>> {
  let links_query = LinkQuery::try_new(original_action_hash.clone(), LinkTypes::RoleUpdates)?;
  let links = get_links(links_query, GetStrategy::default())?;
  let latest_link = links
    .into_iter()
    .max_by(|link_a, link_b| link_a.timestamp.cmp(&link_b.timestamp));
  let latest_role_hash = match latest_link {
    Some(link) => {
      link
        .target
        .clone()
        .into_action_hash()
        .ok_or(PersonError::EntryOperationFailed(
          "Invalid action hash in link".to_string(),
        ))?
    }
    None => original_action_hash.clone(),
  };
  get(latest_role_hash, GetOptions::default())
}

#[hdk_extern]
pub fn get_latest_person_role(original_action_hash: ActionHash) -> ExternResult<PersonRole> {
  let record = get_latest_person_role_record(original_action_hash)?.ok_or(
    PersonError::RoleNotFound("Role record not found".to_string()),
  )?;

  record
    .entry()
    .to_app_option()
    .map_err(|e| PersonError::SerializationError(format!("Failed to deserialize role: {:?}", e)))?
    .ok_or(PersonError::RoleNotFound("Role entry not found".to_string()).into())
}

#[derive(Serialize, Deserialize, Debug)]
pub struct UpdatePersonRoleInput {
  pub original_action_hash: ActionHash,
  pub previous_action_hash: ActionHash,
  pub updated_role: PersonRoleInput,
}

#[hdk_extern]
pub fn update_person_role(input: UpdatePersonRoleInput) -> ExternResult<Record> {
  let original_record = must_get_valid_record(input.original_action_hash.clone())?;

  // Verify the author - only the original assigner can update
  let author = original_record.action().author().clone();
  if author != agent_info()?.agent_initial_pubkey {
    return Err(PersonError::NotAuthor.into());
  }

  let updated_role = PersonRole {
    role_name: input.updated_role.role_name,
    description: input.updated_role.description,
    assigned_to: input.updated_role.agent_pubkey,
    assigned_by: agent_info()?.agent_initial_pubkey,
    assigned_at: sys_time()?,
  };

  let updated_role_hash = update_entry(input.previous_action_hash, &updated_role)?;

  create_link(
    input.original_action_hash,
    updated_role_hash.clone(),
    LinkTypes::RoleUpdates,
    (),
  )?;

  let record = get(updated_role_hash, GetOptions::default())?.ok_or(
    PersonError::EntryOperationFailed("Failed to retrieve updated role".to_string()),
  )?;

  Ok(record)
}

#[derive(Serialize, Deserialize, Debug)]
pub struct GetPersonRolesOutput {
  pub roles: Vec<PersonRole>,
}

#[hdk_extern]
pub fn get_person_roles(agent_pubkey: AgentPubKey) -> ExternResult<GetPersonRolesOutput> {
  let mut roles = Vec::new();

  // Use the new get_agent_person function for cleaner code
  let person_hash = match get_agent_person(agent_pubkey)? {
    Some(hash) => hash,
    None => return Ok(GetPersonRolesOutput { roles }),
  };

  let role_links_query = LinkQuery::try_new(person_hash, LinkTypes::PersonToRoles)?;
  let role_links = get_links(role_links_query, GetStrategy::default())?;

  for role_link in role_links {
    if let Some(action_hash) = role_link.target.into_action_hash() {
      if let Ok(role) = get_latest_person_role(action_hash) {
        roles.push(role);
      }
    }
  }

  Ok(GetPersonRolesOutput { roles })
}

#[hdk_extern]
pub fn get_my_person_roles(_: ()) -> ExternResult<GetPersonRolesOutput> {
  let agent_info = agent_info()?;
  get_person_roles(agent_info.agent_initial_pubkey)
}

/// Check if an agent has a specific role capability
#[hdk_extern]
pub fn has_person_role_capability(input: (AgentPubKey, String)) -> ExternResult<bool> {
  let (agent_pubkey, required_role) = input;

  let roles_output = get_person_roles(agent_pubkey)?;

  for role in roles_output.roles {
    if role.role_name == required_role {
      return Ok(true);
    }
  }

  Ok(false)
}

/// Get agent capability level based on their roles
#[hdk_extern]
pub fn get_person_capability_level(agent_pubkey: AgentPubKey) -> ExternResult<String> {
  let roles_output = get_person_roles(agent_pubkey)?;

  let mut has_governance_role = false;
  let mut has_coordination_role = false;
  let mut has_stewardship_role = false;

  for role in roles_output.roles {
    match role.role_name.as_str() {
      "Primary Accountable Agent" => {
        has_governance_role = true;
      }
      "Accountable Agent" => {
        has_coordination_role = true;
      }
      "Transport Agent" | "Repair Agent" | "Storage Agent" => {
        has_stewardship_role = true;
      }
      "Simple Agent" => {
        // Basic member level - no change to flags
      }
      _ => {}
    }
  }

  if has_governance_role {
    Ok("governance".to_string())
  } else if has_coordination_role {
    Ok("coordination".to_string())
  } else if has_stewardship_role {
    Ok("stewardship".to_string())
  } else {
    Ok("member".to_string())
  }
}

// ============================================================================
// ENHANCED ROLE PROMOTION WITH PRIVATE DATA VALIDATION
// ============================================================================

/// Promote an agent to a new role with private data validation
/// This function integrates with the governance zome to validate agent eligibility
#[hdk_extern]
pub fn promote_agent_with_validation(input: PromoteAgentInput) -> ExternResult<Record> {
  let agent_info = agent_info()?;

  // Check that the caller has sufficient authority to promote agents
  let caller_capability = get_person_capability_level(agent_info.agent_initial_pubkey.clone())?;
  if caller_capability != "governance" && caller_capability != "coordination" {
    return Err(
      PersonError::InsufficientCapability(format!(
        "Need coordination or governance level, have: {}",
        caller_capability
      ))
      .into(),
    );
  }

  // If private data validation is requested, validate with governance zome
  if input.validate_private_data {
    #[derive(Debug, Clone, Serialize, Deserialize)]
    struct ValidateInput {
      target_role: String,
      target_agent: AgentPubKey,
      grant_hash: Option<ActionHash>,
    }

    let validation_result: ValidationResult = call_governance_zome(
      "validate_agent_for_promotion",
      ValidateInput {
        target_role: input.target_role.clone(),
        target_agent: input.target_agent.clone(),
        grant_hash: input.grant_hash,
      },
    )?;

    if !validation_result.is_valid {
      return Err(
        PersonError::InvalidInput(format!(
          "Agent promotion validation failed: {}",
          validation_result
            .error_message
            .unwrap_or("Unknown validation error".to_string())
        ))
        .into(),
      );
    }
  }

  // Create the role assignment
  let role_input = PersonRoleInput {
    agent_pubkey: input.target_agent,
    role_name: input.target_role,
    description: Some(format!(
      "Promoted by {}: {}",
      agent_info.agent_initial_pubkey, input.justification
    )),
  };

  assign_person_role(role_input)
}

/// Request promotion to a higher role
/// This creates a request that can be approved by authorized agents
#[hdk_extern]
pub fn request_role_promotion(input: RolePromotionRequest) -> ExternResult<ActionHash> {
  let agent_info = agent_info()?;
  let now = sys_time()?;

  // Validate that the target role is a valid promotion
  let current_capability = get_person_capability_level(agent_info.agent_initial_pubkey.clone())?;
  let target_capability = match input.target_role.as_str() {
    "Simple Agent" => "member",
    "Accountable Agent" => "coordination",
    "Primary Accountable Agent" => "governance",
    "Transport Agent" | "Repair Agent" | "Storage Agent" => "stewardship",
    _ => {
      return Err(
        PersonError::InvalidInput(format!("Unknown role type: {}", input.target_role)).into(),
      )
    }
  };

  // Check if this is actually a promotion
  let promotion_hierarchy = ["member", "stewardship", "coordination", "governance"];
  let current_level = promotion_hierarchy
    .iter()
    .position(|&x| x == current_capability)
    .unwrap_or(0);
  let target_level = promotion_hierarchy
    .iter()
    .position(|&x| x == target_capability)
    .unwrap_or(0);

  if target_level <= current_level {
    return Err(
      PersonError::InvalidInput(
        "Cannot request promotion to equal or lower capability level".to_string(),
      )
      .into(),
    );
  }

  // Check if agent has required private data before making the request
  let validation_result: ValidationResult = call_governance_zome(
    "validate_agent_for_promotion",
    (
      input.target_role.clone(),
      agent_info.agent_initial_pubkey.clone(),
    ),
  )?;

  if !validation_result.is_valid {
    return Err(
      PersonError::InvalidInput(format!(
        "Cannot request promotion - missing required private data: {}",
        validation_result
          .error_message
          .unwrap_or("Unknown validation error".to_string())
      ))
      .into(),
    );
  }

  // Create a promotion request entry (for now, we'll use a simple data structure)
  // In a full implementation, this would be a new entry type
  let _request_context = format!(
    "promotion_request_{}_{}_{}",
    agent_info.agent_initial_pubkey,
    input.target_role.replace(" ", "_").to_lowercase(),
    now.as_micros()
  );

  // For now, return a placeholder hash
  let placeholder_hash = ActionHash::from_raw_36(vec![0; 36]);
  Ok(placeholder_hash)
}

/// Approve a role promotion request
/// This function can only be called by agents with sufficient authority
#[hdk_extern]
pub fn approve_role_promotion(input: ApprovePromotionInput) -> ExternResult<Record> {
  let agent_info = agent_info()?;

  // Check authorization
  let caller_capability = get_person_capability_level(agent_info.agent_initial_pubkey.clone())?;
  if caller_capability != "governance" && caller_capability != "coordination" {
    return Err(
      PersonError::InsufficientCapability(format!(
        "Insufficient authority to approve promotions: {}",
        caller_capability
      ))
      .into(),
    );
  }

  // Validate the promotion again to ensure data is still valid
  let validation_result: ValidationResult = call_governance_zome(
    "validate_agent_for_promotion",
    (input.target_role.clone(), input.target_agent.clone()),
  )?;

  if !validation_result.is_valid {
    return Err(
      PersonError::InvalidInput(format!(
        "Promotion approval failed - agent no longer meets requirements: {}",
        validation_result
          .error_message
          .unwrap_or("Unknown validation error".to_string())
      ))
      .into(),
    );
  }

  // Create the promotion with validated private data
  let promotion_input = PromoteAgentInput {
    target_agent: input.target_agent,
    target_role: input.target_role,
    justification: input
      .approval_notes
      .unwrap_or("Approved by governance".to_string()),
    validate_private_data: true,
    grant_hash: None,
  };

  promote_agent_with_validation(promotion_input)
}
