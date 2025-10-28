use hdi::prelude::*;
use std::{fmt::Display, str::FromStr};

/// Represents a person's public profile with basic information
#[hdk_entry_helper]
#[derive(Clone, PartialEq)]
pub struct Person {
  /// The public display name of the person
  pub name: String,
  /// Optional avatar URL for the person's picture
  pub avatar_url: Option<String>,
  /// Optional short biography or description
  pub bio: Option<String>,
}

/// Private data for a person, only accessible by the owner
#[hdk_entry_helper]
#[derive(Clone, PartialEq)]
pub struct PrivatePersonData {
  /// Full legal name
  pub legal_name: String,
  /// Contact email address
  pub email: String,
  /// Optional phone number
  pub phone: Option<String>,
  /// Physical address
  pub address: Option<String>,
  /// Emergency contact information
  pub emergency_contact: Option<String>,
  /// Time zone of the person
  pub time_zone: Option<String>,
  /// Location/city where the person is based
  pub location: Option<String>,
}

/// Represents a role assigned to an agent in the community
#[hdk_entry_helper]
#[derive(Clone, PartialEq)]
pub struct PersonRole {
  /// The name of the role (e.g., "Primary Accountable Agent")
  pub role_name: String,
  /// Optional description of the role's responsibilities
  pub description: Option<String>,
  /// Agent who is assigned this role
  pub assigned_to: AgentPubKey,
  /// Agent who assigned this role
  pub assigned_by: AgentPubKey,
  /// Timestamp when the role was assigned
  pub assigned_at: Timestamp,
}

/// Allowed role types in the system
#[derive(Debug, Clone, PartialEq)]
pub enum RoleType {
  SimpleAgent,             // Simple Agent capabilities
  AccountableAgent,        // Accountable Agent level
  PrimaryAccountableAgent, // Primary Accountable Agent level
  Transport,               // Transport process access
  Repair,                  // Repair process access
  Storage,                 // Storage process access
}

impl Display for RoleType {
  fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
    match self {
      Self::SimpleAgent => write!(f, "Simple Agent"),
      Self::AccountableAgent => write!(f, "Accountable Agent"),
      Self::PrimaryAccountableAgent => write!(f, "Primary Accountable Agent"),
      Self::Transport => write!(f, "Transport Agent"),
      Self::Repair => write!(f, "Repair Agent"),
      Self::Storage => write!(f, "Storage Agent"),
    }
  }
}

impl FromStr for RoleType {
  type Err = ();

  fn from_str(s: &str) -> Result<Self, Self::Err> {
    match s {
      "Simple Agent" => Ok(Self::SimpleAgent),
      "Accountable Agent" => Ok(Self::AccountableAgent),
      "Primary Accountable Agent" => Ok(Self::PrimaryAccountableAgent),
      "Transport Agent" => Ok(Self::Transport),
      "Repair Agent" => Ok(Self::Repair),
      "Storage Agent" => Ok(Self::Storage),
      _ => Err(()),
    }
  }
}


/// Metadata for private data capability grants (for tracking our own grants)
#[hdk_entry_helper]
#[derive(Clone, PartialEq)]
pub struct PrivateDataCapabilityMetadata {
  /// Hash of the capability grant
  pub grant_hash: ActionHash,
  /// Agent who is granted access
  pub granted_to: AgentPubKey,
  /// Agent who granted the access (data owner)
  pub granted_by: AgentPubKey,
  /// Specific fields that are accessible
  pub fields_allowed: Vec<String>,
  /// Context for the access
  pub context: String,
  /// When this grant expires
  pub expires_at: Timestamp,
  /// When this grant was created
  pub created_at: Timestamp,
  /// The capability secret (stored for reference)
  pub cap_secret: CapSecret,
}

/// Filtered private data structure for capability-based access
#[hdk_entry_helper]
#[derive(Clone, PartialEq)]
pub struct FilteredPrivateData {
  /// Legal name (never shared)
  pub legal_name: Option<String>,
  /// Email field (if allowed)
  pub email: Option<String>,
  /// Phone field (if allowed)
  pub phone: Option<String>,
  /// Address field (if allowed)
  pub address: Option<String>,
  /// Emergency contact field (if allowed)
  pub emergency_contact: Option<String>,
  /// Time zone field (if allowed)
  pub time_zone: Option<String>,
  /// Location field (if allowed)
  pub location: Option<String>,
}

#[hdk_entry_types]
#[unit_enum(UnitEntryTypes)]
pub enum EntryTypes {
  Person(Person),
  #[entry_type(visibility = "private")]
  PrivatePersonData(PrivatePersonData),
  PersonRole(PersonRole),
  #[entry_type(visibility = "private")]
  PrivateDataCapabilityMetadata(PrivateDataCapabilityMetadata),
  FilteredPrivateData(FilteredPrivateData),
}

