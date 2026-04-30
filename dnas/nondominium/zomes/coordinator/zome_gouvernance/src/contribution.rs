use hdk::prelude::*;
use zome_gouvernance_integrity::*;
use nondominium_utils::external_local_call;

#[derive(Debug, Serialize, Deserialize)]
pub struct ValidateContributionInput {
  pub provider: AgentPubKey,
  pub action: VfAction,
  pub work_log_group_dna_hash: Option<DnaHash>,
  pub work_log_action_hash: Option<ActionHash>,
  pub ndo_identity_hash: ActionHash,
  pub input_of: Option<ActionHash>,
  pub note: String,
  pub effort_quantity: Option<f64>,
  pub fulfills: Option<ActionHash>,
  pub has_point_in_time: Timestamp,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ContributionRecord {
  pub action_hash: ActionHash,
  pub entry: Contribution,
}

/// Validate and record a work contribution on an NDO.
/// The calling agent is recorded as one of the validators.
#[hdk_extern]
pub fn validate_contribution(input: ValidateContributionInput) -> ExternResult<ActionHash> {
  let validator = agent_info()?.agent_initial_pubkey;

  // Only AccountableAgent or higher may act as a contribution validator
  let has_role: bool = external_local_call(
    "has_person_role_capability",
    "zome_person",
    (validator.clone(), "Accountable Agent".to_string()),
  )?;
  if !has_role {
    return Err(wasm_error!(WasmErrorInner::Guest(
      "only an AccountableAgent may validate contributions".to_string()
    )));
  }

  let now = sys_time()?;

  let contribution = Contribution {
    provider: input.provider.clone(),
    action: input.action,
    work_log_group_dna_hash: input.work_log_group_dna_hash,
    work_log_action_hash: input.work_log_action_hash,
    ndo_identity_hash: input.ndo_identity_hash.clone(),
    input_of: input.input_of,
    note: input.note,
    effort_quantity: input.effort_quantity,
    validated_by: vec![validator.clone()],
    fulfills: input.fulfills,
    has_point_in_time: input.has_point_in_time,
    validated_at: now,
  };

  let action_hash = create_entry(&EntryTypes::Contribution(contribution))?;

  // NDO-centric discovery
  create_link(
    input.ndo_identity_hash,
    action_hash.clone(),
    LinkTypes::NdoToContributions,
    (),
  )?;

  // Agent-centric discovery (provider)
  create_link(
    input.provider,
    action_hash.clone(),
    LinkTypes::AgentToContributions,
    (),
  )?;

  Ok(action_hash)
}

/// Get all contributions for a given NDO identity hash.
#[hdk_extern]
pub fn get_ndo_contributions(ndo_identity_hash: ActionHash) -> ExternResult<Vec<ContributionRecord>> {
  let links = get_links(LinkQuery::try_new(ndo_identity_hash, LinkTypes::NdoToContributions)?, GetStrategy::default())?;

  resolve_contribution_links(links)
}

/// Get all contributions from a given agent (provider).
#[hdk_extern]
pub fn get_agent_contributions(provider: AgentPubKey) -> ExternResult<Vec<ContributionRecord>> {
  let links = get_links(LinkQuery::try_new(provider, LinkTypes::AgentToContributions)?, GetStrategy::default())?;

  resolve_contribution_links(links)
}

/// Get a single Contribution by its action hash.
#[hdk_extern]
pub fn get_contribution(action_hash: ActionHash) -> ExternResult<Option<ContributionRecord>> {
  let Some(record) = get(action_hash.clone(), GetOptions::default())? else {
    return Ok(None);
  };
  let Ok(Some(entry)) = record.entry().to_app_option::<Contribution>() else {
    return Ok(None);
  };
  Ok(Some(ContributionRecord { action_hash, entry }))
}

fn resolve_contribution_links(links: Vec<Link>) -> ExternResult<Vec<ContributionRecord>> {
  let mut results = Vec::new();
  for link in links {
    let Some(action_hash) = link.target.into_action_hash() else {
      continue;
    };
    let Some(record) = get(action_hash.clone(), GetOptions::default())? else {
      continue;
    };
    let Ok(Some(entry)) = record.entry().to_app_option::<Contribution>() else {
      continue;
    };
    results.push(ContributionRecord { action_hash, entry });
  }
  Ok(results)
}
