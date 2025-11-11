// Template for create functions following nondominium patterns
// 🚨 CRITICAL: NO manual timestamps in entries - use header metadata instead
// Copy and modify this template for your specific entry types

#[hdk_extern]
pub fn create_entry_type_name(input: CreateEntryTypeNameInput) -> ExternResult<Record> {
    // 1. Get agent information
    let agent_pubkey = agent_info()?.agent_initial_pubkey;

    // 2. Validate input data
    validate_entry_type_name_input(&input)?;

    // 3. Check for duplicates if business logic requires
    if should_check_duplicates() {
        let existing_links = get_links(
            GetLinksInputBuilder::try_new(agent_pubkey.clone(), LinkTypes::AgentToEntryTypeName)?.build(),
        )?;

        if !existing_links.is_empty() {
            return Err(EntryError::AlreadyExists("Entry already exists for this agent".to_string()).into());
        }
    }

    // 4. Create the entry with NO manual timestamps
    let entry = EntryTypeName {
        // Copy business fields from input
        field_name: input.field_name,
        optional_field: input.optional_field,

        // Add agent ownership (NO created_at field!)
        created_by: agent_pubkey.clone(),
    };

    // 5. Validate business rules
    validate_business_rules(&entry)?;

    // 6. Create the entry in the DHT
    let entry_hash = create_entry(&EntryTypes::EntryTypeName(entry.clone()))?;

    // 7. Retrieve the created record for return
    let record = get(entry_hash.clone(), GetOptions::default())?.ok_or(
        EntryError::CreationFailed("Failed to retrieve created entry".to_string())
    )?;

    // 8. Create discovery anchor links
    create_discovery_links(&entry_hash, &agent_pubkey, &entry)?;

    // 9. Create agent-specific links
    create_agent_links(&entry_hash, &agent_pubkey)?;

    // 10. Create business relationship links
    create_business_links(&entry_hash, &entry)?;

    // 11. Log creation for debugging (optional)
    warn!("Created EntryTypeName: {:?} for agent: {:?}", entry_hash, agent_pubkey);

    Ok(record)
}

// Helper function for input validation
fn validate_entry_type_name_input(input: &CreateEntryTypeNameInput) -> ExternResult<()> {
    // Validate required fields
    if input.field_name.trim().is_empty() {
        return Err(EntryError::InvalidInput("field_name cannot be empty".to_string()).into());
    }

    // Validate field lengths
    if input.field_name.len() > MAX_FIELD_LENGTH {
        return Err(EntryError::InvalidInput(
            format!("field_name too long (max {} characters)", MAX_FIELD_LENGTH)
        ).into());
    }

    // Validate optional fields
    if let Some(ref optional_field) = input.optional_field {
        if optional_field.len() > MAX_OPTIONAL_LENGTH {
            return Err(EntryError::InvalidInput(
                format!("optional_field too long (max {} characters)", MAX_OPTIONAL_LENGTH)
            ).into());
        }
    }

    // Add custom validation logic here
    validate_custom_rules(input)?;

    Ok(())
}

// Helper function for business rule validation
fn validate_business_rules(entry: &EntryTypeName) -> ExternResult<()> {
    // Check if agent has required capabilities
    if !agent_has_capability(&entry.created_by, "create_entry") {
        return Err(EntryError::InsufficientCapability(
            "Agent lacks 'create_entry' capability".to_string()
        ).into());
    }

    // Check business constraints
    if violates_business_constraints(entry) {
        return Err(EntryError::ValidationError(
            "Entry violates business constraints".to_string()
        ).into());
    }

    Ok(())
}

// Helper function to check if duplicate checking is needed
fn should_check_duplicates() -> bool {
    // Return true if entries should be unique per agent
    // Override this function based on your business logic
    true
}

// Helper function for custom validation rules
fn validate_custom_rules(input: &CreateEntryTypeNameInput) -> ExternResult<()> {
    // Add your custom validation logic here
    // Example: validate format, check against external data, etc.

    // Example: Validate field format
    if !input.field_name.chars().all(|c| c.is_alphanumeric() || c == '_' || c == '-') {
        return Err(EntryError::InvalidInput(
            "field_name contains invalid characters".to_string()
        ).into());
    }

    Ok(())
}

// Helper function to check business constraints
fn violates_business_constraints(entry: &EntryTypeName) -> bool {
    // Add your business constraint checks here
    // Example: limit on number of entries per agent, time windows, etc.

    false // No constraints violated by default
}

// Helper function for discovery links
fn create_discovery_links(
    entry_hash: &ActionHash,
    agent_pubkey: &AgentPubKey,
    entry: &EntryTypeName,
) -> ExternResult<()> {
    // Global discovery anchor
    let path = Path::from("entry_type_names");
    create_link(
        path.path_entry_hash()?,
        entry_hash.clone(),
        LinkTypes::EntryTypeAnchor,
        LinkTag::new("entry_type_name")
    )?;

    // Category-based discovery if applicable
    if let Some(ref category) = entry.category_field {
        let category_path = Path::from(format!("entry_type_names:category:{}", category));
        create_link(
            category_path.path_entry_hash()?,
            entry_hash.clone(),
            LinkTypes::EntryTypeAnchor,
            LinkTag::new("category")
        )?;
    }

    Ok(())
}

// Helper function for agent links
fn create_agent_links(
    entry_hash: &ActionHash,
    agent_pubkey: &AgentPubKey,
) -> ExternResult<()> {
    // Agent-specific ownership link
    create_link(
        agent_pubkey.clone(),
        entry_hash.clone(),
        LinkTypes::AgentToEntryTypeName,
        LinkTag::new("created")
    )?;

    Ok(())
}

// Helper function for business relationship links
fn create_business_links(
    entry_hash: &ActionHash,
    entry: &EntryTypeName,
) -> ExternResult<()> {
    // Add business-specific link creation here
    // Example: link to related resources, parent entries, etc.

    Ok(())
}

// Constants for validation
const MAX_FIELD_LENGTH: usize = 200;
const MAX_OPTIONAL_LENGTH: usize = 2000;

// Helper function to check agent capabilities
fn agent_has_capability(agent: &AgentPubKey, capability: &str) -> bool {
    // Implement capability checking logic
    // This would typically query the capability zome
    // For now, return true as a placeholder
    true
}