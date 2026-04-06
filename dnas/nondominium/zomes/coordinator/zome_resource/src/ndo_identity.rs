use crate::ResourceError;
use hdk::prelude::*;
use zome_resource_integrity::*;

// Input for creating a NondominiumIdentity (Layer 0 anchor)
#[derive(Debug, Serialize, Deserialize)]
pub struct NdoInput {
  pub name: String,
  pub property_regime: PropertyRegime,
  pub resource_nature: ResourceNature,
  pub lifecycle_stage: LifecycleStage,
  pub description: Option<String>,
}

// Output from create_ndo — the action_hash IS the stable Layer 0 identity
#[derive(Debug, Serialize, Deserialize)]
pub struct NdoOutput {
  pub action_hash: ActionHash,
  pub entry: NondominiumIdentity,
}

// Output from get_all_ndos
#[derive(Debug, Serialize, Deserialize)]
pub struct GetAllNdosOutput {
  pub ndos: Vec<NdoOutput>,
}

// Input for updating a NondominiumIdentity's lifecycle stage (the only permitted mutation).
// REQ-NDO-LC-06: successor_ndo_hash required when new_stage == Deprecated.
// REQ-NDO-L0-05: transition_event_hash references the triggering EconomicEvent.
//   Link is created when Some; full cross-zome validation of the event is deferred
//   until coordinator cross-zome calls to zome_gouvernance are stable.
#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateLifecycleStageInput {
  pub original_action_hash: ActionHash,
  pub new_stage: LifecycleStage,
  /// Must be Some when new_stage == Deprecated (REQ-NDO-LC-06)
  pub successor_ndo_hash: Option<ActionHash>,
  /// Triggering EconomicEvent action hash (REQ-NDO-L0-05); link created when Some
  pub transition_event_hash: Option<ActionHash>,
}

/// Resolves the HDK update chain to the latest Record for a NondominiumIdentity.
/// Returns None if the original_action_hash does not exist on the DHT.
///
/// Used by both get_ndo and update_lifecycle_stage to avoid duplicated chain traversal logic.
fn resolve_latest_ndo_record(original_action_hash: ActionHash) -> ExternResult<Option<Record>> {
  let mut current_hash = original_action_hash;
  loop {
    match get_details(current_hash.clone(), GetOptions::default())? {
      Some(Details::Record(record_details)) => {
        if record_details.updates.is_empty() {
          return Ok(Some(record_details.record));
        }
        // Follow the most recent update in the chain
        current_hash = record_details
          .updates
          .into_iter()
          .max_by_key(|sah| sah.action().timestamp())
          .ok_or(ResourceError::EntryOperationFailed(
            "Empty updates list during chain traversal".to_string(),
          ))?
          .hashed
          .hash;
      }
      _ => return Ok(None),
    }
  }
}

/// Create a new NondominiumIdentity (NDO Layer 0 anchor).
///
/// The returned action_hash is the stable, permanent Layer 0 identity for this resource.
/// It never changes, even as lifecycle_stage evolves through subsequent updates.
///
/// REQ-NDO-L0-01, REQ-NDO-L0-02, REQ-NDO-L0-07
#[hdk_extern]
pub fn create_ndo(input: NdoInput) -> ExternResult<NdoOutput> {
  if input.name.trim().is_empty() {
    return Err(ResourceError::InvalidInput("Name cannot be empty".to_string()).into());
  }

  let agent_info = agent_info()?;

  let entry = NondominiumIdentity {
    name: input.name,
    initiator: agent_info.agent_initial_pubkey.clone(),
    property_regime: input.property_regime,
    resource_nature: input.resource_nature,
    lifecycle_stage: input.lifecycle_stage,
    created_at: sys_time()?,
    description: input.description,
    successor_ndo_hash: None,
    hibernation_origin: None,
  };

  let action_hash = create_entry(&EntryTypes::NondominiumIdentity(entry.clone()))?;

  // Global discovery anchor — all NDOs discoverable by anyone
  let all_ndos_path = Path::from("ndo_identities");
  create_link(
    all_ndos_path.path_entry_hash()?,
    action_hash.clone(),
    LinkTypes::AllNdos,
    (),
  )?;

  // Agent-centric discovery — initiator's NDOs discoverable per agent
  create_link(
    agent_info.agent_initial_pubkey.clone(),
    action_hash.clone(),
    LinkTypes::AgentToNdo,
    (),
  )?;

  Ok(NdoOutput { action_hash, entry })
}

/// Retrieve the latest NondominiumIdentity by its original action hash.
///
/// Resolves the HDK update chain iteratively: if the entry has been updated
/// (lifecycle_stage progression), returns the most recent version. The
/// original_action_hash remains the stable Layer 0 identity regardless of updates.
///
/// Returns None if the entry does not exist.
///
/// REQ-NDO-L0-01, REQ-NDO-L0-07
#[hdk_extern]
pub fn get_ndo(original_action_hash: ActionHash) -> ExternResult<Option<NondominiumIdentity>> {
  let Some(record) = resolve_latest_ndo_record(original_action_hash)? else {
    return Ok(None);
  };
  record
    .entry()
    .to_app_option::<NondominiumIdentity>()
    .map_err(|e| {
      ResourceError::SerializationError(format!(
        "Failed to deserialize NondominiumIdentity: {:?}",
        e
      ))
      .into()
    })
}

