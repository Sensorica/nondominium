use hdk::prelude::*;
use zome_gouvernance_integrity::*;

// ============================================================================
// Economic Event Management
// ============================================================================

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
pub fn get_events_for_resource(resource_hash: ActionHash) -> ExternResult<Vec<EconomicEvent>> {
  let links = get_links(
    GetLinksInputBuilder::try_new(resource_hash, LinkTypes::ResourceToEvent)?.build(),
  )?;
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
pub fn get_events_for_agent(agent: AgentPubKey) -> ExternResult<Vec<EconomicEvent>> {
  // Get all events where agent is provider or receiver
  let all_events = get_all_economic_events(())?;
  
  let agent_events: Vec<EconomicEvent> = all_events
    .into_iter()
    .filter(|event| event.provider == agent || event.receiver == agent)
    .collect();

  Ok(agent_events)
}