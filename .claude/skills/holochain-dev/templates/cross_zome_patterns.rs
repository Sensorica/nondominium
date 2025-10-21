//! Cross-Zome Communication Patterns
//! Reference examples for coordinator-to-coordinator zome communication

use hdk::prelude::*;
use serde_json::Value;

/// Example: Call person zome to get profile information
pub fn get_person_profile(agent_pub_key: AgentPubKey) -> ExternResult<Option<Value>> {
    let response = call(
        None, // target DNA (local DNA)
        "person", // target coordinator zome
        "get_person_profile", // target function
        None, // cap grant
        agent_pub_key, // parameters
    )?;

    match response {
        ZomeCallResponse::Ok(result) => {
            let profile: Option<Value> = serde_json::from_str(&result)
                .map_err(|e| WasmError::Guest(format!("Failed to parse response: {:?}", e)))?;
            Ok(profile)
        },
        ZomeCallResponse::NetworkError(err) => {
            Err(WasmError::Guest(format!("Network error calling person zome: {:?}", err)))
        },
        ZomeCallResponse::CountersigningSession(_, _) => {
            Err(WasmError::Guest("Unexpected countersigning response".to_string()))
        },
    }
}

/// Example: Call resource zome to validate resource access
pub fn validate_resource_access(
    agent_pub_key: AgentPubKey,
    resource_hash: ActionHash,
) -> ExternResult<bool> {
    let response = call(
        None,
        "resource",
        "check_agent_can_access_resource",
        None,
        (agent_pub_key, resource_hash),
    )?;

    match response {
        ZomeCallResponse::Ok(result) => {
            let can_access: bool = serde_json::from_str(&result)
                .map_err(|e| WasmError::Guest(format!("Failed to parse response: {:?}", e)))?;
            Ok(can_access)
        },
        ZomeCallResponse::NetworkError(err) => {
            Err(WasmError::Guest(format!("Network error calling resource zome: {:?}", err)))
        },
        ZomeCallResponse::CountersigningSession(_, _) => {
            Err(WasmError::Guest("Unexpected countersigning response".to_string()))
        },
    }
}

/// Example: Call governance zome to create a commitment
pub fn create_governance_commitment(
    resource_hash: ActionHash,
    commitment_type: String,
    agent_pub_key: AgentPubKey,
) -> ExternResult<ActionHash> {
    let response = call(
        None,
        "gouvernance",
        "create_commitment",
        None,
        (resource_hash, commitment_type, agent_pub_key),
    )?;

    match response {
        ZomeCallResponse::Ok(result) => {
            let commitment_hash: ActionHash = serde_json::from_str(&result)
                .map_err(|e| WasmError::Guest(format!("Failed to parse response: {:?}", e)))?;
            Ok(commitment_hash)
        },
        ZomeCallResponse::NetworkError(err) => {
            Err(WasmError::Guest(format!("Network error calling governance zome: {:?}", err)))
        },
        ZomeCallResponse::CountersigningSession(_, _) => {
            Err(WasmError::Guest("Unexpected countersigning response".to_string()))
        },
    }
}

/// Example: Complex workflow with multiple zome calls
pub fn transfer_resource_with_governance(
    resource_hash: ActionHash,
    from_agent: AgentPubKey,
    to_agent: AgentPubKey,
    transfer_details: Value,
) -> ExternResult<()> {
    // Step 1: Check if from_agent can transfer the resource
    let can_transfer = validate_resource_access(from_agent, resource_hash)?;
    if !can_transfer {
        return Err(WasmError::Guest("Agent does not have permission to transfer resource".to_string()));
    }

    // Step 2: Check if to_agent can receive the resource
    let can_receive = validate_resource_access(to_agent, resource_hash)?;
    if !can_receive {
        return Err(WasmError::Guest("Target agent cannot receive this resource".to_string()));
    }

    // Step 3: Create governance commitment for the transfer
    let commitment_hash = create_governance_commitment(
        resource_hash,
        "transfer".to_string(),
        from_agent,
    )?;

    // Step 4: Get profiles to verify agent identities
    let from_profile = get_person_profile(from_agent)?;
    let to_profile = get_person_profile(to_agent)?;

    if from_profile.is_none() || to_profile.is_none() {
        return Err(WasmError::Guest("Invalid agent profiles".to_string()));
    }

    // Step 5: Execute the actual resource transfer
    let transfer_response = call(
        None,
        "resource",
        "transfer_resource",
        None,
        (resource_hash, from_agent, to_agent, transfer_details, commitment_hash),
    )?;

    match transfer_response {
        ZomeCallResponse::Ok(_) => Ok(()),
        ZomeCallResponse::NetworkError(err) => {
            Err(WasmError::Guest(format!("Network error during resource transfer: {:?}", err)))
        },
        ZomeCallResponse::CountersigningSession(_, _) => {
            Err(WasmError::Guest("Unexpected countersigning response".to_string()))
        },
    }
}

/// Example: Batch operation with multiple zome calls
pub fn create_agent_with_resources_and_capabilities(
    agent_profile: Value,
    resources: Vec<Value>,
    capabilities: Vec<String>,
) -> ExternResult<Vec<ActionHash>> {
    let mut results = Vec::new();

    // Step 1: Create person profile
    let person_response = call(
        None,
        "person",
        "create_person",
        None,
        agent_profile,
    )?;

    let person_hash: ActionHash = match person_response {
        ZomeCallResponse::Ok(result) => {
            serde_json::from_str(&result)
                .map_err(|e| WasmError::Guest(format!("Failed to parse person response: {:?}", e)))?
        },
        _ => return Err(WasmError::Guest("Failed to create person".to_string())),
    };

    results.push(person_hash);

    // Step 2: Create resources
    for resource in resources {
        let resource_response = call(
            None,
            "resource",
            "create_resource",
            None,
            resource,
        )?;

        match resource_response {
            ZomeCallResponse::Ok(result) => {
                let resource_hash: ActionHash = serde_json::from_str(&result)
                    .map_err(|e| WasmError::Guest(format!("Failed to parse resource response: {:?}", e)))?;
                results.push(resource_hash);
            },
            _ => return Err(WasmError::Guest("Failed to create resource".to_string())),
        }
    }

    // Step 3: Assign capabilities
    let capability_response = call(
        None,
        "person",
        "assign_capabilities",
        None,
        (person_hash, capabilities),
    )?;

    match capability_response {
        ZomeCallResponse::Ok(_) => Ok(results),
        _ => Err(WasmError::Guest("Failed to assign capabilities".to_string())),
    }
}

/// Example: Error handling and retry logic
pub fn call_with_retry<T: serde::de::DeserializeOwned>(
    zome_name: &str,
    function_name: &str,
    params: impl serde::Serialize,
    max_retries: u32,
) -> ExternResult<T> {
    let mut retries = 0;

    loop {
        let response = call(
            None,
            zome_name,
            function_name,
            None,
            params,
        )?;

        match response {
            ZomeCallResponse::Ok(result) => {
                let parsed: T = serde_json::from_str(&result)
                    .map_err(|e| WasmError::Guest(format!("Failed to parse response: {:?}", e)))?;
                return Ok(parsed);
            },
            ZomeCallResponse::NetworkError(err) => {
                retries += 1;
                if retries >= max_retries {
                    return Err(WasmError::Guest(format!("Network error after {} retries: {:?}", max_retries, err)));
                }
                // In a real implementation, you might want to add a delay here
                continue;
            },
            ZomeCallResponse::CountersigningSession(_, _) => {
                return Err(WasmError::Guest("Unexpected countersigning response".to_string()));
            },
        }
    }
}
