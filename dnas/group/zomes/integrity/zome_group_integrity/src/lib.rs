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

/// Admission status of a commitment in a Group used as a Commitment Pool.
///
/// Withdrawal is modelled as a *status marker on the same anchor* instead of a
/// delete-link / tombstone, so a Group keeps **pool memory**: readers can
/// still see that commitment X was once admitted and then withdrawn, by whom,
/// and when. This matches Grassroots Economics' pool semantics — a pool's
/// history is itself governance signal.
#[derive(Clone, PartialEq, Debug, Serialize, Deserialize, SerializedBytes)]
pub enum CommitmentAdmissionStatus {
    /// Currently admitted — counts toward the pool's active contents.
    Admitted,
    /// Previously admitted, now withdrawn. The anchor stays on the DHT.
    Withdrawn,
}

/// Authoritative pointer from a Group (used here as a Commitment Pool) to a
/// Commitment living on a Nondominium NDO cell.
///
/// Symmetric to `NdoAnchor`: carries the full cross-cell coordinates
/// (`ndo_dna_hash`, `network_seed`, `identity_action_hash`) that a reader
/// needs to re-derive the NDO clone and look up the commitment there. The
/// `commitment_action_hash` is the pointer into the governance zome's
/// `all_commitments` entries.
///
/// A commitment can be anchored by many groups — one commitment, N anchors,
/// same underlying NDO identity. This is how cross-pool continuity works
/// without duplicating the commitment data.
///
/// Admission is permissionless **within group membership**: any member can
/// admit any commitment (regardless of whether the NDO sits in this group).
/// Governance happens later, on the commitment itself, when it is fulfilled.
///
/// The `status` field + `status_changed_at` form the lightweight withdrawal
/// mechanism: an update rewrites the status to `Withdrawn` and keeps the
/// anchor in place as pool memory.
///
/// Author (admitting member) and anchoring timestamp come from the action
/// header.
#[hdk_entry_helper]
#[derive(Clone, PartialEq)]
pub struct CommitmentAnchor {
    /// Group that owns this pool anchor.
    pub group_hash: ActionHash,
    /// Full NDO cell coordinates — same pattern as `NdoAnchor`, so a reader
    /// can clone/join the NDO cell and verify the commitment lives there.
    pub ndo_dna_hash: DnaHash,
    pub network_seed: String,
    pub identity_action_hash: ActionHash, // NDO Layer 0 genesis action hash
    /// The Commitment entry's `ActionHash` inside the NDO cell's governance
    /// zome. The source of truth for shape (action/provider/receiver/
    /// resource_quantity/effort_quantity/due_date/note) lives there.
    pub commitment_action_hash: ActionHash,
    /// Current admission status in this pool.
    pub status: CommitmentAdmissionStatus,
    /// Timestamp when the status last changed. On create this equals the
    /// action's timestamp conceptually; on withdrawal updates it is bumped
    /// so UIs can show "admitted → withdrawn X days ago".
    pub status_changed_at: Timestamp,
}

