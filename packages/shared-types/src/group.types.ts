// Author and timestamp fields are not stored in entries — they come from the Holochain
// action header (record.signed_action.hashed.content.author / timestamp).
import type { ActionHash, DnaHash, Timestamp } from '@holochain/client';

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

// ─── Commitment Pool anchors (Grassroots-style pool-as-group) ───────────────
//
// A `CommitmentAnchor` is a pool-side pointer on a group's DNA to a
// `Commitment` entry that lives on a (different) NDO cell. The anchor
// carries the full clone coordinates so a peer can clone the referenced NDO
// cell and resolve the commitment without needing a shared registry.

export type CommitmentAdmissionStatus = 'Admitted' | 'Withdrawn';

export interface CommitmentAnchor {
  group_hash: ActionHash;
  ndo_dna_hash: DnaHash;
  network_seed: string;
  identity_action_hash: ActionHash;
  commitment_action_hash: ActionHash;
  status: CommitmentAdmissionStatus;
  status_changed_at: Timestamp;
}

export interface AdmitCommitmentInput {
  group_hash: ActionHash;
  ndo_dna_hash: DnaHash;
  network_seed: string;
  identity_action_hash: ActionHash;
  commitment_action_hash: ActionHash;
}

export interface WithdrawCommitmentInput {
  /** The anchor's create action hash (stable key). */
  original_action_hash: ActionHash;
  /** The current latest anchor action hash (what the update must supersede). */
  previous_action_hash: ActionHash;
}

/**
 * Pool entry returned by `get_pool_contents` — both Admitted and Withdrawn
 * anchors are returned (pool-memory invariant: callers always see what was
 * once admitted). Filter on `anchor.status` client-side.
 */
export interface PoolEntry {
  original_action_hash: ActionHash;
  latest_action_hash: ActionHash;
  anchor: CommitmentAnchor;
}
