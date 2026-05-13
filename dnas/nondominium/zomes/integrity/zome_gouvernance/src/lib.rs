use hdi::prelude::*;
// VfAction, NdoLinkType, BeneficiaryRef, BenefitType, BenefitClause are defined in
// nondominium_shared::types so coordinator zomes and Sweettest test crates can import
// them directly without WASM-crate dependency constraints.
pub use nondominium_shared::types::{
  BeneficiaryRef, BenefitClause, BenefitType, NdoLinkType, VfAction,
};

pub mod ppr;
pub use ppr::*;

#[hdk_entry_helper]
#[derive(Clone, PartialEq)]
pub struct ValidationReceipt {
  pub validator: AgentPubKey,
  pub validated_item: ActionHash, // Link to the item being validated (Resource, Event, etc.)
  pub validation_type: String, // e.g., "resource_approval", "process_validation", "identity_verification"
  pub approved: bool,
  pub notes: Option<String>,
  pub validated_at: Timestamp,
}

#[hdk_entry_helper]
#[derive(Clone, PartialEq)]
pub struct EconomicEvent {
  pub action: VfAction,
  pub provider: AgentPubKey,
  pub receiver: AgentPubKey,
  pub resource_inventoried_as: ActionHash, // Link to the EconomicResource
  pub affects: ActionHash,                 // Link to the EconomicResource that is affected
  pub resource_quantity: f64,
  pub event_time: Timestamp,
  pub note: Option<String>,
}

#[hdk_entry_helper]
#[derive(Clone, PartialEq)]
pub struct Commitment {
  pub action: VfAction,
  pub provider: AgentPubKey,
  pub receiver: AgentPubKey,
  pub resource_inventoried_as: Option<ActionHash>, // Link to specific resource if applicable
  pub resource_conforms_to: Option<ActionHash>,    // Link to ResourceSpecification if general
  pub input_of: Option<ActionHash>,                // Optional link to a Process
  pub due_date: Timestamp,
  pub note: Option<String>,
  pub committed_at: Timestamp,
}

#[hdk_entry_helper]
#[derive(Clone, PartialEq)]
pub struct Claim {
  pub fulfills: ActionHash,     // Link to the Commitment
  pub fulfilled_by: ActionHash, // Link to the resulting EconomicEvent
  pub claimed_at: Timestamp,
  pub note: Option<String>,
}

#[hdk_entry_helper]
#[derive(Clone, PartialEq)]
pub struct ResourceValidation {
  pub resource: ActionHash, // Link to the EconomicResource being validated
  pub validation_scheme: String, // e.g., "2-of-3", "simple_majority"
  pub required_validators: u32,
  pub current_validators: u32,
  pub status: String, // "pending", "approved", "rejected"
  pub created_at: Timestamp,
  pub updated_at: Timestamp,
}

/// Permanent validated structural link between two NDOs.
/// Created only on EconomicEvent fulfillment. Immutable and undeletable (OVN license).
#[hdk_entry_helper]
#[derive(Clone, PartialEq)]
pub struct NdoHardLink {
  pub from_ndo_identity_hash: ActionHash,
  pub to_ndo_dna_hash: DnaHash,
  pub to_ndo_identity_hash: ActionHash,
  pub link_type: NdoLinkType,
  pub fulfillment_hash: ActionHash, // EconomicEvent backing this link
  pub created_by: AgentPubKey,      // must equal action.author
  pub created_at: Timestamp,
}

/// Peer-validated work contribution on an NDO. VF: vf:EconomicEvent (Work/Modify).
#[hdk_entry_helper]
#[derive(Clone, PartialEq)]
pub struct Contribution {
  pub provider: AgentPubKey,
  pub action: VfAction,
  pub work_log_group_dna_hash: Option<DnaHash>,
  pub work_log_action_hash: Option<ActionHash>,
  pub ndo_identity_hash: ActionHash,
  pub input_of: Option<ActionHash>, // Process ActionHash
  pub note: String,
  pub effort_quantity: Option<f64>, // hours [0.0, 10000.0]
  pub validated_by: Vec<AgentPubKey>, // min 1 AccountableAgent
  pub fulfills: Option<ActionHash>,
  pub has_point_in_time: Timestamp,
  pub validated_at: Timestamp,
}

/// Benefit redistribution agreement. Versioned, AccountableAgent-controlled.
/// VF: vf:Agreement
#[hdk_entry_helper]
#[derive(Clone, PartialEq)]
pub struct Agreement {
  pub ndo_identity_hash: ActionHash,
  pub version: u32, // monotonic, must equal previous.version + 1 on update
  pub clauses: Vec<BenefitClause>,
  pub primary_accountable: Vec<AgentPubKey>,
  pub created_by: AgentPubKey,
  pub created_at: Timestamp,
}

// BenefitClause, BeneficiaryRef, BenefitType are re-exported from nondominium_shared::types
// (see the `pub use` at the top of this file).

