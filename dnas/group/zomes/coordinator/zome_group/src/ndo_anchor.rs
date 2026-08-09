use crate::GroupError;
use hdk::prelude::*;
use nondominium_shared::LifecycleStage;
use zome_group_integrity::*;

#[derive(Debug, Serialize, Deserialize)]
pub struct NdoAnchorInput {
  pub group_hash: ActionHash,
  pub name: String,
  pub description: Option<String>,
  pub ndo_dna_hash: DnaHash,
  pub network_seed: String,
  pub identity_action_hash: ActionHash,
  pub initiator: AgentPubKey,
  pub ndo_created_at: Timestamp,
  pub lifecycle_stage: LifecycleStage,
  pub property_regime: nondominium_shared::PropertyRegime,
  pub resource_nature: nondominium_shared::ResourceNature,
}

/// Anchors an NDO cell in this group's DHT (ADR-011: anchors in Group DHTs,
/// not a global registry). The anchor is the authoritative group-to-NDO pointer;
/// its `(ndo_dna_hash, network_seed, properties)` coordinates let any group member
/// derive, verify, and join the NDO network. Anchor author and timestamp come
/// from the action header.
#[hdk_extern]
pub fn create_ndo_anchor(input: NdoAnchorInput) -> ExternResult<Record> {
  let anchor = NdoAnchor {
    group_hash: input.group_hash.clone(),
    name: input.name,
    description: input.description,
    ndo_dna_hash: input.ndo_dna_hash,
    network_seed: input.network_seed,
    identity_action_hash: input.identity_action_hash,
    initiator: input.initiator,
    ndo_created_at: input.ndo_created_at,
    lifecycle_stage: input.lifecycle_stage,
    property_regime: input.property_regime,
    resource_nature: input.resource_nature,
  };

  let anchor_hash = create_entry(&EntryTypes::NdoAnchor(anchor))?;
  let record = get(anchor_hash.clone(), GetOptions::default())?.ok_or(
    GroupError::EntryOperationFailed("Failed to retrieve created NDO anchor".to_string()),
  )?;

  create_link(
    input.group_hash,
    anchor_hash,
    LinkTypes::GroupToNdoAnchors,
    (),
  )?;

  Ok(record)
}

/// Returns the latest Record for every NdoAnchor in a group, resolving the
/// NdoAnchorUpdates chain so cached descriptor fields reflect the most recent
/// sync. Browsing NDOs never requires joining their cells — anchors carry
/// enough cached data to render cards.
#[hdk_extern]
pub fn get_ndo_anchors(group_hash: ActionHash) -> ExternResult<Vec<Record>> {
  let link_query = LinkQuery::try_new(group_hash, LinkTypes::GroupToNdoAnchors)?;
  let links = get_links(link_query, GetStrategy::default())?;

  let mut anchors = Vec::new();
  for link in links {
    let Some(original_hash) = link.target.into_action_hash() else {
      continue;
    };
    let Some((_latest_hash, record)) = latest_anchor(original_hash)? else {
      continue;
    };
    anchors.push(record);
  }

  Ok(anchors)
}

