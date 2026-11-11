use crate::ResourceError;
use hdk::prelude::*;
use zome_resource_integrity::*;

// Input for creating a NondominiumIdentity (Layer 0 anchor)
#[derive(Debug, Serialize, Deserialize)]
pub struct NdoInput {
  pub name: String,
  pub property_regime: PropertyRegime,
  pub resource_nature: ResourceNature,
  pub lifecycle_stage: LifecycleStage,
  pub description: Option<String>,
  /// Optional override of `ResourceNature::default_rivalry()`. Immutable after creation.
  pub rivalry_override: Option<Rivalry>,
  /// Physical/Hybrid inventoriable fork (Use vs Consume). Ignored for Digital.
  #[serde(default)]
  pub economic_mode: Option<EconomicMode>,
  #[serde(default)]
  pub use_kind: Option<UseKind>,
  #[serde(default)]
  pub default_unit: Option<String>,
  #[serde(default)]
  pub identification_pattern: Option<IdentificationPattern>,
  #[serde(default)]
  pub unique_id: Option<String>,
  #[serde(default)]
  pub max_concurrent_users: Option<u32>,
  /// Seeds EconomicResource on hard dual create; also stored on identity for
  /// deferred dual create when the NDO starts at Ideation.
  #[serde(default)]
  pub initial_quantity: Option<f64>,
}

// Output from create_ndo — the action_hash IS the stable Layer 0 identity.
// Optional inventory hashes are set when hard dual create activated Layer 1.
#[derive(Debug, Serialize, Deserialize)]
pub struct NdoOutput {
  pub action_hash: ActionHash,
  pub entry: NondominiumIdentity,
  /// Present when `economic_mode` triggered hard dual create of a ResourceSpecification.
  #[serde(default)]
  pub specification_action_hash: Option<ActionHash>,
  /// Present when hard dual create also seeded an EconomicResource.
  #[serde(default)]
  pub economic_resource_action_hash: Option<ActionHash>,
}

// Output from get_all_ndos
#[derive(Debug, Serialize, Deserialize)]
pub struct GetAllNdosOutput {
  pub ndos: Vec<NdoOutput>,
}

// One recorded lifecycle transition, derived from the NondominiumIdentity update chain.
// REQ-UI-NDO-04.
//
// `event_hash` is the ActionHash of the Update action that recorded the transition. That
// action always exists — it IS the transition — so the panel always has a hash to show and
// copy. It is deliberately not the triggering EconomicEvent: `transition_event_hash` is
// optional on `update_lifecycle_stage`, is null throughout the MVP, and its
// `NdoToTransitionEvent` links hang off the NDO's original action hash with nothing tying a
// given link to a given transition. Attributing one to a specific step would be a guess.
// When REQ-NDO-LC-03 makes event generation automatic, that hash can be added as its own
// field rather than by overloading this one.
#[derive(Debug, Serialize, Deserialize)]
pub struct NdoTransitionHistoryEvent {
  pub from_stage: LifecycleStage,
  pub to_stage: LifecycleStage,
  pub agent: AgentPubKey,
  pub timestamp: Timestamp,
  pub event_hash: ActionHash,
}

// Input for updating a NondominiumIdentity's lifecycle stage (the only permitted mutation).
// REQ-NDO-LC-06: successor_ndo_hash required when new_stage == Deprecated.
// REQ-NDO-L0-05: transition_event_hash references the triggering EconomicEvent.
//   Link is created when Some; full cross-zome validation of the event is deferred
//   until coordinator cross-zome calls to zome_gouvernance are stable.
#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateLifecycleStageInput {
  pub original_action_hash: ActionHash,
  pub new_stage: LifecycleStage,
  /// Must be Some when new_stage == Deprecated (REQ-NDO-LC-06)
  pub successor_ndo_hash: Option<ActionHash>,
  /// Triggering EconomicEvent action hash (REQ-NDO-L0-05); link created when Some
  pub transition_event_hash: Option<ActionHash>,
  /// Required for Consume-mode NDOs entering Deprecated / EndOfLife.
  #[serde(default)]
  pub closure_reason: Option<ClosureReason>,
  #[serde(default)]
  pub closure_note: Option<String>,
}

