use crate::ResourceError;
use hdk::prelude::*;
use zome_resource_integrity::*;

#[derive(Debug, Serialize, Deserialize)]
pub struct EconomicResourceInput {
    pub spec_hash: ActionHash,
    pub quantity: f64,
    pub unit: String,
    pub current_location: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateEconomicResourceOutput {
    pub resource_hash: ActionHash,
    pub resource: EconomicResource,
}

#[hdk_extern]
pub fn create_economic_resource(
    input: EconomicResourceInput,
) -> ExternResult<CreateEconomicResourceOutput> {
    let agent_info = agent_info()?;
    let now = sys_time()?;

    // Validate input
    if input.quantity <= 0.0 {
        return Err(ResourceError::InvalidInput("Quantity must be positive".to_string()).into());
    }

    if input.unit.trim().is_empty() {
        return Err(ResourceError::InvalidInput("Unit cannot be empty".to_string()).into());
    }

    // Validate that the specification exists
    let _spec_record = get(input.spec_hash.clone(), GetOptions::default())?.ok_or(
        ResourceError::ResourceSpecNotFound("ResourceSpecification not found".to_string()),
    )?;

    let resource = EconomicResource {
        conforms_to: input.spec_hash.clone(),
        quantity: input.quantity,
        unit: input.unit,
        custodian: agent_info.agent_initial_pubkey.clone(),
        created_by: agent_info.agent_initial_pubkey.clone(),
        created_at: now,
        current_location: input.current_location,
        state: ResourceState::PendingValidation, // New resources start in pending validation state
    };

    let resource_hash = create_entry(&EntryTypes::EconomicResource(resource.clone()))?;

    // Create discovery links
    let path = Path::from("economic_resources");
    create_link(
        path.path_entry_hash()?,
        resource_hash.clone(),
        LinkTypes::AllEconomicResources,
        (),
    )?;

    // Link resource to its specification
    create_link(
        input.spec_hash,
        resource_hash.clone(),
        LinkTypes::SpecificationToResource,
        (),
    )?;

    // Link custodian to resource
    create_link(
        agent_info.agent_initial_pubkey.clone(),
        resource_hash.clone(),
        LinkTypes::CustodianToResource,
        (),
    )?;

    Ok(CreateEconomicResourceOutput {
        resource_hash,
        resource,
    })
}

#[hdk_extern]
pub fn get_latest_economic_resource_record(
    original_action_hash: ActionHash,
) -> ExternResult<Option<Record>> {
    let links = get_links(
        GetLinksInputBuilder::try_new(
            original_action_hash.clone(),
            LinkTypes::EconomicResourceUpdates,
        )?
        .build(),
    )?;
    let latest_link = links
        .into_iter()
        .max_by(|link_a, link_b| link_a.timestamp.cmp(&link_b.timestamp));
    let latest_resource_hash =
        match latest_link {
            Some(link) => link.target.clone().into_action_hash().ok_or(
                ResourceError::EntryOperationFailed("Invalid action hash in link".to_string()),
            )?,
            None => original_action_hash.clone(),
        };
    get(latest_resource_hash, GetOptions::default())
}

#[hdk_extern]
pub fn get_latest_economic_resource(
    original_action_hash: ActionHash,
) -> ExternResult<EconomicResource> {
    let record = get_latest_economic_resource_record(original_action_hash)?.ok_or(
        ResourceError::EconomicResourceNotFound("Economic resource record not found".to_string()),
    )?;

    record
        .entry()
        .to_app_option()
        .map_err(|e| {
            ResourceError::SerializationError(format!(
                "Failed to deserialize economic resource: {:?}",
                e
            ))
        })?
        .ok_or(
            ResourceError::EconomicResourceNotFound(
                "Economic resource entry not found".to_string(),
            )
            .into(),
        )
}

#[derive(Serialize, Deserialize, Debug)]
pub struct UpdateEconomicResourceInput {
    pub original_action_hash: ActionHash,
    pub previous_action_hash: ActionHash,
    pub updated_resource: EconomicResourceInput,
}

#[hdk_extern]
pub fn update_economic_resource(input: UpdateEconomicResourceInput) -> ExternResult<Record> {
    let original_record = must_get_valid_record(input.original_action_hash.clone())?;

    // Get the original resource to check custodian
    let original_resource: EconomicResource = original_record
        .entry()
        .to_app_option()
        .map_err(|e| ResourceError::SerializationError(format!("Failed to deserialize: {:?}", e)))?
        .ok_or(ResourceError::EconomicResourceNotFound(
            "Original resource not found".to_string(),
        ))?;

    // Verify the agent is the custodian
    let agent_pubkey = agent_info()?.agent_initial_pubkey;
    if original_resource.custodian != agent_pubkey {
        return Err(ResourceError::NotCustodian.into());
    }

    // Validate input
    if input.updated_resource.quantity <= 0.0 {
        return Err(ResourceError::InvalidInput("Quantity must be positive".to_string()).into());
    }

    if input.updated_resource.unit.trim().is_empty() {
        return Err(ResourceError::InvalidInput("Unit cannot be empty".to_string()).into());
    }

    let updated_resource = EconomicResource {
        conforms_to: input.updated_resource.spec_hash,
        quantity: input.updated_resource.quantity,
        unit: input.updated_resource.unit,
        custodian: original_resource.custodian, // Keep the same custodian
        created_by: original_resource.created_by, // Keep original creator
        created_at: original_resource.created_at, // Keep original creation time
        current_location: input.updated_resource.current_location,
        state: original_resource.state, // Keep the same state unless explicitly changed
    };

    let updated_resource_hash = update_entry(input.previous_action_hash, &updated_resource)?;

    create_link(
        input.original_action_hash,
        updated_resource_hash.clone(),
        LinkTypes::EconomicResourceUpdates,
        (),
    )?;

    let record = get(updated_resource_hash, GetOptions::default())?.ok_or(
        ResourceError::EntryOperationFailed(
            "Failed to retrieve updated economic resource".to_string(),
        ),
    )?;

    Ok(record)
}

#[derive(Serialize, Deserialize, Debug)]
pub struct GetAllEconomicResourcesOutput {
    pub resources: Vec<EconomicResource>,
}

#[hdk_extern]
pub fn get_all_economic_resources(_: ()) -> ExternResult<GetAllEconomicResourcesOutput> {
    let path = Path::from("economic_resources");
    let links = get_links(
        GetLinksInputBuilder::try_new(path.path_entry_hash()?, LinkTypes::AllEconomicResources)?
            .build(),
    )?;

    let mut resources = Vec::new();

    for link in links {
        if let Some(action_hash) = link.target.into_action_hash() {
            if let Some(record) = get(action_hash, GetOptions::default())? {
                if let Ok(Some(resource)) = record.entry().to_app_option::<EconomicResource>() {
                    resources.push(resource);
                }
            }
        }
    }

    Ok(GetAllEconomicResourcesOutput { resources })
}

#[derive(Serialize, Deserialize, Debug)]
pub struct EconomicResourceProfileOutput {
    pub resource: Option<EconomicResource>,
}

#[hdk_extern]
pub fn get_economic_resource_profile(
    action_hash: ActionHash,
) -> ExternResult<EconomicResourceProfileOutput> {
    if let Ok(resource) = get_latest_economic_resource(action_hash) {
        return Ok(EconomicResourceProfileOutput {
            resource: Some(resource),
        });
    }

    Ok(EconomicResourceProfileOutput { resource: None })
}

#[hdk_extern]
pub fn get_resources_by_specification(spec_hash: ActionHash) -> ExternResult<Vec<Record>> {
    let links = get_links(
        GetLinksInputBuilder::try_new(spec_hash, LinkTypes::SpecificationToResource)?.build(),
    )?;

    let get_input: Vec<GetInput> = links
        .into_iter()
        .map(|link| {
            GetInput::new(
                link.target
                    .clone()
                    .into_any_dht_hash()
                    .expect("Failed to convert link target"),
                GetOptions::default(),
            )
        })
        .collect();
    let records = HDK.with(|hdk| hdk.borrow().get(get_input))?;
    let records: Vec<Record> = records.into_iter().flatten().collect();
    Ok(records)
}

#[hdk_extern]
pub fn get_my_economic_resources(_: ()) -> ExternResult<Vec<Link>> {
    let agent_info = agent_info()?;
    get_links(
        GetLinksInputBuilder::try_new(
            agent_info.agent_initial_pubkey,
            LinkTypes::CustodianToResource,
        )?
        .build(),
    )
}

#[hdk_extern]
pub fn get_agent_economic_resources(agent_pubkey: AgentPubKey) -> ExternResult<Vec<Link>> {
    get_links(GetLinksInputBuilder::try_new(agent_pubkey, LinkTypes::CustodianToResource)?.build())
}

#[hdk_extern]
pub fn check_first_resource_requirement(agent_pub_key: AgentPubKey) -> ExternResult<bool> {
    let links = get_links(
        GetLinksInputBuilder::try_new(agent_pub_key, LinkTypes::CustodianToResource)?.build(),
    )?;

    // Agent has created at least one resource if they have any custodian links
    Ok(!links.is_empty())
}

#[derive(Serialize, Deserialize, Debug)]
pub struct TransferCustodyInput {
    pub resource_hash: ActionHash,
    pub new_custodian: AgentPubKey,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct TransferCustodyOutput {
    pub updated_resource_hash: ActionHash,
    pub updated_resource: EconomicResource,
}

#[hdk_extern]
pub fn transfer_custody(input: TransferCustodyInput) -> ExternResult<TransferCustodyOutput> {
    let agent_info = agent_info()?;

    // Get the current resource
    let resource_record = get(input.resource_hash.clone(), GetOptions::default())?.ok_or(
        ResourceError::EconomicResourceNotFound("EconomicResource not found".to_string()),
    )?;

    let mut resource: EconomicResource = resource_record
        .entry()
        .to_app_option()
        .map_err(|e| ResourceError::SerializationError(format!("Failed to deserialize: {:?}", e)))?
        .ok_or(ResourceError::EconomicResourceNotFound(
            "Invalid EconomicResource entry".to_string(),
        ))?;

    // Verify the calling agent is the current custodian
    if resource.custodian != agent_info.agent_initial_pubkey {
        return Err(ResourceError::NotCustodian.into());
    }

    // TODO: In Phase 2, check governance rules and validate with zome_governance
    // TODO: In Phase 2, check that the calling agent has restricted_access capability

    // Update the custodian
    resource.custodian = input.new_custodian.clone();

    // Create updated resource entry
    let updated_resource_hash = update_entry(
        input.resource_hash.clone(),
        &EntryTypes::EconomicResource(resource.clone()),
    )?;

    // Remove old custodian link
    let old_links = get_links(
        GetLinksInputBuilder::try_new(
            agent_info.agent_initial_pubkey.clone(),
            LinkTypes::CustodianToResource,
        )?
        .build(),
    )?;
    for link in old_links {
        let link_target_hash: Result<ActionHash, _> = link.target.clone().try_into();
        if let Ok(target_hash) = link_target_hash {
            if target_hash == input.resource_hash {
                delete_link(link.create_link_hash)?;
                break;
            }
        }
    }

    // Create new custodian link
    create_link(
        input.new_custodian.clone(),
        updated_resource_hash.clone(),
        LinkTypes::CustodianToResource,
        (),
    )?;

    Ok(TransferCustodyOutput {
        updated_resource_hash,
        updated_resource: resource,
    })
}

#[derive(Serialize, Deserialize, Debug)]
pub struct UpdateResourceStateInput {
    pub resource_hash: ActionHash,
    pub new_state: ResourceState,
}

#[hdk_extern]
pub fn update_resource_state(input: UpdateResourceStateInput) -> ExternResult<Record> {
    let agent_info = agent_info()?;

    // Get the current resource
    let resource_record = get(input.resource_hash.clone(), GetOptions::default())?.ok_or(
        ResourceError::EconomicResourceNotFound("EconomicResource not found".to_string()),
    )?;

    let mut resource: EconomicResource = resource_record
        .entry()
        .to_app_option()
        .map_err(|e| ResourceError::SerializationError(format!("Failed to deserialize: {:?}", e)))?
        .ok_or(ResourceError::EconomicResourceNotFound(
            "Invalid EconomicResource entry".to_string(),
        ))?;

    // Verify the calling agent is the current custodian
    if resource.custodian != agent_info.agent_initial_pubkey {
        return Err(ResourceError::NotCustodian.into());
    }

    // Update the state
    resource.state = input.new_state;

    // Create updated resource entry
    let updated_resource_hash = update_entry(
        input.resource_hash.clone(),
        &EntryTypes::EconomicResource(resource.clone()),
    )?;

    let record = get(updated_resource_hash, GetOptions::default())?.ok_or(
        ResourceError::EntryOperationFailed("Failed to retrieve updated resource".to_string()),
    )?;

    Ok(record)
}
