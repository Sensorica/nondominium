use hdk::prelude::*;
use zome_lobby_integrity::*;

#[hdk_extern]
pub fn init(_: ()) -> ExternResult<InitCallbackResult> {
  Ok(InitCallbackResult::Pass)
}

// ─── Input / Output types ─────────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize)]
pub struct LobbyAgentProfileInput {
  pub handle: String,
  pub avatar_url: Option<String>,
  pub bio: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct LobbyAgentProfileRecord {
  pub action_hash: ActionHash,
  pub entry: LobbyAgentProfile,
}

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

#[derive(Debug, Serialize, Deserialize)]
pub struct NdoAnnouncementRecord {
  pub action_hash: ActionHash,
  pub entry: NdoAnnouncement,
}

/// Minimal group descriptor stub until Group DNA ships in issue #101.
#[derive(Debug, Serialize, Deserialize)]
pub struct GroupDescriptorStub {
  pub id: String,
  pub name: String,
  pub is_solo: bool,
}

// ─── Agent profile functions ──────────────────────────────────────────────────

/// Create or update the calling agent's Lobby profile. Uses an update chain.
#[hdk_extern]
pub fn upsert_lobby_agent_profile(input: LobbyAgentProfileInput) -> ExternResult<ActionHash> {
  let agent = agent_info()?.agent_initial_pubkey;
  let now = sys_time()?;

  let new_profile = LobbyAgentProfile {
    handle: input.handle,
    avatar_url: input.avatar_url,
    bio: input.bio,
    lobby_pubkey: agent.clone(),
    created_at: now,
  };

  // AgentToLobbyProfile: agent-centric lookup link (agent pubkey -> profile hash).
  // AllLobbyAgents: global path anchor (lobby.agents path -> profile hash).
  // Update detection uses AgentToLobbyProfile so per-agent queries work correctly.
  let existing_links = get_links(LinkQuery::try_new(agent.clone(), LinkTypes::AgentToLobbyProfile)?, GetStrategy::default())?;

  if let Some(link) = existing_links.into_iter().max_by_key(|l| l.timestamp) {
    let Some(original_hash) = link.target.into_action_hash() else {
      return Err(wasm_error!(WasmErrorInner::Guest("invalid link target".to_string())));
    };
    let new_hash = update_entry(original_hash.clone(), &new_profile)?;
    create_link(
      original_hash,
      new_hash.clone(),
      LinkTypes::AgentProfileUpdates,
      (),
    )?;
    return Ok(new_hash);
  }

  // First profile creation
  let action_hash = create_entry(&EntryTypes::LobbyAgentProfile(new_profile))?;

  // Global discovery anchor: path -> profile
  let agents_path = Path::from("lobby.agents");
  create_link(
    agents_path.path_entry_hash()?,
    action_hash.clone(),
    LinkTypes::AllLobbyAgents,
    (),
  )?;

  // Agent-centric lookup: agent pubkey -> profile (used by get_lobby_agent_profile and upsert detection)
  create_link(
    agent,
    action_hash.clone(),
    LinkTypes::AgentToLobbyProfile,
    (),
  )?;

  Ok(action_hash)
}

/// Get the lobby profile for a given agent (resolves update chain).
#[hdk_extern]
pub fn get_lobby_agent_profile(agent: AgentPubKey) -> ExternResult<Option<LobbyAgentProfile>> {
  let links = get_links(LinkQuery::try_new(agent, LinkTypes::AgentToLobbyProfile)?, GetStrategy::default())?;

  let Some(link) = links.into_iter().max_by_key(|l| l.timestamp) else {
    return Ok(None);
  };

  let Some(action_hash) = link.target.into_action_hash() else {
    return Ok(None);
  };

  let latest_hash = resolve_update_chain(action_hash)?;
  let Some(record) = get(latest_hash, GetOptions::default())? else {
    return Ok(None);
  };

  record.entry().to_app_option::<LobbyAgentProfile>().map_err(|e| wasm_error!(WasmErrorInner::Serialize(e)))
}

/// Get all registered lobby agent profiles.
#[hdk_extern]
pub fn get_all_lobby_agents(_: ()) -> ExternResult<Vec<LobbyAgentProfileRecord>> {
  let path = Path::from("lobby.agents");
  let links = get_links(LinkQuery::try_new(path.path_entry_hash()?, LinkTypes::AllLobbyAgents)?, GetStrategy::default())?;

  let mut results = Vec::new();
  for link in links {
    let Some(action_hash) = link.target.into_action_hash() else {
      continue;
    };
    let latest_hash = resolve_update_chain(action_hash.clone())?;
    let Some(record) = get(latest_hash, GetOptions::default())? else {
      continue;
    };
    let Ok(Some(entry)) = record.entry().to_app_option::<LobbyAgentProfile>() else {
      continue;
    };
    results.push(LobbyAgentProfileRecord { action_hash, entry });
  }
  Ok(results)
}

// ─── NDO announcement functions ───────────────────────────────────────────────

/// Announce an NDO to the global Lobby DHT so other agents can discover it.
#[hdk_extern]
pub fn announce_ndo(input: AnnounceNdoInput) -> ExternResult<ActionHash> {
  let agent = agent_info()?.agent_initial_pubkey;
  let now = sys_time()?;

  let stage_label = format!("{}", input.lifecycle_stage);

  let ann = NdoAnnouncement {
    ndo_name: input.ndo_name,
    ndo_dna_hash: input.ndo_dna_hash,
    network_seed: input.network_seed,
    ndo_identity_hash: input.ndo_identity_hash,
    lifecycle_stage: input.lifecycle_stage,
    property_regime: input.property_regime,
    resource_nature: input.resource_nature,
    description: input.description,
    registered_by: agent.clone(),
    registered_at: now,
  };

  let action_hash = create_entry(&EntryTypes::NdoAnnouncement(ann))?;

  // Global discovery anchor
  let all_ndos_path = Path::from("lobby.ndos");
  create_link(
    all_ndos_path.path_entry_hash()?,
    action_hash.clone(),
    LinkTypes::AllNdoAnnouncements,
    (),
  )?;

  // Agent-centric discovery
  create_link(
    agent,
    action_hash.clone(),
    LinkTypes::AgentToNdoAnnouncements,
    (),
  )?;

  // Lifecycle categorization for filtered queries
  let lifecycle_path = Path::from(format!("lobby.ndo.lifecycle.{}", stage_label));
  create_link(
    lifecycle_path.path_entry_hash()?,
    action_hash.clone(),
    LinkTypes::NdoAnnouncementByLifecycle,
    (),
  )?;

  Ok(action_hash)
}

/// Get all NDO announcements in the Lobby DHT (cross-conductor discovery).
#[hdk_extern]
pub fn get_all_ndo_announcements(_: ()) -> ExternResult<Vec<NdoAnnouncementRecord>> {
  let path = Path::from("lobby.ndos");
  let links = get_links(LinkQuery::try_new(path.path_entry_hash()?, LinkTypes::AllNdoAnnouncements)?, GetStrategy::default())?;

  let mut results = Vec::new();
  for link in links {
    let Some(action_hash) = link.target.into_action_hash() else {
      continue;
    };
    let latest_hash = resolve_update_chain(action_hash.clone())?;
    let Some(record) = get(latest_hash, GetOptions::default())? else {
      continue;
    };
    let Ok(Some(entry)) = record.entry().to_app_option::<NdoAnnouncement>() else {
      continue;
    };
    results.push(NdoAnnouncementRecord { action_hash, entry });
  }
  Ok(results)
}

/// Get NDO announcements registered by the calling agent.
#[hdk_extern]
pub fn get_my_ndo_announcements(_: ()) -> ExternResult<Vec<NdoAnnouncementRecord>> {
  let agent = agent_info()?.agent_initial_pubkey;
  let links = get_links(LinkQuery::try_new(agent, LinkTypes::AgentToNdoAnnouncements)?, GetStrategy::default())?;

  let mut results = Vec::new();
  for link in links {
    let Some(action_hash) = link.target.into_action_hash() else {
      continue;
    };
    let latest_hash = resolve_update_chain(action_hash.clone())?;
    let Some(record) = get(latest_hash, GetOptions::default())? else {
      continue;
    };
    let Ok(Some(entry)) = record.entry().to_app_option::<NdoAnnouncement>() else {
      continue;
    };
    results.push(NdoAnnouncementRecord { action_hash, entry });
  }
  Ok(results)
}

/// Get NDO announcements filtered by lifecycle stage string (e.g. "active", "stable").
#[hdk_extern]
pub fn get_ndo_announcements_by_lifecycle(stage: String) -> ExternResult<Vec<NdoAnnouncementRecord>> {
  let lifecycle_path = Path::from(format!("lobby.ndo.lifecycle.{}", stage));
  let links = get_links(
    LinkQuery::try_new(lifecycle_path.path_entry_hash()?, LinkTypes::NdoAnnouncementByLifecycle)?,
    GetStrategy::default(),
  )?;

  let mut results = Vec::new();
  for link in links {
    let Some(action_hash) = link.target.into_action_hash() else {
      continue;
    };
    let latest_hash = resolve_update_chain(action_hash.clone())?;
    let Some(record) = get(latest_hash, GetOptions::default())? else {
      continue;
    };
    let Ok(Some(entry)) = record.entry().to_app_option::<NdoAnnouncement>() else {
      continue;
    };
    results.push(NdoAnnouncementRecord { action_hash, entry });
  }
  Ok(results)
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateNdoAnnouncementInput {
  pub original_action_hash: ActionHash,
  pub new_lifecycle_stage: LifecycleStage,
}

/// Update the lifecycle_stage of an NdoAnnouncement. Only the registrant may call this.
#[hdk_extern]
pub fn update_ndo_announcement(input: UpdateNdoAnnouncementInput) -> ExternResult<ActionHash> {
  let Some(original_record) = get(input.original_action_hash.clone(), GetOptions::default())? else {
    return Err(wasm_error!(WasmErrorInner::Guest("original NdoAnnouncement not found".to_string())));
  };
  let Ok(Some(original)) = original_record.entry().to_app_option::<NdoAnnouncement>() else {
    return Err(wasm_error!(WasmErrorInner::Guest("could not decode NdoAnnouncement".to_string())));
  };
  let agent = agent_info()?.agent_initial_pubkey;
  if agent != original.registered_by {
    return Err(wasm_error!(WasmErrorInner::Guest(
      "only the registrant can update an NdoAnnouncement".to_string()
    )));
  }

  let updated = NdoAnnouncement {
    lifecycle_stage: input.new_lifecycle_stage,
    ..original
  };
  let new_hash = update_entry(input.original_action_hash.clone(), &updated)?;

  create_link(
    input.original_action_hash,
    new_hash.clone(),
    LinkTypes::NdoAnnouncementUpdates,
    (),
  )?;

  Ok(new_hash)
}

/// Get a single NdoAnnouncement by its action hash (resolves update chain).
#[hdk_extern]
pub fn get_ndo_announcement(action_hash: ActionHash) -> ExternResult<Option<NdoAnnouncementRecord>> {
  let latest_hash = resolve_update_chain(action_hash.clone())?;
  let Some(record) = get(latest_hash.clone(), GetOptions::default())? else {
    return Ok(None);
  };
  let Ok(Some(entry)) = record.entry().to_app_option::<NdoAnnouncement>() else {
    return Ok(None);
  };
  Ok(Some(NdoAnnouncementRecord { action_hash: latest_hash, entry }))
}

// ─── Group functions (stub until Group DNA ships in #101) ─────────────────────

/// Returns the agent's group memberships. Stub: returns a solo workspace until
/// Group DNA is implemented in issue #101.
#[hdk_extern]
pub fn get_my_groups(_: ()) -> ExternResult<Vec<GroupDescriptorStub>> {
  Ok(vec![GroupDescriptorStub {
    id: "solo".to_string(),
    name: "Solo workspace".to_string(),
    is_solo: true,
  }])
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/// Walk an update chain to return the most recent action hash.
fn resolve_update_chain(original: ActionHash) -> ExternResult<ActionHash> {
  let mut current = original;
  loop {
    match get_details(current.clone(), GetOptions::default())? {
      Some(Details::Record(details)) => {
        if details.updates.is_empty() {
          return Ok(current);
        }
        current = details
          .updates
          .into_iter()
          .max_by_key(|sah| sah.action().timestamp())
          .ok_or_else(|| wasm_error!(WasmErrorInner::Guest("empty updates".to_string())))?
          .hashed
          .hash;
      }
      _ => return Ok(current),
    }
  }
}
