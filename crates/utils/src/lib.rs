use hdk::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Debug, thiserror::Error)]
pub enum CommonError {
  #[error("Serialization error: {0}")]
  Serialize(String),
  #[error("External call failed: {0}")]
  External(String),
}

impl From<CommonError> for WasmError {
  fn from(err: CommonError) -> Self {
    wasm_error!(WasmErrorInner::Guest(err.to_string()))
  }
}

/// Utility function for making external local calls to other zomes
/// This follows the pattern established in the Requests & Offers project
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

/// Helper function to call person zome functions
pub fn call_person_zome<I, T>(fn_name: &str, payload: I) -> ExternResult<T>
where
  I: Clone + Serialize + std::fmt::Debug,
  T: std::fmt::Debug + for<'de> Deserialize<'de>,
{
  external_local_call(fn_name, "zome_person", payload)
}

/// Helper function to call resource zome functions
pub fn call_resource_zome<I, T>(fn_name: &str, payload: I) -> ExternResult<T>
where
  I: Clone + Serialize + std::fmt::Debug,
  T: std::fmt::Debug + for<'de> Deserialize<'de>,
{
  external_local_call(fn_name, "zome_resource", payload)
}

/// Helper function to call governance zome functions
pub fn call_governance_zome<I, T>(fn_name: &str, payload: I) -> ExternResult<T>
where
  I: Clone + Serialize + std::fmt::Debug,
  T: std::fmt::Debug + for<'de> Deserialize<'de>,
{
  external_local_call(fn_name, "zome_gouvernance", payload)
}

/// Common validation helpers inspired by Requests & Offers patterns
pub mod validation {

  /// Validate that a string field is not empty and within length limits
  pub fn validate_string_field(
    value: &str,
    field_name: &str,
    max_length: usize,
  ) -> Result<(), String> {
    if value.trim().is_empty() {
      return Err(format!("{field_name} cannot be empty"));
    }

    if value.len() > max_length {
      return Err(format!(
        "{field_name} too long (max {max_length} characters)"
      ));
    }

    Ok(())
  }

  /// Validate URL format
  pub fn validate_url(url: &str) -> Result<(), String> {
    if !url.starts_with("http://") && !url.starts_with("https://") {
      return Err("URL must be a valid HTTP/HTTPS URL".to_string());
    }
    Ok(())
  }

  /// Validate email format (basic validation)
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

/// Path generation helpers for consistent anchor patterns
pub mod paths {
  use hdk::prelude::*;

  /// Generate a path for global discovery anchors
  pub fn global_anchor(entity_type: &str) -> Path {
    Path::from(format!("all_{entity_type}"))
  }

  /// Generate a path for agent-specific anchors
  pub fn agent_anchor(agent_pub_key: &AgentPubKey, relation: &str) -> Path {
    Path::from(format!("{relation}_{agent_pub_key}"))
  }

  /// Generate a path for category-based anchors
  pub fn category_anchor(entity_type: &str, category: &str) -> Path {
    Path::from(format!("{entity_type}_by_category_{category}"))
  }

  /// Generate a path for tag-based anchors
  pub fn tag_anchor(entity_type: &str, tag: &str) -> Path {
    Path::from(format!("{entity_type}_by_tag_{tag}"))
  }

  /// Generate a path for state-based anchors
  pub fn state_anchor(entity_type: &str, state: &str) -> Path {
    Path::from(format!("{entity_type}_by_state_{state}"))
  }
}

/// Link creation helpers with consistent patterns
/// Note: These functions are provided as helper patterns but may need
/// zome-specific LinkType implementations for proper generic constraints
pub mod links {
  use super::paths;
  use hdk::prelude::*;

  /// Create a global discovery link
  /// Generic L must implement Into<ScopedZomeType<LinkType>> for the specific zome
  pub fn create_global_discovery_link<L, E>(
    entity_type: &str,
    target_hash: ActionHash,
    link_type: L,
    tag: &str,
  ) -> ExternResult<()>
  where
    ScopedLinkType: TryFrom<L, Error = E>,
    WasmError: From<E>,
  {
    let anchor_path = paths::global_anchor(entity_type);
    let anchor_hash = anchor_path.path_entry_hash()?;
    create_link(anchor_hash, target_hash, link_type, LinkTag::new(tag))?;
    Ok(())
  }

  /// Create an agent-specific link
  /// Generic L must implement Into<ScopedZomeType<LinkType>> for the specific zome
  pub fn create_agent_link<L, E>(
    agent_pub_key: &AgentPubKey,
    relation: &str,
    target_hash: ActionHash,
    link_type: L,
    tag: &str,
  ) -> ExternResult<()>
  where
    ScopedLinkType: TryFrom<L, Error = E>,
    WasmError: From<E>,
  {
    let anchor_path = paths::agent_anchor(agent_pub_key, relation);
    let anchor_hash = anchor_path.path_entry_hash()?;
    create_link(anchor_hash, target_hash, link_type, LinkTag::new(tag))?;
    Ok(())
  }

  /// Create a category-based link
  /// Generic L must implement Into<ScopedZomeType<LinkType>> for the specific zome
  pub fn create_category_link<L, E>(
    entity_type: &str,
    category: &str,
    target_hash: ActionHash,
    link_type: L,
  ) -> ExternResult<()>
  where
    ScopedLinkType: TryFrom<L, Error = E>,
    WasmError: From<E>,
  {
    let anchor_path = paths::category_anchor(entity_type, category);
    let anchor_hash = anchor_path.path_entry_hash()?;
    create_link(anchor_hash, target_hash, link_type, LinkTag::new(category))?;
    Ok(())
  }
}
