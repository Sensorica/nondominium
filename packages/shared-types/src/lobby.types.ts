import type { ActionHash, DnaHash, AgentPubKey, Timestamp } from '@holochain/client';

export interface LobbyAgentProfile {
  handle: string;
  avatar_url?: string;
  bio?: string;
  lobby_pubkey: AgentPubKey;
  created_at: Timestamp;
}

export interface LobbyAgentProfileInput {
  handle: string;
  avatar_url?: string;
  bio?: string;
}

/// Registry entry for a group cloned cell in the Lobby DHT.
/// Follows the Lobby → Groups → NDOs hierarchy: Lobby hosts groups; groups host NDOs.
export interface GroupAnnouncement {
  group_name: string;
  group_dna_hash: DnaHash;
  network_seed: string;
  description?: string;
  registered_by: AgentPubKey;
}

export interface AnnounceGroupInput {
  group_name: string;
  group_dna_hash: DnaHash;
  network_seed: string;
  description?: string;
}

export interface GroupDescriptorStub {
  id: string;
  name: string;
  description?: string;
  is_solo?: boolean;
}

export interface NdoHardLink {
  from_ndo_identity_hash: ActionHash;
  to_ndo_dna_hash: DnaHash;
  to_ndo_identity_hash: ActionHash;
  link_type: NdoLinkType;
  fulfillment_hash: ActionHash;
  created_by: AgentPubKey;
  created_at: Timestamp;
}

export type NdoLinkType = 'Component' | 'DerivedFrom' | 'Supersedes';

export interface CreateNdoHardLinkInput {
  from_ndo_identity_hash: ActionHash;
  to_ndo_dna_hash: DnaHash;
  to_ndo_identity_hash: ActionHash;
  link_type: NdoLinkType;
  fulfillment_hash: ActionHash;
}
