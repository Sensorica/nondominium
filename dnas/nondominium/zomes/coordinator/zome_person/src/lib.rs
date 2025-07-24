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

    let person_hash = create_entry(EntryTypes::Person(person.clone()))?;

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
pub struct StorePrivateDataInput {
    pub legal_name: String,
    pub address: String,
    pub email: String,
    pub phone: Option<String>,
    pub photo_id_hash: Option<String>,
    pub emergency_contact: Option<String>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct StorePrivateDataOutput {
    pub private_data_hash: ActionHash,
    pub private_data: PrivateAgentData,
}

#[hdk_extern]
pub fn store_private_data(input: StorePrivateDataInput) -> ExternResult<StorePrivateDataOutput> {
    let agent_info = agent_info()?;
    let now = sys_time()?;

    let private_data = PrivateAgentData {
        legal_name: input.legal_name,
        address: input.address,
        email: input.email,
        phone: input.phone,
        photo_id_hash: input.photo_id_hash,
        emergency_contact: input.emergency_contact,
        created_at: now,
    };

    // Create as PRIVATE entry - only accessible by the creating agent
    let private_data_hash = create_entry(EntryTypes::PrivateAgentData(private_data.clone()))?;

    // Link from person to their private data (if person exists)
    // First, try to find the person record
    let path = Path::from("all_people");
    let anchor_hash = path.path_entry_hash()?;
    let person_links =
        get_links(GetLinksInputBuilder::try_new(anchor_hash, LinkTypes::AllPeople)?.build())?;

    for link in person_links {
        if let Ok(any_dht_hash) = AnyDhtHash::try_from(link.target.clone()) {
            if let Some(person_record) = get(any_dht_hash, GetOptions::default())? {
                if let Ok(Some(EntryTypes::Person(person))) = person_record
                    .entry()
                    .to_app_option::<EntryTypes>()
                    .map_err(|_| {
                        wasm_error!(WasmErrorInner::Guest("Failed to deserialize person".into()))
                    })
                {
                    if person.agent_pub_key == agent_info.agent_initial_pubkey {
                        // Link from this person to their private data
                        create_link(
                            link.target,
                            private_data_hash.clone(),
                            LinkTypes::PersonToPrivateData,
                            LinkTag::new("private"),
                        )?;
                        break;
                    }
                }
            }
        }
    }

    Ok(StorePrivateDataOutput {
        private_data_hash,
        private_data,
    })
}

#[derive(Serialize, Deserialize, Debug)]
pub struct AgentProfileOutput {
    pub person: Option<Person>,
    pub private_data: Option<PrivateAgentData>, // Only available to the agent themselves
}

#[hdk_extern]
pub fn get_agent_profile(agent_pub_key: AgentPubKey) -> ExternResult<AgentProfileOutput> {
    let mut profile = AgentProfileOutput {
        person: None,
        private_data: None,
    };

    // Get person profile by searching through all people
    let path = Path::from("all_people");
    let anchor_hash = path.path_entry_hash()?;

    // Use correct GetLinksInputBuilder pattern
    let links =
        get_links(GetLinksInputBuilder::try_new(anchor_hash, LinkTypes::AllPeople)?.build())?;

    for link in links {
        if let Ok(any_dht_hash) = AnyDhtHash::try_from(link.target.clone()) {
            if let Some(person_record) = get(any_dht_hash, GetOptions::default())? {
                if let Ok(Some(EntryTypes::Person(person))) = person_record
                    .entry()
                    .to_app_option::<EntryTypes>()
                    .map_err(|_| {
                        wasm_error!(WasmErrorInner::Guest("Failed to deserialize person".into()))
                    })
                {
                    if person.agent_pub_key == agent_pub_key {
                        profile.person = Some(person);

                        // Only try to get private data if the requesting agent is the same
                        let current_agent = agent_info()?;
                        if current_agent.agent_initial_pubkey == agent_pub_key {
                            // Try to get private data for the agent themselves
                            let private_links = get_links(
                                GetLinksInputBuilder::try_new(
                                    link.target,
                                    LinkTypes::PersonToPrivateData,
                                )?
                                .build(),
                            )?;

                            for private_link in private_links {
                                if let Ok(any_dht_hash) = AnyDhtHash::try_from(private_link.target)
                                {
                                    if let Some(private_record) =
                                        get(any_dht_hash, GetOptions::default())?
                                    {
                                        if let Ok(Some(EntryTypes::PrivateAgentData(
                                            private_data,
                                        ))) =
                                            private_record.entry().to_app_option::<EntryTypes>()
                                        {
                                            profile.private_data = Some(private_data);
                                            break;
                                        }
                                    }
                                }
                            }
                        }
                        break;
                    }
                }
            }
        }
    }

    Ok(profile)
}

#[hdk_extern]
pub fn get_my_profile(_: ()) -> ExternResult<AgentProfileOutput> {
    let agent_info = agent_info()?;
    get_agent_profile(agent_info.agent_initial_pubkey)
}

#[derive(Serialize, Deserialize, Debug)]
pub struct GetAllAgentsOutput {
    pub agents: Vec<Person>,
}

#[hdk_extern]
pub fn get_all_agents(_: ()) -> ExternResult<GetAllAgentsOutput> {
    let path = Path::from("all_people");
    let anchor_hash = path.path_entry_hash()?;

    let links =
        get_links(GetLinksInputBuilder::try_new(anchor_hash, LinkTypes::AllPeople)?.build())?;

    let mut agents = Vec::new();

    for link in links {
        if let Ok(any_dht_hash) = AnyDhtHash::try_from(link.target) {
            if let Some(record) = get(any_dht_hash, GetOptions::default())? {
                if let Ok(Some(EntryTypes::Person(person))) =
                    record.entry().to_app_option::<EntryTypes>().map_err(|_| {
                        wasm_error!(WasmErrorInner::Guest("Failed to deserialize person".into()))
                    })
                {
                    agents.push(person);
                }
            }
        }
    }

    Ok(GetAllAgentsOutput { agents })
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
        validation_metadata: Some("{\"assigned_through\":\"coordinator_function\"}".to_string()),
    };

