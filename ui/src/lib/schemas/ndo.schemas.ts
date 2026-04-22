import { Schema } from 'effect';

export class NdoDescriptor extends Schema.Class<NdoDescriptor>('NdoDescriptor')({
  hash: Schema.String,
  name: Schema.String,
  lifecycle_stage: Schema.NullOr(Schema.String),
  property_regime: Schema.NullOr(Schema.String),
  resource_nature: Schema.NullOr(Schema.String),
  description: Schema.NullOr(Schema.String),
  initiator: Schema.NullOr(Schema.String),
  created_at: Schema.NullOr(Schema.Number),
  successor_ndo_hash: Schema.NullOr(Schema.String),
  hibernation_origin: Schema.NullOr(Schema.String)
}) {}

export class GroupDescriptor extends Schema.Class<GroupDescriptor>('GroupDescriptor')({
  id: Schema.String,
  name: Schema.String
}) {}
