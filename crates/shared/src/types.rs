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
#[derive(Clone, PartialEq, Debug, Serialize, Deserialize)]
pub enum PropertyRegime {
  Private,
  Commons,
  Collective,
  Pool,
  CommonPool,
  Nondominium,
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

/// DNA properties of a cloned `ndo` cell (ADR-010 model A; ADR-013).
/// The immutable Layer 0 fields baked into the clone's DNA properties so the
/// DnaHash is cryptographically bound to the NDO identity. Field set matches the
/// Sweettest `NdoCellProperties` mirror exactly (same fields, same order) so the
/// client and the tests derive the same DnaHash for the same NDO. Deliberately
/// excludes `lifecycle_stage` (mutable on the entry) and `description` (entry-only).
/// `initiator` and `created_at` are part of the DnaHash binding; integrity
/// additionally validates the classification fields (name/regime/nature) against
/// the entry — see validate_create_nondominium_identity.
#[derive(Clone, PartialEq, Debug, Serialize, Deserialize, SerializedBytes)]
pub struct NdoDnaProperties {
  pub name: String,
  pub initiator: AgentPubKey,
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
