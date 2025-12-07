use hdk::prelude::*;

pub mod capability_based_sharing;
pub mod device_management;
pub mod person;
pub mod private_data;
pub mod role;

pub use capability_based_sharing::*;
pub use device_management::*;
pub use person::*;
pub use private_data::*;
pub use role::*;

// Resolve ambiguous re-exports
pub use capability_based_sharing::ValidationResult as SharingValidationResult;
pub use person::PromoteAgentInput as PersonPromoteAgentInput;
pub use role::PromoteAgentInput as RolePromoteAgentInput;
pub use role::ValidationResult as RoleValidationResult;

#[derive(Debug, thiserror::Error)]
pub enum PersonError {
  #[error("Person already exists for this agent")]
  PersonAlreadyExists,

  #[error("Person not found: {0}")]
  PersonNotFound(String),

  #[error("Private data not found")]
  PrivateDataNotFound,

  #[error("Role not found: {0}")]
  RoleNotFound(String),

  #[error("Not the author of this entry")]
  NotAuthor,

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

impl From<PersonError> for WasmError {
  fn from(err: PersonError) -> Self {
    wasm_error!(WasmErrorInner::Guest(err.to_string()))
  }
}

#[hdk_extern]
pub fn init(_: ()) -> ExternResult<InitCallbackResult> {
  Ok(InitCallbackResult::Pass)
}
