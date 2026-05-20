import type { ActionHash, AgentPubKey, Timestamp } from '@holochain/client';

export interface GroupProfile {
  name: string;
  description: string | null;
  initiator: AgentPubKey;
  created_at: Timestamp;
}

export interface GroupMembership {
  group_hash: ActionHash;
  member: AgentPubKey;
  role: string | null;
  joined_at: Timestamp;
}

export interface WorkLog {
  group_hash: ActionHash;
  author: AgentPubKey;
  description: string;
  hours: number;
  logged_at: Timestamp;
}

export interface SoftLink {
  group_hash: ActionHash;
  target_ndo_hash: ActionHash;
  description: string | null;
  created_by: AgentPubKey;
  created_at: Timestamp;
}

export interface GroupGovernanceRule {
  group_hash: ActionHash;
  rule_type: string;
  rule_data: string;
  created_by: AgentPubKey;
  created_at: Timestamp;
}

// Input types
export interface GroupProfileInput {
  name: string;
  description?: string;
}

export interface WorkLogInput {
  group_hash: ActionHash;
  description: string;
  hours: number;
}

export interface SoftLinkInput {
  group_hash: ActionHash;
  target_ndo_hash: ActionHash;
  description?: string;
}

export interface GroupGovernanceRuleInput {
  group_hash: ActionHash;
  rule_type: string;
  rule_data: string;
}
