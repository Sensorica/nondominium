use hdi::prelude::*;

#[hdk_entry_helper]
#[derive(Clone, PartialEq)]
pub struct Person {
    pub agent_pub_key: AgentPubKey,
    pub name: String,
    pub avatar_url: Option<String>,
    pub created_at: Timestamp,
}

#[hdk_entry_helper]
#[derive(Clone, PartialEq)]
pub struct EncryptedAgentData {
    pub agent_pub_key: AgentPubKey,
    pub encrypted_data: Vec<u8>, // Encrypted blob containing PII (legal name, address, email, photo ID hash)
    pub encryption_method: String, // Method used for encryption
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
    EncryptedAgentData(EncryptedAgentData),
    AgentRole(AgentRole),
}

#[hdk_link_types]
pub enum LinkTypes {
    AllPeople,
    PersonToEncryptedData,
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
