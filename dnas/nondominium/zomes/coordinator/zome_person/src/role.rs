use hdk::prelude::*;
use zome_person_integrity::*;
use crate::PersonError;

#[derive(Debug, Serialize, Deserialize)]
pub struct PersonRoleInput {
    pub agent_pubkey: AgentPubKey,
    pub role_name: String,
    pub description: Option<String>,
}

#[hdk_extern]
pub fn assign_person_role(input: PersonRoleInput) -> ExternResult<Record> {
    let agent_info = agent_info()?;
    
    let role = PersonRole {
        role_name: input.role_name,
        description: input.description,
        assigned_to: input.agent_pubkey.clone(),
        assigned_by: agent_info.agent_initial_pubkey,
        assigned_at: sys_time()?,
    };

    let role_hash = create_entry(&EntryTypes::PersonRole(role.clone()))?;
    let record = get(role_hash.clone(), GetOptions::default())?
        .ok_or(PersonError::EntryOperationFailed("Failed to retrieve created role".to_string()))?;

    // Link from person to role
    let person_links = get_links(
        GetLinksInputBuilder::try_new(input.agent_pubkey, LinkTypes::AgentToPerson)?.build(),
    )?;

    if let Some(person_link) = person_links.first() {
        create_link(
            person_link.target.clone(),
            role_hash,
            LinkTypes::PersonToRoles,
            (),
        )?;
    }

    Ok(record)
}

#[hdk_extern]
pub fn get_latest_person_role_record(original_action_hash: ActionHash) -> ExternResult<Option<Record>> {
    let links = get_links(
        GetLinksInputBuilder::try_new(original_action_hash.clone(), LinkTypes::RoleUpdates)?.build(),
    )?;
    let latest_link = links
        .into_iter()
        .max_by(|link_a, link_b| link_a.timestamp.cmp(&link_b.timestamp));
    let latest_role_hash = match latest_link {
        Some(link) => link
            .target
            .clone()
            .into_action_hash()
            .ok_or(PersonError::EntryOperationFailed("Invalid action hash in link".to_string()))?,
        None => original_action_hash.clone(),
    };
    get(latest_role_hash, GetOptions::default())
}

#[hdk_extern]
pub fn get_latest_person_role(original_action_hash: ActionHash) -> ExternResult<PersonRole> {
    let record = get_latest_person_role_record(original_action_hash)?
        .ok_or(PersonError::RoleNotFound("Role record not found".to_string()))?;

    record
        .entry()
        .to_app_option()
        .map_err(|e| PersonError::SerializationError(format!("Failed to deserialize role: {:?}", e)))?
        .ok_or(PersonError::RoleNotFound("Role entry not found".to_string()).into())
}

#[derive(Serialize, Deserialize, Debug)]
pub struct UpdatePersonRoleInput {
    pub original_action_hash: ActionHash,
    pub previous_action_hash: ActionHash,
    pub updated_role: PersonRoleInput,
}

#[hdk_extern]
pub fn update_person_role(input: UpdatePersonRoleInput) -> ExternResult<Record> {
    let original_record = must_get_valid_record(input.original_action_hash.clone())?;
    
    // Verify the author - only the original assigner can update
    let author = original_record.action().author().clone();
    if author != agent_info()?.agent_initial_pubkey {
        return Err(PersonError::NotAuthor.into());
    }

    let updated_role = PersonRole {
        role_name: input.updated_role.role_name,
        description: input.updated_role.description,
        assigned_to: input.updated_role.agent_pubkey,
        assigned_by: agent_info()?.agent_initial_pubkey,
        assigned_at: sys_time()?,
    };

    let updated_role_hash = update_entry(input.previous_action_hash, &updated_role)?;

    create_link(
        input.original_action_hash,
        updated_role_hash.clone(),
        LinkTypes::RoleUpdates,
        (),
    )?;

    let record = get(updated_role_hash, GetOptions::default())?
        .ok_or(PersonError::EntryOperationFailed("Failed to retrieve updated role".to_string()))?;
    
    Ok(record)
}

#[derive(Serialize, Deserialize, Debug)]
pub struct GetPersonRolesOutput {
    pub roles: Vec<PersonRole>,
}

#[hdk_extern]
pub fn get_person_roles(agent_pubkey: AgentPubKey) -> ExternResult<GetPersonRolesOutput> {
    let person_links = get_links(
        GetLinksInputBuilder::try_new(agent_pubkey, LinkTypes::AgentToPerson)?.build(),
    )?;

    let mut roles = Vec::new();

    if let Some(person_link) = person_links.first() {
        let role_links = get_links(
            GetLinksInputBuilder::try_new(person_link.target.clone(), LinkTypes::PersonToRoles)?.build(),
        )?;

        for role_link in role_links {
            if let Some(action_hash) = role_link.target.into_action_hash() {
                if let Ok(role) = get_latest_person_role(action_hash) {
                    roles.push(role);
                }
            }
        }
    }

    Ok(GetPersonRolesOutput { roles })
}

#[hdk_extern]
pub fn get_my_person_roles(_: ()) -> ExternResult<GetPersonRolesOutput> {
    let agent_info = agent_info()?;
    get_person_roles(agent_info.agent_initial_pubkey)
}

/// Check if an agent has a specific role capability
#[hdk_extern]
pub fn has_person_role_capability(input: (AgentPubKey, String)) -> ExternResult<bool> {
    let (agent_pubkey, required_role) = input;
    
    let roles_output = get_person_roles(agent_pubkey)?;
    
    for role in roles_output.roles {
        if role.role_name == required_role {
            return Ok(true);
        }
    }
    
    Ok(false)
}

/// Get agent capability level based on their roles
#[hdk_extern] 
pub fn get_person_capability_level(agent_pubkey: AgentPubKey) -> ExternResult<String> {
    let roles_output = get_person_roles(agent_pubkey)?;
    
    let mut has_governance_role = false;
    let mut has_coordination_role = false;
    let mut has_stewardship_role = false;
    
    for role in roles_output.roles {
        match role.role_name.as_str() {
            "Community Founder" | "Governance Coordinator" => {
                has_governance_role = true;
            }
            "Community Coordinator" | "Resource Coordinator" | "Community Moderator" => {
                has_coordination_role = true;
            }
            "Community Advocate" | "Resource Steward" => {
                has_stewardship_role = true;
            }
            _ => {}
        }
    }
    
    if has_governance_role {
        Ok("governance".to_string())
    } else if has_coordination_role {
        Ok("coordination".to_string())
    } else if has_stewardship_role {
        Ok("stewardship".to_string())
    } else {
        Ok("member".to_string())
    }
}