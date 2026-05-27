use crate::GroupError;
use hdk::prelude::*;
use zome_group_integrity::*;

#[derive(Debug, Serialize, Deserialize)]
pub struct SoftLinkInput {
    pub group_hash: ActionHash,
    pub target_ndo_hash: ActionHash,
    pub description: Option<String>,
}

/// ADR-GROUP-04: SoftLinks are planning-only — no PPRs or EconomicEvents generated.
/// Creator is the action author; creation timestamp is the action timestamp.
#[hdk_extern]
pub fn create_soft_link(input: SoftLinkInput) -> ExternResult<Record> {
    let soft_link = SoftLink {
        group_hash: input.group_hash.clone(),
        target_ndo_hash: input.target_ndo_hash,
        description: input.description,
    };

    let soft_link_hash = create_entry(&EntryTypes::SoftLink(soft_link))?;
    let record = get(soft_link_hash.clone(), GetOptions::default())?.ok_or(
        GroupError::EntryOperationFailed("Failed to retrieve created soft link".to_string()),
    )?;

    create_link(
        input.group_hash,
        soft_link_hash,
        LinkTypes::GroupToSoftLinks,
        (),
    )?;

    Ok(record)
}

/// Removes a SoftLink. Only the original creator may call this.
/// Deletes the discovery link (GroupToSoftLinks) and the entry itself.
/// The entry's action hash is preserved on-chain as an audit trail.
#[hdk_extern]
pub fn delete_soft_link(soft_link_hash: ActionHash) -> ExternResult<ActionHash> {
    let record = must_get_valid_record(soft_link_hash.clone())?;

    if record.action().author() != &agent_info()?.agent_initial_pubkey {
        return Err(GroupError::NotAuthor.into());
    }

    let soft_link: SoftLink = record
        .entry()
        .to_app_option()
        .map_err(|e| wasm_error!(WasmErrorInner::Serialize(e)))?
        .ok_or_else(|| {
            GroupError::EntryOperationFailed("Failed to decode SoftLink entry".to_string())
        })?;

    // Remove the GroupToSoftLinks discovery link so the entry no longer appears in queries.
    let links = get_links(
        LinkQuery::try_new(soft_link.group_hash, LinkTypes::GroupToSoftLinks)?,
        GetStrategy::default(),
    )?;
    for link in links {
        if let Some(target) = link.target.into_action_hash() {
            if target == soft_link_hash {
                delete_link(link.create_link_hash, GetOptions::default())?;
            }
        }
    }

    delete_entry(soft_link_hash)
}

/// Returns Records for all SoftLinks in a group.
/// Creator is `record.action().author()`; creation timestamp is `record.action().timestamp()`.
#[hdk_extern]
pub fn get_soft_links(group_hash: ActionHash) -> ExternResult<Vec<Record>> {
    let link_query = LinkQuery::try_new(group_hash, LinkTypes::GroupToSoftLinks)?;
    let links = get_links(link_query, GetStrategy::default())?;

    let soft_links = links
        .iter()
        .filter_map(|link| {
            let hash = link.target.clone().into_action_hash()?;
            get(hash, GetOptions::default()).ok()?
        })
        .collect();

    Ok(soft_links)
}
