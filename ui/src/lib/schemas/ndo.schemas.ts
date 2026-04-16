import { Schema } from 'effect';

export class NdoDescriptor extends Schema.Class<NdoDescriptor>('NdoDescriptor')({
  hash: Schema.String,
  name: Schema.String,
  lifecycle_stage: Schema.String,
  property_regime: Schema.String
}) {}

export class GroupDescriptor extends Schema.Class<GroupDescriptor>('GroupDescriptor')({
  id: Schema.String,
  name: Schema.String
}) {}
