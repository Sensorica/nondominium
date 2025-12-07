use hdi::prelude::*;

/// All possible categories of Private Participation Claims
/// Each category corresponds to a specific type of economic interaction
/// as defined in the PPR documentation
#[derive(Clone, PartialEq, Debug, Serialize, Deserialize)]
pub enum ParticipationClaimType {
  // Genesis Role - Network Entry
  ResourceCreation,   // Creator receives this for successful resource contribution
  ResourceValidation, // Validator receives this for network validation performed

  // Core Usage Role - Custodianship
  CustodyTransfer, // Outgoing custodian receives this for responsible custody transfer
  CustodyAcceptance, // Incoming custodian receives this for custody acceptance

  // Intermediate Roles - Specialized Services
  MaintenanceCommitmentAccepted, // Maintenance agent receives this for accepted commitment
  MaintenanceFulfillmentCompleted, // Maintenance agent receives this for completed fulfillment
  StorageCommitmentAccepted,     // Storage agent receives this for accepted commitment
  StorageFulfillmentCompleted,   // Storage agent receives this for completed fulfillment
  TransportCommitmentAccepted,   // Transport agent receives this for accepted commitment
  TransportFulfillmentCompleted, // Transport agent receives this for completed fulfillment
  GoodFaithTransfer, // Custodian receives this for good faith transfer to service provider

  // Network Governance
  DisputeResolutionParticipation, // For constructive participation in conflict resolution
  ValidationActivity,             // For performing validation duties beyond specific transactions
  RuleCompliance,                 // For consistent adherence to governance protocols

  // Resource End-of-Life Management
  EndOfLifeDeclaration, // Declaring agent receives this for end-of-life declaration
  EndOfLifeValidation,  // Expert validator receives this for end-of-life validation
}

impl ParticipationClaimType {
  /// Returns a human-readable description of the claim type
  pub fn description(&self) -> &'static str {
    match self {
      ParticipationClaimType::ResourceCreation => "Successful resource contribution to network",
      ParticipationClaimType::ResourceValidation => "Network validation performed for resource",
      ParticipationClaimType::CustodyTransfer => "Responsible custody transfer completed",
      ParticipationClaimType::CustodyAcceptance => "Resource custody accepted",
      ParticipationClaimType::MaintenanceCommitmentAccepted => {
        "Maintenance service commitment accepted"
      }
      ParticipationClaimType::MaintenanceFulfillmentCompleted => {
        "Maintenance service fulfillment completed"
      }
      ParticipationClaimType::StorageCommitmentAccepted => "Storage service commitment accepted",
      ParticipationClaimType::StorageFulfillmentCompleted => {
        "Storage service fulfillment completed"
      }
      ParticipationClaimType::TransportCommitmentAccepted => {
        "Transport service commitment accepted"
      }
      ParticipationClaimType::TransportFulfillmentCompleted => {
        "Transport service fulfillment completed"
      }
      ParticipationClaimType::GoodFaithTransfer => "Good faith transfer to service provider",
      ParticipationClaimType::DisputeResolutionParticipation => {
        "Constructive participation in dispute resolution"
      }
      ParticipationClaimType::ValidationActivity => {
        "Validation duties performed beyond specific transactions"
      }
      ParticipationClaimType::RuleCompliance => "Consistent adherence to governance protocols",
      ParticipationClaimType::EndOfLifeDeclaration => "Resource end-of-life declaration submitted",
      ParticipationClaimType::EndOfLifeValidation => "Resource end-of-life validation performed",
    }
  }

  /// Returns true if this claim type is related to service provision
  pub fn is_service_related(&self) -> bool {
    matches!(
      self,
      ParticipationClaimType::MaintenanceCommitmentAccepted
        | ParticipationClaimType::MaintenanceFulfillmentCompleted
        | ParticipationClaimType::StorageCommitmentAccepted
        | ParticipationClaimType::StorageFulfillmentCompleted
        | ParticipationClaimType::TransportCommitmentAccepted
        | ParticipationClaimType::TransportFulfillmentCompleted
    )
  }

  /// Returns true if this claim type represents a commitment being accepted
  pub fn is_commitment_acceptance(&self) -> bool {
    matches!(
      self,
      ParticipationClaimType::MaintenanceCommitmentAccepted
        | ParticipationClaimType::StorageCommitmentAccepted
        | ParticipationClaimType::TransportCommitmentAccepted
    )
  }

  /// Returns true if this claim type represents fulfillment completion
  pub fn is_fulfillment_completion(&self) -> bool {
    matches!(
      self,
      ParticipationClaimType::MaintenanceFulfillmentCompleted
        | ParticipationClaimType::StorageFulfillmentCompleted
        | ParticipationClaimType::TransportFulfillmentCompleted
    )
  }
}

