use hdk::prelude::*;

pub mod resource_specification;
pub mod economic_resource;
pub mod governance_rule;

pub use resource_specification::*;
pub use economic_resource::*;
pub use governance_rule::*;

#[derive(Debug, thiserror::Error)]
pub enum ResourceError {
    #[error("Resource specification not found: {0}")]
    ResourceSpecNotFound(String),

    #[error("Economic resource not found: {0}")]
    EconomicResourceNotFound(String),

    #[error("Governance rule not found: {0}")]
    GovernanceRuleNotFound(String),

    #[error("Not the author of this entry")]
    NotAuthor,

    #[error("Not the custodian of this resource")]
    NotCustodian,

    #[error("Serialization error: {0}")]
    SerializationError(String),

    #[error("Entry operation failed: {0}")]
    EntryOperationFailed(String),

    #[error("Link operation failed: {0}")]
    LinkOperationFailed(String),

    #[error("Invalid input: {0}")]
    InvalidInput(String),

    #[error("Governance rule violation: {0}")]
    GovernanceViolation(String),
}

impl From<ResourceError> for WasmError {
    fn from(err: ResourceError) -> Self {
        wasm_error!(WasmErrorInner::Guest(err.to_string()))
    }
}

#[allow(clippy::large_enum_variant)]
#[derive(Serialize, Deserialize, Debug)]
#[serde(tag = "type")]
pub enum Signal {
    LinkCreated {
        action: SignedActionHashed,
        link_type: zome_resource_integrity::LinkTypes,
    },
    LinkDeleted {
        action: SignedActionHashed,
        link_type: zome_resource_integrity::LinkTypes,
    },
    EntryCreated {
        action: SignedActionHashed,
        app_entry: zome_resource_integrity::EntryTypes,
    },
    EntryUpdated {
        action: SignedActionHashed,
        app_entry: zome_resource_integrity::EntryTypes,
        original_app_entry: zome_resource_integrity::EntryTypes,
    },
    EntryDeleted {
        action: SignedActionHashed,
        original_app_entry: zome_resource_integrity::EntryTypes,
    },
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
    use zome_resource_integrity::*;
    
    match action.hashed.content.clone() {
        Action::CreateLink(create_link) => {
            if let Ok(Some(link_type)) =
                LinkTypes::from_type(create_link.zome_index, create_link.link_type)
            {
                emit_signal(Signal::LinkCreated { action, link_type })?;
            }
            Ok(())
        }
        Action::DeleteLink(delete_link) => {
            let record = get(delete_link.link_add_address.clone(), GetOptions::default())?.ok_or(
                ResourceError::LinkOperationFailed("Failed to fetch CreateLink action".to_string()),
            )?;
            match record.action() {
                Action::CreateLink(create_link) => {
                    if let Ok(Some(link_type)) =
                        LinkTypes::from_type(create_link.zome_index, create_link.link_type)
                    {
                        emit_signal(Signal::LinkDeleted { action, link_type })?;
                    }
                    Ok(())
                }
                _ => Err(ResourceError::LinkOperationFailed("Create Link should exist".to_string()).into()),
            }
        }
        Action::Create(_create) => {
            if let Ok(Some(app_entry)) = get_entry_for_action(&action.hashed.hash) {
                emit_signal(Signal::EntryCreated { action, app_entry })?;
            }
            Ok(())
        }
        Action::Update(update) => {
            if let Ok(Some(app_entry)) = get_entry_for_action(&action.hashed.hash) {
                if let Ok(Some(original_app_entry)) = get_entry_for_action(&update.original_action_address)
                {
                    emit_signal(Signal::EntryUpdated {
                        action,
                        app_entry,
                        original_app_entry,
                    })?;
                }
            }
            Ok(())
        }
        Action::Delete(delete) => {
            if let Ok(Some(original_app_entry)) = get_entry_for_action(&delete.deletes_address) {
                emit_signal(Signal::EntryDeleted {
                    action,
                    original_app_entry,
                })?;
            }
            Ok(())
        }
        _ => Ok(()),
    }
}

fn get_entry_for_action(action_hash: &ActionHash) -> ExternResult<Option<zome_resource_integrity::EntryTypes>> {
    use zome_resource_integrity::*;
    
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









