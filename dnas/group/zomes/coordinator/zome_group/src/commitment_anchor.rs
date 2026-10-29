//! Commitment Pool anchors — Group DNA side.
//!
//! Groups double as **Commitment Pools**: a group member can admit any
//! commitment living on any Nondominium NDO cell by writing a
//! `CommitmentAnchor` on this group's DHT, and can withdraw it later by
//! updating the anchor's `status` to `Withdrawn` (status marker, not delete,
//! so the pool keeps memory of past admissions — see
//! `zome_group_integrity::CommitmentAnchor` doc).
//!
//! Admission is permissionless *within group membership*: any member can
//! admit any commitment, regardless of whether the underlying NDO is itself
//! anchored to this group. Governance happens later, on the commitment, when
//! it is fulfilled (that's in the Nondominium DNA, not here).
//!
//! Reads: `get_pool_contents(group_hash)` returns every anchor (admitted +
//! withdrawn) with its latest status, so UIs can show "active commitments"
//! and "withdrawn commitments" without a second query.

use crate::GroupError;
use hdk::prelude::*;
use zome_group_integrity::*;

/// Input to `admit_commitment` — the pool-side half of the data needed to
/// resolve a commitment that lives on a different (NDO) cell. Together with
/// the `commitment_action_hash` it is enough for a reader to clone the NDO
/// cell and fetch the commitment entry.
#[derive(Debug, Serialize, Deserialize)]
pub struct AdmitCommitmentInput {
  pub group_hash: ActionHash,
  pub ndo_dna_hash: DnaHash,
  pub network_seed: String,
  pub identity_action_hash: ActionHash,
  pub commitment_action_hash: ActionHash,
}

/// Admits a commitment into this group's Commitment Pool. Any current group
/// member may call this; membership validation is enforced by the Group DNA's
/// `GroupMembership` entries, not here. The anchor starts in
/// [`CommitmentAdmissionStatus::Admitted`] with its creation timestamp.
#[hdk_extern]
pub fn admit_commitment(input: AdmitCommitmentInput) -> ExternResult<Record> {
  let now = sys_time()?;
  let anchor = CommitmentAnchor {
    group_hash: input.group_hash.clone(),
    ndo_dna_hash: input.ndo_dna_hash,
    network_seed: input.network_seed,
    identity_action_hash: input.identity_action_hash,
    commitment_action_hash: input.commitment_action_hash,
    status: CommitmentAdmissionStatus::Admitted,
    status_changed_at: now,
  };

  let anchor_hash = create_entry(&EntryTypes::CommitmentAnchor(anchor))?;
  let record = get(anchor_hash.clone(), GetOptions::default())?.ok_or(
    GroupError::EntryOperationFailed("Failed to retrieve admitted commitment anchor".to_string()),
  )?;

  create_link(
    input.group_hash,
    anchor_hash,
    LinkTypes::GroupToCommitmentAnchors,
    (),
  )?;

  Ok(record)
}

/// Input to `withdraw_commitment`. The caller passes the current latest
/// anchor hash so the integrity-enforced immutability check runs against the
/// correct previous version.
#[derive(Debug, Serialize, Deserialize)]
pub struct WithdrawCommitmentInput {
  /// Hash of the very first create action for this anchor — the stable key
  /// used by `GroupToCommitmentAnchors` + `CommitmentAnchorUpdates`.
  pub original_action_hash: ActionHash,
  /// Hash of the current latest action for this anchor (what the update must
  /// supersede). May equal `original_action_hash` on the first withdrawal.
  pub previous_action_hash: ActionHash,
}