/// Resolves an anchor's original action hash to its most recent version by
/// following NdoAnchorUpdates links (latest by action timestamp). Returns both
/// the latest action hash (the action a future update must supersede) and its
/// record. `(latest_hash, record)` is `None` only when the entry is absent.
fn latest_anchor(original_hash: ActionHash) -> ExternResult<Option<(ActionHash, Record)>> {
  let update_links = get_links(
    LinkQuery::try_new(original_hash.clone(), LinkTypes::NdoAnchorUpdates)?,
    GetStrategy::default(),
  )?;

  let latest_hash = update_links
    .into_iter()
    .max_by_key(|link| link.timestamp)
    .and_then(|link| link.target.into_action_hash())
    .unwrap_or(original_hash);

  let record = get(latest_hash.clone(), GetOptions::default())?;
  Ok(record.map(|r| (latest_hash, r)))
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateNdoAnchorInput {
  /// Action hash of the very first create action — used as the stable link source.
  pub original_action_hash: ActionHash,
  /// Action hash of the create (or previous update) action to be superseded.
  pub previous_action_hash: ActionHash,
  pub updated_name: String,
  pub updated_description: Option<String>,
  pub updated_lifecycle_stage: LifecycleStage,
}

/// Refreshes an anchor's cached descriptor fields (name, description, lifecycle
/// stage). The NDO identity coordinates (ndo_dna_hash, network_seed,
/// identity_action_hash, initiator, ndo_created_at, regime, nature) are copied
/// from the original entry — they are immutable by construction, matching the
/// immutability the DNA properties enforce inside the NDO cell.
#[hdk_extern]
pub fn update_ndo_anchor(input: UpdateNdoAnchorInput) -> ExternResult<Record> {
  let original_record = must_get_valid_record(input.original_action_hash.clone())?;

  let original: NdoAnchor = original_record
    .entry()
    .to_app_option()
    .map_err(|e| wasm_error!(WasmErrorInner::Serialize(e)))?
    .ok_or_else(|| {
      GroupError::EntryOperationFailed("Failed to decode NdoAnchor entry".to_string())
    })?;

  let updated = NdoAnchor {
    group_hash: original.group_hash,
    name: input.updated_name,
    description: input.updated_description,
    ndo_dna_hash: original.ndo_dna_hash,
    network_seed: original.network_seed,
    identity_action_hash: original.identity_action_hash,
    initiator: original.initiator,
    ndo_created_at: original.ndo_created_at,
    lifecycle_stage: input.updated_lifecycle_stage,
    property_regime: original.property_regime,
    resource_nature: original.resource_nature,
  };

  let updated_hash = update_entry(input.previous_action_hash, &updated)?;
  let record = get(updated_hash.clone(), GetOptions::default())?.ok_or(
    GroupError::EntryOperationFailed("Failed to retrieve updated NDO anchor".to_string()),
  )?;

  create_link(
    input.original_action_hash,
    updated_hash,
    LinkTypes::NdoAnchorUpdates,
    (),
  )?;

  Ok(record)
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RefreshAnchorLifecycleInput {
  pub group_hash: ActionHash,
  /// The NDO identity action hash the anchor points at (not the anchor's own
  /// action hash) — the caller knows the NDO, not the anchor.
  pub identity_action_hash: ActionHash,
  pub updated_lifecycle_stage: LifecycleStage,
}

/// Refreshes a single NdoAnchor's cached `lifecycle_stage`, resolving the
/// anchor by its NDO identity rather than by action hash. Called after an NDO
/// lifecycle transition so lobby/group cards reflect the new stage without a
/// reload — the client only knows the NDO identity, while the original-vs-latest
/// anchor action hashes are a property of this group's link graph and must not
/// leak across that boundary.
///
/// Resolves the anchor via the `GroupToNdoAnchors` link (whose target is the
/// stable original create action) and follows the `NdoAnchorUpdates` chain to
/// the latest version, so repeated refreshes stay visible to `get_ndo_anchors`.
/// The identity coordinates and name/description are preserved from the current
/// latest entry; only `lifecycle_stage` changes.
///
/// Returns `Ok(None)` when no anchor in this group points at the given NDO
/// identity (e.g. an NDO anchored in a different group, or not yet anchored) —
/// a no-op, not an error, matching the best-effort convergence contract.
#[hdk_extern]
pub fn refresh_ndo_anchor_lifecycle_stage(
  input: RefreshAnchorLifecycleInput,
) -> ExternResult<Option<Record>> {
  let links = get_links(
    LinkQuery::try_new(input.group_hash.clone(), LinkTypes::GroupToNdoAnchors)?,
    GetStrategy::default(),
  )?;

  for link in links {
    let Some(original_hash) = link.target.into_action_hash() else {
      continue;
    };
    let Some((latest_hash, record)) = latest_anchor(original_hash.clone())? else {
      continue;
    };
    let anchor: NdoAnchor = record
      .entry()
      .to_app_option()
      .map_err(|e| wasm_error!(WasmErrorInner::Serialize(e)))?
      .ok_or_else(|| {
        GroupError::EntryOperationFailed("Failed to decode NdoAnchor entry".to_string())
      })?;
    if anchor.identity_action_hash != input.identity_action_hash {
      continue;
    }

    let updated = NdoAnchor {
      lifecycle_stage: input.updated_lifecycle_stage.clone(),
      ..anchor
    };
    let updated_hash = update_entry(latest_hash, &updated)?;
    let new_record = get(updated_hash.clone(), GetOptions::default())?.ok_or(
      GroupError::EntryOperationFailed(
        "Failed to retrieve refreshed NDO anchor".to_string(),
      ),
    )?;
    create_link(
      original_hash,
      updated_hash,
      LinkTypes::NdoAnchorUpdates,
      (),
    )?;
    return Ok(Some(new_record));
  }

  Ok(None)
}
