use hdk::prelude::*;
use zome_gouvernance_integrity::*;
use nondominium_utils::external_local_call;

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateAgreementInput {
  pub ndo_identity_hash: ActionHash,
  pub clauses: Vec<BenefitClause>,
  pub primary_accountable: Vec<AgentPubKey>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateAgreementInput {
  pub original_action_hash: ActionHash,
  pub clauses: Vec<BenefitClause>,
  pub primary_accountable: Vec<AgentPubKey>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AgreementRecord {
  pub action_hash: ActionHash,
  pub entry: Agreement,
}

/// Create the first Agreement for an NDO. Only AccountableAgents may call this.
#[hdk_extern]
pub fn create_agreement(input: CreateAgreementInput) -> ExternResult<ActionHash> {
  let caller = agent_info()?.agent_initial_pubkey;

  // Only AccountableAgent or higher may create an Agreement
  let has_role: bool = external_local_call(
    "has_person_role_capability",
    "zome_person",
    (caller.clone(), "Accountable Agent".to_string()),
  )?;
  if !has_role {
    return Err(wasm_error!(WasmErrorInner::Guest(
      "caller must hold AccountableAgent or higher to create an Agreement".to_string()
    )));
  }

  let now = sys_time()?;

  let agreement = Agreement {
    ndo_identity_hash: input.ndo_identity_hash.clone(),
    version: 1,
    clauses: input.clauses,
    primary_accountable: input.primary_accountable,
    created_by: caller,
    created_at: now,
  };

  let action_hash = create_entry(&EntryTypes::Agreement(agreement))?;

  // NDO-centric discovery (latest)
  create_link(
    input.ndo_identity_hash,
    action_hash.clone(),
    LinkTypes::NdoToAgreement,
    (),
  )?;

  Ok(action_hash)
}

/// Update an existing Agreement, incrementing its version.
#[hdk_extern]
pub fn update_agreement(input: UpdateAgreementInput) -> ExternResult<ActionHash> {
  let Some(original_record) = get(input.original_action_hash.clone(), GetOptions::default())? else {
    return Err(wasm_error!(WasmErrorInner::Guest(
      "original Agreement record not found".to_string()
    )));
  };

  let Ok(Some(original_entry)) = original_record.entry().to_app_option::<Agreement>() else {
    return Err(wasm_error!(WasmErrorInner::Guest(
      "could not decode original Agreement entry".to_string()
    )));
  };

  let agent = agent_info()?.agent_initial_pubkey;

  // Guard 1: caller must be AccountableAgent or higher
  let has_role: bool = external_local_call(
    "has_person_role_capability",
    "zome_person",
    (agent.clone(), "Accountable Agent".to_string()),
  )?;
  if !has_role {
    return Err(wasm_error!(WasmErrorInner::Guest(
      "caller must hold AccountableAgent or higher to update an Agreement".to_string()
    )));
  }

  // Guard 2: caller must be one of the primary_accountable agents for this Agreement
  if !original_entry.primary_accountable.contains(&agent) {
    return Err(wasm_error!(WasmErrorInner::Guest(
      "only a primary_accountable agent may update this Agreement".to_string()
    )));
  }

  let now = sys_time()?;

  let updated = Agreement {
    ndo_identity_hash: original_entry.ndo_identity_hash.clone(),
    version: original_entry.version + 1,
    clauses: input.clauses,
    primary_accountable: input.primary_accountable,
    created_by: agent,
    created_at: now,
  };

  let action_hash = update_entry(input.original_action_hash.clone(), &updated)?;

  // Version chain link
  create_link(
    input.original_action_hash,
    action_hash.clone(),
    LinkTypes::AgreementUpdates,
    (),
  )?;

  Ok(action_hash)
}

/// Get the current (latest version) Agreement for an NDO.
#[hdk_extern]
pub fn get_current_agreement(ndo_identity_hash: ActionHash) -> ExternResult<Option<AgreementRecord>> {
  let links = get_links(LinkQuery::try_new(ndo_identity_hash, LinkTypes::NdoToAgreement)?, GetStrategy::default())?;

  let Some(link) = links.into_iter().max_by_key(|l| l.timestamp) else {
    return Ok(None);
  };

  let Some(action_hash) = link.target.into_action_hash() else {
    return Ok(None);
  };

  // Walk update chain to latest
  let latest_hash = resolve_agreement_update_chain(action_hash.clone())?;
  let Some(record) = get(latest_hash.clone(), GetOptions::default())? else {
    return Ok(None);
  };

  let Ok(Some(entry)) = record.entry().to_app_option::<Agreement>() else {
    return Ok(None);
  };

  Ok(Some(AgreementRecord { action_hash: latest_hash, entry }))
}

/// Get a specific Agreement by its action hash (does not walk update chain).
#[hdk_extern]
pub fn get_agreement(action_hash: ActionHash) -> ExternResult<Option<AgreementRecord>> {
  let Some(record) = get(action_hash.clone(), GetOptions::default())? else {
    return Ok(None);
  };
  let Ok(Some(entry)) = record.entry().to_app_option::<Agreement>() else {
    return Ok(None);
  };
  Ok(Some(AgreementRecord { action_hash, entry }))
}

fn resolve_agreement_update_chain(original: ActionHash) -> ExternResult<ActionHash> {
  let mut current = original;
  loop {
    let links = get_links(LinkQuery::try_new(current.clone(), LinkTypes::AgreementUpdates)?, GetStrategy::default())?;
    let Some(link) = links.into_iter().max_by_key(|l| l.timestamp) else {
      return Ok(current);
    };
    let Some(next) = link.target.into_action_hash() else {
      return Ok(current);
    };
    current = next;
  }
}