/// Quantitative performance metrics captured for each participation claim
/// These metrics form the foundation for reputation calculation
#[derive(Clone, PartialEq, Debug, Serialize, Deserialize)]
pub struct PerformanceMetrics {
  /// Timeliness score (0.0 to 1.0) - How punctual was the agent?
  pub timeliness: f64,

  /// Quality score (0.0 to 1.0) - How well was the task performed?
  pub quality: f64,

  /// Reliability score (0.0 to 1.0) - Did the agent fulfill commitments?
  pub reliability: f64,

  /// Communication score (0.0 to 1.0) - How well did the agent communicate?
  pub communication: f64,

  /// Overall satisfaction score (0.0 to 1.0) - Overall counterparty satisfaction
  pub overall_satisfaction: f64,

  /// Optional contextual notes about the performance
  pub notes: Option<String>,
}

impl Default for PerformanceMetrics {
  fn default() -> Self {
    Self {
      timeliness: 1.0,
      quality: 1.0,
      reliability: 1.0,
      communication: 1.0,
      overall_satisfaction: 1.0,
      notes: None,
    }
  }
}

impl PerformanceMetrics {
  /// Calculate weighted average performance score
  pub fn calculate_weighted_average(&self) -> f64 {
    // Weights based on importance for reputation calculation
    let timeliness_weight = 0.25;
    let quality_weight = 0.30;
    let reliability_weight = 0.25;
    let communication_weight = 0.20;

    (self.timeliness * timeliness_weight)
      + (self.quality * quality_weight)
      + (self.reliability * reliability_weight)
      + (self.communication * communication_weight)
  }

  /// Validate that all scores are within valid range (0.0 to 1.0)
  pub fn validate(&self) -> Result<(), String> {
    let scores = [
      ("timeliness", self.timeliness),
      ("quality", self.quality),
      ("reliability", self.reliability),
      ("communication", self.communication),
      ("overall_satisfaction", self.overall_satisfaction),
    ];

    for (name, score) in scores {
      if !(0.0..=1.0).contains(&score) {
        return Err(format!(
          "{} score must be between 0.0 and 1.0, got {}",
          name, score
        ));
      }
    }

    Ok(())
  }
}

/// Cryptographic signature structure for bilateral authentication
/// Ensures that both parties in an interaction have authenticated the PPR
#[derive(Clone, PartialEq, Debug, Serialize, Deserialize)]
pub struct CryptographicSignature {
  /// Signature from the agent receiving the PPR (the "owner" of this claim)
  pub recipient_signature: Signature,

  /// Signature from the counterparty agent (the one who performed the action)
  pub counterparty_signature: Signature,

  /// Hash of the data that was signed (for verification)
  pub signed_data_hash: [u8; 32],

  /// Timestamp when the signatures were created
  pub signed_at: Timestamp,
}

impl CryptographicSignature {
  /// Create a new cryptographic signature with both parties' signatures
  pub fn new(
    recipient_signature: Signature,
    counterparty_signature: Signature,
    signed_data_hash: [u8; 32],
    signed_at: Timestamp,
  ) -> Self {
    Self {
      recipient_signature,
      counterparty_signature,
      signed_data_hash,
      signed_at,
    }
  }

