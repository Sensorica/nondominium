use hdi::prelude::*;

// LifecycleStage, PropertyRegime, ResourceNature are re-declared here because WASM
// compilation forbids cross-crate type imports between DNAs. These match the definitions
// in zome_resource_integrity exactly (ADR-LOBBY-02).
// snake_case: aligns serde wire format with the Display impl ("active" not "Active").
#[derive(Clone, PartialEq, Debug, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum LifecycleStage {
  Ideation,
  Specification,
  Development,
  Prototype,
  Stable,
  Distributed,
  Active,
  Hibernating,
  Deprecated,
  EndOfLife,
}

impl std::fmt::Display for LifecycleStage {
  fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
    let s = match self {
      LifecycleStage::Ideation => "ideation",
      LifecycleStage::Specification => "specification",
      LifecycleStage::Development => "development",
      LifecycleStage::Prototype => "prototype",
      LifecycleStage::Stable => "stable",
      LifecycleStage::Distributed => "distributed",
      LifecycleStage::Active => "active",
      LifecycleStage::Hibernating => "hibernating",
      LifecycleStage::Deprecated => "deprecated",
      LifecycleStage::EndOfLife => "end_of_life",
    };
    write!(f, "{}", s)
  }
}

#[derive(Clone, PartialEq, Debug, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum PropertyRegime {
  Private,
  Commons,
  Collective,
  Pool,
  CommonPool,
  Nondominium,
}

#[derive(Clone, PartialEq, Debug, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ResourceNature {
  Physical,
  Digital,
  Service,
  Hybrid,
  Information,
}

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

/// Public descriptor for a registered NDO. Mirrors NondominiumIdentity key fields.
/// Only lifecycle_stage is mutable after creation. Cannot be deleted.
#[hdk_entry_helper]
#[derive(Clone, PartialEq)]
pub struct NdoAnnouncement {
  pub ndo_name: String,
  pub ndo_dna_hash: DnaHash,
  pub network_seed: String,
  pub ndo_identity_hash: ActionHash, // Layer 0 anchor inside the NDO DHT
  pub lifecycle_stage: LifecycleStage,
  pub property_regime: PropertyRegime,
  pub resource_nature: ResourceNature,
  pub description: Option<String>,
  pub registered_by: AgentPubKey, // must equal action.author
  pub registered_at: Timestamp,
}

#[hdk_entry_types]
#[unit_enum(UnitEntryTypes)]
#[derive(Serialize, Deserialize, SerializedBytes)]
pub enum EntryTypes {
  LobbyAgentProfile(LobbyAgentProfile),
  NdoAnnouncement(NdoAnnouncement),
}

#[hdk_link_types]
pub enum LinkTypes {
  AllLobbyAgents,            // Path("lobby.agents") -> LobbyAgentProfile
  AgentProfileUpdates,       // LobbyAgentProfile -> LobbyAgentProfile (versioning)
  AllNdoAnnouncements,       // Path("lobby.ndos") -> NdoAnnouncement
  NdoAnnouncementByLifecycle, // Path("lobby.ndo.lifecycle.{Stage}") -> NdoAnnouncement
  AgentToNdoAnnouncements,   // registered_by AgentPubKey -> NdoAnnouncement
  NdoAnnouncementUpdates,    // NdoAnnouncement -> NdoAnnouncement (lifecycle chain)
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
  if let FlatOp::StoreEntry(store_entry) = op.flattened::<EntryTypes, LinkTypes>()? {
    match store_entry {
      OpEntry::CreateEntry { app_entry, action } => match app_entry {
        EntryTypes::LobbyAgentProfile(profile) => {
          return validate_create_lobby_agent_profile(profile, action);
        }
        EntryTypes::NdoAnnouncement(ann) => {
          return validate_create_ndo_announcement(ann, action);
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
        EntryTypes::NdoAnnouncement(_ann) => {
          // lifecycle_stage update allowed; other field immutability checked in StoreRecord
        }
      },
      _ => {}
    }
  }

  // StoreRecord: validate deletes and update immutability constraints
  if let FlatOp::StoreRecord(store_record) = op.flattened::<EntryTypes, LinkTypes>()? {
    match store_record {
      OpRecord::DeleteEntry { .. } => {
        return Ok(ValidateCallbackResult::Invalid(
          "LobbyAgentProfile and NdoAnnouncement entries cannot be deleted".to_string(),
        ));
      }
      OpRecord::UpdateEntry { original_action_hash, app_entry, action, .. } => {
        let original_record = must_get_valid_record(original_action_hash)?;
        let original_action = original_record.action().clone();
        let creation_action = match original_action {
          Action::Create(c) => EntryCreationAction::Create(c),
          Action::Update(u) => EntryCreationAction::Update(u),
          _ => return Ok(ValidateCallbackResult::Valid),
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
            if action.author != original.lobby_pubkey {
              return Ok(ValidateCallbackResult::Invalid(
                "only the profile owner can update their profile".to_string(),
              ));
            }
            if updated.lobby_pubkey != original.lobby_pubkey {
              return Ok(ValidateCallbackResult::Invalid("lobby_pubkey is immutable".to_string()));
            }
          }
          (EntryTypes::NdoAnnouncement(updated), Some(EntryTypes::NdoAnnouncement(original))) => {
            if action.author != original.registered_by {
              return Ok(ValidateCallbackResult::Invalid(
                "only the registrant can update an NdoAnnouncement".to_string(),
              ));
            }
            if updated.ndo_name != original.ndo_name
              || updated.ndo_dna_hash != original.ndo_dna_hash
              || updated.network_seed != original.network_seed
              || updated.ndo_identity_hash != original.ndo_identity_hash
              || updated.property_regime != original.property_regime
              || updated.resource_nature != original.resource_nature
              || updated.registered_by != original.registered_by
            {
              return Ok(ValidateCallbackResult::Invalid(
                "only lifecycle_stage may change in an NdoAnnouncement update".to_string(),
              ));
            }
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
  action: Create,
) -> ExternResult<ValidateCallbackResult> {
  if profile.handle.trim().is_empty() {
    return Ok(ValidateCallbackResult::Invalid("handle cannot be empty".to_string()));
  }
  if profile.handle.len() > 64 {
    return Ok(ValidateCallbackResult::Invalid("handle must be ≤ 64 characters".to_string()));
  }
  if profile.lobby_pubkey != action.author {
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

fn validate_create_ndo_announcement(
  ann: NdoAnnouncement,
  action: Create,
) -> ExternResult<ValidateCallbackResult> {
  if ann.registered_by != action.author {
    return Ok(ValidateCallbackResult::Invalid(
      "registered_by must equal action.author".to_string(),
    ));
  }
  if ann.ndo_name.trim().is_empty() {
    return Ok(ValidateCallbackResult::Invalid("ndo_name cannot be empty".to_string()));
  }
  match ann.lifecycle_stage {
    LifecycleStage::Deprecated | LifecycleStage::EndOfLife => {
      return Ok(ValidateCallbackResult::Invalid(
        "cannot register an NDO with Deprecated or EndOfLife lifecycle stage".to_string(),
      ))
    }
    _ => {}
  }
  Ok(ValidateCallbackResult::Valid)
}

