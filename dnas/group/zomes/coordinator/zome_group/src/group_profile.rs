use crate::GroupError;
use hdk::prelude::*;
use zome_group_integrity::*;

#[derive(Debug, Serialize, Deserialize)]
pub struct GroupProfileInput {
  pub name: String,
  pub description: Option<String>,
}

#[hdk_extern]
pub fn create_group(input: GroupProfileInput) -> ExternResult<Record> {
  let profile = GroupProfile {
    name: input.name,
    description: input.description,
  };

  let profile_hash = create_entry(&EntryTypes::GroupProfile(profile.clone()))?;
  let record = get(profile_hash.clone(), GetOptions::default())?.ok_or(
    GroupError::EntryOperationFailed("Failed to retrieve created group profile".to_string()),
  )?;

  let path = Path::from("all_groups");
  create_link(
    path.path_entry_hash()?,
    profile_hash.clone(),
    LinkTypes::AllGroups,
    (),
  )?;

  Ok(record)
}

#[hdk_extern]
pub fn get_group(group_hash: ActionHash) -> ExternResult<Option<Record>> {
  get(group_hash, GetOptions::default())
}

// get_all_groups removed: in the one-group-per-cell model, each cloned cell has exactly
// one GroupProfile. Use get_my_group() instead. Cross-group discovery goes through the
// Lobby DNA's GroupAnnouncement registry (Lobby → Groups → NDOs hierarchy).

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateGroupInput {
  /// Action hash of the original create (or previous update) action to be superseded.
  pub previous_action_hash: ActionHash,
  /// Action hash of the very first create action — used as the stable link source.
  pub original_action_hash: ActionHash,
  pub updated_name: String,
  pub updated_description: Option<String>,
}

/// Updates an existing GroupProfile. Only the original initiator may update.
/// Creates a `GroupUpdates` link from the original action to the new version.
#[hdk_extern]
pub fn update_group(input: UpdateGroupInput) -> ExternResult<Record> {
  let original_record = must_get_valid_record(input.original_action_hash.clone())?;

  let author = original_record.action().author().clone();
  if author != agent_info()?.agent_initial_pubkey {
    return Err(GroupError::NotAuthor.into());
  }

  let updated_profile = GroupProfile {
    name: input.updated_name,
    description: input.updated_description,
  };

  let updated_hash = update_entry(input.previous_action_hash, &updated_profile)?;
  let record = get(updated_hash.clone(), GetOptions::default())?.ok_or(
    GroupError::EntryOperationFailed("Failed to retrieve updated group profile".to_string()),
  )?;

  create_link(
    input.original_action_hash,
    updated_hash,
    LinkTypes::GroupUpdates,
    (),
  )?;

  Ok(record)
}

/// Returns the single GroupProfile living in this cloned cell (one group per cell).
/// Queries the AllGroups anchor — since each cell has its own DHT, there is exactly one entry.
#[hdk_extern]
pub fn get_my_group(_: ()) -> ExternResult<Option<Record>> {
  let path = Path::from("all_groups");
  let link_query = LinkQuery::try_new(path.path_entry_hash()?, LinkTypes::AllGroups)?;
  let links = get_links(link_query, GetStrategy::default())?;

  let record = links.into_iter().find_map(|link| {
    let hash = link.target.into_action_hash()?;
    get(hash, GetOptions::default()).ok()?
  });

  Ok(record)
}
