// Basic entry template for simple data structures
// Use this for entries that just need basic CRUD operations
// 🚨 CRITICAL: Follow proper Holochain patterns - NO timestamps, NO direct references
// 🆕 UPDATED 2025: Modern patterns with validation requirements

#[hdk_entry_helper]
#[derive(Clone, PartialEq)]
pub struct BasicEntry {
    // Business logic fields ONLY
    pub name: String,
    pub description: Option<String>,

    // Agent ownership (NO timestamps!)
    pub created_by: AgentPubKey,
}

// 🆕 MODERN Entry Type Definition with Validation Requirements
#[hdk_entry_types]
#[unit_enum(UnitEntryTypes)]
pub enum EntryTypes {
    #[entry_def(required_validations = 2)]
    BasicEntry(BasicEntry),

    #[entry_def(required_validations = 3, visibility = "private")]
    PrivateBasicEntry(PrivateBasicEntry),
}

// Input structure for creation
#[derive(Serialize, Deserialize, Debug)]
pub struct CreateBasicEntryInput {
    pub name: String,
    pub description: Option<String>,
}

// Input structure for updates
#[derive(Serialize, Deserialize, Debug)]
pub struct UpdateBasicEntryInput {
    pub original_action_hash: ActionHash,
    pub name: Option<String>,
    pub description: Option<String>,
}

// Validation function
pub fn validate_basic_entry(input: &CreateBasicEntryInput) -> Result<(), String> {
    // Validate required fields
    if input.name.trim().is_empty() {
        return Err("Name cannot be empty".to_string());
    }

    // Validate field lengths
    if input.name.len() > 200 {
        return Err("Name too long (max 200 characters)".to_string());
    }

    if let Some(ref description) = input.description {
        if description.len() > 2000 {
            return Err("Description too long (max 2000 characters)".to_string());
        }
    }

    Ok(())
}