#[hdk_entry_types]
#[unit_enum(UnitEntryTypes)]
#[derive(Serialize, Deserialize, SerializedBytes)]
pub enum EntryTypes {
  ValidationReceipt(ValidationReceipt),
  EconomicEvent(EconomicEvent),
  Commitment(Commitment),
  Claim(Claim),
  ResourceValidation(ResourceValidation),
  #[entry_type(visibility = "private")]
  PrivateParticipationClaim(PrivateParticipationClaim),
  // NDO federation extensions (issue #100)
  NdoHardLink(NdoHardLink),
  Contribution(Contribution),
  Agreement(Agreement),
}

#[hdk_link_types]
pub enum LinkTypes {
  ValidatedItemToReceipt,
  ResourceToValidation,
  CommitmentToClaim,
  ResourceToEvent,
  AllValidationReceipts,
  AllEconomicEvents,
  AllCommitments,
  AllClaims,
  AllResourceValidations,
  // PPR-related links
  AgentToPrivateParticipationClaims,
  EventToPrivateParticipationClaims,
  CommitmentToPrivateParticipationClaims,
  ResourceToPrivateParticipationClaims,
  // NDO federation links (issue #100)
  NdoToHardLinks,         // from_ndo_identity_hash -> NdoHardLink
  HardLinkByType,         // Path("ndo.hardlink.{NdoLinkType}") -> NdoHardLink
  NdoToContributions,     // ndo_identity_hash -> Contribution
  AgentToContributions,   // provider AgentPubKey -> Contribution
  ContributionToEvent,    // Contribution -> EconomicEvent
  NdoToAgreement,         // ndo_identity_hash -> Agreement (latest)
  AgreementUpdates,       // Agreement -> Agreement (version chain)
}

#[hdk_extern]
pub fn genesis_self_check(_data: GenesisSelfCheckData) -> ExternResult<ValidateCallbackResult> {
  Ok(ValidateCallbackResult::Valid)
}

pub fn validate_agent_joining(
  _agent_pub_key: AgentPubKey,
  _membrane_proof: &MembraneProof,
) -> ExternResult<ValidateCallbackResult> {
  // For this proof of concept, access is permissionless
  Ok(ValidateCallbackResult::Valid)
}

#[hdk_extern]
pub fn validate(op: Op) -> ExternResult<ValidateCallbackResult> {
  // Phase 1: validate create/update entry content via StoreEntry
  if let FlatOp::StoreEntry(store_entry) = op.flattened::<EntryTypes, LinkTypes>()? {
    match store_entry {
      OpEntry::CreateEntry { app_entry, action } => match app_entry {
        EntryTypes::PrivateParticipationClaim(claim) => {
          return validate_private_participation_claim(claim);
        }
        EntryTypes::NdoHardLink(link) => {
          return validate_create_ndo_hard_link(link, action);
        }
        EntryTypes::Contribution(c) => {
          return validate_create_contribution(c, action);
        }
        EntryTypes::Agreement(a) => {
          return validate_create_agreement(a, action);
        }
        _ => {}
      },
      OpEntry::UpdateEntry { app_entry, .. } => match app_entry {
        EntryTypes::NdoHardLink(_) => {
          return Ok(ValidateCallbackResult::Invalid(
            "NdoHardLink entries are immutable and cannot be updated".to_string(),
          ));
        }
        EntryTypes::Agreement(a) => {
          // Author check is not applicable here (action is Update, not Create).
          // Validate only the content; the StoreRecord arm enforces version monotonicity
          // and ndo_identity_hash immutability.
          return validate_agreement_content(&a);
        }
        _ => {}
      },
      _ => {}
    }
  }

  // Phase 2: validate deletes and update version constraints via StoreRecord
  if let FlatOp::StoreRecord(store_record) = op.flattened::<EntryTypes, LinkTypes>()? {
    match store_record {
      OpRecord::DeleteEntry { original_action_hash, .. } => {
        let original_record = must_get_valid_record(original_action_hash)?;
        let original_action = original_record.action().clone();
        let creation_action = match original_action {
          Action::Create(c) => EntryCreationAction::Create(c),
          Action::Update(u) => EntryCreationAction::Update(u),
          _ => return Ok(ValidateCallbackResult::Valid),
        };
        let app_entry_type = match creation_action.entry_type() {
          EntryType::App(t) => t,
          _ => return Ok(ValidateCallbackResult::Valid),
        };
        let entry = match original_record.entry().as_option() {
          Some(e) => e,
          None => return Ok(ValidateCallbackResult::Valid),
        };
        let original_app_entry = EntryTypes::deserialize_from_type(
          *app_entry_type.zome_index,
          app_entry_type.entry_index,
          entry,
        )?;
        match original_app_entry {
          Some(EntryTypes::NdoHardLink(_)) => {
            return Ok(ValidateCallbackResult::Invalid(
              "NdoHardLink entries are permanent and cannot be deleted (OVN license requirement)"
                .to_string(),
            ));
          }
          Some(EntryTypes::Agreement(_)) => {
            return Ok(ValidateCallbackResult::Invalid(
              "Agreement entries cannot be deleted; supersede via versioned update".to_string(),
            ));
          }
          _ => {}
        }
      }
      OpRecord::UpdateEntry { original_action_hash, app_entry, .. } => {
        if let EntryTypes::Agreement(updated) = app_entry {
          let original_record = must_get_valid_record(original_action_hash)?;
          let original_action = original_record.action().clone();
          let creation_action = match original_action {
            Action::Create(c) => EntryCreationAction::Create(c),
            Action::Update(u) => EntryCreationAction::Update(u),
            _ => return Ok(ValidateCallbackResult::Valid),
          };
          let app_entry_type = match creation_action.entry_type() {
            EntryType::App(t) => t,
            _ => return Ok(ValidateCallbackResult::Valid),
          };
          let entry = match original_record.entry().as_option() {
            Some(e) => e,
            None => return Ok(ValidateCallbackResult::Valid),
          };
          if let Some(EntryTypes::Agreement(original)) = EntryTypes::deserialize_from_type(
            *app_entry_type.zome_index,
            app_entry_type.entry_index,
            entry,
          )? {
            if updated.ndo_identity_hash != original.ndo_identity_hash {
              return Ok(ValidateCallbackResult::Invalid(
                "ndo_identity_hash is immutable".to_string(),
              ));
            }
            if updated.version != original.version + 1 {
              return Ok(ValidateCallbackResult::Invalid(
                "Agreement version must equal previous.version + 1".to_string(),
              ));
            }
          }
        }
      }
      _ => {}
    }
  }

  Ok(ValidateCallbackResult::Valid)
}