// Path helpers for NDO categorization anchors (issue #75).
// Using {:#?} would add newlines; {:?} gives the variant name: LifecycleStage::Ideation → "Ideation".
fn lifecycle_stage_path(stage: &LifecycleStage) -> ExternResult<EntryHash> {
  Path::from(format!("ndo.lifecycle.{:?}", stage)).path_entry_hash()
}

fn resource_nature_path(nature: &ResourceNature) -> ExternResult<EntryHash> {
  Path::from(format!("ndo.nature.{:?}", nature)).path_entry_hash()
}

fn property_regime_path(regime: &PropertyRegime) -> ExternResult<EntryHash> {
  Path::from(format!("ndo.regime.{:?}", regime)).path_entry_hash()
}

/// Resolve a batch of DHT links into NdoOutput entries.
///
/// For each link, extracts the target action hash, resolves the latest record via the
/// update chain, and deserializes the entry. Links that fail any step are silently
/// skipped (DHT availability is eventual). Used by all NDO query functions.
fn resolve_ndo_links(links: Vec<Link>) -> ExternResult<Vec<NdoOutput>> {
  let mut ndos = Vec::new();
  for link in links {
    let Some(action_hash) = link.target.into_action_hash() else {
      continue;
    };
    let Some(record) = resolve_latest_ndo_record(action_hash.clone())? else {
      continue;
    };
    let Ok(Some(entry)) = record.entry().to_app_option::<NondominiumIdentity>() else {
      continue;
    };
    ndos.push(NdoOutput {
      action_hash,
      entry,
      specification_action_hash: None,
      economic_resource_action_hash: None,
    });
  }
  Ok(ndos)
}

/// Resolves the HDK update chain to the latest Record for a NondominiumIdentity.
/// Returns None if the original_action_hash does not exist on the DHT.
///
/// Used by both get_ndo and update_lifecycle_stage to avoid duplicated chain traversal logic.
pub(crate) fn resolve_latest_ndo_record(original_action_hash: ActionHash) -> ExternResult<Option<Record>> {
  let mut current_hash = original_action_hash;
  loop {
    match get_details(current_hash.clone(), GetOptions::default())? {
      Some(Details::Record(record_details)) => {
        if record_details.updates.is_empty() {
          return Ok(Some(record_details.record));
        }
        // Follow the most recent update in the chain.
        // Tie-breaking: if two updates share the same timestamp (rare on the DHT),
        // max_by_key picks one deterministically by iteration order. This is acceptable
        // because simultaneous updates from different agents would themselves be a
        // conflict the initiator must resolve via a subsequent update.
        current_hash = record_details
          .updates
          .into_iter()
          .max_by_key(|sah| sah.action().timestamp())
          .ok_or(ResourceError::EntryOperationFailed(
            "Empty updates list during chain traversal".to_string(),
          ))?
          .hashed
          .hash;
      }
      _ => return Ok(None),
    }
  }
}

/// Create a new NondominiumIdentity (NDO Layer 0 anchor).
///
/// The returned action_hash is the stable, permanent Layer 0 identity for this resource.
/// It never changes, even as lifecycle_stage evolves through subsequent updates.
///
/// REQ-NDO-L0-01, REQ-NDO-L0-02, REQ-NDO-L0-07
fn layer1_eligible(stage: &LifecycleStage) -> bool {
  !matches!(
    stage,
    LifecycleStage::Ideation
      | LifecycleStage::Hibernating
      | LifecycleStage::Deprecated
      | LifecycleStage::EndOfLife
  )
}

