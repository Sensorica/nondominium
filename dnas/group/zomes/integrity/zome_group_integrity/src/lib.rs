use hdi::prelude::*;
use nondominium_shared::{LifecycleStage, PropertyRegime, ResourceNature};
// AgentPubKey and Timestamp are not stored in entries — identity and timestamps
// come from action headers (record.action().author() / record.action().timestamp()).
// Exception: NdoAnchor carries the referenced NDO's initiator and created_at — those
// describe the NDO (DNA property inputs), not the anchor's author.

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

/// Authoritative pointer from a group to an NDO cell (one NDO = one cloned DHT cell).
/// Fixes the bare-ActionHash weakness of SoftLink: the anchor carries the full
/// `(ndo_dna_hash, network_seed)` coordinates plus the DNA property inputs
/// (name, initiator, ndo_created_at, regime, nature), so any reader can re-derive
/// the clone, verify `ndo_dna_hash` as a pinning check, and join the NDO network.
/// `lifecycle_stage`, `name`, and `description` are best-effort caches for browsing;
/// the source of truth is the NondominiumIdentity genesis entry inside the NDO cell.
/// Anchor author and anchoring timestamp come from the action header.
#[hdk_entry_helper]
#[derive(Clone, PartialEq)]
pub struct NdoAnchor {
    pub group_hash: ActionHash,
    pub name: String,                     // cached from DNA properties
    pub description: Option<String>,
    pub ndo_dna_hash: DnaHash,            // THE permanent NDO identity (ADR-010)
    pub network_seed: String,             // needed to clone/join the cell
    pub identity_action_hash: ActionHash, // Layer 0 genesis entry inside the NDO cell
    pub initiator: AgentPubKey,           // DNA property input — the NDO's initiator
    pub ndo_created_at: Timestamp,        // DNA property input — the NDO's creation time
    pub lifecycle_stage: LifecycleStage,  // cached, best-effort synced
    pub property_regime: PropertyRegime,  // immutable classification (DNA property)
    pub resource_nature: ResourceNature,  // immutable classification (DNA property)
}

#[hdk_entry_types]
#[unit_enum(UnitEntryTypes)]
pub enum EntryTypes {
    GroupProfile(GroupProfile),
    GroupMembership(GroupMembership),
    WorkLog(WorkLog),
    SoftLink(SoftLink),
    NdoAnchor(NdoAnchor),
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
    GroupToNdoAnchors, // GroupProfile → NdoAnchor
    NdoAnchorUpdates,  // NdoAnchor → NdoAnchor (cached descriptor sync)
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
                    EntryTypes::NdoAnchor(ndo_anchor) => {
                        return validate_ndo_anchor(ndo_anchor);
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

pub fn validate_ndo_anchor(ndo_anchor: NdoAnchor) -> ExternResult<ValidateCallbackResult> {
    if ndo_anchor.name.trim().is_empty() {
        return Ok(ValidateCallbackResult::Invalid(
            "NdoAnchor name cannot be empty".to_string(),
        ));
    }
    if ndo_anchor.name.len() > 100 {
        return Ok(ValidateCallbackResult::Invalid(
            "NdoAnchor name too long (max 100 characters)".to_string(),
        ));
    }
    if ndo_anchor.network_seed.trim().is_empty() {
        return Ok(ValidateCallbackResult::Invalid(
            "NdoAnchor network_seed cannot be empty".to_string(),
        ));
    }
    // The (ndo_dna_hash, network_seed, properties) coordinates cannot be verified from
    // the integrity context — cross-cell verification is the reader's pinning check:
    // re-derive the clone from the anchor fields and compare the resulting DnaHash.
    Ok(ValidateCallbackResult::Valid)
}
