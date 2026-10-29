use hdk::prelude::*;
pub use nondominium_shared::errors::GovernanceError;
use std::collections::HashSet;
use zome_gouvernance_integrity::*;

pub mod commitment;
pub mod economic_event;
pub mod fulfillment;
pub mod ppr;
pub mod private_data_validation;
pub mod validation;
// NDO federation extensions (issue #100)
pub mod agreement;
pub mod contribution;
pub mod hard_link;
// Phase B: governance-as-operator transition interface (parallel path)
pub mod transition;

pub use commitment::*;
pub use economic_event::*;
pub use fulfillment::*;
pub use ppr::*;
pub use private_data_validation::*;
pub use validation::*;
pub use agreement::*;
pub use contribution::*;
pub use hard_link::*;
pub use transition::*;

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
  // Expose `countersign_fulfillment` as an unrestricted cap grant so the
  // other party to a Commitment can be reached via `call_remote` during
  // `fulfill_commitment_closure`. The authorisation is semantic
  // (the fn re-fetches the commitment and verifies I'm actually the
  // counterparty), so cap-token gating here would just be ceremony.
  //
  // Fixes #14's placeholder-signature problem at the architectural layer:
  // without this grant, call_remote would come back as `Unauthorized`.
  let mut functions: HashSet<GrantedFunction> = HashSet::new();
  functions.insert((
    ZomeName::from("zome_gouvernance".to_string()),
    FunctionName::from("countersign_fulfillment".to_string()),
  ));
  let cap_grant = ZomeCallCapGrant {
    tag: "countersign_fulfillment".to_string(),
    access: CapAccess::Unrestricted,
    functions: GrantedFunctions::Listed(functions),
  };
  create_cap_grant(cap_grant)?;

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

// ============================================================================
// Agent Promotion Helper Functions with PPR Integration
// ============================================================================

/// Generate PPRs for agent promotion validation process
fn generate_promotion_validation_pprs(
  promoted_agent: AgentPubKey,
  validator_agent: AgentPubKey,
  resource_hash: ActionHash,
  validation_hash: ActionHash,
) -> ExternResult<IssueParticipationReceiptsOutput> {
  // Create appropriate claim types for agent promotion
  let claim_types = vec![
    ParticipationClaimType::ResourceValidation, // Validator gets this
    ParticipationClaimType::RuleCompliance,     // Promoted agent gets this
  ];

  // Use good performance metrics for promotion validation
  let good_metrics = PerformanceMetrics {
    timeliness: 1.0,
    quality: 1.0,
    reliability: 1.0,
    communication: 1.0,
    overall_satisfaction: 1.0,
    notes: Some("Agent promotion validation completed successfully".to_string()),
  };

  let input = IssueParticipationReceiptsInput {
    fulfills: validation_hash.clone(), // The validation acts as both commitment and fulfillment
    fulfilled_by: validation_hash,     // The validation event
    provider: validator_agent,         // Validator is the provider
    receiver: promoted_agent,          // Promoted agent is the receiver
    claim_types,
    provider_metrics: good_metrics.clone(),
    receiver_metrics: good_metrics,
    resource_hash: Some(resource_hash),
    notes: Some("Agent promotion validation with PPR generation".to_string()),
  };

  issue_participation_receipts(input)
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
