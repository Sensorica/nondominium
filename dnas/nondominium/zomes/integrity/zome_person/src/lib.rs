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

/// Status of a data access request
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum RequestStatus {
  Pending,
  Approved,
  Denied,
  Expired,
  Revoked,
}

impl Display for RequestStatus {
  fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
    match self {
      Self::Pending => write!(f, "pending"),
      Self::Approved => write!(f, "approved"),
      Self::Denied => write!(f, "denied"),
      Self::Expired => write!(f, "expired"),
      Self::Revoked => write!(f, "revoked"),
    }
  }
}

/// Represents a grant of access to specific private data fields
#[hdk_entry_helper]
#[derive(Clone, PartialEq)]
pub struct DataAccessGrant {
  /// Agent who is granted access
  pub granted_to: AgentPubKey,
  /// Agent who granted the access (data owner)
  pub granted_by: AgentPubKey,
  /// Specific fields that are accessible (e.g., ["email", "phone", "location"])
  pub fields_granted: Vec<String>,
  /// Context for the access (e.g., "custodian_transfer")
  pub context: String,
  /// Optional link to specific resource for context
  pub resource_hash: Option<ActionHash>,
  /// Hash of the shared data entry
  pub shared_data_hash: Option<ActionHash>,
  /// When this grant expires
  pub expires_at: Timestamp,
  /// When this grant was created
  pub created_at: Timestamp,
}

/// Represents a request for access to private data
#[hdk_entry_helper]
#[derive(Clone, PartialEq)]
pub struct DataAccessRequest {
  /// Agent from whom data is requested
  pub requested_from: AgentPubKey,
  /// Agent who is making the request
  pub requested_by: AgentPubKey,
  /// Specific fields being requested
  pub fields_requested: Vec<String>,
  /// Context for the request
  pub context: String,
  /// Optional link to specific resource for context
  pub resource_hash: Option<ActionHash>,
  /// Justification for why access is needed
  pub justification: String,
  /// Current status of the request
  pub status: RequestStatus,
  /// When this request was created
  pub created_at: Timestamp,
}

/// Represents shared private data with specific fields exposed
#[hdk_entry_helper]
#[derive(Clone, PartialEq)]
pub struct SharedPrivateData {
  /// Agent who receives the shared data
  pub shared_with: AgentPubKey,
  /// Agent who shared the data (data owner)
  pub shared_by: AgentPubKey,
  /// Specific fields that are shared
  pub fields_shared: Vec<String>,
  /// Context for the sharing (e.g., "custodian_transfer")
  pub context: String,
  /// Shared email field (if requested)
  pub email: Option<String>,
  /// Shared phone field (if requested)
  pub phone: Option<String>,
  /// Shared address field (if requested)
  pub address: Option<String>,
  /// Shared emergency contact field (if requested)
  pub emergency_contact: Option<String>,
  /// Shared time zone field (if requested)
  pub time_zone: Option<String>,
  /// Shared location field (if requested)
  pub location: Option<String>,
  /// When this shared data expires
  pub expires_at: Timestamp,
  /// When this shared data was created
  pub created_at: Timestamp,
}

