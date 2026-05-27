use hdi::prelude::*;
// AgentPubKey and Timestamp are not stored in entries — identity and timestamps
// come from action headers (record.action().author() / record.action().timestamp()).

/// Public profile for a group within a cloned cell.
/// Identity (initiator) and timestamp come from the action header — not stored in the entry.
#[hdk_entry_helper]
#[derive(Clone, PartialEq)]
pub struct GroupProfile {
    pub name: String,
    pub description: Option<String>,
}

/// Membership record linking an agent to a group.
/// The joining agent is the action author; join timestamp comes from the action header.
#[hdk_entry_helper]
#[derive(Clone, PartialEq)]
pub struct GroupMembership {
    pub group_hash: ActionHash,
    pub role: Option<String>,
}

/// Contribution record within the group context (planning-only, no PPRs).
/// Author and timestamp come from the action header — not stored in the entry.
#[hdk_entry_helper]
#[derive(Clone, PartialEq)]
pub struct WorkLog {
    pub group_hash: ActionHash,
    pub description: String,
    pub hours: f32,
}

/// Planning-level link to an NDO. Groups host NDOs; NDOs travel group-to-group
/// through agents who are members of multiple groups (Lobby → Groups → NDOs).
/// ADR-GROUP-04: SoftLinks do not generate PPRs or EconomicEvents.
/// Creator and timestamp come from the action header — not stored in the entry.
#[hdk_entry_helper]
#[derive(Clone, PartialEq)]
pub struct SoftLink {
    pub group_hash: ActionHash,
    pub target_ndo_hash: ActionHash,
    pub description: Option<String>,
}

#[hdk_entry_types]
#[unit_enum(UnitEntryTypes)]
pub enum EntryTypes {
    GroupProfile(GroupProfile),
    GroupMembership(GroupMembership),
    WorkLog(WorkLog),
    SoftLink(SoftLink),
}

#[hdk_link_types]
pub enum LinkTypes {
    AllGroups,     // Anchor("all_groups") → GroupProfile
    GroupUpdates,  // GroupProfile → GroupProfile (versioning)
    GroupToMembers,  // GroupProfile → GroupMembership
    MemberToGroups,  // AgentPubKey → GroupProfile
    GroupToWorkLogs, // GroupProfile → WorkLog
    AgentToWorkLogs, // AgentPubKey → WorkLog
    GroupToSoftLinks, // GroupProfile → SoftLink
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
    _membership: GroupMembership,
) -> ExternResult<ValidateCallbackResult> {
    // ActionHash is always 39 bytes; existence cannot be verified from the integrity
    // context. Semantic validation (group exists) happens in the coordinator.
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

pub fn validate_soft_link(_soft_link: SoftLink) -> ExternResult<ValidateCallbackResult> {
    // ActionHash is always 39 bytes; existence cannot be verified from the integrity
    // context. Semantic validation happens in the coordinator.
    Ok(ValidateCallbackResult::Valid)
}
