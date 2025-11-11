// Capability-based access control entry template
// Use this for role-based access control and permissions

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq)]
pub struct CapabilityEntry {
    // Agent being granted capabilities
    pub agent: AgentPubKey,

    // Role or capability identifier
    pub role: String,

    // Capability level (hierarchical permissions)
    pub capability_level: u32,

    // Who granted this capability
    pub granted_by: AgentPubKey,

    // Optional expiration time
    pub expires_at: Option<Timestamp>,

    // Additional metadata
    pub description: Option<String>,
    pub scope: Option<String>, // Resource or scope this applies to

    // Metadata
    pub agent_pub_key: AgentPubKey,
    pub created_at: Timestamp,
}

// Input structure for creation
#[derive(Serialize, Deserialize, Debug)]
pub struct CreateCapabilityInput {
    pub agent: AgentPubKey,
    pub role: String,
    pub capability_level: u32,
    pub expires_at: Option<Timestamp>,
    pub description: Option<String>,
    pub scope: Option<String>,
}

// Input structure for updates
#[derive(Serialize, Deserialize, Debug)]
pub struct UpdateCapabilityInput {
    pub original_action_hash: ActionHash,
    pub role: Option<String>,
    pub capability_level: Option<u32>,
    pub expires_at: Option<Timestamp>,
    pub description: Option<String>,
    pub scope: Option<String>,
}

// Capability check result
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct CapabilityCheck {
    pub has_capability: bool,
    pub capability_level: u32,
    pub expires_at: Option<Timestamp>,
    pub is_expired: bool,
}

// Validation function
pub fn validate_capability_entry(input: &CreateCapabilityInput) -> Result<(), String> {
    // Validate required fields
    if input.role.trim().is_empty() {
        return Err("Role cannot be empty".to_string());
    }

    // Validate role format
    if input.role.len() > 100 {
        return Err("Role name too long (max 100 characters)".to_string());
    }

    // Validate capability level
    if input.capability_level > 1000 {
        return Err("Capability level too high (max 1000)".to_string());
    }

    // Validate expiration time
    if let Some(expires_at) = input.expires_at {
        let current_time = sys_time()?;
        if expires_at <= current_time {
            return Err("Expiration time must be in the future".to_string());
        }
    }

    // Validate scope if provided
    if let Some(ref scope) = input.scope {
        if scope.trim().is_empty() {
            return Err("Scope cannot be empty if provided".to_string());
        }
        if scope.len() > 200 {
            return Err("Scope description too long (max 200 characters)".to_string());
        }
    }

    Ok(())
}

// Helper function to check if capability has expired
pub fn is_capability_expired(expires_at: Option<Timestamp>) -> ExternResult<bool> {
    match expires_at {
        Some(expiration) => {
            let current_time = sys_time()?;
            Ok(current_time > expiration)
        }
        None => Ok(false), // No expiration means never expires
    }
}

// Helper function to check if agent has sufficient capability level
pub fn has_sufficient_capability(
    required_level: u32,
    agent_capability: u32,
) -> bool {
    agent_capability >= required_level
}

// Helper function to get standard capability levels
pub fn get_standard_capability_levels() -> Vec<(&'static str, u32, &'static str)> {
    vec![
        ("viewer", 100, "Can view resources and basic information"),
        ("member", 200, "Can participate and use resources"),
        ("contributor", 300, "Can contribute and modify resources"),
        ("manager", 400, "Can manage resources and other members"),
        ("admin", 500, "Full administrative access"),
        ("owner", 1000, "Complete ownership and control"),
    ]
}

// Helper function to validate capability level against role
pub fn validate_capability_level_for_role(role: &str, level: u32) -> Result<(), String> {
    let standard_levels = get_standard_capability_levels();

    for (std_role, std_level, _) in standard_levels {
        if role == std_role {
            if level == std_level {
                return Ok(());
            } else {
                return Err(format!(
                    "Invalid level {} for role {}. Expected: {}",
                    level, role, std_level
                ));
            }
        }
    }

    // For custom roles, allow any level within reasonable bounds
    if level > 1000 {
        return Err("Custom capability level too high (max 1000)".to_string());
    }

    Ok(())
}

// Helper function to create capability tag for link operations
pub fn create_capability_tag(role: &str, level: u32) -> String {
    format!("{}:{}", role, level)
}

// Helper function to parse capability tag
pub fn parse_capability_tag(tag: &str) -> Result<(String, u32), String> {
    let parts: Vec<&str> = tag.split(':').collect();
    if parts.len() != 2 {
        return Err("Invalid capability tag format".to_string());
    }

    let role = parts[0].to_string();
    let level = parts[1].parse::<u32>()
        .map_err(|_| "Invalid capability level in tag".to_string())?;

    Ok((role, level))
}
