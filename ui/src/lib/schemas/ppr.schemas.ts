import { Schema } from 'effect';

/**
 * PPR schema definitions for the Private Participation Receipt system in
 * `zome_gouvernance`. Mirrors all 16 `ParticipationClaimType` Rust variants
 * and the bilateral `PerformanceMetrics` weights
 * (timeliness=0.25, quality=0.30, reliability=0.25, communication=0.20).
 *
 * Holochain primitive types (`ActionHash`, `AgentPubKey`, `Timestamp`) are
 * represented as `Schema.Any` because they are opaque binary types
 * (`Uint8Array` or numeric microsecond timestamps) that flow through the
 * client untyped. Runtime validation is provided by Holochain itself.
 * TODO(#91): replace Schema.Any fields with typed HolochainBytes schemas
 * once the service layer is available for mock injection.
 */

export const ParticipationClaimTypeSchema = Schema.Literal(
  // Genesis
  'ResourceCreation',
  'ResourceValidation',
  // Custody
  'CustodyTransfer',
  'CustodyAcceptance',
  // Service commitments / fulfillments
  'MaintenanceCommitmentAccepted',
  'MaintenanceFulfillmentCompleted',
  'StorageCommitmentAccepted',
  'StorageFulfillmentCompleted',
  'TransportCommitmentAccepted',
  'TransportFulfillmentCompleted',
  'GoodFaithTransfer',
  // Governance
  'DisputeResolutionParticipation',
  'ValidationActivity',
  'RuleCompliance',
  // End-of-life
  'EndOfLifeDeclaration',
  'EndOfLifeValidation'
);
export type ParticipationClaimType = Schema.Schema.Type<typeof ParticipationClaimTypeSchema>;

const ScoreSchema = Schema.Number.pipe(
  Schema.greaterThanOrEqualTo(0),
  Schema.lessThanOrEqualTo(1)
);

export class PerformanceMetricsInput extends Schema.Class<PerformanceMetricsInput>(
  'PerformanceMetricsInput'
)({
  timeliness: ScoreSchema,
  quality: ScoreSchema,
  reliability: ScoreSchema,
  communication: ScoreSchema,
  overall_satisfaction: ScoreSchema,
  notes: Schema.optional(Schema.String)
}) {}

export class UIPerformanceMetrics extends Schema.Class<UIPerformanceMetrics>(
  'UIPerformanceMetrics'
)({
  timeliness: Schema.Number,
  quality: Schema.Number,
  reliability: Schema.Number,
  communication: Schema.Number,
  overall_satisfaction: Schema.Number,
  notes: Schema.optional(Schema.String)
}) {}

export class UICryptographicSignature extends Schema.Class<UICryptographicSignature>(
  'UICryptographicSignature'
)({
  signer: Schema.Any, // AgentPubKey
  signature: Schema.Any, // Signature (Uint8Array)
  signed_data_hash: Schema.Any, // ActionHash
  signature_algorithm: Schema.String,
  created_at: Schema.Number
}) {}

export class UIParticipationClaim extends Schema.Class<UIParticipationClaim>(
  'UIParticipationClaim'
)({
  fulfills: Schema.Any, // ActionHash → Commitment
  fulfilled_by: Schema.Any, // ActionHash → EconomicEvent
  claimed_at: Schema.Number,
  claim_type: ParticipationClaimTypeSchema,
  performance_metrics: UIPerformanceMetrics,
  bilateral_signature: UICryptographicSignature,
  counterparty: Schema.Any, // AgentPubKey
  resource_hash: Schema.optional(Schema.Any), // ActionHash
  notes: Schema.optional(Schema.String),
  original_action_hash: Schema.optional(Schema.Any)
}) {}

export class UIReputationSummary extends Schema.Class<UIReputationSummary>(
  'UIReputationSummary'
)({
  agent: Schema.Any, // AgentPubKey
  total_claims: Schema.Number, // u32
  average_performance: Schema.Number,
  creation_claims: Schema.Number, // u32
  custody_claims: Schema.Number, // u32
  service_claims: Schema.Number, // u32
  governance_claims: Schema.Number, // u32
  end_of_life_claims: Schema.Number, // u32
  period_start: Schema.Number, // Timestamp
  period_end: Schema.Number, // Timestamp
  generated_at: Schema.Number // Timestamp
}) {}
