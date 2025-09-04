use crate::PersonError;
use hdk::prelude::*;
use zome_person_integrity::*;
use std::collections::HashMap;

#[derive(Debug, Serialize, Deserialize)]
pub struct GrantRenewalInput {
  pub grant_hash: ActionHash,
  pub additional_days: u32,
  pub renewal_justification: String,
}

// ============================================================================
// ENHANCED AUDIT TRAIL AND NOTIFICATIONS
// ============================================================================

#[derive(Debug, Serialize, Deserialize)]
pub struct DataAccessAuditEntry {
  pub access_type: String, // "granted", "revoked", "requested", "expired", "accessed"
  pub agent_involved: AgentPubKey,
  pub fields_involved: Vec<String>,
  pub context: String,
  pub timestamp: Timestamp,
  pub additional_info: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ExpirationNotification {
  pub grant_hash: ActionHash,
  pub granted_to: AgentPubKey,
  pub granted_by: AgentPubKey,
  pub fields_granted: Vec<String>,
  pub expires_at: Timestamp,
  pub context: String,
  pub notification_type: String, // "24h_warning", "1h_warning", "expired"
}

/// Log data access activity for audit purposes
/// This creates an audit trail for all private data operations
pub fn log_data_access_activity(
  access_type: &str,
  agent_involved: AgentPubKey,
  fields_involved: Vec<String>,
  context: String,
  additional_info: Option<String>,
) -> ExternResult<()> {
  let agent_info = agent_info()?;
  let now = sys_time()?;

  // Create audit link from the current agent
  let audit_path = nondominium_utils::paths::agent_anchor(&agent_info.agent_initial_pubkey, "access_log");
  let audit_hash = audit_path.path_entry_hash()?;

  // Store audit entry as link tag (simplified approach)
  let audit_tag = format!("{}:{}:{}", access_type, agent_involved, now.as_micros());
  create_link(
    audit_hash,
    agent_involved,
    LinkTypes::PersonToAccessLog,
    LinkTag::new(audit_tag),
  )?;

  Ok(())
}

/// Get grants that are expiring soon
#[hdk_extern]
pub fn get_expiring_grants(days_ahead: u32) -> ExternResult<Vec<ExpirationNotification>> {
  let agent_info = agent_info()?;
  let now = sys_time()?;
  let expiry_threshold = Timestamp::from_micros(
    now.as_micros() + (days_ahead as i64) * 24 * 60 * 60 * 1_000_000
  );

  let grant_links = get_links(
    GetLinksInputBuilder::try_new(agent_info.agent_initial_pubkey, LinkTypes::AgentToDataGrants)?.build(),
  )?;

  let mut expiring_grants = Vec::new();

  for link in grant_links {
    if let Some(action_hash) = link.target.into_action_hash() {
      if let Some(record) = get(action_hash.clone(), GetOptions::default())? {
        if let Ok(Some(grant)) = record.entry().to_app_option::<DataAccessGrant>() {
          // Check if grant is expiring within the threshold
          if grant.expires_at <= expiry_threshold && grant.expires_at > now {
            let time_until_expiry = grant.expires_at.as_micros() - now.as_micros();
            let hours_until_expiry = time_until_expiry / (60 * 60 * 1_000_000);

            let notification_type = if hours_until_expiry <= 1 {
              "1h_warning"
            } else if hours_until_expiry <= 24 {
              "24h_warning"
            } else {
              "upcoming_expiry"
            };

            expiring_grants.push(ExpirationNotification {
              grant_hash: action_hash,
              granted_to: grant.granted_to,
              granted_by: grant.granted_by,
              fields_granted: grant.fields_granted,
              expires_at: grant.expires_at,
              context: grant.context,
              notification_type: notification_type.to_string(),
            });
          }
        }
      }
    }
  }

  Ok(expiring_grants)
}

/// Send expiration notification (placeholder implementation)
#[hdk_extern]
pub fn send_expiration_notification(grant_hash: ActionHash) -> ExternResult<()> {
  // Get the grant details
  if let Some(record) = get(grant_hash.clone(), GetOptions::default())? {
    if let Ok(Some(grant)) = record.entry().to_app_option::<DataAccessGrant>() {
      // Log the notification attempt
      log_data_access_activity(
        "notification_sent",
        grant.granted_to.clone(),
        grant.fields_granted.clone(),
        format!("expiry_notification:{}", grant.context),
        Some(format!("Grant expires at: {}", grant.expires_at.as_micros())),
      )?;

      debug!("Expiration notification sent for grant: {:?}", grant_hash);
    }
  }

  Ok(())
}

/// Get comprehensive audit trail for an agent
#[hdk_extern]
pub fn get_agent_access_audit_trail(agent_pubkey: AgentPubKey) -> ExternResult<Vec<String>> {
  let audit_path = nondominium_utils::paths::agent_anchor(&agent_pubkey, "access_log");
  let audit_hash = audit_path.path_entry_hash()?;

  let audit_links = get_links(
    GetLinksInputBuilder::try_new(audit_hash, LinkTypes::PersonToAccessLog)?.build(),
  )?;

  let mut audit_entries = Vec::new();
  for link in audit_links {
    if let Some(tag) = link.tag.0.get(0..) {
      if let Ok(tag_str) = std::str::from_utf8(tag) {
        audit_entries.push(tag_str.to_string());
      }
    }
  }

  // Sort by timestamp (reverse chronological)
  audit_entries.sort_by(|a, b| {
    let a_time = a.split(':').last().unwrap_or("0").parse::<i64>().unwrap_or(0);
    let b_time = b.split(':').last().unwrap_or("0").parse::<i64>().unwrap_or(0);
    b_time.cmp(&a_time)
  });

  Ok(audit_entries)
}

/// Check for and clean up expired grants
#[hdk_extern]
pub fn cleanup_expired_grants(_: ()) -> ExternResult<u32> {
  let agent_info = agent_info()?;
  let now = sys_time()?;
  let mut cleaned_count = 0;

  let grant_links = get_links(
    GetLinksInputBuilder::try_new(agent_info.agent_initial_pubkey, LinkTypes::AgentToDataGrants)?.build(),
  )?;

  for link in grant_links {
    if let Some(action_hash) = link.target.into_action_hash() {
      if let Some(record) = get(action_hash.clone(), GetOptions::default())? {
        if let Ok(Some(grant)) = record.entry().to_app_option::<DataAccessGrant>() {
          // Check if grant has expired
          if grant.expires_at <= now {
            // Log the expiry
            log_data_access_activity(
              "expired",
              grant.granted_to.clone(),
              grant.fields_granted.clone(),
              grant.context.clone(),
              Some(format!("Auto-expired at: {}", now.as_micros())),
            )?;

            // Mark as expired by deleting the entry
            delete_entry(action_hash)?;
            cleaned_count += 1;
          }
        }
      }
    }
  }

  Ok(cleaned_count)
}

/// Request renewal of an existing grant
/// This allows extending the duration of active grants
#[hdk_extern]
pub fn request_grant_renewal(input: GrantRenewalInput) -> ExternResult<Record> {
  let agent_info = agent_info()?;
  let now = sys_time()?;

  // Get the existing grant
  let grant_record = get(input.grant_hash.clone(), GetOptions::default())?.ok_or(
    PersonError::EntryOperationFailed("Grant not found for renewal".to_string()),
  )?;

  let grant: DataAccessGrant = grant_record
    .entry()
    .to_app_option()
    .map_err(|e| PersonError::SerializationError(format!("Failed to deserialize grant: {:?}", e)))?
    .ok_or(PersonError::EntryOperationFailed("Invalid grant entry".to_string()))?;

  // Verify that the caller is the one who granted access (only granter can renew)
  if grant.granted_by != agent_info.agent_initial_pubkey {
    return Err(PersonError::NotAuthor.into());
  }

  // Calculate new expiration (but cap at 30 days maximum)
  let max_additional_days = 30u32.min(input.additional_days);
  let additional_micros = (max_additional_days as i64) * 24 * 60 * 60 * 1_000_000;
  let new_expires_at = Timestamp::from_micros(grant.expires_at.as_micros() + additional_micros);

  // Create renewed grant
  let renewed_grant = DataAccessGrant {
    granted_to: grant.granted_to.clone(),
    granted_by: grant.granted_by,
    fields_granted: grant.fields_granted.clone(),
    context: format!("{}_renewed", grant.context),
    resource_hash: grant.resource_hash,
    shared_data_hash: grant.shared_data_hash.clone(), // Keep the same shared data
    expires_at: new_expires_at,
    created_at: now,
  };

  let renewed_hash = create_entry(&EntryTypes::DataAccessGrant(renewed_grant.clone()))?;
  let renewed_record = get(renewed_hash.clone(), GetOptions::default())?.ok_or(
    PersonError::EntryOperationFailed("Failed to retrieve renewed grant".to_string()),
  )?;

  // Create links for the renewed grant
  create_link(
    agent_info.agent_initial_pubkey.clone(),
    renewed_hash.clone(),
    LinkTypes::AgentToDataGrants,
    (),
  )?;

  // Log the renewal
  log_data_access_activity(
    "renewed",
    grant.granted_to.clone(),
    grant.fields_granted,
    renewed_grant.context,
    Some(format!("Extended by {} days: {}", max_additional_days, input.renewal_justification)),
  )?;

  // Revoke the old grant
  delete_entry(input.grant_hash)?;

  Ok(renewed_record)
}

/// Bulk operations for managing multiple grants
#[derive(Debug, Serialize, Deserialize)]
pub struct BulkGrantOperation {
  pub operation_type: String, // "revoke", "extend", "notify"
  pub grant_hashes: Vec<ActionHash>,
  pub additional_days: Option<u32>, // For extend operations
  pub justification: String,
}

/// Execute bulk operations on multiple grants
#[hdk_extern]
pub fn execute_bulk_grant_operation(input: BulkGrantOperation) -> ExternResult<Vec<ActionHash>> {
  let agent_info = agent_info()?;
  let mut successful_operations = Vec::new();

  match input.operation_type.as_str() {
    "revoke" => {
      for grant_hash in &input.grant_hashes {
        if let Ok(_) = super::private_data_sharing::revoke_data_access_grant(grant_hash.clone()) {
          successful_operations.push(grant_hash.clone());
        }
      }
    }
    "extend" => {
      let additional_days = input.additional_days.unwrap_or(7);
      for grant_hash in &input.grant_hashes {
        if let Ok(_) = request_grant_renewal(GrantRenewalInput {
          grant_hash: grant_hash.clone(),
          additional_days,
          renewal_justification: input.justification.clone(),
        }) {
          successful_operations.push(grant_hash.clone());
        }
      }
    }
    "notify" => {
      for grant_hash in input.grant_hashes.clone() {
        if let Ok(_) = send_expiration_notification(grant_hash.clone()) {
          successful_operations.push(grant_hash);
        }
      }
    }
    _ => return Err(PersonError::InvalidInput(format!("Unknown operation: {}", input.operation_type)).into()),
  }

  // Log the bulk operation
  log_data_access_activity(
    &format!("bulk_{}", input.operation_type),
    agent_info.agent_initial_pubkey,
    vec!["multiple_grants".to_string()],
    format!("bulk_operation:{}", input.justification),
    Some(format!("Operated on {} grants, {} successful", input.grant_hashes.len(), successful_operations.len())),
  )?;

  Ok(successful_operations)
}

/// Get statistics about private data sharing for governance oversight
#[derive(Debug, Serialize, Deserialize)]
pub struct PrivateDataSharingStats {
  pub total_grants_issued: u32,
  pub active_grants: u32,
  pub expired_grants: u32,
  pub revoked_grants: u32,
  pub pending_requests: u32,
  pub average_grant_duration_days: f64,
  pub most_requested_fields: HashMap<String, u32>,
}

/// Get comprehensive statistics about private data sharing
#[hdk_extern]
pub fn get_private_data_sharing_stats(_: ()) -> ExternResult<PrivateDataSharingStats> {
  let agent_info = agent_info()?;
  let now = sys_time()?;

  // Get all grants issued by this agent
  let grant_links = get_links(
    GetLinksInputBuilder::try_new(agent_info.agent_initial_pubkey.clone(), LinkTypes::AgentToDataGrants)?.build(),
  )?;

  let mut total_grants = 0u32;
  let mut active_grants = 0u32;
  let mut expired_grants = 0u32;
  let mut total_duration_micros = 0i64;
  let mut field_counts: HashMap<String, u32> = HashMap::new();

  for link in grant_links {
    if let Some(action_hash) = link.target.into_action_hash() {
      if let Some(record) = get(action_hash, GetOptions::default())? {
        if let Ok(Some(grant)) = record.entry().to_app_option::<DataAccessGrant>() {
          total_grants += 1;

          if grant.expires_at > now {
            active_grants += 1;
          } else {
            expired_grants += 1;
          }

          // Calculate duration
          let duration = grant.expires_at.as_micros() - grant.created_at.as_micros();
          total_duration_micros += duration;

          // Count field usage
          for field in grant.fields_granted {
            *field_counts.entry(field).or_insert(0) += 1;
          }
        }
      }
    }
  }

  // Get pending requests
  let request_links = get_links(
    GetLinksInputBuilder::try_new(agent_info.agent_initial_pubkey, LinkTypes::AgentToIncomingRequests)?.build(),
  )?;

  let mut pending_requests = 0u32;
  for link in request_links {
    if let Some(action_hash) = link.target.into_action_hash() {
      if let Some(record) = get(action_hash, GetOptions::default())? {
        if let Ok(Some(request)) = record.entry().to_app_option::<DataAccessRequest>() {
          if request.status == RequestStatus::Pending {
            pending_requests += 1;
          }
        }
      }
    }
  }

  let average_duration_days = if total_grants > 0 {
    (total_duration_micros as f64) / (total_grants as f64) / (24.0 * 60.0 * 60.0 * 1_000_000.0)
  } else {
    0.0
  };

  Ok(PrivateDataSharingStats {
    total_grants_issued: total_grants,
    active_grants,
    expired_grants,
    revoked_grants: 0, // TODO: Track revoked grants separately
    pending_requests,
    average_grant_duration_days: average_duration_days,
    most_requested_fields: field_counts,
  })
}
