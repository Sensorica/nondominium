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
#[hdk_extern]
pub fn create_soft_link(input: SoftLinkInput) -> ExternResult<Record> {
    let soft_link = SoftLink {
        group_hash: input.group_hash.clone(),
        target_ndo_hash: input.target_ndo_hash,
        description: input.description,
        created_by: agent_info()?.agent_initial_pubkey,
        created_at: sys_time()?,
    };

    let soft_link_hash = create_entry(&EntryTypes::SoftLink(soft_link.clone()))?;
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

#[hdk_extern]
pub fn get_soft_links(group_hash: ActionHash) -> ExternResult<Vec<SoftLink>> {
    let link_query = LinkQuery::try_new(group_hash, LinkTypes::GroupToSoftLinks)?;
    let links = get_links(link_query, GetStrategy::default())?;

    let soft_links = links
        .iter()
        .filter_map(|link| {
            let hash = link.target.clone().into_action_hash()?;
            let record = get(hash, GetOptions::default()).ok()??;
            record.entry().to_app_option::<SoftLink>().ok()?
        })
        .collect();

    Ok(soft_links)
}
