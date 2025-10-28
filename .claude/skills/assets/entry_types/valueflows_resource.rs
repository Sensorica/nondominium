// ValueFlows Economic Resource entry template
// Use this for resources that follow ValueFlows standards
// 🚨 CRITICAL: NO direct ActionHash references in entry fields - use links instead!

#[hdk_entry_helper]
#[derive(Clone, PartialEq)]
pub struct EconomicResource {
    // Current state and classification (NO direct references!)
    pub current_state: String,
    pub classification: Option<String>,

    // Identification and tracking
    pub tracking_identifier: Option<String>,
    pub unit_of_effort: Option<String>,
    pub note: Option<String>,

    // Quantity information
    pub current_quantity: Option<f64>,
    pub unit_of_resource: Option<String>,

    // Agent ownership (single creator, NO timestamps!)
    pub created_by: AgentPubKey,
}

// Input structure for creation
// NOTE: Direct references like resource_specification are handled via LINKS, not entry fields
#[derive(Serialize, Deserialize, Debug)]
pub struct CreateEconomicResourceInput {
    pub current_state: String,
    pub classification: Option<String>,
    pub tracking_identifier: Option<String>,
    pub unit_of_effort: Option<String>,
    pub note: Option<String>,
    pub current_quantity: Option<f64>,
    pub unit_of_resource: Option<String>,
}

// 🎯 RELATIONSHIP PATTERNS - Use Links for All Relationships
//
// Instead of storing direct ActionHash references in the entry, create links:
//
// create_link(resource_hash, spec_hash, LinkTypes::ResourceToSpecification, LinkTag::new("conforms_to"))?;
// create_link(resource_hash, containing_resource_hash, LinkTypes::ResourceToContainer, LinkTag::new("contained_in"))?;
// create_link(resource_hash, accountable_agent, LinkTypes::ResourceToAccountable, LinkTag::new("accountable"))?;
// create_link(resource_hash, owner_agent, LinkTypes::ResourceToOwner, LinkTag::new("owned_by"))?;
//
// Query relationships with:
// let links = get_links(resource_hash, LinkTypes::ResourceToSpecification, None)?;
// let spec_links = get_links(spec_hash, LinkTypes::SpecificationToResource, None)?;

// Input structure for updates
#[derive(Serialize, Deserialize, Debug)]
pub struct UpdateEconomicResourceInput {
    pub original_action_hash: ActionHash,
    pub current_state: Option<String>,
    pub classification: Option<String>,
    pub note: Option<String>,
    pub primary_accountable: Option<AgentPubKey>,
    pub owner: Option<AgentPubKey>,
    pub current_quantity: Option<f64>,
}

// Validation function
pub fn validate_economic_resource(input: &CreateEconomicResourceInput) -> Result<(), String> {
    // Validate required fields
    if input.current_state.trim().is_empty() {
        return Err("Current state cannot be empty".to_string());
    }

    // Validate state against ValueFlows standard states
    let valid_states = [
        "available", "unavailable", "depleted", "active", "inactive",
        "present", "absent", "closed", "pending"
    ];

    if !valid_states.contains(&input.current_state.as_str()) {
        return Err(format!("Invalid state: {}. Valid states: {:?}",
                          input.current_state, valid_states));
    }

    // Validate quantities
    if let Some(quantity) = input.current_quantity {
        if quantity < 0.0 {
            return Err("Current quantity cannot be negative".to_string());
        }
    }

    // Validate tracking identifier format
    if let Some(ref tracking_id) = input.tracking_identifier {
        if tracking_id.trim().is_empty() {
            return Err("Tracking identifier cannot be empty if provided".to_string());
        }
        if tracking_id.len() > 100 {
            return Err("Tracking identifier too long (max 100 characters)".to_string());
        }
    }

    Ok(())
}

// Helper function to get standard resource states
pub fn get_standard_resource_states() -> Vec<&'static str> {
    vec![
        "available",    // Resource can be used
        "unavailable",  // Resource temporarily unavailable
        "depleted",     // Resource exhausted
        "active",       // Resource currently in use
        "inactive",     // Resource not currently in use
        "present",      // Resource exists and is present
        "absent",       // Resource exists but not present
        "closed",       // Resource lifecycle complete
        "pending",      // Resource awaiting activation
    ]
}

// Helper function to validate resource state transition
pub fn validate_state_transition(current_state: &str, new_state: &str) -> Result<(), String> {
    // Define valid state transitions
    let valid_transitions = [
        ("pending", "active"),
        ("pending", "closed"),
        ("active", "unavailable"),
        ("active", "depleted"),
        ("active", "inactive"),
        ("active", "closed"),
        ("unavailable", "available"),
        ("inactive", "active"),
        ("available", "active"),
        ("available", "unavailable"),
        ("available", "depleted"),
        ("depleted", "available"), // Can be replenished
    ];

    // Allow same state (no change)
    if current_state == new_state {
        return Ok(());
    }

    // Check if transition is valid
    for (from, to) in valid_transitions {
        if current_state == from && new_state == to {
            return Ok(());
        }
    }

    Err(format!("Invalid state transition: {} -> {}", current_state, new_state))
}