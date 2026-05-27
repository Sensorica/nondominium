// Author and timestamp fields are not stored in entries — they come from the Holochain
// action header (record.signed_action.hashed.content.author / timestamp).
import type { ActionHash } from '@holochain/client';

export interface GroupProfile {
  name: string;
  description: string | null;
}

export interface GroupMembership {
  group_hash: ActionHash;
  role: string | null;
}

export interface WorkLog {
  group_hash: ActionHash;
  description: string;
  hours: number;
}

export interface SoftLink {
  group_hash: ActionHash;
  target_ndo_hash: ActionHash;
  description: string | null;
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

export interface UpdateGroupInput {
  previous_action_hash: ActionHash;
  original_action_hash: ActionHash;
  updated_name: string;
  updated_description?: string;
}
