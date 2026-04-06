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
//
// Note: The spec (§8.2) defines 3 variants (Digital, Physical, Hybrid). This implementation
// extends that to 5 by adding Service and Information, which are first-class resource natures
// in the OVN/ValueFlows context and needed for NDOs representing software services and
// knowledge assets. These additions are backwards-compatible (existing records are unaffected)
// and do not conflict with any spec constraint. See PR #80 Decisions table.
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
// end-of-life. All fields are immutable after creation EXCEPT lifecycle_stage (and
// successor_ndo_hash, which is set exactly once when transitioning to Deprecated).
// The original ActionHash from create_ndo is the stable Layer 0 identity for all time.
// See: documentation/requirements/ndo_prima_materia.md §4.2 and §9.1
#[hdk_entry_helper]
#[derive(Clone, PartialEq)]
pub struct NondominiumIdentity {
  pub name: String,
  pub initiator: AgentPubKey,
  pub property_regime: PropertyRegime,
  pub resource_nature: ResourceNature,
  pub lifecycle_stage: LifecycleStage, // the ONLY mutable field (REQ-NDO-L0-04)
  pub created_at: Timestamp,
  // Immutable after creation. REQ-NDO-L0-04 is stricter than the spec strictly requires here;
  // description is frozen intentionally to prevent retroactive reframing of the resource's
  // original intent. Post-MVP: consider a separate mutable `notes` field if editorial
  // corrections are needed without altering the canonical identity record.
  pub description: Option<String>,
  // Required when lifecycle_stage == Deprecated (REQ-NDO-LC-06).
  // Set exactly once during the Deprecated transition; immutable once set.
  // #[serde(default)] ensures existing pre-field records deserialize to None.
  //
  // Note: the spec (§8.1) does not include this field — successor relationship is
  // spec-defined as a link only (NdoToSuccessor). This implementation stores it as both
  // a field AND a link, making the successor inspectable on the entry without a link
  // traversal. The NdoToSuccessor link is still created for graph-query compatibility.
  // See PR #80 Decisions table.
  #[serde(default)]
  pub successor_ndo_hash: Option<ActionHash>,
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
        // Identify whether the deleted entry is a NondominiumIdentity (REQ-NDO-L0-03)
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

  Ok(ValidateCallbackResult::Valid)
}

// REQ-NDO-L0-04: Only lifecycle_stage (and successor_ndo_hash during the Deprecated
// transition) may be updated after creation. All other fields are permanently immutable.
// REQ-NDO-LC-04: State machine transition allowlist enforced — Hibernating is reversible;
// Deprecated and EndOfLife are terminal.
// REQ-NDO-LC-06: Transitioning to Deprecated requires a successor NDO hash.
// Note: initiator-only restriction is an MVP simplification of REQ-NDO-LC-07 (governance
// zome enforces authorized role per transition). Full role-based authorization is deferred.
fn validate_update_nondominium_identity(
  action: &Update,
  original: &NondominiumIdentity,
  new_entry: &NondominiumIdentity,
) -> ExternResult<ValidateCallbackResult> {
  // Only the initiator may advance the lifecycle stage (MVP simplification of REQ-NDO-LC-07)
  if action.author != original.initiator {
    return Ok(ValidateCallbackResult::Invalid(
      "Only the initiator may update NondominiumIdentity lifecycle stage".to_string(),
    ));
  }

  // --- Immutable fields ---
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

  // --- successor_ndo_hash immutability: once set, cannot change ---
  if original.successor_ndo_hash.is_some()
    && new_entry.successor_ndo_hash != original.successor_ndo_hash
  {
    return Ok(ValidateCallbackResult::Invalid(
      "NondominiumIdentity successor_ndo_hash is immutable once set".to_string(),
    ));
  }

  // --- State machine: enforce transition allowlist (REQ-NDO-LC-04) ---
  let from = &original.lifecycle_stage;
  let to = &new_entry.lifecycle_stage;

  let allowed: &[LifecycleStage] = match from {
    LifecycleStage::Ideation      => &[LifecycleStage::Specification],
    LifecycleStage::Specification => &[LifecycleStage::Development],
    LifecycleStage::Development   => &[LifecycleStage::Prototype,   LifecycleStage::Hibernating],
    LifecycleStage::Prototype     => &[LifecycleStage::Stable,      LifecycleStage::Hibernating],
    LifecycleStage::Stable        => &[LifecycleStage::Distributed, LifecycleStage::Hibernating],
    LifecycleStage::Distributed   => &[LifecycleStage::Active,      LifecycleStage::Hibernating],
    LifecycleStage::Active        => &[
      LifecycleStage::Hibernating,
      LifecycleStage::Deprecated,
      LifecycleStage::EndOfLife,
    ],
    // Hibernating is the only reversible pause state (REQ-NDO-LC-04)
    LifecycleStage::Hibernating   => &[LifecycleStage::Active, LifecycleStage::Deprecated],
    // Terminal states: Deprecated can only move to EndOfLife; EndOfLife has no exit
    LifecycleStage::Deprecated    => &[LifecycleStage::EndOfLife],
    LifecycleStage::EndOfLife     => &[], // fully terminal — no transitions permitted
  };

  if !allowed.contains(to) {
    return Ok(ValidateCallbackResult::Invalid(format!(
      "Invalid lifecycle transition: {:?} → {:?} is not permitted by the state machine",
      from, to
    )));
  }

  // --- REQ-NDO-LC-06: Transitioning to Deprecated requires a successor NDO hash ---
  if *to == LifecycleStage::Deprecated {
    match &new_entry.successor_ndo_hash {
      None => {
        return Ok(ValidateCallbackResult::Invalid(
          "Transition to Deprecated requires successor_ndo_hash (REQ-NDO-LC-06)".to_string(),
        ));
      }
      Some(h) => {
        // Verify the successor hash resolves to a real record on the DHT.
        // must_get_valid_record propagates UnresolvedDependencies via ? if not yet fetched.
        must_get_valid_record(h.clone())?;
        // TODO (post-MVP): verify the resolved record's entry type is NondominiumIdentity.
        // Currently only record existence is checked; a motivated actor could reference an
        // arbitrary action hash as the "successor". Deserializing EntryTypes here would add
        // strong type safety at the cost of additional DHT reads in the validation path.
      }
    }
  }

  // --- successor_ndo_hash may only be set when transitioning to Deprecated ---
  if new_entry.successor_ndo_hash.is_some()
    && original.successor_ndo_hash.is_none()
    && *to != LifecycleStage::Deprecated
  {
    return Ok(ValidateCallbackResult::Invalid(
      "successor_ndo_hash may only be set when transitioning to Deprecated".to_string(),
    ));
  }

  Ok(ValidateCallbackResult::Valid)
}

// REQ-NDO-L0-03: Layer 0 entries cannot be deleted. The identity is permanent.
// REQ-NDO-L0-06: At EndOfLife the entry remains readable as a tombstone — ensured by this delete gate.
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
