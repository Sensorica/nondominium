import type { ActionHash, AgentPubKey, EntryHash, Timestamp } from '@holochain/client';

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
  governance_rules?: GovernanceRules | ActionHash[];
  created_by: AgentPubKey;
  created_at: Timestamp;
  is_active?: boolean;
}

export interface EconomicResource {
  conforms_to?: ActionHash;
  specification?: EntryHash; // ResourceSpecification hash
  quantity?: number;
  unit?: string;
  custodian: AgentPubKey;
  created_by?: AgentPubKey;
  created_at: Timestamp;
  current_location?: string;
  state?: ResourceState;
}

// Governance Types
export interface GovernanceRule {
  rule_type: string;
  rule_data: string;
  enforced_by?: string;
  created_by: AgentPubKey;
  created_at: Timestamp;
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
  get_all_resource_specifications: () => Promise<ResourceSpecification[]>;
  create_economic_resource: (resource: Omit<EconomicResource, 'created_at'>) => Promise<ActionHash>;
  get_economic_resource: (hash: ActionHash) => Promise<EconomicResource>;
  get_resources_by_custodian: (custodian: AgentPubKey) => Promise<EconomicResource[]>;
}