  /// Get signing context data for verification
  /// This method returns the context data needed for signature verification
  /// The actual verification must be done in the coordinator zome with HDK functions
  pub fn get_verification_context(
    &self,
    recipient_pubkey: &AgentPubKey,
    counterparty_pubkey: &AgentPubKey,
    original_signing_data: &[u8],
    recipient_claim_type: &ParticipationClaimType,
    counterparty_claim_type: &ParticipationClaimType,
  ) -> (Vec<u8>, Vec<u8>) {
    // Reconstruct recipient signing context
    let recipient_context = create_signature_verification_context(
      original_signing_data,
      recipient_pubkey,
      counterparty_pubkey,
      recipient_claim_type,
      "RECEIVER_PPR_SIGNATURE",
    );

    // Reconstruct counterparty signing context
    let counterparty_context = create_signature_verification_context(
      original_signing_data,
      counterparty_pubkey,
      recipient_pubkey,
      counterparty_claim_type,
      "PROVIDER_PPR_SIGNATURE",
    );

    (
      recipient_context.unwrap_or_default(),
      counterparty_context.unwrap_or_default(),
    )
  }
}

/// Private Participation Claim entry - stored as private entry
/// Extends ValueFlows Claim structure with PPR-specific fields
#[hdk_entry_helper]
#[derive(Clone, PartialEq)]
pub struct PrivateParticipationClaim {
  // Standard ValueFlows fields
  pub fulfills: ActionHash,     // References the commitment fulfilled
  pub fulfilled_by: ActionHash, // References the economic event
  pub claimed_at: Timestamp,

  // PPR-specific extensions
  pub claim_type: ParticipationClaimType,
  pub performance_metrics: PerformanceMetrics,
  pub bilateral_signature: CryptographicSignature,

  // Additional context
  pub counterparty: AgentPubKey, // The other agent involved in the interaction
  pub resource_hash: Option<ActionHash>, // Optional link to the resource involved
  pub notes: Option<String>,     // Optional contextual notes
}

impl PrivateParticipationClaim {
  /// Create a new PPR claim with validation
  pub fn new(
    fulfills: ActionHash,
    fulfilled_by: ActionHash,
    claim_type: ParticipationClaimType,
    performance_metrics: PerformanceMetrics,
    bilateral_signature: CryptographicSignature,
    counterparty: AgentPubKey,
    resource_hash: Option<ActionHash>,
    notes: Option<String>,
    claimed_at: Timestamp,
  ) -> Result<Self, String> {
    // Validate performance metrics
    performance_metrics.validate()?;

    Ok(Self {
      fulfills,
      fulfilled_by,
      claimed_at,
      claim_type,
      performance_metrics,
      bilateral_signature,
      counterparty,
      resource_hash,
      notes,
    })
  }

  /// Get verification context for the cryptographic signatures on this claim
  /// The actual verification must be done in the coordinator zome with HDK functions
  pub fn get_signature_verification_contexts(
    &self,
    owner: &AgentPubKey,
    original_signing_data: &[u8],
    owner_claim_type: &ParticipationClaimType,
    counterparty_claim_type: &ParticipationClaimType,
  ) -> (Vec<u8>, Vec<u8>) {
    self.bilateral_signature.get_verification_context(
      owner,
      &self.counterparty,
      original_signing_data,
      owner_claim_type,
      counterparty_claim_type,
    )
  }

  /// Get a summary of this claim for reputation calculation
  pub fn get_reputation_contribution(&self) -> f64 {
    self.performance_metrics.calculate_weighted_average()
  }
}

/// Aggregated reputation summary derived from PPRs
/// Used for privacy-preserving reputation sharing
#[derive(Clone, PartialEq, Debug, Serialize, Deserialize)]
pub struct ReputationSummary {
  /// Total number of participation claims included in this summary
  pub total_claims: u32,

  /// Average performance score across all claims
  pub average_performance: f64,

  /// Breakdown by claim type categories
  pub creation_claims: u32,
  pub custody_claims: u32,
  pub service_claims: u32,
  pub governance_claims: u32,
  pub end_of_life_claims: u32,

  /// Time period this summary covers
  pub period_start: Timestamp,
  pub period_end: Timestamp,

  /// Agent this summary belongs to
  pub agent: AgentPubKey,

