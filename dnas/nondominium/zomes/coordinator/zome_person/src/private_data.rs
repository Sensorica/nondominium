use crate::PersonError;
use hdk::prelude::*;
use zome_person_integrity::*;
use crate::person::get_agent_person;

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

  // Person-centric private data management - single unified strategy
  let agent_pubkey = agent_info()?.agent_initial_pubkey;

  // Get the person for this agent
  let person_links = get_links(
    GetLinksInputBuilder::try_new(agent_pubkey.clone(), LinkTypes::AgentToPerson)?.build(),
  )?;

  if let Some(person_link) = person_links.first() {
    if let Some(person_hash) = person_link.target.clone().into_action_hash() {
      // Create Person -> PrivateData link (person-centric approach)
      create_link(
        person_hash,
        private_data_hash.clone(),
        LinkTypes::PersonToPrivateData,
        (),
      )?;
    } else {
      return Err(PersonError::PersonNotFound("No person found for agent".to_string()).into());
    }
  } else {
    return Err(PersonError::PersonNotFound("No person found for agent".to_string()).into());
  }

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

  // Use the new get_agent_person function for cleaner code
  let person_hash = match get_agent_person(agent_pubkey)? {
    Some(hash) => hash,
    None => return Ok(None),
  };

  // Get private data through Person-centric approach
  let private_data_links = get_links(
    GetLinksInputBuilder::try_new(person_hash, LinkTypes::PersonToPrivateData)?.build(),
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

  Ok(None)
}

/// Get private data for a specific agent by their public key (Person-centric approach)
#[hdk_extern]
pub fn get_agent_private_data(agent_pubkey: AgentPubKey) -> ExternResult<Option<PrivatePersonData>> {
  // Use the new get_agent_person function for cleaner code
  let person_hash = match get_agent_person(agent_pubkey)? {
    Some(hash) => hash,
    None => return Ok(None),
  };

  // Get private data through Person-centric approach
  let private_data_links = get_links(
    GetLinksInputBuilder::try_new(person_hash, LinkTypes::PersonToPrivateData)?.build(),
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

  Ok(None)
}
