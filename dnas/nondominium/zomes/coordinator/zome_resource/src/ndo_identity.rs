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

// Input for updating a NondominiumIdentity's lifecycle stage (the only permitted mutation)
#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateLifecycleStageInput {
  pub original_action_hash: ActionHash,
  pub new_stage: LifecycleStage,
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
/// This is the ONLY permitted mutation on a Layer 0 entry. All other fields are
/// enforced as immutable by the integrity validation (REQ-NDO-L0-03, REQ-NDO-L0-04).
/// Only the initiator may call this function (REQ-NDO-L0-03).
///
/// Returns the new action hash. The original_action_hash remains the stable Layer 0 identity.
///
/// REQ-NDO-L0-03, REQ-NDO-LC-01 through LC-07
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

  // Only the initiator may advance the lifecycle stage
  if caller != current_entry.initiator {
    return Err(ResourceError::NotAuthor.into());
  }

  current_entry.lifecycle_stage = input.new_stage;
  let latest_action_hash = record.action_address().clone();
  let update_hash = update_entry(latest_action_hash, &current_entry)?;
  Ok(update_hash)
}
