use crate::PersonError;
use hdk::prelude::*;
use zome_person_integrity::*;

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
    let existing_links = get_links(
        GetLinksInputBuilder::try_new(agent_pubkey.clone(), LinkTypes::AgentToPerson)?.build(),
    )?;

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

    // Create discovery link
    let path = Path::from("persons");
    create_link(
        path.path_entry_hash()?,
        person_hash.clone(),
        LinkTypes::AllPersons,
        (),
    )?;

    // Create agent-to-person link for quick lookup
    create_link(
        agent_pubkey,
        person_hash.clone(),
        LinkTypes::AgentToPerson,
        (),
    )?;

    Ok(record)
}

#[hdk_extern]
pub fn get_latest_person_record(original_action_hash: ActionHash) -> ExternResult<Option<Record>> {
    let links = get_links(
        GetLinksInputBuilder::try_new(original_action_hash.clone(), LinkTypes::PersonUpdates)?
            .build(),
    )?;
    let latest_link = links
        .into_iter()
        .max_by(|link_a, link_b| link_a.timestamp.cmp(&link_b.timestamp));
    let latest_person_hash = match latest_link {
        Some(link) => {
            link.target
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
        .map_err(|e| {
            PersonError::SerializationError(format!("Failed to deserialize person: {:?}", e))
        })?
        .ok_or(PersonError::PersonNotFound("Person entry not found".to_string()).into())
}

#[hdk_extern]
pub fn get_agent_person(agent_pubkey: AgentPubKey) -> ExternResult<Vec<Link>> {
    get_links(GetLinksInputBuilder::try_new(agent_pubkey, LinkTypes::AgentToPerson)?.build())
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
    let links = get_links(
        GetLinksInputBuilder::try_new(path.path_entry_hash()?, LinkTypes::AllPersons)?.build(),
    )?;

    let mut persons = Vec::new();

    for link in links {
        if let Some(action_hash) = link.target.into_action_hash() {
            if let Some(record) = get(action_hash, GetOptions::default())? {
                if let Ok(Some(person)) = record.entry().to_app_option::<Person>() {
                    persons.push(person);
                }
            }
        }
    }

    Ok(GetAllPersonsOutput { persons })
}

#[derive(Serialize, Deserialize, Debug)]
pub struct PersonProfileOutput {
    pub person: Option<Person>,
}

#[hdk_extern]
pub fn get_person_profile(agent_pubkey: AgentPubKey) -> ExternResult<PersonProfileOutput> {
    let links = get_agent_person(agent_pubkey)?;

    if let Some(link) = links.first() {
        if let Some(action_hash) = link.target.clone().into_action_hash() {
            if let Ok(person) = get_latest_person(action_hash) {
                return Ok(PersonProfileOutput {
                    person: Some(person),
                });
            }
        }
    }

    Ok(PersonProfileOutput { person: None })
}

#[hdk_extern]
pub fn get_my_person_profile(_: ()) -> ExternResult<PersonProfileOutput> {
    let agent_info = agent_info()?;
    get_person_profile(agent_info.agent_initial_pubkey)
}
