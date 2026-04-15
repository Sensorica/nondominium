import { Schema } from 'effect';

/**
 * Resource and NDO schema definitions for `zome_resource`.
 *
 * Holochain primitive types (`ActionHash`, `AgentPubKey`, `Timestamp`) are
 * represented as `Schema.Any` because they are opaque binary types
 * (`Uint8Array` or numeric microsecond timestamps) that flow through the
 * client untyped. Runtime validation is provided by Holochain itself.
 * TODO(#91): replace Schema.Any fields with typed HolochainBytes schemas
 * once the service layer is available for mock injection.
 */

export const ResourceStateSchema = Schema.Literal(
  'PendingValidation',
  'Active',
  'Maintenance',
  'Retired',
  'Reserved'
);
export type ResourceState = Schema.Schema.Type<typeof ResourceStateSchema>;

export const PropertyRegimeSchema = Schema.Literal(
  'Private',
  'Commons',
  'Collective',
  'Pool',
  'CommonPool',
  'Nondominium'
);
export type PropertyRegime = Schema.Schema.Type<typeof PropertyRegimeSchema>;

export const ResourceNatureSchema = Schema.Literal(
  'Physical',
  'Digital',
  'Service',
  'Hybrid',
  'Information'
);
export type ResourceNature = Schema.Schema.Type<typeof ResourceNatureSchema>;

export const LifecycleStageSchema = Schema.Literal(
  'Ideation',
  'Specification',
  'Development',
  'Prototype',
  'Stable',
  'Distributed',
  'Active',
  'Hibernating',
  'Deprecated',
  'EndOfLife'
);
export type LifecycleStage = Schema.Schema.Type<typeof LifecycleStageSchema>;

export class ResourceSpecInput extends Schema.Class<ResourceSpecInput>('ResourceSpecInput')({
  name: Schema.String.pipe(Schema.minLength(1), Schema.maxLength(200)),
  description: Schema.String,
  category: Schema.String,
  image_url: Schema.optional(Schema.String),
  tags: Schema.Array(Schema.String),
  is_active: Schema.Boolean
}) {}

export class UIResourceSpec extends Schema.Class<UIResourceSpec>('UIResourceSpec')({
  name: Schema.String,
  description: Schema.String,
  category: Schema.String,
  image_url: Schema.optional(Schema.String),
  tags: Schema.Array(Schema.String),
  is_active: Schema.Boolean,
  original_action_hash: Schema.optional(Schema.Any), // ActionHash
  created_at: Schema.optional(Schema.Number)
}) {}

export class EconomicResourceInput extends Schema.Class<EconomicResourceInput>(
  'EconomicResourceInput'
)({
  conforms_to: Schema.Any, // ActionHash → ResourceSpecification
  quantity: Schema.Number,
  unit: Schema.String,
  current_location: Schema.optional(Schema.String)
}) {}

export class UIEconomicResource extends Schema.Class<UIEconomicResource>('UIEconomicResource')({
  quantity: Schema.Number,
  unit: Schema.String,
  custodian: Schema.Any, // AgentPubKey
  current_location: Schema.optional(Schema.String),
  state: ResourceStateSchema,
  conforms_to: Schema.optional(Schema.Any), // ActionHash
  original_action_hash: Schema.optional(Schema.Any),
  created_at: Schema.optional(Schema.Number)
}) {}

export class GovernanceRuleInput extends Schema.Class<GovernanceRuleInput>('GovernanceRuleInput')({
  rule_type: Schema.String,
  rule_data: Schema.String, // JSON-encoded
  enforced_by: Schema.optional(Schema.String)
}) {}

export class UIGovernanceRule extends Schema.Class<UIGovernanceRule>('UIGovernanceRule')({
  rule_type: Schema.String,
  rule_data: Schema.String,
  enforced_by: Schema.optional(Schema.String),
  original_action_hash: Schema.optional(Schema.Any),
  created_at: Schema.optional(Schema.Number)
}) {}

export class NdoIdentityInput extends Schema.Class<NdoIdentityInput>('NdoIdentityInput')({
  name: Schema.String.pipe(Schema.minLength(1)),
  description: Schema.optional(Schema.String),
  property_regime: PropertyRegimeSchema,
  resource_nature: ResourceNatureSchema,
  lifecycle_stage: LifecycleStageSchema
}) {}

export class UINdoIdentity extends Schema.Class<UINdoIdentity>('UINdoIdentity')({
  name: Schema.String,
  initiator: Schema.Any, // AgentPubKey
  property_regime: PropertyRegimeSchema,
  resource_nature: ResourceNatureSchema,
  lifecycle_stage: LifecycleStageSchema,
  created_at: Schema.Number, // Timestamp
  description: Schema.optional(Schema.String),
  successor_ndo_hash: Schema.optional(Schema.Any), // ActionHash
  hibernation_origin: Schema.optional(LifecycleStageSchema),
  original_action_hash: Schema.optional(Schema.Any)
}) {}
