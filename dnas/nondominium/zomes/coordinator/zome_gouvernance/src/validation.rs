use hdk::prelude::*;
use zome_gouvernance_integrity::*;

// ============================================================================
// Validation Receipt Management
// ============================================================================

#[derive(Serialize, Deserialize, Debug)]
pub struct CreateValidationReceiptInput {
  pub validated_item: ActionHash,
  pub validation_type: String,
  pub approved: bool,
  pub notes: Option<String>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct CreateValidationReceiptOutput {
  pub receipt_hash: ActionHash,
  pub receipt: ValidationReceipt,
}

#[hdk_extern]
pub fn create_validation_receipt(
  input: CreateValidationReceiptInput,
) -> ExternResult<CreateValidationReceiptOutput> {
  let agent_info = agent_info()?;
  let now = sys_time()?;

  // TODO: In Phase 2, check that the calling agent has restricted_access capability
  // TODO: In Phase 2, check that the calling agent is an Accountable Agent

  let receipt = ValidationReceipt {
    validator: agent_info.agent_initial_pubkey,
    validated_item: input.validated_item.clone(),
    validation_type: input.validation_type,
    approved: input.approved,
    notes: input.notes,
    validated_at: now,
  };

  let receipt_hash = create_entry(&EntryTypes::ValidationReceipt(receipt.clone()))?;

  // Create discovery link
  let path = Path::from("all_validation_receipts");
  let anchor_hash = path.path_entry_hash()?;
  create_link(
    anchor_hash,
    receipt_hash.clone(),
    LinkTypes::AllValidationReceipts,
    (),
  )?;

  // Link the receipt to the validated item
  create_link(
    input.validated_item,
    receipt_hash.clone(),
    LinkTypes::ValidatedItemToReceipt,
    (),
  )?;

  Ok(CreateValidationReceiptOutput {
    receipt_hash,
    receipt,
  })
}

#[hdk_extern]
pub fn get_validation_history(item_hash: ActionHash) -> ExternResult<Vec<ValidationReceipt>> {
  let links = get_links(
    GetLinksInputBuilder::try_new(item_hash, LinkTypes::ValidatedItemToReceipt)?.build(),
  )?;
  let mut receipts = Vec::new();

  for link in links {
    if let Ok(any_dht_hash) = AnyDhtHash::try_from(link.target.clone()) {
      if let Some(record) = get(any_dht_hash, GetOptions::default())? {
        if let Ok(Some(EntryTypes::ValidationReceipt(receipt))) =
          record.entry().to_app_option::<EntryTypes>().map_err(|_| {
            wasm_error!(WasmErrorInner::Guest(
              "Failed to deserialize validation receipt".into()
            ))
          })
        {
          receipts.push(receipt);
        }
      }
    }
  }

  Ok(receipts)
}

#[hdk_extern]
pub fn get_all_validation_receipts(_: ()) -> ExternResult<Vec<ValidationReceipt>> {
  let path = Path::from("all_validation_receipts");
  let anchor_hash = path.path_entry_hash()?;

  let links = get_links(
    GetLinksInputBuilder::try_new(anchor_hash, LinkTypes::AllValidationReceipts)?.build(),
  )?;
  let mut receipts = Vec::new();

  for link in links {
    if let Ok(any_dht_hash) = AnyDhtHash::try_from(link.target.clone()) {
      if let Some(record) = get(any_dht_hash, GetOptions::default())? {
        if let Ok(Some(EntryTypes::ValidationReceipt(receipt))) =
          record.entry().to_app_option::<EntryTypes>().map_err(|_| {
            wasm_error!(WasmErrorInner::Guest(
              "Failed to deserialize validation receipt".into()
            ))
          })
        {
          receipts.push(receipt);
        }
      }
    }
  }

  Ok(receipts)
}

// ============================================================================
// Resource Validation Management
// ============================================================================

#[derive(Serialize, Deserialize, Debug)]
pub struct CreateResourceValidationInput {
  pub resource: ActionHash,
  pub validation_scheme: String,
  pub required_validators: u32,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct CreateResourceValidationOutput {
  pub validation_hash: ActionHash,
  pub validation: ResourceValidation,
}

#[hdk_extern]
pub fn create_resource_validation(
  input: CreateResourceValidationInput,
) -> ExternResult<CreateResourceValidationOutput> {
  let now = sys_time()?;

  let validation = ResourceValidation {
    resource: input.resource.clone(),
    validation_scheme: input.validation_scheme,
    required_validators: input.required_validators,
    current_validators: 0,
    status: "pending".to_string(),
    created_at: now,
    updated_at: now,
  };

  let validation_hash = create_entry(&EntryTypes::ResourceValidation(validation.clone()))?;

  // Create discovery link
  let path = Path::from("all_resource_validations");
  let anchor_hash = path.path_entry_hash()?;
  create_link(
    anchor_hash,
    validation_hash.clone(),
    LinkTypes::AllResourceValidations,
    (),
  )?;

  // Link validation to the resource
  create_link(
    input.resource,
    validation_hash.clone(),
    LinkTypes::ResourceToValidation,
    (),
  )?;

  Ok(CreateResourceValidationOutput {
    validation_hash,
    validation,
  })
}

#[hdk_extern]
pub fn check_validation_status(
  resource_hash: ActionHash,
) -> ExternResult<Option<ResourceValidation>> {
  let links = get_links(
    GetLinksInputBuilder::try_new(resource_hash, LinkTypes::ResourceToValidation)?.build(),
  )?;

  // Get the most recent validation (there should only be one per resource)
  if let Some(link) = links.first() {
    if let Ok(any_dht_hash) = AnyDhtHash::try_from(link.target.clone()) {
      if let Some(record) = get(any_dht_hash, GetOptions::default())? {
        if let Ok(Some(EntryTypes::ResourceValidation(validation))) =
          record.entry().to_app_option::<EntryTypes>().map_err(|_| {
            wasm_error!(WasmErrorInner::Guest(
              "Failed to deserialize resource validation".into()
            ))
          })
        {
          return Ok(Some(validation));
        }
      }
    }
  }

  Ok(None)
}

// ============================================================================
// Cross-Zome Validation Functions
// ============================================================================

#[derive(Serialize, Deserialize, Debug)]
pub struct ValidateNewResourceInput {
  pub resource_hash: ActionHash,
  pub resource_spec_hash: ActionHash,
  pub creator: AgentPubKey,
  pub validation_scheme: String,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct ValidateNewResourceOutput {
  pub validation_hash: ActionHash,
  pub validation_required: bool,
  pub status: String,
}

#[hdk_extern]
pub fn validate_new_resource(
  input: ValidateNewResourceInput,
) -> ExternResult<ValidateNewResourceOutput> {
  // Called from resource zome during resource creation
  // Implements REQ-GOV-02: Resource Validation

  // TODO: Phase 2 - Check creator's capability level
  // Simple Agents creating their first resource need validation
  // Accountable+ Agents may have different validation requirements

  let validation_input = CreateResourceValidationInput {
    resource: input.resource_hash,
    validation_scheme: input.validation_scheme,
    required_validators: 1, // TODO: Make configurable based on resource type
  };

  let validation_result = create_resource_validation(validation_input)?;

  Ok(ValidateNewResourceOutput {
    validation_hash: validation_result.validation_hash,
    validation_required: true,
    status: "pending_validation".to_string(),
  })
}

#[derive(Serialize, Deserialize, Debug)]
pub struct ValidateAgentIdentityInput {
  pub agent: AgentPubKey,
  pub resource_hash: ActionHash,             // Their first resource
  pub private_data_hash: Option<ActionHash>, // Their identity data
}

#[derive(Serialize, Deserialize, Debug)]
pub struct ValidateAgentIdentityOutput {
  pub validation_receipt_hash: ActionHash,
  pub promotion_approved: bool,
  pub new_capability_level: String,
}

#[hdk_extern]
pub fn validate_agent_identity(
  input: ValidateAgentIdentityInput,
) -> ExternResult<ValidateAgentIdentityOutput> {
  // Called during Simple Agent → Accountable Agent promotion
  // Implements REQ-GOV-03: Agent Validation

  let _agent_info = agent_info()?;

  // TODO: Phase 2 - Verify calling agent is Accountable Agent with validation rights
  // TODO: Phase 2 - Check the agent's first resource meets standards
  // TODO: Phase 2 - Verify identity data exists and is complete

  // For now, auto-approve for development
  let receipt_input = CreateValidationReceiptInput {
    validated_item: input.resource_hash,
    validation_type: "agent_promotion".to_string(),
    approved: true,
    notes: Some(
      "Simple Agent promoted to Accountable Agent after first resource validation".to_string(),
    ),
  };

  let receipt_result = create_validation_receipt(receipt_input)?;

  Ok(ValidateAgentIdentityOutput {
    validation_receipt_hash: receipt_result.receipt_hash,
    promotion_approved: true,
    new_capability_level: "restricted_access".to_string(),
  })
}

#[derive(Serialize, Deserialize, Debug)]
pub struct ValidateSpecializedRoleInput {
  pub agent: AgentPubKey,
  pub requested_role: String, // Transport, Repair, Storage
  pub credentials: Option<String>,
  pub validation_history: Option<ActionHash>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct ValidateSpecializedRoleOutput {
  pub validation_receipt_hash: ActionHash,
  pub role_approved: bool,
  pub role_granted: String,
}

#[hdk_extern]
pub fn validate_specialized_role(
  input: ValidateSpecializedRoleInput,
) -> ExternResult<ValidateSpecializedRoleOutput> {
  // Called during specialized role assignment (Transport, Repair, Storage)
  // Implements REQ-GOV-04: Specialized Role Validation

  let _agent_info = agent_info()?;

  // TODO: Phase 2 - Verify calling agent is Primary Accountable Agent with same role
  // TODO: Phase 2 - Check applicant's history and credentials
  // TODO: Phase 2 - Implement 2-of-3 or N-of-M validation scheme

  // Use the agent's pubkey as a placeholder for now
  // TODO: Phase 2 - Use proper validation item hash
  let receipt_input = CreateValidationReceiptInput {
    validated_item: input.validation_history.unwrap_or_else(|| {
      // Create a dummy ActionHash for development - use 39 bytes for ActionHash
      let mut dummy_bytes = [0u8; 39].to_vec();
      dummy_bytes[0] = 0x84; // ActionHash prefix
      dummy_bytes[1] = 0x20; // 32-byte hash length
      dummy_bytes[2] = 0x24; // hash type
      ActionHash::from_raw_39(dummy_bytes)
    }),
    validation_type: format!("role_{}", input.requested_role.to_lowercase()),
    approved: true,
    notes: Some(format!("Agent validated for {} role", input.requested_role)),
  };

  let receipt_result = create_validation_receipt(receipt_input)?;

  Ok(ValidateSpecializedRoleOutput {
    validation_receipt_hash: receipt_result.receipt_hash,
    role_approved: true,
    role_granted: input.requested_role,
  })
}
