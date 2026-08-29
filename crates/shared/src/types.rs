use hdi::prelude::*;

// ─── NDO Layer 0 enums ────────────────────────────────────────────────────────
// Defined here so both integrity zomes and coordinator zomes import from one
// place rather than re-declaring identical enums.

/// Maturity / evolutionary phase of a NondominiumIdentity.
/// Advances rarely and mostly irreversibly.
/// Serde uses default PascalCase ("Ideation", "Active") to match the original
/// zome_resource_integrity wire format. The Display impl is separate and outputs
/// lowercase ("ideation", "active") for lobby path construction anchors.
#[derive(Clone, PartialEq, Debug, Serialize, Deserialize)]
pub enum LifecycleStage {
  Ideation,
  Specification,
  Development,
  Prototype,
  Stable,
  Distributed,
  Active,
  Hibernating,
  Deprecated,
  EndOfLife,
}

impl std::fmt::Display for LifecycleStage {
  fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
    let s = match self {
      LifecycleStage::Ideation => "ideation",
      LifecycleStage::Specification => "specification",
      LifecycleStage::Development => "development",
      LifecycleStage::Prototype => "prototype",
      LifecycleStage::Stable => "stable",
      LifecycleStage::Distributed => "distributed",
      LifecycleStage::Active => "active",
      LifecycleStage::Hibernating => "hibernating",
      LifecycleStage::Deprecated => "deprecated",
      LifecycleStage::EndOfLife => "end_of_life",
    };
    write!(f, "{}", s)
  }
}

/// Governance / ownership regime of a NondominiumIdentity.
/// Immutable after creation.
///
/// Seven canonical variants (protocol + UI). Semantic helpers below encode the
/// distinctions documented in `resources.md` §4.4.4–§4.4.5 without wiring
/// governance enforcement (Phase B).
#[derive(Clone, PartialEq, Debug, Serialize, Deserialize)]
pub enum PropertyRegime {
  /// Full rights bundle; individual ownership.
  Private,
  /// Non-rivalrous shared; licensing/attribution governance.
  Commons,
  /// Cooperative/collective ownership.
  Collective,
  /// Rivalrous shareables; custody/scheduling/maintenance.
  Pool,
  /// Rivalrous consumable; quota/depletion rules.
  CommonPool,
  /// Public/governmental stewardship; open-access; non-alienable by the public body.
  /// Distinct from Commons (community-governed) and Nondominium (cryptographically uncapturable).
  Public,
  /// Uncapturable by design; no alienation permitted.
  Nondominium,
}

impl PropertyRegime {
  /// Default rivalry *posture* associated with this regime for UI/governance defaults.
  ///
  /// **Not authoritative.** Rivalry is an intrinsic goods-type property derived from
  /// `ResourceNature::default_rivalry()` (with optional `rivalry_override` on Layer 0).
  /// Regime and rivalry are orthogonal (`resources.md` §4.4.3). Prefer
  /// `ResourceClassification::effective_rivalry()` for constraint evaluation.
  pub fn is_rivalrous(&self) -> bool {
    match self {
      PropertyRegime::Private
      | PropertyRegime::Collective
      | PropertyRegime::Pool
      | PropertyRegime::CommonPool => true,
      PropertyRegime::Commons | PropertyRegime::Public | PropertyRegime::Nondominium => false,
    }
  }

  /// Whether ownership (alienation) transfer is permitted under this regime.
  /// False for Commons, Public, Pool, CommonPool, and Nondominium.
  pub fn permits_ownership_transfer(&self) -> bool {
    match self {
      PropertyRegime::Private | PropertyRegime::Collective => true,
      PropertyRegime::Commons
      | PropertyRegime::Pool
      | PropertyRegime::CommonPool
      | PropertyRegime::Public
      | PropertyRegime::Nondominium => false,
    }
  }

  /// Whether the regime is cryptographically / architecturally uncapturable.
  /// Only `Nondominium` is uncapturable by design. `Public` is non-alienable by
  /// policy of the public body but is not cryptographically uncapturable.
  pub fn is_uncapturable(&self) -> bool {
    matches!(self, PropertyRegime::Nondominium)
  }

  /// Default accessibility posture for governance defaults (Phase B).
  /// Free = open access; Credentialed = role/affiliation gated; Gated = formal approval.
  pub fn default_accessibility(&self) -> &'static str {
    match self {
      PropertyRegime::Private => "Gated",
      PropertyRegime::Commons | PropertyRegime::Public | PropertyRegime::Nondominium => "Free",
      PropertyRegime::Collective | PropertyRegime::Pool | PropertyRegime::CommonPool => {
        "Credentialed"
      }
    }
  }
}

/// Physical / digital nature of a NondominiumIdentity.
/// Immutable after creation.
#[derive(Clone, PartialEq, Debug, Serialize, Deserialize)]
pub enum ResourceNature {
  Physical,
  Digital,
  Service,
  Hybrid,
  Information,
}

/// Whether use by one agent excludes others (goods-type / rivalry axis).
/// Orthogonal to `PropertyRegime`. Authoritative default comes from
/// `ResourceNature::default_rivalry()`; Layer 0 may override via `rivalry_override`.
#[derive(Clone, PartialEq, Debug, Serialize, Deserialize)]
pub enum Rivalry {
  Rivalrous,
  NonRivalrous,
}

