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

export interface NdoAnnouncement {
  ndo_name: string;
  ndo_dna_hash: DnaHash;
  network_seed: string;
  ndo_identity_hash: ActionHash;
  lifecycle_stage: string;
  property_regime: string;
  resource_nature: string;
  description?: string;
  registered_by: AgentPubKey;
  registered_at: Timestamp;
}

export interface AnnounceNdoInput {
  ndo_name: string;
  ndo_dna_hash: DnaHash;
  network_seed: string;
  ndo_identity_hash: ActionHash;
  lifecycle_stage: string;
  property_regime: string;
  resource_nature: string;
  description?: string;
}

export interface GroupDescriptor {
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
