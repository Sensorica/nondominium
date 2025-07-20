use hdi::prelude::*;

#[hdk_entry_helper]
#[derive(Clone, PartialEq)]
pub struct ValidationReceipt {
    pub validator: AgentPubKey,
    pub validated_item: ActionHash, // Link to the item being validated (Resource, Event, etc.)
    pub validation_type: String, // e.g., "resource_approval", "process_validation", "identity_verification"
    pub approved: bool,
    pub notes: Option<String>,
    pub validated_at: Timestamp,
}

#[hdk_entry_helper]
#[derive(Clone, PartialEq)]
pub struct EconomicEvent {
    pub action: String, // e.g., "transfer-custody", "use", "produce"
    pub provider: AgentPubKey,
    pub receiver: AgentPubKey,
    pub resource_inventoried_as: ActionHash, // Link to the EconomicResource
    pub affects: ActionHash,                 // Link to the EconomicResource that is affected
    pub resource_quantity: f64,
    pub event_time: Timestamp,
    pub note: Option<String>,
}

#[hdk_entry_helper]
#[derive(Clone, PartialEq)]
pub struct Commitment {
    pub action: String, // The intended action (e.g., "access-for-use")
    pub provider: AgentPubKey,
    pub receiver: AgentPubKey,
    pub resource_inventoried_as: Option<ActionHash>, // Link to specific resource if applicable
    pub resource_conforms_to: Option<ActionHash>,    // Link to ResourceSpecification if general
    pub input_of: Option<ActionHash>,                // Optional link to a Process
    pub due_date: Timestamp,
    pub note: Option<String>,
    pub committed_at: Timestamp,
}

#[hdk_entry_helper]
#[derive(Clone, PartialEq)]
pub struct Claim {
    pub fulfills: ActionHash,     // Link to the Commitment
    pub fulfilled_by: ActionHash, // Link to the resulting EconomicEvent
    pub claimed_at: Timestamp,
    pub note: Option<String>,
}

#[hdk_entry_helper]
#[derive(Clone, PartialEq)]
pub struct ResourceValidation {
    pub resource: ActionHash, // Link to the EconomicResource being validated
    pub validation_scheme: String, // e.g., "2-of-3", "simple_majority"
    pub required_validators: u32,
    pub current_validators: u32,
    pub status: String, // "pending", "approved", "rejected"
    pub created_at: Timestamp,
    pub updated_at: Timestamp,
}

#[hdk_entry_types]
#[unit_enum(UnitEntryTypes)]
pub enum EntryTypes {
    ValidationReceipt(ValidationReceipt),
    EconomicEvent(EconomicEvent),
    Commitment(Commitment),
    Claim(Claim),
    ResourceValidation(ResourceValidation),
}

#[hdk_link_types]
pub enum LinkTypes {
    ValidatedItemToReceipt,
    ResourceToValidation,
    CommitmentToClaim,
    ResourceToEvent,
    AllValidationReceipts,
    AllEconomicEvents,
    AllCommitments,
    AllClaims,
    AllResourceValidations,
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
