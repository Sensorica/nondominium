use crate::GovernanceError;
use hdk::prelude::*;
use nondominium_shared::types::Measure;
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
  /// Explicit receiver of the flow. Previously the receiver was hardcoded to
  /// the caller, which forced the provider-is-caller convention and prevented
  /// third parties (e.g. a Group member proposing a commitment on behalf of
  /// two other agents) from authoring commitments. Making this explicit also
  /// keeps us closer to the ValueFlows flow pair (provider ↔ receiver).
  pub receiver: AgentPubKey,
  /// ValueFlows `resourceQuantity` for countable commitments. Optional for
  /// commitments whose quantity is implied by context (e.g. "repair this
  /// machine").
  pub resource_quantity: Option<Measure>,
  /// ValueFlows `effortQuantity` for labour/time components (e.g. "4 h").
  pub effort_quantity: Option<Measure>,
  pub due_date: Timestamp,
  pub note: Option<String>,
  /// Layer 0 identity for action-constraint evaluation.
  pub ndo_identity_hash: ActionHash,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct ProposeCommitmentOutput {
  pub commitment_hash: ActionHash,
  pub commitment: Commitment,
}

#[hdk_extern]
pub fn propose_commitment(input: ProposeCommitmentInput) -> ExternResult<ProposeCommitmentOutput> {
  let _agent_info = agent_info()?;
  let now = sys_time()?;

  // Shape-check any Measures before integrity sees them.
  if let Some(ref m) = input.resource_quantity {
    m.validate().map_err(|e| {
      wasm_error!(WasmErrorInner::Guest(format!(
        "Invalid resource_quantity: {e}"
      )))
    })?;
  }
  if let Some(ref m) = input.effort_quantity {
    m.validate().map_err(|e| {
      wasm_error!(WasmErrorInner::Guest(format!(
        "Invalid effort_quantity: {e}"
      )))
    })?;
  }

  // Hard action constraints are enforced by integrity validation.
  // Soft warnings: use evaluate_state_transition / check_action_constraints (parallel path).

  let commitment = Commitment {
    action: input.action,
    provider: input.provider,
    receiver: input.receiver,
    resource_inventoried_as: input.resource_hash,
    resource_conforms_to: input.resource_spec_hash,
    input_of: None, // TODO: Add process support in Phase 4
    resource_quantity: input.resource_quantity,
    effort_quantity: input.effort_quantity,
    due_date: input.due_date,
    note: input.note,
    committed_at: now,
    ndo_identity_hash: input.ndo_identity_hash,
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

  // NDO-indexed link: `get_commitments_for_ndo` reads this to answer
  // "every commitment attached to NDO X" in O(links) without a full
  // AllCommitments scan. The Group DNA's `CommitmentAnchor` uses the same
  // `commitment_action_hash` as pointer, so a pool-side pool scan can resolve
  // against this per-NDO index on the Nondominium side.
  create_link(
    commitment.ndo_identity_hash.clone(),
    commitment_hash.clone(),
    LinkTypes::NdoToCommitments,
    (),
  )?;

  // TODO: Link commitment to provider and receiver when AgentToCommitment link type is added

  Ok(ProposeCommitmentOutput {
    commitment_hash,
    commitment,
  })
}

/// Returns every commitment that was proposed against the given NDO Layer 0
/// identity hash. Reads the per-NDO `NdoToCommitments` index written by
/// `propose_commitment`, so it stays cheap as the global `AllCommitments`
/// anchor grows.
///
/// Pairs with the Group DNA's `CommitmentAnchor` for the Commitment Pool
/// read path: UIs can show "commitments on this NDO" (this fn) + "pools
/// this commitment is admitted to" (Group DNA side) and have both sides
/// cross-link via `commitment_action_hash`.
#[hdk_extern]
pub fn get_commitments_for_ndo(
  ndo_identity_hash: ActionHash,
) -> ExternResult<Vec<Commitment>> {
  let links = get_links(
    LinkQuery::try_new(ndo_identity_hash, LinkTypes::NdoToCommitments)?,
    GetStrategy::default(),
  )?;
  let mut commitments = Vec::new();
  for link in links {
    let Ok(hash) = AnyDhtHash::try_from(link.target) else {
      continue;
    };
    let Some(record) = get(hash, GetOptions::default())? else {
      continue;
    };
    if let Ok(Some(commitment)) =
      record.entry().to_app_option::<Commitment>().map_err(|_| {
        wasm_error!(WasmErrorInner::Guest(
          "Failed to deserialize commitment".into()
        ))
      })
    {
      commitments.push(commitment);
    }
  }
  Ok(commitments)
}

/// Hash-paired commitment record, returned by the `_detailed` reads.
///
/// The DHT-level link target is already an `ActionHash`, so pairing it with
/// the resolved `Commitment` costs nothing extra. UIs that need to act on a
/// specific commitment (admit to a pool, fulfill, withdraw) must have the
/// hash — the data-only variants above are kept for backward-compatible
/// listing reads.
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct CommitmentRecord {
  pub action_hash: ActionHash,
  pub commitment: Commitment,
}

#[hdk_extern]
pub fn get_all_commitments_detailed(_: ()) -> ExternResult<Vec<CommitmentRecord>> {
  let path = Path::from("all_commitments");
  let anchor_hash = path.path_entry_hash()?;

  let links = get_links(
    LinkQuery::try_new(anchor_hash, LinkTypes::AllCommitments)?,
    GetStrategy::default(),
  )?;
  let mut records = Vec::new();

  for link in links {
    let Ok(hash) = ActionHash::try_from(link.target.clone()) else {
      continue;
    };
    let Some(record) = get(hash.clone(), GetOptions::default())? else {
      continue;
    };
    if let Ok(Some(commitment)) =
      record.entry().to_app_option::<Commitment>().map_err(|_| {
        wasm_error!(WasmErrorInner::Guest(
          "Failed to deserialize commitment".into()
        ))
      })
    {
      records.push(CommitmentRecord {
        action_hash: hash,
        commitment,
      });
    }
  }
  Ok(records)
}

#[hdk_extern]
pub fn get_commitments_for_ndo_detailed(
  ndo_identity_hash: ActionHash,
) -> ExternResult<Vec<CommitmentRecord>> {
  let links = get_links(
    LinkQuery::try_new(ndo_identity_hash, LinkTypes::NdoToCommitments)?,
    GetStrategy::default(),
  )?;
  let mut records = Vec::new();
  for link in links {
    let Ok(hash) = ActionHash::try_from(link.target.clone()) else {
      continue;
    };
    let Some(record) = get(hash.clone(), GetOptions::default())? else {
      continue;
    };
    if let Ok(Some(commitment)) =
      record.entry().to_app_option::<Commitment>().map_err(|_| {
        wasm_error!(WasmErrorInner::Guest(
          "Failed to deserialize commitment".into()
        ))
      })
    {
      records.push(CommitmentRecord {
        action_hash: hash,
        commitment,
      });
    }
  }
  Ok(records)
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
        if let Ok(Some(commitment)) =
          record.entry().to_app_option::<Commitment>().map_err(|_| {
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

  let _commitment = match commitment_record.entry().to_app_option::<Commitment>() {
    Ok(Some(commitment)) => commitment,
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
        if let Ok(Some(claim)) = record
          .entry()
          .to_app_option::<Claim>()
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
        if let Ok(Some(claim)) = record
          .entry()
          .to_app_option::<Claim>()
          .map_err(|_| wasm_error!(WasmErrorInner::Guest("Failed to deserialize claim".into())))
        {
          claims.push(claim);
        }
      }
    }
  }

  Ok(claims)
}
