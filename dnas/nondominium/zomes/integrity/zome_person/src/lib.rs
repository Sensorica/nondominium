use hdi::prelude::*;

#[hdk_entry_helper]
#[derive(Clone, PartialEq)]
pub struct Person {
    pub agent_pub_key: AgentPubKey,
    pub name: String,
    pub avatar_url: Option<String>,
    pub created_at: Timestamp,
}

// Replace custom encryption with Holochain's private entries
#[hdk_entry_helper]
#[derive(Clone, PartialEq)]
pub struct PrivateAgentData {
    pub legal_name: String,
    pub address: String,
    pub email: String,
    pub phone: Option<String>,
    pub photo_id_hash: Option<String>,
    pub emergency_contact: Option<String>,
    pub created_at: Timestamp,
}

#[hdk_entry_helper]
#[derive(Clone, PartialEq)]
pub struct AgentRole {
    pub role_name: String,
    pub description: Option<String>,
    pub assigned_to: AgentPubKey,
    pub assigned_by: AgentPubKey, // Must be an Accountable Agent
    pub assigned_at: Timestamp,
    pub validation_metadata: Option<String>, // JSON metadata about role validation
}

#[hdk_entry_types]
#[unit_enum(UnitEntryTypes)]
#[derive(Serialize, Deserialize, SerializedBytes)]
pub enum EntryTypes {
    Person(Person),

    #[entry_type(visibility = "private")]
    PrivateAgentData(PrivateAgentData), // Private entry - only accessible by creating agent

    AgentRole(AgentRole),
}

#[hdk_link_types]
pub enum LinkTypes {
    AllPeople,
    PersonToPrivateData, // Link from public profile to private data
    PersonToRole,
}

#[hdk_extern]
pub fn genesis_self_check(_data: GenesisSelfCheckData) -> ExternResult<ValidateCallbackResult> {
    Ok(ValidateCallbackResult::Valid)
}

pub fn validate_agent_joining(
    _agent_pub_key: AgentPubKey,
    _membrane_proof: &MembraneProof,
) -> ExternResult<ValidateCallbackResult> {
    // For this proof of concept, access is permissionless
    // but we maintain the hook for future membrane implementation
    Ok(ValidateCallbackResult::Valid)
}

#[hdk_extern]
pub fn validate(op: Op) -> ExternResult<ValidateCallbackResult> {
    match op.flattened::<EntryTypes, LinkTypes>()? {
        FlatOp::StoreEntry(store_entry) => match store_entry {
            OpEntry::CreateEntry { app_entry, action } => match app_entry {
                EntryTypes::Person(person) => validate_create_person(&person, &action.author),
                EntryTypes::PrivateAgentData(private_data) => {
                    validate_create_private_data(&private_data, &action.author)
                }
                EntryTypes::AgentRole(role) => validate_create_agent_role(&role, &action.author),
            },
            OpEntry::UpdateEntry {
                app_entry, action, ..
            } => match app_entry {
                EntryTypes::Person(person) => validate_update_person(&person, &action.author),
                EntryTypes::PrivateAgentData(private_data) => {
                    validate_update_private_data(&private_data, &action.author)
                }
                EntryTypes::AgentRole(role) => validate_update_agent_role(&role, &action.author),
            },
            _ => Ok(ValidateCallbackResult::Valid),
        },
        FlatOp::StoreRecord(OpRecord::CreateLink { link_type, .. }) => match link_type {
            LinkTypes::AllPeople => Ok(ValidateCallbackResult::Valid),
            LinkTypes::PersonToPrivateData => Ok(ValidateCallbackResult::Valid),
            LinkTypes::PersonToRole => Ok(ValidateCallbackResult::Valid),
        },
        FlatOp::StoreRecord(OpRecord::DeleteLink { .. }) => {
            // Allow link deletion for custody transfers and role updates
            Ok(ValidateCallbackResult::Valid)
        }
        _ => Ok(ValidateCallbackResult::Valid),
    }
}