fn validate_economic_foreshadow(input: &NdoInput) -> ExternResult<()> {
  let Some(mode) = &input.economic_mode else {
    return Ok(());
  };
  if matches!(input.resource_nature, ResourceNature::Digital) {
    return Err(ResourceError::InvalidInput(
      "economic_mode is not valid for Digital resources".to_string(),
    )
    .into());
  }
  match mode {
    EconomicMode::Use => {
      let kind = input.use_kind.as_ref().ok_or_else(|| {
        ResourceError::InvalidInput("use_kind required when economic_mode is Use".to_string())
      })?;
      if *kind == UseKind::Capacity {
        match input.max_concurrent_users {
          Some(n) if n >= 2 => {}
          _ => {
            return Err(ResourceError::InvalidInput(
              "max_concurrent_users (>= 2) required for Use/capacity".to_string(),
            )
            .into());
          }
        }
      }
    }
    EconomicMode::Consume => {
      if input
        .default_unit
        .as_ref()
        .map(|u| u.trim().is_empty())
        .unwrap_or(true)
      {
        return Err(ResourceError::InvalidInput(
          "default_unit required when economic_mode is Consume".to_string(),
        )
        .into());
      }
      match input.initial_quantity {
        Some(q) if q > 0.0 && q.is_finite() => {}
        _ => {
          return Err(ResourceError::InvalidInput(
            "initial_quantity (> 0) required when economic_mode is Consume".to_string(),
          )
          .into());
        }
      }
      if input.identification_pattern.is_none() {
        return Err(ResourceError::InvalidInput(
          "identification_pattern (LotControlled|Stock) required for Consume".to_string(),
        )
        .into());
      }
    }
  }
  Ok(())
}

/// When economic_mode is set and Layer 1 is eligible, create a Project-scoped
/// ResourceSpecification + EconomicResource (hard dual create).
fn hard_dual_create_inventory(
  ndo_hash: ActionHash,
  entry: &NondominiumIdentity,
  initial_quantity: Option<f64>,
) -> ExternResult<(ActionHash, ActionHash)> {
  let agent_info = agent_info()?;
  let mode = entry.economic_mode.as_ref().ok_or_else(|| {
    ResourceError::InvalidInput("hard dual create requires economic_mode".to_string())
  })?;

  let (qty, unit, identification, inventory_intent) = match mode {
    EconomicMode::Use => {
      let unit = entry
        .default_unit
        .clone()
        .unwrap_or_else(|| "each".to_string());
      // Inventoried foreshadow requires an identification pattern.
      // Use/unit with optional serial → Serialized; Use/capacity place → Stock.
      let identification = Some(match entry.use_kind {
        Some(UseKind::Capacity) => IdentificationPattern::Stock,
        _ => IdentificationPattern::Serialized,
      });
      (1.0, unit, identification, InventoryIntent::Inventoried)
    }
    EconomicMode::Consume => {
      let unit = entry.default_unit.clone().ok_or_else(|| {
        ResourceError::InvalidInput("Consume dual create needs default_unit".to_string())
      })?;
      let qty = initial_quantity.ok_or_else(|| {
        ResourceError::InvalidInput("Consume dual create needs initial_quantity".to_string())
      })?;
      (
        qty,
        unit,
        entry.identification_pattern.clone(),
        InventoryIntent::Inventoried,
      )
    }
  };

  let mut governance_rules: Vec<ActionHash> = Vec::new();
  if matches!(
    (mode, entry.use_kind.as_ref()),
    (EconomicMode::Use, Some(UseKind::Capacity))
  ) {
    if let Some(max) = entry.max_concurrent_users {
      let rule = GovernanceRule {
        rule_data: RuleData::UsageLimit(nondominium_shared::UsageLimitData {
          max_duration_hours: None,
          max_quantity_per_period: None,
          period_days: None,
          max_concurrent_users: Some(max),
          max_per_agent: None,
        }),
        enforced_by: None,
        ndo_identity_hash: ndo_hash.clone(),
        property_regime: entry.property_regime.clone(),
        resource_nature: entry.resource_nature.clone(),
        rivalry_override: entry.rivalry_override.clone(),
      };
      let rule_hash = create_entry(&EntryTypes::GovernanceRule(rule))?;
      governance_rules.push(rule_hash.clone());
      let rules_path = Path::from("governance_rules");
      create_link(
        rules_path.path_entry_hash()?,
        rule_hash.clone(),
        LinkTypes::AllGovernanceRules,
        (),
      )?;
    }
  }

  let spec = ResourceSpecification {
    name: entry.name.clone(),
    description: entry
      .description
      .clone()
      .unwrap_or_else(|| format!("Auto-activated inventory for {}", entry.name)),
    category: "inventory".to_string(),
    image_url: None,
    tags: vec!["hard-dual-create".to_string()],
    is_active: true,
    scope: ResourceScope::Project,
    ndo_identity_hash: ndo_hash.clone(),
    ndo_state_hash: ndo_hash.clone(),
    inventory_intent: Some(inventory_intent),
    identification_pattern: identification,
    default_unit: Some(unit.clone()),
    substitutable: Some(matches!(mode, EconomicMode::Consume)),
    digital_locator_kind: None,
    digital_locator: None,
  };

  let spec_hash = create_entry(&EntryTypes::ResourceSpecification(spec))?;
  create_link(
    ndo_hash.clone(),
    spec_hash.clone(),
    LinkTypes::NdoToSpecification,
    (),
  )?;
  create_link(
    agent_info.agent_initial_pubkey.clone(),
    spec_hash.clone(),
    LinkTypes::AgentToOwnedSpecs,
    (),
  )?;
  for rule_hash in &governance_rules {
    create_link(
      spec_hash.clone(),
      rule_hash.clone(),
      LinkTypes::SpecificationToGovernanceRule,
      (),
    )?;
  }

  let quantity = Measure::new(qty, unit);
  quantity
    .validate()
    .map_err(|e| ResourceError::InvalidInput(format!("Invalid quantity: {e}")))?;
  if quantity.numerical_value <= 0.0 {
    return Err(ResourceError::InvalidInput("Quantity must be positive".to_string()).into());
  }

  let resource = EconomicResource {
    quantity,
    custodian: agent_info.agent_initial_pubkey.clone(),
    current_location: entry.unique_id.clone(),
    operational_state: OperationalState::PendingValidation,
  };
  let resource_hash = create_entry(&EntryTypes::EconomicResource(resource))?;

  let path = Path::from("economic_resources");
  create_link(
    path.path_entry_hash()?,
    resource_hash.clone(),
    LinkTypes::AllEconomicResources,
    (),
  )?;
  create_link(
    Path::from(format!(
      "ndo.opstate.{:?}",
      OperationalState::PendingValidation
    ))
    .path_entry_hash()?,
    resource_hash.clone(),
    LinkTypes::ResourcesByOperationalState,
    (),
  )?;
  create_link(
    spec_hash.clone(),
    resource_hash.clone(),
    LinkTypes::SpecificationToResource,
    (),
  )?;
  create_link(
    agent_info.agent_initial_pubkey.clone(),
    resource_hash.clone(),
    LinkTypes::CustodianToResource,
    (),
  )?;
  create_link(
    agent_info.agent_initial_pubkey.clone(),
    resource_hash.clone(),
    LinkTypes::AgentToManagedResources,
    (),
  )?;

  Ok((spec_hash, resource_hash))
}