fn validate_create_ndo_hard_link(
  link: NdoHardLink,
  action: Create,
) -> ExternResult<ValidateCallbackResult> {
  if link.created_by != action.author {
    return Ok(ValidateCallbackResult::Invalid(
      "created_by must equal action.author".to_string(),
    ));
  }
  Ok(ValidateCallbackResult::Valid)
}

fn validate_create_contribution(c: Contribution, action: Create) -> ExternResult<ValidateCallbackResult> {
  if c.provider != action.author {
    return Ok(ValidateCallbackResult::Invalid(
      "provider must equal action.author".to_string(),
    ));
  }
  match c.action {
    VfAction::Work | VfAction::Modify | VfAction::Cite => {}
    _ => return Ok(ValidateCallbackResult::Invalid(
      "Contribution.action must be Work, Modify, or Cite".to_string(),
    )),
  }
  if c.validated_by.is_empty() {
    return Ok(ValidateCallbackResult::Invalid(
      "validated_by must contain at least one AccountableAgent".to_string(),
    ));
  }
  if c.note.trim().is_empty() {
    return Ok(ValidateCallbackResult::Invalid("note cannot be empty".to_string()));
  }
  if let Some(hours) = c.effort_quantity {
    if !(0.0..=10000.0).contains(&hours) {
      return Ok(ValidateCallbackResult::Invalid(
        "effort_quantity must be in [0.0, 10000.0]".to_string(),
      ));
    }
  }
  Ok(ValidateCallbackResult::Valid)
}

fn validate_agreement_content(a: &Agreement) -> ExternResult<ValidateCallbackResult> {
  if a.primary_accountable.is_empty() {
    return Ok(ValidateCallbackResult::Invalid(
      "primary_accountable must contain at least one agent".to_string(),
    ));
  }
  for clause in &a.clauses {
    if !(0.0..=100.0).contains(&clause.share_percent) {
      return Ok(ValidateCallbackResult::Invalid(
        "each clause.share_percent must be in [0.0, 100.0]".to_string(),
      ));
    }
  }
  let total: f64 = a.clauses.iter().map(|c| c.share_percent).sum();
  if total > 100.0 {
    return Ok(ValidateCallbackResult::Invalid(
      "sum of clause.share_percent must not exceed 100.0".to_string(),
    ));
  }
  Ok(ValidateCallbackResult::Valid)
}

fn validate_create_agreement(a: Agreement, action: Create) -> ExternResult<ValidateCallbackResult> {
  if a.created_by != action.author {
    return Ok(ValidateCallbackResult::Invalid(
      "created_by must equal action.author".to_string(),
    ));
  }
  validate_agreement_content(&a)
}

/// Validate a Private Participation Claim entry
pub fn validate_private_participation_claim(
  claim: PrivateParticipationClaim,
) -> ExternResult<ValidateCallbackResult> {
  // Validate performance metrics
  if let Err(e) = claim.performance_metrics.validate() {
    return Ok(ValidateCallbackResult::Invalid(format!(
      "Invalid performance metrics: {}",
      e
    )));
  }

  // For now, skip timestamp validation in integrity zome since sys_time() is not available
  // This validation would be done in the coordinator zome

  // Validate claim type description exists (ensures enum is valid)
  let _description = claim.claim_type.description();

  Ok(ValidateCallbackResult::Valid)
}
