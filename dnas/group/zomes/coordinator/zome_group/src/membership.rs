use crate::GroupError;
use hdk::prelude::*;
use std::collections::HashSet;
use zome_group_integrity::*;

#[hdk_extern]
pub fn join_group(group_hash: ActionHash) -> ExternResult<Record> {
  let agent = agent_info()?.agent_initial_pubkey;

  // Guard: prevent duplicate membership entries via MemberToGroups reverse link.
  // This link is created on join and deleted on leave, so it accurately reflects live membership.
  let reverse_links = get_links(
    LinkQuery::try_new(agent.clone(), LinkTypes::MemberToGroups)?,
    GetStrategy::default(),
  )?;
  if reverse_links.iter().any(|link| {
    link
      .target
      .clone()
      .into_action_hash()
      .map_or(false, |h| h == group_hash)
  }) {
    return Err(GroupError::AlreadyMember.into());
  }

  let membership = GroupMembership {
    group_hash: group_hash.clone(),
    role: None,
  };

  let membership_hash = create_entry(&EntryTypes::GroupMembership(membership.clone()))?;
  let record = get(membership_hash.clone(), GetOptions::default())?.ok_or(
    GroupError::EntryOperationFailed("Failed to retrieve created membership".to_string()),
  )?;

  create_link(
    group_hash.clone(),
    membership_hash.clone(),
    LinkTypes::GroupToMembers,
    (),
  )?;
  create_link(agent, group_hash, LinkTypes::MemberToGroups, ())?;

  // TODO(signals): remote_signal other members with { kind: Member, group_hash }
  // so their member list refreshes push-style instead of via poll/reload.
  // See the consolidated design note in lib.rs.

  Ok(record)
}

#[hdk_extern]
pub fn leave_group(group_hash: ActionHash) -> ExternResult<()> {
  let agent = agent_info()?.agent_initial_pubkey;

  let link_query = LinkQuery::try_new(group_hash.clone(), LinkTypes::GroupToMembers)?;
  let links = get_links(link_query, GetStrategy::default())?;

  // Only the discovery links are removed; the GroupMembership entry itself is intentionally
  // left on the source chain. Holochain entries are append-only, so the membership record
  // serves as an audit trail of prior participation even after the agent leaves.
  // The link's author is the joining agent (the member), so comparing link.author avoids a
  // per-link `get` of the membership record, which may not be held locally for other agents.
  for link in links {
    if link.author == agent {
      delete_link(link.create_link_hash, GetOptions::default())?;
    }
  }

  // Also remove the MemberToGroups reverse link
  let reverse_query = LinkQuery::try_new(agent, LinkTypes::MemberToGroups)?;
  let reverse_links = get_links(reverse_query, GetStrategy::default())?;
  for link in reverse_links {
    if let Some(target_hash) = link.target.clone().into_action_hash() {
      if target_hash == group_hash {
        delete_link(link.create_link_hash, GetOptions::default())?;
      }
    }
  }

  Ok(())
}

/// Returns the AgentPubKey of every current member of this group.
///
/// Membership identity is read directly from each `GroupToMembers` link's `author`
/// (the agent who called `join_group`), rather than from a `get` of the linked
/// `GroupMembership` record. A `get_links` call returns every link and its author
/// in a single round-trip; the previous per-member `get` could fail when another
/// member's record had not yet propagated to this cell's DHT shard, silently
/// dropping that member from the list (only the local agent appeared).
/// Duplicate authors are collapsed defensively.
#[hdk_extern]
pub fn get_group_members(group_hash: ActionHash) -> ExternResult<Vec<AgentPubKey>> {
  let link_query = LinkQuery::try_new(group_hash, LinkTypes::GroupToMembers)?;
  let links = get_links(link_query, GetStrategy::default())?;

  let mut seen: HashSet<AgentPubKey> = HashSet::new();
  let mut members: Vec<AgentPubKey> = Vec::new();
  for link in links {
    if seen.insert(link.author.clone()) {
      members.push(link.author);
    }
  }

  Ok(members)
}

#[hdk_extern]
pub fn is_member(input: (AgentPubKey, ActionHash)) -> ExternResult<bool> {
  let (agent, group_hash) = input;
  let members = get_group_members(group_hash)?;
  Ok(members.contains(&agent))
}
