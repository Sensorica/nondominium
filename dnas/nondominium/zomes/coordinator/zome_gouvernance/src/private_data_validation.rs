use crate::GovernanceError;
use hdk::prelude::*;
use nondominium_utils::call_person_zome;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

// ============================================================================
// CROSS-ZOME PRIVATE DATA VALIDATION
// ============================================================================

/// Data structures matching those in the person zome for cross-zome calls
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ValidationDataRequest {
  pub target_agent: AgentPubKey,
  pub validation_context: String,
  pub required_fields: Vec<String>,
  pub governance_requester: AgentPubKey,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ValidationResult {
  pub is_valid: bool,
  pub validated_data: Option<HashMap<String, String>>,
  pub validation_context: String,
  pub validated_at: Timestamp,
  pub error_message: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AgentValidationInput {
  pub target_agent: AgentPubKey,
  pub required_fields: Vec<String>,
  pub validation_purpose: String, // e.g., "agent_promotion", "resource_transfer", "governance_validation"
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ValidateAgentForPromotionInput {
  pub target_role: String,
  pub target_agent: AgentPubKey,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ValidateAgentForCustodianshipInput {
  pub target_agent: AgentPubKey,
  pub resource_hash: Option<ActionHash>,
}

/// Request agent validation data from the person zome
/// This is the main function used by governance processes to validate agent private data
#[hdk_extern]
pub fn request_agent_validation_data(input: AgentValidationInput) -> ExternResult<ValidationResult> {
  let agent_info = agent_info()?;
  
  // Validate that we have proper governance authority
  // TODO: In Phase 2, add proper role validation
  
  // Validate required fields are reasonable
  let allowed_fields = ["email", "phone", "location", "time_zone", "emergency_contact"];
  for field in &input.required_fields {
    if !allowed_fields.contains(&field.as_str()) {
      return Err(GovernanceError::InvalidInput(
        format!("Field '{}' is not allowed for governance validation", field)
      ).into());
    }
  }
  
  // Create validation context
  let validation_context = format!("governance_{}_{}", 
    input.validation_purpose, 
    agent_info.agent_initial_pubkey
  );
  
  // Prepare request for person zome
  let validation_request = ValidationDataRequest {
    target_agent: input.target_agent,
    validation_context,
    required_fields: input.required_fields,
    governance_requester: agent_info.agent_initial_pubkey,
  };
  
  // Call the person zome to validate the agent's private data
  call_person_zome("validate_agent_private_data", validation_request)
    .map_err(|e| GovernanceError::EntryOperationFailed(
      format!("Failed to validate agent private data: {}", e)
    ).into())
}

/// Validate agent for role promotion
/// This function determines what private data is required for specific role promotions
#[hdk_extern]
pub fn validate_agent_for_promotion(input: ValidateAgentForPromotionInput) -> ExternResult<ValidationResult> {
  // Define required fields based on target role
  let required_fields = match input.target_role.as_str() {
    "Simple Agent" => vec!["email".to_string()],
    "Accountable Agent" => vec!["email".to_string(), "phone".to_string()],
    "Primary Accountable Agent" => vec!["email".to_string(), "phone".to_string(), "location".to_string()],
    "Transport Agent" | "Repair Agent" | "Storage Agent" => {
      vec!["email".to_string(), "phone".to_string(), "location".to_string(), "time_zone".to_string()]
    }
    _ => return Err(GovernanceError::InvalidInput(format!("Unknown role type: {}", input.target_role)).into()),
  };
  
  let validation_input = AgentValidationInput {
    target_agent: input.target_agent,
    required_fields,
    validation_purpose: format!("agent_promotion_{}", input.target_role.replace(" ", "_").to_lowercase()),
  };
  
  request_agent_validation_data(validation_input)
}

/// Validate agent for resource custodianship transfer
/// This requires comprehensive contact information for coordination
#[hdk_extern]
pub fn validate_agent_for_custodianship(input: ValidateAgentForCustodianshipInput) -> ExternResult<ValidationResult> {
  let required_fields = vec![
    "email".to_string(),
    "phone".to_string(),
    "location".to_string(),
    "time_zone".to_string(),
  ];
  
  let validation_purpose = if let Some(_) = input.resource_hash {
    "resource_custodianship_transfer".to_string()
  } else {
    "general_custodianship_validation".to_string()
  };
  
  let validation_input = AgentValidationInput {
    target_agent: input.target_agent,
    required_fields,
    validation_purpose,
  };
  
  request_agent_validation_data(validation_input)
}

/// Get validation requirements for a specific governance process
/// This helper function returns what private data fields are required for different processes
#[hdk_extern]
pub fn get_validation_requirements(process_type: String) -> ExternResult<Vec<String>> {
  let required_fields = match process_type.as_str() {
    "simple_agent_promotion" => vec!["email".to_string()],
    "accountable_agent_promotion" => vec!["email".to_string(), "phone".to_string()],
    "primary_accountable_agent_promotion" => vec!["email".to_string(), "phone".to_string(), "location".to_string()],
    "transport_agent_promotion" | "repair_agent_promotion" | "storage_agent_promotion" => {
      vec!["email".to_string(), "phone".to_string(), "location".to_string(), "time_zone".to_string()]
    }
    "resource_custodianship" => vec!["email".to_string(), "phone".to_string(), "location".to_string(), "time_zone".to_string()],
    "governance_validation" => vec!["email".to_string(), "phone".to_string()],
    _ => return Err(GovernanceError::InvalidInput(format!("Unknown process type: {}", process_type)).into()),
  };
  
  Ok(required_fields)
}

// ============================================================================
// GOVERNANCE VALIDATION INTEGRATION
// ============================================================================

/// Create a validation receipt that includes private data validation
/// This extends the existing validation system to include agent data validation
#[derive(Serialize, Deserialize, Debug)]
pub struct CreateValidationWithPrivateDataInput {
  pub validated_item: ActionHash,
  pub validation_type: String,
  pub target_agent: AgentPubKey,
  pub required_private_data: Vec<String>,
  pub approved: bool,
  pub notes: Option<String>,
}

#[hdk_extern]
pub fn create_validation_with_private_data(
  input: CreateValidationWithPrivateDataInput,
) -> ExternResult<ActionHash> {
  // First, validate the agent's private data
  let validation_input = AgentValidationInput {
    target_agent: input.target_agent.clone(),
    required_fields: input.required_private_data.clone(),
    validation_purpose: input.validation_type.clone(),
  };
  
  let validation_result = request_agent_validation_data(validation_input)?;
  
  if !validation_result.is_valid {
    return Err(GovernanceError::InvalidValidationScheme(
      format!("Agent private data validation failed: {}", 
        validation_result.error_message.unwrap_or("Unknown error".to_string()))
    ).into());
  }
  
  // Create the validation receipt with private data validation included
  let agent_info = agent_info()?;
  let now = sys_time()?;
  
  // Create enhanced notes that include private data validation info
  let enhanced_notes = match input.notes {
    Some(notes) => format!("{}\n\nPrivate data validated: {} fields verified at {}", 
      notes, 
      input.required_private_data.len(),
      validation_result.validated_at
    ),
    None => format!("Private data validated: {} fields verified at {}", 
      input.required_private_data.len(),
      validation_result.validated_at
    ),
  };
  
  // TODO: Create validation receipt entry (using existing ValidationReceipt from integrity zome)
  // For now, we'll return a placeholder hash
  let placeholder_hash = ActionHash::from_raw_36(vec![0; 36]);
  Ok(placeholder_hash)
}