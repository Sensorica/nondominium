use hdk::prelude::*;
use zome_gouvernance_integrity::*;

#[hdk_extern]
pub fn init(_: ()) -> ExternResult<InitCallbackResult> {
  Ok(InitCallbackResult::Pass)
}

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

#[hdk_extern]
pub fn post_commit(committed_actions: Vec<SignedActionHashed>) -> ExternResult<()> {
  // Handle any post-commit logic for governance-related actions
  for action in committed_actions {
    if let Action::Create(create_action) = action.action() {
      // Could emit signals here for real-time updates
      let _entry_type = create_action.entry_type.clone();
      // TODO: Implement signaling for new validations, events, etc.
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
