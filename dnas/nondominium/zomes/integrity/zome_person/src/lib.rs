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
pub fn validate(_op: Op) -> ExternResult<ValidateCallbackResult> {
    // For Phase 1, we'll implement basic validation
    // More complex validation will be added in Phase 2
    Ok(ValidateCallbackResult::Valid)
}
