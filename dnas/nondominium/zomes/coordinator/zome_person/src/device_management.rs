use crate::PersonError;
use hdk::prelude::*;
use zome_person_integrity::*;

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
  let device_links = get_links(
    GetLinksInputBuilder::try_new(person_hash, LinkTypes::PersonToDevices)?.build(),
  )?;

  let mut devices = Vec::new();

  for device_link in device_links {
    if let Some(device_hash) = device_link.target.into_action_hash() {
      if let Some(record) = get(device_hash, GetOptions::default())? {
        if let Ok(Some(device)) = record.entry().to_app_option::<Device>() {
          devices.push(DeviceInfo {
            device_id: device.device_id,
            device_name: device.device_name,
            device_type: device.device_type,
            registered_at: device.registered_at,
            last_active: device.last_active,
            status: device.status,
          });
        }
      }
    }
  }

  Ok(devices)
}

/// Get device info for a specific device ID
#[hdk_extern]
pub fn get_device_info(device_id: String) -> ExternResult<Option<DeviceInfo>> {
  // Get all devices for the current agent
  let agent_info = agent_info()?;
  let person_links = get_links(
    GetLinksInputBuilder::try_new(agent_info.agent_initial_pubkey, LinkTypes::AgentToPerson)?.build(),
  )?;

  if let Some(person_link) = person_links.first() {
    if let Some(person_hash) = person_link.target.clone().into_action_hash() {
      let devices = get_devices_for_person(person_hash)?;
      return Ok(devices.into_iter().find(|d| d.device_id == device_id));
    }
  }

  Ok(None)
}

/// Update device last active time
#[hdk_extern]
pub fn update_device_activity(device_id: String) -> ExternResult<bool> {
  let agent_info = agent_info()?;
  let now = sys_time()?;

  // Find the device and update it
  let person_links = get_links(
    GetLinksInputBuilder::try_new(agent_info.agent_initial_pubkey, LinkTypes::AgentToPerson)?.build(),
  )?;

  if let Some(person_link) = person_links.first() {
    if let Some(person_hash) = person_link.target.clone().into_action_hash() {
      let device_links = get_links(
        GetLinksInputBuilder::try_new(person_hash, LinkTypes::PersonToDevices)?.build(),
      )?;

      for device_link in device_links {
        if let Some(device_hash) = device_link.target.clone().into_action_hash() {
          if let Some(record) = get(device_hash, GetOptions::default())? {
            if let Ok(Some(mut device)) = record.entry().to_app_option::<Device>() {
              if device.device_id == device_id {
                device.last_active = now;
                // Update the device entry
                let _ = update_entry(record.action_address().clone().into(), &device)?;
                return Ok(true);
              }
            }
          }
        }
      }
    }
  }

  Ok(false)
}

/// Deactivate a device
#[hdk_extern]
pub fn deactivate_device(device_id: String) -> ExternResult<bool> {
  let agent_info = agent_info()?;

  // Find the device and deactivate it
  let person_links = get_links(
    GetLinksInputBuilder::try_new(agent_info.agent_initial_pubkey, LinkTypes::AgentToPerson)?.build(),
  )?;

  if let Some(person_link) = person_links.first() {
    if let Some(person_hash) = person_link.target.clone().into_action_hash() {
      let device_links = get_links(
        GetLinksInputBuilder::try_new(person_hash, LinkTypes::PersonToDevices)?.build(),
      )?;

      for device_link in device_links {
        if let Some(device_hash) = device_link.target.clone().into_action_hash() {
          if let Some(record) = get(device_hash, GetOptions::default())? {
            if let Ok(Some(mut device)) = record.entry().to_app_option::<Device>() {
              if device.device_id == device_id {
                device.status = DeviceStatus::Revoked;
                // Update the device entry
                let _ = update_entry(record.action_address().clone().into(), &device)?;
                return Ok(true);
              }
            }
          }
        }
      }
    }
  }

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