/// Marks a commitment anchor as [`CommitmentAdmissionStatus::Withdrawn`]
/// while leaving every pointer field untouched. The pool keeps the anchor
/// — pool memory — but downstream `get_pool_contents` consumers can filter
/// on `status` to show only active commitments.
#[hdk_extern]
pub fn withdraw_commitment(input: WithdrawCommitmentInput) -> ExternResult<Record> {
  let original_record = must_get_valid_record(input.original_action_hash.clone())?;
  let original: CommitmentAnchor = original_record
    .entry()
    .to_app_option()
    .map_err(|e| wasm_error!(WasmErrorInner::Serialize(e)))?
    .ok_or_else(|| {
      GroupError::EntryOperationFailed("Failed to decode CommitmentAnchor entry".to_string())
    })?;

  // Resolve the current latest to catch stale `previous_action_hash` callers.
  // The actual immutability enforcement happens in integrity; this just
  // short-circuits with a clearer error if the caller is behind.
  let Some((latest_hash, _latest_record)) = latest_commitment_anchor(input.original_action_hash)?
  else {
    return Err(GroupError::EntryOperationFailed(
      "CommitmentAnchor has no latest version — DHT inconsistency".to_string(),
    )
    .into());
  };
  if latest_hash != input.previous_action_hash {
    return Err(GroupError::EntryOperationFailed(
      "withdraw_commitment: previous_action_hash does not match the latest version"
        .to_string(),
    )
    .into());
  }

  let now = sys_time()?;
  let withdrawn = CommitmentAnchor {
    status: CommitmentAdmissionStatus::Withdrawn,
    status_changed_at: now,
    ..original
  };

  let updated_hash = update_entry(input.previous_action_hash.clone(), &withdrawn)?;
  create_link(
    input.previous_action_hash, // link off the previous — same convention as NdoAnchorUpdates
    updated_hash.clone(),
    LinkTypes::CommitmentAnchorUpdates,
    (),
  )?;

  let record = get(updated_hash, GetOptions::default())?.ok_or(
    GroupError::EntryOperationFailed("Failed to retrieve withdrawn commitment anchor".to_string()),
  )?;
  Ok(record)
}

/// Follows the `CommitmentAnchorUpdates` chain from `original_hash` to the
/// most recent record. Mirrors `ndo_anchor::latest_anchor` so pool reads and
/// NDO reads share the same convergence pattern.
pub(crate) fn latest_commitment_anchor(
  original_hash: ActionHash,
) -> ExternResult<Option<(ActionHash, Record)>> {
  // Walk updates breadth-first — in practice the chain stays short (admit →
  // withdraw at most once in the common case) but we don't want to be
  // sensitive to a longer history.
  let mut latest_hash = original_hash.clone();
  loop {
    let links = get_links(
      LinkQuery::try_new(latest_hash.clone(), LinkTypes::CommitmentAnchorUpdates)?,
      GetStrategy::default(),
    )?;
    let Some(next) = links
      .into_iter()
      .max_by_key(|link| link.timestamp)
      .and_then(|link| link.target.into_action_hash())
    else {
      break;
    };
    latest_hash = next;
  }
  let record = get(latest_hash.clone(), GetOptions::default())?;
  Ok(record.map(|r| (latest_hash, r)))
}

/// A single pool entry with the latest version of its anchor.
#[derive(Debug, Serialize, Deserialize)]
pub struct PoolEntry {
  /// Stable key — the anchor's create action hash (safe to pass back to
  /// `withdraw_commitment` as `original_action_hash`).
  pub original_action_hash: ActionHash,
  /// Current latest action hash — what a future update must supersede.
  pub latest_action_hash: ActionHash,
  pub anchor: CommitmentAnchor,
}

/// Returns every commitment anchored in the pool, each resolved to its
/// latest version, so UIs can split "active" vs "withdrawn" client-side by
/// filtering on `anchor.status`.
///
/// Deliberately returns both statuses: the pool-memory invariant is a
/// read-side contract — "callers can always see what was once admitted" —
/// and filtering here would be a trap for Grassroots-side analytics code.
#[hdk_extern]
pub fn get_pool_contents(group_hash: ActionHash) -> ExternResult<Vec<PoolEntry>> {
  let link_query = LinkQuery::try_new(group_hash, LinkTypes::GroupToCommitmentAnchors)?;
  let links = get_links(link_query, GetStrategy::default())?;

  let mut entries = Vec::new();
  for link in links {
    let Some(original_hash) = link.target.into_action_hash() else {
      continue;
    };
    let Some((latest_hash, record)) = latest_commitment_anchor(original_hash.clone())? else {
      continue;
    };
    let Some(anchor) = record
      .entry()
      .to_app_option::<CommitmentAnchor>()
      .map_err(|e| wasm_error!(WasmErrorInner::Serialize(e)))?
    else {
      continue;
    };
    entries.push(PoolEntry {
      original_action_hash: original_hash,
      latest_action_hash: latest_hash,
      anchor,
    });
  }

  Ok(entries)
}
