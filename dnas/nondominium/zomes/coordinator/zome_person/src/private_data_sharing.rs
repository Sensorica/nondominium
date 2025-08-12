use crate::PersonError;
use hdk::prelude::*;
use zome_person_integrity::*;

#[derive(Debug, Serialize, Deserialize)]
pub struct DataAccessRequestInput {
  pub requested_from: AgentPubKey,
  pub fields_requested: Vec<String>,
  pub context: String,
  pub resource_hash: Option<ActionHash>,
  pub justification: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DataAccessGrantInput {
  pub granted_to: AgentPubKey,
  pub fields_granted: Vec<String>,
  pub context: String,
  pub resource_hash: Option<ActionHash>,
  pub duration_days: Option<u32>, // Default to 7 days if None
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RespondToDataRequestInput {
  pub request_hash: ActionHash,
  pub approve: bool,
  pub duration_days: Option<u32>, // If approving, how long to grant access
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SharedPrivateData {
  pub fields: std::collections::HashMap<String, String>,
  pub granted_by: AgentPubKey,
  pub context: String,
  pub expires_at: Timestamp,
}

/// Request access to another agent's private data
#[hdk_extern]
pub fn request_private_data_access(input: DataAccessRequestInput) -> ExternResult<Record> {
  let agent_info = agent_info()?;
  let now = sys_time()?;

  // Validate that requester is not requesting their own data
  if input.requested_from == agent_info.agent_initial_pubkey {
    return Err(PersonError::InvalidInput("Cannot request access to your own data".to_string()).into());
  }

  // Validate fields are allowed
  let allowed_fields = ["email", "phone", "location", "time_zone", "emergency_contact"];
  for field in &input.fields_requested {
    if !allowed_fields.contains(&field.as_str()) {
      return Err(PersonError::InvalidInput(format!(
        "Field '{}' is not allowed to be requested",
        field
      )).into());
    }
  }

  let request = DataAccessRequest {
    requested_from: input.requested_from.clone(),
    requested_by: agent_info.agent_initial_pubkey.clone(),
    fields_requested: input.fields_requested,
    context: input.context,
    resource_hash: input.resource_hash.clone(),
    justification: input.justification,
    status: RequestStatus::Pending,
    created_at: now,
  };

  let request_hash = create_entry(&EntryTypes::DataAccessRequest(request.clone()))?;
  let record = get(request_hash.clone(), GetOptions::default())?.ok_or(
    PersonError::EntryOperationFailed("Failed to retrieve created request".to_string()),
  )?;

  // Create link from requester to their outgoing requests
  create_link(
    agent_info.agent_initial_pubkey.clone(),
    request_hash.clone(),
    LinkTypes::AgentToDataRequests,
    (),
  )?;

  // Create link from requested agent to their incoming requests
  create_link(
    input.requested_from,
    request_hash.clone(),
    LinkTypes::AgentToIncomingRequests,
    (),
  )?;

  // If linked to a resource, create resource link
  if let Some(resource_hash) = input.resource_hash {
    create_link(
      resource_hash,
      request_hash,
      LinkTypes::ResourceToDataGrants, // Reuse for requests too
      (),
    )?;
  }

  Ok(record)
}

/// Respond to a data access request (approve or deny)
#[hdk_extern]
pub fn respond_to_data_request(input: RespondToDataRequestInput) -> ExternResult<Option<Record>> {
  let agent_info = agent_info()?;
  let now = sys_time()?;

  // Get the original request
  let request_record = get(input.request_hash.clone(), GetOptions::default())?.ok_or(
    PersonError::EntryOperationFailed("Data access request not found".to_string()),
  )?;

  let mut request: DataAccessRequest = request_record
    .entry()
    .to_app_option()
    .map_err(|e| PersonError::SerializationError(format!("Failed to deserialize request: {:?}", e)))?
    .ok_or(PersonError::EntryOperationFailed("Invalid request entry".to_string()))?;

  // Verify the agent is the one being requested from
  if request.requested_from != agent_info.agent_initial_pubkey {
    return Err(PersonError::NotAuthor.into());
  }

  // Verify request is still pending
  if request.status != RequestStatus::Pending {
    return Err(PersonError::InvalidInput("Request has already been responded to".to_string()).into());
  }

  if input.approve {
    // Update request status to approved
    request.status = RequestStatus::Approved;
    let _updated_request_hash = update_entry(input.request_hash.clone(), &request)?;

    // Create data access grant
    let duration_days = input.duration_days.unwrap_or(7);
    let duration_micros = (duration_days as i64) * 24 * 60 * 60 * 1_000_000; // Convert days to microseconds
    let expires_at = Timestamp::from_micros(now.as_micros() + duration_micros);

    let grant = DataAccessGrant {
      granted_to: request.requested_by.clone(),
      granted_by: agent_info.agent_initial_pubkey.clone(),
      fields_granted: request.fields_requested.clone(),
      context: request.context.clone(),
      resource_hash: request.resource_hash.clone(),
      expires_at,
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

    // Link to resource if applicable
    if let Some(resource_hash) = request.resource_hash.clone() {
      create_link(
        resource_hash,
        grant_hash.clone(),
        LinkTypes::ResourceToDataGrants,
        (),
      )?;
    }

    // Return the grant record
    let grant_record = get(grant_hash, GetOptions::default())?.ok_or(
      PersonError::EntryOperationFailed("Failed to retrieve created grant".to_string()),
    )?;

    Ok(Some(grant_record))
  } else {
    // Update request status to denied
    request.status = RequestStatus::Denied;
    let _updated_request_hash = update_entry(input.request_hash, &request)?;
    Ok(None)
  }
}

/// Grant direct access to private data without a request
#[hdk_extern]
pub fn grant_private_data_access(input: DataAccessGrantInput) -> ExternResult<Record> {
  let agent_info = agent_info()?;
  let now = sys_time()?;

  // Validate fields are allowed
  let allowed_fields = ["email", "phone", "location", "time_zone", "emergency_contact"];
  for field in &input.fields_granted {
    if !allowed_fields.contains(&field.as_str()) {
      return Err(PersonError::InvalidInput(format!(
        "Field '{}' is not allowed to be granted",
        field
      )).into());
    }
  }

  let duration_days = input.duration_days.unwrap_or(7);
  let duration_micros = (duration_days as i64) * 24 * 60 * 60 * 1_000_000;
  let expires_at = Timestamp::from_micros(now.as_micros() + duration_micros);

  let grant = DataAccessGrant {
    granted_to: input.granted_to.clone(),
    granted_by: agent_info.agent_initial_pubkey.clone(),
    fields_granted: input.fields_granted,
    context: input.context,
    resource_hash: input.resource_hash.clone(),
    expires_at,
    created_at: now,
  };

  let grant_hash = create_entry(&EntryTypes::DataAccessGrant(grant.clone()))?;
  let record = get(grant_hash.clone(), GetOptions::default())?.ok_or(
    PersonError::EntryOperationFailed("Failed to retrieve created grant".to_string()),
  )?;

  // Create links for grant management
  create_link(
    agent_info.agent_initial_pubkey.clone(),
    grant_hash.clone(),
    LinkTypes::AgentToDataGrants,
    (),
  )?;

  // Link to resource if applicable
  if let Some(resource_hash) = input.resource_hash {
    create_link(
      resource_hash,
      grant_hash,
      LinkTypes::ResourceToDataGrants,
      (),
    )?;
  }

  Ok(record)
}

/// Get private data that has been granted to the calling agent
#[hdk_extern]
pub fn get_granted_private_data(granted_by: AgentPubKey) -> ExternResult<Option<SharedPrivateData>> {
  let agent_info = agent_info()?;
  let now = sys_time()?;

  // Find grants from the specified agent to the calling agent
  let grant_links = get_links(
    GetLinksInputBuilder::try_new(granted_by.clone(), LinkTypes::AgentToDataGrants)?.build(),
  )?;

  for link in grant_links {
    if let Some(action_hash) = link.target.into_action_hash() {
      if let Some(record) = get(action_hash, GetOptions::default())? {
        if let Ok(Some(grant)) = record.entry().to_app_option::<DataAccessGrant>() {
          // Check if this grant is for the calling agent and still valid
          if grant.granted_to == agent_info.agent_initial_pubkey && grant.expires_at > now {
            // Get the private data from the granting agent
            if let Ok(Some(private_data)) = get_private_data_for_agent(granted_by.clone()) {
              let mut fields = std::collections::HashMap::new();
              
              // Only include granted fields
              for field in &grant.fields_granted {
                match field.as_str() {
                  "email" => { fields.insert("email".to_string(), private_data.email.clone()); }
                  "phone" => {
                    if let Some(phone) = &private_data.phone {
                      fields.insert("phone".to_string(), phone.clone());
                    }
                  }
                  "location" => {
                    if let Some(location) = &private_data.location {
                      fields.insert("location".to_string(), location.clone());
                    }
                  }
                  "time_zone" => {
                    if let Some(time_zone) = &private_data.time_zone {
                      fields.insert("time_zone".to_string(), time_zone.clone());
                    }
                  }
                  "emergency_contact" => {
                    if let Some(emergency_contact) = &private_data.emergency_contact {
                      fields.insert("emergency_contact".to_string(), emergency_contact.clone());
                    }
                  }
                  _ => {} // Skip unknown fields
                }
              }

              return Ok(Some(SharedPrivateData {
                fields,
                granted_by: granted_by.clone(),
                context: grant.context,
                expires_at: grant.expires_at,
              }));
            }
          }
        }
      }
    }
  }

  Ok(None)
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
pub fn get_pending_data_requests(_: ()) -> ExternResult<Vec<DataAccessRequest>> {
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
pub fn get_my_data_grants(_: ()) -> ExternResult<Vec<DataAccessGrant>> {
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

/// Get all data access requests made by the calling agent
#[hdk_extern]
pub fn get_my_data_requests(_: ()) -> ExternResult<Vec<DataAccessRequest>> {
  let agent_info = agent_info()?;
  let request_links = get_links(
    GetLinksInputBuilder::try_new(agent_info.agent_initial_pubkey, LinkTypes::AgentToDataRequests)?.build(),
  )?;

  let mut requests = Vec::new();
  for link in request_links {
    if let Some(action_hash) = link.target.into_action_hash() {
      if let Some(record) = get(action_hash, GetOptions::default())? {
        if let Ok(Some(request)) = record.entry().to_app_option::<DataAccessRequest>() {
          requests.push(request);
        }
      }
    }
  }

  Ok(requests)
}

// Helper function to get private data for a specific agent
fn get_private_data_for_agent(agent_pubkey: AgentPubKey) -> ExternResult<Option<PrivatePersonData>> {
  // Get the agent's person entry
  let person_links = get_links(
    GetLinksInputBuilder::try_new(agent_pubkey, LinkTypes::AgentToPerson)?.build(),
  )?;

  if let Some(person_link) = person_links.first() {
    if let Some(person_hash) = person_link.target.clone().into_action_hash() {
      // Get private data linked to the person
      let private_data_links = get_links(
        GetLinksInputBuilder::try_new(person_hash, LinkTypes::PersonToPrivateData)?.build(),
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

  Ok(None)
}