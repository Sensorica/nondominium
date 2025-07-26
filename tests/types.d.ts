// Type definitions for nondominium tests

import { AgentPubKey, ActionHash, Timestamp } from "@holochain/client";

// Core types from zome_person_integrity
export interface Person {
  name: string;
  avatar_url?: string;
  bio?: string;
}

export interface PrivatePersonData {
  legal_name: string;
  email: string;
  phone?: string;
  address?: string;
  emergency_contact?: string;
  time_zone?: string;
  location?: string;
}

export interface PersonRole {
  role_name: string;
  description?: string;
  assigned_to: AgentPubKey;
  assigned_by: AgentPubKey;
  assigned_at: Timestamp;
}

// Input/Output types for zome functions
export interface PersonInput {
  name: string;
  avatar_url?: string;
  bio?: string;
}

export interface PrivatePersonDataInput {
  legal_name: string;
  email: string;
  phone?: string;
  address?: string;
  emergency_contact?: string;
  time_zone?: string;
  location?: string;
}

export interface PersonRoleInput {
  agent_pubkey: AgentPubKey;
  role_name: string;
  description?: string;
}

export interface PersonProfileOutput {
  person?: Person;
  private_data?: PrivatePersonData;
}

export interface GetAllPersonsOutput {
  persons: Person[];
}

export interface GetPersonRolesOutput {
  roles: PersonRole[];
}

// Legacy compatibility types for existing tests
export interface CreatePersonInput {
  name: string;
  avatar_url?: string;
}

export interface CreatePersonOutput {
  person_hash: ActionHash;
  person: Person;
}

export interface StorePrivateDataInput {
  legal_name: string;
  address?: string;
  email: string;
  phone?: string;
  emergency_contact?: string;
}

export interface StorePrivateDataOutput {
  private_data_hash: ActionHash;
  private_data: PrivatePersonData;
}

export interface AgentProfileOutput {
  person?: Person;
  private_data?: PrivatePersonData;
}

export interface GetAllAgentsOutput {
  agents: Person[];
}

export interface AssignRoleInput {
  agent_pub_key: AgentPubKey;
  role_name: string;
  description?: string;
}

export interface AssignRoleOutput {
  role_hash: ActionHash;
  role: PersonRole;
}

export interface GetAgentRolesOutput {
  roles: PersonRole[];
}

// Test-specific types
export interface TestAgent {
  name: string;
  person?: Person;
  private_data?: PrivatePersonData;
  roles?: PersonRole[];
}

export type RoleType =
  | "Simple Member"
  | "Community Advocate"
  | "Community Founder"
  | "Community Coordinator"
  | "Community Moderator"
  | "Resource Coordinator"
  | "Resource Steward"
  | "Governance Coordinator";

export type CapabilityLevel = "governance" | "coordination" | "stewardship" | "member";

// Test scenario types
export interface PersonTestScenario {
  description: string;
  setup: () => Promise<void>;
  execute: () => Promise<void>;
  verify: () => Promise<void>;
  cleanup?: () => Promise<void>;
}

// Mock data types for testing
export interface MockPersonData {
  name: string;
  avatar_url?: string;
  legal_name?: string;
  address?: string;
  email?: string;
  phone?: string;
  photo_id_hash?: string;
  emergency_contact?: string;
}

export interface MockRoleData {
  role_name: RoleType;
  description?: string;
}

// Resource types from zome_resource_integrity
export type ResourceState =
  | "PendingValidation"
  | "Active"
  | "Maintenance"
  | "Retired"
  | "Reserved";

export interface ResourceSpecification {
  name: string;
  description: string;
  category: string;
  image_url?: string;
  tags: string[];
  governance_rules: ActionHash[];
  created_by: AgentPubKey;
  created_at: Timestamp;
  is_active: boolean;
}

export interface EconomicResource {
  conforms_to: ActionHash;
  quantity: number;
  unit: string;
  custodian: AgentPubKey;
  created_by: AgentPubKey;
  created_at: Timestamp;
  current_location?: string;
  state: ResourceState;
}

export interface GovernanceRule {
  rule_type: string;
  rule_data: string;
  enforced_by?: string;
  created_by: AgentPubKey;
  created_at: Timestamp;
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
  spec: ResourceSpecification;
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
