use hdk::prelude::*;
use zome_gouvernance_integrity::*;

pub mod commitment;
pub mod economic_event;
pub mod validation;

pub use commitment::*;
pub use economic_event::*;
pub use validation::*;

#[derive(Debug, thiserror::Error)]
pub enum GovernanceError {
  #[error("Validation receipt not found: {0}")]
  ValidationReceiptNotFound(String),

  #[error("Economic event not found: {0}")]
  EconomicEventNotFound(String),

  #[error("Resource validation not found: {0}")]
  ResourceValidationNotFound(String),

  #[error("Commitment not found: {0}")]
  CommitmentNotFound(String),

  #[error("Not authorized for this validation")]
  NotAuthorizedValidator,

  #[error("Insufficient capability level: {0}")]
  InsufficientCapability(String),

  #[error("Validation already exists for this item: {0}")]
  ValidationAlreadyExists(String),

  #[error("Invalid validation scheme: {0}")]
  InvalidValidationScheme(String),

  #[error("Serialization error: {0}")]
  SerializationError(String),

  #[error("Entry operation failed: {0}")]
  EntryOperationFailed(String),

  #[error("Link operation failed: {0}")]
  LinkOperationFailed(String),

  #[error("Invalid input: {0}")]
  InvalidInput(String),

  #[error("Cross-zome call failed: {0}")]
  CrossZomeCallFailed(String),
}

impl From<GovernanceError> for WasmError {
  fn from(err: GovernanceError) -> Self {
    wasm_error!(WasmErrorInner::Guest(err.to_string()))
  }
}

#[allow(clippy::large_enum_variant)]
#[derive(Serialize, Deserialize, Debug)]
#[serde(tag = "type")]
pub enum Signal {
  LinkCreated {
    action: SignedActionHashed,
  },
  LinkDeleted {
    action: SignedActionHashed,
  },
  EntryCreated {
    action: SignedActionHashed,
  },
  EntryUpdated {
    action: SignedActionHashed,
  },
  EntryDeleted {
    action: SignedActionHashed,
  },
}

#[hdk_extern]
pub fn init(_: ()) -> ExternResult<InitCallbackResult> {
  Ok(InitCallbackResult::Pass)
}

