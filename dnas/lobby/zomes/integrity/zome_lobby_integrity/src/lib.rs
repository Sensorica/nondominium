use hdi::prelude::*;

/// Public agent presence in the Lobby DHT. Permissionless to create, permanent anchor.
#[hdk_entry_helper]
#[derive(Clone, PartialEq)]
pub struct LobbyAgentProfile {
  pub handle: String,            // max 64 chars, non-empty
  pub avatar_url: Option<String>, // must start with "https://" if present
  pub bio: Option<String>,       // max 500 chars
  pub lobby_pubkey: AgentPubKey, // must equal action.author
  pub created_at: Timestamp,
}

/// Registry entry for a group cloned cell.
///
/// Stored in the Lobby DHT so agents can discover which group cells exist and obtain
/// their DnaHash for CellId addressing. Follows the Lobby → Groups → NDOs hierarchy:
/// Lobby hosts groups; groups host NDOs. NDOs travel group-to-group through agents who
/// are members of multiple groups (organic, fractal propagation).
///
/// Cannot be deleted. Core fields are immutable after creation.
#[hdk_entry_helper]
#[derive(Clone, PartialEq)]
pub struct GroupAnnouncement {
  pub group_name: String,          // non-empty, validated
  pub group_dna_hash: DnaHash,     // stable CellId key for the cloned cell
  pub network_seed: String,
  pub description: Option<String>,
  pub registered_by: AgentPubKey,  // must equal action.author
}

#[hdk_entry_types]
#[unit_enum(UnitEntryTypes)]
#[derive(Serialize, Deserialize, SerializedBytes)]
pub enum EntryTypes {
  LobbyAgentProfile(LobbyAgentProfile),
  GroupAnnouncement(GroupAnnouncement),
}

#[hdk_link_types]
pub enum LinkTypes {
  AllLobbyAgents,            // Path("lobby.agents") -> LobbyAgentProfile
  AgentProfileUpdates,       // LobbyAgentProfile -> LobbyAgentProfile (versioning)
  AgentToLobbyProfile,       // AgentPubKey -> LobbyAgentProfile (agent-centric lookup)
  AllGroupAnnouncements,     // Path("lobby.groups") -> GroupAnnouncement
  AgentToGroupAnnouncements, // AgentPubKey -> GroupAnnouncement
}

#[hdk_extern]
pub fn genesis_self_check(_data: GenesisSelfCheckData) -> ExternResult<ValidateCallbackResult> {
  Ok(ValidateCallbackResult::Valid)
}

pub fn validate_agent_joining(
  _agent_pub_key: AgentPubKey,
  _membrane_proof: &MembraneProof,
) -> ExternResult<ValidateCallbackResult> {
  // Lobby DHT is permissionless (REQ-LOBBY-01)
  Ok(ValidateCallbackResult::Valid)
}