#[hdk_extern]
pub fn create_ndo(input: NdoInput) -> ExternResult<NdoOutput> {
  if input.name.trim().is_empty() {
    return Err(ResourceError::InvalidInput("Name cannot be empty".to_string()).into());
  }

  validate_economic_foreshadow(&input)?;

  let agent_info = agent_info()?;

  let entry = NondominiumIdentity {
    name: input.name,
    initiator: agent_info.agent_initial_pubkey.clone(),
    property_regime: input.property_regime,
    resource_nature: input.resource_nature,
    lifecycle_stage: input.lifecycle_stage.clone(),
    created_at: sys_time()?,
    description: input.description,
    rivalry_override: input.rivalry_override,
    successor_ndo_hash: None,
    hibernation_origin: None,
    economic_mode: input.economic_mode.clone(),
    use_kind: input.use_kind.clone(),
    default_unit: input.default_unit.clone(),
    identification_pattern: input.identification_pattern.clone(),
    unique_id: input.unique_id.clone(),
    max_concurrent_users: input.max_concurrent_users,
    initial_quantity: input.initial_quantity,
    closure_reason: None,
    closure_note: None,
  };

  let action_hash = create_entry(&EntryTypes::NondominiumIdentity(entry.clone()))?;

  // Global discovery anchor — all NDOs discoverable by anyone
  let all_ndos_path = Path::from("ndo_identities");
  create_link(
    all_ndos_path.path_entry_hash()?,
    action_hash.clone(),
    LinkTypes::AllNdos,
    (),
  )?;

  // Agent-centric discovery — initiator's NDOs discoverable per agent
  create_link(
    agent_info.agent_initial_pubkey.clone(),
    action_hash.clone(),
    LinkTypes::AgentToNdo,
    (),
  )?;

  // Categorization anchors for filtered discovery (issue #75).
  // NdoByNature and NdoByPropertyRegime are immutable — created once, never moved.
  // NdoByLifecycleStage is moved by update_lifecycle_stage when stage changes.
  create_link(
    lifecycle_stage_path(&entry.lifecycle_stage)?,
    action_hash.clone(),
    LinkTypes::NdoByLifecycleStage,
    (),
  )?;
  create_link(
    resource_nature_path(&entry.resource_nature)?,
    action_hash.clone(),
    LinkTypes::NdoByNature,
    (),
  )?;
  create_link(
    property_regime_path(&entry.property_regime)?,
    action_hash.clone(),
    LinkTypes::NdoByPropertyRegime,
    (),
  )?;

  // Hard dual create: inventoriable Use/Consume at Layer 0 when Layer 1 is eligible.
  let mut specification_action_hash = None;
  let mut economic_resource_action_hash = None;
  if entry.economic_mode.is_some() && layer1_eligible(&entry.lifecycle_stage) {
    let (spec_hash, resource_hash) =
      hard_dual_create_inventory(action_hash.clone(), &entry, entry.initial_quantity)?;
    specification_action_hash = Some(spec_hash);
    economic_resource_action_hash = Some(resource_hash);
  }

  Ok(NdoOutput {
    action_hash,
    entry,
    specification_action_hash,
    economic_resource_action_hash,
  })
}

