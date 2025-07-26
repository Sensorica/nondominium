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
  /// The name of the role (e.g., "Community Steward")
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
  SimpleMember,
  CommunityAdvocate,
  CommunityFounder,
  CommunityCoordinator,
  CommunityModerator,
  ResourceCoordinator,
  ResourceSteward,
  GovernanceCoordinator,
}

impl Display for RoleType {
  fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
    match self {
      Self::SimpleMember => write!(f, "Simple Member"),
      Self::CommunityAdvocate => write!(f, "Community Advocate"),
      Self::CommunityFounder => write!(f, "Community Founder"),
      Self::CommunityCoordinator => write!(f, "Community Coordinator"),
      Self::CommunityModerator => write!(f, "Community Moderator"),
      Self::ResourceCoordinator => write!(f, "Resource Coordinator"),
      Self::ResourceSteward => write!(f, "Resource Steward"),
      Self::GovernanceCoordinator => write!(f, "Governance Coordinator"),
    }
  }
}

impl FromStr for RoleType {
  type Err = ();

  fn from_str(s: &str) -> Result<Self, Self::Err> {
    match s {
      "Simple Member" => Ok(Self::SimpleMember),
      "Community Advocate" => Ok(Self::CommunityAdvocate),
      "Community Founder" => Ok(Self::CommunityFounder),
      "Community Coordinator" => Ok(Self::CommunityCoordinator),
      "Community Moderator" => Ok(Self::CommunityModerator),
      "Resource Coordinator" => Ok(Self::ResourceCoordinator),
      "Resource Steward" => Ok(Self::ResourceSteward),
      "Governance Coordinator" => Ok(Self::GovernanceCoordinator),
      _ => Err(()),
    }
  }
}

#[hdk_entry_types]
#[unit_enum(UnitEntryTypes)]
pub enum EntryTypes {
  Person(Person),
  #[entry_type(visibility = "private")]
  PrivatePersonData(PrivatePersonData),
  PersonRole(PersonRole),
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
  // Person to their roles
  PersonToRoles,
  // Role updates (for versioning)
  RoleUpdates,
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
