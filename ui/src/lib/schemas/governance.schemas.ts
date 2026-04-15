import { Schema } from 'effect';

/**
 * Governance schema definitions for `zome_gouvernance`.
 *
 * `VfActionSchema` enumerates every variant of the Rust `VfAction` enum
 * (13 standard ValueFlows actions + 3 nondominium-specific extensions).
 */

export const VfActionSchema = Schema.Literal(
  'Transfer',
  'Move',
  'Use',
  'Consume',
  'Produce',
  'Work',
  'Modify',
  'Combine',
  'Separate',
  'Raise',
  'Lower',
  'Cite',
  'Accept',
  'InitialTransfer',
  'AccessForUse',
  'TransferCustody'
);
export type VfAction = Schema.Schema.Type<typeof VfActionSchema>;

export class CommitmentInput extends Schema.Class<CommitmentInput>('CommitmentInput')({
  action: VfActionSchema,
  provider: Schema.Any, // AgentPubKey
  receiver: Schema.Any, // AgentPubKey
  resource_inventoried_as: Schema.optional(Schema.Any), // ActionHash
  resource_conforms_to: Schema.optional(Schema.Any), // ActionHash
  input_of: Schema.optional(Schema.Any), // ActionHash
  due_date: Schema.Number, // Timestamp
  note: Schema.optional(Schema.String)
}) {}

export class UICommitment extends Schema.Class<UICommitment>('UICommitment')({
  action: VfActionSchema,
  provider: Schema.Any, // AgentPubKey
  receiver: Schema.Any, // AgentPubKey
  resource_inventoried_as: Schema.optional(Schema.Any),
  resource_conforms_to: Schema.optional(Schema.Any),
  input_of: Schema.optional(Schema.Any),
  due_date: Schema.Number,
  note: Schema.optional(Schema.String),
  committed_at: Schema.Number,
  original_action_hash: Schema.optional(Schema.Any)
}) {}

export class UIEconomicEvent extends Schema.Class<UIEconomicEvent>('UIEconomicEvent')({
  action: VfActionSchema,
  provider: Schema.Any, // AgentPubKey
  receiver: Schema.Any, // AgentPubKey
  resource_inventoried_as: Schema.Any, // ActionHash
  affects: Schema.Any, // ActionHash
  resource_quantity: Schema.Number,
  event_time: Schema.Number, // Timestamp
  note: Schema.optional(Schema.String),
  original_action_hash: Schema.optional(Schema.Any)
}) {}

export class UIClaim extends Schema.Class<UIClaim>('UIClaim')({
  fulfills: Schema.Any, // ActionHash → Commitment
  fulfilled_by: Schema.Any, // ActionHash → EconomicEvent
  claimed_at: Schema.Number,
  note: Schema.optional(Schema.String),
  original_action_hash: Schema.optional(Schema.Any)
}) {}

export class UIValidationReceipt extends Schema.Class<UIValidationReceipt>(
  'UIValidationReceipt'
)({
  validator: Schema.Any, // AgentPubKey
  validated_item: Schema.Any, // ActionHash
  validation_type: Schema.String,
  approved: Schema.Boolean,
  notes: Schema.optional(Schema.String),
  validated_at: Schema.Number, // Timestamp
  original_action_hash: Schema.optional(Schema.Any)
}) {}

export class UIResourceValidation extends Schema.Class<UIResourceValidation>(
  'UIResourceValidation'
)({
  resource: Schema.Any, // ActionHash
  validation_scheme: Schema.String, // e.g. "2-of-3", "simple_majority"
  required_validators: Schema.Number, // u32
  current_validators: Schema.Number, // u32
  status: Schema.String, // "pending" | "approved" | "rejected"
  created_at: Schema.Number,
  updated_at: Schema.Number,
  original_action_hash: Schema.optional(Schema.Any)
}) {}

/**
 * Mirrors the Rust `GovernanceTransitionResult` returned by the governance
 * zome `evaluate_state_transition` cross-zome call.
 */
export class UIGovernanceTransitionResult extends Schema.Class<UIGovernanceTransitionResult>(
  'UIGovernanceTransitionResult'
)({
  success: Schema.Boolean,
  new_resource_state: Schema.optional(Schema.Any), // EconomicResource
  economic_event: Schema.optional(Schema.Any), // EconomicEvent
  validation_receipts: Schema.Array(Schema.Any),
  rejection_reasons: Schema.optional(Schema.Array(Schema.String)),
  next_steps: Schema.optional(Schema.Array(Schema.String))
}) {}

/**
 * `TransitionContext` payload accompanying a state-transition request.
 */
export class TransitionContextInput extends Schema.Class<TransitionContextInput>(
  'TransitionContextInput'
)({
  target_location: Schema.optional(Schema.String),
  quantity_change: Schema.optional(Schema.Number),
  target_custodian: Schema.optional(Schema.Any), // AgentPubKey
  process_notes: Schema.optional(Schema.String),
  process_context: Schema.optional(Schema.Any) // ActionHash
}) {}
