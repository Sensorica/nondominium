use crate::types::{LifecycleStage, PropertyRegime, ResourceNature};
use hdi::prelude::*;
use serde::{Deserialize, Serialize};

/// Input to `announce_ndo` in `zome_lobby_coordinator`.
#[derive(Debug, Serialize, Deserialize)]
pub struct AnnounceNdoInput {
  pub ndo_name: String,
  pub ndo_dna_hash: DnaHash,
  pub network_seed: String,
  pub ndo_identity_hash: ActionHash,
  pub lifecycle_stage: LifecycleStage,
  pub property_regime: PropertyRegime,
  pub resource_nature: ResourceNature,
  pub description: Option<String>,
}

/// Input to `upsert_lobby_agent_profile` in `zome_lobby_coordinator`.
#[derive(Debug, Serialize, Deserialize)]
pub struct LobbyAgentProfileInput {
  pub handle: String,
  pub avatar_url: Option<String>,
  pub bio: Option<String>,
}

/// Input to `update_ndo_announcement` in `zome_lobby_coordinator`.
#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateNdoAnnouncementInput {
  pub original_action_hash: ActionHash,
  pub new_lifecycle_stage: LifecycleStage,
}

/// Minimal group descriptor stub until Group DNA ships in issue #101.
/// Used by `get_my_groups` in `zome_lobby_coordinator`.
#[derive(Debug, Serialize, Deserialize)]
pub struct GroupDescriptorStub {
  pub id: String,
  pub name: String,
  pub is_solo: bool,
}
