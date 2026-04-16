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

/** ValueFlows action labels as returned by `zome_gouvernance` (serde on `VfAction`). */
export type VfAction =
  | 'Transfer'
  | 'Move'
  | 'Use'
  | 'Consume'
  | 'Produce'
  | 'Work'
  | 'Modify'
  | 'Combine'
  | 'Separate'
  | 'Raise'
  | 'Lower'
  | 'Cite'
  | 'Accept'
  | 'InitialTransfer'
  | 'AccessForUse'
  | 'TransferCustody';

/** Economic event entry shape in `zome_gouvernance` (distinct from legacy `EconomicEvent` above). */
export interface VfEconomicEvent {
  action: VfAction;
  provider: AgentPubKey;
  receiver: AgentPubKey;
  resource_inventoried_as: ActionHash;
  affects: ActionHash;
  resource_quantity: number;
  event_time: Timestamp;
  note?: string | null;
}

// Zome Function Types
export interface GovernanceZomeFunctions {
  create_commitment: (commitment: Omit<Commitment, 'created_at'>) => Promise<ActionHash>;
  get_commitment: (hash: ActionHash) => Promise<Commitment>;
  fulfill_commitment: (hash: ActionHash) => Promise<ActionHash>;
  create_economic_event: (event: Omit<EconomicEvent, 'occurred_at'>) => Promise<ActionHash>;
  get_economic_event: (hash: ActionHash) => Promise<EconomicEvent>;
  get_events_by_agent: (agent: AgentPubKey) => Promise<EconomicEvent[]>;
  get_events_for_resource: (resourceHash: ActionHash) => Promise<VfEconomicEvent[]>;
  get_all_economic_events: () => Promise<VfEconomicEvent[]>;
}