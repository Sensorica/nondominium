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
    let work_log = WorkLog {
        group_hash: input.group_hash.clone(),
        author: agent_info()?.agent_initial_pubkey,
        description: input.description,
        hours: input.hours,
        logged_at: sys_time()?,
    };

    let work_log_hash = create_entry(&EntryTypes::WorkLog(work_log.clone()))?;
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
        work_log.author,
        work_log_hash,
        LinkTypes::AgentToWorkLogs,
        (),
    )?;

    Ok(record)
}

#[hdk_extern]
pub fn get_work_logs(group_hash: ActionHash) -> ExternResult<Vec<WorkLog>> {
    let link_query = LinkQuery::try_new(group_hash, LinkTypes::GroupToWorkLogs)?;
    let links = get_links(link_query, GetStrategy::default())?;

    let logs = links
        .iter()
        .filter_map(|link| {
            let hash = link.target.clone().into_action_hash()?;
            let record = get(hash, GetOptions::default()).ok()??;
            record.entry().to_app_option::<WorkLog>().ok()?
        })
        .collect();

    Ok(logs)
}
