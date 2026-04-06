use hdi::prelude::*;

// TODO (post-MVP): Split ResourceState into two orthogonal enums and migrate EconomicResource:
//
// 1. LifecycleStage — now defined below for NondominiumIdentity (NDO Layer 0).
//
// 2. OperationalState — the current process acting on this specific resource instance (cycles
//    frequently as processes begin and end). Governance-zome controlled.
//    Values: Available, Reserved, InTransit, InStorage, InMaintenance, InUse, PendingValidation
//
// The current ResourceState enum CONFLATES both dimensions and is kept for EconomicResource
// backwards-compatibility until the OperationalState refactor (REQ-NDO-OS-06).
//
// See: documentation/requirements/ndo_prima_materia.md — Section 5 (LifecycleStage + OperationalState)
// See: documentation/archives/resources.md — Section 2.4 (known gaps)
#[derive(Clone, PartialEq, Debug, Serialize, Deserialize, Default)]
pub enum ResourceState {
  #[default]
  PendingValidation,
  Active,
  Maintenance,
  Retired,
  Reserved,
}

impl std::fmt::Display for ResourceState {
  fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
    match self {
      ResourceState::PendingValidation => write!(f, "pending_validation"),
      ResourceState::Active => write!(f, "active"),
      ResourceState::Maintenance => write!(f, "maintenance"),
      ResourceState::Retired => write!(f, "retired"),
      ResourceState::Reserved => write!(f, "reserved"),
    }
  }
}

// NDO Layer 0 — LifecycleStage (REQ-NDO-LC-01 through REQ-NDO-LC-07)
// The maturity/evolutionary phase of a NondominiumIdentity. Advances rarely and (mostly)
// irreversibly, driven by significant events. The ONLY mutable field in NondominiumIdentity
// after creation (REQ-NDO-L0-04).
// See: documentation/requirements/ndo_prima_materia.md §5.1 and §9.4
#[derive(Clone, PartialEq, Debug, Serialize, Deserialize)]
pub enum LifecycleStage {
  // --- Emergence Phase ---
  Ideation,       // Placeholder: name and intent only. Layer 0 alone.
  Specification,  // Design/requirements being written. Layer 1 activating.
  Development,    // Active construction, prototyping. Layers 0+1+2 active.
  Prototype,      // PoC exists, not production-ready. Layers 0+1+2 active.
  // --- Maturity Phase ---
  Stable,         // Production-ready, design is replicable. All layers active.
  Distributed,    // Being actively fabricated/used across the network.
  // --- Operation Phase ---
  Active,         // In normal use. All layers active.
  // --- Suspension (REQ-NDO-LC-04: reversible) ---
  Hibernating,    // Dormant but recoverable. Layers 1+2 dormant, Layer 0 active.
  // --- Terminal (REQ-NDO-LC-04: not reactivatable) ---
  Deprecated,     // Superseded. Successor NDO required (REQ-NDO-LC-06).
  EndOfLife,      // Concluded. Layer 0 tombstone; fully terminal.
}

// NDO Layer 0 — PropertyRegime (REQ-NDO-L0-02)
// The governance/ownership regime of a NondominiumIdentity. Immutable after creation.
// See: documentation/requirements/ndo_prima_materia.md §4.1
// TODO (post-MVP): Implement PropertyRegime → governance defaults mapping via GovernanceDefaultsEngine.
// See: documentation/archives/resources.md §6.6 (PropertyRegime → governance defaults)
#[derive(Clone, PartialEq, Debug, Serialize, Deserialize)]
pub enum PropertyRegime {
  Private,
  Commons,
  Collective,
  Pool,
  CommonPool,
  Nondominium,
}

// NDO Layer 0 — ResourceNature (REQ-NDO-L0-02)
// The physical/digital nature of a NondominiumIdentity. Immutable after creation.
// See: documentation/requirements/ndo_prima_materia.md §4.1
#[derive(Clone, PartialEq, Debug, Serialize, Deserialize)]
pub enum ResourceNature {
  Physical,
  Digital,
  Service,
  Hybrid,
  Information,
}

#[hdk_entry_helper]
#[derive(Clone, PartialEq)]
pub struct ResourceSpecification {
  pub name: String,
  pub description: String,
  pub category: String, // For efficient categorized queries (like ServiceType)
  pub image_url: Option<String>,
  pub tags: Vec<String>, // For flexible discovery and filtering
  pub is_active: bool, // For filtering active vs inactive specs
}

