use hdk::prelude::*;
use hdk::hash::hash_blake2b;
use hdk::ed25519::{sign, verify_signature};
use zome_gouvernance_integrity::*;
use crate::GovernanceError;

// ============================================================================
// PPR Core Data Structures for Input/Output
// ============================================================================

#[derive(Serialize, Deserialize, Debug)]
pub struct IssueParticipationReceiptsInput {
    pub fulfills: ActionHash,           // Commitment that was fulfilled
    pub fulfilled_by: ActionHash,       // Economic event that fulfilled it
    pub provider: AgentPubKey,          // Agent who provided/performed the action
    pub receiver: AgentPubKey,          // Agent who received/benefited from the action
    pub claim_types: Vec<ParticipationClaimType>, // Types of claims to generate
    pub provider_metrics: PerformanceMetrics,    // Performance metrics for provider
    pub receiver_metrics: PerformanceMetrics,    // Performance metrics for receiver
    pub resource_hash: Option<ActionHash>,       // Optional resource involved
    pub notes: Option<String>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct IssueParticipationReceiptsOutput {
    pub provider_claim_hash: ActionHash,
    pub receiver_claim_hash: ActionHash,
    pub provider_claim: PrivateParticipationClaim,
    pub receiver_claim: PrivateParticipationClaim,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct SignParticipationClaimInput {
    pub data_to_sign: Vec<u8>,          // Data to be signed
    pub counterparty: AgentPubKey,      // The other agent involved
}

#[derive(Serialize, Deserialize, Debug)]
pub struct SignParticipationClaimOutput {
    pub signature: Signature,
    pub signed_data_hash: [u8; 32],
}

#[derive(Serialize, Deserialize, Debug)]
pub struct ValidateParticipationClaimSignatureInput {
    pub signature: CryptographicSignature,
    pub owner: AgentPubKey,
    pub counterparty: AgentPubKey,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct GetMyParticipationClaimsInput {
    pub claim_type_filter: Option<ParticipationClaimType>,
    pub from_time: Option<Timestamp>,
    pub to_time: Option<Timestamp>,
    pub limit: Option<u32>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct GetMyParticipationClaimsOutput {
    pub claims: Vec<(ActionHash, PrivateParticipationClaim)>,
    pub total_count: u32,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct DeriveReputationSummaryInput {
    pub period_start: Timestamp,
    pub period_end: Timestamp,
    pub claim_type_filter: Option<Vec<ParticipationClaimType>>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct DeriveReputationSummaryOutput {
    pub summary: ReputationSummary,
    pub claims_included: u32,
}

// ============================================================================
// Core PPR Functions
// ============================================================================

/// Issue bi-directional Private Participation Receipts for an economic interaction
/// This is the main function that generates exactly 2 PPRs per interaction
#[hdk_extern]
pub fn issue_participation_receipts(
    input: IssueParticipationReceiptsInput,
) -> ExternResult<IssueParticipationReceiptsOutput> {
    let _agent_info = agent_info()?;
    
    // Validate that we have exactly 2 claim types for bi-directional issuance
    if input.claim_types.len() != 2 {
        return Err(GovernanceError::InvalidInput(
            "Must provide exactly 2 claim types for bi-directional PPR issuance".to_string()
        ).into());
    }
    
    // Validate performance metrics
    input.provider_metrics.validate()
        .map_err(|e| GovernanceError::InvalidInput(format!("Provider metrics invalid: {}", e)))?;
    input.receiver_metrics.validate()
        .map_err(|e| GovernanceError::InvalidInput(format!("Receiver metrics invalid: {}", e)))?;
    
    // Create signed data for cryptographic signing
    let signing_data = create_signing_data(&input)?;
    let signed_data_hash = create_secure_hash(&signing_data)?;
    
    let now = sys_time()?;
    
    // Get the calling agent (who is creating these PPRs)
    let calling_agent = agent_info()?.agent_initial_pubkey;
    
    // DEBUG: Log agent information
    debug!("Calling agent: {:?}", calling_agent);
    debug!("Provider: {:?}", input.provider);  
    debug!("Receiver: {:?}", input.receiver);
    
    // Create signing context for the calling agent
    let calling_agent_signing_data = if calling_agent == input.provider {
        debug!("Calling agent is the provider");
        create_provider_signing_context(&input, &signing_data)?
    } else if calling_agent == input.receiver {
        debug!("Calling agent is the receiver");  
        create_receiver_signing_context(&input, &signing_data)?
    } else {
        return Err(GovernanceError::InvalidInput(
            format!("Calling agent must be either provider or receiver. Calling: {:?}, Provider: {:?}, Receiver: {:?}", 
                calling_agent, input.provider, input.receiver)
        ).into());
    };
    
    // Sign data with calling agent's key (only the calling agent can sign)
    debug!("About to sign with calling agent key");
    let calling_agent_signature = sign(calling_agent.clone(), calling_agent_signing_data)?;
    debug!("Successfully signed with calling agent key");
    
    // For now, we'll use a placeholder for the other party's signature
    // In a production system, the other party would need to call a separate function to add their signature
    let placeholder_signature = Signature([0u8; 64]);
    
    // Create cryptographic signature structures based on who is calling
    let (provider_signature, receiver_signature) = if calling_agent == input.provider {
        // Provider is signing
        let provider_sig = CryptographicSignature::new(
            calling_agent_signature.clone(),
            placeholder_signature.clone(),
            signed_data_hash,
            now,
        );
        let receiver_sig = CryptographicSignature::new(
            placeholder_signature.clone(),
            calling_agent_signature.clone(),
            signed_data_hash,
            now,
        );
        (provider_sig, receiver_sig)
    } else {
        // Receiver is signing
        let provider_sig = CryptographicSignature::new(
            placeholder_signature.clone(),
            calling_agent_signature.clone(),
            signed_data_hash,
            now,
        );
        let receiver_sig = CryptographicSignature::new(
            calling_agent_signature.clone(),
            placeholder_signature.clone(),
            signed_data_hash,
            now,
        );
        (provider_sig, receiver_sig)
    };
    
    // Create the provider's PPR claim
    let provider_claim = PrivateParticipationClaim::new(
        input.fulfills.clone(),
        input.fulfilled_by.clone(),
        input.claim_types[0].clone(),
        input.provider_metrics,
        provider_signature,
        input.receiver.clone(),
        input.resource_hash.clone(),
        input.notes.clone(),
        now,
    ).map_err(|e| GovernanceError::InvalidInput(e))?;
    
    // Create the receiver's PPR claim  
    let receiver_claim = PrivateParticipationClaim::new(
        input.fulfills.clone(),
        input.fulfilled_by.clone(),
        input.claim_types[1].clone(),
        input.receiver_metrics,
        receiver_signature,
        input.provider.clone(),
        input.resource_hash.clone(),
        input.notes.clone(),
        now,
    ).map_err(|e| GovernanceError::InvalidInput(e))?;
    
    // Store both claims as private entries
    let provider_claim_hash = create_entry(&EntryTypes::PrivateParticipationClaim(provider_claim.clone()))?;
    let receiver_claim_hash = create_entry(&EntryTypes::PrivateParticipationClaim(receiver_claim.clone()))?;
    
    // Create links for claim discovery and organization
    create_claim_links(&provider_claim_hash, &provider_claim, &input.provider)?;
    create_claim_links(&receiver_claim_hash, &receiver_claim, &input.receiver)?;
    
    // Link both claims to the economic event and commitment
    create_link(
        input.fulfilled_by.clone(),
        provider_claim_hash.clone(),
        LinkTypes::EventToPrivateParticipationClaims,
        (),
    )?;
    create_link(
        input.fulfilled_by.clone(),
        receiver_claim_hash.clone(),
        LinkTypes::EventToPrivateParticipationClaims,
        (),
    )?;
    
    create_link(
        input.fulfills.clone(),
        provider_claim_hash.clone(),
        LinkTypes::CommitmentToPrivateParticipationClaims,
        (),
    )?;
    create_link(
        input.fulfills.clone(),
        receiver_claim_hash.clone(),
        LinkTypes::CommitmentToPrivateParticipationClaims,
        (),
    )?;
    
    // Link to resource if provided
    if let Some(resource_hash) = &input.resource_hash {
        create_link(
            resource_hash.clone(),
            provider_claim_hash.clone(),
            LinkTypes::ResourceToPrivateParticipationClaims,
            (),
        )?;
        create_link(
            resource_hash.clone(),
            receiver_claim_hash.clone(),
            LinkTypes::ResourceToPrivateParticipationClaims,
            (),
        )?;
    }
    
    Ok(IssueParticipationReceiptsOutput {
        provider_claim_hash,
        receiver_claim_hash,
        provider_claim,
        receiver_claim,
    })
}

/// Sign data for a participation claim (cryptographic signing)
#[hdk_extern]
pub fn sign_participation_claim(
    input: SignParticipationClaimInput,
) -> ExternResult<SignParticipationClaimOutput> {
    // Create cryptographically secure hash of the data to be signed
    let signed_data_hash = create_secure_hash(&input.data_to_sign)?;
    
    // Get agent info for signing
    let agent_info = agent_info()?;
    
    // Create signing context that includes counterparty for bilateral authentication
    let signing_context = create_bilateral_signing_context(&input.data_to_sign, &input.counterparty)?;
    
    // Sign the contextual data with the agent's Ed25519 private key
    let signature = sign(agent_info.agent_initial_pubkey, signing_context)?;
    
    Ok(SignParticipationClaimOutput {
        signature,
        signed_data_hash,
    })
}

/// Validate cryptographic signatures on a participation claim
#[hdk_extern]
pub fn validate_participation_claim_signature(
    input: ValidateParticipationClaimSignatureInput,
) -> ExternResult<bool> {
    // Verify owner signature against the signed data hash
    let owner_valid = verify_signature(
        input.owner.clone(),
        input.signature.recipient_signature.clone(),
        input.signature.signed_data_hash.to_vec(),
    )?;
    
    // Verify counterparty signature against the signed data hash
    let counterparty_valid = verify_signature(
        input.counterparty.clone(),
        input.signature.counterparty_signature.clone(),
        input.signature.signed_data_hash.to_vec(),
    )?;
    
    Ok(owner_valid && counterparty_valid)
}

/// Enhanced signature validation with full context reconstruction
#[derive(Serialize, Deserialize, Debug)]
pub struct EnhancedValidateParticipationClaimSignatureInput {
    pub signature: CryptographicSignature,
    pub owner: AgentPubKey,
    pub counterparty: AgentPubKey,
    pub original_signing_data: Vec<u8>,
    pub owner_claim_type: ParticipationClaimType,
    pub counterparty_claim_type: ParticipationClaimType,
}

/// Validate cryptographic signatures with full context verification
#[hdk_extern]
pub fn validate_participation_claim_signature_enhanced(
    input: EnhancedValidateParticipationClaimSignatureInput,
) -> ExternResult<bool> {
    // Get verification contexts from the integrity zome
    let (owner_context, counterparty_context) = input.signature.get_verification_context(
        &input.owner,
        &input.counterparty,
        &input.original_signing_data,
        &input.owner_claim_type,
        &input.counterparty_claim_type,
    );
    
    // Verify owner signature with proper context
    let owner_valid = verify_signature(
        input.owner.clone(),
        input.signature.recipient_signature.clone(),
        owner_context,
    )?;
    
    // Verify counterparty signature with proper context
    let counterparty_valid = verify_signature(
        input.counterparty.clone(),
        input.signature.counterparty_signature.clone(),
        counterparty_context,
    )?;
    
    Ok(owner_valid && counterparty_valid)
}

/// Get private participation claims for the calling agent
#[hdk_extern]
pub fn get_my_participation_claims(
    input: GetMyParticipationClaimsInput,
) -> ExternResult<GetMyParticipationClaimsOutput> {
    let agent_info = agent_info()?;
    
    // Get all claim links for this agent
    let links = get_links(
        GetLinksInputBuilder::try_new(
            agent_info.agent_initial_pubkey.clone(),
            LinkTypes::AgentToPrivateParticipationClaims,
        )?.build()
    )?;
    
    let mut claims = Vec::new();
    
    for link in links {
        if let Some(claim_hash) = link.target.into_action_hash() {
            if let Some(record) = get(claim_hash.clone(), GetOptions::default())? {
                if let Some(claim) = extract_private_participation_claim(&record)? {
                    // Apply filters
                    if let Some(ref claim_type_filter) = input.claim_type_filter {
                        if &claim.claim_type != claim_type_filter {
                            continue;
                        }
                    }
                    
                    if let Some(from_time) = input.from_time {
                        if claim.claimed_at < from_time {
                            continue;
                        }
                    }
                    
                    if let Some(to_time) = input.to_time {
                        if claim.claimed_at > to_time {
                            continue;
                        }
                    }
                    
                    claims.push((claim_hash, claim));
                    
                    // Apply limit if specified
                    if let Some(limit) = input.limit {
                        if claims.len() >= limit as usize {
                            break;
                        }
                    }
                }
            }
        }
    }
    
    // Sort by claim timestamp (most recent first)
    claims.sort_by(|a, b| b.1.claimed_at.cmp(&a.1.claimed_at));
    
    Ok(GetMyParticipationClaimsOutput {
        total_count: claims.len() as u32,
        claims,
    })
}

/// Derive privacy-preserving reputation summary from agent's PPR claims
#[hdk_extern]
pub fn derive_reputation_summary(
    input: DeriveReputationSummaryInput,
) -> ExternResult<DeriveReputationSummaryOutput> {
    let agent_info = agent_info()?;
    
    // Get all claims for the period
    let claims_input = GetMyParticipationClaimsInput {
        claim_type_filter: None,
        from_time: Some(input.period_start),
        to_time: Some(input.period_end),
        limit: None,
    };
    
    let claims_result = get_my_participation_claims(claims_input)?;
    
    // Filter by claim types if specified
    let filtered_claims: Vec<PrivateParticipationClaim> = if let Some(ref type_filter) = input.claim_type_filter {
        claims_result.claims.into_iter()
            .map(|(_, claim)| claim)
            .filter(|claim| type_filter.contains(&claim.claim_type))
            .collect()
    } else {
        claims_result.claims.into_iter()
            .map(|(_, claim)| claim)
            .collect()
    };
    
    // Create reputation summary
    let summary = ReputationSummary::from_claims(
        filtered_claims.clone(),
        agent_info.agent_initial_pubkey,
        input.period_start,
        input.period_end,
        sys_time()?,
    ).map_err(|e| GovernanceError::InvalidInput(e))?;
    
    Ok(DeriveReputationSummaryOutput {
        summary,
        claims_included: filtered_claims.len() as u32,
    })
}

// ============================================================================
// Helper Functions
// ============================================================================

/// Create links for a PPR claim to enable discovery and organization
fn create_claim_links(
    claim_hash: &ActionHash,
    claim: &PrivateParticipationClaim,
    agent: &AgentPubKey,
) -> ExternResult<()> {
    // Link from agent to their claim
    create_link(
        agent.clone(),
        claim_hash.clone(),
        LinkTypes::AgentToPrivateParticipationClaims,
        LinkTag::new(format!("{:?}", claim.claim_type)),
    )?;
    
    Ok(())
}

/// Create signing data from the input parameters
fn create_signing_data(input: &IssueParticipationReceiptsInput) -> ExternResult<Vec<u8>> {
    // Create a consistent data structure for signing by concatenating serialized components
    let mut signing_data = Vec::new();
    
    // Serialize each component individually since complex tuple serialization isn't supported
    signing_data.extend_from_slice(&input.fulfills.get_raw_39());
    signing_data.extend_from_slice(&input.fulfilled_by.get_raw_39());
    signing_data.extend_from_slice(&input.provider.get_raw_39());
    signing_data.extend_from_slice(&input.receiver.get_raw_39());
    
    // Serialize claim types as strings
    for claim_type in &input.claim_types {
        signing_data.extend_from_slice(format!("{:?}", claim_type).as_bytes());
    }
    
    // Add resource hash if present
    if let Some(ref resource_hash) = input.resource_hash {
        signing_data.extend_from_slice(&resource_hash.get_raw_39());
    }
    
    // Add timestamp for uniqueness
    let timestamp = sys_time()?;
    signing_data.extend_from_slice(&timestamp.as_micros().to_le_bytes());
    
    Ok(signing_data)
}

/// Create a cryptographically secure hash using BLAKE2b
fn create_secure_hash(data: &[u8]) -> ExternResult<[u8; 32]> {
    // Use BLAKE2b-256 for cryptographically secure hashing (32 bytes output)
    let hash_output = hash_blake2b(data.to_vec(), 32)?;
    
    // Convert Vec<u8> to [u8; 32] array
    if hash_output.len() != 32 {
        return Err(wasm_error!(WasmErrorInner::Guest(
            "Hash output is not 32 bytes".into()
        )));
    }
    
    let mut hash_array = [0u8; 32];
    hash_array.copy_from_slice(&hash_output);
    
    Ok(hash_array)
}

/// Create provider-specific signing context for bilateral authentication
fn create_provider_signing_context(
    input: &IssueParticipationReceiptsInput,
    base_data: &[u8],
) -> ExternResult<Vec<u8>> {
    let mut context_data = Vec::new();
    
    // Add role identifier
    context_data.extend_from_slice(b"PROVIDER_PPR_SIGNATURE");
    
    // Add base signing data
    context_data.extend_from_slice(base_data);
    
    // Add provider-specific context
    context_data.extend_from_slice(&input.provider.get_raw_39());
    context_data.extend_from_slice(&input.receiver.get_raw_39());
    
    // Add claim types for provider
    if !input.claim_types.is_empty() {
        context_data.extend_from_slice(format!("{:?}", input.claim_types[0]).as_bytes());
    }
    
    Ok(context_data)
}

/// Create receiver-specific signing context for bilateral authentication
fn create_receiver_signing_context(
    input: &IssueParticipationReceiptsInput,
    base_data: &[u8],
) -> ExternResult<Vec<u8>> {
    let mut context_data = Vec::new();
    
    // Add role identifier
    context_data.extend_from_slice(b"RECEIVER_PPR_SIGNATURE");
    
    // Add base signing data
    context_data.extend_from_slice(base_data);
    
    // Add receiver-specific context
    context_data.extend_from_slice(&input.receiver.get_raw_39());
    context_data.extend_from_slice(&input.provider.get_raw_39());
    
    // Add claim types for receiver
    if input.claim_types.len() > 1 {
        context_data.extend_from_slice(format!("{:?}", input.claim_types[1]).as_bytes());
    }
    
    Ok(context_data)
}

/// Create bilateral signing context for general participation claim signing
fn create_bilateral_signing_context(
    data: &[u8],
    counterparty: &AgentPubKey,
) -> ExternResult<Vec<u8>> {
    let mut context_data = Vec::new();
    
    // Add context identifier
    context_data.extend_from_slice(b"BILATERAL_PPR_CLAIM");
    
    // Add original data
    context_data.extend_from_slice(data);
    
    // Add counterparty for bilateral context
    context_data.extend_from_slice(&counterparty.get_raw_39());
    
    // Add timestamp for uniqueness and replay protection
    let timestamp = sys_time()?;
    context_data.extend_from_slice(&timestamp.as_micros().to_le_bytes());
    
    Ok(context_data)
}

/// Extract a PrivateParticipationClaim from a record
fn extract_private_participation_claim(
    record: &Record,
) -> ExternResult<Option<PrivateParticipationClaim>> {
    if let Ok(Some(EntryTypes::PrivateParticipationClaim(claim))) =
        record.entry().to_app_option::<EntryTypes>().map_err(|_| {
            wasm_error!(WasmErrorInner::Guest(
                "Failed to deserialize private participation claim".into()
            ))
        })
    {
        return Ok(Some(claim));
    }
    Ok(None)
}

// ============================================================================
// Economic Event Integration Functions
// ============================================================================

/// Generate appropriate PPR claims based on an economic event's action type
pub fn generate_pprs_for_economic_event(
    event: &EconomicEvent,
    commitment_hash: ActionHash,
    event_hash: ActionHash,
) -> ExternResult<IssueParticipationReceiptsOutput> {
    // Determine claim types based on the VfAction
    let claim_types = determine_claim_types_for_action(&event.action)?;
    
    // Use default performance metrics for automatic generation
    // In a full implementation, these would be calculated based on actual performance
    let default_metrics = PerformanceMetrics::default();
    
    let input = IssueParticipationReceiptsInput {
        fulfills: commitment_hash,
        fulfilled_by: event_hash,
        provider: event.provider.clone(),
        receiver: event.receiver.clone(),
        claim_types,
        provider_metrics: default_metrics.clone(),
        receiver_metrics: default_metrics,
        resource_hash: Some(event.resource_inventoried_as.clone()),
        notes: event.note.clone(),
    };
    
    issue_participation_receipts(input)
}

/// Determine the appropriate PPR claim types for a given VfAction
fn determine_claim_types_for_action(action: &VfAction) -> ExternResult<Vec<ParticipationClaimType>> {
    let claim_types = match action {
        VfAction::Produce => vec![
            ParticipationClaimType::ResourceCreation,
            ParticipationClaimType::ResourceValidation,
        ],
        VfAction::Transfer | VfAction::TransferCustody => vec![
            ParticipationClaimType::CustodyTransfer,
            ParticipationClaimType::CustodyAcceptance,
        ],
        VfAction::InitialTransfer => vec![
            ParticipationClaimType::CustodyTransfer,
            ParticipationClaimType::CustodyAcceptance,
        ],
        VfAction::Use => vec![
            ParticipationClaimType::GoodFaithTransfer,
            ParticipationClaimType::CustodyAcceptance,
        ],
        VfAction::Work => {
            // Determine service type based on context - this is simplified
            vec![
                ParticipationClaimType::MaintenanceCommitmentAccepted,
                ParticipationClaimType::MaintenanceFulfillmentCompleted,
            ]
        },
        VfAction::Accept => vec![
            ParticipationClaimType::CustodyAcceptance,
            ParticipationClaimType::CustodyTransfer,
        ],
        // Other actions use generic governance claims for now
        _ => vec![
            ParticipationClaimType::ValidationActivity,
            ParticipationClaimType::RuleCompliance,
        ],
    };
    
    Ok(claim_types)
}

/// Create PPRs for service commitments (maintenance, storage, transport)
pub fn create_service_commitment_pprs(
    commitment_hash: ActionHash,
    service_type: &str, // "maintenance", "storage", or "transport"  
    provider: AgentPubKey,
    receiver: AgentPubKey,
    resource_hash: Option<ActionHash>,
) -> ExternResult<IssueParticipationReceiptsOutput> {
    let claim_types = match service_type {
        "maintenance" => vec![
            ParticipationClaimType::MaintenanceCommitmentAccepted,
            ParticipationClaimType::GoodFaithTransfer,
        ],
        "storage" => vec![
            ParticipationClaimType::StorageCommitmentAccepted,
            ParticipationClaimType::GoodFaithTransfer,
        ],
        "transport" => vec![
            ParticipationClaimType::TransportCommitmentAccepted,
            ParticipationClaimType::GoodFaithTransfer,
        ],
        _ => return Err(GovernanceError::InvalidInput(
            format!("Unknown service type: {}", service_type)
        ).into()),
    };
    
    let default_metrics = PerformanceMetrics::default();
    
    let input = IssueParticipationReceiptsInput {
        fulfills: commitment_hash.clone(),
        fulfilled_by: commitment_hash, // Use commitment hash as fulfilled_by for commitment phase
        provider,
        receiver,
        claim_types,
        provider_metrics: default_metrics.clone(),
        receiver_metrics: default_metrics,
        resource_hash,
        notes: Some(format!("{} service commitment", service_type)),
    };
    
    issue_participation_receipts(input)
}

/// Create PPRs for service fulfillments (maintenance, storage, transport)
pub fn create_service_fulfillment_pprs(
    commitment_hash: ActionHash,
    event_hash: ActionHash,
    service_type: &str,
    provider: AgentPubKey,
    receiver: AgentPubKey,
    resource_hash: Option<ActionHash>,
) -> ExternResult<IssueParticipationReceiptsOutput> {
    let claim_types = match service_type {
        "maintenance" => vec![
            ParticipationClaimType::MaintenanceFulfillmentCompleted,
            ParticipationClaimType::CustodyAcceptance,
        ],
        "storage" => vec![
            ParticipationClaimType::StorageFulfillmentCompleted,
            ParticipationClaimType::CustodyAcceptance,
        ],
        "transport" => vec![
            ParticipationClaimType::TransportFulfillmentCompleted,
            ParticipationClaimType::CustodyAcceptance,
        ],
        _ => return Err(GovernanceError::InvalidInput(
            format!("Unknown service type: {}", service_type)
        ).into()),
    };
    
    let default_metrics = PerformanceMetrics::default();
    
    let input = IssueParticipationReceiptsInput {
        fulfills: commitment_hash,
        fulfilled_by: event_hash,
        provider,
        receiver,
        claim_types,
        provider_metrics: default_metrics.clone(),
        receiver_metrics: default_metrics,
        resource_hash,
        notes: Some(format!("{} service fulfillment", service_type)),
    };
    
    issue_participation_receipts(input)
}