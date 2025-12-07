use crate::PersonError;
use hdk::prelude::*;
use zome_person_integrity::*;

// Cross-zome call structure for agent identity validation
#[derive(Serialize, Deserialize, Debug)]
pub struct ValidateAgentIdentityInput {
  pub agent: AgentPubKey,
  pub resource_hash: ActionHash,
  pub private_data_hash: Option<ActionHash>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct PromoteAgentInput {
  pub agent: AgentPubKey,
  pub first_resource_hash: ActionHash,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PersonInput {
  pub name: String,
  pub avatar_url: Option<String>,
  pub bio: Option<String>,
}

#[hdk_extern]
pub fn create_person(input: PersonInput) -> ExternResult<Record> {
  // Check if person already exists for this agent
  let agent_pubkey = agent_info()?.agent_initial_pubkey;
  let link_query = LinkQuery::try_new(agent_pubkey.clone(), LinkTypes::AgentToPerson)?;
  let existing_links = get_links(link_query, GetStrategy::default())?;

  if !existing_links.is_empty() {
    return Err(PersonError::PersonAlreadyExists.into());
  }

  let person = Person {
    name: input.name,
    avatar_url: input.avatar_url,
    bio: input.bio,
  };

  let person_hash = create_entry(&EntryTypes::Person(person.clone()))?;
  let record = get(person_hash.clone(), GetOptions::default())?.ok_or(
    PersonError::EntryOperationFailed("Failed to retrieve created person".to_string()),
  )?;

  // Use the unified Person-centric link creation function
  create_person_entry_links(person_hash, agent_pubkey)?;

  Ok(record)
}

#[hdk_extern]
pub fn get_latest_person_record(original_action_hash: ActionHash) -> ExternResult<Option<Record>> {
  let link_query = LinkQuery::try_new(original_action_hash.clone(), LinkTypes::PersonUpdates)?;
  let links = get_links(link_query, GetStrategy::default())?;
  let latest_link = links
    .into_iter()
    .max_by(|link_a, link_b| link_a.timestamp.cmp(&link_b.timestamp));
  let latest_person_hash = match latest_link {
    Some(link) => {
      link
        .target
        .clone()
        .into_action_hash()
        .ok_or(PersonError::EntryOperationFailed(
          "Invalid action hash in link".to_string(),
        ))?
    }
    None => original_action_hash.clone(),
  };
  get(latest_person_hash, GetOptions::default())
}

#[hdk_extern]
pub fn get_latest_person(original_action_hash: ActionHash) -> ExternResult<Person> {
  let record = get_latest_person_record(original_action_hash)?.ok_or(
    PersonError::PersonNotFound("Person record not found".to_string()),
  )?;

  record
    .entry()
    .to_app_option()
    .map_err(|e| PersonError::SerializationError(format!("Failed to deserialize person: {:?}", e)))?
    .ok_or(PersonError::PersonNotFound("Person entry not found".to_string()).into())
}

#[hdk_extern]
pub fn get_agent_person_links(agent_pubkey: AgentPubKey) -> ExternResult<Vec<Link>> {
  let link_query = LinkQuery::try_new(agent_pubkey, LinkTypes::AgentToPerson)?;
  let links = get_links(link_query, GetStrategy::default())?;

  Ok(links)
}

#[derive(Serialize, Deserialize, Debug)]
pub struct UpdatePersonInput {
  pub original_action_hash: ActionHash,
  pub previous_action_hash: ActionHash,
  pub updated_person: PersonInput,
}

#[hdk_extern]
pub fn update_person(input: UpdatePersonInput) -> ExternResult<Record> {
  let original_record = must_get_valid_record(input.original_action_hash.clone())?;

  // Verify the author
  let author = original_record.action().author().clone();
  if author != agent_info()?.agent_initial_pubkey {
    return Err(PersonError::NotAuthor.into());
  }

  let updated_person = Person {
    name: input.updated_person.name,
    avatar_url: input.updated_person.avatar_url,
    bio: input.updated_person.bio,
  };

  let updated_person_hash = update_entry(input.previous_action_hash, &updated_person)?;

  create_link(
    input.original_action_hash,
    updated_person_hash.clone(),
    LinkTypes::PersonUpdates,
    (),
  )?;

  let record = get(updated_person_hash, GetOptions::default())?.ok_or(
    PersonError::EntryOperationFailed("Failed to retrieve updated person".to_string()),
  )?;

  Ok(record)
}

#[derive(Serialize, Deserialize, Debug)]
pub struct GetAllPersonsOutput {
  pub persons: Vec<Person>,
}

#[hdk_extern]
pub fn get_all_persons(_: ()) -> ExternResult<GetAllPersonsOutput> {
  let path = Path::from("persons");

  let link_query = LinkQuery::try_new(path.path_entry_hash()?, LinkTypes::AllPersons)?;
  let links = get_links(link_query, GetStrategy::default())?;

  let persons = links
    .iter()
    .filter_map(|link| {
      let action_hash = link.target.clone().into_action_hash()?;
      let record = get(action_hash, GetOptions::default()).ok()??;

      record.entry().to_app_option::<Person>().ok()?
    })
    .collect();

  Ok(GetAllPersonsOutput { persons })
}

#[derive(Serialize, Deserialize, Debug)]
pub struct PersonProfileOutput {
  pub person: Option<Person>,
  #[serde(skip_serializing_if = "Option::is_none")]
  pub private_data: Option<PrivatePersonData>,
}

#[hdk_extern]
pub fn get_person_profile(agent_pubkey: AgentPubKey) -> ExternResult<PersonProfileOutput> {
  // Use the new get_agent_person function for cleaner code
  let person_hash = match get_agent_person(agent_pubkey)? {
    Some(hash) => hash,
    None => {
      return Ok(PersonProfileOutput {
        person: None,
        private_data: None,
      })
    }
  };

  if let Ok(person) = get_latest_person(person_hash) {
    return Ok(PersonProfileOutput {
      person: Some(person),
      private_data: None, // Private data is only available through get_my_person_profile
    });
  }

  Ok(PersonProfileOutput {
    person: None,
    private_data: None,
  })
}

#[hdk_extern]
pub fn get_my_person_profile(_: ()) -> ExternResult<PersonProfileOutput> {
  let agent_info = agent_info()?;

  // Use the new get_agent_person function for cleaner code
  let person_hash = match get_agent_person(agent_info.agent_initial_pubkey.clone())? {
    Some(hash) => hash,
    None => {
      return Ok(PersonProfileOutput {
        person: None,
        private_data: None,
      })
    }
  };

  if let Ok(person) = get_latest_person(person_hash.clone()) {
    // Only try to get private data if we have a person, and do it efficiently
    let private_data = match get_private_data_for_person(person_hash) {
      Ok(data) => data,
      Err(_) => None, // If private data query fails, just return None instead of erroring
    };

    return Ok(PersonProfileOutput {
      person: Some(person),
      private_data,
    });
  }

  Ok(PersonProfileOutput {
    person: None,
    private_data: None,
  })
}

// Helper function to get private data for a person
fn get_private_data_for_person(person_hash: ActionHash) -> ExternResult<Option<PrivatePersonData>> {
  // Get links with a timeout to avoid hanging
  let link_query = LinkQuery::try_new(person_hash, LinkTypes::PersonToPrivateData)?;
  let private_data_links = get_links(link_query, GetStrategy::default())?;

  // If no links exist, return None immediately
  if private_data_links.is_empty() {
    return Ok(None);
  }

  if let Some(private_data_link) = private_data_links.first() {
    if let Some(action_hash) = private_data_link.target.clone().into_action_hash() {
      // Use a more efficient get operation
      match get(action_hash, GetOptions::default()) {
        Ok(Some(record)) => {
          if let Ok(Some(private_data)) = record.entry().to_app_option::<PrivatePersonData>() {
            return Ok(Some(private_data));
          }
        }
        _ => return Ok(None), // If we can't get the record, return None instead of error
      }
    }
  }

  Ok(None)
}

// ============================================================================
// PERSON-CENTRIC LINK MANAGEMENT FUNCTIONS
// ============================================================================

/// Core helper function to create Person entry links
/// This replaces the multiple link strategies with a single, unified approach
fn create_person_entry_links(
  person_hash: ActionHash,
  agent_pubkey: AgentPubKey,
) -> ExternResult<()> {
  // Create discovery link
  let path = Path::from("persons");
  create_link(
    path.path_entry_hash()?,
    person_hash.clone(),
    LinkTypes::AllPersons,
    (),
  )?;

  // Create Agent -> Person link (primary relationship)
  create_link(
    agent_pubkey.clone(),
    person_hash.clone(),
    LinkTypes::AgentToPerson,
    (),
  )?;

  // Create Person -> Agent link (reverse lookup for multi-device support)
  create_link(
    person_hash.clone(),
    agent_pubkey.clone(),
    LinkTypes::PersonToAgents,
    (),
  )?;

  // Create Agent-Person relationship entry
  let relationship = AgentPersonRelationship {
    agent: agent_pubkey.clone(),
    person: person_hash,
    established_at: sys_time()?,
    relationship_type: AgentPersonRelationshipType::Primary,
  };

  create_entry(&EntryTypes::AgentPersonRelationship(relationship))?;

  Ok(())
}

/// Get the Person associated with a specific Agent
#[hdk_extern]
pub fn get_agent_person(agent_pubkey: AgentPubKey) -> ExternResult<Option<ActionHash>> {
  let link_query = LinkQuery::try_new(agent_pubkey, LinkTypes::AgentToPerson)?;
  let links = get_links(link_query, GetStrategy::default())?;

  if let Some(link) = links.first() {
    if let Some(person_hash) = link.target.clone().into_action_hash() {
      return Ok(Some(person_hash));
    }
  }

  Ok(None)
}

/// Get all Agents associated with a specific Person (supports multi-device)
#[hdk_extern]
pub fn get_person_agents(person_hash: ActionHash) -> ExternResult<Vec<AgentPubKey>> {
  let links_query = LinkQuery::try_new(person_hash, LinkTypes::PersonToAgents)?;
  let links = get_links(links_query, GetStrategy::default())?;

  let mut agents = Vec::new();
  for link in links {
    if let Some(agent_hash) = link.target.into_agent_pub_key() {
      agents.push(agent_hash);
    }
  }

  Ok(agents)
}

/// Add an additional Agent to a Person (for multi-device support)
#[hdk_extern]
pub fn add_agent_to_person(input: (AgentPubKey, ActionHash)) -> ExternResult<bool> {
  let (new_agent, person_hash) = input;
  let agent_info = agent_info()?;

  // Verify the caller is associated with this person
  let caller_person = get_agent_person(agent_info.agent_initial_pubkey)?;
  if caller_person != Some(person_hash.clone()) {
    return Err(
      PersonError::InsufficientCapability("You can only add agents to your own person".to_string())
        .into(),
    );
  }

  // Check if agent is already associated
  let existing_agents = get_person_agents(person_hash.clone())?;
  if existing_agents.contains(&new_agent) {
    return Ok(false); // Already associated
  }

  // Create Agent -> Person link
  create_link(
    new_agent.clone(),
    person_hash.clone(),
    LinkTypes::AgentToPerson,
    (),
  )?;

  // Create Person -> Agent link
  create_link(
    person_hash.clone(),
    new_agent.clone(),
    LinkTypes::PersonToAgents,
    (),
  )?;

  // Create Agent-Person relationship entry
  let relationship = AgentPersonRelationship {
    agent: new_agent,
    person: person_hash,
    established_at: sys_time()?,
    relationship_type: AgentPersonRelationshipType::Secondary,
  };

  create_entry(&EntryTypes::AgentPersonRelationship(relationship))?;

  Ok(true)
}

/// Remove an Agent from a Person (for device removal)
#[hdk_extern]
pub fn remove_agent_from_person(input: (AgentPubKey, ActionHash)) -> ExternResult<bool> {
  let (agent_to_remove, person_hash) = input;
  let agent_info = agent_info()?;
  let agent_pubkey = agent_info.agent_initial_pubkey;

  // Verify the caller is associated with this person
  let caller_person = get_agent_person(agent_pubkey.clone())?;
  if caller_person != Some(person_hash.clone()) {
    return Err(
      PersonError::InsufficientCapability(
        "You can only remove agents from your own person".to_string(),
      )
      .into(),
    );
  }

  // Cannot remove yourself
  if agent_to_remove == agent_pubkey {
    return Err(
      PersonError::InvalidInput("Cannot remove yourself from your own person".to_string()).into(),
    );
  }

  // Find and delete the Agent -> Person link
  let link_query = LinkQuery::try_new(agent_to_remove.clone(), LinkTypes::AgentToPerson)?;
  let agent_links = get_links(link_query, GetStrategy::default())?;

  for link in agent_links {
    if let Some(target_person) = link.target.clone().into_action_hash() {
      if target_person == person_hash {
        delete_link(link.create_link_hash, GetOptions::default())?;
        break;
      }
    }
  }

  // Find and delete the Person -> Agent link
  let link_query = LinkQuery::try_new(person_hash, LinkTypes::PersonToAgents)?;
  let person_links = get_links(link_query, GetStrategy::default())?;

  for link in person_links {
    if let Some(target_agent) = link.target.clone().into_agent_pub_key() {
      if target_agent == agent_to_remove {
        delete_link(link.create_link_hash, GetOptions::default())?;
        break;
      }
    }
  }

  Ok(true)
}

/// Check if an Agent is associated with a Person
#[hdk_extern]
pub fn is_agent_associated_with_person(input: (AgentPubKey, ActionHash)) -> ExternResult<bool> {
  let (agent, person_hash) = input;

  let agents = get_person_agents(person_hash)?;
  Ok(agents.contains(&agent))
}

// Agent Promotion Function for Simple Agent → Accountable Agent
#[hdk_extern]
pub fn promote_agent_to_accountable(input: PromoteAgentInput) -> ExternResult<String> {
  // This implements REQ-GOV-03: Agent Validation
  // Call governance zome to validate agent identity and promote them

  // Get the agent's private data hash if it exists using Person-centric approach
  let private_data_hash = if let Some(person_hash) = get_agent_person(input.agent.clone())? {
    get_private_data_for_person(person_hash)?.map(|_| {
      // We found private data, but don't expose the actual hash for security
      // Use a safe placeholder hash format to avoid runtime panics.
      ActionHash::from_raw_36(vec![0; 36])
    })
  } else {
    None
  };

  let validation_result = call(
    CallTargetCell::Local,
    "zome_gouvernance",
    "validate_agent_identity".into(),
    None,
    &ValidateAgentIdentityInput {
      agent: input.agent,
      resource_hash: input.first_resource_hash,
      private_data_hash,
    },
  );

  match validation_result {
    Ok(_) => Ok("Agent successfully promoted to Accountable Agent".to_string()),
    Err(e) => {
      Err(PersonError::EntryOperationFailed(format!("Agent promotion failed: {:?}", e)).into())
    }
  }
}