#[hdk_entry_helper]
#[derive(Clone, PartialEq)]
pub struct GovernanceRule {
  pub rule_type: String, // e.g., "access_requirement", "usage_limit", "transfer_conditions"
  pub rule_data: String, // JSON-encoded rule parameters
  pub enforced_by: Option<String>, // Role required to enforce this rule
}

#[hdk_entry_helper]
#[derive(Clone, PartialEq)]
pub struct EconomicResource {
  pub quantity: f64,
  pub unit: String,
  pub custodian: AgentPubKey, // The Primary Accountable Agent holding the resource
  pub current_location: Option<String>, // Physical or virtual location TODO: use an enum
  pub state: ResourceState,
}

// NDO Layer 0 — NondominiumIdentity (REQ-NDO-L0-01, REQ-NDO-L0-07)
// The permanent identity anchor of a resource. Exists from the moment of conception through
// end-of-life. Most fields are immutable after creation; three are conditionally mutable:
//   lifecycle_stage    — changes on every transition (REQ-NDO-L0-04)
//   successor_ndo_hash — set once when entering Deprecated (REQ-NDO-LC-06)
//   hibernation_origin — set on → Hibernating, cleared on Hibernating → (see §5.3)
// The original ActionHash from create_ndo is the stable Layer 0 identity for all time.
// See: documentation/requirements/ndo_prima_materia.md §4.2 and §9.1
#[hdk_entry_helper]
#[derive(Clone, PartialEq)]
pub struct NondominiumIdentity {
  pub name: String,
  pub initiator: AgentPubKey,
  pub property_regime: PropertyRegime,
  pub resource_nature: ResourceNature,
  pub lifecycle_stage: LifecycleStage,
  pub created_at: Timestamp,
  pub description: Option<String>,
  // Required when lifecycle_stage == Deprecated (REQ-NDO-LC-06).
  // Set exactly once during the Deprecated transition; immutable once set.
  // #[serde(default)] ensures existing pre-field records deserialize to None.
  #[serde(default)]
  pub successor_ndo_hash: Option<ActionHash>,
  // Records the stage that was active immediately before entering Hibernating.
  // Set by the coordinator on → Hibernating; cleared on Hibernating → (any stage).
  // Always None in non-Hibernating states. Enables "Hibernating → {origin}" resume
  // semantics so a paused resource returns to exactly where it was.
  // #[serde(default)] ensures forward-compatibility with pre-field records.
  #[serde(default)]
  pub hibernation_origin: Option<LifecycleStage>,
}

#[hdk_entry_types]
#[unit_enum(UnitEntryTypes)]
#[derive(Serialize, Deserialize, SerializedBytes)]
pub enum EntryTypes {
  ResourceSpecification(ResourceSpecification),
  EconomicResource(EconomicResource),
  GovernanceRule(GovernanceRule),
  NondominiumIdentity(NondominiumIdentity),
}

#[hdk_link_types]
#[derive(Serialize, Deserialize)]
pub enum LinkTypes {
  // Discovery anchors (inspired by Requests & Offers patterns)
  AllResourceSpecifications,
  AllEconomicResources,
  AllGovernanceRules,

  // NDO Layer 0 discovery anchors (REQ-NDO-L0-05, REQ-NDO-L0-07)
  AllNdos,    // global anchor: "ndo_identities" path → NondominiumIdentity action hashes
  AgentToNdo, // initiator pubkey → NondominiumIdentity action hashes

  // NDO Layer 0 lifecycle links
  NdoToSuccessor,        // deprecated NDO action hash → successor NondominiumIdentity (REQ-NDO-LC-06)
  NdoToTransitionEvent,  // NDO action hash → EconomicEvent that triggered the transition (REQ-NDO-L0-05)
                         // Link only; full event validation deferred (integrity cannot
                         // cross-zome call to zome_gouvernance)

  // Hierarchical linking for efficient queries
  SpecificationToResource,       // ResourceSpec -> EconomicResource
  CustodianToResource,           // Agent -> Resources they custody
  SpecificationToGovernanceRule, // ResourceSpec -> GovernanceRules

