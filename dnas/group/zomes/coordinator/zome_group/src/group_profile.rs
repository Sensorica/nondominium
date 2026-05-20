use crate::GroupError;
use hdk::prelude::*;
use zome_group_integrity::*;

#[derive(Debug, Serialize, Deserialize)]
pub struct GroupProfileInput {
    pub name: String,
    pub description: Option<String>,
}

#[hdk_extern]
pub fn create_group(input: GroupProfileInput) -> ExternResult<Record> {
    let profile = GroupProfile {
        name: input.name,
        description: input.description,
        initiator: agent_info()?.agent_initial_pubkey,
        created_at: sys_time()?,
    };

    let profile_hash = create_entry(&EntryTypes::GroupProfile(profile.clone()))?;
    let record = get(profile_hash.clone(), GetOptions::default())?.ok_or(
        GroupError::EntryOperationFailed("Failed to retrieve created group profile".to_string()),
    )?;

    let path = Path::from("all_groups");
    create_link(
        path.path_entry_hash()?,
        profile_hash.clone(),
        LinkTypes::AllGroups,
        (),
    )?;

    Ok(record)
}

#[hdk_extern]
pub fn get_group(group_hash: ActionHash) -> ExternResult<Option<Record>> {
    get(group_hash, GetOptions::default())
}

#[hdk_extern]
pub fn get_all_groups(_: ()) -> ExternResult<Vec<Record>> {
    let path = Path::from("all_groups");
    let link_query = LinkQuery::try_new(path.path_entry_hash()?, LinkTypes::AllGroups)?;
    let links = get_links(link_query, GetStrategy::default())?;

    let records = links
        .iter()
        .filter_map(|link| {
            let hash = link.target.clone().into_action_hash()?;
            get(hash, GetOptions::default()).ok()?
        })
        .collect();

    Ok(records)
}

/// Returns the single GroupProfile living in this cloned cell (one group per cell).
/// Queries the AllGroups anchor — since each cell has its own DHT, there is exactly one entry.
#[hdk_extern]
pub fn get_my_group(_: ()) -> ExternResult<Option<Record>> {
    let path = Path::from("all_groups");
    let link_query = LinkQuery::try_new(path.path_entry_hash()?, LinkTypes::AllGroups)?;
    let links = get_links(link_query, GetStrategy::default())?;

    let record = links
        .into_iter()
        .find_map(|link| {
            let hash = link.target.into_action_hash()?;
            get(hash, GetOptions::default()).ok()?
        });

    Ok(record)
}
