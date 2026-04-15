import { Schema } from 'effect';

/**
 * Person and identity schema definitions.
 *
 * Holochain primitive types (`ActionHash`, `AgentPubKey`, `Timestamp`) are
 * represented as `Schema.Any` because they are opaque binary types
 * (`Uint8Array` or numeric microsecond timestamps) that flow through the
 * client untyped. Runtime validation of these values is provided by
 * Holochain itself; no Effect Schema validation is needed.
 */

export class PersonInput extends Schema.Class<PersonInput>('PersonInput')({
  name: Schema.String.pipe(Schema.minLength(1), Schema.maxLength(100)),
  avatar_url: Schema.optional(Schema.String),
  bio: Schema.optional(Schema.String)
}) {}

export class UIPerson extends Schema.Class<UIPerson>('UIPerson')({
  name: Schema.String,
  avatar_url: Schema.optional(Schema.String),
  bio: Schema.optional(Schema.String),
  hrea_agent_hash: Schema.optional(Schema.Any), // ActionHash
  agent_pub_key: Schema.Any, // AgentPubKey — set by coordinator
  original_action_hash: Schema.optional(Schema.Any), // ActionHash
  created_at: Schema.optional(Schema.Number) // Timestamp (microseconds)
}) {}

export class EncryptedProfileInput extends Schema.Class<EncryptedProfileInput>(
  'EncryptedProfileInput'
)({
  legal_name: Schema.String.pipe(Schema.minLength(1)),
  email: Schema.String.pipe(Schema.minLength(3)),
  phone: Schema.optional(Schema.String),
  address: Schema.optional(Schema.String),
  emergency_contact: Schema.optional(Schema.String),
  time_zone: Schema.optional(Schema.String),
  location: Schema.optional(Schema.String)
}) {}

export class UIEncryptedProfile extends Schema.Class<UIEncryptedProfile>(
  'UIEncryptedProfile'
)({
  legal_name: Schema.String,
  email: Schema.String,
  phone: Schema.optional(Schema.String),
  address: Schema.optional(Schema.String),
  emergency_contact: Schema.optional(Schema.String),
  time_zone: Schema.optional(Schema.String),
  location: Schema.optional(Schema.String),
  original_action_hash: Schema.optional(Schema.Any) // ActionHash
}) {}

/**
 * Valid `role_name` string values produced by the Rust `RoleType::Display`
 * impl in `zome_person`.
 */
export const RoleNameSchema = Schema.Literal(
  'Simple Agent',
  'Accountable Agent',
  'Primary Accountable Agent',
  'Transport Agent',
  'Repair Agent',
  'Storage Agent'
);
export type RoleName = Schema.Schema.Type<typeof RoleNameSchema>;

/**
 * Capability level hierarchy: `member < stewardship < coordination < governance`.
 */
export const CapabilityLevelSchema = Schema.Literal(
  'member',
  'stewardship',
  'coordination',
  'governance'
);
export type CapabilityLevel = Schema.Schema.Type<typeof CapabilityLevelSchema>;

export class PersonRoleInput extends Schema.Class<PersonRoleInput>('PersonRoleInput')({
  role_name: RoleNameSchema,
  description: Schema.optional(Schema.String),
  assigned_to: Schema.Any // AgentPubKey
}) {}

export class UIPersonRole extends Schema.Class<UIPersonRole>('UIPersonRole')({
  role_name: RoleNameSchema,
  description: Schema.optional(Schema.String),
  assigned_to: Schema.Any, // AgentPubKey
  assigned_by: Schema.Any, // AgentPubKey
  assigned_at: Schema.Number, // Timestamp
  original_action_hash: Schema.optional(Schema.Any) // ActionHash
}) {}