/// Retrieve the latest NondominiumIdentity by its original action hash.
///
/// Resolves the HDK update chain iteratively: if the entry has been updated
/// (lifecycle_stage progression), returns the most recent version. The
/// original_action_hash remains the stable Layer 0 identity regardless of updates.
///
/// Returns None if the entry does not exist.
///
/// REQ-NDO-L0-01, REQ-NDO-L0-07
#[hdk_extern]
pub fn get_ndo(original_action_hash: ActionHash) -> ExternResult<Option<NondominiumIdentity>> {
  let Some(record) = resolve_latest_ndo_record(original_action_hash)? else {
    return Ok(None);
  };
  record
    .entry()
    .to_app_option::<NondominiumIdentity>()
    .map_err(|e| {
      ResourceError::SerializationError(format!(
        "Failed to deserialize NondominiumIdentity: {:?}",
        e
      ))
      .into()
    })
}

/// Update the lifecycle_stage of a NondominiumIdentity.
///
/// This is the ONLY permitted mutation on a Layer 0 entry (plus successor_ndo_hash,
/// which is set exactly once when transitioning to Deprecated). All other fields are
/// enforced as immutable by the integrity validation (REQ-NDO-L0-04).
/// Only the initiator may call this function (MVP simplification of REQ-NDO-LC-07 —
/// full role-based authorization per §5.3 is deferred to governance zome integration).
///
/// When new_stage == Deprecated, successor_ndo_hash must be Some — enforced here and
/// in the integrity zome (REQ-NDO-LC-06). Creates NdoToSuccessor link.
///
/// Creates NdoToTransitionEvent link when transition_event_hash is Some (REQ-NDO-L0-05).
/// Full cross-zome validation of the event target is deferred until coordinator
/// cross-zome calls to zome_gouvernance are stable.
///
/// Returns the new action hash. The original_action_hash remains the stable Layer 0 identity.
///
/// REQ-NDO-L0-04, REQ-NDO-LC-01 through REQ-NDO-LC-07
#[hdk_extern]
pub fn update_lifecycle_stage(input: UpdateLifecycleStageInput) -> ExternResult<ActionHash> {
  let caller = agent_info()?.agent_initial_pubkey;

  let record = resolve_latest_ndo_record(input.original_action_hash.clone())?
    .ok_or(ResourceError::EntryOperationFailed(
      "NondominiumIdentity not found for update".to_string(),
    ))?;

  let mut current_entry: NondominiumIdentity = record
    .entry()
    .to_app_option()
    .map_err(|e| {
      ResourceError::SerializationError(format!(
        "Failed to deserialize NondominiumIdentity: {:?}",
        e
      ))
    })?
    .ok_or(ResourceError::EntryOperationFailed(
      "NondominiumIdentity entry not found in latest record".to_string(),
    ))?;

  // Only the initiator may advance the lifecycle stage (MVP simplification of REQ-NDO-LC-07)
  if caller != current_entry.initiator {
    return Err(ResourceError::NotAuthor.into());
  }

  // Coordinator pre-flight: Deprecated requires a successor (REQ-NDO-LC-06)
  if input.new_stage == LifecycleStage::Deprecated && input.successor_ndo_hash.is_none() {
    return Err(ResourceError::InvalidInput(
      "Transitioning to Deprecated requires successor_ndo_hash (REQ-NDO-LC-06)".to_string(),
    )
    .into());
  }

  let entering_terminal = matches!(
    input.new_stage,
    LifecycleStage::Deprecated | LifecycleStage::EndOfLife
  );

  // Consume-mode batches require a closure reason at terminal (integrity also enforces).
  if entering_terminal
    && current_entry.economic_mode == Some(EconomicMode::Consume)
    && input.closure_reason.is_none()
    && current_entry.closure_reason.is_none()
  {
    return Err(ResourceError::InvalidInput(
      "Consume-mode NDO requires closure_reason when entering Deprecated or EndOfLife"
        .to_string(),
    )
    .into());
  }

  // Apply mutations — integrity validation enforces the state machine and immutability.
  // hibernation_origin is managed automatically; callers do not set it directly.
  let old_stage = current_entry.lifecycle_stage.clone();
  let from = old_stage.clone();
  let to = input.new_stage.clone();

  // Entering Hibernating: record the stage being paused
  if to == LifecycleStage::Hibernating {
    current_entry.hibernation_origin = Some(from.clone());
  }
  // Exiting Hibernating or entering a terminal state: clear the origin field
  if from == LifecycleStage::Hibernating
    || to == LifecycleStage::Deprecated
    || to == LifecycleStage::EndOfLife
  {
    current_entry.hibernation_origin = None;
  }

  current_entry.lifecycle_stage = to.clone();
  // Only update successor_ndo_hash when entering Deprecated. Preserve the existing value
  // for all other transitions — Deprecated → EndOfLife must not overwrite the already-set
  // successor hash with None (integrity rejects immutable-once-set field changes).
  if to == LifecycleStage::Deprecated {
    current_entry.successor_ndo_hash = input.successor_ndo_hash.clone();
  }
  if entering_terminal {
    if current_entry.closure_reason.is_none() {
      current_entry.closure_reason = input.closure_reason.clone();
    }
    if current_entry.closure_note.is_none() {
      current_entry.closure_note = input.closure_note.clone();
    }
  }

  let latest_action_hash = record.action_address().clone();
  let update_hash = update_entry(latest_action_hash, &current_entry)?;

  // REQ-NDO-LC-06: Create successor link when transitioning to Deprecated
  if input.new_stage == LifecycleStage::Deprecated {
    let successor_hash = input.successor_ndo_hash.ok_or_else(|| {
      ResourceError::InvalidInput(
        "successor_ndo_hash required for Deprecated transition (REQ-NDO-LC-06)".to_string(),
      )
    })?;
    create_link(
      input.original_action_hash.clone(),
      successor_hash,
      LinkTypes::NdoToSuccessor,
      (),
    )?;
  }

  // REQ-NDO-L0-05: Create transition event link when a triggering event hash is provided
  if let Some(event_hash) = input.transition_event_hash {
    create_link(
      input.original_action_hash.clone(),
      event_hash,
      LinkTypes::NdoToTransitionEvent,
      (),
    )?;
  }

  // Move NdoByLifecycleStage categorization anchor when stage changes (issue #75).
  // Delete the link from the old stage anchor that targets original_action_hash,
  // then create a new link from the new stage anchor. NdoByNature and NdoByPropertyRegime
  // are immutable and never moved.
  if old_stage != input.new_stage {
    let old_links = get_links(
      LinkQuery::try_new(lifecycle_stage_path(&old_stage)?, LinkTypes::NdoByLifecycleStage)?,
      GetStrategy::default(),
    )?;
    for link in old_links {
      if let Some(target_hash) = link.target.into_action_hash() {
        if target_hash == input.original_action_hash {
          delete_link(link.create_link_hash, GetOptions::default())?;
          break;
        }
      }
    }
    create_link(
      lifecycle_stage_path(&input.new_stage)?,
      input.original_action_hash.clone(),
      LinkTypes::NdoByLifecycleStage,
      (),
    )?;
  }

  // Deferred hard dual create: Ideation (or other non-L1 stage) foreshadowed
  // economic_mode; first transition into a Layer-1-eligible stage seeds inventory.
  // Idempotent — skip if a ResourceSpecification link already exists.
  if current_entry.economic_mode.is_some()
    && layer1_eligible(&input.new_stage)
    && !layer1_eligible(&old_stage)
  {
    let existing = get_links(
      LinkQuery::try_new(
        input.original_action_hash.clone(),
        LinkTypes::NdoToSpecification,
      )?,
      GetStrategy::default(),
    )?;
    if existing.is_empty() {
      hard_dual_create_inventory(
        input.original_action_hash.clone(),
        &current_entry,
        current_entry.initial_quantity,
      )?;
    }
  }

  Ok(update_hash)
}

