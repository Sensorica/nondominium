use hdi::prelude::*;

#[hdk_entry_helper]
#[derive(Clone, PartialEq)]
pub struct ResourceSpecification {
    pub name: String,
    pub description: String,
    pub image_url: Option<String>,
    pub governance_rules: Vec<ActionHash>, // Links to GovernanceRule entries
    pub created_by: AgentPubKey,
    pub created_at: Timestamp,
}

#[hdk_entry_helper]
#[derive(Clone, PartialEq)]
pub struct GovernanceRule {
    pub rule_type: String, // e.g., "access_requirement", "usage_limit", "transfer_conditions"
    pub rule_data: String, // JSON-encoded rule parameters
    pub enforced_by: Option<String>, // Role required to enforce this rule
    pub created_by: AgentPubKey,
    pub created_at: Timestamp,
}

#[hdk_entry_helper]
#[derive(Clone, PartialEq)]
pub struct EconomicResource {
    pub conforms_to: ActionHash, // Link to ResourceSpecification
    pub quantity: f64,
    pub unit: String,
    pub custodian: AgentPubKey, // The Primary Accountable Agent holding the resource
    pub created_by: AgentPubKey, // Who created this resource instance
    pub created_at: Timestamp,
    pub current_location: Option<String>, // Physical or virtual location
    pub state: String,                    // "active", "maintenance", "retired", etc.
}

#[hdk_entry_types]
#[unit_enum(UnitEntryTypes)]
#[derive(Serialize, Deserialize, SerializedBytes)]
pub enum EntryTypes {
    ResourceSpecification(ResourceSpecification),
    EconomicResource(EconomicResource),
    GovernanceRule(GovernanceRule),
}

#[hdk_link_types]
pub enum LinkTypes {
    AllResourceSpecifications,
    AllEconomicResources,
    SpecificationToResource,
    CustodianToResource,
    SpecificationToGovernanceRule,
    ResourceSpecToGovernanceRule,
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
    Ok(ValidateCallbackResult::Valid)
}

#[hdk_extern]
pub fn validate(_op: Op) -> ExternResult<ValidateCallbackResult> {
    // For Phase 1, we'll implement basic validation
    // More complex validation will be added in Phase 2
    Ok(ValidateCallbackResult::Valid)
}
