import type { ActionHash, AgentPubKey, Timestamp } from "@holochain/client";

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
  | "SimpleAgent"
  | "AccountableAgent"
  | "PrimaryAccountableAgent"
  | "Transport"
  | "Repair"
  | "Storage";

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

// Private Data Sharing types
export type RequestStatus =
  | "Pending"
  | "Approved"
  | "Denied"
  | "Expired"
  | "Revoked";

export interface DataAccessGrant {
  granted_to: AgentPubKey;
  granted_by: AgentPubKey;
  fields_granted: string[];
  context: string;
  resource_hash?: ActionHash;
  expires_at: Timestamp;
  created_at: Timestamp;
}

export interface DataAccessRequest {
  requested_from: AgentPubKey;
  requested_by: AgentPubKey;
  fields_requested: string[];
  context: string;
  resource_hash?: ActionHash;
  justification: string;
  status: RequestStatus;
  created_at: Timestamp;
}

export interface DataAccessRequestInput {
  requested_from: AgentPubKey;
  fields_requested: string[];
  context: string;
  resource_hash?: ActionHash;
  justification: string;
}

export interface DataAccessGrantInput {
  granted_to: AgentPubKey;
  fields_granted: string[];
  context: string;
  resource_hash?: ActionHash;
  duration_days?: number;
}

export interface RespondToDataRequestInput {
  request_hash: ActionHash;
  approve: boolean;
  duration_days?: number;
}

export interface SharedPrivateData {
  fields: { [key: string]: string };
  granted_by: AgentPubKey;
  context: string;
  expires_at: Timestamp;
}

export interface RequestCoordinationInfoInput {
  resource_hash: ActionHash;
  previous_custodian: AgentPubKey;
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
