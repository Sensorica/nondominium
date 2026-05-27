use hdi::prelude::*;
use serde::{Deserialize, Serialize};

/// Input to `upsert_lobby_agent_profile` in `zome_lobby_coordinator`.
#[derive(Debug, Serialize, Deserialize)]
pub struct LobbyAgentProfileInput {
  pub handle: String,
  pub avatar_url: Option<String>,
  pub bio: Option<String>,
}

/// Input to `announce_group` in `zome_lobby_coordinator`.
///
/// Follows the Lobby → Groups → NDOs hierarchy: the Lobby is the registry for groups,
/// groups host NDOs. NDOs are discovered through group cells, not the Lobby DHT.
#[derive(Debug, Serialize, Deserialize)]
pub struct AnnounceGroupInput {
  pub group_name: String,
  pub group_dna_hash: DnaHash,
  pub network_seed: String,
  pub description: Option<String>,
}

/// Minimal group descriptor stub returned by `get_my_groups`.
#[derive(Debug, Serialize, Deserialize)]
pub struct GroupDescriptorStub {
  pub id: String,
  pub name: String,
  pub is_solo: bool,
}
