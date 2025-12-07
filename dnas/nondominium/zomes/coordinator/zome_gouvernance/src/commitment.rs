use crate::GovernanceError;
use hdk::prelude::*;
use zome_gouvernance_integrity::*;

// ============================================================================
// Commitment Management
// ============================================================================

#[derive(Serialize, Deserialize, Debug)]
pub struct ProposeCommitmentInput {
  pub action: VfAction,
  pub resource_hash: Option<ActionHash>,
  pub resource_spec_hash: Option<ActionHash>,
  pub provider: AgentPubKey,
  pub due_date: Timestamp,
  pub note: Option<String>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct ProposeCommitmentOutput {
  pub commitment_hash: ActionHash,
  pub commitment: Commitment,
}

#[hdk_extern]
pub fn propose_commitment(input: ProposeCommitmentInput) -> ExternResult<ProposeCommitmentOutput> {
  let agent_info = agent_info()?;
  let now = sys_time()?;

  // TODO: In Phase 2, check that the calling agent has restricted_access capability

  let commitment = Commitment {
    action: input.action,
    provider: input.provider,
    receiver: agent_info.agent_initial_pubkey,
    resource_inventoried_as: input.resource_hash,
    resource_conforms_to: input.resource_spec_hash,
    input_of: None, // TODO: Add process support in Phase 4
    due_date: input.due_date,
    note: input.note,
    committed_at: now,
  };

  let commitment_hash = create_entry(&EntryTypes::Commitment(commitment.clone()))?;

  // Create discovery link
  let path = Path::from("all_commitments");
  let anchor_hash = path.path_entry_hash()?;
  create_link(
    anchor_hash,
    commitment_hash.clone(),
    LinkTypes::AllCommitments,
    (),
  )?;

  // TODO: Link commitment to provider and receiver when AgentToCommitment link type is added
  // For now, just use the basic discovery link

  Ok(ProposeCommitmentOutput {
    commitment_hash,
    commitment,
  })
}

#[hdk_extern]
pub fn get_all_commitments(_: ()) -> ExternResult<Vec<Commitment>> {
  let path = Path::from("all_commitments");
  let anchor_hash = path.path_entry_hash()?;

  let links = get_links(
    LinkQuery::try_new(anchor_hash, LinkTypes::AllCommitments)?,
    GetStrategy::default(),
  )?;
  let mut commitments = Vec::new();

  for link in links {
    if let Ok(any_dht_hash) = AnyDhtHash::try_from(link.target.clone()) {
      if let Some(record) = get(any_dht_hash, GetOptions::default())? {
        if let Ok(Some(EntryTypes::Commitment(commitment))) =
          record.entry().to_app_option::<EntryTypes>().map_err(|_| {
            wasm_error!(WasmErrorInner::Guest(
              "Failed to deserialize commitment".into()
            ))
          })
        {
          commitments.push(commitment);
        }
      }
    }
  }

  Ok(commitments)
}

#[hdk_extern]
pub fn get_commitments_for_agent(agent: AgentPubKey) -> ExternResult<Vec<Commitment>> {
  // TODO: Implement agent-specific commitment links when AgentToCommitment link type is added
  // For now, filter all commitments by agent
  let all_commitments = get_all_commitments(())?;

  let agent_commitments: Vec<Commitment> = all_commitments
    .into_iter()
    .filter(|commitment| commitment.provider == agent || commitment.receiver == agent)
    .collect();

  Ok(agent_commitments)
}

#[derive(Serialize, Deserialize, Debug)]
pub struct ClaimCommitmentInput {
  pub commitment_hash: ActionHash,
  pub fulfillment_note: Option<String>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct ClaimCommitmentOutput {
  pub claim_hash: ActionHash,
  pub claim: Claim,
}

#[hdk_extern]
pub fn claim_commitment(input: ClaimCommitmentInput) -> ExternResult<ClaimCommitmentOutput> {
  let _agent_info = agent_info()?;
  let now = sys_time()?;

  // Get the original commitment
  let commitment_record = get(input.commitment_hash.clone(), GetOptions::default())?.ok_or(
    GovernanceError::CommitmentNotFound(input.commitment_hash.to_string()),
  )?;

  let _commitment = match commitment_record.entry().to_app_option::<EntryTypes>() {
    Ok(Some(EntryTypes::Commitment(commitment))) => commitment,
    _ => {
      return Err(
        GovernanceError::SerializationError("Invalid commitment entry".to_string()).into(),
      )
    }
  };

  // TODO: In Phase 2, verify that the calling agent is the provider of the commitment
  // TODO: In Phase 2, check that the commitment hasn't already been claimed

  let claim = Claim {
    fulfills: input.commitment_hash.clone(),
    fulfilled_by: input.commitment_hash.clone(), // TODO: Link to actual EconomicEvent
    claimed_at: now,
    note: input.fulfillment_note,
  };

  let claim_hash = create_entry(&EntryTypes::Claim(claim.clone()))?;

  // Create discovery link
  let path = Path::from("all_claims");
  let anchor_hash = path.path_entry_hash()?;
  create_link(anchor_hash, claim_hash.clone(), LinkTypes::AllClaims, ())?;

  // Link claim to the original commitment
  create_link(
    input.commitment_hash,
    claim_hash.clone(),
    LinkTypes::CommitmentToClaim,
    (),
  )?;

  Ok(ClaimCommitmentOutput { claim_hash, claim })
}

#[hdk_extern]
pub fn get_all_claims(_: ()) -> ExternResult<Vec<Claim>> {
  let path = Path::from("all_claims");
  let anchor_hash = path.path_entry_hash()?;

  let links = get_links(
    LinkQuery::try_new(anchor_hash, LinkTypes::AllClaims)?,
    GetStrategy::default(),
  )?;
  let mut claims = Vec::new();

  for link in links {
    if let Ok(any_dht_hash) = AnyDhtHash::try_from(link.target.clone()) {
      if let Some(record) = get(any_dht_hash, GetOptions::default())? {
        if let Ok(Some(EntryTypes::Claim(claim))) = record
          .entry()
          .to_app_option::<EntryTypes>()
          .map_err(|_| wasm_error!(WasmErrorInner::Guest("Failed to deserialize claim".into())))
        {
          claims.push(claim);
        }
      }
    }
  }

  Ok(claims)
}

#[hdk_extern]
pub fn get_claims_for_commitment(commitment_hash: ActionHash) -> ExternResult<Vec<Claim>> {
  let links = get_links(
    LinkQuery::try_new(commitment_hash, LinkTypes::CommitmentToClaim)?,
    GetStrategy::default(),
  )?;
  let mut claims = Vec::new();

  for link in links {
    if let Ok(any_dht_hash) = AnyDhtHash::try_from(link.target.clone()) {
      if let Some(record) = get(any_dht_hash, GetOptions::default())? {
        if let Ok(Some(EntryTypes::Claim(claim))) = record
          .entry()
          .to_app_option::<EntryTypes>()
          .map_err(|_| wasm_error!(WasmErrorInner::Guest("Failed to deserialize claim".into())))
        {
          claims.push(claim);
        }
      }
    }
  }

  Ok(claims)
}