#[hdk_link_types]
pub enum LinkTypes {
  // Person discovery
  AllPersons,
  // Agent to their person profile
  AgentToPerson,
  // Person updates (for versioning)
  PersonUpdates,
  // Person to their private data
  PersonToPrivateData,
  // Agent to their private data (direct link for reliability)
  AgentToPrivateData,
  // Private data discovery via anchor paths
  PrivateDataDiscovery,
  // Person to their roles
  PersonToRoles,
  // Role updates (for versioning)
  RoleUpdates,
  // Capability-based access management
  AgentToCapabilityMetadata, // Link agent to their capability grant metadata
}

#[hdk_extern]
pub fn genesis_self_check(_data: GenesisSelfCheckData) -> ExternResult<ValidateCallbackResult> {
  Ok(ValidateCallbackResult::Valid)
}

pub fn validate_agent_joining(
  _agent_pub_key: AgentPubKey,
  _membrane_proof: &Option<MembraneProof>,
) -> ExternResult<ValidateCallbackResult> {
  Ok(ValidateCallbackResult::Valid)
}

/// Validates the provided `Op` to ensure the entry and link types adhere to the defined constraints.
#[allow(clippy::collapsible_match, clippy::single_match)]
#[hdk_extern]
pub fn validate(op: Op) -> ExternResult<ValidateCallbackResult> {
  if let FlatOp::StoreEntry(store_entry) = op.flattened::<EntryTypes, LinkTypes>()? {
    match store_entry {
      OpEntry::CreateEntry { app_entry, .. } | OpEntry::UpdateEntry { app_entry, .. } => {
        match app_entry {
          EntryTypes::Person(person) => {
            return validate_person(person);
          }
          EntryTypes::PrivatePersonData(private_data) => {
            return validate_private_person_data(private_data);
          }
          EntryTypes::PersonRole(role) => {
            return validate_person_role(role);
          }
          EntryTypes::PrivateDataCapabilityMetadata(metadata) => {
            return validate_private_data_capability_metadata(metadata);
          }
          EntryTypes::FilteredPrivateData(filtered_data) => {
            return validate_filtered_private_data(filtered_data);
          }
        }
      }
      _ => (),
    }
  }
  if let FlatOp::StoreRecord(store_record) = op.flattened::<EntryTypes, LinkTypes>()? {
    match store_record {
      OpRecord::DeleteEntry {
        original_action_hash,
        ..
      } => {
        let original_record = must_get_valid_record(original_action_hash)?;
        let original_action = original_record.action().clone();
        let original_action = match original_action {
          Action::Create(create) => EntryCreationAction::Create(create),
          Action::Update(update) => EntryCreationAction::Update(update),
          _ => {
            return Ok(ValidateCallbackResult::Invalid(
              "Original action for a delete must be a Create or Update action".to_string(),
            ));
          }
        };
        let app_entry_type = match original_action.entry_type() {
          EntryType::App(app_entry_type) => app_entry_type,
          _ => {
            return Ok(ValidateCallbackResult::Valid);
          }
        };
        let entry = match original_record.entry().as_option() {
          Some(entry) => entry,
          None => {
            if original_action.entry_type().visibility().is_public() {
              return Ok(ValidateCallbackResult::Invalid(
                "Original record for a delete of a public entry must contain an entry".to_string(),
              ));
            } else {
              return Ok(ValidateCallbackResult::Valid);
            }
          }
        };
        let original_app_entry = match EntryTypes::deserialize_from_type(
          *app_entry_type.zome_index,
          app_entry_type.entry_index,
          entry,
        )? {
          Some(app_entry) => app_entry,
          None => {
            return Ok(ValidateCallbackResult::Invalid(
              "Original app entry must be one of the defined entry types for this zome".to_string(),
            ));
          }
        };
        match original_app_entry {
          EntryTypes::Person(_) => {
            return validate_delete_person();
          }
          EntryTypes::PrivatePersonData(_) => {
            return validate_delete_private_person_data();
          }
          EntryTypes::PersonRole(_) => {
            return validate_delete_person_role();
          }
          EntryTypes::PrivateDataCapabilityMetadata(_) => {
            return validate_delete_private_data_capability_metadata();
          }
          EntryTypes::FilteredPrivateData(_) => {
            return validate_delete_filtered_private_data();
          }
        }
      }
      _ => (),
    }
  }
  Ok(ValidateCallbackResult::Valid)
}

