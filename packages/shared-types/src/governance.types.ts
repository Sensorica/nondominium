import type { ActionHash, AgentPubKey, EntryHash, Timestamp } from '@holochain/client';
import type {
  ConstraintViolation,
  PropertyRegime,
  ResourceNature,
  Rivalry
} from './resource.types.js';

export type { ConstraintViolation };

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
  ndo_identity_hash: ActionHash;
}

/** Input for `propose_commitment` in `zome_gouvernance`. */
export interface ProposeCommitmentInput {
  action: VfAction;
  resource_hash?: ActionHash | null;
  resource_spec_hash?: ActionHash | null;
  provider: AgentPubKey;
  due_date: Timestamp;
  note?: string | null;
  ndo_identity_hash: ActionHash;
}

export interface ProposeCommitmentOutput {
  commitment_hash: ActionHash;
  commitment: VfCommitment;
}

/** ValueFlows Commitment entry as stored in `zome_gouvernance`. */
export interface VfCommitment {
  action: VfAction;
  provider: AgentPubKey;
  receiver: AgentPubKey;
  resource_inventoried_as?: ActionHash | null;
  resource_conforms_to?: ActionHash | null;
  input_of?: ActionHash | null;
  due_date: Timestamp;
  note?: string | null;
  committed_at: Timestamp;
  ndo_identity_hash: ActionHash;
}

/** Input for `log_economic_event` in `zome_gouvernance`. */
export interface LogEconomicEventInput {
  action: VfAction;
  provider: AgentPubKey;
  receiver: AgentPubKey;
  resource_inventoried_as: ActionHash;
  resource_quantity: number;
  note?: string | null;
  commitment_hash?: ActionHash | null;
  generate_pprs?: boolean | null;
  ndo_identity_hash: ActionHash;
}

export interface LogEconomicEventOutput {
  event_hash: ActionHash;
  event: VfEconomicEvent;
}

export interface CheckActionConstraintsInput {
  property_regime: PropertyRegime;
  resource_nature: ResourceNature;
  rivalry_override?: Rivalry;
  action: VfAction;
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