// Types and I/O structs are available to all compilation targets
// (integrity zomes, coordinator zomes, native test crates).
pub mod io;
pub mod types;

// Re-export types at crate root for ergonomic imports
pub use types::*;

// The following modules use hdk (coordinator-only) and are gated behind
// the `coordinator` feature. Integrity zomes and test crates do NOT enable
// this feature, so they never see hdk as a transitive dependency.
#[cfg(feature = "coordinator")]
pub mod errors;
#[cfg(feature = "coordinator")]
pub mod paths;
#[cfg(feature = "coordinator")]
pub use errors::{CommonError, GovernanceError, PersonError, ResourceError};

#[cfg(feature = "coordinator")]
use hdk::prelude::*;
#[cfg(feature = "coordinator")]
use serde::{Deserialize, Serialize};

#[cfg(feature = "coordinator")]
pub fn external_local_call<I, T>(fn_name: &str, zome_name: &str, payload: I) -> ExternResult<T>
where
  I: Clone + Serialize + std::fmt::Debug,
  T: std::fmt::Debug + for<'de> Deserialize<'de>,
{
  let zome_call_response = call(
    CallTargetCell::Local,
    ZomeName(zome_name.to_owned().into()),
    FunctionName(fn_name.into()),
    None,
    payload.clone(),
  )?;

  match zome_call_response {
    ZomeCallResponse::Ok(response) => response
      .decode()
      .map_err(|e| CommonError::Serialize(format!("Failed to decode response: {e:?}")).into()),
    _ => Err(
      CommonError::External(format!(
        "Error while calling the {fn_name} function of the {zome_name} zome"
      ))
      .into(),
    ),
  }
}

#[cfg(feature = "coordinator")]
pub fn call_person_zome<I, T>(fn_name: &str, payload: I) -> ExternResult<T>
where
  I: Clone + Serialize + std::fmt::Debug,
  T: std::fmt::Debug + for<'de> Deserialize<'de>,
{
  external_local_call(fn_name, "zome_person", payload)
}

#[cfg(feature = "coordinator")]
pub fn call_resource_zome<I, T>(fn_name: &str, payload: I) -> ExternResult<T>
where
  I: Clone + Serialize + std::fmt::Debug,
  T: std::fmt::Debug + for<'de> Deserialize<'de>,
{
  external_local_call(fn_name, "zome_resource", payload)
}

#[cfg(feature = "coordinator")]
pub fn call_governance_zome<I, T>(fn_name: &str, payload: I) -> ExternResult<T>
where
  I: Clone + Serialize + std::fmt::Debug,
  T: std::fmt::Debug + for<'de> Deserialize<'de>,
{
  external_local_call(fn_name, "zome_gouvernance", payload)
}

#[cfg(feature = "coordinator")]
pub fn call_hrea_zome<I, O>(fn_name: &str, payload: I) -> ExternResult<O>
where
  I: Serialize + std::fmt::Debug,
  O: std::fmt::Debug + for<'de> Deserialize<'de>,
{
  let response = call(
    CallTargetCell::OtherRole("hrea".into()),
    ZomeName("hrea".into()),
    FunctionName(fn_name.into()),
    None,
    payload,
  )?;
  match response {
    ZomeCallResponse::Ok(output) => output.decode().map_err(|e| {
      wasm_error!(WasmErrorInner::Guest(format!("hREA response decode error: {}", e)))
    }),
    ZomeCallResponse::Unauthorized(_, _, _, _) => {
      Err(wasm_error!(WasmErrorInner::Guest("hREA call unauthorized".into())))
    }
    ZomeCallResponse::AuthenticationFailed(_, _) => {
      Err(wasm_error!(WasmErrorInner::Guest("hREA call authentication failed".into())))
    }
    ZomeCallResponse::NetworkError(e) => {
      Err(wasm_error!(WasmErrorInner::Guest(format!("hREA network error: {}", e))))
    }
    ZomeCallResponse::CountersigningSession(e) => {
      Err(wasm_error!(WasmErrorInner::Guest(format!("hREA countersigning error: {}", e))))
    }
  }
}

pub mod validation {
  pub fn validate_string_field(
    value: &str,
    field_name: &str,
    max_length: usize,
  ) -> Result<(), String> {
    if value.trim().is_empty() {
      return Err(format!("{field_name} cannot be empty"));
    }
    if value.len() > max_length {
      return Err(format!("{field_name} too long (max {max_length} characters)"));
    }
    Ok(())
  }

  pub fn validate_url(url: &str) -> Result<(), String> {
    if !url.starts_with("http://") && !url.starts_with("https://") {
      return Err("URL must be a valid HTTP/HTTPS URL".to_string());
    }
    Ok(())
  }

  pub fn validate_email(email: &str) -> Result<(), String> {
    if email.trim().is_empty() || !email.contains('@') {
      return Err("Valid email address is required".to_string());
    }
    if email.len() > 254 {
      return Err("Email address too long".to_string());
    }
    Ok(())
  }
}

// =============================================================================
// GroupError — domain errors for zome_group
// =============================================================================

#[derive(Debug, thiserror::Error)]
pub enum GroupError {
  #[error("Group not found: {0}")]
  GroupNotFound(String),
  #[error("Already a member of this group")]
  AlreadyMember,
  #[error("Not a member of this group")]
  NotMember,
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

impl From<GroupError> for WasmError {
  fn from(err: GroupError) -> Self {
    wasm_error!(WasmErrorInner::Guest(err.to_string()))
  }
}