    let role_hash = create_entry(EntryTypes::AgentRole(role.clone()))?;

    Ok(AssignRoleOutput { role_hash, role })
}

#[derive(Serialize, Deserialize, Debug)]
pub struct GetAgentRolesOutput {
    pub roles: Vec<AgentRole>,
}

#[hdk_extern]
pub fn get_agent_roles(agent_pub_key: AgentPubKey) -> ExternResult<GetAgentRolesOutput> {
    // Find the person record first
    let path = Path::from("all_people");
    let anchor_hash = path.path_entry_hash()?;
    let person_links =
        get_links(GetLinksInputBuilder::try_new(anchor_hash, LinkTypes::AllPeople)?.build())?;

    let mut roles = Vec::new();

    for link in person_links {
        if let Ok(any_dht_hash) = AnyDhtHash::try_from(link.target.clone()) {
            if let Some(person_record) = get(any_dht_hash, GetOptions::default())? {
                if let Ok(Some(EntryTypes::Person(person))) = person_record
                    .entry()
                    .to_app_option::<EntryTypes>()
                    .map_err(|_| {
                        wasm_error!(WasmErrorInner::Guest("Failed to deserialize person".into()))
                    })
                {
                    if person.agent_pub_key == agent_pub_key {
                        // Get roles for this person
                        let role_links = get_links(
                            GetLinksInputBuilder::try_new(link.target, LinkTypes::PersonToRole)?
                                .build(),
                        )?;

                        for role_link in role_links {
                            if let Ok(any_dht_hash) = AnyDhtHash::try_from(role_link.target) {
                                if let Some(record) = get(any_dht_hash, GetOptions::default())? {
                                    if let Ok(Some(EntryTypes::AgentRole(role))) =
                                        record.entry().to_app_option::<EntryTypes>().map_err(|_| {
                                            wasm_error!(WasmErrorInner::Guest(
                                                "Failed to deserialize role".into()
                                            ))
                                        })
                                    {
                                        roles.push(role);
                                    }
                                }
                            }
                        }
                        break;
                    }
                }
            }
        }
    }

    Ok(GetAgentRolesOutput { roles })
}
