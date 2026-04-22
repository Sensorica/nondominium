import { Context, Effect as E, Layer } from 'effect';
import type { ActionHash, AgentPubKey, Timestamp } from '@holochain/client';
import {
  HolochainClientServiceTag,
  HolochainClientServiceLive
} from '../holochain.service.svelte';
import { wrapZomeCallWithErrorFactory } from '$lib/utils/zome-helpers';
import { GovernanceError } from '$lib/errors/governance.errors';
import { GOVERNANCE_CONTEXTS } from '$lib/errors/error-contexts';
import type { Commitment, EconomicEvent, VfEconomicEvent } from '@nondominium/shared-types';

// ─── Service interface ────────────────────────────────────────────────────────

export interface GovernanceService {
  createCommitment: (
    commitment: Omit<Commitment, 'created_at'>
  ) => E.Effect<ActionHash, GovernanceError>;
  getCommitment: (hash: ActionHash) => E.Effect<Commitment, GovernanceError>;
  fulfillCommitment: (hash: ActionHash) => E.Effect<ActionHash, GovernanceError>;
  createEconomicEvent: (
    event: Omit<EconomicEvent, 'occurred_at'>
  ) => E.Effect<ActionHash, GovernanceError>;
  getEconomicEvent: (hash: ActionHash) => E.Effect<EconomicEvent, GovernanceError>;
  getEventsByAgent: (agent: AgentPubKey) => E.Effect<EconomicEvent[], GovernanceError>;
  getCommitmentsByProvider: (provider: AgentPubKey) => E.Effect<Commitment[], GovernanceError>;
  getCommitmentsByReceiver: (receiver: AgentPubKey) => E.Effect<Commitment[], GovernanceError>;
  getPendingCommitments: () => E.Effect<Commitment[], GovernanceError>;
  cancelCommitment: (
    hash: ActionHash,
    reason?: string
  ) => E.Effect<ActionHash, GovernanceError>;
  updateCommitment: (
    hash: ActionHash,
    updatedCommitment: Omit<Commitment, 'created_at'>
  ) => E.Effect<ActionHash, GovernanceError>;
  getEventsByType: (
    eventType: 'transfer' | 'produce' | 'consume' | 'use'
  ) => E.Effect<EconomicEvent[], GovernanceError>;
  getEventsInTimeRange: (
    startTime: Timestamp,
    endTime: Timestamp
  ) => E.Effect<EconomicEvent[], GovernanceError>;
  getResourceFlow: (
    resourceHash: ActionHash
  ) => E.Effect<{ events: EconomicEvent[]; commitments: Commitment[] }, GovernanceError>;
  validateGovernanceRules: (
    resourceHash: ActionHash,
    operation: string,
    agent: AgentPubKey
  ) => E.Effect<boolean, GovernanceError>;
  createDispute: (
    commitment: ActionHash,
    complainant: AgentPubKey,
    description: string
  ) => E.Effect<ActionHash, GovernanceError>;
  voteOnDispute: (
    disputeHash: ActionHash,
    vote: 'approve' | 'reject' | 'abstain',
    agent: AgentPubKey
  ) => E.Effect<ActionHash, GovernanceError>;
  /** ValueFlows economic events linked from an `EconomicResource` action hash (`get_events_for_resource`). */
  getEventsByResource: (resourceHash: ActionHash) => E.Effect<VfEconomicEvent[], GovernanceError>;
  getAllEconomicEvents: () => E.Effect<VfEconomicEvent[], GovernanceError>;
}

// ─── Context Tag ─────────────────────────────────────────────────────────────

export class GovernanceServiceTag extends Context.Tag('GovernanceService')<
  GovernanceServiceTag,
  GovernanceService
>() {}

// ─── Live Layer ───────────────────────────────────────────────────────────────

export const GovernanceServiceLive: Layer.Layer<
  GovernanceServiceTag,
  never,
  HolochainClientServiceTag
