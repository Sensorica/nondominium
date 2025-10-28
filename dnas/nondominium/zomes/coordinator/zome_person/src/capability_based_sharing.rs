use hdk::prelude::*;
use zome_person_integrity::*;
use std::collections::BTreeSet;
use std::str::FromStr;

// ============================================================================
// CAPABILITY-BASED PRIVATE DATA SHARING
// ============================================================================

/// Grant private data access using Holochain's native capability system
#[derive(Debug, Serialize, Deserialize)]
pub struct GrantPrivateDataAccessInput {
    pub agent_to_grant: AgentPubKey,
    pub fields_allowed: Vec<String>,
    pub context: String,
    pub expires_in_days: Option<u32>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GrantPrivateDataAccessOutput {
    pub grant_hash: ActionHash,
    pub cap_secret: CapSecret,
    pub expires_at: Timestamp,
}

/// Create a capability grant for private data access
#[hdk_extern]
pub fn grant_private_data_access(input: GrantPrivateDataAccessInput) -> ExternResult<GrantPrivateDataAccessOutput> {
    let agent_info = agent_info()?;
    let now = sys_time()?;

    // Generate a secure capability secret
    let cap_secret = generate_cap_secret()?;

    // Calculate expiration time
    let duration_days = input.expires_in_days.unwrap_or(7); // Default 7 days
    let duration_micros = (duration_days as i64) * 24 * 60 * 60 * 1_000_000;
    let expires_at = Timestamp::from_micros(now.as_micros() + duration_micros);

    // Create capability grant for specific private data functions
    let cap_grant = ZomeCallCapGrant {
        tag: format!("private_data_{}", input.context.replace(" ", "_")),
        access: CapAccess::Assigned {
            secret: cap_secret.clone(),
            assignees: BTreeSet::from([input.agent_to_grant.clone()]),
        },
        functions: GrantedFunctions::Listed(BTreeSet::from([
            (ZomeName::from("zome_person"), FunctionName::from("get_private_data_with_capability")),
        ])),
    };

    let grant_hash = create_cap_grant(cap_grant)?;

    // Store metadata about the grant for our own tracking
    let grant_metadata = PrivateDataCapabilityMetadata {
        grant_hash: grant_hash.clone(),
        granted_to: input.agent_to_grant,
        granted_by: agent_info.agent_initial_pubkey,
        fields_allowed: input.fields_allowed,
        context: input.context,
        expires_at,
        created_at: now,
        cap_secret: cap_secret.clone(),
    };

    create_entry(&EntryTypes::PrivateDataCapabilityMetadata(grant_metadata))?;

    Ok(GrantPrivateDataAccessOutput {
        grant_hash,
        cap_secret,
        expires_at,
    })
}

/// Create a capability claim for accessing private data
#[derive(Debug, Serialize, Deserialize)]
pub struct CreatePrivateDataCapClaimInput {
    pub grantor: AgentPubKey,
    pub cap_secret: CapSecret,
    pub context: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreatePrivateDataCapClaimOutput {
    pub claim_hash: ActionHash,
}

#[hdk_extern]
pub fn create_private_data_cap_claim(input: CreatePrivateDataCapClaimInput) -> ExternResult<CreatePrivateDataCapClaimOutput> {
    let cap_claim = CapClaim {
        tag: format!("private_data_{}", input.context.replace(" ", "_")),
        grantor: input.grantor,
        secret: input.cap_secret,
    };

    let claim_hash = create_cap_claim(cap_claim)?;

    Ok(CreatePrivateDataCapClaimOutput {
        claim_hash,
    })
}

/// Access private data using capability claim (this function is protected by capability system)
#[hdk_extern]
pub fn get_private_data_with_capability(input: GetPrivateDataWithCapabilityInput) -> ExternResult<FilteredPrivateData> {
    let agent_info = agent_info()?;

    // This function is automatically protected by Holochain's capability checking
    // No manual authorization needed - Holochain verifies the capability claim

    // Get our own private data
    let private_data = crate::private_data::get_my_private_person_data(())?
        .ok_or(wasm_error!(WasmErrorInner::Guest("Private data not found".to_string())))?;

    // Filter data based on the requested fields
    let mut filtered_data = zome_person_integrity::FilteredPrivateData {
        legal_name: None, // Never share legal name for privacy
        email: None,
        phone: None,
        address: None,
        emergency_contact: None,
        time_zone: None,
        location: None,
    };

    for field in &input.requested_fields {
        match field.as_str() {
            "email" => filtered_data.email = Some(private_data.email.clone()),
            "phone" => filtered_data.phone = private_data.phone.clone(),
            "address" => filtered_data.address = private_data.address.clone(),
            "emergency_contact" => filtered_data.emergency_contact = private_data.emergency_contact.clone(),
            "time_zone" => filtered_data.time_zone = private_data.time_zone.clone(),
            "location" => filtered_data.location = private_data.location.clone(),
            "legal_name" => {
                // Only include legal_name if explicitly requested and allowed
                warn!("⚠️ Legal name requested for private data access - this should be carefully controlled");
                // In production, you might want additional checks before sharing legal_name
            }
            _ => warn!("⚠️ Unknown field requested: {}", field),
        }
    }

    Ok(filtered_data)
}

/// Input structure for getting private data with capability
#[derive(Debug, Serialize, Deserialize)]
pub struct GetPrivateDataWithCapabilityInput {
    pub requested_fields: Vec<String>,
}



/// Revoke a private data capability grant
#[hdk_extern]
pub fn revoke_private_data_access(grant_hash: ActionHash) -> ExternResult<()> {
    let agent_info = agent_info()?;
    let agent_pubkey = agent_info.agent_initial_pubkey;

    // Get the capability grant metadata to verify ownership
    let metadata_links = get_links(
        GetLinksInputBuilder::try_new(
            agent_pubkey.clone(),
            LinkTypes::AgentToCapabilityMetadata
        )?.build(),
    )?;

    for link in metadata_links {
        if let Some(action_hash) = link.target.into_action_hash() {
            let action_hash_clone = action_hash.clone();
            if let Some(record) = get(action_hash, GetOptions::default())? {
                if let Ok(Some(metadata)) = record.entry().to_app_option::<PrivateDataCapabilityMetadata>() {
                    if metadata.grant_hash == grant_hash && metadata.granted_by == agent_pubkey {
                        // Delete the capability grant
                        delete_cap_grant(grant_hash)?;

                        // Delete our metadata
                        delete_entry(action_hash_clone)?;

                        return Ok(());
                    }
                }
            }
        }
    }

    Err(wasm_error!(WasmErrorInner::Guest("Capability grant not found or not authorized".to_string())))
}

/// Get all capability grants created by the current agent
#[hdk_extern]
pub fn get_my_capability_grants(_: ()) -> ExternResult<Vec<PrivateDataCapabilityMetadata>> {
    let agent_info = agent_info()?;

    let metadata_links = get_links(
        GetLinksInputBuilder::try_new(
            agent_info.agent_initial_pubkey,
            LinkTypes::AgentToCapabilityMetadata
        )?.build(),
    )?;

    let mut grants = Vec::new();
    for link in metadata_links {
        if let Some(action_hash) = link.target.into_action_hash() {
            if let Some(record) = get(action_hash, GetOptions::default())? {
                if let Ok(Some(metadata)) = record.entry().to_app_option::<PrivateDataCapabilityMetadata>() {
                    grants.push(metadata);
                }
            }
        }
    }

    Ok(grants)
}

/// Check if a specific capability grant is still valid
#[hdk_extern]
pub fn validate_capability_grant(grant_hash: ActionHash) -> ExternResult<bool> {
    let now = sys_time()?;

    // Get the metadata for this grant
    let record = get(grant_hash, GetOptions::default())?
        .ok_or(wasm_error!(WasmErrorInner::Guest("Grant not found".to_string())))?;

    let metadata: PrivateDataCapabilityMetadata = record.entry()
        .to_app_option()
        .map_err(|e| wasm_error!(WasmErrorInner::Guest(format!("Failed to deserialize metadata: {:?}", e))))?
        .ok_or(wasm_error!(WasmErrorInner::Guest("Invalid metadata entry".to_string())))?;

    // Check if the grant has expired
    Ok(metadata.expires_at > now)
}

// ============================================================================
// ROLE-BASED CAPABILITY GRANTS
// ============================================================================

/// Serializable wrapper for RoleType
#[derive(Debug, Serialize, Deserialize)]
pub struct SerializableRoleType {
    pub role_name: String,
}

impl From<RoleType> for SerializableRoleType {
    fn from(role: RoleType) -> Self {
        Self {
            role_name: role.to_string(),
        }
    }
}

impl From<SerializableRoleType> for RoleType {
    fn from(serializable: SerializableRoleType) -> Self {
        RoleType::from_str(&serializable.role_name).unwrap_or(RoleType::SimpleAgent)
    }
}

/// Grant private data access based on role
#[derive(Debug, Serialize, Deserialize)]
pub struct GrantRoleBasedAccessInput {
    pub agent: AgentPubKey,
    pub role: SerializableRoleType,
    pub context: String,
}

#[hdk_extern]
pub fn grant_role_based_private_data_access(input: GrantRoleBasedAccessInput) -> ExternResult<GrantPrivateDataAccessOutput> {
    let role_name = input.role.role_name.clone();
    let role: RoleType = input.role.into();
    let (fields_allowed, duration_days) = match role {
        RoleType::SimpleAgent => (vec!["email".to_string()], 7),
        RoleType::AccountableAgent => (vec!["email".to_string(), "phone".to_string()], 14),
        RoleType::PrimaryAccountableAgent => {
            (vec!["email".to_string(), "phone".to_string(), "location".to_string()], 30)
        },
        RoleType::Transport | RoleType::Repair | RoleType::Storage => {
            (vec!["email".to_string(), "phone".to_string(), "location".to_string(), "time_zone".to_string()], 21)
        },
    };

    let grant_input = GrantPrivateDataAccessInput {
        agent_to_grant: input.agent,
        fields_allowed,
        context: format!("role_{}_{}", role_name.replace(" ", "_").to_lowercase(), input.context),
        expires_in_days: Some(duration_days),
    };

    grant_private_data_access(grant_input)
}

/// Create transferable capability for guest access
#[derive(Debug, Serialize, Deserialize)]
pub struct CreateTransferableAccessInput {
    pub context: String,
    pub fields_allowed: Vec<String>,
    pub expires_in_days: Option<u32>,
}

#[hdk_extern]
pub fn create_transferable_private_data_access(input: CreateTransferableAccessInput) -> ExternResult<TransferableCapabilityOutput> {
    let agent_info = agent_info()?;
    let now = sys_time()?;

    let cap_secret = generate_cap_secret()?;
    let duration_days = input.expires_in_days.unwrap_or(1); // Short duration for transferable
    let duration_micros = (duration_days as i64) * 24 * 60 * 60 * 1_000_000;
    let expires_at = Timestamp::from_micros(now.as_micros() + duration_micros);

    // Create transferable capability grant
    let cap_grant = ZomeCallCapGrant {
        tag: format!("transferable_private_data_{}", input.context.replace(" ", "_")),
        access: CapAccess::Transferable {
            secret: cap_secret.clone(),
        },
        functions: GrantedFunctions::Listed(BTreeSet::from([
            (ZomeName::from("zome_person"), FunctionName::from("get_private_data_with_capability")),
        ])),
    };

    let grant_hash = create_cap_grant(cap_grant)?;

    // Store metadata
    let agent_pubkey = agent_info.agent_initial_pubkey.clone();
    let metadata = zome_person_integrity::PrivateDataCapabilityMetadata {
        grant_hash: grant_hash.clone(),
        granted_to: agent_pubkey.clone(), // Self for transferable
        granted_by: agent_pubkey,
        fields_allowed: input.fields_allowed,
        context: format!("transferable_{}", input.context),
        expires_at,
        created_at: now,
        cap_secret: cap_secret.clone(),
    };

    create_entry(&EntryTypes::PrivateDataCapabilityMetadata(metadata))?;

    Ok(TransferableCapabilityOutput {
        grant_hash,
        cap_secret,
        expires_at,
    })
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TransferableCapabilityOutput {
    pub grant_hash: ActionHash,
    pub cap_secret: CapSecret,
    pub expires_at: Timestamp,
}
