use hdk::prelude::*;
use zome_lobby_integrity::*;
use nondominium_shared::io::lobby::{
  AnnounceGroupInput, GroupDescriptorStub, LobbyAgentProfileInput,
};

#[hdk_extern]
pub fn init(_: ()) -> ExternResult<InitCallbackResult> {
  Ok(InitCallbackResult::Pass)
}

// ─── Output types ──────────────────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize)]
pub struct LobbyAgentProfileRecord {
  pub action_hash: ActionHash,
  pub entry: LobbyAgentProfile,
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
  let existing_links = get_links(
    LinkQuery::try_new(agent.clone(), LinkTypes::AgentToLobbyProfile)?,
    GetStrategy::default(),
  )?;

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

  // Agent-centric lookup: agent pubkey -> profile
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
  let links = get_links(
    LinkQuery::try_new(agent, LinkTypes::AgentToLobbyProfile)?,
    GetStrategy::default(),
  )?;

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

  record
    .entry()
    .to_app_option::<LobbyAgentProfile>()
    .map_err(|e| wasm_error!(WasmErrorInner::Serialize(e)))
}

/// Get all registered lobby agent profiles.
#[hdk_extern]
pub fn get_all_lobby_agents(_: ()) -> ExternResult<Vec<LobbyAgentProfileRecord>> {
  let path = Path::from("lobby.agents");
  let links = get_links(
    LinkQuery::try_new(path.path_entry_hash()?, LinkTypes::AllLobbyAgents)?,
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
    let Ok(Some(entry)) = record.entry().to_app_option::<LobbyAgentProfile>() else {
      continue;
    };
    results.push(LobbyAgentProfileRecord { action_hash, entry });
  }
  Ok(results)
}

// ─── Group announcement functions ─────────────────────────────────────────────
//
// The Lobby DHT is the registry for group cells. Groups host NDOs; NDOs travel
// group-to-group through agents who are members of multiple groups (fractal,
// organic propagation). NDO discoverability flows through Groups, not the Lobby.

/// Announce a group cloned cell to the Lobby DHT so other agents can discover it.
/// Returns the Record of the created GroupAnnouncement.
#[hdk_extern]
pub fn announce_group(input: AnnounceGroupInput) -> ExternResult<Record> {
  let agent = agent_info()?.agent_initial_pubkey;

  let ann = GroupAnnouncement {
    group_name: input.group_name,
    group_dna_hash: input.group_dna_hash,
    network_seed: input.network_seed,
    description: input.description,
    registered_by: agent.clone(),
  };

  let action_hash = create_entry(&EntryTypes::GroupAnnouncement(ann))?;

  // Global discovery anchor
  let all_groups_path = Path::from("lobby.groups");
  create_link(
    all_groups_path.path_entry_hash()?,
    action_hash.clone(),
    LinkTypes::AllGroupAnnouncements,
    (),
  )?;

  // Agent-centric discovery
  create_link(
    agent,
    action_hash.clone(),
    LinkTypes::AgentToGroupAnnouncements,
    (),
  )?;

  let record = get(action_hash, GetOptions::default())?.ok_or(wasm_error!(
    WasmErrorInner::Guest("Failed to retrieve created group announcement".to_string())
  ))?;
  Ok(record)
}

/// Get all group announcements in the Lobby DHT (cross-conductor discovery).
#[hdk_extern]
pub fn get_all_group_announcements(_: ()) -> ExternResult<Vec<Record>> {
  let path = Path::from("lobby.groups");
  let links = get_links(
    LinkQuery::try_new(path.path_entry_hash()?, LinkTypes::AllGroupAnnouncements)?,
    GetStrategy::default(),
  )?;

  let mut results = Vec::new();
  for link in links {
    let Some(hash) = link.target.into_action_hash() else {
      continue;
    };
    let Some(record) = get(hash, GetOptions::default())? else {
      continue;
    };
    results.push(record);
  }
  Ok(results)
}

/// Get group announcements registered by the calling agent.
#[hdk_extern]
pub fn get_my_group_announcements(_: ()) -> ExternResult<Vec<Record>> {
  let agent = agent_info()?.agent_initial_pubkey;
  let links = get_links(
    LinkQuery::try_new(agent, LinkTypes::AgentToGroupAnnouncements)?,
    GetStrategy::default(),
  )?;

  let mut results = Vec::new();
  for link in links {
    let Some(hash) = link.target.into_action_hash() else {
      continue;
    };
    let Some(record) = get(hash, GetOptions::default())? else {
      continue;
    };
    results.push(record);
  }
  Ok(results)
}

/// Look up a group announcement by its DNA hash.
/// Returns the first announcement whose `group_dna_hash` matches the given hash.
#[hdk_extern]
pub fn get_group_announcement_by_dna_hash(
  dna_hash: DnaHash,
) -> ExternResult<Option<Record>> {
  let path = Path::from("lobby.groups");
  let links = get_links(
    LinkQuery::try_new(path.path_entry_hash()?, LinkTypes::AllGroupAnnouncements)?,
    GetStrategy::default(),
  )?;

  for link in links {
    let Some(hash) = link.target.into_action_hash() else {
      continue;
    };
    let Some(record) = get(hash, GetOptions::default())? else {
      continue;
    };
    if let Ok(Some(ann)) = record.entry().to_app_option::<GroupAnnouncement>() {
      if ann.group_dna_hash == dna_hash {
        return Ok(Some(record));
      }
    }
  }
  Ok(None)
}

/// Returns the agent's group announcements as lightweight stubs.
#[hdk_extern]
pub fn get_my_groups(_: ()) -> ExternResult<Vec<GroupDescriptorStub>> {
  let records = get_my_group_announcements(())?;
  let stubs = records
    .into_iter()
    .filter_map(|r| {
      let ann: GroupAnnouncement = r.entry().to_app_option().ok()??;
      Some(GroupDescriptorStub {
        id: ann.network_seed.clone(),
        name: ann.group_name,
        is_solo: false,
      })
    })
    .collect();
  Ok(stubs)
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
