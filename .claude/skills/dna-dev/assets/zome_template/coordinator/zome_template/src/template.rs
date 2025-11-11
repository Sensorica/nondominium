use crate::TemplateError;
use hdk::prelude::*;
use zome_template_integrity::*;

// Input structures
#[derive(Serialize, Deserialize, Debug)]
pub struct CreateTemplateInput {
    pub name: String,
    pub description: Option<String>,
    pub category: Option<String>,
    pub metadata: Option<serde_json::Value>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct UpdateTemplateInput {
    pub original_action_hash: ActionHash,
    pub name: Option<String>,
    pub description: Option<String>,
    pub category: Option<String>,
    pub metadata: Option<serde_json::Value>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct TemplateQueryFilter {
    pub category: Option<String>,
    pub author: Option<AgentPubKey>,
    pub name_contains: Option<String>,
}

// Create template
#[hdk_extern]
pub fn create_template(input: CreateTemplateInput) -> ExternResult<Record> {
    // Get agent information
    let agent_pubkey = agent_info()?.agent_initial_pubkey;

    // Validate input
    if input.name.trim().is_empty() {
        return Err(TemplateError::InvalidInput("Template name cannot be empty".to_string()).into());
    }

    // Check for duplicates (optional - remove if duplicates allowed)
    let existing_links = get_links(
        GetLinksInputBuilder::try_new(agent_pubkey.clone(), LinkTypes::AgentToTemplate)?.build(),
    )?;

    // Note: This check prevents agents from creating multiple templates with the same name
    // Remove this block if you want to allow multiple templates per agent
    for link in existing_links {
        if let Ok(Some(record)) = get(link.target, GetOptions::default()) {
            if let Ok(entry) = record.entry().to_app_entry() {
                if let Ok(template) = entry.try_into() {
                    if template.name == input.name {
                        return Err(TemplateError::TemplateAlreadyExists.into());
                    }
                }
            }
        }
    }

    // Create the template entry
    let template = TemplateEntry {
        name: input.name.clone(),
        description: input.description,
        category: input.category,
        metadata: input.metadata,
        agent_pub_key: agent_pubkey.clone(),
        created_at: sys_time()?,
    };

    // Create entry in DHT
    let entry_hash = create_entry(&EntryTypes::Template(template.clone()))?;

    // Retrieve the created record
    let record = get(entry_hash.clone(), GetOptions::default())?.ok_or(
        TemplateError::EntryOperationFailed("Failed to retrieve created template".to_string())
    )?;

    // Create discovery anchor link
    let path = Path::from("templates");
    create_link(
        path.path_entry_hash()?,
        entry_hash.clone(),
        LinkTypes::TemplateAnchor,
        LinkTag::new("template")
    )?;

    // Create category anchor link if category provided
    if let Some(ref category) = template.category {
        let category_path = Path::from(format!("templates:category:{}", category));
        create_link(
            category_path.path_entry_hash()?,
            entry_hash.clone(),
            LinkTypes::TemplateAnchor,
            LinkTag::new("category")
        )?;
    }

    // Create agent-specific link
    create_link(
        agent_pubkey,
        entry_hash,
        LinkTypes::AgentToTemplate,
        LinkTag::new("created")
    )?;

    Ok(record)
}

// Get template by hash
#[hdk_extern]
pub fn get_template(entry_hash: ActionHash) -> ExternResult<Option<Record>> {
    get(entry_hash, GetOptions::default())
}

// Get all templates for current agent
#[hdk_extern]
pub fn get_my_templates() -> ExternResult<Vec<Record>> {
    let agent_pubkey = agent_info()?.agent_initial_pubkey;

    let links = get_links(
        GetLinksInputBuilder::try_new(agent_pubkey, LinkTypes::AgentToTemplate)?.build(),
    )?;

    let records = links.iter()
        .map(|link| get(link.target.clone(), GetOptions::default()))
        .filter_map(Result::ok)
        .flatten()
        .collect();

    Ok(records)
}

// Get all templates (global discovery)
#[hdk_extern]
pub fn get_all_templates() -> ExternResult<Vec<Record>> {
    let path = Path::from("templates");
    let links = get_links(
        GetLinksInputBuilder::try_new(path.path_entry_hash()?, LinkTypes::TemplateAnchor)?.build(),
    )?;

    let records = links.iter()
        .map(|link| get(link.target.clone(), GetOptions::default()))
        .filter_map(Result::ok)
        .flatten()
        .collect();

    Ok(records)
}

// Get templates by category
#[hdk_extern]
pub fn get_templates_by_category(category: String) -> ExternResult<Vec<Record>> {
    let category_path = Path::from(format!("templates:category:{}", category));
    let links = get_links(
        GetLinksInputBuilder::try_new(category_path.path_entry_hash()?, LinkTypes::TemplateAnchor)?.build(),
    )?;

    let records = links.iter()
        .map(|link| get(link.target.clone(), GetOptions::default()))
        .filter_map(Result::ok)
        .flatten()
        .collect();

    Ok(records)
}

// Update template
#[hdk_extern]
pub fn update_template(input: UpdateTemplateInput) -> ExternResult<Record> {
    // Get original record
    let original_record = get(input.original_action_hash.clone(), GetOptions::default())?
        .ok_or(TemplateError::TemplateNotFound("Original template not found".to_string()))?;

    // Check author permissions
    let original_entry = original_record.entry().to_app_entry()?;
    let original_template: TemplateEntry = original_entry.try_into()?;

    if original_template.agent_pub_key != agent_info()?.agent_initial_pubkey {
        return Err(TemplateError::NotAuthor.into());
    }

    // Validate update data
    if let Some(ref name) = input.name {
        if name.trim().is_empty() {
            return Err(TemplateError::InvalidInput("Template name cannot be empty".to_string()).into());
        }
    }

    // Create updated template
    let updated_template = TemplateEntry {
        name: input.name.unwrap_or(original_template.name),
        description: input.description.or(original_template.description),
        category: input.category.or(original_template.category),
        metadata: input.metadata.or(original_template.metadata),
        agent_pub_key: original_template.agent_pub_key,  // Preserve original
        created_at: original_template.created_at,        // Preserve original
    };

    // Update the entry
    let updated_hash = update_entry(input.original_action_hash, &updated_template)?;

    // Retrieve and return the updated record
    get(updated_hash, GetOptions::default())?
        .ok_or(TemplateError::EntryOperationFailed("Failed to retrieve updated template".to_string()).into())
}

// Delete template
#[hdk_extern]
pub fn delete_template(entry_hash: ActionHash) -> ExternResult<ActionHash> {
    // Get the original record to check permissions
    let original_record = get(entry_hash.clone(), GetOptions::default())?
        .ok_or(TemplateError::TemplateNotFound("Template not found".to_string()))?;

    let original_entry = original_record.entry().to_app_entry()?;
    let original_template: TemplateEntry = original_entry.try_into()?;

    // Check if the caller is the original author
    if original_template.agent_pub_key != agent_info()?.agent_initial_pubkey {
        return Err(TemplateError::NotAuthor.into());
    }

    // Delete the entry
    delete_entry(entry_hash)
}

// Search templates with filters
#[hdk_extern]
pub fn search_templates(filter: TemplateQueryFilter) -> ExternResult<Vec<Record>> {
    let path = Path::from("templates");
    let links = get_links(
        GetLinksInputBuilder::try_new(path.path_entry_hash()?, LinkTypes::TemplateAnchor)?.build(),
    )?;

    let mut filtered_records = Vec::new();

    for link in links {
        if let Ok(Some(record)) = get(link.target, GetOptions::default()) {
            if let Ok(entry) = record.entry().to_app_entry() {
                if let Ok(template) = entry.try_into() {
                    let mut matches = true;

                    // Filter by category
                    if let Some(ref filter_category) = filter.category {
                        if template.category.as_ref() != Some(filter_category) {
                            matches = false;
                        }
                    }

                    // Filter by author
                    if let Some(ref filter_author) = filter.author {
                        if template.agent_pub_key != *filter_author {
                            matches = false;
                        }
                    }

                    // Filter by name contains
                    if let Some(ref name_contains) = filter.name_contains {
                        if !template.name.to_lowercase().contains(&name_contains.to_lowercase()) {
                            matches = false;
                        }
                    }

                    if matches {
                        filtered_records.push(record);
                    }
                }
            }
        }
    }

    Ok(filtered_records)
}

// Get template details with related information
#[hdk_extern]
pub fn get_template_details(entry_hash: ActionHash) -> ExternResult<Option<TemplateDetails>> {
    let record = match get(entry_hash, GetOptions::default())? {
        Some(record) => record,
        None => return Ok(None),
    };

    let entry = record.entry().to_app_entry()?;
    let template: TemplateEntry = entry.try_into()?;

    // Get related templates (same category)
    let mut related_templates = Vec::new();
    if let Some(ref category) = template.category {
        let category_templates = get_templates_by_category(category.clone())?;
        related_templates = category_templates
            .into_iter()
            .filter(|r| {
                if let Ok(entry) = r.entry().to_app_entry() {
                    if let Ok(t) = entry.try_into() {
                        t.agent_pub_key != template.agent_pub_key // Exclude own templates
                    } else {
                        false
                    }
                } else {
                    false
                }
            })
            .take(5) // Limit to 5 related templates
            .collect();
    }

    let details = TemplateDetails {
        template,
        record,
        related_templates,
    };

    Ok(Some(details))
}

// Extended template details structure
#[derive(Serialize, Deserialize, Debug)]
pub struct TemplateDetails {
    pub template: TemplateEntry,
    pub record: Record,
    pub related_templates: Vec<Record>,
}