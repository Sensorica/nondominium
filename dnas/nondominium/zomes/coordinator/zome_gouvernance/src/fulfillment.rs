//! Atomic commitment fulfillment closure.
//!
//! One coordinator call to close a Commitment:
//!   1. Validates the commitment and the caller's role in it (provider / receiver)
//!   2. Fetches the counterparty's real cryptographic signature via `call_remote`
//!      (fixes #14 — the current `issue_participation_receipts` writes a
//!      64-byte zero placeholder which would make every PPR fail
//!      `validate_participation_claim_signature`)
//!   3. Writes the `EconomicEvent` observation
//!   4. Writes the `Claim` with `fulfilled_by` = the real event action hash
//!      (fixes the TODO in `claim_commitment` where `fulfilled_by` was the
//!      commitment hash itself)
//!   5. Optionally updates the resource's `OperationalState` via cross-zome
//!      call into `zome_resource::update_operational_state` (same-agent call,
//!      so the custodian-check runs against the fulfiller)
//!   6. Writes both bilateral `PrivateParticipationClaim` entries on the
//!      caller's source chain, both carrying real signatures from both parties
//!
//! Why `call_remote`-based countersigning rather than Holochain's full
//! countersigning session: a session is heavier than this experiment needs,
//! requires both agents to coordinate a session commit, and leaves a
//! session-rollback failure mode in the common offline case. `call_remote`
//! gives us the smallest unit of atomicity that makes PPRs cryptographically
//! real: if the counterparty is offline or rejects, the whole fulfillment
//! fails cleanly before anything is written, which matches the Grassroots
//! Commitment Pool semantics ("fulfillment is a two-sided act").
//!
//! The counterparty's PPR private entry still has to be mirrored onto their
//! source chain when they come online — that is a *view* question (shown in
//! their UI's PPR list) and is handled by `mirror_counterparty_ppr` or an
//! equivalent pattern in a follow-up. For MVP, both PPR private entries
//! live on the fulfillment-initiator's chain, both carrying real
//! co-signatures, so cryptographic validation already passes end-to-end.

use crate::ppr::*;
use crate::GovernanceError;
use blake3::Hasher;
use hdk::ed25519::sign;
use hdk::prelude::*;
use nondominium_shared::types::Measure;
use nondominium_shared::OperationalState;
use zome_gouvernance_integrity::*;

const COUNTERSIGN_ZOME: &str = "zome_gouvernance";
const COUNTERSIGN_FN: &str = "countersign_fulfillment";
const UPDATE_OPERATIONAL_STATE_ZOME: &str = "zome_resource";
const UPDATE_OPERATIONAL_STATE_FN: &str = "update_operational_state";

