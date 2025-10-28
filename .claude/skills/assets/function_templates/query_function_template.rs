// Template for query functions following nondominium patterns
// Copy and modify this template for your specific query needs

// Get entry by hash
#[hdk_extern]
pub fn get_entry_type_name(entry_hash: ActionHash) -> ExternResult<Option<Record>> {
    get(entry_hash, GetOptions::default())
}

// Get all entries for current agent
#[hdk_extern]
pub fn get_my_entry_type_names() -> ExternResult<Vec<Record>> {
    let agent_pubkey = agent_info()?.agent_initial_pubkey;

    let links = get_links(
        GetLinksInputBuilder::try_new(agent_pubkey, LinkTypes::AgentToEntryTypeName)?.build(),
    )?;

    let records = links.iter()
        .map(|link| get(link.target.clone(), GetOptions::default()))
        .filter_map(Result::ok)
        .flatten()
        .collect();

    Ok(records)
}

// Get all entries (global discovery)
#[hdk_extern]
pub fn get_all_entry_type_names() -> ExternResult<Vec<Record>> {
    let path = Path::from("entry_type_names");
    let links = get_links(
        GetLinksInputBuilder::try_new(path.path_entry_hash()?, LinkTypes::EntryTypeAnchor)?.build(),
    )?;

    let records = links.iter()
        .map(|link| get(link.target.clone(), GetOptions::default()))
        .filter_map(Result::ok)
        .flatten()
        .collect();

    Ok(records)
}

// Get entries with pagination
#[hdk_extern]
pub fn get_entry_type_names_paginated(input: PaginationInput) -> ExternResult<PaginatedResult<Record>> {
    let path = Path::from("entry_type_names");
    let links = get_links(
        GetLinksInputBuilder::try_new(path.path_entry_hash()?, LinkTypes::EntryTypeAnchor)?.build(),
    )?;

    let total_count = links.len() as u32;
    let start_index = (input.page * input.page_size) as usize;
    let end_index = start_index + (input.page_size as usize);

    let paginated_links = links.iter()
        .skip(start_index)
        .take(end_index - start_index);

    let items = paginated_links
        .map(|link| get(link.target.clone(), GetOptions::default()))
        .filter_map(Result::ok)
        .flatten()
        .collect();

    Ok(PaginatedResult {
        items,
        total_count,
        page: input.page,
        page_size: input.page_size,
    })
}

// Get entries by agent
#[hdk_extern]
pub fn get_entry_type_names_by_agent(agent: AgentPubKey) -> ExternResult<Vec<Record>> {
    let links = get_links(
        GetLinksInputBuilder::try_new(agent, LinkTypes::AgentToEntryTypeName)?.build(),
    )?;

    let records = links.iter()
        .map(|link| get(link.target.clone(), GetOptions::default()))
        .filter_map(Result::ok)
        .flatten()
        .collect();

    Ok(records)
}

// Get entries by category (if applicable)
#[hdk_extern]
pub fn get_entry_type_names_by_category(category: String) -> ExternResult<Vec<Record>> {
    let category_path = Path::from(format!("entry_type_names:category:{}", category));
    let links = get_links(
        GetLinksInputBuilder::try_new(category_path.path_entry_hash()?, LinkTypes::EntryTypeAnchor)?.build(),
    )?;

    let records = links.iter()
        .map(|link| get(link.target.clone(), GetOptions::default()))
        .filter_map(Result::ok)
        .flatten()
        .collect();

    Ok(records)
}

// Search entries with filters
#[hdk_extern]
pub fn search_entry_type_names(filter: EntryTypeFilter) -> ExternResult<Vec<Record>> {
    let path = Path::from("entry_type_names");
    let links = get_links(
        GetLinksInputBuilder::try_new(path.path_entry_hash()?, LinkTypes::EntryTypeAnchor)?.build(),
    )?;

    let mut filtered_records = Vec::new();

    for link in links {
        if let Ok(Some(record)) = get(link.target, GetOptions::default()) {
            if let Ok(entry) = record.entry().to_app_entry() {
                if let Ok(entry_type) = entry.try_into() {
                    if matches_filter(&entry_type, &filter) {
                        filtered_records.push(record);
                    }
                }
            }
        }
    }

    Ok(filtered_records)
}

