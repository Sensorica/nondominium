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

export const OperationalStateSchema = Schema.Literal(
  'Available',
  'Reserved',
  'InTransit',
  'InStorage',
  'InMaintenance',
  'InUse',
  'PendingValidation'
);
export type OperationalState = Schema.Schema.Type<typeof OperationalStateSchema>;

export const PropertyRegimeSchema = Schema.Literal(
  'Private',
  'Commons',
  'Collective',
  'Pool',
  'CommonPool',
  'Public',
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
  is_active: Schema.Boolean,
  scope: Schema.Literal('Project', 'Network', 'Public'),
  ndo_identity_hash: Schema.Any // ActionHash
}) { }

export class UIResourceSpec extends Schema.Class<UIResourceSpec>('UIResourceSpec')({
  name: Schema.String,
  description: Schema.String,
  category: Schema.String,
  image_url: Schema.optional(Schema.String),
  tags: Schema.Array(Schema.String),
  is_active: Schema.Boolean,
  scope: Schema.optional(Schema.Literal('Project', 'Network', 'Public')),
  ndo_identity_hash: Schema.optional(Schema.Any),
  original_action_hash: Schema.optional(Schema.Any), // ActionHash
  created_at: Schema.optional(Schema.Number)
}) { }

export class EconomicResourceInput extends Schema.Class<EconomicResourceInput>(
  'EconomicResourceInput'
)({
  conforms_to: Schema.Any, // ActionHash → ResourceSpecification
  quantity: Schema.Number,
  unit: Schema.String,
  current_location: Schema.optional(Schema.String)
}) { }

export class UIEconomicResource extends Schema.Class<UIEconomicResource>('UIEconomicResource')({
  quantity: Schema.Number,
  unit: Schema.String,
  custodian: Schema.Any, // AgentPubKey
  current_location: Schema.optional(Schema.String),
  operational_state: OperationalStateSchema,
  conforms_to: Schema.optional(Schema.Any), // ActionHash
  original_action_hash: Schema.optional(Schema.Any),
  created_at: Schema.optional(Schema.Number)
}) { }

export const RivalrySchema = Schema.Literal('Rivalrous', 'NonRivalrous');
export type Rivalry = Schema.Schema.Type<typeof RivalrySchema>;

export const ResourceScopeSchema = Schema.Literal('Project', 'Network', 'Public');
export type ResourceScope = Schema.Schema.Type<typeof ResourceScopeSchema>;

export const AccessibilitySchema = Schema.Literal('Free', 'Credentialed', 'Gated');
export const TransferTypeSchema = Schema.Literal(
  'Ownership',
  'Custody',
  'UseRights',
  'Benefit'
);

/** Externally-tagged RuleData — mirrors Rust `RuleData`. */
export const RuleDataSchema = Schema.Union(
  Schema.Struct({
    AccessRequirement: Schema.Struct({
      accessibility: AccessibilitySchema,
      required_role: Schema.optional(Schema.String),
      min_affiliation: Schema.optional(Schema.String)
    })
  }),
  Schema.Struct({
    UsageLimit: Schema.Struct({
      max_duration_hours: Schema.optional(Schema.Number),
      max_quantity_per_period: Schema.optional(Schema.Number),
      period_days: Schema.optional(Schema.Number)
    })
  }),
  Schema.Struct({
    TransferCondition: Schema.Struct({
      transfer_type: TransferTypeSchema,
      requires_validation: Schema.Boolean,
      validator_role: Schema.optional(Schema.String)
    })
  }),
  Schema.Struct({
    MaintenanceSchedule: Schema.Struct({
      interval_days: Schema.Number,
      required_role: Schema.optional(Schema.String)
    })
  })
);

export class GovernanceRuleInput extends Schema.Class<GovernanceRuleInput>('GovernanceRuleInput')({
  rule_data: RuleDataSchema,
  enforced_by: Schema.optional(Schema.String),
  ndo_identity_hash: Schema.Any, // ActionHash
  property_regime: PropertyRegimeSchema,
  resource_nature: ResourceNatureSchema,
  rivalry_override: Schema.optional(RivalrySchema)
}) { }

export class UIGovernanceRule extends Schema.Class<UIGovernanceRule>('UIGovernanceRule')({
  rule_data: RuleDataSchema,
  enforced_by: Schema.optional(Schema.String),
  ndo_identity_hash: Schema.Any,
  property_regime: PropertyRegimeSchema,
  resource_nature: ResourceNatureSchema,
  rivalry_override: Schema.optional(RivalrySchema),
  original_action_hash: Schema.optional(Schema.Any),
  created_at: Schema.optional(Schema.Number)
}) { }

export class NdoIdentityInput extends Schema.Class<NdoIdentityInput>('NdoIdentityInput')({
  name: Schema.String.pipe(Schema.minLength(1)),
  description: Schema.optional(Schema.String),
  property_regime: PropertyRegimeSchema,
  resource_nature: ResourceNatureSchema,
  lifecycle_stage: LifecycleStageSchema,
  rivalry_override: Schema.optional(RivalrySchema)
}) { }

export class UINdoIdentity extends Schema.Class<UINdoIdentity>('UINdoIdentity')({
  name: Schema.String,
  initiator: Schema.Any, // AgentPubKey
  property_regime: PropertyRegimeSchema,
  resource_nature: ResourceNatureSchema,
  lifecycle_stage: LifecycleStageSchema,
  created_at: Schema.Number, // Timestamp
  description: Schema.optional(Schema.String),
  rivalry_override: Schema.optional(RivalrySchema),
  successor_ndo_hash: Schema.optional(Schema.Any), // ActionHash
  hibernation_origin: Schema.optional(LifecycleStageSchema),
  original_action_hash: Schema.optional(Schema.Any)
}) { }