/// Retrieve all NondominiumIdentities via the global "ndo_identities" anchor.
///
/// Returns the latest version of each NDO (chain-resolved). Entries that fail
/// to resolve or deserialize are silently skipped — DHT availability is eventual.
///
/// REQ-NDO-L0-07
#[hdk_extern]
pub fn get_all_ndos(_: ()) -> ExternResult<GetAllNdosOutput> {
  let path = Path::from("ndo_identities");
  let links_query =
    LinkQuery::try_new(path.path_entry_hash()?, LinkTypes::AllNdos)?;
  let links = get_links(links_query, GetStrategy::default())?;
  Ok(GetAllNdosOutput { ndos: resolve_ndo_links(links)? })
}

/// Return all NondominiumIdentities at a given lifecycle stage.
///
/// Uses the NdoByLifecycleStage categorization anchor maintained by create_ndo
/// and update_lifecycle_stage. Returns the latest version of each NDO.
/// Entries that fail to resolve or deserialize are silently skipped.
///
/// REQ-NDO-L0-05, REQ-NDO-L0-07
#[hdk_extern]
pub fn get_ndos_by_lifecycle_stage(stage: LifecycleStage) -> ExternResult<GetAllNdosOutput> {
  let links = get_links(
    LinkQuery::try_new(lifecycle_stage_path(&stage)?, LinkTypes::NdoByLifecycleStage)?,
    GetStrategy::default(),
  )?;
  Ok(GetAllNdosOutput { ndos: resolve_ndo_links(links)? })
}