// Get entry summary (lightweight data)
#[hdk_extern]
pub fn get_entry_type_name_summaries() -> ExternResult<Vec<EntryTypeSummary>> {
    let path = Path::from("entry_type_names");
    let links = get_links(
        GetLinksInputBuilder::try_new(path.path_entry_hash()?, LinkTypes::EntryTypeAnchor)?.build(),
    )?;

    let summaries = links.iter()
        .filter_map(|link| {
            let tag = String::from_utf8_lossy(&link.tag.0);
            let parts: Vec<&str> = tag.split('|').collect();
            if parts.len() >= 2 {
                Some(EntryTypeSummary {
                    hash: link.target.clone(),
                    name: parts[0].to_string(),
                    category: parts.get(1).map(|s| s.to_string()),
                })
            } else {
                None
            }
        })
        .collect();

    Ok(summaries)
}

// Get related entries
#[hdk_extern]
pub fn get_related_entry_type_names(entry_hash: ActionHash) -> ExternResult<Vec<Record>> {
    let links = get_links(
        GetLinksInputBuilder::try_new(entry_hash, LinkTypes::EntryTypeToRelated)?.build(),
    )?;

    let records = links.iter()
        .map(|link| get(link.target.clone(), GetOptions::default()))
        .filter_map(Result::ok)
        .flatten()
        .collect();

    Ok(records)
}

// Get entry with full details
#[hdk_extern]
pub fn get_entry_type_name_details(entry_hash: ActionHash) -> ExternResult<Option<EntryTypeDetails>> {
    let record = match get(entry_hash, GetOptions::default())? {
        Some(record) => record,
        None => return Ok(None),
    };

    let entry = record.entry().to_app_entry()?;
    let entry_type: EntryTypeName = entry.try_into()?;

    // Get related entries
    let related_entries = get_related_entry_type_names(entry_hash)?;

    // Get creation metadata
    let agent_links = get_links(
        GetLinksInputBuilder::try_new(entry_type.agent_pub_key, LinkTypes::AgentToEntryTypeName)?
            .link_tag(LinkTag::new("created"))
            .build(),
    )?;

    let creation_info = CreationInfo {
        created_by: entry_type.agent_pub_key.clone(),
        created_at: entry_type.created_at,
        is_mine: entry_type.agent_pub_key == agent_info()?.agent_initial_pubkey,
    };

    let details = EntryTypeDetails {
        entry_type,
        record,
        related_entries,
        creation_info,
    };

    Ok(Some(details))
}

// Helper function to check if entry matches filter
fn matches_filter(entry: &EntryTypeName, filter: &EntryTypeFilter) -> bool {
    // Filter by category
    if let Some(ref filter_category) = filter.category {
        if entry.category_field.as_ref() != Some(filter_category) {
            return false;
        }
    }

    // Filter by agent
    if let Some(ref filter_agent) = filter.agent {
        if entry.agent_pub_key != *filter_agent {
            return false;
        }
    }

    // Filter by name contains
    if let Some(ref name_contains) = filter.name_contains {
        if !entry.field_name.to_lowercase().contains(&name_contains.to_lowercase()) {
            return false;
        }
    }

    // Filter by date range
    if let Some(start_date) = filter.created_after {
        if entry.created_at < start_date {
            return false;
        }
    }

    if let Some(end_date) = filter.created_before {
        if entry.created_at > end_date {
            return false;
        }
    }

    true
}

// Data structures for queries

#[derive(Serialize, Deserialize, Debug)]
pub struct PaginationInput {
    pub page: u32,
    pub page_size: u32,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct PaginatedResult<T> {
    pub items: Vec<T>,
    pub total_count: u32,
    pub page: u32,
    pub page_size: u32,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct EntryTypeFilter {
    pub category: Option<String>,
    pub agent: Option<AgentPubKey>,
    pub name_contains: Option<String>,
    pub created_after: Option<Timestamp>,
    pub created_before: Option<Timestamp>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct EntryTypeSummary {
    pub hash: ActionHash,
    pub name: String,
    pub category: Option<String>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct CreationInfo {
    pub created_by: AgentPubKey,
    pub created_at: Timestamp,
    pub is_mine: bool,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct EntryTypeDetails {
    pub entry_type: EntryTypeName,
    pub record: Record,
    pub related_entries: Vec<Record>,
    pub creation_info: CreationInfo,
}