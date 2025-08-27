import type { ActionHash, AgentPubKey, Signature, Timestamp } from '@holochain/client';

// PPR (Private Participation Receipt) types aligned with Rust zome_gouvernance_integrity

/**
 * All possible categories of Private Participation Claims
 * Each category corresponds to a specific type of economic interaction
 * as defined in the PPR documentation
 * 
 * Note: Aligned with Rust enum ParticipationClaimType in zome_gouvernance/src/ppr.rs
 */
export type ParticipationClaimType =
  // Genesis Role - Network Entry
  | "ResourceCreation"         // Creator receives this for successful resource contribution
  | "ResourceValidation"       // Validator receives this for network validation performed
  
  // Core Usage Role - Custodianship  
  | "CustodyTransfer"         // Outgoing custodian receives this for responsible custody transfer
  | "CustodyAcceptance"       // Incoming custodian receives this for custody acceptance
  
  // Intermediate Roles - Specialized Services
  | "MaintenanceCommitmentAccepted"     // Maintenance agent receives this for accepted commitment
  | "MaintenanceFulfillmentCompleted"   // Maintenance agent receives this for completed fulfillment
  | "StorageCommitmentAccepted"         // Storage agent receives this for accepted commitment
  | "StorageFulfillmentCompleted"       // Storage agent receives this for completed fulfillment
  | "TransportCommitmentAccepted"       // Transport agent receives this for accepted commitment
  | "TransportFulfillmentCompleted"     // Transport agent receives this for completed fulfillment
  | "GoodFaithTransfer"                 // Custodian receives this for good faith transfer to service provider
  
  // Network Governance
  | "DisputeResolutionParticipation"    // For constructive participation in conflict resolution
  | "ValidationActivity"                // For performing validation duties beyond specific transactions
  | "RuleCompliance"                    // For consistent adherence to governance protocols
  
  // Resource End-of-Life Management  
  | "EndOfLifeDeclaration"             // Declaring agent receives this for end-of-life declaration
  | "EndOfLifeValidation";             // Expert validator receives this for end-of-life validation

// Legacy compatibility types for existing tests
export type LegacyParticipationClaimType =
  | "ResourceContribution"
  | "ResourceReception"
  | "ServiceProvision"
  | "ServiceReception"
  | "KnowledgeSharing"
  | "KnowledgeAcquisition"
  | "CommunitySupport"
  | "GovernanceParticipation"
  | "ConflictResolution"
  | "QualityAssurance"
  | "ResourceStewardship"
  | "ComplianceValidation"
  | "ProcessImprovement"
  | "InnovationContribution";

/**
 * Quantitative performance metrics captured for each participation claim
 * These metrics form the foundation for reputation calculation
 * 
 * Note: Aligned with Rust struct PerformanceMetrics in zome_gouvernance/src/ppr.rs
 */
export interface PerformanceMetrics {
  /** Timeliness score (0.0 to 1.0) - How punctual was the agent? */
  timeliness: number;
  
  /** Quality score (0.0 to 1.0) - How well was the task performed? */
  quality: number;
  
  /** Reliability score (0.0 to 1.0) - Did the agent fulfill commitments? */
  reliability: number;
  
  /** Communication score (0.0 to 1.0) - How well did the agent communicate? */
  communication: number;
  
  /** Overall satisfaction score (0.0 to 1.0) - Overall counterparty satisfaction */
  overall_satisfaction: number;
  
  /** Optional contextual notes about the performance */
  notes?: string;
}

/**
 * Legacy performance metrics structure for backward compatibility with existing tests
 */
export interface LegacyPerformanceMetrics {
  quality_score: number;
  timeliness_score: number;
  collaboration_score: number;
  innovation_score: number;
  reliability_score: number;
  additional_metrics: Map<string, number>;
}

/**
 * Cryptographic signature structure for bilateral authentication
 * Ensures that both parties in an interaction have authenticated the PPR
 * 
 * Note: Aligned with Rust struct CryptographicSignature in zome_gouvernance/src/ppr.rs
 */
export interface CryptographicSignature {
  /** Signature from the agent receiving the PPR (the "owner" of this claim) */
  recipient_signature: Signature;
  
  /** Signature from the counterparty agent (the one who performed the action) */
  counterparty_signature: Signature;
  
  /** Hash of the data that was signed (for verification) */
  signed_data_hash: Uint8Array; // [u8; 32] in Rust
  
  /** Timestamp when the signatures were created */
  signed_at: Timestamp;
}

