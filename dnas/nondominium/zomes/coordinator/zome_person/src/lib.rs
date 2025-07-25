use hdk::prelude::*;
use zome_person_integrity::*;

#[derive(Debug, thiserror::Error)]
pub enum PersonError {
    #[error("Person profile not found for agent: {0}")]
    PersonNotFound(String),
    #[error("Private data not found for agent")]
    PrivateDataNotFound,
    #[error("Agent roles not found")]
    RolesNotFound,
    #[error("Serialization error: {0}")]
    SerializationError(String),
    #[error("Invalid agent operation: {0}")]
    InvalidAgent(String),
    #[error("Link creation failed: {0}")]
    LinkCreationFailed(String),
}


// Helper function to find person by agent pub key
fn find_person_by_agent(agent_pub_key: &AgentPubKey) -> ExternResult<Option<(AnyDhtHash, Person)>> {
    let path = Path::from("all_people");
    let anchor_hash = path.path_entry_hash()?;
    let links = get_links(GetLinksInputBuilder::try_new(anchor_hash, LinkTypes::AllPeople)?.build())?;

    for link in links {
        if let Ok(any_dht_hash) = AnyDhtHash::try_from(link.target.clone()) {
            if let Some(record) = get(any_dht_hash.clone(), GetOptions::default())? {
                if let Ok(Some(EntryTypes::Person(person))) = record
                    .entry()
                    .to_app_option::<EntryTypes>()
                    .map_err(|_| PersonError::SerializationError("Failed to deserialize person".into()))
                {
                    if person.agent_pub_key == *agent_pub_key {
                        return Ok(Some((any_dht_hash, person)));
                    }
                }
            }
        }
    }
    Ok(None)
}

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
        name: input.name.clone(),
        avatar_url: input.avatar_url,
        created_at: now,
    };

    debug!("Creating person: {}", person.name);
    let person_hash = create_entry(EntryTypes::Person(person.clone()))?;
    debug!("Person entry created with hash: {:?}", person_hash);

    // Create an anchor link for discovering all persons
    let path = Path::from("all_people");
    let anchor_hash = path.path_entry_hash()?;
    debug!("Creating link from anchor {:?} to person {:?}", anchor_hash, person_hash);
    
    create_link(
        anchor_hash.clone(),
        person_hash.clone(),
        LinkTypes::AllPeople,
        LinkTag::new("person"),
    )?;
    
    debug!("Link created successfully for person: {}", person.name);

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

// Legacy function name for test compatibility
#[hdk_extern]
pub fn store_encrypted_data(input: StoreEncryptedDataInput) -> ExternResult<StoreEncryptedDataOutput> {
    let legacy_input = StorePrivateDataInput {
        legal_name: String::from_utf8(input.encrypted_data.clone())
            .unwrap_or_else(|_| "Encrypted Data".to_string()),
        address: "Encrypted".to_string(),
        email: "encrypted@example.com".to_string(),
        phone: None,
        photo_id_hash: None,
        emergency_contact: None,
    };
    
    let result = store_private_data(legacy_input)?;
    Ok(StoreEncryptedDataOutput {
        encrypted_data_hash: result.private_data_hash,
        encrypted_data: EncryptedAgentData {
            encrypted_data: input.encrypted_data,
            encryption_method: input.encryption_method,
        },
    })
}

#[derive(Serialize, Deserialize, Debug)]
pub struct StoreEncryptedDataInput {
    pub encrypted_data: Vec<u8>,
    pub encryption_method: String,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct StoreEncryptedDataOutput {
    pub encrypted_data_hash: ActionHash,
    pub encrypted_data: EncryptedAgentData,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct EncryptedAgentData {
    pub encrypted_data: Vec<u8>,
    pub encryption_method: String,
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

    // Use helper function to find person
    if let Some((person_hash, person)) = find_person_by_agent(&agent_pub_key)? {
        profile.person = Some(person);

        // Only try to get private data if the requesting agent is the same
        let current_agent = agent_info()?;
        if current_agent.agent_initial_pubkey == agent_pub_key {
            // Try to get private data for the agent themselves
            let private_links = get_links(
                GetLinksInputBuilder::try_new(person_hash, LinkTypes::PersonToPrivateData)?
                    .build(),
            )?;

            for private_link in private_links {
                if let Ok(any_dht_hash) = AnyDhtHash::try_from(private_link.target) {
                    if let Some(record) = get(any_dht_hash, GetOptions::default())? {
                        if let Ok(Some(EntryTypes::PrivateAgentData(private_data))) =
                            record.entry().to_app_option::<EntryTypes>()
                        {
                            profile.private_data = Some(private_data);
                            break;
                        }
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

    debug!("Getting all agents - anchor hash: {:?}", anchor_hash);

    let links =
        get_links(GetLinksInputBuilder::try_new(anchor_hash, LinkTypes::AllPeople)?.build())?;

    debug!("Found {} links for all_people anchor", links.len());

    let mut agents = Vec::new();

    for link in links {
        debug!("Processing link: {:?}", link);
        if let Ok(any_dht_hash) = AnyDhtHash::try_from(link.target.clone()) {
            if let Some(record) = get(any_dht_hash.clone(), GetOptions::default())? {
                if let Ok(Some(EntryTypes::Person(person))) =
                    record.entry().to_app_option::<EntryTypes>().map_err(|_| {
                        wasm_error!(WasmErrorInner::Guest("Failed to deserialize person".into()))
                    })
                {
                    debug!("Found person: {}", person.name);
                    agents.push(person);
                } else {
                    debug!("Failed to deserialize person from record");
                }
            } else {
                debug!("No record found for hash: {:?}", any_dht_hash);
            }
        } else {
            debug!("Failed to convert link target to AnyDhtHash");
        }
    }

    debug!("Returning {} agents", agents.len());
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

/// Check if an agent has a specific role capability
/// This function can be called by other zomes for authorization
#[hdk_extern]
pub fn has_role_capability(input: (AgentPubKey, String)) -> ExternResult<bool> {
    let (agent_pub_key, required_role) = input;
    
    let roles_output = get_agent_roles(agent_pub_key)?;
    
    // Check if agent has the required role
    for role in roles_output.roles {
        if role.role_name == required_role {
            return Ok(true);
        }
    }
    
    Ok(false)
}

/// Get agent capability level for cross-zome authorization
#[hdk_extern] 
pub fn get_agent_capability_level(agent_pub_key: AgentPubKey) -> ExternResult<String> {
    let roles_output = get_agent_roles(agent_pub_key)?;
    
    // Determine capability level based on roles
    let mut has_accountable_role = false;
    let mut has_primary_role = false;
    
    for role in roles_output.roles {
        match role.role_name.as_str() {
            "Community Steward" | "Resource Coordinator" | "Community Advocate" => {
                has_accountable_role = true;
            }
            "Primary Accountable Agent" | "Community Founder" => {
                has_primary_role = true;
            }
            _ => {}
        }
    }
    
    if has_primary_role {
        Ok("primary_accountable".to_string())
    } else if has_accountable_role {
        Ok("accountable".to_string())
    } else {
        Ok("simple".to_string())
    }
}