/// Update the lifecycle_stage of a NondominiumIdentity.
///
/// This is the ONLY permitted mutation on a Layer 0 entry (plus successor_ndo_hash,
/// which is set exactly once when transitioning to Deprecated). All other fields are
/// enforced as immutable by the integrity validation (REQ-NDO-L0-03, REQ-NDO-L0-04).
/// Only the initiator may call this function (REQ-NDO-L0-03).
///
/// When new_stage == Deprecated, successor_ndo_hash must be Some — enforced here and
/// in the integrity zome (REQ-NDO-LC-06). Creates NdoToSuccessor link.
///
/// Creates NdoToTransitionEvent link when transition_event_hash is Some (REQ-NDO-L0-05).
/// Full cross-zome validation of the event target is deferred until coordinator
/// cross-zome calls to zome_gouvernance are stable.
///
/// Returns the new action hash. The original_action_hash remains the stable Layer 0 identity.
///
/// REQ-NDO-L0-03, REQ-NDO-LC-01 through REQ-NDO-LC-07
#[hdk_extern]
pub fn update_lifecycle_stage(input: UpdateLifecycleStageInput) -> ExternResult<ActionHash> {
  let caller = agent_info()?.agent_initial_pubkey;

  let record = resolve_latest_ndo_record(input.original_action_hash.clone())?
    .ok_or(ResourceError::EntryOperationFailed(
      "NondominiumIdentity not found for update".to_string(),
    ))?;

  let mut current_entry: NondominiumIdentity = record
    .entry()
    .to_app_option()
    .map_err(|e| {
      ResourceError::SerializationError(format!(
        "Failed to deserialize NondominiumIdentity: {:?}",
        e
      ))
    })?
    .ok_or(ResourceError::EntryOperationFailed(
      "NondominiumIdentity entry not found in latest record".to_string(),
    ))?;

  // Only the initiator may advance the lifecycle stage (REQ-NDO-L0-03)
  if caller != current_entry.initiator {
    return Err(ResourceError::NotAuthor.into());
  }

  // Coordinator pre-flight: Deprecated requires a successor (REQ-NDO-LC-06)
  if input.new_stage == LifecycleStage::Deprecated && input.successor_ndo_hash.is_none() {
    return Err(ResourceError::InvalidInput(
      "Transitioning to Deprecated requires successor_ndo_hash (REQ-NDO-LC-06)".to_string(),
    )
    .into());
  }

  // Apply mutations — integrity validation enforces the state machine and immutability.
  // hibernation_origin is managed automatically; callers do not set it directly.
  let from = current_entry.lifecycle_stage.clone();
  let to = input.new_stage.clone();

  // Entering Hibernating: record the stage being paused
  if to == LifecycleStage::Hibernating {
    current_entry.hibernation_origin = Some(from.clone());
  }
  // Exiting Hibernating or entering a terminal state: clear the origin field
  if from == LifecycleStage::Hibernating
    || to == LifecycleStage::Deprecated
    || to == LifecycleStage::EndOfLife
  {
    current_entry.hibernation_origin = None;
  }

  current_entry.lifecycle_stage = to;
  current_entry.successor_ndo_hash = input.successor_ndo_hash.clone();

  let latest_action_hash = record.action_address().clone();
  let update_hash = update_entry(latest_action_hash, &current_entry)?;

  // REQ-NDO-LC-06: Create successor link when transitioning to Deprecated
  if input.new_stage == LifecycleStage::Deprecated {
    let successor_hash = input.successor_ndo_hash.ok_or_else(|| {
      ResourceError::InvalidInput(
        "successor_ndo_hash required for Deprecated transition (REQ-NDO-LC-06)".to_string(),
      )
    })?;
    create_link(
      input.original_action_hash.clone(),
      successor_hash,
      LinkTypes::NdoToSuccessor,
      (),
    )?;
  }

  // REQ-NDO-L0-05: Create transition event link when a triggering event hash is provided
  if let Some(event_hash) = input.transition_event_hash {
    create_link(
      input.original_action_hash.clone(),
      event_hash,
      LinkTypes::NdoToTransitionEvent,
      (),
    )?;
  }

  Ok(update_hash)
}

/// Retrieve all NondominiumIdentities via the global "ndo_identities" anchor.
///
/// Returns the latest version of each NDO (chain-resolved). Entries that fail
/// to resolve or deserialize are silently skipped — DHT availability is eventual.
///
/// REQ-NDO-L0-07
#[hdk_extern]
pub fn get_all_ndos(_: ()) -> ExternResult<GetAllNdosOutput> {
  let path = Path::from("ndo_identities");
  let links_query =
    LinkQuery::try_new(path.path_entry_hash()?, LinkTypes::AllNdos)?;
  let links = get_links(links_query, GetStrategy::default())?;

  let mut ndos = Vec::new();
  for link in links {
    let Some(action_hash) = link.target.into_action_hash() else {
      continue;
    };
    let Some(record) = resolve_latest_ndo_record(action_hash.clone())? else {
      continue;
    };
    let Ok(Some(entry)) = record.entry().to_app_option::<NondominiumIdentity>() else {
      continue;
    };
    ndos.push(NdoOutput { action_hash, entry });
  }
  Ok(GetAllNdosOutput { ndos })
}

/// Return raw AgentToNdo links for the calling agent.
///
/// Returns links rather than resolved entries so callers can access
/// the target action_hash directly without a second DHT round-trip
/// when only the identity is needed. Pass each target to `get_ndo`
/// to resolve the current entry.
///
/// REQ-NDO-L0-07
#[hdk_extern]
pub fn get_my_ndos(_: ()) -> ExternResult<Vec<Link>> {
  let agent_pub_key = agent_info()?.agent_initial_pubkey;
  let links_query = LinkQuery::try_new(agent_pub_key, LinkTypes::AgentToNdo)?;
  get_links(links_query, GetStrategy::default())
}