  // Agent-centric patterns (from R&O)
  AgentToOwnedSpecs,       // Agent -> ResourceSpecs they created
  AgentToManagedResources, // Agent -> Resources they manage
  AgentToOwnedRules,       // Agent -> GovernanceRules they created

  // Service-type patterns (inspired by R&O ServiceType queries)
  SpecsByCategory,     // Category -> ResourceSpecs
  ResourcesByLocation, // Location -> EconomicResources
  ResourcesByState,    // ResourceState -> EconomicResources
  // TODO (REQ-NDO-OS-06): Split ResourcesByState into two independent link types:
  //   ResourcesByLifecycleStage  — NondominiumIdentity lifecycle facet queries
  //   ResourcesByOperationalState — EconomicResource operational facet queries
  // See: documentation/requirements/ndo_prima_materia.md — Section 9.4 (REQ-NDO-OS-06)

  // Governance patterns
  RulesByType,          // RuleType -> GovernanceRules
  ResourceToValidation, // EconomicResource -> ValidationRecords

  // Update patterns (following person zome)
  ResourceSpecificationUpdates, // Original -> Updated ResourceSpec
  EconomicResourceUpdates,      // Original -> Updated EconomicResource
  GovernanceRuleUpdates,        // Original -> Updated GovernanceRule
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
  match op.flattened::<EntryTypes, LinkTypes>()? {
    FlatOp::StoreEntry(store_entry) => match store_entry {
      OpEntry::CreateEntry { app_entry, action } => match app_entry {
        EntryTypes::ResourceSpecification(spec) => {
          validate_create_resource_spec(&spec, &action.author)
        }
        EntryTypes::EconomicResource(resource) => {
          validate_create_economic_resource(&resource, &action.author)
        }
        EntryTypes::GovernanceRule(rule) => validate_create_governance_rule(&rule, &action.author),
        EntryTypes::NondominiumIdentity(ndi) => {
          validate_create_nondominium_identity(&ndi, &action.author)
        }
      },
      OpEntry::UpdateEntry {
        app_entry, action, ..
      } => match app_entry {
        EntryTypes::ResourceSpecification(spec) => {
          validate_update_resource_spec(&spec, &action.author)
        }
        EntryTypes::EconomicResource(resource) => {
          validate_update_economic_resource(&resource, &action.author)
        }
        EntryTypes::GovernanceRule(rule) => validate_update_governance_rule(&rule, &action.author),
        EntryTypes::NondominiumIdentity(new_ndi) => {
          // Fetch original entry to enforce immutability of all fields except lifecycle_stage
          // (REQ-NDO-L0-03, REQ-NDO-L0-04)
          let original_record =
            must_get_valid_record(action.original_action_address.clone())?;
          let original: NondominiumIdentity = original_record
            .entry()
            .to_app_option()
            .map_err(|e| {
              wasm_error!(WasmErrorInner::Guest(format!(
                "Failed to deserialize original NondominiumIdentity: {:?}",
                e
              )))
            })?
            .ok_or(wasm_error!(WasmErrorInner::Guest(
              "Original NondominiumIdentity entry not found in record".to_string()
            )))?;
          validate_update_nondominium_identity(&action, &original, &new_ndi)
        }
      },
      _ => Ok(ValidateCallbackResult::Valid),
    },
    FlatOp::StoreRecord(store_record) => match store_record {
      OpRecord::DeleteEntry {
        original_action_hash,
        ..
      } => {
        // Identify whether the deleted entry is a NondominiumIdentity (REQ-NDO-L0-06)
        let original_record = must_get_valid_record(original_action_hash)?;
        let original_action = original_record.action().clone();
        let original_action = match original_action {
          Action::Create(create) => EntryCreationAction::Create(create),
          Action::Update(update) => EntryCreationAction::Update(update),
          _ => {
            return Ok(ValidateCallbackResult::Invalid(
              "Original action for a delete must be a Create or Update action".to_string(),
            ));
          }
        };
        let app_entry_type = match original_action.entry_type() {
          EntryType::App(app_entry_type) => app_entry_type,
          _ => return Ok(ValidateCallbackResult::Valid),
        };
        let entry = match original_record.entry().as_option() {
          Some(entry) => entry,
          None => return Ok(ValidateCallbackResult::Valid),
        };
        let original_app_entry = match EntryTypes::deserialize_from_type(
          *app_entry_type.zome_index,
          app_entry_type.entry_index,
          entry,
        )? {
          Some(app_entry) => app_entry,
          None => return Ok(ValidateCallbackResult::Valid),
        };
        match original_app_entry {
          EntryTypes::NondominiumIdentity(_) => validate_delete_nondominium_identity(),
          _ => Ok(ValidateCallbackResult::Valid),
        }
      }
      OpRecord::CreateLink { .. } => {
        // Validate link creation
        Ok(ValidateCallbackResult::Valid)
      }
      _ => Ok(ValidateCallbackResult::Valid),
    },
    _ => Ok(ValidateCallbackResult::Valid),
  }
}

