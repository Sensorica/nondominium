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