/// Return all NondominiumIdentities of a given resource nature.
///
/// Uses the NdoByNature categorization anchor created at NDO creation time.
/// The nature field is immutable — this anchor never moves.
/// Entries that fail to resolve or deserialize are silently skipped.
///
/// REQ-NDO-L0-05, REQ-NDO-L0-07
#[hdk_extern]
pub fn get_ndos_by_nature(nature: ResourceNature) -> ExternResult<GetAllNdosOutput> {
  let links = get_links(
    LinkQuery::try_new(resource_nature_path(&nature)?, LinkTypes::NdoByNature)?,
    GetStrategy::default(),
  )?;
  Ok(GetAllNdosOutput { ndos: resolve_ndo_links(links)? })
}

/// Return all NondominiumIdentities under a given property regime.
///
/// Uses the NdoByPropertyRegime categorization anchor created at NDO creation time.
/// The property_regime field is immutable — this anchor never moves.
/// Entries that fail to resolve or deserialize are silently skipped.
///
/// REQ-NDO-L0-05, REQ-NDO-L0-07
#[hdk_extern]
pub fn get_ndos_by_property_regime(regime: PropertyRegime) -> ExternResult<GetAllNdosOutput> {
  let links = get_links(
    LinkQuery::try_new(property_regime_path(&regime)?, LinkTypes::NdoByPropertyRegime)?,
    GetStrategy::default(),
  )?;
  Ok(GetAllNdosOutput { ndos: resolve_ndo_links(links)? })
}