fn validate_create_resource_spec(
  spec: &ResourceSpecification,
  _author: &AgentPubKey,
) -> ExternResult<ValidateCallbackResult> {
  if spec.name.trim().is_empty() {
    return Ok(ValidateCallbackResult::Invalid(
      "Resource specification name cannot be empty".to_string(),
    ));
  }

  if spec.name.len() > 100 {
    return Ok(ValidateCallbackResult::Invalid(
      "Resource specification name too long".to_string(),
    ));
  }

  if spec.description.trim().is_empty() {
    return Ok(ValidateCallbackResult::Invalid(
      "Resource specification description cannot be empty".to_string(),
    ));
  }

  Ok(ValidateCallbackResult::Valid)
}

fn validate_create_economic_resource(
  resource: &EconomicResource,
  _author: &AgentPubKey,
) -> ExternResult<ValidateCallbackResult> {
  if resource.quantity <= 0.0 {
    return Ok(ValidateCallbackResult::Invalid(
      "Resource quantity must be positive".to_string(),
    ));
  }

  if resource.unit.trim().is_empty() {
    return Ok(ValidateCallbackResult::Invalid(
      "Resource unit cannot be empty".to_string(),
    ));
  }

  Ok(ValidateCallbackResult::Valid)
}

fn validate_create_governance_rule(
  rule: &GovernanceRule,
  _author: &AgentPubKey,
) -> ExternResult<ValidateCallbackResult> {
  if rule.rule_type.trim().is_empty() {
    return Ok(ValidateCallbackResult::Invalid(
      "Governance rule type cannot be empty".to_string(),
    ));
  }

  if rule.rule_data.trim().is_empty() {
    return Ok(ValidateCallbackResult::Invalid(
      "Governance rule data cannot be empty".to_string(),
    ));
  }

  Ok(ValidateCallbackResult::Valid)
}

// REQ-NDO-L0-01: NondominiumIdentity name must not be empty.
// REQ-NDO-LC-01: Only emergence/maturity/operation stages are valid at creation time.
fn validate_create_nondominium_identity(
  ndi: &NondominiumIdentity,
  _author: &AgentPubKey,
) -> ExternResult<ValidateCallbackResult> {
  if ndi.name.trim().is_empty() {
    return Ok(ValidateCallbackResult::Invalid(
      "NondominiumIdentity name cannot be empty".to_string(),
    ));
  }

  // Suspension and terminal stages are not valid initial stages
  let invalid_initial = [
    LifecycleStage::Hibernating,
    LifecycleStage::Deprecated,
    LifecycleStage::EndOfLife,
  ];
  if invalid_initial.contains(&ndi.lifecycle_stage) {
    return Ok(ValidateCallbackResult::Invalid(format!(
      "NondominiumIdentity cannot be created in stage {:?}; \
       only emergence, maturity, or operation stages are valid initial stages",
      ndi.lifecycle_stage
    )));
  }

  // successor_ndo_hash has no meaning at creation time
  if ndi.successor_ndo_hash.is_some() {
    return Ok(ValidateCallbackResult::Invalid(
      "successor_ndo_hash must be None at creation".to_string(),
    ));
  }

  // hibernation_origin has no meaning at creation time
  if ndi.hibernation_origin.is_some() {
    return Ok(ValidateCallbackResult::Invalid(
      "hibernation_origin must be None at creation".to_string(),
    ));
  }

  Ok(ValidateCallbackResult::Valid)
}