  /// Timestamp when summary was generated
  pub generated_at: Timestamp,
}

impl ReputationSummary {
  /// Create a new reputation summary from a list of PPR claims
  pub fn from_claims(
    claims: Vec<PrivateParticipationClaim>,
    agent: AgentPubKey,
    period_start: Timestamp,
    period_end: Timestamp,
    generated_at: Timestamp,
  ) -> Result<Self, String> {
    let total_claims = claims.len() as u32;

    if total_claims == 0 {
      return Ok(Self {
        total_claims: 0,
        average_performance: 0.0,
        creation_claims: 0,
        custody_claims: 0,
        service_claims: 0,
        governance_claims: 0,
        end_of_life_claims: 0,
        period_start,
        period_end,
        agent,
        generated_at,
      });
    }

    // Calculate average performance
    let total_performance: f64 = claims
      .iter()
      .map(|claim| claim.get_reputation_contribution())
      .sum();
    let average_performance = total_performance / total_claims as f64;

    // Count claims by category
    let mut creation_claims = 0;
    let mut custody_claims = 0;
    let mut service_claims = 0;
    let mut governance_claims = 0;
    let mut end_of_life_claims = 0;

    for claim in &claims {
      match claim.claim_type {
        ParticipationClaimType::ResourceCreation | ParticipationClaimType::ResourceValidation => {
          creation_claims += 1
        }

        ParticipationClaimType::CustodyTransfer | ParticipationClaimType::CustodyAcceptance => {
          custody_claims += 1
        }

        ParticipationClaimType::MaintenanceCommitmentAccepted
        | ParticipationClaimType::MaintenanceFulfillmentCompleted
        | ParticipationClaimType::StorageCommitmentAccepted
        | ParticipationClaimType::StorageFulfillmentCompleted
        | ParticipationClaimType::TransportCommitmentAccepted
        | ParticipationClaimType::TransportFulfillmentCompleted
        | ParticipationClaimType::GoodFaithTransfer => service_claims += 1,

        ParticipationClaimType::DisputeResolutionParticipation
        | ParticipationClaimType::ValidationActivity
        | ParticipationClaimType::RuleCompliance => governance_claims += 1,

        ParticipationClaimType::EndOfLifeDeclaration
        | ParticipationClaimType::EndOfLifeValidation => end_of_life_claims += 1,
      }
    }

    Ok(Self {
      total_claims,
      average_performance,
      creation_claims,
      custody_claims,
      service_claims,
      governance_claims,
      end_of_life_claims,
      period_start,
      period_end,
      agent,
      generated_at,
    })
  }

  /// Get reputation score in a specific category (0.0 to 1.0)
  pub fn get_category_score(&self, category: &str) -> Option<f64> {
    let count = match category {
      "creation" => self.creation_claims,
      "custody" => self.custody_claims,
      "service" => self.service_claims,
      "governance" => self.governance_claims,
      "end_of_life" => self.end_of_life_claims,
      _ => return None,
    };

    if self.total_claims == 0 {
      return Some(0.0);
    }

    // Weight the average performance by the relative activity in this category
    let category_weight = count as f64 / self.total_claims as f64;
    Some(self.average_performance * category_weight)
  }
}

/// Helper function to create signature verification context
/// This reconstructs the signing context used during signature creation
fn create_signature_verification_context(
  base_data: &[u8],
  signer_pubkey: &AgentPubKey,
  counterparty_pubkey: &AgentPubKey,
  claim_type: &ParticipationClaimType,
  role_prefix: &str,
) -> Result<Vec<u8>, String> {
  let mut context_data = Vec::new();

  // Add role identifier
  context_data.extend_from_slice(role_prefix.as_bytes());

  // Add base signing data
  context_data.extend_from_slice(base_data);

  // Add signer and counterparty context
  context_data.extend_from_slice(&signer_pubkey.get_raw_39());
  context_data.extend_from_slice(&counterparty_pubkey.get_raw_39());

  // Add claim type context
  context_data.extend_from_slice(format!("{:?}", claim_type).as_bytes());

  Ok(context_data)
}
