use crate::PersonError;
use hdk::prelude::*;
use zome_person_integrity::*;

/// Helper function to find the person associated with the current agent
/// This tries multiple approaches to find the agent-person relationship
fn find_person_for_agent(agent_pubkey: AgentPubKey) -> ExternResult<Option<ActionHash>> {
  // First try: Look for AgentToPerson link (created during person creation)
  let person_links = get_links(
    GetLinksInputBuilder::try_new(agent_pubkey.clone(), LinkTypes::AgentToPerson)?.build(),
  )?;

  if let Some(person_link) = person_links.first() {
    if let Some(person_hash) = person_link.target.clone().into_action_hash() {
      warn!("FOUND PERSON via AgentToPerson link: {:?}", person_hash);
      return Ok(Some(person_hash));
    }
  }

  // No AgentToPerson link found - return None
  warn!("No AgentToPerson link found for agent: {:?}", agent_pubkey);
  Ok(None)
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RegisterDeviceInput {
  pub device_id: String,
  pub device_name: String,
  pub device_type: String,
  pub person_hash: ActionHash,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DeviceInfo {
  pub device_id: String,
  pub device_name: String,
  pub device_type: String,
  pub registered_at: Timestamp,
  pub last_active: Timestamp,
  pub status: DeviceStatus,
}

/// Register a new device for a person
#[hdk_extern]
pub fn register_device_for_person(input: RegisterDeviceInput) -> ExternResult<Record> {
  let agent_info = agent_info()?;
  let agent_pubkey = agent_info.agent_initial_pubkey;
  let now = sys_time()?;

  // Validate that the current agent has a relationship with the target person
  let person_hash = match find_person_for_agent(agent_pubkey.clone())? {
    Some(hash) => hash,
    None => {
      return Err(PersonError::EntryOperationFailed("No person associated with this agent".to_string()).into());
    }
  };

  // Verify that the person_hash matches the target person_hash
  if person_hash != input.person_hash {
    return Err(PersonError::EntryOperationFailed("Agent can only register devices for their associated person".to_string()).into());
  }

  // Check if device already exists
  let existing_devices = get_devices_for_person(input.person_hash.clone())?;
  if existing_devices.iter().any(|d| d.device_id == input.device_id) {
    return Err(PersonError::EntryOperationFailed("Device with this ID already exists".to_string()).into());
  }

  let device = Device {
    device_id: input.device_id.clone(),
    device_name: input.device_name,
    device_type: input.device_type,
    owner_agent: agent_pubkey.clone(),
    owner_person: input.person_hash.clone(),
    registered_at: now,
    last_active: now,
    status: DeviceStatus::Active,
  };

  let device_hash = create_entry(&EntryTypes::Device(device.clone()))?;
  let record = get(device_hash.clone(), GetOptions::default())?.ok_or(
    PersonError::EntryOperationFailed("Failed to retrieve created device".to_string()),
  )?;

  // Create Person -> Device link
  create_link(
    input.person_hash.clone(),
    device_hash.clone(),
    LinkTypes::PersonToDevices,
    (),
  )?;

  // Create Device -> Person link (reverse lookup)
  create_link(
    device_hash,
    input.person_hash.clone(),
    LinkTypes::DeviceToPerson,
    (),
  )?;

  // Create Agent-Person relationship entry for this device
  let relationship = AgentPersonRelationship {
    agent: agent_pubkey,
    person: input.person_hash,
    established_at: now,
    relationship_type: AgentPersonRelationshipType::Device,
  };

  create_entry(&EntryTypes::AgentPersonRelationship(relationship))?;

  Ok(record)
}

/// Get all devices for a person
#[hdk_extern]
pub fn get_devices_for_person(person_hash: ActionHash) -> ExternResult<Vec<DeviceInfo>> {
  debug!("get_devices_for_person called");
  let device_links = get_links(
    GetLinksInputBuilder::try_new(person_hash.clone(), LinkTypes::PersonToDevices)?.build(),
  )?;
  debug!("Found {} device links for person", device_links.len());

  let mut devices = Vec::new();

  for (index, device_link) in device_links.iter().enumerate() {
    debug!("Processing device link {}: {:?}", index, device_link.target);
    if let Some(device_action_hash) = device_link.target.clone().into_action_hash() {
      debug!("Getting device record for action hash: {:?}", device_action_hash);

      // Get the device record directly using get()
      if let Some(record) = get(device_action_hash.clone(), GetOptions::default())? {
        debug!("Got record, checking entry");
        if let Ok(Some(device)) = record.entry().to_app_option::<Device>() {
          debug!("Found device: {}, last_active: {:?}, status: {:?}",
                device.device_id, device.last_active, device.status);
          devices.push(DeviceInfo {
            device_id: device.device_id,
            device_name: device.device_name,
            device_type: device.device_type,
            registered_at: device.registered_at,
            last_active: device.last_active,
            status: device.status,
          });
        } else {
          debug!("Failed to deserialize device entry");
        }
      } else {
        debug!("No record found for device action hash");
      }
    }
  }

  debug!("Returning {} devices for person", devices.len());
  Ok(devices)
}

/// Get device info for a specific device ID
#[hdk_extern]
pub fn get_device_info(device_id: String) -> ExternResult<Option<DeviceInfo>> {
  // Get all devices for the current agent
  let agent_info = agent_info()?;

  match find_person_for_agent(agent_info.agent_initial_pubkey)? {
    Some(person_hash) => {
      let devices = get_devices_for_person(person_hash)?;
      Ok(devices.into_iter().find(|d| d.device_id == device_id))
    }
    None => Ok(None),
  }
}


/// Get device ActionHash by device_id for a person
fn get_device_action_hash(person_hash: ActionHash, device_id: String) -> ExternResult<Option<ActionHash>> {
  let device_links = get_links(
    GetLinksInputBuilder::try_new(person_hash, LinkTypes::PersonToDevices)?.build(),
  )?;

  for device_link in device_links {
    if let Some(device_hash) = device_link.target.clone().into_action_hash() {
      if let Some(record) = get(device_hash, GetOptions::default())? {
        if let Ok(Some(device)) = record.entry().to_app_option::<Device>() {
          if device.device_id == device_id {
            return Ok(Some(record.action_address().clone().into()));
          }
        }
      }
    }
  }

  Ok(None)
}

/// Update device last active time
#[hdk_extern]
pub fn update_device_activity(device_id: String) -> ExternResult<bool> {
  // Simple debug at the very start
  warn!("update_device_activity START: {}", device_id);

  let agent_info = agent_info()?;
  let now = sys_time()?;

  // Find the person associated with the current agent
  let person_hash = match find_person_for_agent(agent_info.agent_initial_pubkey)? {
    Some(hash) => {
      warn!("Found person: {:?}", hash);
      hash
    },
    None => {
      warn!("No person found for current agent");
      return Ok(false);
    }
  };

  warn!("Found person_hash, looking for device");

  // Get the device links directly
  let device_links = get_links(
    GetLinksInputBuilder::try_new(person_hash, LinkTypes::PersonToDevices)?.build(),
  )?;

  warn!("Found {} device links", device_links.len());

  for device_link in device_links {
    if let Some(device_action_hash) = device_link.target.clone().into_action_hash() {
      warn!("Checking device link: {:?}", device_action_hash);

      if let Some(record) = get(device_action_hash, GetOptions::default())? {
        if let Ok(Some(device)) = record.entry().to_app_option::<Device>() {
          warn!("Found device: {}, looking for match with {}", device.device_id, device_id);

          if device.device_id == device_id {
            warn!("FOUND MATCHING DEVICE! Current last_active: {:?}", device.last_active);

            // Create updated device with new timestamp
            let mut updated_device = device.clone();
            updated_device.last_active = now;

            warn!("Updating last_active to: {:?}", now);

            // Update the device entry
            let original_action_hash: ActionHash = record.action_address().clone().into();
            warn!("Using action hash: {:?}", original_action_hash);

            match update_entry(original_action_hash.clone(), &updated_device) {
              Ok(new_action_hash) => {
                warn!("Update successful! New hash: {:?}", new_action_hash);

                // Create DeviceUpdates link to track the update
                create_link(
                  original_action_hash.clone(),
                  new_action_hash.clone(),
                  LinkTypes::DeviceUpdates,
                  (),
                )?;

                warn!("DeviceUpdates link created");
                return Ok(true);
              }
              Err(e) => {
                warn!("Update failed: {:?}", e);
                return Err(e);
              }
            }
          }
        }
      }
    }
  }

  warn!("NO MATCHING DEVICE FOUND for device_id: {}", device_id);
  Ok(false)
}

/// Deactivate a device
#[hdk_extern]
pub fn deactivate_device(device_id: String) -> ExternResult<bool> {
  warn!("deactivate_device START: {}", device_id);

  let agent_info = agent_info()?;

  // Find the person associated with the current agent
  let person_hash = match find_person_for_agent(agent_info.agent_initial_pubkey)? {
    Some(hash) => {
      warn!("Found person: {:?}", hash);
      hash
    },
    None => {
      warn!("No person found for current agent");
      return Ok(false);
    }
  };

  warn!("Found person_hash, looking for device");

  // Get the device links directly
  let device_links = get_links(
    GetLinksInputBuilder::try_new(person_hash, LinkTypes::PersonToDevices)?.build(),
  )?;

  warn!("Found {} device links", device_links.len());

  for device_link in device_links {
    if let Some(device_action_hash) = device_link.target.clone().into_action_hash() {
      warn!("Checking device link: {:?}", device_action_hash);

      if let Some(record) = get(device_action_hash, GetOptions::default())? {
        if let Ok(Some(device)) = record.entry().to_app_option::<Device>() {
          warn!("Found device: {}, looking for match with {}", device.device_id, device_id);

          if device.device_id == device_id {
            warn!("FOUND MATCHING DEVICE! Current status: {:?}", device.status);

            // Create updated device with Revoked status
            let mut updated_device = device.clone();
            updated_device.status = DeviceStatus::Revoked;

            warn!("Updating status to: {:?}", DeviceStatus::Revoked);

            // Update the device entry
            let original_action_hash: ActionHash = record.action_address().clone().into();
            warn!("Using action hash: {:?}", original_action_hash);

            match update_entry(original_action_hash.clone(), &updated_device) {
              Ok(new_action_hash) => {
                warn!("Deactivation successful! New hash: {:?}", new_action_hash);

                // Create DeviceUpdates link to track the update
                create_link(
                  original_action_hash.clone(),
                  new_action_hash.clone(),
                  LinkTypes::DeviceUpdates,
                  (),
                )?;

                warn!("DeviceUpdates link created for deactivation");
                return Ok(true);
              }
              Err(e) => {
                warn!("Deactivation failed: {:?}", e);
                return Err(e);
              }
            }
          }
        }
      }
    }
  }

  warn!("NO MATCHING DEVICE FOUND for device_id: {}", device_id);
  Ok(false)
}

/// Get my devices (for current agent)
#[hdk_extern]
pub fn get_my_devices(_: ()) -> ExternResult<Vec<DeviceInfo>> {
  let agent_info = agent_info()?;

  let person_links = get_links(
    GetLinksInputBuilder::try_new(agent_info.agent_initial_pubkey, LinkTypes::AgentToPerson)?.build(),
  )?;

  if let Some(person_link) = person_links.first() {
    if let Some(person_hash) = person_link.target.clone().into_action_hash() {
      return get_devices_for_person(person_hash);
    }
  }

  Ok(vec![])
}
