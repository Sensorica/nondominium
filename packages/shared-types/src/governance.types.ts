import type { ActionHash, AgentPubKey, EntryHash, Timestamp } from '@holochain/client';
import type {
  ConstraintViolation,
  Measure,
  OperationalState,
  PropertyRegime,
  ResourceNature,
  Rivalry
} from './resource.types.js';

export type { ConstraintViolation, Measure };

// Core Governance Types
//
// Note: the `Commitment` / `EconomicEvent` interfaces below are the pre-NDO
// legacy shapes kept for backward compatibility with a handful of UI views.
// The canonical zome entries are `VfCommitment` / `VfEconomicEvent` further
// down this file — new code should prefer those.
export interface Commitment {
  resource_specification: EntryHash;
  provider: AgentPubKey;
  receiver: AgentPubKey;
  quantity?: Measure;
  due_date?: Timestamp;
  fulfilled: boolean;
  created_at: Timestamp;
}

export interface EconomicEvent {
  resource_specification: EntryHash;
  provider: AgentPubKey;
  receiver: AgentPubKey;
  quantity?: Measure;
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
  /** ValueFlows `resourceQuantity`. */
  resource_quantity: Measure;
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
  /**
   * Explicit receiver. Previously the zome hardcoded the caller as receiver;
   * the UI now has to pass it. For "I propose this to myself" flows pass the
   * caller's own key.
   */
  receiver: AgentPubKey;
  /** ValueFlows `resourceQuantity` on the commitment (optional). */
  resource_quantity?: Measure | null;
  /** ValueFlows `effortQuantity` on the commitment (optional). */
  effort_quantity?: Measure | null;
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
  resource_quantity?: Measure | null;
  effort_quantity?: Measure | null;
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
  resource_quantity: Measure;
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

// ─── Atomic commitment fulfillment closure ──────────────────────────────────
//
// `fulfill_commitment_closure` writes the EconomicEvent, the Claim (with the
// real event hash as `fulfilled_by` — fixes the pre-existing placeholder),
// optionally updates the resource's `OperationalState`, and persists both
// bilateral `PrivateParticipationClaim` entries with REAL co-signatures (fix
// for #14). The counterparty is contacted synchronously via `call_remote` to
// countersign; if they refuse or are offline the whole closure fails
// cleanly before anything is written.

/** Shape mirrors Rust `PerformanceMetrics` on `ppr.rs` — reused by closure. */
export interface FulfillmentPerformanceMetrics {
  timeliness: number;
  quality: number;
  reliability: number;
  communication: number;
  overall_satisfaction: number;
  notes?: string;
}

export interface FulfillCommitmentClosureInput {
  commitment_hash: ActionHash;
  observed_quantity: Measure;
  resource_state_update?: OperationalState | null;
  provider_metrics: FulfillmentPerformanceMetrics;
  receiver_metrics: FulfillmentPerformanceMetrics;
  note?: string | null;
}

export interface FulfillmentPprPair {
  provider_claim_hash: ActionHash;
  receiver_claim_hash: ActionHash;
}

export interface FulfillCommitmentClosureOutput {
  event_hash: ActionHash;
  event: VfEconomicEvent;
  claim_hash: ActionHash;
  /** Minimal projection — the Rust side returns the full `Claim` entry. */
  claim: {
    fulfills: ActionHash;
    fulfilled_by: ActionHash;
    claimed_at: Timestamp;
    note?: string | null;
  };
  ppr: FulfillmentPprPair;
  resource_update_hash?: ActionHash | null;
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