#[hdk_extern]
pub fn validate(op: Op) -> ExternResult<ValidateCallbackResult> {
  // StoreEntry: validate create/update entry content
  if let FlatOp::CreateEntry(store_entry) = op.flattened::<EntryTypes, LinkTypes>()? {
    match store_entry {
      OpEntry::CreateEntry { app_entry, action } => match app_entry {
        EntryTypes::LobbyAgentProfile(profile) => {
          return validate_create_lobby_agent_profile(profile, action);
        }
        EntryTypes::GroupAnnouncement(ann) => {
          return validate_create_group_announcement(ann, action);
        }
      },
      OpEntry::UpdateEntry { app_entry, .. } => match app_entry {
        EntryTypes::LobbyAgentProfile(profile) => {
          // Basic field validation only; author check done in StoreRecord
          if profile.handle.trim().is_empty() {
            return Ok(ValidateCallbackResult::Invalid("handle cannot be empty".to_string()));
          }
          if profile.handle.len() > 64 {
            return Ok(ValidateCallbackResult::Invalid("handle must be ≤ 64 characters".to_string()));
          }
          if let Some(url) = &profile.avatar_url {
            if !url.starts_with("https://") {
              return Ok(ValidateCallbackResult::Invalid("avatar_url must start with https://".to_string()));
            }
          }
        }
        EntryTypes::GroupAnnouncement(_ann) => {
          // GroupAnnouncement is immutable after creation — updates are rejected in StoreRecord.
        }
      },
      _ => {}
    }
  }

  // StoreRecord: validate deletes and update immutability constraints
  if let FlatOp::CreateRecord(store_record) = op.flattened::<EntryTypes, LinkTypes>()? {
    match store_record {
      OpRecord::DeleteEntry { .. } => {
        return Ok(ValidateCallbackResult::Invalid(
          "LobbyAgentProfile and GroupAnnouncement entries cannot be deleted".to_string(),
        ));
      }
      OpRecord::UpdateEntry { app_entry, action, .. } => {
        let original_record = must_get_valid_record(action.original_action_address.clone())?;
        let creation_action: TypedAction<EntryCreationData> =
          match original_record.action().clone().try_into() {
            Ok(a) => a,
            Err(_) => return Ok(ValidateCallbackResult::Valid),
          };
        let app_entry_type = match creation_action.entry_type() {
          EntryType::App(t) => t,
          _ => return Ok(ValidateCallbackResult::Valid),
        };
        let entry = match original_record.entry().as_option() {
          Some(e) => e,
          None => return Ok(ValidateCallbackResult::Valid),
        };
        let original_app_entry = EntryTypes::deserialize_from_type(
          *app_entry_type.zome_index,
          app_entry_type.entry_index,
          entry,
        )?;
        match (app_entry, original_app_entry) {
          (EntryTypes::LobbyAgentProfile(updated), Some(EntryTypes::LobbyAgentProfile(original))) => {
            if *action.author() != original.lobby_pubkey {
              return Ok(ValidateCallbackResult::Invalid(
                "only the profile owner can update their profile".to_string(),
              ));
            }
            if updated.lobby_pubkey != original.lobby_pubkey {
              return Ok(ValidateCallbackResult::Invalid("lobby_pubkey is immutable".to_string()));
            }
          }
          (EntryTypes::GroupAnnouncement(_), Some(EntryTypes::GroupAnnouncement(_))) => {
            return Ok(ValidateCallbackResult::Invalid(
              "GroupAnnouncement entries are immutable after creation".to_string(),
            ));
          }
          _ => {}
        }
      }
      _ => {}
    }
  }

  Ok(ValidateCallbackResult::Valid)
}

fn validate_create_lobby_agent_profile(
  profile: LobbyAgentProfile,
  action: TypedAction<CreateData>,
) -> ExternResult<ValidateCallbackResult> {
  if profile.handle.trim().is_empty() {
    return Ok(ValidateCallbackResult::Invalid("handle cannot be empty".to_string()));
  }
  if profile.handle.len() > 64 {
    return Ok(ValidateCallbackResult::Invalid("handle must be ≤ 64 characters".to_string()));
  }
  if profile.lobby_pubkey != *action.author() {
    return Ok(ValidateCallbackResult::Invalid(
      "lobby_pubkey must equal action.author".to_string(),
    ));
  }
  if let Some(url) = &profile.avatar_url {
    if !url.starts_with("https://") {
      return Ok(ValidateCallbackResult::Invalid(
        "avatar_url must start with https://".to_string(),
      ));
    }
  }
  if let Some(bio) = &profile.bio {
    if bio.len() > 500 {
      return Ok(ValidateCallbackResult::Invalid("bio must be ≤ 500 characters".to_string()));
    }
  }
  Ok(ValidateCallbackResult::Valid)
}

fn validate_create_group_announcement(
  ann: GroupAnnouncement,
  action: TypedAction<CreateData>,
) -> ExternResult<ValidateCallbackResult> {
  if ann.group_name.trim().is_empty() {
    return Ok(ValidateCallbackResult::Invalid("group_name cannot be empty".to_string()));
  }
  if ann.registered_by != *action.author() {
    return Ok(ValidateCallbackResult::Invalid(
      "registered_by must equal action.author".to_string(),
    ));
  }
  Ok(ValidateCallbackResult::Valid)
}
