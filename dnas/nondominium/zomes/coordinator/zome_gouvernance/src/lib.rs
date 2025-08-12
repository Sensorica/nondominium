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
  LinkCreated { action: SignedActionHashed },
  LinkDeleted { action: SignedActionHashed },
  EntryCreated { action: SignedActionHashed },
  EntryUpdated { action: SignedActionHashed },
  EntryDeleted { action: SignedActionHashed },
}

#[hdk_extern]
pub fn init(_: ()) -> ExternResult<InitCallbackResult> {
  Ok(InitCallbackResult::Pass)
}

#[hdk_extern(infallible)]
pub fn post_commit(committed_actions: Vec<SignedActionHashed>) {
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
