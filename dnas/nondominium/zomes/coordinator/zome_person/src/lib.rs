use hdk::prelude::*;

pub mod person;
pub mod private_data;
pub mod private_data_sharing;
pub mod role;

pub use person::*;
pub use private_data::*;
pub use private_data_sharing::*;
pub use role::*;

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