> = Layer.effect(
  GovernanceServiceTag,
  E.gen(function* () {
    const holochainClient = yield* HolochainClientServiceTag;

    const wz = <T>(
      fnName: string,
      payload: unknown,
      context: string
    ): E.Effect<T, GovernanceError> =>
      wrapZomeCallWithErrorFactory<T, GovernanceError>(
        holochainClient,
        'zome_gouvernance',
        fnName,
        payload,
        context,
        GovernanceError.fromError
      );

    return {
      createCommitment: (commitment) =>
        wz<ActionHash>('create_commitment', commitment, GOVERNANCE_CONTEXTS.CREATE_COMMITMENT),

      getCommitment: (hash) =>
        wz<Commitment>('get_commitment', hash, GOVERNANCE_CONTEXTS.GET_COMMITMENT),

      fulfillCommitment: (hash) =>
        wz<ActionHash>('fulfill_commitment', hash, GOVERNANCE_CONTEXTS.FULFILL_COMMITMENT),

      createEconomicEvent: (event) =>
        wz<ActionHash>('create_economic_event', event, GOVERNANCE_CONTEXTS.CREATE_ECONOMIC_EVENT),

      getEconomicEvent: (hash) =>
        wz<EconomicEvent>('get_economic_event', hash, GOVERNANCE_CONTEXTS.GET_ECONOMIC_EVENT),

      getEventsByAgent: (agent) =>
        wz<EconomicEvent[]>('get_events_by_agent', agent, GOVERNANCE_CONTEXTS.GET_EVENTS_BY_AGENT),

      getCommitmentsByProvider: (provider) =>
        wz<Commitment[]>(
          'get_commitments_by_provider',
          provider,
          GOVERNANCE_CONTEXTS.GET_COMMITMENTS_BY_PROVIDER
        ),

      getCommitmentsByReceiver: (receiver) =>
        wz<Commitment[]>(
          'get_commitments_by_receiver',
          receiver,
          GOVERNANCE_CONTEXTS.GET_COMMITMENTS_BY_RECEIVER
        ),

      getPendingCommitments: () =>
        wz<Commitment[]>(
          'get_pending_commitments',
          null,
          GOVERNANCE_CONTEXTS.GET_PENDING_COMMITMENTS
        ),

      cancelCommitment: (hash, reason) =>
        wz<ActionHash>('cancel_commitment', { hash, reason }, GOVERNANCE_CONTEXTS.CANCEL_COMMITMENT),

      updateCommitment: (hash, updatedCommitment) =>
        wz<ActionHash>(
          'update_commitment',
          { hash, commitment: updatedCommitment },
          GOVERNANCE_CONTEXTS.UPDATE_COMMITMENT
        ),

      getEventsByType: (eventType) =>
        wz<EconomicEvent[]>(
          'get_events_by_type',
          eventType,
          GOVERNANCE_CONTEXTS.GET_EVENTS_BY_TYPE
        ),

      getEventsInTimeRange: (startTime, endTime) =>
        wz<EconomicEvent[]>(
          'get_events_in_time_range',
          { start_time: startTime, end_time: endTime },
          GOVERNANCE_CONTEXTS.GET_EVENTS_IN_TIME_RANGE
        ),

      getResourceFlow: (resourceHash) =>
        wz<{ events: EconomicEvent[]; commitments: Commitment[] }>(
          'get_resource_flow',
          resourceHash,
          GOVERNANCE_CONTEXTS.GET_RESOURCE_FLOW
        ),

      validateGovernanceRules: (resourceHash, operation, agent) =>
        wz<boolean>(
          'validate_governance_rules',
          { resource_hash: resourceHash, operation, agent },
          GOVERNANCE_CONTEXTS.VALIDATE_GOVERNANCE_RULES
        ),

      createDispute: (commitment, complainant, description) =>
        wz<ActionHash>(
          'create_dispute',
          { commitment, complainant, description },
          GOVERNANCE_CONTEXTS.CREATE_DISPUTE
        ),

      voteOnDispute: (disputeHash, vote, agent) =>
        wz<ActionHash>(
          'vote_on_dispute',
          { dispute_hash: disputeHash, vote, agent },
          GOVERNANCE_CONTEXTS.VOTE_ON_DISPUTE
        ),

      getEventsByResource: (resourceHash) =>
        wz<VfEconomicEvent[]>(
          'get_events_for_resource',
          resourceHash,
          GOVERNANCE_CONTEXTS.GET_EVENTS_FOR_RESOURCE
        ),

      getAllEconomicEvents: () =>
        wz<VfEconomicEvent[]>('get_all_economic_events', null, GOVERNANCE_CONTEXTS.GET_ALL_ECONOMIC_EVENTS)
    } satisfies GovernanceService;
  })
);

/** Fully-resolved layer for direct use (no further dependencies needed). */
export const GovernanceServiceResolved: Layer.Layer<GovernanceServiceTag> =
  GovernanceServiceLive.pipe(Layer.provide(HolochainClientServiceLive));