// REQ-NDO-L0-03, REQ-NDO-L0-04: Only lifecycle_stage, successor_ndo_hash (once, on
// Deprecated), and hibernation_origin (set/cleared with Hibernating) may change.
// All other fields are permanently immutable. Only the initiator may update.
// REQ-NDO-LC-04: Hibernating is reversible; Deprecated and EndOfLife are terminal.
// REQ-NDO-LC-06: Transitioning to Deprecated requires a successor NDO hash.
//
// State machine (per ndo_prima_materia.md §5.3):
//   Forward chain (monotonic): Ideation→Spec→Dev→Proto→Stable→Dist→Active
//   Suspend (any non-terminal → Hibernating): records hibernation_origin
//   Resume (Hibernating → origin): clears hibernation_origin; target MUST equal origin
//   Terminal (any → Deprecated [+successor] or EndOfLife): Deprecated → EndOfLife only exit
fn validate_update_nondominium_identity(
  action: &Update,
  original: &NondominiumIdentity,
  new_entry: &NondominiumIdentity,
) -> ExternResult<ValidateCallbackResult> {
  // Only the initiator may advance the lifecycle stage (REQ-NDO-L0-03)
  if action.author != original.initiator {
    return Ok(ValidateCallbackResult::Invalid(
      "Only the initiator may update NondominiumIdentity lifecycle stage".to_string(),
    ));
  }

  // --- Permanently immutable fields ---
  if new_entry.name != original.name {
    return Ok(ValidateCallbackResult::Invalid(
      "NondominiumIdentity name is immutable after creation".to_string(),
    ));
  }
  if new_entry.initiator != original.initiator {
    return Ok(ValidateCallbackResult::Invalid(
      "NondominiumIdentity initiator is immutable after creation".to_string(),
    ));
  }
  if new_entry.property_regime != original.property_regime {
    return Ok(ValidateCallbackResult::Invalid(
      "NondominiumIdentity property_regime is immutable after creation".to_string(),
    ));
  }
  if new_entry.resource_nature != original.resource_nature {
    return Ok(ValidateCallbackResult::Invalid(
      "NondominiumIdentity resource_nature is immutable after creation".to_string(),
    ));
  }
  if new_entry.created_at != original.created_at {
    return Ok(ValidateCallbackResult::Invalid(
      "NondominiumIdentity created_at is immutable after creation".to_string(),
    ));
  }
  if new_entry.description != original.description {
    return Ok(ValidateCallbackResult::Invalid(
      "NondominiumIdentity description is immutable after creation".to_string(),
    ));
  }

  // --- successor_ndo_hash: immutable once set ---
  if original.successor_ndo_hash.is_some()
    && new_entry.successor_ndo_hash != original.successor_ndo_hash
  {
    return Ok(ValidateCallbackResult::Invalid(
      "NondominiumIdentity successor_ndo_hash is immutable once set".to_string(),
    ));
  }

  // --- Semantic state machine ---
  let from = &original.lifecycle_stage;
  let to = &new_entry.lifecycle_stage;

  // Terminal source: EndOfLife has no exit
  if *from == LifecycleStage::EndOfLife {
    return Ok(ValidateCallbackResult::Invalid(
      "EndOfLife is terminal; no further transitions are permitted".to_string(),
    ));
  }

  // Terminal destination: any non-terminal source may Deprecate or end
  if *to == LifecycleStage::Deprecated || *to == LifecycleStage::EndOfLife {
    // hibernation_origin must be cleared when entering a terminal state
    if new_entry.hibernation_origin.is_some() {
      return Ok(ValidateCallbackResult::Invalid(
        "hibernation_origin must be None when entering a terminal state".to_string(),
      ));
    }
    // REQ-NDO-LC-06: Deprecated requires a validated successor hash
    if *to == LifecycleStage::Deprecated {
      match &new_entry.successor_ndo_hash {
        None => {
          return Ok(ValidateCallbackResult::Invalid(
            "Transition to Deprecated requires successor_ndo_hash (REQ-NDO-LC-06)".to_string(),
          ));
        }
        Some(h) => {
          must_get_valid_record(h.clone())?;
        }
      }
    }
    return Ok(ValidateCallbackResult::Valid);
  }

  // successor_ndo_hash may only be set when entering Deprecated (caught above)
  if new_entry.successor_ndo_hash.is_some() && original.successor_ndo_hash.is_none() {
    return Ok(ValidateCallbackResult::Invalid(
      "successor_ndo_hash may only be set when transitioning to Deprecated".to_string(),
    ));
  }

  // Entering Hibernating: record origin, reject Hibernating → Hibernating
  if *to == LifecycleStage::Hibernating {
    if *from == LifecycleStage::Hibernating {
      return Ok(ValidateCallbackResult::Invalid(
        "Cannot transition Hibernating → Hibernating".to_string(),
      ));
    }
    // hibernation_origin must be set to the stage being paused
    if new_entry.hibernation_origin.as_ref() != Some(from) {
      return Ok(ValidateCallbackResult::Invalid(format!(
        "hibernation_origin must equal the current stage ({:?}) when entering Hibernating",
        from
      )));
    }
    return Ok(ValidateCallbackResult::Valid);
  }

  // Resuming from Hibernating: must return to origin, clear origin field
  if *from == LifecycleStage::Hibernating {
    let origin = original.hibernation_origin.as_ref().ok_or_else(|| {
      wasm_error!(WasmErrorInner::Guest(
        "Hibernating entry is missing hibernation_origin — data integrity error".to_string()
      ))
    })?;
    if to != origin {
      return Ok(ValidateCallbackResult::Invalid(format!(
        "Resuming from Hibernating must return to the origin stage ({:?}), not {:?}",
        origin, to
      )));
    }
    if new_entry.hibernation_origin.is_some() {
      return Ok(ValidateCallbackResult::Invalid(
        "hibernation_origin must be None after resuming from Hibernating".to_string(),
      ));
    }
    return Ok(ValidateCallbackResult::Valid);
  }

  // hibernation_origin must remain None outside of Hibernating transitions
  if new_entry.hibernation_origin.is_some() {
    return Ok(ValidateCallbackResult::Invalid(
      "hibernation_origin must be None for non-Hibernating transitions".to_string(),
    ));
  }

  // Forward maturity chain (monotonic, no skipping)
  let allowed_next = match from {
    LifecycleStage::Ideation      => Some(LifecycleStage::Specification),
    LifecycleStage::Specification => Some(LifecycleStage::Development),
    LifecycleStage::Development   => Some(LifecycleStage::Prototype),
    LifecycleStage::Prototype     => Some(LifecycleStage::Stable),
    LifecycleStage::Stable        => Some(LifecycleStage::Distributed),
    LifecycleStage::Distributed   => Some(LifecycleStage::Active),
    LifecycleStage::Active        => None, // Active exits only via Hibernating/terminal (above)
    LifecycleStage::Deprecated    => None, // Deprecated exits only via EndOfLife (above)
    _ => None,
  };

  match allowed_next {
    Some(ref next) if next == to => Ok(ValidateCallbackResult::Valid),
    _ => Ok(ValidateCallbackResult::Invalid(format!(
      "Invalid lifecycle transition: {:?} → {:?} is not permitted",
      from, to
    ))),
  }
}

// REQ-NDO-L0-06: Layer 0 entries cannot be deleted. The identity is permanent.
fn validate_delete_nondominium_identity() -> ExternResult<ValidateCallbackResult> {
  Ok(ValidateCallbackResult::Invalid(
    "NondominiumIdentity entries cannot be deleted. Layer 0 is permanent.".to_string(),
  ))
}

fn validate_update_resource_spec(
  _spec: &ResourceSpecification,
  _author: &AgentPubKey,
) -> ExternResult<ValidateCallbackResult> {
  // For Phase 1, allow updates
  // Phase 2 will add governance-based update validation
  Ok(ValidateCallbackResult::Valid)
}

fn validate_update_economic_resource(
  _resource: &EconomicResource,
  _author: &AgentPubKey,
) -> ExternResult<ValidateCallbackResult> {
  // For Phase 1, allow updates
  // Phase 2 will add custody transfer validation
  Ok(ValidateCallbackResult::Valid)
}

fn validate_update_governance_rule(
  _rule: &GovernanceRule,
  _author: &AgentPubKey,
) -> ExternResult<ValidateCallbackResult> {
  // For Phase 1, allow updates
  // Phase 2 will add proper governance rule update validation
  Ok(ValidateCallbackResult::Valid)
}
