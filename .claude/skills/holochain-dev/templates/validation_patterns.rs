//! Validation Pattern Templates
//! Reference examples for common validation patterns in integrity zomes

use hdk::prelude::*;

/// Example: String validation patterns
pub fn validate_non_empty_string(value: &str, field_name: &str) -> Result<(), String> {
    if value.trim().is_empty() {
        return Err(format!("{} cannot be empty", field_name));
    }
    if value.len() > 1000 {
        return Err(format!("{} exceeds maximum length of 1000 characters", field_name));
    }
    Ok(())
}

/// Example: Numeric validation patterns
pub fn validate_positive_number(value: f64, field_name: &str) -> Result<(), String> {
    if value <= 0.0 {
        return Err(format!("{} must be positive", field_name));
    }
    if value.is_nan() || value.is_infinite() {
        return Err(format!("{} must be a valid number", field_name));
    }
    Ok(())
}

/// Example: Agent validation patterns
pub fn validate_agent_pub_key(agent: &AgentPubKey) -> Result<(), String> {
    // Basic validation - in real implementation, you might want to check
    // if the agent is valid in the current context
    if agent.0.to_vec().is_empty() {
        return Err("Invalid agent public key".to_string());
    }
    Ok(())
}

/// Example: Timestamp validation patterns
pub fn validate_timestamp(timestamp: Timestamp) -> Result<(), String> {
    let now = sys_time().map_err(|e| format!("Failed to get current time: {:?}", e))?;

    // Allow timestamps up to 1 hour in the future (for clock skew)
    let future_limit = now.as_secs() + 3600;

    if timestamp.as_secs() > future_limit {
        return Err("Timestamp is too far in the future".to_string());
    }

    // Don't allow timestamps more than 10 years in the past
    let past_limit = now.as_secs() - 315360000; // 10 years in seconds

    if timestamp.as_secs() < past_limit {
        return Err("Timestamp is too far in the past".to_string());
    }

    Ok(())
}

/// Example: Economic resource validation (ValueFlows pattern)
pub fn validate_economic_resource_quantity(quantity: f64) -> Result<(), String> {
    validate_positive_number(quantity, "quantity")?;

    // Additional economic-specific validation
    if quantity > 1e15 {
        return Err("Quantity exceeds maximum allowed value".to_string());
    }

    Ok(())
}

/// Example: Role-based validation pattern
pub fn validate_role_assignment(role: &str, capabilities: &[String]) -> Result<(), String> {
    let valid_roles = vec!["admin", "user", "moderator", "participant"];

    if !valid_roles.contains(&role) {
        return Err(format!("Invalid role: {}", role));
    }

    if capabilities.is_empty() {
        return Err("At least one capability must be assigned".to_string());
    }

    Ok(())
}

/// Example: PPR (Private data, Purpose, Rights) validation pattern
pub fn validate_ppr_request(
    purpose: &str,
    requested_capabilities: &[String],
    expiration: Option<Timestamp>,
) -> Result<(), String> {
    validate_non_empty_string(purpose, "purpose")?;

    if requested_capabilities.is_empty() {
        return Err("At least one capability must be requested".to_string());
    }

    if let Some(exp) = expiration {
        validate_timestamp(exp)?;
    }

    // Check purpose length and content
    if purpose.len() > 500 {
        return Err("Purpose description exceeds maximum length".to_string());
    }

    Ok(())
}

/// Example: Link validation patterns
pub fn validate_link_creation(
    base: &AnyLinkableHash,
    target: &AnyLinkableHash,
    link_type: &str,
) -> Result<(), String> {
    // Prevent self-links
    if base == target {
        return Err("Cannot create self-referencing links".to_string());
    }

    // Validate link type
    let valid_link_types = vec!["anchor", "resource", "person", "governance"];
    if !valid_link_types.contains(&link_type) {
        return Err(format!("Invalid link type: {}", link_type));
    }

    Ok(())
}

/// Example: Comprehensive entry validation
pub fn validate_comprehensive_entry(
    title: &str,
    description: &str,
    agent: &AgentPubKey,
    created_at: Timestamp,
) -> Result<(), String> {
    validate_non_empty_string(title, "title")?;
    validate_non_empty_string(description, "description")?;
    validate_agent_pub_key(agent)?;
    validate_timestamp(created_at)?;

    // Additional business logic validation
    if title.len() > 200 {
        return Err("Title exceeds maximum length of 200 characters".to_string());
    }

    // Check for prohibited content
    let prohibited_words = vec!["spam", "illegal", "forbidden"];
    let title_lower = title.to_lowercase();

    for word in prohibited_words {
        if title_lower.contains(word) {
            return Err(format!("Title contains prohibited word: {}", word));
        }
    }

    Ok(())
}