fn validate_create_person(
    person: &Person,
    author: &AgentPubKey,
) -> ExternResult<ValidateCallbackResult> {
    // Validate person entry
    if person.name.trim().is_empty() {
        return Ok(ValidateCallbackResult::Invalid(
            "Person name cannot be empty".to_string(),
        ));
    }

    if person.name.len() > 100 {
        return Ok(ValidateCallbackResult::Invalid(
            "Person name too long (max 100 characters)".to_string(),
        ));
    }

    // TODO: Remove agent_pub_key from the person entry. We will use the author metadata instead.
    // Validate that agent_pub_key matches the action author
    if person.agent_pub_key != *author {
        return Ok(ValidateCallbackResult::Invalid(
            "Person can only be created by the associated agent".to_string(),
        ));
    }

    // Validate avatar URL format if provided
    if let Some(ref avatar_url) = person.avatar_url {
        if !avatar_url.starts_with("http://") && !avatar_url.starts_with("https://") {
            return Ok(ValidateCallbackResult::Invalid(
                "Avatar URL must be a valid HTTP/HTTPS URL".to_string(),
            ));
        }
    }

    Ok(ValidateCallbackResult::Valid)
}

fn validate_create_private_data(
    private_data: &PrivateAgentData,
    _author: &AgentPubKey,
) -> ExternResult<ValidateCallbackResult> {
    // Validate private agent data
    if private_data.legal_name.trim().is_empty() {
        return Ok(ValidateCallbackResult::Invalid(
            "Legal name cannot be empty".to_string(),
        ));
    }

    if private_data.address.trim().is_empty() {
        return Ok(ValidateCallbackResult::Invalid(
            "Address cannot be empty".to_string(),
        ));
    }

    if private_data.email.trim().is_empty() || !private_data.email.contains('@') {
        return Ok(ValidateCallbackResult::Invalid(
            "Valid email address is required".to_string(),
        ));
    }

    // Basic email validation
    if private_data.email.len() > 254 {
        return Ok(ValidateCallbackResult::Invalid(
            "Email address too long".to_string(),
        ));
    }

    Ok(ValidateCallbackResult::Valid)
}

fn validate_create_agent_role(
    role: &AgentRole,
    author: &AgentPubKey,
) -> ExternResult<ValidateCallbackResult> {
    // Validate agent role assignment
    if role.role_name.trim().is_empty() {
        return Ok(ValidateCallbackResult::Invalid(
            "Role name cannot be empty".to_string(),
        ));
    }

    if role.role_name.len() > 50 {
        return Ok(ValidateCallbackResult::Invalid(
            "Role name too long (max 50 characters)".to_string(),
        ));
    }

    // Validate that assigned_by matches the action author
    if role.assigned_by != *author {
        return Ok(ValidateCallbackResult::Invalid(
            "Role can only be assigned by the action author".to_string(),
        ));
    }

    // For Phase 1, allow any agent to assign roles
    // Phase 2 will add proper authorization checks

    Ok(ValidateCallbackResult::Valid)
}

fn validate_update_person(
    _person: &Person,
    _author: &AgentPubKey,
) -> ExternResult<ValidateCallbackResult> {
    // For Phase 1, allow person updates by the same agent
    // Phase 2 will add more sophisticated update validation
    Ok(ValidateCallbackResult::Valid)
}

fn validate_update_private_data(
    _private_data: &PrivateAgentData,
    _author: &AgentPubKey,
) -> ExternResult<ValidateCallbackResult> {
    // Private data can only be updated by the owning agent (enforced by private entry visibility)
    Ok(ValidateCallbackResult::Valid)
}

fn validate_update_agent_role(
    _role: &AgentRole,
    _author: &AgentPubKey,
) -> ExternResult<ValidateCallbackResult> {
    // Role updates allowed for now
    // Phase 2 will add role hierarchy validation
    Ok(ValidateCallbackResult::Valid)
}