/// Return all NondominiumIdentities created by the calling agent, resolved to latest entries.
///
/// Uses AgentToNdo links set at creation time. Returns the latest version of each NDO
/// (chain-resolved). Entries that fail to resolve or deserialize are silently skipped.
///
/// REQ-NDO-L0-07
#[hdk_extern]
pub fn get_my_ndos(_: ()) -> ExternResult<GetAllNdosOutput> {
  let agent_pub_key = agent_info()?.agent_initial_pubkey;
  let links = get_links(
    LinkQuery::try_new(agent_pub_key, LinkTypes::AgentToNdo)?,
    GetStrategy::default(),
  )?;
  Ok(GetAllNdosOutput { ndos: resolve_ndo_links(links)? })
}

/// Return the ordered lifecycle transition history of an NDO (REQ-UI-NDO-04).
///
/// Walks the NondominiumIdentity update chain from the original action hash forward. Each
/// Update in that chain is exactly one lifecycle transition: `update_lifecycle_stage` is the
/// only writer of updates, and integrity validation rejects any update that changes a field
/// other than `lifecycle_stage`, `successor_ndo_hash`, or `hibernation_origin`. So the chain
/// IS the history — no separate log entry is needed, and none can drift from it.
///
/// `from_stage` is the stage of the record being superseded; `to_stage`, `agent`, and
/// `timestamp` come from the Update itself, so the history reports who moved the NDO and
/// when, not merely that it moved.
///
/// Returns an empty vec for an NDO that has never transitioned, and for an
/// `original_action_hash` that does not resolve. Traversal follows the most recent update at
/// each step, matching `resolve_latest_ndo_record`, so a forked chain reports the branch that
/// `get_ndo` also reports — the history never disagrees with the displayed stage.
#[hdk_extern]
pub fn get_ndo_transition_history(
  original_action_hash: ActionHash,
) -> ExternResult<Vec<NdoTransitionHistoryEvent>> {
  let mut history = Vec::new();
  let mut current_hash = original_action_hash;

  loop {
    let Some(Details::Record(record_details)) =
      get_details(current_hash.clone(), GetOptions::default())?
    else {
      return Ok(history);
    };

    if record_details.updates.is_empty() {
      return Ok(history);
    }

    // The stage this update moves away from.
    let Ok(Some(from_entry)) = record_details
      .record
      .entry()
      .to_app_option::<NondominiumIdentity>()
    else {
      return Ok(history);
    };

    // Same traversal rule as resolve_latest_ndo_record: follow the most recent update.
    let next = record_details
      .updates
      .into_iter()
      .max_by_key(|sah| sah.action().timestamp())
      .ok_or(ResourceError::EntryOperationFailed(
        "Empty updates list during transition history traversal".to_string(),
      ))?;

    let update_hash = next.hashed.hash.clone();
    let update_action = next.hashed.content.clone();

    let Some(Details::Record(update_details)) =
      get_details(update_hash.clone(), GetOptions::default())?
    else {
      return Ok(history);
    };
    let Ok(Some(to_entry)) = update_details
      .record
      .entry()
      .to_app_option::<NondominiumIdentity>()
    else {
      return Ok(history);
    };

    history.push(NdoTransitionHistoryEvent {
      from_stage: from_entry.lifecycle_stage,
      to_stage: to_entry.lifecycle_stage,
      agent: update_action.author().clone(),
      timestamp: update_action.timestamp(),
      event_hash: update_hash.clone(),
    });

    current_hash = update_hash;
  }
}
