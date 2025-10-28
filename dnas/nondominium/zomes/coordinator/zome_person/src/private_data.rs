use crate::PersonError;
use hdk::prelude::*;
use zome_person_integrity::*;

#[derive(Debug, Serialize, Deserialize)]
pub struct PrivatePersonDataInput {
  pub legal_name: String,
  pub email: String,
  pub phone: Option<String>,
  pub address: Option<String>,
  pub emergency_contact: Option<String>,
  pub time_zone: Option<String>,
  pub location: Option<String>,
}

#[hdk_extern]
pub fn store_private_person_data(input: PrivatePersonDataInput) -> ExternResult<Record> {
  let private_data = PrivatePersonData {
    legal_name: input.legal_name,
    email: input.email,
    phone: input.phone,
    address: input.address,
    emergency_contact: input.emergency_contact,
    time_zone: input.time_zone,
    location: input.location,
  };

  let private_data_hash = create_entry(&EntryTypes::PrivatePersonData(private_data.clone()))?;
  let record = get(private_data_hash.clone(), GetOptions::default())?.ok_or(
    PersonError::EntryOperationFailed("Failed to retrieve created private data".to_string()),
  )?;

  // Create multiple link strategies to ensure private data can be found
  let agent_pubkey = agent_info()?.agent_initial_pubkey;

  // Strategy 1: Direct Agent -> PrivateData link (new approach)
  warn!("🔗 Creating AgentToPrivateData link");
  create_link(
    agent_pubkey.clone(),
    private_data_hash.clone(),
    LinkTypes::AgentToPrivateData,
    (),
  )?;

  // Strategy 2: Try to create Person -> PrivateData link if person exists
  let mut person_link_created = false;
  let person_links = get_links(
    GetLinksInputBuilder::try_new(agent_pubkey.clone(), LinkTypes::AgentToPerson)?.build(),
  )?;

  if let Some(person_link) = person_links.first() {
    warn!("🔗 Creating PersonToPrivateData link");
    create_link(
      person_link.target.clone(),
      private_data_hash.clone(),
      LinkTypes::PersonToPrivateData,
      (),
    )?;
    person_link_created = true;
  } else {
    warn!("⚠️ No AgentToPerson links found, skipping PersonToPrivateData link");
  }

  // Strategy 3: Create an anchor-based link for discovery
  warn!("🔗 Creating private data discovery anchor link");
  let anchor_path = Path::from(format!("private_data_{}", agent_pubkey.to_string()));
  create_link(
    anchor_path.path_entry_hash()?,
    private_data_hash.clone(),
    LinkTypes::PrivateDataDiscovery,
    (),
  )?;

  Ok(record)
}

#[derive(Serialize, Deserialize, Debug)]
pub struct UpdatePrivatePersonDataInput {
  pub original_action_hash: ActionHash,
  pub previous_action_hash: ActionHash,
  pub updated_private_data: PrivatePersonDataInput,
}

#[hdk_extern]
pub fn update_private_person_data(input: UpdatePrivatePersonDataInput) -> ExternResult<Record> {
  let _original_record = must_get_valid_record(input.original_action_hash.clone())?;

  // Private data can only be updated by the owner (enforced by private entry visibility)
  let updated_private_data = PrivatePersonData {
    legal_name: input.updated_private_data.legal_name,
    email: input.updated_private_data.email,
    phone: input.updated_private_data.phone,
    address: input.updated_private_data.address,
    emergency_contact: input.updated_private_data.emergency_contact,
    time_zone: input.updated_private_data.time_zone,
    location: input.updated_private_data.location,
  };

  let updated_private_data_hash = update_entry(input.previous_action_hash, &updated_private_data)?;

  let record = get(updated_private_data_hash, GetOptions::default())?.ok_or(
    PersonError::EntryOperationFailed("Failed to retrieve updated private data".to_string()),
  )?;

  Ok(record)
}

#[hdk_extern]
pub fn get_my_private_person_data(_: ()) -> ExternResult<Option<PrivatePersonData>> {
  let agent_pubkey = agent_info()?.agent_initial_pubkey;
  let person_links =
    get_links(GetLinksInputBuilder::try_new(agent_pubkey, LinkTypes::AgentToPerson)?.build())?;

  if let Some(person_link) = person_links.first() {
    let private_data_links = get_links(
      GetLinksInputBuilder::try_new(person_link.target.clone(), LinkTypes::PersonToPrivateData)?
        .build(),
    )?;

    if let Some(private_data_link) = private_data_links.first() {
      if let Some(action_hash) = private_data_link.target.clone().into_action_hash() {
        if let Some(record) = get(action_hash, GetOptions::default())? {
          if let Ok(Some(private_data)) = record.entry().to_app_option::<PrivatePersonData>() {
            return Ok(Some(private_data));
          }
        }
      }
    }
  }

  Ok(None)
}

/// Get private data for a specific agent by their public key
#[hdk_extern]
pub fn get_agent_private_data(agent_pubkey: AgentPubKey) -> ExternResult<Option<PrivatePersonData>> {
  // First try the direct AgentToPrivateData link (new approach)
  let private_data_links = get_links(
    GetLinksInputBuilder::try_new(agent_pubkey.clone(), LinkTypes::AgentToPrivateData)?.build(),
  )?;

  if let Some(private_data_link) = private_data_links.first() {
    if let Some(action_hash) = private_data_link.target.clone().into_action_hash() {
      if let Some(record) = get(action_hash, GetOptions::default())? {
        if let Ok(Some(private_data)) = record.entry().to_app_option::<PrivatePersonData>() {
          return Ok(Some(private_data));
        }
      }
    }
  }

  // Fallback: try the old approach via Person -> PrivateData link
  let person_links = get_links(
    GetLinksInputBuilder::try_new(agent_pubkey, LinkTypes::AgentToPerson)?.build(),
  )?;

  if let Some(person_link) = person_links.first() {
    let private_data_links = get_links(
      GetLinksInputBuilder::try_new(person_link.target.clone(), LinkTypes::PersonToPrivateData)?
        .build(),
    )?;

    if let Some(private_data_link) = private_data_links.first() {
      if let Some(action_hash) = private_data_link.target.clone().into_action_hash() {
        if let Some(record) = get(action_hash, GetOptions::default())? {
          if let Ok(Some(private_data)) = record.entry().to_app_option::<PrivatePersonData>() {
            return Ok(Some(private_data));
          }
        }
      }
    }
  }

  Ok(None)
}