impl ResourceNature {
  /// Authoritative default rivalry for this nature.
  /// `Service` defaults to NonRivalrous (ambiguous); callers should set
  /// `rivalry_override` when a service slot is actually rivalrous.
  pub fn default_rivalry(&self) -> Rivalry {
    match self {
      ResourceNature::Physical | ResourceNature::Hybrid => Rivalry::Rivalrous,
      ResourceNature::Digital | ResourceNature::Information | ResourceNature::Service => {
        Rivalry::NonRivalrous
      }
    }
  }
}

/// Visibility / discovery scope for a Layer 1 `ResourceSpecification`.
/// Mutable; lives on the specification, not on Layer 0.
#[derive(Clone, PartialEq, Debug, Serialize, Deserialize)]
pub enum ResourceScope {
  Project,
  Network,
  Public,
}

/// Current process condition on a specific EconomicResource instance (Layer 2).
/// Cycles frequently as processes begin and end; orthogonal to LifecycleStage.
#[derive(Clone, PartialEq, Debug, Serialize, Deserialize, Default)]
pub enum OperationalState {
  Available,
  Reserved,
  InTransit,
  InStorage,
  InMaintenance,
  InUse,
  #[default]
  PendingValidation,
}

impl std::fmt::Display for OperationalState {
  fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
    let s = match self {
      OperationalState::Available => "available",
      OperationalState::Reserved => "reserved",
      OperationalState::InTransit => "in_transit",
      OperationalState::InStorage => "in_storage",
      OperationalState::InMaintenance => "in_maintenance",
      OperationalState::InUse => "in_use",
      OperationalState::PendingValidation => "pending_validation",
    };
    write!(f, "{}", s)
  }
}

/// DNA properties of a cloned `ndo` cell (ADR-010 model A; ADR-013).
/// The immutable Layer 0 fields baked into the clone's DNA properties so the
/// DnaHash is cryptographically bound to the NDO identity. This struct is THE
/// definition — the UI mirror (`packages/shared-types`) and the Sweettest suite
/// both derive from it, so client, tests, and zome produce the same DnaHash for
/// the same NDO. Deliberately excludes `lifecycle_stage` (mutable on the entry)
/// and `description` (entry-only).
///
/// **The field set and order are DnaHash input.** Changing either orphans every
/// existing NDO cell and breaks peer re-derivation from anchor coordinates.
///
/// `initiator` is NOT included: holochain 0.6.0 transports `create_clone_cell`
/// properties as `YamlProperties(serde_yaml::Value)`, which has no binary variant
/// and cannot carry an `AgentPubKey`. The DnaHash therefore binds the
/// classification fields plus `created_at`; the initiator remains authoritative on
/// the entry and cached on the NdoAnchor for display. Note that `created_at` is
/// NOT a uniqueness guarantee — the client derives it from millisecond-resolution
/// wall clock, so two same-named NDOs of the same classification created in one
/// millisecond share it. Distinctness comes from the per-NDO `network_seed`, which
/// is also DnaHash input. Integrity additionally validates the classification
/// fields (name/regime/nature) against the entry — see
/// validate_create_nondominium_identity.
#[derive(Clone, PartialEq, Debug, Serialize, Deserialize, SerializedBytes)]
pub struct NdoDnaProperties {
  pub name: String,
  pub property_regime: PropertyRegime,
  pub resource_nature: ResourceNature,
  pub created_at: Timestamp,
}

// ─── ValueFlows action enum ───────────────────────────────────────────────────
// Shared here so ValidateContributionInput (io/governance.rs) can reference it
// without needing to import from the governance integrity zome (a WASM crate).

#[derive(Clone, PartialEq, Debug, Serialize, Deserialize)]
pub enum VfAction {
  Transfer,
  Move,
  Use,
  Consume,
  Produce,
  Work,
  Modify,
  Combine,
  Separate,
  Raise,
  Lower,
  Cite,
  Accept,
  InitialTransfer,
  AccessForUse,
  TransferCustody,
}

// ─── NDO federation enums (governance integrity) ─────────────────────────────

/// Typed relationship between two NDOs in a hard link.
#[derive(Clone, PartialEq, Debug, Serialize, Deserialize)]
pub enum NdoLinkType {
  Component,
  DerivedFrom,
  Supersedes,
}

impl std::fmt::Display for NdoLinkType {
  fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
    let s = match self {
      NdoLinkType::Component => "component",
      NdoLinkType::DerivedFrom => "derived_from",
      NdoLinkType::Supersedes => "supersedes",
    };
    write!(f, "{}", s)
  }
}

// ─── Benefit redistribution types ────────────────────────────────────────────

/// Who receives a benefit share in an Agreement clause.
#[derive(Clone, PartialEq, Debug, Serialize, Deserialize)]
pub enum BeneficiaryRef {
  Agent(AgentPubKey),
  NdoComponent {
    ndo_dna_hash: DnaHash,
    ndo_identity_hash: ActionHash,
  },
}

/// Category of benefit being distributed.
#[derive(Clone, PartialEq, Debug, Serialize, Deserialize)]
pub enum BenefitType {
  Monetary,
  GovernanceWeight,
  AccessRight(String),
}

/// One clause in an Agreement entry (share_percent over a BenefitType to a receiver).
#[derive(Clone, PartialEq, Debug, Serialize, Deserialize)]
pub struct BenefitClause {
  pub receiver: BeneficiaryRef,
  pub share_percent: f64,
  pub benefit_type: BenefitType,
  pub note: Option<String>,
}
