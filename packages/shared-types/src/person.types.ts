import type { ActionHash, AgentPubKey, Timestamp, CapSecret } from "@holochain/client";

// Core Person Types
export interface Person {
  name: string;
  nickname?: string;
  avatar_url?: string;
  bio?: string;
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

// Legacy compatibility for tests
export interface PrivatePersonData {
  legal_name: string;
  email: string;
  phone?: string;
  address?: string;
  emergency_contact?: string;
  time_zone?: string;
  location?: string;
}

// Role Management Types
export interface PersonRole {
  role_name: string;
  description?: string;
  permissions?: string[];
  assigned_to?: AgentPubKey;
  assigned_by: AgentPubKey;
  assigned_at: Timestamp;
}

export type RoleType =
  | "Simple Agent"
  | "Accountable Agent"
  | "Primary Accountable Agent"
  | "Transport Agent"
  | "Repair Agent"
  | "Storage Agent";

export type CapabilityLevel =
  | "governance"
  | "coordination"
  | "stewardship"
  | "member";

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

// Capability Token System Types (Idiomatic Holochain)
export interface GrantPrivateDataAccessInput {
  agent_to_grant: AgentPubKey;
  fields_allowed: string[];
  context: string;
  expires_in_days?: number;
}

export interface GrantPrivateDataAccessOutput {
  grant_hash: ActionHash;
  cap_secret: CapSecret;
  expires_at: Timestamp;
}

export interface CreatePrivateDataCapClaimInput {
  grantor: AgentPubKey;
  cap_secret: CapSecret;
  context: string;
}

export interface CreatePrivateDataCapClaimOutput {
  claim_hash: ActionHash;
}

export interface GetPrivateDataWithCapabilityInput {
  requested_fields: string[];
}

export interface FilteredPrivateData {
  legal_name?: string;
  email?: string;
  phone?: string;
  address?: string;
  emergency_contact?: string;
  time_zone?: string;
  location?: string;
}

export interface PrivateDataCapabilityMetadata {
  grant_hash: ActionHash;
  granted_to: AgentPubKey;
  granted_by: AgentPubKey;
  fields_allowed: string[];
  context: string;
  expires_at: Timestamp;
  created_at: Timestamp;
  cap_secret: CapSecret;
}

export interface GrantRoleBasedAccessInput {
  agent: AgentPubKey;
  role: { role_name: string };
  context: string;
}

export interface CreateTransferableAccessInput {
  context: string;
  fields_allowed: string[];
  expires_in_days?: number;
}

export interface TransferableCapabilityOutput {
  grant_hash: ActionHash;
  cap_secret: CapSecret;
  expires_at: Timestamp;
}

// Data structures for governance validation requests
export interface ValidationDataRequest {
  target_agent: AgentPubKey;
  validation_context: string;
  required_fields: string[];
  governance_requester: AgentPubKey;
}

export interface ValidationResult {
  is_valid: boolean;
  validated_data?: Map<string, string>;
  validation_context: string;
  validated_at: Timestamp;
  error_message?: string;
}

// Data structures for validation with grant hash
export interface ValidationDataRequestWithGrant {
  target_agent: AgentPubKey;
  validation_context: string;
  required_fields: string[];
  governance_requester: AgentPubKey;
  grant_hash: ActionHash;
}

// Test scenario types
export interface PersonTestScenario {
  description: string;
  setup: () => Promise<void>;
  execute: () => Promise<void>;
  verify: () => Promise<void>;
  cleanup?: () => Promise<void>;
}

// Zome Function Types
export interface PersonZomeFunctions {
  create_person: (
    person: Omit<Person, "agent_pub_key" | "created_at">,
  ) => Promise<ActionHash>;
  get_person: (hash: ActionHash) => Promise<Person>;
  get_all_persons: () => Promise<Person[]>;
  create_encrypted_profile: (
    profile: Omit<EncryptedProfile, "agent_pub_key" | "created_at">,
  ) => Promise<ActionHash>;
  get_encrypted_profile: (hash: ActionHash) => Promise<EncryptedProfile>;
  assign_role: (agent: AgentPubKey, role: string) => Promise<ActionHash>;
  get_roles: (agent: AgentPubKey) => Promise<PersonRole[]>;
}
