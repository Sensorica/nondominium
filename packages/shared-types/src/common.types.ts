import type { ActionHash, AgentPubKey, EntryHash, Timestamp } from '@holochain/client';

// Core Holochain types
export type HolochainHash = ActionHash | EntryHash;

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Test-specific types
export interface TestAgent {
  name: string;
  person?: any;
  private_data?: any;
  roles?: any[];
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
  role_name: string;
  description?: string;
}