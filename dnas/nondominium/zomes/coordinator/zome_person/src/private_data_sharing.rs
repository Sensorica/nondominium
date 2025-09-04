use crate::PersonError;
use hdk::prelude::*;
use zome_person_integrity::*;
use nondominium_utils::validation;
use std::collections::HashMap;

// ============================================================================
// INPUT STRUCTURES
// ============================================================================

#[derive(Debug, Serialize, Deserialize)]
pub struct RequestResponse {
  pub granted: bool,
  pub expires_at: Option<Timestamp>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RespondToDataAccessInput {
  pub request_hash: ActionHash,
  pub response: RequestResponse,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RequestPrivateDataAccessInput {
  pub requested_from: AgentPubKey,
  pub fields_requested: Vec<String>,
  pub context: String,
  pub resource_hash: Option<ActionHash>,
  pub justification: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GetGrantedPrivateDataInput {
  pub target_agent: AgentPubKey,
  pub requested_fields: Vec<String>,
  pub context: String,
}


#[derive(Debug, Serialize, Deserialize)]
pub struct ValidationDataRequest {
  pub target_agent: AgentPubKey,
  pub validation_context: String,
  pub required_fields: Vec<String>,
  pub governance_requester: AgentPubKey,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ValidationResult {
  pub is_valid: bool,
  pub validated_data: Option<HashMap<String, String>>,
  pub validation_context: String,
  pub validated_at: Timestamp,
  pub error_message: Option<String>,
}

// ============================================================================
// PRIVATE DATA ACCESS REQUEST AND GRANT SYSTEM
// ============================================================================

/// Request access to specific fields of another agent's private data
#[hdk_extern]
pub fn request_private_data_access(input: RequestPrivateDataAccessInput) -> ExternResult<Record> {
  let agent_info = agent_info()?;
  let now = sys_time()?;

  // Create the request with current timestamp and pending status
  let request = DataAccessRequest {
    requested_from: input.requested_from,
    requested_by: agent_info.agent_initial_pubkey.clone(),
    fields_requested: input.fields_requested,
    context: input.context,
    resource_hash: input.resource_hash,
    justification: input.justification,
    status: RequestStatus::Pending,
    created_at: now,
  };

  let request_hash = create_entry(&EntryTypes::DataAccessRequest(request.clone()))?;
  let record = get(request_hash.clone(), GetOptions::default())?.ok_or(
    PersonError::EntryOperationFailed("Failed to retrieve created request".to_string()),
  )?;

  // Create link from requesting agent to their outgoing requests
  create_link(
    agent_info.agent_initial_pubkey,
    request_hash.clone(),
    LinkTypes::AgentToDataRequests,
    LinkTag::new("outgoing"),
  )?;

  // Create link to target agent for their incoming requests
  create_link(
    request.requested_from,
    request_hash,
    LinkTypes::AgentToIncomingRequests,
    LinkTag::new("incoming"),
  )?;

  Ok(record)
}

/// Grant or deny access to private data
#[hdk_extern]
pub fn respond_to_data_access_request(input: RespondToDataAccessInput) -> ExternResult<Record> {
  let agent_info = agent_info()?;
  let now = sys_time()?;

  // Get and validate the original request
  let request_record = get(input.request_hash.clone(), GetOptions::default())?.ok_or(
    PersonError::EntryOperationFailed("Data access request not found".to_string()),
  )?;

  let mut request: DataAccessRequest = request_record
    .entry()
    .to_app_option()
    .map_err(|e| PersonError::SerializationError(format!("Failed to deserialize request: {:?}", e)))?
    .ok_or(PersonError::EntryOperationFailed("Invalid request entry".to_string()))?;

  // Verify the agent is the target of this request
  if request.requested_from != agent_info.agent_initial_pubkey {
    return Err(PersonError::NotAuthor.into());
  }

  // Update request status
  request.status = if input.response.granted {
    RequestStatus::Approved
  } else {
    RequestStatus::Denied
  };

  // Update the request entry
  let updated_hash = update_entry(input.request_hash, &request)?;
  let updated_record = get(updated_hash, GetOptions::default())?.ok_or(
    PersonError::EntryOperationFailed("Failed to retrieve updated request".to_string()),
  )?;

  // If granted, create the data access grant and shared data
  if input.response.granted {
    // First, get the agent's own private data
    let my_private_data = crate::get_my_private_person_data(())?
      .ok_or(PersonError::PrivateDataNotFound)?;

    // Create filtered data containing only the requested fields
    let shared_data = SharedPrivateData {
      shared_with: request.requested_by.clone(),
      shared_by: agent_info.agent_initial_pubkey.clone(),
      fields_shared: request.fields_requested.clone(),
      context: request.context.clone(),
      email: if request.fields_requested.contains(&"email".to_string()) {
        Some(my_private_data.email)
      } else {
        None
      },
      phone: if request.fields_requested.contains(&"phone".to_string()) {
        my_private_data.phone
      } else {
        None
      },
      address: if request.fields_requested.contains(&"address".to_string()) {
        my_private_data.address
      } else {
        None
      },
      emergency_contact: if request.fields_requested.contains(&"emergency_contact".to_string()) {
        my_private_data.emergency_contact
      } else {
        None
      },
      time_zone: if request.fields_requested.contains(&"time_zone".to_string()) {
        my_private_data.time_zone
      } else {
        None
      },
      location: if request.fields_requested.contains(&"location".to_string()) {
        my_private_data.location
      } else {
        None
      },
      expires_at: input.response.expires_at.unwrap_or_else(|| {
        // Default to 7 days
        let duration_micros = 7 * 24 * 60 * 60 * 1_000_000i64; // 7 days in microseconds
        Timestamp::from_micros(now.as_micros() + duration_micros)
      }),
      created_at: now,
    };

    // Create the shared data entry
    let shared_data_hash = create_entry(&EntryTypes::SharedPrivateData(shared_data.clone()))?;

    let grant = DataAccessGrant {
      granted_to: request.requested_by,
      granted_by: agent_info.agent_initial_pubkey.clone(),
      fields_granted: request.fields_requested,
      context: request.context,
      resource_hash: request.resource_hash,
      shared_data_hash: Some(shared_data_hash.clone()),
      expires_at: shared_data.expires_at,
      created_at: now,
    };

    let grant_hash = create_entry(&EntryTypes::DataAccessGrant(grant.clone()))?;

    // Create links for grant management
    create_link(
      agent_info.agent_initial_pubkey.clone(),
      grant_hash.clone(),
      LinkTypes::AgentToDataGrants,
      (),
    )?;

    create_link(
      grant.granted_to,
      grant_hash.clone(),
      LinkTypes::AgentToReceivedGrants,
      (),
    )?;

    // Create link from grant to shared data
    create_link(
      grant_hash,
      shared_data_hash,
      LinkTypes::GrantToSharedData,
      (),
    )?;
  }

  Ok(updated_record)
}

/// Get private data from an agent (with access control) using shared data
#[hdk_extern]
pub fn get_granted_private_data(input: GetGrantedPrivateDataInput) -> ExternResult<PrivatePersonData> {
  let agent_info = agent_info()?;
  let now = sys_time()?;

  // Find active grant that covers the requested fields
  // Look for grants received by the current agent
  let grant_links = get_links(
    GetLinksInputBuilder::try_new(agent_info.agent_initial_pubkey.clone(), LinkTypes::AgentToReceivedGrants)?.build(),
  )?;

  for link in grant_links {
    if let Some(action_hash) = link.target.into_action_hash() {
      if let Some(record) = get(action_hash, GetOptions::default())? {
        if let Ok(Some(grant)) = record.entry().to_app_option::<DataAccessGrant>() {
          // Check if this grant is from the target agent and still valid
          if grant.granted_by == input.target_agent
            && grant.granted_to == agent_info.agent_initial_pubkey
            && grant.context == input.context
            && grant.expires_at > now
            && input.requested_fields.iter().all(|field| grant.fields_granted.contains(field))
          {
            // Get the shared data from the grant
            if let Some(shared_data_hash) = grant.shared_data_hash {
              if let Some(shared_data_record) = get(shared_data_hash, GetOptions::default())? {
                if let Ok(Some(shared_data)) = shared_data_record.entry().to_app_option::<SharedPrivateData>() {
                  // Convert SharedPrivateData to PrivatePersonData format for compatibility
                  return Ok(PrivatePersonData {
                    legal_name: format!("[Shared by {}]", grant.granted_by.to_string()),
                    email: shared_data.email.unwrap_or_default(),
                    phone: shared_data.phone,
                    address: shared_data.address,
                    emergency_contact: shared_data.emergency_contact,
                    time_zone: shared_data.time_zone,
                    location: shared_data.location,
                  });
                }
              }
            }
          }
        }
      }
    }
  }

  Err(PersonError::PrivateDataNotFound.into())
}

/// Helper function to get an agent's private data
fn get_private_data_for_agent(agent_pubkey: AgentPubKey) -> ExternResult<PrivatePersonData> {
  warn!("🔍 get_private_data_for_agent called for agent: {:?}", agent_pubkey);
  
  // Get the person entry first
  let person_links = get_links(
    GetLinksInputBuilder::try_new(agent_pubkey.clone(), LinkTypes::AgentToPerson)?.build(),
  )?;
  
  warn!("🔗 Found {} AgentToPerson links for agent", person_links.len());

  if let Some(person_link) = person_links.first() {
    warn!("📍 Following person link to: {:?}", person_link.target);
    
    // Get private data links from person
    let private_data_links = get_links(
      GetLinksInputBuilder::try_new(person_link.target.clone(), LinkTypes::PersonToPrivateData)?.build(),
    )?;
    
    warn!("🔗 Found {} PersonToPrivateData links", private_data_links.len());

    if let Some(private_data_link) = private_data_links.first() {
      warn!("📍 Following private data link to: {:?}", private_data_link.target);
      
      if let Some(action_hash) = private_data_link.target.clone().into_action_hash() {
        warn!("🎯 Getting record for action hash: {:?}", action_hash);
        
        if let Some(record) = get(action_hash, GetOptions::default())? {
          warn!("📜 Record found, attempting to deserialize as PrivatePersonData");
          
          if let Ok(Some(private_data)) = record.entry().to_app_option::<PrivatePersonData>() {
            warn!("✅ Successfully retrieved private data");
            return Ok(private_data);
          } else {
            warn!("❌ Failed to deserialize record as PrivatePersonData");
          }
        } else {
          warn!("❌ No record found for action hash");
        }
      } else {
        warn!("❌ Link target is not an action hash");
      }
    } else {
      warn!("❌ No PersonToPrivateData links found");
    }
  } else {
    warn!("❌ No AgentToPerson links found for agent");
  }

  warn!("💥 Returning PrivateDataNotFound error");
  Err(PersonError::PrivateDataNotFound.into())
}

// ============================================================================
// ACCESS CONTROL VALIDATION
// ============================================================================

/// Validate that an agent has permission to access specific fields
pub fn validate_field_access(
  requesting_agent: &AgentPubKey,
  target_agent: &AgentPubKey,
  fields: &[String],
  context: &str,
) -> ExternResult<bool> {
  let now = sys_time()?;
  
  let grant_links = get_links(
    GetLinksInputBuilder::try_new(target_agent.clone(), LinkTypes::AgentToDataGrants)?.build(),
  )?;

  for link in grant_links {
    if let Some(action_hash) = link.target.into_action_hash() {
      if let Some(record) = get(action_hash, GetOptions::default())? {
        if let Ok(Some(grant)) = record.entry().to_app_option::<DataAccessGrant>() {
          if grant.granted_to == *requesting_agent
            && grant.context == context
            && grant.expires_at > now
            && fields.iter().all(|field| grant.fields_granted.contains(field))
          {
            return Ok(true);
          }
        }
      }
    }
  }
  
  Ok(false)
}

// ============================================================================
// GOVERNANCE INTEGRATION FUNCTIONS
// ============================================================================

/// Validate agent private data for governance workflows
/// This function is called by the governance zome to validate agent data
/// for processes like agent promotion, resource transfers, etc.
#[hdk_extern]
pub fn validate_agent_private_data(input: ValidationDataRequest) -> ExternResult<ValidationResult> {
  let now = sys_time()?;
  
  // Verify that the caller is the governance zome (indirectly through context validation)
  if input.validation_context.trim().is_empty() {
    return Ok(ValidationResult {
      is_valid: false,
      validated_data: None,
      validation_context: input.validation_context,
      validated_at: now,
      error_message: Some("Invalid validation context".to_string()),
    });
  }

  // Validate that required fields are allowed for sharing
  let allowed_fields = ["email", "phone", "location", "time_zone", "emergency_contact"];
  for field in &input.required_fields {
    if !allowed_fields.contains(&field.as_str()) {
      return Ok(ValidationResult {
        is_valid: false,
        validated_data: None,
        validation_context: input.validation_context,
        validated_at: now,
        error_message: Some(format!("Field '{}' is not allowed for governance validation", field)),
      });
    }
  }

  // Check if there's an active grant from the target agent to governance
  let governance_grants = get_active_governance_grants(&input.target_agent, &input.governance_requester)?;
  
  if let Some(grant) = governance_grants.first() {
    // Check if all required fields are covered by the grant
    let mut validated_data = HashMap::new();
    let mut missing_fields = Vec::new();
    
    if let Ok(private_data) = get_private_data_for_agent(input.target_agent.clone()) {
      for field in &input.required_fields {
        if grant.fields_granted.contains(field) {
          match field.as_str() {
            "email" => { validated_data.insert("email".to_string(), private_data.email.clone()); }
            "phone" => {
              if let Some(phone) = &private_data.phone {
                validated_data.insert("phone".to_string(), phone.clone());
              } else {
                missing_fields.push(field.clone());
              }
            }
            "location" => {
              if let Some(location) = &private_data.location {
                validated_data.insert("location".to_string(), location.clone());
              } else {
                missing_fields.push(field.clone());
              }
            }
            "time_zone" => {
              if let Some(time_zone) = &private_data.time_zone {
                validated_data.insert("time_zone".to_string(), time_zone.clone());
              } else {
                missing_fields.push(field.clone());
              }
            }
            "emergency_contact" => {
              if let Some(emergency_contact) = &private_data.emergency_contact {
                validated_data.insert("emergency_contact".to_string(), emergency_contact.clone());
              } else {
                missing_fields.push(field.clone());
              }
            }
            _ => missing_fields.push(field.clone()),
          }
        } else {
          missing_fields.push(field.clone());
        }
      }
      
      if missing_fields.is_empty() {
        return Ok(ValidationResult {
          is_valid: true,
          validated_data: Some(validated_data),
          validation_context: input.validation_context,
          validated_at: now,
          error_message: None,
        });
      } else {
        return Ok(ValidationResult {
          is_valid: false,
          validated_data: None,
          validation_context: input.validation_context,
          validated_at: now,
          error_message: Some(format!("Missing required fields: {}", missing_fields.join(", "))),
        });
      }
    }
  }
  
  // No valid grant found
  Ok(ValidationResult {
    is_valid: false,
    validated_data: None,
    validation_context: input.validation_context,
    validated_at: now,
    error_message: Some("No active governance grant found for the requested agent".to_string()),
  })
}

/// Get active governance grants for a specific agent
/// This checks for grants with "governance" context that are still valid
fn get_active_governance_grants(
  granted_by: &AgentPubKey,
  governance_requester: &AgentPubKey,
) -> ExternResult<Vec<DataAccessGrant>> {
  let now = sys_time()?;
  let grant_links = get_links(
    GetLinksInputBuilder::try_new(granted_by.clone(), LinkTypes::AgentToDataGrants)?.build(),
  )?;

  let mut active_grants = Vec::new();
  for link in grant_links {
    if let Some(action_hash) = link.target.into_action_hash() {
      if let Some(record) = get(action_hash, GetOptions::default())? {
        if let Ok(Some(grant)) = record.entry().to_app_option::<DataAccessGrant>() {
          // Check if this grant is for governance and still valid
          if grant.granted_to == *governance_requester 
            && grant.context.contains("governance")
            && grant.expires_at > now {
            active_grants.push(grant);
          }
        }
      }
    }
  }

  Ok(active_grants)
}

/// Auto-grant private data access for governance validation workflows
/// This function creates automatic grants when agents are promoted or need validation
#[hdk_extern]
pub fn auto_grant_governance_access(target_role: String) -> ExternResult<Option<Record>> {
  let agent_info = agent_info()?;
  let now = sys_time()?;
  
  // Define required fields based on target role
  let required_fields = match target_role.as_str() {
    "Simple Agent" => vec!["email".to_string()],
    "Accountable Agent" => vec!["email".to_string(), "phone".to_string()],
    "Primary Accountable Agent" => vec!["email".to_string(), "phone".to_string(), "location".to_string()],
    "Transport Agent" | "Repair Agent" | "Storage Agent" => {
      vec!["email".to_string(), "phone".to_string(), "location".to_string(), "time_zone".to_string()]
    }
    _ => return Err(PersonError::InvalidInput(format!("Unknown role type: {}", target_role)).into()),
  };
  
  // Create governance context for automatic grant
  let context = format!("governance_auto_grant_role_{}", target_role.replace(" ", "_").to_lowercase());
  let duration_days = 30; // Extended duration for governance processes
  let duration_micros = (duration_days as i64) * 24 * 60 * 60 * 1_000_000;
  let expires_at = Timestamp::from_micros(now.as_micros() + duration_micros);
  
  // For now, we'll create a grant to the governance system
  // In a real implementation, this would be to a specific governance agent
  let governance_pubkey = agent_info.agent_initial_pubkey.clone(); // TODO: Replace with actual governance agent
  
  let grant = DataAccessGrant {
    granted_to: governance_pubkey,
    granted_by: agent_info.agent_initial_pubkey.clone(),
    fields_granted: required_fields,
    context,
    resource_hash: None,
    shared_data_hash: None, // No shared data for governance grants
    expires_at,
    created_at: now,
  };

  let grant_hash = create_entry(&EntryTypes::DataAccessGrant(grant.clone()))?;
  let record = get(grant_hash.clone(), GetOptions::default())?.ok_or(
    PersonError::EntryOperationFailed("Failed to retrieve created auto-grant".to_string()),
  )?;

  // Create links for grant management
  create_link(
    agent_info.agent_initial_pubkey.clone(),
    grant_hash.clone(),
    LinkTypes::AgentToDataGrants,
    (),
  )?;

  Ok(Some(record))
}

/// Revoke a data access grant
#[hdk_extern]
pub fn revoke_data_access_grant(grant_hash: ActionHash) -> ExternResult<()> {
  let agent_info = agent_info()?;

  // Get the grant to verify ownership
  let grant_record = get(grant_hash.clone(), GetOptions::default())?.ok_or(
    PersonError::EntryOperationFailed("Data access grant not found".to_string()),
  )?;

  let grant: DataAccessGrant = grant_record
    .entry()
    .to_app_option()
    .map_err(|e| PersonError::SerializationError(format!("Failed to deserialize grant: {:?}", e)))?
    .ok_or(PersonError::EntryOperationFailed("Invalid grant entry".to_string()))?;

  // Verify the agent is the one who granted access
  if grant.granted_by != agent_info.agent_initial_pubkey {
    return Err(PersonError::NotAuthor.into());
  }

  // Delete the grant entry (this will effectively revoke access)
  delete_entry(grant_hash)?;

  Ok(())
}

/// Get pending data access requests for the calling agent
#[hdk_extern]
pub fn get_pending_data_requests(_: Option<()>) -> ExternResult<Vec<DataAccessRequest>> {
  let agent_info = agent_info()?;
  let request_links = get_links(
    GetLinksInputBuilder::try_new(agent_info.agent_initial_pubkey, LinkTypes::AgentToIncomingRequests)?.build(),
  )?;

  let mut requests = Vec::new();
  for link in request_links {
    if let Some(action_hash) = link.target.into_action_hash() {
      if let Some(record) = get(action_hash, GetOptions::default())? {
        if let Ok(Some(request)) = record.entry().to_app_option::<DataAccessRequest>() {
          if request.status == RequestStatus::Pending {
            requests.push(request);
          }
        }
      }
    }
  }

  Ok(requests)
}

/// Get all data access grants given by the calling agent
#[hdk_extern]
pub fn get_my_data_grants(_: Option<()>) -> ExternResult<Vec<DataAccessGrant>> {
  let agent_info = agent_info()?;
  let grant_links = get_links(
    GetLinksInputBuilder::try_new(agent_info.agent_initial_pubkey, LinkTypes::AgentToDataGrants)?.build(),
  )?;

  let mut grants = Vec::new();
  for link in grant_links {
    if let Some(action_hash) = link.target.into_action_hash() {
      if let Some(record) = get(action_hash, GetOptions::default())? {
        if let Ok(Some(grant)) = record.entry().to_app_option::<DataAccessGrant>() {
          grants.push(grant);
        }
      }
    }
  }

  Ok(grants)
}

/// Get all data access grants received by the calling agent
#[hdk_extern]
pub fn get_received_data_grants(_: Option<()>) -> ExternResult<Vec<DataAccessGrant>> {
  let agent_info = agent_info()?;
  let grant_links = get_links(
    GetLinksInputBuilder::try_new(agent_info.agent_initial_pubkey, LinkTypes::AgentToReceivedGrants)?.build(),
  )?;

  let mut grants = Vec::new();
  for link in grant_links {
    if let Some(action_hash) = link.target.into_action_hash() {
      if let Some(record) = get(action_hash, GetOptions::default())? {
        if let Ok(Some(grant)) = record.entry().to_app_option::<DataAccessGrant>() {
          grants.push(grant);
        }
      }
    }
  }

  Ok(grants)
}

/// Check if an agent has access to specific fields
pub fn has_field_access(
  requesting_agent: &AgentPubKey,
  target_agent: &AgentPubKey,
  fields: &[String],
  context: &str,
) -> ExternResult<bool> {
  validate_field_access(requesting_agent, target_agent, fields, context)
}

/// Helper function to get private data if accessible
fn get_accessible_private_data(
  target_agent: AgentPubKey,
  requesting_agent: AgentPubKey,
  context: String,
) -> ExternResult<Option<PrivatePersonData>> {
  // Get person links for target agent
  let person_links = get_links(
    GetLinksInputBuilder::try_new(target_agent.clone(), LinkTypes::AgentToPerson)?.build(),
  )?;

  if let Some(person_link) = person_links.first() {
    // Check if we have any active grants
    let grant_links = get_links(
      GetLinksInputBuilder::try_new(target_agent, LinkTypes::AgentToDataGrants)?.build(),
    )?;

    let now = sys_time()?;
    for link in grant_links {
      if let Some(action_hash) = link.target.into_action_hash() {
        if let Some(record) = get(action_hash, GetOptions::default())? {
          if let Ok(Some(grant)) = record.entry().to_app_option::<DataAccessGrant>() {
            if grant.granted_to == requesting_agent
              && grant.context == context
              && grant.expires_at > now
            {
              // We have an active grant, get private data
              let private_data_links = get_links(
                GetLinksInputBuilder::try_new(person_link.target.clone(), LinkTypes::PersonToPrivateData)?.build(),
              )?;

              if let Some(private_data_link) = private_data_links.first() {
                if let Some(action_hash) = private_data_link.target.clone().into_action_hash() {
                  if let Some(record) = get(action_hash, GetOptions::default())? {
                    if let Ok(Some(private_data)) = record.entry().to_app_option::<PrivatePersonData>() {
                      return Ok(Some(private_data));
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }

  Ok(None)
}