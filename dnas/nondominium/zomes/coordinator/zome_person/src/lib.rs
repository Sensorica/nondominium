use hdk::prelude::*;
use zome_person_integrity::*;

#[hdk_extern]
pub fn init(_: ()) -> ExternResult<InitCallbackResult> {
    Ok(InitCallbackResult::Pass)
}

#[derive(Serialize, Deserialize, Debug)]
pub struct CreatePersonInput {
    pub name: String,
    pub avatar_url: Option<String>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct CreatePersonOutput {
    pub person_hash: ActionHash,
    pub person: Person,
}

#[hdk_extern]
pub fn create_person(input: CreatePersonInput) -> ExternResult<CreatePersonOutput> {
    let agent_info = agent_info()?;
    let now = sys_time()?;

    let person = Person {
        agent_pub_key: agent_info.agent_initial_pubkey.clone(),
        name: input.name,
        avatar_url: input.avatar_url,
        created_at: now,
    };

    let person_hash = create_entry(&EntryTypes::Person(person.clone()))?;

    // Create an anchor link for discovering all persons
    let path = Path::from("all_people");
    let anchor_hash = path.path_entry_hash()?;
    create_link(
        anchor_hash,
        person_hash.clone(),
        LinkTypes::AllPeople,
        LinkTag::new("person"),
    )?;

    Ok(CreatePersonOutput {
        person_hash,
        person,
    })
}

#[derive(Serialize, Deserialize, Debug)]
pub struct CreateEncryptedDataInput {
    pub encrypted_data: Vec<u8>,
    pub encryption_method: String,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct CreateEncryptedDataOutput {
    pub encrypted_data_hash: ActionHash,
    pub encrypted_data: EncryptedAgentData,
}

#[hdk_extern]
pub fn store_encrypted_data(
    input: CreateEncryptedDataInput,
) -> ExternResult<CreateEncryptedDataOutput> {
    let agent_info = agent_info()?;
    let now = sys_time()?;

    let encrypted_data = EncryptedAgentData {
        agent_pub_key: agent_info.agent_initial_pubkey.clone(),
        encrypted_data: input.encrypted_data,
        encryption_method: input.encryption_method,
        created_at: now,
    };

    let encrypted_data_hash =
        create_entry(&EntryTypes::EncryptedAgentData(encrypted_data.clone()))?;

    // Get the person hash first, then link encrypted data to it
    let person_hash = get_my_person_hash()?;

    create_link(
        person_hash,
        encrypted_data_hash.clone(),
        LinkTypes::PersonToEncryptedData,
        LinkTag::new("encrypted_data"),
    )?;

    Ok(CreateEncryptedDataOutput {
        encrypted_data_hash,
        encrypted_data,
    })
}

// Helper function to get the current agent's person hash
fn get_my_person_hash() -> ExternResult<ActionHash> {
    let agent_info = agent_info()?;
    let path = Path::from("all_people");
    let anchor_hash = path.path_entry_hash()?;

    let links = get_links(GetLinksInput {
        base_address: anchor_hash.into(),
        link_type: LinkTypes::AllPeople.try_into()?,
        tag_prefix: Some(LinkTag::new("person")),
        after: None,
        before: None,
        author: Some(agent_info.agent_initial_pubkey),
        get_options: GetOptions::default(),
    })?;

    if let Some(link) = links.first() {
        // Convert AnyLinkableHash to ActionHash
        if let AnyLinkableHash::Action(action_hash) = &link.target {
            return Ok(action_hash.clone());
        }
    }

    Err(wasm_error!(WasmErrorInner::Guest(
        "Person not found for agent".to_string()
    )))
}

#[derive(Serialize, Deserialize, Debug)]
pub struct GetAgentProfileOutput {
    pub person: Option<Person>,
    pub encrypted_data: Vec<EncryptedAgentData>,
}

#[hdk_extern]
pub fn get_agent_profile(agent_pub_key: AgentPubKey) -> ExternResult<GetAgentProfileOutput> {
    // First get the person
    let path = Path::from("all_people");
    let anchor_hash = path.path_entry_hash()?;

    let person_links = get_links(GetLinksInput {
        base_address: anchor_hash.into(),
        link_type: LinkTypes::AllPeople.try_into()?,
        tag_prefix: Some(LinkTag::new("person")),
        after: None,
        before: None,
        author: Some(agent_pub_key.clone()),
        get_options: GetOptions::default(),
    })?;

    let mut person = None;
    let mut person_hash = None;

    if let Some(person_link) = person_links.first() {
        if let Some(person_record) = get(
            AnyDhtHash::from(person_link.target.clone()),
            GetOptions::default(),
        )? {
            match person_record.entry().to_app_option() {
                Ok(Some(EntryTypes::Person(person_entry))) => {
                    person = Some(person_entry);
                    if let AnyLinkableHash::Action(action_hash) = &person_link.target {
                        person_hash = Some(action_hash.clone());
                    }
                }
                _ => {}
            }
        }
    }

    // Get encrypted data links from the person entry
    let mut encrypted_data = Vec::new();
    if let Some(p_hash) = person_hash {
        let encrypted_links = get_links(GetLinksInput {
            base_address: p_hash.into(),
            link_type: LinkTypes::PersonToEncryptedData.try_into()?,
            tag_prefix: Some(LinkTag::new("encrypted_data")),
            after: None,
            before: None,
            author: None,
            get_options: GetOptions::default(),
        })?;

        for encrypted_link in encrypted_links {
            if let Some(encrypted_record) = get(
                AnyDhtHash::from(encrypted_link.target.clone()),
                GetOptions::default(),
            )? {
                match encrypted_record.entry().to_app_option() {
                    Ok(Some(EntryTypes::EncryptedAgentData(encrypted_entry))) => {
                        encrypted_data.push(encrypted_entry);
                    }
                    _ => {}
                }
            }
        }
    }

    Ok(GetAgentProfileOutput {
        person,
        encrypted_data,
    })
}

#[derive(Serialize, Deserialize, Debug)]
pub struct GetAllAgentsOutput {
    pub agents: Vec<Person>,
}

#[hdk_extern]
pub fn get_all_agents(_: ()) -> ExternResult<GetAllAgentsOutput> {
    let path = Path::from("all_people");
    let anchor_hash = path.path_entry_hash()?;

    let links = get_links(GetLinksInput {
        base_address: anchor_hash.into(),
        link_type: LinkTypes::AllPeople.try_into()?,
        tag_prefix: Some(LinkTag::new("person")),
        after: None,
        before: None,
        author: None,
        get_options: GetOptions::default(),
    })?;

    let mut people = Vec::new();
    for link in links {
        if let Some(record) = get(AnyDhtHash::from(link.target), GetOptions::default())? {
            match record.entry().to_app_option() {
                Ok(Some(EntryTypes::Person(person))) => {
                    people.push(person);
                }
                _ => {}
            }
        }
    }

    Ok(GetAllAgentsOutput { agents: people })
}

#[derive(Serialize, Deserialize, Debug)]
pub struct AssignRoleInput {
    pub agent_pub_key: AgentPubKey,
    pub role_name: String,
    pub description: Option<String>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct AssignRoleOutput {
    pub role_hash: ActionHash,
    pub role: AgentRole,
}

#[hdk_extern]
pub fn assign_role(input: AssignRoleInput) -> ExternResult<AssignRoleOutput> {
    let agent_info = agent_info()?;
    let now = sys_time()?;

    let role = AgentRole {
        role_name: input.role_name,
        description: input.description,
        assigned_to: input.agent_pub_key.clone(),
        assigned_by: agent_info.agent_initial_pubkey,
        assigned_at: now,
        validation_metadata: None,
    };

    let role_hash = create_entry(&EntryTypes::AgentRole(role.clone()))?;

    // Get the person hash for the agent, then link role to person
    let person_hash = get_person_hash_by_agent(input.agent_pub_key)?;

    create_link(
        person_hash,
        role_hash.clone(),
        LinkTypes::PersonToRole,
        LinkTag::new("role"),
    )?;

    Ok(AssignRoleOutput { role_hash, role })
}

// Helper function to get person hash by agent public key
fn get_person_hash_by_agent(agent_pub_key: AgentPubKey) -> ExternResult<ActionHash> {
    let path = Path::from("all_people");
    let anchor_hash = path.path_entry_hash()?;

    let links = get_links(GetLinksInput {
        base_address: anchor_hash.into(),
        link_type: LinkTypes::AllPeople.try_into()?,
        tag_prefix: Some(LinkTag::new("person")),
        after: None,
        before: None,
        author: Some(agent_pub_key),
        get_options: GetOptions::default(),
    })?;

    if let Some(link) = links.first() {
        if let AnyLinkableHash::Action(action_hash) = &link.target {
            return Ok(action_hash.clone());
        }
    }

    Err(wasm_error!(WasmErrorInner::Guest(
        "Person not found for agent".to_string()
    )))
}

#[hdk_extern]
pub fn get_my_profile(_: ()) -> ExternResult<GetAgentProfileOutput> {
    let agent_info = agent_info()?;
    get_agent_profile(agent_info.agent_initial_pubkey)
}

#[hdk_extern]
pub fn post_commit(committed_actions: Vec<SignedActionHashed>) -> ExternResult<()> {
    // Handle any post-commit logic for person-related actions
    for action in committed_actions {
        if let Action::Create(create_action) = action.action() {
            // Could emit signals here for real-time updates
            let _entry_type = create_action.entry_type.clone();
            // TODO: Implement signaling for new person creation, role assignments, etc.
        }
    }
    Ok(())
}

#[hdk_extern]
pub fn signal_action(action: SignedActionHashed) -> ExternResult<()> {
    match action.action() {
        Action::Create(_) => {
            // Emit signal for any create actions
            emit_signal(&action)?;
        }
        Action::Update(_) => {
            // Emit signal for any update actions
            emit_signal(&action)?;
        }
        _ => {}
    }
    Ok(())
}