<<<<<<< HEAD
#[hdk_extern(infallible)]
pub fn post_commit(committed_actions: Vec<SignedActionHashed>) {
=======
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

#[derive(Serialize, Deserialize, Debug)]
pub struct LogEconomicEventInput {
  pub action: VfAction,
  pub provider: AgentPubKey,
  pub receiver: AgentPubKey,
  pub resource_inventoried_as: ActionHash,
  pub resource_quantity: f64,
  pub note: Option<String>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct LogEconomicEventOutput {
  pub event_hash: ActionHash,
  pub event: EconomicEvent,
}

#[hdk_extern]
pub fn log_economic_event(input: LogEconomicEventInput) -> ExternResult<LogEconomicEventOutput> {
  let now = sys_time()?;

  // TODO: In Phase 2, add proper authorization checks
  // TODO: In Phase 2, validate the resource exists and check governance rules

  let event = EconomicEvent {
    action: input.action,
    provider: input.provider,
    receiver: input.receiver,
    resource_inventoried_as: input.resource_inventoried_as.clone(),
    affects: input.resource_inventoried_as.clone(), // For now, same as inventoried_as
    resource_quantity: input.resource_quantity,
    event_time: now,
    note: input.note,
  };

  let event_hash = create_entry(&EntryTypes::EconomicEvent(event.clone()))?;

  // Create discovery link
  let path = Path::from("all_economic_events");
  let anchor_hash = path.path_entry_hash()?;
  create_link(
    anchor_hash,
    event_hash.clone(),
    LinkTypes::AllEconomicEvents,
    (),
  )?;

  // Link the event to the resource
  create_link(
    input.resource_inventoried_as,
    event_hash.clone(),
    LinkTypes::ResourceToEvent,
    (),
  )?;

  Ok(LogEconomicEventOutput { event_hash, event })
}

#[derive(Serialize, Deserialize, Debug)]
pub struct LogInitialTransferInput {
  pub resource_hash: ActionHash,
  pub receiver: AgentPubKey,
  pub quantity: f64,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct LogInitialTransferOutput {
  pub event_hash: ActionHash,
  pub event: EconomicEvent,
}

#[hdk_extern]
pub fn log_initial_transfer(
  input: LogInitialTransferInput,
) -> ExternResult<LogInitialTransferOutput> {
  let agent_info = agent_info()?;

  // This is for Simple Agents making their first transaction
  // TODO: In Phase 2, trigger validation process for Simple Agent promotion

  let event_input = LogEconomicEventInput {
    action: VfAction::InitialTransfer,
    provider: agent_info.agent_initial_pubkey,
    receiver: input.receiver,
    resource_inventoried_as: input.resource_hash,
    resource_quantity: input.quantity,
    note: Some("First resource transfer by Simple Agent".to_string()),
  };

  let result = log_economic_event(event_input)?;

  Ok(LogInitialTransferOutput {
    event_hash: result.event_hash,
    event: result.event,
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

#[derive(Serialize, Deserialize, Debug)]
pub struct ValidateNewResourceInput {
  pub resource_hash: ActionHash,
  pub validation_scheme: String, // e.g., "simple_majority", "2-of-3"
  pub resource_type: String, // From ResourceSpecification
  pub creator: AgentPubKey,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct ValidateNewResourceOutput {
  pub validation_hash: ActionHash,
  pub validation: ResourceValidation,
  pub status: String, // "pending", "approved", "rejected"
}

#[derive(Serialize, Deserialize, Debug)]
pub struct ValidateAgentIdentityInput {
  pub agent_to_validate: AgentPubKey,
  pub promotion_type: String, // "simple_to_accountable", "acquire_specialized_role"
  pub role_requested: Option<String>, // e.g., "Transport", "Repair", "Storage"
  pub resource_created: Option<ActionHash>, // For simple_to_accountable promotion
}

#[derive(Serialize, Deserialize, Debug)]
pub struct ValidateAgentIdentityOutput {
  pub validation_hash: ActionHash,
  pub validation_receipt: ValidationReceipt,
  pub promotion_approved: bool,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct ProposeCommitmentInput {
  pub action: VfAction,
  pub resource_hash: Option<ActionHash>,
  pub resource_spec_hash: Option<ActionHash>,
  pub provider: AgentPubKey,
  pub due_date: Timestamp,
  pub note: Option<String>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct ProposeCommitmentOutput {
  pub commitment_hash: ActionHash,
  pub commitment: Commitment,
}

#[hdk_extern]
pub fn propose_commitment(input: ProposeCommitmentInput) -> ExternResult<ProposeCommitmentOutput> {
  let agent_info = agent_info()?;
  let now = sys_time()?;

  // TODO: In Phase 2, check that the calling agent has restricted_access capability

  let commitment = Commitment {
    action: input.action,
    provider: input.provider,
    receiver: agent_info.agent_initial_pubkey,
    resource_inventoried_as: input.resource_hash,
    resource_conforms_to: input.resource_spec_hash,
    input_of: None, // TODO: Add process support in Phase 4
    due_date: input.due_date,
    note: input.note,
    committed_at: now,
  };

  let commitment_hash = create_entry(&EntryTypes::Commitment(commitment.clone()))?;

  // Create discovery link
  let path = Path::from("all_commitments");
  let anchor_hash = path.path_entry_hash()?;
  create_link(
    anchor_hash,
    commitment_hash.clone(),
    LinkTypes::AllCommitments,
    (),
  )?;

  Ok(ProposeCommitmentOutput {
    commitment_hash,
    commitment,
  })
}

#[hdk_extern]
pub fn validate_new_resource(input: ValidateNewResourceInput) -> ExternResult<ValidateNewResourceOutput> {
  let _agent_info = agent_info()?;
  let now = sys_time()?;

  // TODO: In Phase 2, check that the calling agent is an Accountable Agent
  // TODO: In Phase 2, verify resource exists via cross-zome call to resource zome
  
  // Create the resource validation entry
  let validation = ResourceValidation {
    resource: input.resource_hash.clone(),
    validation_scheme: input.validation_scheme.clone(),
    required_validators: match input.validation_scheme.as_str() {
      "simple_majority" => 3, // Need majority of 3
      "2-of-3" => 3,         // Need 2 out of 3
      "single_reviewer" => 1, // Only 1 validator needed
      _ => 2, // Default to 2 validators
    },
    current_validators: 0,
    status: "pending".to_string(),
    created_at: now,
    updated_at: now,
  };

  let validation_hash = create_entry(&EntryTypes::ResourceValidation(validation.clone()))?;

  // Create discovery links
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
    input.resource_hash,
    validation_hash.clone(),
    LinkTypes::ResourceToValidation,
    (),
  )?;

  Ok(ValidateNewResourceOutput {
    validation_hash,
    validation,
    status: "pending".to_string(),
  })
}

#[hdk_extern]
pub fn validate_agent_identity(input: ValidateAgentIdentityInput) -> ExternResult<ValidateAgentIdentityOutput> {
  let agent_info = agent_info()?;
  let now = sys_time()?;

  // TODO: In Phase 2, check that the calling agent is an Accountable Agent
  // TODO: In Phase 2, implement cross-zome call to verify agent and resource exist
  
  let validation_type = match input.promotion_type.as_str() {
    "simple_to_accountable" => "agent_promotion_to_accountable",
    "acquire_specialized_role" => &format!("acquire_role_{}", input.role_requested.clone().unwrap_or("unknown".to_string())),
    _ => "unknown_promotion_type",
  };

  // Create a validation receipt for this agent identity validation
  let receipt = ValidationReceipt {
    validator: agent_info.agent_initial_pubkey,
    validated_item: ActionHash::from_raw_36(input.agent_to_validate.get_raw_36().to_vec()), // Convert AgentPubKey to ActionHash for consistency
    validation_type: validation_type.to_string(),
    approved: true, // For Phase 1, auto-approve. In Phase 2, implement proper validation logic
    notes: Some(format!("Agent identity validation for promotion: {}", input.promotion_type)),
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

  // Link the receipt to the validated agent (using the agent's pubkey converted to ActionHash)
  let agent_as_action_hash = ActionHash::from_raw_36(input.agent_to_validate.get_raw_36().to_vec());
  create_link(
    agent_as_action_hash,
    receipt_hash.clone(),
    LinkTypes::ValidatedItemToReceipt,
    (),
  )?;

  Ok(ValidateAgentIdentityOutput {
    validation_hash: receipt_hash,
    validation_receipt: receipt,
    promotion_approved: true, // For Phase 1, auto-approve
  })
}

#[hdk_extern]
pub fn update_validation_status(validation_hash: ActionHash) -> ExternResult<ResourceValidation> {
  // Get the current validation
  if let Some(record) = get(validation_hash.clone(), GetOptions::default())? {
    if let Ok(Some(EntryTypes::ResourceValidation(mut validation))) =
      record.entry().to_app_option::<EntryTypes>().map_err(|_| {
        wasm_error!(WasmErrorInner::Guest(
          "Failed to deserialize resource validation".into()
        ))
      })
    {
      // Get validation receipts for this resource
      let receipts = get_validation_history(validation.resource.clone())?;
      let approval_count = receipts.iter().filter(|r| r.approved).count() as u32;
      
      validation.current_validators = approval_count;
      validation.updated_at = sys_time()?;
      
      // Update status based on validation scheme
      if approval_count >= validation.required_validators {
        validation.status = "approved".to_string();
      } else if receipts.len() as u32 > validation.required_validators && approval_count < validation.required_validators {
        validation.status = "rejected".to_string();
      } else {
        validation.status = "pending".to_string();
      }

      // Update the entry
      let _updated_hash = update_entry(record.action_hashed().hash.clone(), &EntryTypes::ResourceValidation(validation.clone()))?;
      
      return Ok(validation);
    }
  }

  Err(wasm_error!(WasmErrorInner::Guest(
    "Validation not found".into()
  )))
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

#[hdk_extern]
pub fn get_all_economic_events(_: ()) -> ExternResult<Vec<EconomicEvent>> {
  let path = Path::from("all_economic_events");
  let anchor_hash = path.path_entry_hash()?;

  let links =
    get_links(GetLinksInputBuilder::try_new(anchor_hash, LinkTypes::AllEconomicEvents)?.build())?;
  let mut events = Vec::new();

  for link in links {
    if let Ok(any_dht_hash) = AnyDhtHash::try_from(link.target.clone()) {
      if let Some(record) = get(any_dht_hash, GetOptions::default())? {
        if let Ok(Some(EntryTypes::EconomicEvent(event))) =
          record.entry().to_app_option::<EntryTypes>().map_err(|_| {
            wasm_error!(WasmErrorInner::Guest(
              "Failed to deserialize economic event".into()
            ))
          })
        {
          events.push(event);
        }
      }
    }
  }

  Ok(events)
}

#[derive(Serialize, Deserialize, Debug)]
pub struct SubmitValidationVoteInput {
  pub validation_hash: ActionHash,
  pub vote: bool, // true = approve, false = reject
  pub notes: Option<String>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct SubmitValidationVoteOutput {
  pub receipt_hash: ActionHash,
  pub receipt: ValidationReceipt,
  pub validation_status: String, // "pending", "approved", "rejected"
}

#[hdk_extern]
pub fn submit_validation_vote(input: SubmitValidationVoteInput) -> ExternResult<SubmitValidationVoteOutput> {
  let agent_info = agent_info()?;
  
  // TODO: In Phase 2, check that the calling agent is an Accountable Agent
  // TODO: In Phase 2, check that the agent hasn't already voted on this validation
  
  // Get the resource being validated
  let validation_record = get(input.validation_hash.clone(), GetOptions::default())?
    .ok_or_else(|| wasm_error!(WasmErrorInner::Guest("Validation not found".into())))?;
    
  let validation = match validation_record.entry().to_app_option::<EntryTypes>()
    .map_err(|_| wasm_error!(WasmErrorInner::Guest("Failed to deserialize validation".into())))? {
    Some(EntryTypes::ResourceValidation(v)) => v,
    _ => return Err(wasm_error!(WasmErrorInner::Guest("Invalid validation entry".into()))),
  };

  // Create validation receipt
  let receipt = ValidationReceipt {
    validator: agent_info.agent_initial_pubkey,
    validated_item: validation.resource.clone(),
    validation_type: format!("resource_validation_{}", validation.validation_scheme),
    approved: input.vote,
    notes: input.notes,
    validated_at: sys_time()?,
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

  // Link the receipt to the validated resource
  create_link(
    validation.resource.clone(),
    receipt_hash.clone(),
    LinkTypes::ValidatedItemToReceipt,
    (),
  )?;

  // Update validation status based on new vote
  let updated_validation = update_validation_status(input.validation_hash)?;

  Ok(SubmitValidationVoteOutput {
    receipt_hash,
    receipt,
    validation_status: updated_validation.status,
  })
}

#[derive(Serialize, Deserialize, Debug)]
pub struct GetValidationResultInput {
  pub resource_hash: ActionHash,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct GetValidationResultOutput {
  pub validation: Option<ResourceValidation>,
  pub receipts: Vec<ValidationReceipt>,
  pub consensus_reached: bool,
  pub final_status: String, // "pending", "approved", "rejected"
}

#[hdk_extern]
pub fn get_validation_result(input: GetValidationResultInput) -> ExternResult<GetValidationResultOutput> {
  // Get the validation for this resource
  let validation = check_validation_status(input.resource_hash.clone())?;
  
  // Get all validation receipts for this resource
  let receipts = get_validation_history(input.resource_hash)?;
  
  let (consensus_reached, final_status) = if let Some(ref v) = validation {
    let consensus = v.status != "pending";
    (consensus, v.status.clone())
  } else {
    (false, "no_validation".to_string())
  };

  Ok(GetValidationResultOutput {
    validation,
    receipts,
    consensus_reached,
    final_status,
  })
}

#[derive(Serialize, Deserialize, Debug)]
pub struct GetAllResourceValidationsOutput {
  pub validations: Vec<(ActionHash, ResourceValidation)>,
}

#[hdk_extern]
pub fn get_all_resource_validations(_: ()) -> ExternResult<GetAllResourceValidationsOutput> {
  let path = Path::from("all_resource_validations");
  let anchor_hash = path.path_entry_hash()?;

  let links = get_links(
    GetLinksInputBuilder::try_new(anchor_hash, LinkTypes::AllResourceValidations)?.build(),
  )?;
  let mut validations = Vec::new();

  for link in links {
    if let Ok(any_dht_hash) = AnyDhtHash::try_from(link.target.clone()) {
      if let Some(record) = get(any_dht_hash, GetOptions::default())? {
        if let Ok(Some(EntryTypes::ResourceValidation(validation))) =
          record.entry().to_app_option::<EntryTypes>().map_err(|_| {
            wasm_error!(WasmErrorInner::Guest(
              "Failed to deserialize resource validation".into()
            ))
          })
        {
          let validation_hash = record.action_hashed().hash.clone();
          validations.push((validation_hash, validation));
        }
      }
    }
  }

  Ok(GetAllResourceValidationsOutput { validations })
}

#[hdk_extern]
pub fn post_commit(committed_actions: Vec<SignedActionHashed>) -> ExternResult<()> {
  // Handle any post-commit logic for governance-related actions
>>>>>>> bcf505e (feat(validation): implement resource and agent identity validation mechanisms)
  for action in committed_actions {
    if let Err(err) = signal_action(action) {
      error!("Error signaling new action: {:?}", err);
    }
  }
}

fn signal_action(action: SignedActionHashed) -> ExternResult<()> {
  match action.hashed.content.clone() {
    Action::CreateLink(_) => {
      emit_signal(Signal::LinkCreated { action })?;
      Ok(())
    }
    Action::DeleteLink(_) => {
      emit_signal(Signal::LinkDeleted { action })?;
      Ok(())
    }
    Action::Create(_) => {
      emit_signal(Signal::EntryCreated { action })?;
      Ok(())
    }
    Action::Update(_) => {
      emit_signal(Signal::EntryUpdated { action })?;
      Ok(())
    }
    Action::Delete(_) => {
      emit_signal(Signal::EntryDeleted { action })?;
      Ok(())
    }
    _ => Ok(()),
  }
}

fn get_entry_for_action(action_hash: &ActionHash) -> ExternResult<Option<EntryTypes>> {
  let record = match get_details(action_hash.clone(), GetOptions::default())? {
    Some(Details::Record(record_details)) => record_details.record,
    _ => {
      return Ok(None);
    }
  };
  let entry = match record.entry().as_option() {
    Some(entry) => entry,
    None => {
      return Ok(None);
    }
  };
  let (zome_index, entry_index) = match record.action().entry_type() {
    Some(EntryType::App(AppEntryDef {
      zome_index,
      entry_index,
      ..
    })) => (zome_index, entry_index),
    _ => {
      return Ok(None);
    }
  };
  EntryTypes::deserialize_from_type(*zome_index, *entry_index, entry)
}
