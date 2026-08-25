//! NDO membership — explicit, listable participation in a Nondominium Object.
//!
//! Under the per-NDO-cell model (ADR-010 model A) each NDO is its own cloned cell, and an
//! agent must already hold that cell to read the NDO at all. Membership therefore grants
//! **nothing**: it records that the agent has declared participation so other members can
//! enumerate who is taking part. No caller may treat the absence of an `NdoMembership` as a
//! read denial — cell possession is what confers access.
//!
//! Mirrors the proven `zome_group::membership` pattern, including the hard-won rule that
//! member identity is read from each link's `author` rather than from a `get` of the linked
//! record (see `get_ndo_members`).

use crate::ResourceError;
use hdk::prelude::*;
use std::collections::HashSet;
use zome_resource_integrity::*;

#[derive(Debug, Serialize, Deserialize)]
pub struct JoinNdoInput {
  pub ndo_identity_hash: ActionHash,
  pub role: Option<String>,
}

/// Declare participation in this NDO.
///
/// Idempotent by contract: a second call from the same agent for the same NDO returns
/// `AlreadyMember` rather than committing a duplicate entry. The guard reads the
/// `MemberToNdos` reverse link, whose only author is the calling agent, so it is resolved
/// from local state and cannot be defeated by gossip lag.
#[hdk_extern]
pub fn join_ndo(input: JoinNdoInput) -> ExternResult<Record> {
  let agent = agent_info()?.agent_initial_pubkey;
  let ndo_identity_hash = input.ndo_identity_hash;

  // Semantic validation the integrity zome cannot do: the referenced identity must exist in
  // this cell. Prevents membership entries that point at a hash from another DNA or at
  // nothing at all. (The integrity zome deliberately skips this — see validate_ndo_membership.)
  if get(ndo_identity_hash.clone(), GetOptions::default())?.is_none() {
    return Err(ResourceError::NdoNotFound(format!("{:?}", ndo_identity_hash)).into());
  }

  let already_member = get_links(
    LinkQuery::try_new(agent.clone(), LinkTypes::MemberToNdos)?,
    GetStrategy::default(),
  )?
  .iter()
  .any(|link| {
    link
      .target
      .clone()
      .into_action_hash()
      .is_some_and(|h| h == ndo_identity_hash)
  });
  if already_member {
    return Err(ResourceError::AlreadyMember.into());
  }

  let membership = NdoMembership {
    ndo_identity_hash: ndo_identity_hash.clone(),
    role: input.role,
  };

  let membership_hash = create_entry(&EntryTypes::NdoMembership(membership))?;
  let record = get(membership_hash.clone(), GetOptions::default())?.ok_or(
    ResourceError::EntryOperationFailed("Failed to retrieve created NdoMembership".to_string()),
  )?;

  create_link(
    ndo_identity_hash.clone(),
    membership_hash,
    LinkTypes::NdoToMembers,
    (),
  )?;
  create_link(agent, ndo_identity_hash, LinkTypes::MemberToNdos, ())?;

  // TODO(signals): remote_signal other members with { kind: NdoMember, ndo_identity_hash }
  // so their member list refreshes push-style instead of via poll/reload. Same pending
  // upgrade as zome_group; the UI currently pulls on focus and a gentle poll.

  Ok(record)
}

/// Returns the AgentPubKey of every declared member of this NDO.
///
/// Membership identity is read directly from each `NdoToMembers` link's `author` (the agent
/// who called `join_ndo`), NOT from a `get` of the linked `NdoMembership` record. `get_links`
/// returns every link and its author in one round-trip; a per-link `get` can fail when
/// another member's record has not yet propagated to this cell's shard, silently dropping
/// that member so only the local agent appears. That exact bug was fixed in `zome_group`;
/// do not reintroduce it here. Duplicate authors are collapsed defensively.
#[hdk_extern]
pub fn get_ndo_members(ndo_identity_hash: ActionHash) -> ExternResult<Vec<AgentPubKey>> {
  let links = get_links(
    LinkQuery::try_new(ndo_identity_hash, LinkTypes::NdoToMembers)?,
    GetStrategy::default(),
  )?;

  let mut seen: HashSet<AgentPubKey> = HashSet::new();
  let mut members: Vec<AgentPubKey> = Vec::new();
  for link in links {
    if seen.insert(link.author.clone()) {
      members.push(link.author);
    }
  }

  Ok(members)
}

/// Whether `agent` has declared membership in this NDO.
///
/// This answers "is this agent taking part", never "may this agent read the NDO" — see the
/// module docs. Used by the client to decide whether to show a Join affordance.
#[hdk_extern]
pub fn is_ndo_member(input: (AgentPubKey, ActionHash)) -> ExternResult<bool> {
  let (agent, ndo_identity_hash) = input;
  let members = get_ndo_members(ndo_identity_hash)?;
  Ok(members.contains(&agent))
}
