import type { ActionHash, AgentPubKey, AppClient, EntryHash, Timestamp } from '@holochain/client';

// Core Holochain types
export type HolochainHash = ActionHash | EntryHash;

// Person Zome Types
export interface Person {
  name: string;
  nickname?: string;
  avatar_url?: string;
  agent_pub_key: AgentPubKey;
  created_at: Timestamp;
}

export interface EncryptedProfile {
  email?: string;
  phone?: string;
  bio?: string;
  skills?: string[];
  agent_pub_key: AgentPubKey;
  created_at: Timestamp;
}

export interface PersonRole {
  role_name: string;
  permissions: string[];
  assigned_by: AgentPubKey;
  assigned_at: Timestamp;
}

// Resource Zome Types (Phase 2)
export interface ResourceSpecification {
  name: string;
  description?: string;
  resource_type: string;
  unit_of_measure?: string;
  governance_rules?: GovernanceRules;
  created_by: AgentPubKey;
  created_at: Timestamp;
}

export interface EconomicResource {
  specification: EntryHash; // ResourceSpecification hash
  quantity?: number;
  current_location?: string;
  custodian: AgentPubKey;
  created_at: Timestamp;
}

// Governance Zome Types (Phase 2)
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

export interface Commitment {
  resource_specification: EntryHash;
  provider: AgentPubKey;
  receiver: AgentPubKey;
  quantity?: number;
  due_date?: Timestamp;
  fulfilled: boolean;
  created_at: Timestamp;
}

export interface EconomicEvent {
  resource_specification: EntryHash;
  provider: AgentPubKey;
  receiver: AgentPubKey;
  quantity?: number;
  event_type: 'transfer' | 'produce' | 'consume' | 'use';
  occurred_at: Timestamp;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Zome Function Types
export interface PersonZomeFunctions {
  create_person: (person: Omit<Person, 'agent_pub_key' | 'created_at'>) => Promise<ActionHash>;
  get_person: (hash: ActionHash) => Promise<Person>;
  get_all_persons: () => Promise<Person[]>;
  create_encrypted_profile: (
    profile: Omit<EncryptedProfile, 'agent_pub_key' | 'created_at'>
  ) => Promise<ActionHash>;
  get_encrypted_profile: (hash: ActionHash) => Promise<EncryptedProfile>;
  assign_role: (agent: AgentPubKey, role: string) => Promise<ActionHash>;
  get_roles: (agent: AgentPubKey) => Promise<PersonRole[]>;
}

export interface ResourceZomeFunctions {
  create_resource_specification: (
    spec: Omit<ResourceSpecification, 'created_by' | 'created_at'>
  ) => Promise<ActionHash>;
  get_resource_specification: (hash: ActionHash) => Promise<ResourceSpecification>;
  get_all_resource_specifications: () => Promise<ResourceSpecification[]>;
  create_economic_resource: (resource: Omit<EconomicResource, 'created_at'>) => Promise<ActionHash>;
  get_economic_resource: (hash: ActionHash) => Promise<EconomicResource>;
  get_resources_by_custodian: (custodian: AgentPubKey) => Promise<EconomicResource[]>;
}

export interface GovernanceZomeFunctions {
  create_commitment: (commitment: Omit<Commitment, 'created_at'>) => Promise<ActionHash>;
  get_commitment: (hash: ActionHash) => Promise<Commitment>;
  fulfill_commitment: (hash: ActionHash) => Promise<ActionHash>;
  create_economic_event: (event: Omit<EconomicEvent, 'occurred_at'>) => Promise<ActionHash>;
  get_economic_event: (hash: ActionHash) => Promise<EconomicEvent>;
  get_events_by_agent: (agent: AgentPubKey) => Promise<EconomicEvent[]>;
}

// Complete Holochain App Interface
export interface NondominiumApp {
  person: PersonZomeFunctions;
  resource: ResourceZomeFunctions;
  gouvernance: GovernanceZomeFunctions;
}

// Connection state
export interface HolochainConnectionState {
  client: AppClient | null;
  loading: boolean;
  error: Error | null;
  connected: boolean;
}