pub fn validate_person(person: Person) -> ExternResult<ValidateCallbackResult> {
  if person.name.trim().is_empty() {
    return Ok(ValidateCallbackResult::Invalid(String::from(
      "Person name cannot be empty",
    )));
  }

  if person.name.len() > 100 {
    return Ok(ValidateCallbackResult::Invalid(String::from(
      "Person name too long (max 100 characters)",
    )));
  }

  // Validate avatar URL format if provided
  if let Some(ref avatar_url) = person.avatar_url {
    if !avatar_url.starts_with("http://") && !avatar_url.starts_with("https://") {
      return Ok(ValidateCallbackResult::Invalid(String::from(
        "Avatar URL must be a valid HTTP/HTTPS URL",
      )));
    }
  }

  Ok(ValidateCallbackResult::Valid)
}

pub fn validate_private_person_data(
  private_data: PrivatePersonData,
) -> ExternResult<ValidateCallbackResult> {
  if private_data.legal_name.trim().is_empty() {
    return Ok(ValidateCallbackResult::Invalid(String::from(
      "Legal name cannot be empty",
    )));
  }

  if private_data.email.trim().is_empty() || !private_data.email.contains('@') {
    return Ok(ValidateCallbackResult::Invalid(String::from(
      "Valid email address is required",
    )));
  }

  // Basic email validation
  if private_data.email.len() > 254 {
    return Ok(ValidateCallbackResult::Invalid(String::from(
      "Email address too long",
    )));
  }

  Ok(ValidateCallbackResult::Valid)
}

pub fn validate_person_role(role: PersonRole) -> ExternResult<ValidateCallbackResult> {
  if role.role_name.trim().is_empty() {
    return Ok(ValidateCallbackResult::Invalid(String::from(
      "Role name cannot be empty",
    )));
  }

  if role.role_name.len() > 50 {
    return Ok(ValidateCallbackResult::Invalid(String::from(
      "Role name too long (max 50 characters)",
    )));
  }

  // Validate that the role type is allowed
  if RoleType::from_str(&role.role_name).is_err() {
    return Ok(ValidateCallbackResult::Invalid(format!(
      "Invalid role type: {}. Must be one of the predefined role types.",
      role.role_name
    )));
  }

  Ok(ValidateCallbackResult::Valid)
}

pub fn validate_delete_person() -> ExternResult<ValidateCallbackResult> {
  Ok(ValidateCallbackResult::Invalid(String::from(
    "Person profiles cannot be deleted",
  )))
}

pub fn validate_delete_private_person_data() -> ExternResult<ValidateCallbackResult> {
  Ok(ValidateCallbackResult::Valid) // Allow deletion of private data
}

pub fn validate_delete_person_role() -> ExternResult<ValidateCallbackResult> {
  Ok(ValidateCallbackResult::Valid) // Allow role deletion for role transfers
}


pub fn validate_private_data_capability_metadata(
  metadata: PrivateDataCapabilityMetadata,
) -> ExternResult<ValidateCallbackResult> {
  // Validate fields_allowed contains only allowed fields
  let allowed_fields = [
    "email",
    "phone",
    "location",
    "time_zone",
    "emergency_contact",
    "address",
  ];
  for field in &metadata.fields_allowed {
    if !allowed_fields.contains(&field.as_str()) {
      return Ok(ValidateCallbackResult::Invalid(format!(
        "Field '{}' is not allowed to be shared. Allowed fields: {:?}",
        field, allowed_fields
      )));
    }
  }

  // Validate context is not empty
  if metadata.context.trim().is_empty() {
    return Ok(ValidateCallbackResult::Invalid(
      "Capability metadata context cannot be empty".to_string(),
    ));
  }

  // Validate expiration is in the future
  if metadata.expires_at <= metadata.created_at {
    return Ok(ValidateCallbackResult::Invalid(
      "Capability metadata expiration must be in the future".to_string(),
    ));
  }

  // Validate max expiration time (30 days from creation for capability grants)
  let max_duration = 30 * 24 * 60 * 60 * 1_000_000; // 30 days in microseconds
  if metadata.expires_at.as_micros() - metadata.created_at.as_micros() > max_duration {
    return Ok(ValidateCallbackResult::Invalid(
      "Capability grant cannot exceed 30 days duration".to_string(),
    ));
  }

  Ok(ValidateCallbackResult::Valid)
}

pub fn validate_filtered_private_data(
  _filtered_data: FilteredPrivateData,
) -> ExternResult<ValidateCallbackResult> {
  // FilteredPrivateData is typically created internally with proper validation
  // So we allow all valid filtered data structures
  Ok(ValidateCallbackResult::Valid)
}

pub fn validate_delete_private_data_capability_metadata() -> ExternResult<ValidateCallbackResult> {
  Ok(ValidateCallbackResult::Valid) // Allow deletion for cleanup
}

pub fn validate_delete_filtered_private_data() -> ExternResult<ValidateCallbackResult> {
  Ok(ValidateCallbackResult::Valid) // Allow deletion for cleanup
}
