/**
 * Template for Holochain coordinator zomes
 * Copy this template and replace {{DOMAIN_NAME}} with your domain name
 * This template is tailored for nondominium ValueFlows implementation
 */

use hdk::prelude::*;
use {{DOMAIN_NAME}}_integrity::*;
use serde::{Deserialize, Serialize};

// Input types for public functions
#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Create{{DOMAIN_NAME}}Input {
    pub name: String,
    pub description: Option<String>,
    pub metadata: Option<BTreeMap<String, String>>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Update{{DOMAIN_NAME}}Input {
    pub name: Option<String>,
    pub description: Option<String>,
    pub metadata: Option<BTreeMap<String, String>>,
    pub status: Option<{{DOMAIN_NAME}}Status>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Get{{DOMAIN_NAME}}Input {
    pub hash: ActionHash,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Search{{DOMAIN_NAME}}Input {
    pub query: String,
    pub limit: Option<u32>,
    pub offset: Option<u32>,
}

// Create a new {{DOMAIN_NAME}}
#[hdk_extern]
pub fn create_{{domain_name}}(input: Create{{DOMAIN_NAME}}Input) -> ExternResult<ActionHash> {
    let agent_info = agent_info()?;

    let entry = {{DOMAIN_NAME}}::new(
        input.name.clone(),
        input.description,
        agent_info.agent_initial_pubkey,
    )?;

    // Apply metadata if provided
    let mut final_entry = entry;
    if let Some(metadata) = input.metadata {
        final_entry.update_metadata(metadata);
    }

    // Create the entry
    let hash = create_entry(&EntryTypes::{{DOMAIN_NAME}}(final_entry.clone()))?;

    // Create anchor link for discoverability
    let path = Path::from("{{domain_name}}");
    create_link(
        path.path_entry_hash()?,
        hash.clone(),
        LinkTypes::{{DOMAIN_NAME}}Anchor,
        LinkTag::new("{{domain_name}}"),
    )?;

    // Create update link for tracking changes
    create_link(
        hash,
        hash.clone(),
        LinkTypes::{{DOMAIN_NAME}}Update,
        LinkTag::new("creation"),
    )?;

    Ok(hash)
}

// Get {{DOMAIN_NAME}} by hash
#[hdk_extern]
pub fn get_{{domain_name}}(hash: ActionHash) -> ExternResult<Option<{{DOMAIN_NAME}}>> {
    let record = match get(hash, GetOptions::default())? {
        Some(record) => record,
        None => return Ok(None),
    };

    let entry = record.entry().as_option()
        .ok_or_else(|| wasm_error!(WasmErrorInner::Guest("Entry not found".to_string())))?;

    match entry {
        Entry::App(app_entry) => {
            match app_entry.entry_type() {
                EntryDefIndex(0) => { // {{DOMAIN_NAME}} entry type
                    let {{domain_name}} = {{DOMAIN_NAME}}::try_from(app_entry)?;
                    Ok(Some({{domain_name}}))
                },
                _ => Err(wasm_error!(WasmErrorInner::Guest("Unexpected entry type".to_string()))),
            }
        },
        _ => Err(wasm_error!(WasmErrorInner::Guest("Expected app entry".to_string()))),
    }
}

// Get all {{DOMAIN_NAME}} entries
#[hdk_extern]
pub fn get_all_{{domain_name}}s() -> ExternResult<Vec<{{DOMAIN_NAME}}>> {
    let path = Path::from("{{domain_name}}");
    let links = get_links(path.path_entry_hash()?, LinkTypes::{{DOMAIN_NAME}}Anchor, None)?;

    let entries: Vec<{{DOMAIN_NAME}}> = links
        .into_iter()
        .filter_map(|link| {
            match get_{{domain_name}}(link.target.into()) {
                Ok(Some(entry)) => Some(entry),
                _ => None,
            }
        })
        .collect();

    Ok(entries)
}

// Get {{DOMAIN_NAME}} entries created by the current agent
#[hdk_extern]
pub fn get_my_{{domain_name}}s() -> ExternResult<Vec<{{DOMAIN_NAME}}>> {
    let agent_info = agent_info()?;
    let my_pub_key = agent_info.agent_initial_pubkey;

    let all_entries = get_all_{{domain_name}}s()?;
    let my_entries: Vec<{{DOMAIN_NAME}}> = all_entries
        .into_iter()
        .filter(|entry| entry.created_by == my_pub_key)
        .collect();

    Ok(my_entries)
}

// Update an existing {{DOMAIN_NAME}}
#[hdk_extern]
pub fn update_{{domain_name}}(original_hash: ActionHash, input: Update{{DOMAIN_NAME}}Input) -> ExternResult<ActionHash> {
    let original_entry = get_{{domain_name}}(original_hash)?
        .ok_or_else(|| wasm_error!(WasmErrorInner::Guest("Original entry not found".to_string())))?;

    // Check if the current agent is the original author
    let agent_info = agent_info()?;
    if original_entry.created_by != agent_info.agent_initial_pubkey {
        return Err(wasm_error!(WasmErrorInner::Guest("Only original author can update entry".to_string())));
    }

    let mut updated_entry = original_entry;

    // Update fields if provided
    if let Some(name) = input.name {
        updated_entry.name = name;
    }

    if let Some(description) = input.description {
        updated_entry.description = Some(description);
    }

    if let Some(metadata) = input.metadata {
        updated_entry.update_metadata(metadata);
    }

    if let Some(status) = input.status {
        updated_entry.status = status;
    }

    let updated_hash = update_entry(original_hash, &EntryTypes::{{DOMAIN_NAME}}(updated_entry.clone()))?;

    // Create update link for tracking
    create_link(
        updated_hash,
        updated_hash.clone(),
        LinkTypes::{{DOMAIN_NAME}}Update,
        LinkTag::new("update"),
    )?;

    Ok(updated_hash)
}

// Delete a {{DOMAIN_NAME}}
#[hdk_extern]
pub fn delete_{{domain_name}}(hash: ActionHash) -> ExternResult<()> {
    let entry = get_{{domain_name}}(hash)?
        .ok_or_else(|| wasm_error!(WasmErrorInner::Guest("Entry not found".to_string())))?;

    // Check if the current agent is the original author
    let agent_info = agent_info()?;
    if entry.created_by != agent_info.agent_initial_pubkey {
        return Err(wasm_error!(WasmErrorInner::Guest("Only original author can delete entry".to_string())));
    }

    delete_entry(hash)?;
    Ok(())
}

// Search {{DOMAIN_NAME}} entries by query
#[hdk_extern]
pub fn search_{{domain_name}}s(input: Search{{DOMAIN_NAME}}Input) -> ExternResult<Vec<{{DOMAIN_NAME}}>> {
    let all_entries = get_all_{{domain_name}}s()?;
    let matching_entries: Vec<{{DOMAIN_NAME}}> = all_entries
        .into_iter()
        .filter(|entry| {
            let query_lower = input.query.to_lowercase();
            let name_match = entry.name.to_lowercase().contains(&query_lower);
            let desc_match = entry.description
                .as_ref()
                .map(|d| d.to_lowercase().contains(&query_lower))
                .unwrap_or(false);

            name_match || desc_match
        })
        .take(input.limit.unwrap_or(100) as usize)
        .collect();

    Ok(matching_entries)
}

// Get {{DOMAIN_NAME}} entries by status
#[hdk_extern]
pub fn get_{{domain_name}}s_by_status(status: {{DOMAIN_NAME}}Status) -> ExternResult<Vec<{{DOMAIN_NAME}}>> {
    let all_entries = get_all_{{domain_name}}s()?;
    let filtered_entries: Vec<{{DOMAIN_NAME}}> = all_entries
        .into_iter()
        .filter(|entry| entry.status == status)
        .collect();

    Ok(filtered_entries)
}

// Get {{DOMAIN_NAME}} entries by agent
#[hdk_extern]
pub fn get_{{domain_name}}s_by_agent(agent: AgentPubKey) -> ExternResult<Vec<{{DOMAIN_NAME}}>> {
    let all_entries = get_all_{{domain_name}}s()?;
    let agent_entries: Vec<{{DOMAIN_NAME}}> = all_entries
        .into_iter()
        .filter(|entry| entry.created_by == agent)
        .collect();

    Ok(agent_entries)
}

// Get update history for a {{DOMAIN_NAME}}
#[hdk_extern]
pub fn get_{{domain_name}}_update_history(hash: ActionHash) -> ExternResult<Vec<ActionHash>> {
    let links = get_links(
        hash,
        LinkTypes::{{DOMAIN_NAME}}Update,
        Some(LinkTag::new("update")),
    )?;

    let history: Vec<ActionHash> = links
        .into_iter()
        .map(|link| link.target.into())
        .collect();

    Ok(history)
}

// Link {{DOMAIN_NAME}} to related entity
#[hdk_extern]
pub fn link_{{domain_name}}_to_entity(
    {{domain_name}}_hash: ActionHash,
    entity_hash: AnyLinkableHash,
    tag: Option<String>,
) -> ExternResult<()> {
    let link_tag = tag.unwrap_or_else(|| "related".to_string());

    create_link(
        {{domain_name}}_hash,
        entity_hash,
        LinkTypes::{{DOMAIN_NAME}}ToRelatedEntity,
        LinkTag::new(link_tag),
    )?;

    Ok(())
}

// Get related entities for a {{DOMAIN_NAME}}
#[hdk_extern]
pub fn get_{{domain_name}}_related_entities(hash: ActionHash) -> ExternResult<Vec<AnyLinkableHash>> {
    let links = get_links(
        hash,
        LinkTypes::{{DOMAIN_NAME}}ToRelatedEntity,
        None,
    )?;

    let entities: Vec<AnyLinkableHash> = links
        .into_iter()
        .map(|link| link.target)
        .collect();

    Ok(entities)
}

// Get count of {{DOMAIN_NAME}} entries
#[hdk_extern]
pub fn get_{{domain_name}}_count() -> ExternResult<u32> {
    let all_entries = get_all_{{domain_name}}s()?;
    Ok(all_entries.len() as u32)
}

// Get count of {{DOMAIN_NAME}} entries by status
#[hdk_extern]
pub fn get_{{domain_name}}_count_by_status(status: {{DOMAIN_NAME}}Status) -> ExternResult<u32> {
    let entries = get_{{domain_name}}s_by_status(status)?;
    Ok(entries.len() as u32)
}

// Validate {{DOMAIN_NAME}} data (for external validation)
#[hdk_extern]
pub fn validate_{{domain_name}}_data(entry: {{DOMAIN_NAME}}) -> ExternResult<bool> {
    // This can be used for external validation of entry data
    // before it's created or updated

    // Basic validation - similar to integrity zome validation
    if entry.name.trim().is_empty() {
        return Ok(false);
    }

    if entry.name.len() > 200 {
        return Ok(false);
    }

    if let Some(description) = &entry.description {
        if description.len() > 2000 {
            return Ok(false);
        }
    }

    Ok(true)
}

// Helper function to create {{DOMAIN_NAME}} with common patterns
pub fn create_{{domain_name}}_quick(
    name: String,
    agent: AgentPubKey,
) -> ExternResult<ActionHash> {
    let input = Create{{DOMAIN_NAME}}Input {
        name,
        description: None,
        metadata: None,
    };

    create_{{domain_name}}(input)
}

// Helper function to update {{DOMAIN_NAME}} status
pub fn update_{{domain_name}}_status(
    hash: ActionHash,
    status: {{DOMAIN_NAME}}Status,
) -> ExternResult<ActionHash> {
    let input = Update{{DOMAIN_NAME}}Input {
        name: None,
        description: None,
        metadata: None,
        status: Some(status),
    };

    update_{{domain_name}}(hash, input)
}

// Helper function to archive {{DOMAIN_NAME}}
pub fn archive_{{domain_name}}(hash: ActionHash) -> ExternResult<ActionHash> {
    update_{{domain_name}}_status(hash, {{DOMAIN_NAME}}Status::Archived)
}

// Helper function to approve {{DOMAIN_NAME}}
pub fn approve_{{domain_name}}(hash: ActionHash) -> ExternResult<ActionHash> {
    update_{{domain_name}}_status(hash, {{DOMAIN_NAME}}Status::Approved)
}

// Helper function to reject {{DOMAIN_NAME}}
pub fn reject_{{domain_name}}(hash: ActionHash, reason: Option<String>) -> ExternResult<ActionHash> {
    let status = {{DOMAIN_NAME}}Status::Rejected { reason };
    update_{{domain_name}}_status(hash, status)
}