#[hdk_entry_types]
#[unit_enum(UnitEntryTypes)]
pub enum EntryTypes {
  Person(Person),
  #[entry_type(visibility = "private")]
  PrivatePersonData(PrivatePersonData),
  PersonRole(PersonRole),
  DataAccessGrant(DataAccessGrant),
  DataAccessRequest(DataAccessRequest),
  SharedPrivateData(SharedPrivateData),
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
  // Data access management
  AgentToDataGrants,       // Track grants given by agent
  AgentToDataRequests,     // Track requests made by agent
  AgentToIncomingRequests, // Track requests received by agent
  AgentToReceivedGrants,   // Track grants received by agent
  GrantToSharedData,       // Link grants to their shared data entries
  ResourceToDataGrants,    // Link grants to specific resource transfers
  PersonToAccessLog,       // Audit trail of data access
  // Data access updates (for versioning)
  DataAccessGrantUpdates,
  DataAccessRequestUpdates,
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
          EntryTypes::DataAccessGrant(grant) => {
            return validate_data_access_grant(grant);
          }
          EntryTypes::DataAccessRequest(request) => {
            return validate_data_access_request(request);
          }
          EntryTypes::SharedPrivateData(shared_data) => {
            return validate_shared_private_data(shared_data);
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
          EntryTypes::DataAccessGrant(_) => {
            return validate_delete_data_access_grant();
          }
          EntryTypes::DataAccessRequest(_) => {
            return validate_delete_data_access_request();
          }
          EntryTypes::SharedPrivateData(_) => {
            return validate_delete_shared_private_data();
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

pub fn validate_data_access_grant(grant: DataAccessGrant) -> ExternResult<ValidateCallbackResult> {
  // Validate fields_granted contains only allowed fields
  let allowed_fields = [
    "email",
    "phone",
    "location",
    "time_zone",
    "emergency_contact",
  ];
  for field in &grant.fields_granted {
    if !allowed_fields.contains(&field.as_str()) {
      return Ok(ValidateCallbackResult::Invalid(format!(
        "Field '{}' is not allowed to be shared. Allowed fields: {:?}",
        field, allowed_fields
      )));
    }
  }

  // Validate context is not empty
  if grant.context.trim().is_empty() {
    return Ok(ValidateCallbackResult::Invalid(
      "Data access grant context cannot be empty".to_string(),
    ));
  }

  // Validate expiration is in the future
  if grant.expires_at <= grant.created_at {
    return Ok(ValidateCallbackResult::Invalid(
      "Data access grant expiration must be in the future".to_string(),
    ));
  }

  // Validate max expiration time (7 days from creation)
  let max_duration = 7 * 24 * 60 * 60 * 1_000_000; // 7 days in microseconds
  if grant.expires_at.as_micros() - grant.created_at.as_micros() > max_duration {
    return Ok(ValidateCallbackResult::Invalid(
      "Data access grant cannot exceed 7 days duration".to_string(),
    ));
  }

  Ok(ValidateCallbackResult::Valid)
}

pub fn validate_data_access_request(
  request: DataAccessRequest,
) -> ExternResult<ValidateCallbackResult> {
  // Validate fields_requested contains only allowed fields
  let allowed_fields = [
    "email",
    "phone",
    "location",
    "time_zone",
    "emergency_contact",
  ];
  for field in &request.fields_requested {
    if !allowed_fields.contains(&field.as_str()) {
      return Ok(ValidateCallbackResult::Invalid(format!(
        "Field '{}' is not allowed to be requested. Allowed fields: {:?}",
        field, allowed_fields
      )));
    }
  }

  // Validate context is not empty
  if request.context.trim().is_empty() {
    return Ok(ValidateCallbackResult::Invalid(
      "Data access request context cannot be empty".to_string(),
    ));
  }

  // Validate justification is not empty
  if request.justification.trim().is_empty() {
    return Ok(ValidateCallbackResult::Invalid(
      "Data access request justification cannot be empty".to_string(),
    ));
  }

  // Validate justification is reasonable length
  if request.justification.len() > 500 {
    return Ok(ValidateCallbackResult::Invalid(
      "Data access request justification too long (max 500 characters)".to_string(),
    ));
  }

  Ok(ValidateCallbackResult::Valid)
}

pub fn validate_delete_data_access_grant() -> ExternResult<ValidateCallbackResult> {
  Ok(ValidateCallbackResult::Valid) // Allow deletion for revocation
}

pub fn validate_delete_data_access_request() -> ExternResult<ValidateCallbackResult> {
  Ok(ValidateCallbackResult::Valid) // Allow deletion for cleanup
}

pub fn validate_shared_private_data(
  shared_data: SharedPrivateData,
) -> ExternResult<ValidateCallbackResult> {
  // Validate that shared_with and shared_by are different agents
  if shared_data.shared_with == shared_data.shared_by {
    return Ok(ValidateCallbackResult::Invalid(
      "Cannot share data with yourself".to_string(),
    ));
  }

  // Validate fields_shared contains only allowed fields
  let allowed_fields = [
    "email",
    "phone",
    "address",
    "emergency_contact",
    "time_zone",
    "location",
  ];

  for field in &shared_data.fields_shared {
    if !allowed_fields.contains(&field.as_str()) {
      return Ok(ValidateCallbackResult::Invalid(format!(
        "Invalid field in shared data: {}. Allowed fields: {:?}",
        field, allowed_fields
      )));
    }
  }

  // Validate context is not empty
  if shared_data.context.trim().is_empty() {
    return Ok(ValidateCallbackResult::Invalid(
      "Shared data context cannot be empty".to_string(),
    ));
  }

  // Validate expiry time is in the future
  if shared_data.expires_at <= shared_data.created_at {
    return Ok(ValidateCallbackResult::Invalid(
      "Shared data expiry time must be after creation time".to_string(),
    ));
  }

  Ok(ValidateCallbackResult::Valid)
}

pub fn validate_delete_shared_private_data() -> ExternResult<ValidateCallbackResult> {
  Ok(ValidateCallbackResult::Valid) // Allow deletion for cleanup and expiry
}