#[hdk_entry_types]
#[unit_enum(UnitEntryTypes)]
pub enum EntryTypes {
    GroupProfile(GroupProfile),
    GroupMembership(GroupMembership),
    WorkLog(WorkLog),
    SoftLink(SoftLink),
    NdoAnchor(NdoAnchor),
    CommitmentAnchor(CommitmentAnchor),
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
    GroupToCommitmentAnchors, // GroupProfile → CommitmentAnchor
    CommitmentAnchorUpdates,  // CommitmentAnchor → CommitmentAnchor (status marker)
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
    match op.flattened::<EntryTypes, LinkTypes>()? {
        FlatOp::StoreEntry(store_entry) => match store_entry {
            OpEntry::CreateEntry { app_entry, .. } | OpEntry::UpdateEntry { app_entry, .. } => {
                match app_entry {
                    EntryTypes::GroupProfile(profile) => validate_group_profile(profile),
                    EntryTypes::GroupMembership(membership) => {
                        validate_group_membership(membership)
                    }
                    EntryTypes::WorkLog(work_log) => validate_work_log(work_log),
                    EntryTypes::SoftLink(soft_link) => validate_soft_link(soft_link),
                    EntryTypes::NdoAnchor(ndo_anchor) => validate_ndo_anchor(ndo_anchor),
                    EntryTypes::CommitmentAnchor(commitment_anchor) => {
                        validate_commitment_anchor(commitment_anchor)
                    }
                }
            }
            _ => Ok(ValidateCallbackResult::Valid),
        },
        // An anchor update may refresh the cached descriptor (name, description,
        // lifecycle_stage) and nothing else: the identity coordinates are what peers
        // re-derive the NDO cell from, so a rewrite would silently repoint the group
        // at a different network. Enforced here rather than trusted to the
        // coordinator, because any group member may update any anchor.
        FlatOp::RegisterUpdate(OpUpdate::Entry {
            app_entry: EntryTypes::NdoAnchor(updated),
            action,
        }) => validate_ndo_anchor_update(action.original_action_address, updated),
        // A CommitmentAnchor update is the withdrawal mechanism: only the
        // `status` and `status_changed_at` fields may change. Every pointer
        // field (group, NDO cell coordinates, commitment hash) is immutable
        // so the anchor cannot be silently repointed at a different
        // commitment, and the pool-memory invariant holds.
        FlatOp::RegisterUpdate(OpUpdate::Entry {
            app_entry: EntryTypes::CommitmentAnchor(updated),
            action,
        }) => validate_commitment_anchor_update(action.original_action_address, updated),
        _ => Ok(ValidateCallbackResult::Valid),
    }
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

pub fn validate_commitment_anchor(
    anchor: CommitmentAnchor,
) -> ExternResult<ValidateCallbackResult> {
    if anchor.network_seed.trim().is_empty() {
        return Ok(ValidateCallbackResult::Invalid(
            "CommitmentAnchor network_seed cannot be empty".to_string(),
        ));
    }
    // We can't verify cross-cell existence of the commitment from the
    // integrity context — same reasoning as `NdoAnchor`. A reader validates
    // by cloning the NDO cell from the carried coordinates and resolving
    // `commitment_action_hash` there.
    Ok(ValidateCallbackResult::Valid)
}

/// A `CommitmentAnchor` update is the pool-memory-preserving withdrawal
/// mechanism. Only `status` and `status_changed_at` may change. Anything
/// else — the pool reference, the NDO cell coordinates, the commitment
/// hash — is immutable: silently repointing the anchor would both corrupt
/// pool history and break the cross-cell lookup contract.
pub fn validate_commitment_anchor_update(
    original_action_hash: ActionHash,
    updated: CommitmentAnchor,
) -> ExternResult<ValidateCallbackResult> {
    let original_record = must_get_valid_record(original_action_hash)?;
    let Some(original) = original_record
        .entry()
        .to_app_option::<CommitmentAnchor>()
        .map_err(|e| wasm_error!(WasmErrorInner::Serialize(e)))?
    else {
        return Ok(ValidateCallbackResult::Invalid(
            "A CommitmentAnchor update must supersede a CommitmentAnchor entry".to_string(),
        ));
    };

    let permitted = CommitmentAnchor {
        status: updated.status.clone(),
        status_changed_at: updated.status_changed_at,
        ..original
    };
    if permitted != updated {
        return Ok(ValidateCallbackResult::Invalid(
            "CommitmentAnchor pointer fields are immutable: an update may only change \
             status and status_changed_at"
                .to_string(),
        ));
    }

    Ok(ValidateCallbackResult::Valid)
}

/// An `NdoAnchor` update may only refresh the cached descriptor fields — `name`,
/// `description`, `lifecycle_stage`. Everything else identifies the NDO cell
/// (`ndo_dna_hash`, `network_seed`, `identity_action_hash`) or is a DNA property
/// input a peer re-derives the DnaHash from (`initiator`, `ndo_created_at`,
/// `property_regime`, `resource_nature`), plus the owning `group_hash`.
///
/// Written as "rebuild the original with the mutable fields swapped in, then
/// compare" so a field added to `NdoAnchor` later is immutable by default and has
/// to be opted into mutability here deliberately.
pub fn validate_ndo_anchor_update(
    original_action_hash: ActionHash,
    updated: NdoAnchor,
) -> ExternResult<ValidateCallbackResult> {
    let original_record = must_get_valid_record(original_action_hash)?;
    let Some(original) = original_record
        .entry()
        .to_app_option::<NdoAnchor>()
        .map_err(|e| wasm_error!(WasmErrorInner::Serialize(e)))?
    else {
        return Ok(ValidateCallbackResult::Invalid(
            "An NdoAnchor update must supersede an NdoAnchor entry".to_string(),
        ));
    };

    let permitted = NdoAnchor {
        name: updated.name.clone(),
        description: updated.description.clone(),
        lifecycle_stage: updated.lifecycle_stage.clone(),
        ..original
    };
    if permitted != updated {
        return Ok(ValidateCallbackResult::Invalid(
            "NdoAnchor identity coordinates are immutable: an update may only change \
             name, description, and lifecycle_stage"
                .to_string(),
        ));
    }

    Ok(ValidateCallbackResult::Valid)
}
