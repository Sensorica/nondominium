use hdk::prelude::*;
use nondominium_utils::call_hrea_zome;

/// Local mirror of hREA's `ReaAgent` struct for serialization.
/// Avoids a hard Cargo dependency on the hREA workspace.
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct ReaAgentInput {
  pub id: Option<ActionHash>,
  pub name: String,
  /// "Person" or "Organization"
  pub agent_type: String,
  /// Maps from Person.avatar_url
  pub image: Option<String>,
  pub classified_as: Option<Vec<String>>,
  pub note: Option<String>,
}

/// Create a `ReaAgent` in the hREA DNA and return its `ActionHash`.
/// Called internally by `create_person` to establish the cross-DNA link.
pub fn create_rea_agent_bridge(name: &str, image: Option<&str>) -> ExternResult<ActionHash> {
  let input = ReaAgentInput {
    id: None,
    name: name.to_string(),
    agent_type: "Person".to_string(),
    image: image.map(|s| s.to_string()),
    classified_as: None,
    note: None,
  };
  let record: Record = call_hrea_zome("create_rea_agent", input)?;
  Ok(record.action_address().clone())
}

/// Retrieve `ReaAgent` records from hREA by a list of `ActionHash` values.
/// Exposed as a public zome extern so the UI can resolve agent names/avatars
/// from hREA without duplicating data in Nondominium.
#[hdk_extern]
pub fn get_hrea_agents(hashes: Vec<ActionHash>) -> ExternResult<Vec<Option<Record>>> {
  call_hrea_zome("get_rea_agents_from_action_hashes", hashes)
}
