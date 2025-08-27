import type { ActionHash, AgentPubKey, EntryHash, Timestamp } from '@holochain/client';

// Core Governance Types
export interface Commitment {
  resource_specification: EntryHash;
  provider: AgentPubKey;
  receiver: AgentPubKey;
  quantity?: number;
  due_date?: Timestamp;
  fulfilled: boolean;
  created_at: Timestamp;
}

export interface EconomicEvent {
  resource_specification: EntryHash;
  provider: AgentPubKey;
  receiver: AgentPubKey;
  quantity?: number;
  event_type: 'transfer' | 'produce' | 'consume' | 'use';
  occurred_at: Timestamp;
}

// Zome Function Types
export interface GovernanceZomeFunctions {
  create_commitment: (commitment: Omit<Commitment, 'created_at'>) => Promise<ActionHash>;
  get_commitment: (hash: ActionHash) => Promise<Commitment>;
  fulfill_commitment: (hash: ActionHash) => Promise<ActionHash>;
  create_economic_event: (event: Omit<EconomicEvent, 'occurred_at'>) => Promise<ActionHash>;
  get_economic_event: (hash: ActionHash) => Promise<EconomicEvent>;
  get_events_by_agent: (agent: AgentPubKey) => Promise<EconomicEvent[]>;
}