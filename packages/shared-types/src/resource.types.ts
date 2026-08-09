import type { ActionHash, AgentPubKey, DnaHash, EntryHash, Record, Timestamp } from '@holochain/client';

// Resource State Types
export type ResourceState =
  | "PendingValidation"
  | "Active"
  | "Maintenance"
  | "Retired"
  | "Reserved";

// Core Resource Types
export interface ResourceSpecification {
  name: string;
  description?: string;
  category?: string;
  resource_type?: string;
  unit_of_measure?: string;
  image_url?: string;
  tags?: string[];
  is_active?: boolean;
}

export interface EconomicResource {
  quantity: number;
  unit: string;
  custodian: AgentPubKey;
  current_location?: string;
  state: ResourceState;
}

// Governance Types
export interface GovernanceRule {
  rule_type: string;
  rule_data: string;
  enforced_by?: string;
}

export interface GovernanceRules {
  access_rules: AccessRule[];
  transfer_rules: TransferRule[];
  voting_threshold?: number;
}

export interface AccessRule {
  rule_type: 'role_based' | 'capability_based' | 'public';
  required_roles?: string[];
  required_capabilities?: string[];
}

export interface TransferRule {
  requires_approval: boolean;
  approver_roles?: string[];
  minimum_stake?: number;
}

// Input/Output types for resource zome functions
export interface ResourceSpecificationInput {
  name: string;
  description: string;
  category: string;
  image_url?: string;
  tags: string[];
  governance_rules: GovernanceRuleInput[];
}

export interface EconomicResourceInput {
  spec_hash: ActionHash;
  quantity: number;
  unit: string;
  current_location?: string;
}

export interface GovernanceRuleInput {
  rule_type: string;
  rule_data: string;
  enforced_by?: string;
}

export interface CreateResourceSpecificationOutput {
  spec_hash: ActionHash;
  spec: ResourceSpecification;
  governance_rule_hashes: ActionHash[];
}

export interface CreateEconomicResourceOutput {
  resource_hash: ActionHash;
  resource: EconomicResource;
}

export interface GetAllResourceSpecificationsOutput {
  specifications: ResourceSpecification[];
  /** Same length and order as `specifications` — stable identity for routing (e.g. `/ndo/[id]`). */
  action_hashes: ActionHash[];
}

/** One resource specification as listed from the DHT anchor, with its action hash. */
export interface ResourceSpecificationListing {
  action_hash: ActionHash;
  specification: ResourceSpecification;
}

/** NDO card / lobby descriptor (UI layer; mirrors Effect schema `NdoDescriptor`). */
export interface NdoDescriptor {
  hash: string;
  name: string;
  lifecycle_stage: string | null;
  property_regime: string | null;
  resource_nature: string | null;
  description: string | null;
  initiator: string | null;
  created_at: number | null;
  successor_ndo_hash: string | null;
  hibernation_origin: string | null;
}

export interface GroupDescriptor {
  /** Canonical key — the cloned cell's `network_seed`. */
  id: string;
  name: string;
  createdBy?: string;
  createdAt?: number;
  /** @deprecated Derived from Group DHT SoftLinks; not persisted. */
  ndoHashes?: string[];
  memberProfile?: GroupMemberProfile;
  /** DnaHash of the cloned group cell. */
  dnaHash?: Uint8Array;
  /** Same as `id` — explicit network seed for cloned-cell addressing. */
  networkSeed?: string;
  /** Base64 ActionHash of the GroupProfile entry in the group cell. */
  groupHash?: string;
  description?: string;
}

// ─── UI-only identity types (localStorage, no DHT entry) ─────────────────────

export interface LobbyUserProfile {
  nickname: string;
  realName?: string;
  bio?: string;
  email?: string;
  phone?: string;
  address?: string;
}

export interface GroupMemberProfile {
  isAnonymous: boolean;
  shownFields: (keyof Omit<LobbyUserProfile, 'nickname'>)[];
}

// ─── NDO input/output types ───────────────────────────────────────────────────

export interface NdoInput {
  name: string;
  property_regime: PropertyRegime;
  resource_nature: ResourceNature;
  lifecycle_stage: LifecycleStage;
  description?: string;
}

/**
 * DNA properties of a cloned `ndo` cell (ADR-010 model A; ADR-013).
 *
 * Mirrors `crates/shared/src/types.rs::NdoDnaProperties` field-for-field — the
 * immutable Layer 0 fields baked into the clone's DNA so the DnaHash is
 * cryptographically bound to the NDO identity. Deliberately EXCLUDES
 * `lifecycle_stage` (mutable on the entry; including it would freeze every
 * transition), `description` (entry-only), and `initiator` — holochain 0.6.0
 * transports properties as `YamlProperties(serde_yaml::Value)`, which has no
 * binary variant and cannot carry an `AgentPubKey`. The initiator stays
 * authoritative on the entry and cached on the NdoAnchor for display.
 *
 * Passed to `createCloneCell` as a PLAIN JS OBJECT (the conductor canonicalizes
 * the modifiers itself; DnaHash determinism is value-level across client and
 * Rust). `created_at` is microseconds (client-chosen, NOT the entry's sys_time —
 * peers re-derive the same DnaHash from the anchor's cached value).
 */
