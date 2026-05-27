use crate::GroupError;
use hdk::prelude::*;
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
        link.target
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
    create_link(
        agent,
        group_hash,
        LinkTypes::MemberToGroups,
        (),
    )?;

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
    // Member identity comes from the action author, not from the entry.
    for link in links {
        if let Some(membership_hash) = link.target.clone().into_action_hash() {
            if let Some(record) = get(membership_hash, GetOptions::default())? {
                if record.action().author() == &agent {
                    delete_link(link.create_link_hash, GetOptions::default())?;
                }
            }
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

/// Returns Records for all current group members.
/// The member's AgentPubKey is the action author: `record.action().author()`.
/// The join timestamp is `record.action().timestamp()`.
#[hdk_extern]
pub fn get_group_members(group_hash: ActionHash) -> ExternResult<Vec<Record>> {
    let link_query = LinkQuery::try_new(group_hash, LinkTypes::GroupToMembers)?;
    let links = get_links(link_query, GetStrategy::default())?;

    let members = links
        .iter()
        .filter_map(|link| {
            let hash = link.target.clone().into_action_hash()?;
            get(hash, GetOptions::default()).ok()?
        })
        .collect();

    Ok(members)
}

#[hdk_extern]
pub fn is_member(input: (AgentPubKey, ActionHash)) -> ExternResult<bool> {
    let (agent, group_hash) = input;
    let members = get_group_members(group_hash)?;
    Ok(members.iter().any(|r| r.action().author() == &agent))
}