/**
 * Legacy cryptographic signature for backward compatibility
 */
export interface LegacyCryptographicSignature {
  signature_data: Uint8Array;
  signing_agent: AgentPubKey | null;
  timestamp: number; // microseconds
  signature_method: string;
  additional_context: Map<string, string>;
}

/**
 * Private Participation Claim entry - stored as private entry
 * Extends ValueFlows Claim structure with PPR-specific fields
 * 
 * Note: Aligned with Rust struct PrivateParticipationClaim in zome_gouvernance/src/ppr.rs
 */
export interface PrivateParticipationClaim {
  // Standard ValueFlows fields
  fulfills: ActionHash;                 // References the commitment fulfilled
  fulfilled_by: ActionHash;             // References the economic event
  claimed_at: Timestamp;
  
  // PPR-specific extensions
  claim_type: ParticipationClaimType;
  performance_metrics: PerformanceMetrics;
  bilateral_signature: CryptographicSignature;
  
  // Additional context
  counterparty: AgentPubKey;             // The other agent involved in the interaction
  resource_hash?: ActionHash;            // Optional link to the resource involved
  notes?: string;                        // Optional contextual notes
}

/**
 * Aggregated reputation summary derived from PPRs
 * Used for privacy-preserving reputation sharing
 * 
 * Note: Aligned with Rust struct ReputationSummary in zome_gouvernance/src/ppr.rs
 */
export interface ReputationSummary {
  /** Total number of participation claims included in this summary */
  total_claims: number;
  
  /** Average performance score across all claims */
  average_performance: number;
  
  /** Breakdown by claim type categories */
  creation_claims: number;
  custody_claims: number;
  service_claims: number;
  governance_claims: number;
  end_of_life_claims: number;
  
  /** Time period this summary covers */
  period_start: Timestamp;
  period_end: Timestamp;
  
  /** Agent this summary belongs to */
  agent_pub_key: AgentPubKey;
}

/**
 * Legacy reputation summary for backward compatibility
 */
export interface LegacyReputationSummary {
  agent_pub_key: AgentPubKey;
  total_participation_claims: number;
  average_quality_score: number;
  reputation_score: number;
  last_activity_timestamp: number;
  participation_categories: Map<LegacyParticipationClaimType, number>;
  performance_trends: Map<string, number>;
}

// Input/Output types for PPR zome functions

export interface ParticipationReceiptInput {
  counterparty_agent: AgentPubKey | null;
  claim_type: LegacyParticipationClaimType; // Using legacy for compatibility with existing tests
  resource_specification: string;
  description: string;
  evidence_links: string[];
  performance_metrics: LegacyPerformanceMetrics; // Using legacy for compatibility
}

export interface ParticipationReceipt {
  counterparty_agent: AgentPubKey | null;
  claim_type: LegacyParticipationClaimType;
  resource_specification: string;
  description: string;
  evidence_links: string[];
  performance_metrics: LegacyPerformanceMetrics;
  agent_pub_key: AgentPubKey;
  created_at: Timestamp;
}

export interface SignParticipationClaimInput {
  original_participation_hash: ActionHash;
  cryptographic_signature: LegacyCryptographicSignature; // Using legacy for compatibility
  additional_validation_data?: Map<string, string>;
}

export interface SignedParticipationClaim {
  original_participation_hash: ActionHash;
  cryptographic_signature: LegacyCryptographicSignature;
  additional_validation_data?: Map<string, string>;
  agent_pub_key: AgentPubKey;
  created_at: Timestamp;
}

export interface ValidateSignatureInput {
  participation_claim_hash: ActionHash;
  expected_signature: LegacyCryptographicSignature;
  validation_context?: Map<string, string>;
}

export interface GetParticipationClaimsInput {
  agent_filter?: AgentPubKey;
  claim_type_filter?: LegacyParticipationClaimType;
  resource_specification_filter?: string;
  date_range_start?: number; // timestamp
  date_range_end?: number; // timestamp
}

// Mock data types for PPR testing
export interface MockParticipationData {
  counterparty_agent?: AgentPubKey | null;
  resource_specification?: string;
  description?: string;
  evidence_links?: string[];
  performance_metrics?: LegacyPerformanceMetrics;
}

export interface MockPerformanceData {
  quality_score?: number;
  timeliness_score?: number;
  collaboration_score?: number;
  innovation_score?: number;
  reliability_score?: number;
  additional_metrics?: Map<string, number>;
}