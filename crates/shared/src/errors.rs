use hdk::prelude::*;

// =============================================================================
// CommonError — infrastructure errors shared across all zomes
// =============================================================================

#[derive(Debug, thiserror::Error)]
pub enum CommonError {
  #[error("Serialization error: {0}")]
  Serialize(String),
  #[error("External call failed: {0}")]
  External(String),
  #[error("Entry not found: {0}")]
  EntryNotFound(String),
  #[error("Record not found: {0}")]
  RecordNotFound(String),
  #[error("Link operation failed: {0}")]
  LinkError(String),
  #[error("Action hash not found: {0}")]
  ActionHashNotFound(String),
  #[error("Entry operation failed: {0}")]
  EntryOperationFailed(String),
}

impl From<CommonError> for WasmError {
  fn from(err: CommonError) -> Self {
    wasm_error!(WasmErrorInner::Guest(err.to_string()))
  }
}

// =============================================================================
// PersonError — domain errors for zome_person
// =============================================================================

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

// =============================================================================
// ResourceError — domain errors for zome_resource
// =============================================================================

#[derive(Debug, thiserror::Error)]
pub enum ResourceError {
  #[error("Resource specification not found: {0}")]
  ResourceSpecNotFound(String),

  #[error("Economic resource not found: {0}")]
  EconomicResourceNotFound(String),

  #[error("Governance rule not found: {0}")]
  GovernanceRuleNotFound(String),

  #[error("Not the author of this entry")]
  NotAuthor,

  #[error("Not the custodian of this resource")]
  NotCustodian,

  #[error("Serialization error: {0}")]
  SerializationError(String),

  #[error("Entry operation failed: {0}")]
  EntryOperationFailed(String),

  #[error("Link operation failed: {0}")]
  LinkOperationFailed(String),

  #[error("Invalid input: {0}")]
  InvalidInput(String),

  #[error("Governance rule violation: {0}")]
  GovernanceViolation(String),
}

impl From<ResourceError> for WasmError {
  fn from(err: ResourceError) -> Self {
    wasm_error!(WasmErrorInner::Guest(err.to_string()))
  }
}

// =============================================================================
// GovernanceError — domain errors for zome_gouvernance
// =============================================================================

#[derive(Debug, thiserror::Error)]
pub enum GovernanceError {
  #[error("Validation receipt not found: {0}")]
  ValidationReceiptNotFound(String),

  #[error("Economic event not found: {0}")]
  EconomicEventNotFound(String),

  #[error("Resource validation not found: {0}")]
  ResourceValidationNotFound(String),

  #[error("Commitment not found: {0}")]
  CommitmentNotFound(String),

  #[error("Not authorized for this validation")]
  NotAuthorizedValidator,

  #[error("Insufficient capability level: {0}")]
  InsufficientCapability(String),

  #[error("Validation already exists for this item: {0}")]
  ValidationAlreadyExists(String),

  #[error("Invalid validation scheme: {0}")]
  InvalidValidationScheme(String),

  #[error("Serialization error: {0}")]
  SerializationError(String),

  #[error("Entry operation failed: {0}")]
  EntryOperationFailed(String),

  #[error("Link operation failed: {0}")]
  LinkOperationFailed(String),

  #[error("Invalid input: {0}")]
  InvalidInput(String),

  #[error("Cross-zome call failed: {0}")]
  CrossZomeCallFailed(String),
}

impl From<GovernanceError> for WasmError {
  fn from(err: GovernanceError) -> Self {
    wasm_error!(WasmErrorInner::Guest(err.to_string()))
  }
}