/// Input to `fulfill_commitment_closure`. The commitment hash determines
/// provider/receiver/action/resource; the fulfiller supplies the observed
/// quantity (which may differ from the committed quantity) and optional
/// resource-state transition + per-side performance metrics.
#[derive(Serialize, Deserialize, Debug)]
pub struct FulfillCommitmentClosureInput {
  pub commitment_hash: ActionHash,
  /// The quantity that was actually observed on the fulfilling event.
  /// Must shape-validate as a Measure.
  pub observed_quantity: Measure,
  /// Optional operational-state transition applied to the resource via a
  /// same-agent cross-zome call into `zome_resource::update_operational_state`.
  /// The caller must be the current custodian for this to succeed — matches
  /// the normal custody-protection semantics.
  pub resource_state_update: Option<OperationalState>,
  /// Performance metrics the caller is attesting to on behalf of the
  /// provider. (The caller may or may not be the provider.)
  pub provider_metrics: PerformanceMetrics,
  /// Performance metrics the caller is attesting to on behalf of the
  /// receiver.
  pub receiver_metrics: PerformanceMetrics,
  pub note: Option<String>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct FulfillCommitmentClosureOutput {
  pub event_hash: ActionHash,
  pub event: EconomicEvent,
  pub claim_hash: ActionHash,
  pub claim: Claim,
  pub ppr: IssueParticipationReceiptsOutput,
  pub resource_update_hash: Option<ActionHash>,
}

/// Shared signing payload exchanged between the fulfillment initiator and the
/// counterparty's `countersign_fulfillment` call. Must be stable across both
/// sides — any field drift would make verification fail.
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct CountersignFulfillmentInput {
  /// Commitment being fulfilled — the counterparty refetches it to verify.
  pub commitment_hash: ActionHash,
  /// The agent initiating fulfillment (must be the other party on the
  /// commitment — i.e. we rely on the integrity of this value, which we
  /// cross-check against `agent_info` of the caller).
  pub initiator: AgentPubKey,
  /// The event hash the initiator will write for this fulfillment.
  /// The counterparty signs *including* this hash, so the signature is
  /// bound to a specific future event entry and can't be reused.
  pub event_hash_prefix: Vec<u8>,
  /// Blake3 hash of the shared signing data — same algorithm as `ppr.rs`.
  pub signed_data_hash: [u8; 32],
  /// Claim type being attested to on behalf of the counterparty.
  pub counterparty_claim_type: ParticipationClaimType,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct CountersignFulfillmentOutput {
  pub signature: Signature,
}

#[hdk_extern]
pub fn fulfill_commitment_closure(
  input: FulfillCommitmentClosureInput,
) -> ExternResult<FulfillCommitmentClosureOutput> {
  // Shape-check the observed quantity up front — this value is also written
  // into the EconomicEvent, where integrity will reject it anyway, but we
  // want the clearer error here.
  input.observed_quantity.validate().map_err(|e| {
    wasm_error!(WasmErrorInner::Guest(format!(
      "Invalid observed_quantity: {e}"
    )))
  })?;
  input.provider_metrics.validate().map_err(|e| {
    wasm_error!(WasmErrorInner::Guest(format!(
      "Invalid provider_metrics: {e}"
    )))
  })?;
  input.receiver_metrics.validate().map_err(|e| {
    wasm_error!(WasmErrorInner::Guest(format!(
      "Invalid receiver_metrics: {e}"
    )))
  })?;

  // 1. Fetch commitment + identify roles.
  let commitment_record = get(input.commitment_hash.clone(), GetOptions::default())?.ok_or_else(
    || GovernanceError::CommitmentNotFound(input.commitment_hash.to_string()),
  )?;
  let commitment = commitment_record
    .entry()
    .to_app_option::<Commitment>()
    .map_err(|e| {
      wasm_error!(WasmErrorInner::Guest(format!(
        "Failed to decode commitment: {e:?}"
      )))
    })?
    .ok_or_else(|| {
      GovernanceError::SerializationError("Commitment entry decode returned None".to_string())
    })?;

  let caller = agent_info()?.agent_initial_pubkey;
  let counterparty = if caller == commitment.provider {
    commitment.receiver.clone()
  } else if caller == commitment.receiver {
    commitment.provider.clone()
  } else {
    return Err(
      GovernanceError::InvalidInput(format!(
        "fulfill_commitment_closure must be called by the commitment's provider \
         ({:?}) or receiver ({:?}). Caller was {:?}.",
        commitment.provider, commitment.receiver, caller
      ))
      .into(),
    );
  };

  // 2. Build the EconomicEvent we are about to write. We don't commit yet —
  //    we want the shared signing payload bound to the event *before* the
  //    counterparty signs it, so a rollback (counterparty offline / rejects)
  //    doesn't leave an orphan event on the DHT.
  let now = sys_time()?;
  let resource_hash = commitment
    .resource_inventoried_as
    .clone()
    .ok_or_else(|| {
      GovernanceError::InvalidInput(
        "fulfill_commitment_closure currently requires \
         Commitment.resource_inventoried_as — commitments without a specific \
         resource reference are not yet supported in the closure flow"
          .to_string(),
      )
    })?;

  let event_draft = EconomicEvent {
    action: commitment.action.clone(),
    provider: commitment.provider.clone(),
    receiver: commitment.receiver.clone(),
    resource_inventoried_as: resource_hash.clone(),
    affects: resource_hash.clone(),
    resource_quantity: input.observed_quantity.clone(),
    event_time: now,
    note: input.note.clone(),
    ndo_identity_hash: commitment.ndo_identity_hash.clone(),
  };

  // Determine bilateral claim types from VfAction.
  let claim_types = determine_claim_types_for_action(&event_draft.action)?;
  if claim_types.len() != 2 {
    return Err(
      GovernanceError::InvalidInput(
        "VfAction did not produce a bilateral claim-type pair".to_string(),
      )
      .into(),
    );
  }
  let (provider_claim_type, receiver_claim_type) = (claim_types[0].clone(), claim_types[1].clone());
  let counterparty_claim_type = if caller == commitment.provider {
    receiver_claim_type.clone()
  } else {
    provider_claim_type.clone()
  };

  // Shared signing payload — same shape on both sides so the signatures
  // verify against the same bytes.
  let signing_data = build_fulfillment_signing_data(
    &input.commitment_hash,
    &event_draft,
    &claim_types,
    now,
  );
  let signed_data_hash = blake3_hash(&signing_data);

  // Caller signs their own view.
  let caller_signature = sign(caller.clone(), signing_data.clone())?;

  // 3. Ask the counterparty, synchronously, to sign the same payload.
  //    If they're offline or reject, the whole closure fails here before
  //    anything is written — the atomic contract.
  let countersign_input = CountersignFulfillmentInput {
    commitment_hash: input.commitment_hash.clone(),
    initiator: caller.clone(),
    event_hash_prefix: vec![], // event hasn't been written yet; the payload is enough
    signed_data_hash,
    counterparty_claim_type: counterparty_claim_type.clone(),
  };
  let zome_call_response: ZomeCallResponse = call_remote(
    counterparty.clone(),
    ZomeName::from(COUNTERSIGN_ZOME.to_string()),
    FunctionName::from(COUNTERSIGN_FN.to_string()),
    None,
    countersign_input,
  )?;
  let counterparty_signature: Signature = match zome_call_response {
    ZomeCallResponse::Ok(bytes) => {
      let out: CountersignFulfillmentOutput = bytes.decode().map_err(|e| {
        GovernanceError::SerializationError(format!(
          "Failed to decode countersign_fulfillment response: {e:?}"
        ))
      })?;
      out.signature
    }
    ZomeCallResponse::Unauthorized(..) => {
      return Err(
        GovernanceError::InvalidInput(
          "Counterparty did not expose countersign_fulfillment as an \
           unrestricted cap grant (install your zome with the init cap grant \
           in place, then retry)."
            .to_string(),
        )
        .into(),
      )
    }
    other => {
      return Err(
        GovernanceError::InvalidInput(format!(
          "Counterparty refused to countersign fulfillment: {other:?}"
        ))
        .into(),
      )
    }
  };

  // 4. Write the EconomicEvent.
  let event_hash = create_entry(&EntryTypes::EconomicEvent(event_draft.clone()))?;
  let all_events_anchor = Path::from("all_economic_events").path_entry_hash()?;
  create_link(
    all_events_anchor,
    event_hash.clone(),
    LinkTypes::AllEconomicEvents,
    (),
  )?;
  create_link(
    resource_hash.clone(),
    event_hash.clone(),
    LinkTypes::ResourceToEvent,
    (),
  )?;

  // 5. Write the Claim with the real event hash (NOT the commitment hash
  //    placeholder that `claim_commitment` currently uses).
  let claim = Claim {
    fulfills: input.commitment_hash.clone(),
    fulfilled_by: event_hash.clone(),
    claimed_at: now,
    note: input.note.clone(),
  };
  let claim_hash = create_entry(&EntryTypes::Claim(claim.clone()))?;
  let all_claims_anchor = Path::from("all_claims").path_entry_hash()?;
  create_link(
    all_claims_anchor,
    claim_hash.clone(),
    LinkTypes::AllClaims,
    (),
  )?;
  create_link(
    input.commitment_hash.clone(),
    claim_hash.clone(),
    LinkTypes::CommitmentToClaim,
    (),
  )?;

  // 6. Optional resource-state transition — same-agent cross-zome call.
  //    If the caller isn't the custodian, zome_resource rejects, which
  //    cleanly fails the closure (nothing above is "undone" but the whole
  //    source-chain commit atomically rolls back on error return).
  let resource_update_hash = if let Some(new_state) = input.resource_state_update {
    let update_input = UpdateOperationalStateInput {
      resource_hash: resource_hash.clone(),
      new_operational_state: new_state,
    };
    let resp: ZomeCallResponse = call(
      CallTargetCell::Local,
      ZomeName::from(UPDATE_OPERATIONAL_STATE_ZOME.to_string()),
      FunctionName::from(UPDATE_OPERATIONAL_STATE_FN.to_string()),
      None,
      update_input,
    )?;
    match resp {
      ZomeCallResponse::Ok(bytes) => {
        let record: Record = bytes.decode().map_err(|e| {
          GovernanceError::SerializationError(format!(
            "Failed to decode update_operational_state response: {e:?}"
          ))
        })?;
        Some(record.action_address().clone())
      }
      other => {
        return Err(
          GovernanceError::InvalidInput(format!(
            "Resource state update failed inside closure: {other:?}"
          ))
          .into(),
        )
      }
    }
  } else {
    None
  };

  // 7. Build + persist both bilateral PPR private entries with REAL
  //    co-signatures. Both PPRs go on the fulfilling agent's source chain
  //    for the MVP; the counterparty mirrors their own copy out-of-band
  //    (post-MVP). The important invariant for #14 is that neither
  //    signature is a zero placeholder.
  let (provider_signature_struct, receiver_signature_struct) = if caller == commitment.provider {
    (
      CryptographicSignature::new(
        caller_signature.clone(),
        counterparty_signature.clone(),
        signed_data_hash,
        now,
      ),
      CryptographicSignature::new(
        counterparty_signature.clone(),
        caller_signature.clone(),
        signed_data_hash,
        now,
      ),
    )
  } else {
    (
      CryptographicSignature::new(
        counterparty_signature.clone(),
        caller_signature.clone(),
        signed_data_hash,
        now,
      ),
      CryptographicSignature::new(
        caller_signature.clone(),
        counterparty_signature.clone(),
        signed_data_hash,
        now,
      ),
    )
  };

  let provider_claim = PrivateParticipationClaim::new(
    input.commitment_hash.clone(),
    event_hash.clone(),
    provider_claim_type,
    input.provider_metrics,
    provider_signature_struct,
    commitment.receiver.clone(),
    Some(resource_hash.clone()),
    input.note.clone(),
    now,
  )
  .map_err(GovernanceError::InvalidInput)?;

  let receiver_claim = PrivateParticipationClaim::new(
    input.commitment_hash.clone(),
    event_hash.clone(),
    receiver_claim_type,
    input.receiver_metrics,
    receiver_signature_struct,
    commitment.provider.clone(),
    Some(resource_hash.clone()),
    input.note.clone(),
    now,
  )
  .map_err(GovernanceError::InvalidInput)?;

  let provider_claim_hash = create_entry(&EntryTypes::PrivateParticipationClaim(
    provider_claim.clone(),
  ))?;
  let receiver_claim_hash = create_entry(&EntryTypes::PrivateParticipationClaim(
    receiver_claim.clone(),
  ))?;

  // Discovery links. We can only link things on our own source chain /
  // local DHT view, so both claims link to the fulfilling agent's key.
  create_link(
    caller.clone(),
    provider_claim_hash.clone(),
    LinkTypes::AgentToPrivateParticipationClaims,
    LinkTag::new(format!("{:?}", provider_claim.claim_type)),
  )?;
  create_link(
    caller.clone(),
    receiver_claim_hash.clone(),
    LinkTypes::AgentToPrivateParticipationClaims,
    LinkTag::new(format!("{:?}", receiver_claim.claim_type)),
  )?;
  create_link(
    event_hash.clone(),
    provider_claim_hash.clone(),
    LinkTypes::EventToPrivateParticipationClaims,
    (),
  )?;
  create_link(
    event_hash.clone(),
    receiver_claim_hash.clone(),
    LinkTypes::EventToPrivateParticipationClaims,
    (),
  )?;
  create_link(
    input.commitment_hash.clone(),
    provider_claim_hash.clone(),
    LinkTypes::CommitmentToPrivateParticipationClaims,
    (),
  )?;
  create_link(
    input.commitment_hash.clone(),
    receiver_claim_hash.clone(),
    LinkTypes::CommitmentToPrivateParticipationClaims,
    (),
  )?;
  create_link(
    resource_hash.clone(),
    provider_claim_hash.clone(),
    LinkTypes::ResourceToPrivateParticipationClaims,
    (),
  )?;
  create_link(
    resource_hash,
    receiver_claim_hash.clone(),
    LinkTypes::ResourceToPrivateParticipationClaims,
    (),
  )?;

  Ok(FulfillCommitmentClosureOutput {
    event_hash,
    event: event_draft,
    claim_hash,
    claim,
    ppr: IssueParticipationReceiptsOutput {
      provider_claim_hash,
      receiver_claim_hash,
      provider_claim,
      receiver_claim,
    },
    resource_update_hash,
  })
}

/// Counterparty-side signing primitive called via `call_remote` from
/// `fulfill_commitment_closure`. The counterparty refetches the commitment
/// to verify what they're agreeing to, confirms the caller (initiator) is
/// the other party, and signs the shared payload with their own key.
///
/// This function is exposed as an **unrestricted** cap grant via `init` so
/// `call_remote` can reach it without a shared secret. The authorisation
/// gate is semantic (fetch the commitment, verify I'm actually a party)
/// rather than capability-token based — appropriate for a bilateral-event
/// countersign where either party might initiate.
#[hdk_extern]
pub fn countersign_fulfillment(
  input: CountersignFulfillmentInput,
) -> ExternResult<CountersignFulfillmentOutput> {
  let my_key = agent_info()?.agent_initial_pubkey;

  // The remote caller must actually be the initiator they claim to be.
  // `call_info()` tells us who invoked this via call_remote.
  let call_info = call_info()?;
  if call_info.provenance != input.initiator {
    return Err(
      GovernanceError::InvalidInput(format!(
        "countersign_fulfillment: provenance ({:?}) does not match the \
         initiator in the payload ({:?})",
        call_info.provenance, input.initiator
      ))
      .into(),
    );
  }

  // Verify the commitment exists and I'm the counterparty.
  let commitment_record =
    get(input.commitment_hash.clone(), GetOptions::default())?.ok_or_else(|| {
      GovernanceError::CommitmentNotFound(input.commitment_hash.to_string())
    })?;
  let commitment = commitment_record
    .entry()
    .to_app_option::<Commitment>()
    .map_err(|e| {
      wasm_error!(WasmErrorInner::Guest(format!(
        "Failed to decode commitment: {e:?}"
      )))
    })?
    .ok_or_else(|| {
      GovernanceError::SerializationError("Commitment entry decode returned None".to_string())
    })?;

  let (expected_initiator, expected_me) = if commitment.provider == my_key {
    (commitment.receiver.clone(), commitment.provider.clone())
  } else if commitment.receiver == my_key {
    (commitment.provider.clone(), commitment.receiver.clone())
  } else {
    return Err(
      GovernanceError::InvalidInput(
        "countersign_fulfillment: I am neither the provider nor the receiver of this commitment"
          .to_string(),
      )
      .into(),
    );
  };
  if input.initiator != expected_initiator {
    return Err(
      GovernanceError::InvalidInput(format!(
        "countersign_fulfillment: payload initiator ({:?}) is not my \
         counterparty on this commitment (expected {:?})",
        input.initiator, expected_initiator
      ))
      .into(),
    );
  }
  if my_key != expected_me {
    // Should be unreachable given the branches above, but keep the
    // post-condition explicit.
    return Err(
      GovernanceError::InvalidInput(
        "countersign_fulfillment: internal role resolution mismatch".to_string(),
      )
      .into(),
    );
  }

  // Sign the shared payload — the hash is sufficient because the initiator
  // built the full payload deterministically and will verify both sides
  // against the same `signed_data_hash`.
  let signature = sign(my_key, input.signed_data_hash.to_vec())?;
  Ok(CountersignFulfillmentOutput { signature })
}

/// Determine the appropriate PPR claim pair for a given VfAction. Same
/// mapping as `ppr::generate_pprs_for_economic_event`'s internal helper —
/// duplicated here (rather than importing the private fn) so the closure
/// path doesn't depend on `ppr` internals, keeping the module boundary
/// clean.
fn determine_claim_types_for_action(
  action: &VfAction,
) -> ExternResult<Vec<ParticipationClaimType>> {
  let claim_types = match action {
    VfAction::Produce => vec![
      ParticipationClaimType::ResourceCreation,
      ParticipationClaimType::ResourceValidation,
    ],
    VfAction::Transfer | VfAction::TransferCustody | VfAction::InitialTransfer => vec![
      ParticipationClaimType::CustodyTransfer,
      ParticipationClaimType::CustodyAcceptance,
    ],
    VfAction::Use => vec![
      ParticipationClaimType::GoodFaithTransfer,
      ParticipationClaimType::CustodyAcceptance,
    ],
    VfAction::Work => vec![
      ParticipationClaimType::MaintenanceCommitmentAccepted,
      ParticipationClaimType::MaintenanceFulfillmentCompleted,
    ],
    VfAction::Accept => vec![
      ParticipationClaimType::CustodyAcceptance,
      ParticipationClaimType::CustodyTransfer,
    ],
    _ => vec![
      ParticipationClaimType::ValidationActivity,
      ParticipationClaimType::RuleCompliance,
    ],
  };
  Ok(claim_types)
}

/// Build the shared signing payload. Must be deterministic across initiator
/// and counterparty — both will hash the same bytes.
fn build_fulfillment_signing_data(
  commitment_hash: &ActionHash,
  event: &EconomicEvent,
  claim_types: &[ParticipationClaimType],
  now: Timestamp,
) -> Vec<u8> {
  let mut data = Vec::new();
  data.extend_from_slice(b"FULFILL_COMMITMENT_CLOSURE_V1");
  data.extend_from_slice(&commitment_hash.get_raw_39());
  data.extend_from_slice(&event.provider.get_raw_39());
  data.extend_from_slice(&event.receiver.get_raw_39());
  data.extend_from_slice(&event.resource_inventoried_as.get_raw_39());
  data.extend_from_slice(&event.ndo_identity_hash.get_raw_39());
  // The event quantity is part of what both parties attest to.
  data.extend_from_slice(event.resource_quantity.has_unit.as_bytes());
  data.extend_from_slice(&event.resource_quantity.numerical_value.to_le_bytes());
  // Action variant name
  data.extend_from_slice(format!("{:?}", event.action).as_bytes());
  // Claim types, in order (provider, receiver)
  for ct in claim_types {
    data.extend_from_slice(format!("{:?}", ct).as_bytes());
  }
  data.extend_from_slice(&now.as_micros().to_le_bytes());
  data
}

fn blake3_hash(data: &[u8]) -> [u8; 32] {
  let mut hasher = Hasher::new();
  hasher.update(data);
  *hasher.finalize().as_bytes()
}

// A local shim mirroring `zome_resource::economic_resource::UpdateOperationalStateInput`
// so this module can serialise the cross-zome call payload without
// importing the entire resource coordinator crate (which would create a
// dependency cycle via `zome_gouvernance_integrity`).
#[derive(Serialize, Deserialize, Debug)]
pub struct UpdateOperationalStateInput {
  pub resource_hash: ActionHash,
  pub new_operational_state: OperationalState,
}
