use hdk::prelude::*;
use zome_resource_integrity::*;

#[hdk_extern]
pub fn init(_: ()) -> ExternResult<InitCallbackResult> {
    Ok(InitCallbackResult::Pass)
}

#[derive(Serialize, Deserialize, Debug)]
pub struct CreateResourceSpecInput {
    pub name: String,
    pub description: String,
    pub image_url: Option<String>,
    pub governance_rules: Vec<GovernanceRuleInput>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct GovernanceRuleInput {
    pub rule_type: String,
    pub rule_data: String,
    pub enforced_by: Option<String>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct CreateResourceSpecOutput {
    pub spec_hash: ActionHash,
    pub spec: ResourceSpecification,
    pub governance_rule_hashes: Vec<ActionHash>,
}

#[hdk_extern]
pub fn create_resource_spec(
    input: CreateResourceSpecInput,
) -> ExternResult<CreateResourceSpecOutput> {
    let agent_info = agent_info()?;
    let now = sys_time()?;

    // TODO: In Phase 2, check that the calling agent is an Accountable Agent

    // First create all governance rules
    let mut governance_rule_hashes = Vec::new();

    for rule_input in input.governance_rules {
        let rule = GovernanceRule {
            rule_type: rule_input.rule_type,
            rule_data: rule_input.rule_data,
            enforced_by: rule_input.enforced_by,
            created_by: agent_info.agent_initial_pubkey.clone(),
            created_at: now,
        };

        let rule_hash = create_entry(&EntryTypes::GovernanceRule(rule))?;
        governance_rule_hashes.push(rule_hash);
    }

    // Create the resource specification
    let spec = ResourceSpecification {
        name: input.name,
        description: input.description,
        image_url: input.image_url,
        governance_rules: governance_rule_hashes.clone(),
        created_by: agent_info.agent_initial_pubkey,
        created_at: now,
    };

    let spec_hash = create_entry(&EntryTypes::ResourceSpecification(spec.clone()))?;

    // Create discovery link
    let path = Path::from("all_resource_specifications");
    let anchor_hash = path.path_entry_hash()?;
    create_link(
        anchor_hash,
        spec_hash.clone(),
        LinkTypes::AllResourceSpecifications,
        (),
    )?;

    // Link governance rules to the specification
    for rule_hash in &governance_rule_hashes {
        create_link(
            spec_hash.clone(),
            rule_hash.clone(),
            LinkTypes::SpecificationToGovernanceRule,
            (),
        )?;
    }

    Ok(CreateResourceSpecOutput {
        spec_hash,
        spec,
        governance_rule_hashes,
    })
}

#[derive(Serialize, Deserialize, Debug)]
pub struct CreateEconomicResourceInput {
    pub spec_hash: ActionHash,
    pub quantity: f64,
    pub unit: String,
    pub current_location: Option<String>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct CreateEconomicResourceOutput {
    pub resource_hash: ActionHash,
    pub resource: EconomicResource,
}

#[hdk_extern]
pub fn create_economic_resource(
    input: CreateEconomicResourceInput,
) -> ExternResult<CreateEconomicResourceOutput> {
    let agent_info = agent_info()?;
    let now = sys_time()?;

    // Validate that the specification exists
    let _spec_record = get(input.spec_hash.clone(), GetOptions::default())?.ok_or_else(|| {
        wasm_error!(WasmErrorInner::Guest(
            "ResourceSpecification not found".to_string()
        ))
    })?;

    let resource = EconomicResource {
        conforms_to: input.spec_hash.clone(),
        quantity: input.quantity,
        unit: input.unit,
        custodian: agent_info.agent_initial_pubkey.clone(),
        created_by: agent_info.agent_initial_pubkey.clone(),
        created_at: now,
        current_location: input.current_location,
        state: "pending_validation".to_string(), // New resources start in pending validation state
    };

    let resource_hash = create_entry(&EntryTypes::EconomicResource(resource.clone()))?;

    // Create discovery link
    let path = Path::from("all_economic_resources");
    let anchor_hash = path.path_entry_hash()?;
    create_link(
        anchor_hash,
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
    let custodian_path = Path::from(format!("custodian_{}", agent_info.agent_initial_pubkey));
    let custodian_anchor = custodian_path.path_entry_hash()?;
    create_link(
        custodian_anchor,
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
pub fn get_all_resource_specs(_: ()) -> ExternResult<Vec<(ActionHash, ResourceSpecification)>> {
    let path = Path::from("all_resource_specifications");
    let anchor_hash = path.path_entry_hash()?;

    let links = get_links(GetLinksInput::new(
        anchor_hash.into(),
        LinkTypes::AllResourceSpecifications,
        None,
    ))?;
    let mut specs = Vec::new();

    for link in links {
        if let Some(record) = get(link.target.clone().into(), GetOptions::default())? {
            if let Ok(Some(EntryTypes::ResourceSpecification(spec))) =
                record.entry().to_app_option()
            {
                let action_hash: ActionHash = link.target.try_into().map_err(|_| {
                    wasm_error!(WasmErrorInner::Guest("Hash conversion failed".to_string()))
                })?;
                specs.push((action_hash, spec));
            }
        }
    }

    Ok(specs)
}

#[hdk_extern]
pub fn get_resources_by_spec(
    spec_hash: ActionHash,
) -> ExternResult<Vec<(ActionHash, EconomicResource)>> {
    let links = get_links(GetLinksInput::new(
        spec_hash.into(),
        LinkTypes::SpecificationToResource,
        None,
    ))?;
    let mut resources = Vec::new();

    for link in links {
        if let Some(record) = get(link.target.clone().into(), GetOptions::default())? {
            if let Ok(Some(EntryTypes::EconomicResource(resource))) = record.entry().to_app_option()
            {
                let action_hash: ActionHash = link.target.try_into().map_err(|_| {
                    wasm_error!(WasmErrorInner::Guest("Hash conversion failed".to_string()))
                })?;
                resources.push((action_hash, resource));
            }
        }
    }

    Ok(resources)
}

#[hdk_extern]
pub fn get_my_resources(_: ()) -> ExternResult<Vec<(ActionHash, EconomicResource)>> {
    let agent_info = agent_info()?;
    let custodian_path = Path::from(format!("custodian_{}", agent_info.agent_initial_pubkey));
    let custodian_anchor = custodian_path.path_entry_hash()?;

    let links = get_links(GetLinksInput::new(
        custodian_anchor.into(),
        LinkTypes::CustodianToResource,
        None,
    ))?;
    let mut resources = Vec::new();

    for link in links {
        if let Some(record) = get(link.target.clone().into(), GetOptions::default())? {
            if let Ok(Some(EntryTypes::EconomicResource(resource))) = record.entry().to_app_option()
            {
                let action_hash: ActionHash = link.target.try_into().map_err(|_| {
                    wasm_error!(WasmErrorInner::Guest("Hash conversion failed".to_string()))
                })?;
                resources.push((action_hash, resource));
            }
        }
    }

    Ok(resources)
}

#[hdk_extern]
pub fn check_first_resource_requirement(agent_pub_key: AgentPubKey) -> ExternResult<bool> {
    let custodian_path = Path::from(format!("custodian_{}", agent_pub_key));
    let custodian_anchor = custodian_path.path_entry_hash()?;

    let links = get_links(GetLinksInput::new(
        custodian_anchor.into(),
        LinkTypes::CustodianToResource,
        None,
    ))?;

    // Agent has created at least one resource if they have any custodian links
    Ok(!links.is_empty())
}

#[derive(Serialize, Deserialize, Debug)]
pub struct GetResourceSpecWithRulesOutput {
    pub spec: ResourceSpecification,
    pub governance_rules: Vec<GovernanceRule>,
}

#[hdk_extern]
pub fn get_resource_spec_with_rules(
    spec_hash: ActionHash,
) -> ExternResult<GetResourceSpecWithRulesOutput> {
    // Get the specification
    let spec_record = get(spec_hash.clone(), GetOptions::default())?.ok_or_else(|| {
        wasm_error!(WasmErrorInner::Guest(
            "ResourceSpecification not found".to_string()
        ))
    })?;

    let spec = match spec_record.entry().to_app_option() {
        Ok(Some(EntryTypes::ResourceSpecification(s))) => s,
        _ => {
            return Err(wasm_error!(WasmErrorInner::Guest(
                "Invalid ResourceSpecification entry".to_string()
            )))
        }
    };

    // Get the governance rules
    let rule_links = get_links(GetLinksInput::new(
        spec_hash.into(),
        LinkTypes::SpecificationToGovernanceRule,
        None,
    ))?;
    let mut governance_rules = Vec::new();

    for rule_link in rule_links {
        if let Some(rule_record) = get(rule_link.target.into(), GetOptions::default())? {
            if let Ok(Some(EntryTypes::GovernanceRule(rule))) = rule_record.entry().to_app_option()
            {
                governance_rules.push(rule);
            }
        }
    }

    Ok(GetResourceSpecWithRulesOutput {
        spec,
        governance_rules,
    })
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
    let resource_record =
        get(input.resource_hash.clone(), GetOptions::default())?.ok_or_else(|| {
            wasm_error!(WasmErrorInner::Guest(
                "EconomicResource not found".to_string()
            ))
        })?;

    let mut resource = match resource_record.entry().to_app_option() {
        Ok(Some(EntryTypes::EconomicResource(r))) => r,
        _ => {
            return Err(wasm_error!(WasmErrorInner::Guest(
                "Invalid EconomicResource entry".to_string()
            )))
        }
    };

    // Verify the calling agent is the current custodian
    if resource.custodian != agent_info.agent_initial_pubkey {
        return Err(wasm_error!(WasmErrorInner::Guest(
            "Only the current custodian can transfer custody".to_string()
        )));
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
    let old_custodian_path = Path::from(format!("custodian_{}", agent_info.agent_initial_pubkey));
    let old_custodian_anchor = old_custodian_path.path_entry_hash()?;

    // Find and delete the old link
    let old_links = get_links(GetLinksInput::new(
        old_custodian_anchor.into(),
        LinkTypes::CustodianToResource,
        None,
    ))?;
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
    let new_custodian_path = Path::from(format!("custodian_{}", input.new_custodian));
    let new_custodian_anchor = new_custodian_path.path_entry_hash()?;
    create_link(
        new_custodian_anchor,
        updated_resource_hash.clone(),
        LinkTypes::CustodianToResource,
        (),
    )?;

    Ok(TransferCustodyOutput {
        updated_resource_hash,
        updated_resource: resource,
    })
}

#[hdk_extern]
pub fn post_commit(committed_actions: Vec<SignedActionHashed>) -> ExternResult<()> {
    // Handle any post-commit logic for resource-related actions
    for action in committed_actions {
        if let Action::Create(create_action) = action.action() {
            // Could emit signals here for real-time updates
            let _entry_type = create_action.entry_type.clone();
            // TODO: Implement signaling for new resource creation, transfers, etc.
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
