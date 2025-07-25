// Type definitions for Nondominium tests

import { AgentPubKey, ActionHash, Timestamp } from "@holochain/client";

// Core types from zome_person_integrity
export interface Person {
  agent_pub_key: AgentPubKey;
  name: string;
  avatar_url?: string;
  created_at: Timestamp;
}

export interface PrivateAgentData {
  legal_name: string;
  address: string;
  email: string;
  phone?: string;
  photo_id_hash?: string;
  emergency_contact?: string;
  created_at: Timestamp;
}

export interface AgentRole {
  role_name: string;
  description?: string;
  assigned_to: AgentPubKey;
  assigned_by: AgentPubKey;
  assigned_at: Timestamp;
  validation_metadata?: string;
}

// Input/Output types for zome functions
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
  address: string;
  email: string;
  phone?: string;
  photo_id_hash?: string;
  emergency_contact?: string;
}

export interface StorePrivateDataOutput {
  private_data_hash: ActionHash;
  private_data: PrivateAgentData;
}

export interface AgentProfileOutput {
  person?: Person;
  private_data?: PrivateAgentData; // Only available to the agent themselves
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
  role: AgentRole;
}

export interface GetAgentRolesOutput {
  roles: AgentRole[];
}

// Test-specific types
export interface TestAgent {
  name: string;
  person?: Person;
  private_data?: PrivateAgentData;
  roles?: AgentRole[];
}

export type RoleType = 
  | "Community Steward"
  | "Resource Coordinator" 
  | "Community Advocate"
  | "Primary Accountable Agent"
  | "Community Founder"
  | "Simple Member";

export type CapabilityLevel = "primary_accountable" | "accountable" | "simple";

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