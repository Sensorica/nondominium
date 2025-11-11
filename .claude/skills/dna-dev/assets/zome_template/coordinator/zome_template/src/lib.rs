use hdk::prelude::*;
use zome_template_integrity::*;

// Public module exports
pub mod template;

// Re-export for convenience
pub use template::*;

// Error types
#[derive(Debug, thiserror::Error)]
pub enum TemplateError {
  #[error("Template not found: {0}")]
  TemplateNotFound(String),

  #[error("Template already exists")]
  TemplateAlreadyExists,

  #[error("Not the author of this template")]
  NotAuthor,

  #[error("Validation error: {0}")]
  ValidationError(String),

  #[error("Serialization error: {0}")]
  SerializationError(String),

  #[error("Entry operation failed: {0}")]
  EntryOperationFailed(String),

  #[error("Link operation failed: {0}")]
  LinkOperationFailed(String),

  #[error("Invalid input: {0}")]
  InvalidInput(String),

  #[error("Insufficient capability level: {0}")]
  InsufficientCapability(String),
}

impl From<TemplateError> for WasmError {
    fn from(err: TemplateError) -> Self {
        wasm_error!(WasmErrorInner::Guest(err.to_string()))
    }
}

// Initialize function
#[hdk_extern]
pub fn init(_: ()) -> ExternResult<InitCallbackResult> {
    Ok(InitCallbackResult::Pass)
}

// TODO: Add cross-zome call structures here
// Example:
// #[derive(Serialize, Deserialize, Debug)]
// pub struct ValidateTemplateAccessInput {
//     pub agent: AgentPubKey,
//     pub template_hash: ActionHash,
// }