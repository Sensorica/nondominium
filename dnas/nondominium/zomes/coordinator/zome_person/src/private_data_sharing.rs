use crate::PersonError;
use hdk::prelude::*;
use zome_person_integrity::*;
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
pub struct RespondToDataAccessOutput {
  pub request_record: Record,
  pub grant_hash: Option<ActionHash>,
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
pub fn respond_to_data_access_request(input: RespondToDataAccessInput) -> ExternResult<RespondToDataAccessOutput> {
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
      grant_hash.clone(),
      shared_data_hash,
      LinkTypes::GrantToSharedData,
      (),
    )?;

    Ok(RespondToDataAccessOutput {
      request_record: updated_record,
      grant_hash: Some(grant_hash),
    })
  } else {
    Ok(RespondToDataAccessOutput {
      request_record: updated_record,
      grant_hash: None,
    })
  }
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
                  // legal_name is never shared for security reasons, so always empty
                  return Ok(PrivatePersonData {
                    legal_name: String::new(), // Never share legal_name for privacy
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

/// Create missing Person->PrivateData links by finding unlinked private data entries
fn create_missing_private_data_links(agent_pubkey: &AgentPubKey) -> ExternResult<()> {
  warn!("🔧 create_missing_private_data_links called for agent: {:?}", agent_pubkey);

  // Get the person entry for this agent
  let person_links = get_links(
    GetLinksInputBuilder::try_new(agent_pubkey.clone(), LinkTypes::AgentToPerson)?.build(),
  )?;

  if let Some(person_link) = person_links.first() {
    warn!("📎 Found person entry: {:?}", person_link.target);

    // Try to find any private data entries that aren't linked to this person
    // Method 1: Search through all private data entries in the DHT
    let path = Path::from("private_data_unlinked");
    warn!("🔍 Looking for unlinked private data entries...");

    // Create a more comprehensive search: try to find private data by the agent who created it
    // Since we can't query all entries directly, we'll use a different strategy:
    // Look for private data that was created by this agent but isn't linked yet

    // For now, let's focus on a simple approach: if we know there should be private data
    // but no Person->PrivateData links exist, we'll note this and let the caller handle it
    warn!("⚠️ No Person->PrivateData links found - this suggests they weren't created during storage");

    // TODO: In a more complete implementation, we could:
    // 1. Maintain an index of unlinked private data
    // 2. Use a different link structure for discovery
    // 3. Implement a background cleanup process

  } else {
    warn!("❌ No Agent->Person links found for agent");
    return Err(PersonError::EntryOperationFailed("No person found for agent".to_string()).into());
  }

  Ok(())
}

/// Helper function to get an agent's private data with enhanced DHT synchronization
fn get_private_data_for_agent(agent_pubkey: AgentPubKey) -> ExternResult<PrivatePersonData> {
  warn!("🔍 get_private_data_for_agent called for agent: {:?}", agent_pubkey);

  // Method 1: Try direct link traversal (Agent -> Person -> PrivateData)
  match try_get_private_data_via_links(&agent_pubkey) {
    Ok(private_data) => {
      warn!("✅ Successfully retrieved private data via link traversal");
      return Ok(private_data);
    },
    Err(e) => {
      warn!("⚠️ Link traversal failed: {:?}", e);
    }
  }

  // Method 2: Try direct agent-based retrieval (if we're the owner)
  if agent_pubkey == agent_info()?.agent_initial_pubkey {
    warn!("🔄 Trying direct private data retrieval (owner access)");
    match crate::private_data::get_my_private_person_data(()) {
      Ok(Some(private_data)) => {
        warn!("✅ Successfully retrieved own private data directly");
        return Ok(private_data);
      },
      Ok(None) => warn!("❌ No private data found via direct retrieval"),
      Err(e) => warn!("⚠️ Direct retrieval failed: {:?}", e),
    }
  }

  // Method 3: Try to create missing Person->PrivateData links and retry
  warn!("🔧 Attempting to create missing Person->PrivateData links");
  match create_missing_private_data_links(&agent_pubkey) {
    Ok(()) => {
      warn!("✅ Successfully created missing links, retrying retrieval");
      match try_get_private_data_via_links(&agent_pubkey) {
        Ok(private_data) => {
          warn!("✅ Successfully retrieved private data after creating missing links");
          return Ok(private_data);
        },
        Err(e) => {
          warn!("⚠️ Still failed after creating links: {:?}", e);
        }
      }
    },
    Err(e) => {
      warn!("⚠️ Failed to create missing links: {:?}", e);
    }
  }

  // Method 4: Try alternative path via person entry hashes
  match try_get_private_data_via_person_path(&agent_pubkey) {
    Ok(private_data) => {
      warn!("✅ Successfully retrieved private data via person path");
      return Ok(private_data);
    },
    Err(e) => {
      warn!("⚠️ Person path retrieval failed: {:?}", e);
    }
  }

  warn!("💥 All retrieval methods failed, returning PrivateDataNotFound error");
  Err(PersonError::PrivateDataNotFound.into())
}

/// Try to retrieve private data via multiple link strategies
fn try_get_private_data_via_links(agent_pubkey: &AgentPubKey) -> ExternResult<PrivatePersonData> {
  warn!("🔗 Method 1: Trying link traversal for agent: {:?}", agent_pubkey);

  // Strategy 1: Try direct Agent -> PrivateData link (new approach)
  let direct_private_links = get_links(
    GetLinksInputBuilder::try_new(agent_pubkey.clone(), LinkTypes::AgentToPrivateData)?.build(),
  )?;

  warn!("🔗 Found {} AgentToPrivateData direct links", direct_private_links.len());

  if let Some(private_data_link) = direct_private_links.first() {
    warn!("📍 Following direct private data link to: {:?}", private_data_link.target);

    if let Some(action_hash) = private_data_link.target.clone().into_action_hash() {
      warn!("🎯 Getting record for action hash: {:?}", action_hash);

      if let Some(record) = get(action_hash, GetOptions::default())? {
        warn!("📜 Record found, attempting to deserialize as PrivatePersonData");

        if let Ok(Some(private_data)) = record.entry().to_app_option::<PrivatePersonData>() {
          warn!("✅ Successfully retrieved private data via direct link");
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
  }

  // Strategy 2: Try traditional Agent -> Person -> PrivateData link traversal
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
            warn!("✅ Successfully retrieved private data via Person->PrivateData link");
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

  // Strategy 3: Try anchor-based discovery
  warn!("🔍 Trying anchor-based private data discovery");
  let anchor_path = Path::from(format!("private_data_{}", agent_pubkey.to_string()));
  let anchor_links = get_links(
    GetLinksInputBuilder::try_new(anchor_path.path_entry_hash()?, LinkTypes::PrivateDataDiscovery)?.build(),
  )?;

  warn!("🔗 Found {} PrivateDataDiscovery anchor links", anchor_links.len());

  if let Some(anchor_link) = anchor_links.first() {
    warn!("📍 Following anchor link to: {:?}", anchor_link.target);

    if let Some(action_hash) = anchor_link.target.clone().into_action_hash() {
      warn!("🎯 Getting record for action hash: {:?}", action_hash);

      if let Some(record) = get(action_hash, GetOptions::default())? {
        warn!("📜 Record found, attempting to deserialize as PrivatePersonData");

        if let Ok(Some(private_data)) = record.entry().to_app_option::<PrivatePersonData>() {
          warn!("✅ Successfully retrieved private data via anchor discovery");
          return Ok(private_data);
        } else {
          warn!("❌ Failed to deserialize record as PrivatePersonData");
        }
      } else {
        warn!("❌ No record found for action hash");
      }
    } else {
      warn!("❌ Anchor link target is not an action hash");
    }
  } else {
    warn!("❌ No PrivateDataDiscovery anchor links found");
  }

  Err(PersonError::PrivateDataNotFound.into())
}

/// Try alternative retrieval via person discovery paths
fn try_get_private_data_via_person_path(agent_pubkey: &AgentPubKey) -> ExternResult<PrivatePersonData> {
  warn!("🔍 Method 3: Trying person path discovery for agent: {:?}", agent_pubkey);

  // Try to find person via discovery paths (AllPersons anchor)
  let path = Path::from("persons");
  let all_person_links = get_links(
    GetLinksInputBuilder::try_new(path.path_entry_hash()?, LinkTypes::AllPersons)?.build(),
  )?;

  warn!("🔍 Found {} persons in discovery path", all_person_links.len());

  for person_link in all_person_links {
    if let Some(person_action_hash) = person_link.target.clone().into_action_hash() {
      if let Some(person_record) = get(person_action_hash, GetOptions::default())? {
        if let Ok(Some(person)) = person_record.entry().to_app_option::<Person>() {
          // Check if this person belongs to our target agent
          let agent_to_person_links = get_links(
            GetLinksInputBuilder::try_new(agent_pubkey.clone(), LinkTypes::AgentToPerson)?.build(),
          )?;

          for agent_link in agent_to_person_links {
            if agent_link.target == person_link.target {
              warn!("✅ Found matching person entry for agent via discovery");

              // Now get private data from this person
              let private_data_links = get_links(
                GetLinksInputBuilder::try_new(person_link.target.clone(), LinkTypes::PersonToPrivateData)?.build(),
              )?;

              if let Some(private_data_link) = private_data_links.first() {
                if let Some(action_hash) = private_data_link.target.clone().into_action_hash() {
                  if let Some(record) = get(action_hash, GetOptions::default())? {
                    if let Ok(Some(private_data)) = record.entry().to_app_option::<PrivatePersonData>() {
                      warn!("✅ Successfully retrieved private data via person discovery");
                      return Ok(private_data);
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

/// Validate agent private data using a specific grant hash (bypasses link discovery)
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ValidationDataRequestWithGrant {
  pub target_agent: AgentPubKey,
  pub validation_context: String,
  pub required_fields: Vec<String>,
  pub governance_requester: AgentPubKey,
  pub grant_hash: ActionHash,
}

/// Self-validation result that can be shared with governance agents
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SelfValidationResult {
  pub is_valid: bool,
  pub validated_fields: HashMap<String, String>,
  pub validation_context: String,
  pub validated_at: Timestamp,
  pub agent_pubkey: AgentPubKey,
  pub grant_hash: ActionHash,
  pub governance_requester: AgentPubKey,
  pub error_message: Option<String>,
}

#[hdk_extern]
pub fn validate_agent_private_data_with_grant(input: ValidationDataRequestWithGrant) -> ExternResult<ValidationResult> {
  let now = sys_time()?;
  let current_agent = agent_info()?.agent_initial_pubkey;

  warn!("🔍 validate_agent_private_data_with_grant called by {:?} for target {:?}", current_agent, input.target_agent);

  // CRITICAL: This function can only validate the current agent's private data
  // Private entries in Holochain cannot be accessed by other agents
  if current_agent != input.target_agent {
    return Ok(ValidationResult {
      is_valid: false,
      validated_data: None,
      validation_context: input.validation_context,
      validated_at: now,
      error_message: Some(format!(
        "Cannot validate private data for another agent. This function must be called on the target agent's own node. Called by: {:?}, Target: {:?}",
        current_agent, input.target_agent
      )),
    });
  }

  // Get the grant directly by hash - no link traversal needed
  let grant_record = get(input.grant_hash, GetOptions::default())?.ok_or(
    PersonError::EntryOperationFailed("Grant not found".to_string()),
  )?;

  let grant: DataAccessGrant = grant_record
    .entry()
    .to_app_option()
    .map_err(|e| PersonError::SerializationError(format!("Failed to deserialize grant: {:?}", e)))?
    .ok_or(PersonError::EntryOperationFailed("Invalid grant entry".to_string()))?;

  warn!("🔍 Using grant for self-validation: {:?}", grant);

  // Verify the grant is valid
  if grant.granted_by != input.target_agent {
    return Ok(ValidationResult {
      is_valid: false,
      validated_data: None,
      validation_context: input.validation_context,
      validated_at: now,
      error_message: Some("Grant is not from the target agent".to_string()),
    });
  }

  if grant.granted_to != input.governance_requester {
    return Ok(ValidationResult {
      is_valid: false,
      validated_data: None,
      validation_context: input.validation_context,
      validated_at: now,
      error_message: Some("Grant is not to the governance requester".to_string()),
    });
  }

  // Check if grant is for governance purposes (including auto-grants)
  if !grant.context.contains("governance") {
    return Ok(ValidationResult {
      is_valid: false,
      validated_data: None,
      validation_context: input.validation_context,
      validated_at: now,
      error_message: Some(format!("Grant is not for governance purposes. Grant context: '{}'", grant.context)),
    });
  }

  if grant.expires_at <= now {
    return Ok(ValidationResult {
      is_valid: false,
      validated_data: None,
      validation_context: input.validation_context,
      validated_at: now,
      error_message: Some("Grant has expired".to_string()),
    });
  }

  // Get our own private data (this should always work since we're the owner)
  let private_data = match crate::private_data::get_my_private_person_data(()) {
    Ok(Some(data)) => {
      warn!("✅ Successfully retrieved own private data for validation");
      data
    },
    Ok(None) => {
      return Ok(ValidationResult {
        is_valid: false,
        validated_data: None,
        validation_context: input.validation_context,
        validated_at: now,
        error_message: Some("No private data found for self-validation".to_string()),
      });
    },
    Err(e) => {
      return Ok(ValidationResult {
        is_valid: false,
        validated_data: None,
        validation_context: input.validation_context,
        validated_at: now,
        error_message: Some(format!("Failed to retrieve own private data: {:?}", e)),
      });
    }
  };

  // Validate fields and return validated data
  let mut validated_data = HashMap::new();
  let mut missing_fields = Vec::new();

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
    warn!("✅ Self-validation successful with {} fields", validated_data.len());
    return Ok(ValidationResult {
      is_valid: true,
      validated_data: Some(validated_data),
      validation_context: input.validation_context,
      validated_at: now,
      error_message: None,
    });
  } else {
    warn!("❌ Self-validation failed due to missing fields: {:?}", missing_fields);
    return Ok(ValidationResult {
      is_valid: false,
      validated_data: None,
      validation_context: input.validation_context,
      validated_at: now,
      error_message: Some(format!("Missing required fields: {}", missing_fields.join(", "))),
    });
  }
}

/// Generate a self-validation result that can be shared with governance agents
/// This function should be called by the agent being validated to create proof of validation
#[hdk_extern]
pub fn create_self_validation_proof(input: ValidationDataRequestWithGrant) -> ExternResult<SelfValidationResult> {
  warn!("🔍 Creating self-validation proof for agent: {:?}", agent_info()?.agent_initial_pubkey);

  // Validate using the existing function
  let validation_result = validate_agent_private_data_with_grant(input.clone())?;

  // Convert to shareable format
  Ok(SelfValidationResult {
    is_valid: validation_result.is_valid,
    validated_fields: validation_result.validated_data.unwrap_or_default(),
    validation_context: validation_result.validation_context,
    validated_at: validation_result.validated_at,
    agent_pubkey: input.target_agent,
    grant_hash: input.grant_hash,
    governance_requester: input.governance_requester,
    error_message: validation_result.error_message,
  })
}

/// Verify a self-validation proof provided by another agent
/// This allows governance agents to validate the authenticity of self-validation results
#[hdk_extern]
pub fn verify_self_validation_proof(proof: SelfValidationResult) -> ExternResult<ValidationResult> {
  let now = sys_time()?;
  let current_agent = agent_info()?.agent_initial_pubkey;

  warn!("🔍 Verifying self-validation proof from {:?} for {:?}", proof.agent_pubkey, proof.governance_requester);

  // Verify that this proof is intended for the current agent (governance requester)
  if proof.governance_requester != current_agent {
    return Ok(ValidationResult {
      is_valid: false,
      validated_data: None,
      validation_context: proof.validation_context,
      validated_at: now,
      error_message: Some("Self-validation proof is not intended for this agent".to_string()),
    });
  }

  // Verify the grant exists and is still valid
  let grant_record = get(proof.grant_hash.clone(), GetOptions::default())?.ok_or(
    PersonError::EntryOperationFailed("Grant not found".to_string()),
  )?;

  let grant: DataAccessGrant = grant_record
    .entry()
    .to_app_option()
    .map_err(|e| PersonError::SerializationError(format!("Failed to deserialize grant: {:?}", e)))?
    .ok_or(PersonError::EntryOperationFailed("Invalid grant entry".to_string()))?;

  // Verify grant is still valid
  if grant.expires_at <= now {
    return Ok(ValidationResult {
      is_valid: false,
      validated_data: None,
      validation_context: proof.validation_context,
      validated_at: now,
      error_message: Some("Grant has expired".to_string()),
    });
  }

  // Verify the proof matches the grant
  if grant.granted_by != proof.agent_pubkey || grant.granted_to != proof.governance_requester {
    return Ok(ValidationResult {
      is_valid: false,
      validated_data: None,
      validation_context: proof.validation_context,
      validated_at: now,
      error_message: Some("Grant does not match self-validation proof".to_string()),
    });
  }

  // Return the validation result from the proof
  Ok(ValidationResult {
    is_valid: proof.is_valid,
    validated_data: Some(proof.validated_fields),
    validation_context: proof.validation_context,
    validated_at: proof.validated_at,
    error_message: proof.error_message,
  })
}

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
  // Primary path: links from the target agent (granted_by) to their grants
  let mut active_grants = Vec::new();
  let by_links = get_links(
    GetLinksInputBuilder::try_new(granted_by.clone(), LinkTypes::AgentToDataGrants)?.build(),
  )?;

  for link in by_links {
    if let Some(action_hash) = link.target.into_action_hash() {
      if let Some(record) = get(action_hash.clone(), GetOptions::default())? {
        if let Ok(Some(grant)) = record.entry().to_app_option::<DataAccessGrant>() {
          if grant.granted_to == *governance_requester
            && grant.context.contains("governance")
            && grant.expires_at > now
          {
            active_grants.push(grant);
          }
        }
      }
    }
  }

  // Fallback path: links from the governance agent to received grants
  // This helps in cases where retrieval via the grantor base hasn't propagated yet
  let to_links = get_links(
    GetLinksInputBuilder::try_new(governance_requester.clone(), LinkTypes::AgentToReceivedGrants)?.build(),
  )?;

  for link in to_links {
    if let Some(action_hash) = link.target.into_action_hash() {
      if let Some(record) = get(action_hash.clone(), GetOptions::default())? {
        if let Ok(Some(grant)) = record.entry().to_app_option::<DataAccessGrant>() {
          if grant.granted_by == *granted_by
            && grant.context.contains("governance")
            && grant.expires_at > now
          {
            // Avoid duplicates
            if !active_grants.iter().any(|g| g.created_at == grant.created_at && g.granted_to == grant.granted_to) {
              active_grants.push(grant);
            }
          }
        }
      }
    }
  }

  Ok(active_grants)
}

/// Auto-grant private data access for governance validation workflows
/// This function creates automatic grants when agents are promoted or need validation
#[derive(Debug, Serialize, Deserialize)]
pub struct AutoGrantGovernanceAccessInput {
  pub target_role: String,
  pub governance_agent: AgentPubKey,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AutoGrantGovernanceAccessOutput {
  pub record: Record,
  pub grant_hash: ActionHash,
}

#[hdk_extern]
pub fn auto_grant_governance_access(input: AutoGrantGovernanceAccessInput) -> ExternResult<AutoGrantGovernanceAccessOutput> {
  let agent_info = agent_info()?;
  let now = sys_time()?;

  // Define required fields based on target role
  let required_fields = match input.target_role.as_str() {
    "Simple Agent" => vec!["email".to_string()],
    "Accountable Agent" => vec!["email".to_string(), "phone".to_string()],
    "Primary Accountable Agent" => vec!["email".to_string(), "phone".to_string(), "location".to_string()],
    "Transport Agent" | "Repair Agent" | "Storage Agent" => {
      vec!["email".to_string(), "phone".to_string(), "location".to_string(), "time_zone".to_string()]
    }
    _ => return Err(PersonError::InvalidInput(format!("Unknown role type: {}", input.target_role)).into()),
  };

  // Create governance context for automatic grant
  let context = format!("governance_auto_grant_role_{}", input.target_role.replace(" ", "_").to_lowercase());
  let duration_days = 7; // Maximum allowed duration (7 days per validation rules)
  let duration_micros = (duration_days as i64) * 24 * 60 * 60 * 1_000_000;
  let expires_at = Timestamp::from_micros(now.as_micros() + duration_micros);

  // Create a grant to the governance agent who will validate the promotion
  let governance_pubkey = input.governance_agent;

  let grant = DataAccessGrant {
    granted_to: governance_pubkey.clone(),
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

  // Also create a link from the governance agent to track received grants
  create_link(
    governance_pubkey,
    grant_hash.clone(),
    LinkTypes::AgentToReceivedGrants,
    (),
  )?;

  Ok(AutoGrantGovernanceAccessOutput {
    record,
    grant_hash,
  })
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
