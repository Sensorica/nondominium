use hdi::prelude::*;

/// Public profile for a group within a cloned cell.
#[hdk_entry_helper]
#[derive(Clone, PartialEq)]
pub struct GroupProfile {
    pub name: String,
    pub description: Option<String>,
    pub initiator: AgentPubKey,
    pub created_at: Timestamp,
}

/// Membership record linking an agent to a group.
#[hdk_entry_helper]
#[derive(Clone, PartialEq)]
pub struct GroupMembership {
    pub group_hash: ActionHash,
    pub member: AgentPubKey,
    pub role: Option<String>,
    pub joined_at: Timestamp,
}

/// Contribution record within the group context (planning-only, no PPRs).
#[hdk_entry_helper]
#[derive(Clone, PartialEq)]
pub struct WorkLog {
    pub group_hash: ActionHash,
    pub author: AgentPubKey,
    pub description: String,
    pub hours: f32,
    pub logged_at: Timestamp,
}

/// Planning-level link to an NDO (dashed border in UI).
/// ADR-GROUP-04: SoftLinks do not generate PPRs or EconomicEvents.
#[hdk_entry_helper]
#[derive(Clone, PartialEq)]
pub struct SoftLink {
    pub group_hash: ActionHash,
    pub target_ndo_hash: ActionHash,
    pub description: Option<String>,
    pub created_by: AgentPubKey,
    pub created_at: Timestamp,
}

/// Group-scoped governance rule (subset of nondominium GovernanceRule).
#[hdk_entry_helper]
#[derive(Clone, PartialEq)]
pub struct GroupGovernanceRule {
    pub group_hash: ActionHash,
    pub rule_type: String,
    pub rule_data: String,
    pub created_by: AgentPubKey,
    pub created_at: Timestamp,
}

#[hdk_entry_types]
#[unit_enum(UnitEntryTypes)]
pub enum EntryTypes {
    GroupProfile(GroupProfile),
    GroupMembership(GroupMembership),
    WorkLog(WorkLog),
    SoftLink(SoftLink),
    GroupGovernanceRule(GroupGovernanceRule),
}

#[hdk_link_types]
pub enum LinkTypes {
    AllGroups,              // Anchor("groups") → GroupProfile
    GroupUpdates,           // GroupProfile → GroupProfile (versioning)
    GroupToMembers,         // GroupProfile → GroupMembership
    MemberToGroups,         // AgentPubKey → GroupProfile
    GroupToWorkLogs,        // GroupProfile → WorkLog
    AgentToWorkLogs,        // AgentPubKey → WorkLog
    GroupToSoftLinks,       // GroupProfile → SoftLink
    GroupToGovernanceRules, // GroupProfile → GroupGovernanceRule
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

#[allow(clippy::collapsible_match, clippy::single_match)]
#[hdk_extern]
pub fn validate(op: Op) -> ExternResult<ValidateCallbackResult> {
    if let FlatOp::StoreEntry(store_entry) = op.flattened::<EntryTypes, LinkTypes>()? {
        match store_entry {
            OpEntry::CreateEntry { app_entry, .. } | OpEntry::UpdateEntry { app_entry, .. } => {
                match app_entry {
                    EntryTypes::GroupProfile(profile) => {
                        return validate_group_profile(profile);
                    }
                    EntryTypes::GroupMembership(membership) => {
                        return validate_group_membership(membership);
                    }
                    EntryTypes::WorkLog(work_log) => {
                        return validate_work_log(work_log);
                    }
                    EntryTypes::SoftLink(soft_link) => {
                        return validate_soft_link(soft_link);
                    }
                    EntryTypes::GroupGovernanceRule(rule) => {
                        return validate_group_governance_rule(rule);
                    }
                }
            }
            _ => (),
        }
    }
    Ok(ValidateCallbackResult::Valid)
}

pub fn validate_group_profile(profile: GroupProfile) -> ExternResult<ValidateCallbackResult> {
    if profile.name.trim().is_empty() {
        return Ok(ValidateCallbackResult::Invalid(
            "Group name cannot be empty".to_string(),
        ));
    }
    if profile.name.len() > 100 {
        return Ok(ValidateCallbackResult::Invalid(
            "Group name too long (max 100 characters)".to_string(),
        ));
    }
    Ok(ValidateCallbackResult::Valid)
}

pub fn validate_group_membership(
    membership: GroupMembership,
) -> ExternResult<ValidateCallbackResult> {
    if membership.group_hash.get_raw_39().is_empty() {
        return Ok(ValidateCallbackResult::Invalid(
            "GroupMembership.group_hash cannot be empty".to_string(),
        ));
    }
    Ok(ValidateCallbackResult::Valid)
}

pub fn validate_work_log(work_log: WorkLog) -> ExternResult<ValidateCallbackResult> {
    if work_log.description.trim().is_empty() {
        return Ok(ValidateCallbackResult::Invalid(
            "WorkLog description cannot be empty".to_string(),
        ));
    }
    if work_log.hours <= 0.0 {
        return Ok(ValidateCallbackResult::Invalid(
            "WorkLog hours must be greater than 0".to_string(),
        ));
    }
    Ok(ValidateCallbackResult::Valid)
}

pub fn validate_soft_link(soft_link: SoftLink) -> ExternResult<ValidateCallbackResult> {
    if soft_link.group_hash.get_raw_39().is_empty() {
        return Ok(ValidateCallbackResult::Invalid(
            "SoftLink.group_hash cannot be empty".to_string(),
        ));
    }
    Ok(ValidateCallbackResult::Valid)
}

pub fn validate_group_governance_rule(
    rule: GroupGovernanceRule,
) -> ExternResult<ValidateCallbackResult> {
    if rule.rule_type.trim().is_empty() {
        return Ok(ValidateCallbackResult::Invalid(
            "GroupGovernanceRule.rule_type cannot be empty".to_string(),
        ));
    }
    Ok(ValidateCallbackResult::Valid)
}