export interface NdoDnaProperties {
  name: string;
  property_regime: PropertyRegime;
  resource_nature: ResourceNature;
  created_at: Timestamp;
}

/**
 * Wire payload for zome_group::create_ndo_anchor (ADR-011 NdoAnchorInput).
 * `ndo_dna_hash` + `network_seed` + the cached classification fields let any
 * group member re-derive and verify the ndo clone cell.
 */
export interface NdoAnchorInput {
  group_hash: ActionHash;
  name: string;
  description: string | null;
  ndo_dna_hash: DnaHash;
  network_seed: string;
  identity_action_hash: ActionHash;
  initiator: AgentPubKey;
  ndo_created_at: Timestamp;
  lifecycle_stage: LifecycleStage;
  property_regime: PropertyRegime;
  resource_nature: ResourceNature;
}

/**
 * Decoded zome_group::NdoAnchor entry — the authoritative group→NDO pointer
 * with full clone coordinates. Card data renders from this without joining the
 * ndo cell (model A read path).
 */
export interface NdoAnchorEntry {
  group_hash: ActionHash;
  name: string;
  description: string | null;
  ndo_dna_hash: DnaHash;
  network_seed: string;
  identity_action_hash: ActionHash;
  initiator: AgentPubKey;
  ndo_created_at: Timestamp;
  lifecycle_stage: LifecycleStage;
  property_regime: PropertyRegime;
  resource_nature: ResourceNature;
}

export interface UpdateLifecycleStageInput {
  original_action_hash: ActionHash;
  new_stage: LifecycleStage;
  successor_ndo_hash?: ActionHash;
  transition_event_hash?: ActionHash;
}

export interface NdoTransitionHistoryEvent {
  from_stage: string;
  to_stage: string;
  agent: string;
  timestamp: number;
  event_hash: string;
}

/** Layer 0 identity entry (zome_resource `NondominiumIdentity`). */
export type PropertyRegime =
  | "Private"
  | "Commons"
  | "Nondominium"
  | "CommonPool";

export type ResourceNature =
  | "Physical"
  | "Digital"
  | "Service"
  | "Hybrid"
  | "Information";

export type LifecycleStage =
  | "Ideation"
  | "Specification"
  | "Development"
  | "Prototype"
  | "Stable"
  | "Distributed"
  | "Active"
  | "Hibernating"
  | "Deprecated"
  | "EndOfLife";

/** Stages allowed when registering a new NDO via `create_ndo` (UI + coordinator). */
export const CREATABLE_NDO_LIFECYCLE_STAGES = [
  'Ideation',
  'Specification',
  'Development',
  'Prototype',
  'Stable',
  'Distributed',
  'Active'
] as const satisfies readonly LifecycleStage[];

export type CreatableNdoLifecycleStage = (typeof CREATABLE_NDO_LIFECYCLE_STAGES)[number];

export interface NondominiumIdentity {
  name: string;
  initiator: AgentPubKey;
  property_regime: PropertyRegime;
  resource_nature: ResourceNature;
  lifecycle_stage: LifecycleStage;
  created_at: Timestamp;
  description?: string;
  successor_ndo_hash?: ActionHash;
  hibernation_origin?: LifecycleStage;
}

export interface NdoOutput {
  action_hash: ActionHash;
  entry: NondominiumIdentity;
}

export interface GetAllNdosOutput {
  ndos: NdoOutput[];
}

export interface GetAllEconomicResourcesOutput {
  resources: EconomicResource[];
}

export interface GetAllGovernanceRulesOutput {
  rules: GovernanceRule[];
}

export interface GetResourceSpecWithRulesOutput {
  specification: ResourceSpecification;
  governance_rules: GovernanceRule[];
}

export interface TransferCustodyInput {
  resource_hash: ActionHash;
  new_custodian: AgentPubKey;
}

export interface TransferCustodyOutput {
  updated_resource_hash: ActionHash;
  updated_resource: EconomicResource;
}

// Zome Function Types
export interface ResourceZomeFunctions {
  create_resource_specification: (
    spec: Omit<ResourceSpecification, 'created_by' | 'created_at'>
  ) => Promise<ActionHash>;
  get_resource_specification: (hash: ActionHash) => Promise<ResourceSpecification>;
  get_all_resource_specifications: () => Promise<GetAllResourceSpecificationsOutput>;
  get_resource_specification_with_rules: (
    specHash: ActionHash
  ) => Promise<GetResourceSpecWithRulesOutput>;
  get_resources_by_specification: (specHash: ActionHash) => Promise<Record[]>;
  get_all_ndos: () => Promise<GetAllNdosOutput>;
  create_economic_resource: (resource: Omit<EconomicResource, 'created_at'>) => Promise<ActionHash>;
  get_economic_resource: (hash: ActionHash) => Promise<EconomicResource>;
  get_resources_by_custodian: (custodian: AgentPubKey) => Promise<EconomicResource[]>;
}