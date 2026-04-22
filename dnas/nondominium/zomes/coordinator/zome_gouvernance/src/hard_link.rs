use hdk::prelude::*;
use zome_gouvernance_integrity::*;

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateNdoHardLinkInput {
  pub from_ndo_identity_hash: ActionHash,
  pub to_ndo_dna_hash: DnaHash,
  pub to_ndo_identity_hash: ActionHash,
  pub link_type: NdoLinkType,
  pub fulfillment_hash: ActionHash,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct NdoHardLinkRecord {
  pub action_hash: ActionHash,
  pub entry: NdoHardLink,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GetNdoHardLinksByTypeInput {
  pub ndo_identity_hash: ActionHash,
  pub link_type: NdoLinkType,
}

/// Create an immutable hard link between two NDOs.
/// Requires a valid EconomicEvent fulfillment hash in this DHT.
#[hdk_extern]
pub fn create_ndo_hard_link(input: CreateNdoHardLinkInput) -> ExternResult<ActionHash> {
  // Verify the fulfillment_hash resolves to a valid record
  let Some(event_record) = get(input.fulfillment_hash.clone(), GetOptions::default())? else {
    return Err(wasm_error!(WasmErrorInner::Guest(
      "fulfillment_hash does not resolve to a valid record".to_string()
    )));
  };
  // Verify the record actually holds an EconomicEvent entry
  let _ = event_record
    .entry()
    .to_app_option::<EconomicEvent>()
    .map_err(|e| wasm_error!(WasmErrorInner::Serialize(e)))?
    .ok_or_else(|| wasm_error!(WasmErrorInner::Guest(
      "fulfillment_hash must reference an EconomicEvent entry".to_string()
    )))?;

  let agent = agent_info()?.agent_initial_pubkey;
  let now = sys_time()?;
  let link_type_label = format!("{}", input.link_type);

  let hard_link = NdoHardLink {
    from_ndo_identity_hash: input.from_ndo_identity_hash.clone(),
    to_ndo_dna_hash: input.to_ndo_dna_hash,
    to_ndo_identity_hash: input.to_ndo_identity_hash,
    link_type: input.link_type,
    fulfillment_hash: input.fulfillment_hash,
    created_by: agent,
    created_at: now,
  };

  let action_hash = create_entry(&EntryTypes::NdoHardLink(hard_link))?;

  // NDO-centric discovery
  create_link(
    input.from_ndo_identity_hash,
    action_hash.clone(),
    LinkTypes::NdoToHardLinks,
    (),
  )?;

  // Type-categorized discovery
  let type_path = Path::from(format!("ndo.hardlink.{}", link_type_label));
  create_link(
    type_path.path_entry_hash()?,
    action_hash.clone(),
    LinkTypes::HardLinkByType,
    (),
  )?;

  Ok(action_hash)
}

/// Get all hard links originating from a given NDO identity hash.
#[hdk_extern]
pub fn get_ndo_hard_links(ndo_identity_hash: ActionHash) -> ExternResult<Vec<NdoHardLinkRecord>> {
  let links = get_links(LinkQuery::try_new(ndo_identity_hash, LinkTypes::NdoToHardLinks)?, GetStrategy::default())?;

  let mut results = Vec::new();
  for link in links {
    let Some(action_hash) = link.target.into_action_hash() else {
      continue;
    };
    let Some(record) = get(action_hash.clone(), GetOptions::default())? else {
      continue;
    };
    let Ok(Some(entry)) = record.entry().to_app_option::<NdoHardLink>() else {
      continue;
    };
    results.push(NdoHardLinkRecord { action_hash, entry });
  }
  Ok(results)
}

/// Get hard links filtered by type for a given NDO identity hash.
#[hdk_extern]
pub fn get_ndo_hard_links_by_type(
  input: GetNdoHardLinksByTypeInput,
) -> ExternResult<Vec<NdoHardLinkRecord>> {
  let all = get_ndo_hard_links(input.ndo_identity_hash)?;
  Ok(
    all
      .into_iter()
      .filter(|r| r.entry.link_type == input.link_type)
      .collect(),
  )
}
