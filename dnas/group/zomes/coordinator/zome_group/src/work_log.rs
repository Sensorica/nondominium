use crate::GroupError;
use hdk::prelude::*;
use zome_group_integrity::*;

#[derive(Debug, Serialize, Deserialize)]
pub struct WorkLogInput {
    pub group_hash: ActionHash,
    pub description: String,
    pub hours: f32,
}

#[hdk_extern]
pub fn log_work(input: WorkLogInput) -> ExternResult<Record> {
    let agent = agent_info()?.agent_initial_pubkey;
    let work_log = WorkLog {
        group_hash: input.group_hash.clone(),
        description: input.description,
        hours: input.hours,
    };

    let work_log_hash = create_entry(&EntryTypes::WorkLog(work_log))?;
    let record = get(work_log_hash.clone(), GetOptions::default())?.ok_or(
        GroupError::EntryOperationFailed("Failed to retrieve created work log".to_string()),
    )?;

    create_link(
        input.group_hash,
        work_log_hash.clone(),
        LinkTypes::GroupToWorkLogs,
        (),
    )?;
    create_link(
        agent,
        work_log_hash,
        LinkTypes::AgentToWorkLogs,
        (),
    )?;

    Ok(record)
}

/// Removes a WorkLog. Only the original author may call this.
/// Deletes both discovery links (GroupToWorkLogs and AgentToWorkLogs) and the entry itself.
#[hdk_extern]
pub fn delete_work_log(work_log_hash: ActionHash) -> ExternResult<ActionHash> {
    let record = must_get_valid_record(work_log_hash.clone())?;
    let agent = agent_info()?.agent_initial_pubkey;

    if record.action().author() != &agent {
        return Err(GroupError::NotAuthor.into());
    }

    let work_log: WorkLog = record
        .entry()
        .to_app_option()
        .map_err(|e| wasm_error!(WasmErrorInner::Serialize(e)))?
        .ok_or_else(|| {
            GroupError::EntryOperationFailed("Failed to decode WorkLog entry".to_string())
        })?;

    // Remove GroupToWorkLogs discovery link.
    let group_links = get_links(
        LinkQuery::try_new(work_log.group_hash, LinkTypes::GroupToWorkLogs)?,
        GetStrategy::default(),
    )?;
    for link in group_links {
        if let Some(target) = link.target.into_action_hash() {
            if target == work_log_hash {
                delete_link(link.create_link_hash, GetOptions::default())?;
            }
        }
    }

    // Remove AgentToWorkLogs discovery link.
    let agent_links = get_links(
        LinkQuery::try_new(agent, LinkTypes::AgentToWorkLogs)?,
        GetStrategy::default(),
    )?;
    for link in agent_links {
        if let Some(target) = link.target.into_action_hash() {
            if target == work_log_hash {
                delete_link(link.create_link_hash, GetOptions::default())?;
            }
        }
    }

    delete_entry(work_log_hash)
}

/// Returns Records for all work logs in a group.
/// Author is `record.action().author()`; timestamp is `record.action().timestamp()`.
#[hdk_extern]
pub fn get_work_logs(group_hash: ActionHash) -> ExternResult<Vec<Record>> {
    let link_query = LinkQuery::try_new(group_hash, LinkTypes::GroupToWorkLogs)?;
    let links = get_links(link_query, GetStrategy::default())?;

    let logs = links
        .iter()
        .filter_map(|link| {
            let hash = link.target.clone().into_action_hash()?;
            get(hash, GetOptions::default()).ok()?
        })
        .collect();

    Ok(logs)
}

/// Returns Records for all work logs authored by the calling agent (uses AgentToWorkLogs link).
#[hdk_extern]
pub fn get_my_work_logs(_: ()) -> ExternResult<Vec<Record>> {
    let agent = agent_info()?.agent_initial_pubkey;
    let link_query = LinkQuery::try_new(agent, LinkTypes::AgentToWorkLogs)?;
    let links = get_links(link_query, GetStrategy::default())?;

    let logs = links
        .iter()
        .filter_map(|link| {
            let hash = link.target.clone().into_action_hash()?;
            get(hash, GetOptions::default()).ok()?
        })
        .collect();

    Ok(logs)
}
