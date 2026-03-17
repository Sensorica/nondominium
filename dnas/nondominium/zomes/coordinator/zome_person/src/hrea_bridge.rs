use hdk::prelude::*;

/// Generic bridge helper for calling functions in the hREA DNA.
/// Uses `CallTargetCell::OtherRole("hrea")` — mirrors the `external_local_call`
/// pattern in `nondominium_utils` but targets the cross-DNA hREA role.
pub fn call_hrea<I, O>(fn_name: &str, payload: I) -> ExternResult<O>
where
  I: serde::Serialize + std::fmt::Debug,
  O: std::fmt::Debug + for<'de> serde::Deserialize<'de>,
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
    ZomeCallResponse::Unauthorized(_, _, _, _) => Err(wasm_error!(WasmErrorInner::Guest(
      "hREA call unauthorized".into()
    ))),
    ZomeCallResponse::AuthenticationFailed(_, _) => Err(wasm_error!(WasmErrorInner::Guest(
      "hREA call authentication failed".into()
    ))),
    ZomeCallResponse::NetworkError(e) => Err(wasm_error!(WasmErrorInner::Guest(format!(
      "hREA network error: {}",
      e
    )))),
    ZomeCallResponse::CountersigningSession(e) => Err(wasm_error!(WasmErrorInner::Guest(
      format!("hREA countersigning error: {}", e)
    ))),
  }
}

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
  let record: Record = call_hrea("create_rea_agent", input)?;
  Ok(record.action_address().clone())
}

/// Retrieve `ReaAgent` records from hREA by a list of `ActionHash` values.
/// Exposed as a public zome extern so the UI can resolve agent names/avatars
/// from hREA without duplicating data in Nondominium.
#[hdk_extern]
pub fn get_hrea_agents(hashes: Vec<ActionHash>) -> ExternResult<Vec<Option<Record>>> {
  call_hrea("get_rea_agents_from_action_hashes", hashes)
}
