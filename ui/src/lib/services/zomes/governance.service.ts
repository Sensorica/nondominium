import { Context, Effect as E, Layer } from 'effect';
import type { ActionHash, AgentPubKey, CellId, Timestamp } from '@holochain/client';
import { HolochainClientServiceTag, HolochainClientServiceLive } from '../holochain.service.svelte';
import { wrapZomeCallWithErrorFactory } from '$lib/utils/zome-helpers';
import { GovernanceError } from '$lib/errors/governance.errors';
import { GOVERNANCE_CONTEXTS } from '$lib/errors/error-contexts';
import type {
  Commitment,
  EconomicEvent,
  VfEconomicEvent,
  ProposeCommitmentInput,
  ProposeCommitmentOutput,
  LogEconomicEventInput,
  LogEconomicEventOutput,
  CheckActionConstraintsInput,
  ConstraintViolation,
  VfCommitment,
  CommitmentRecord,
  FulfillCommitmentClosureInput,
  FulfillCommitmentClosureOutput,
  PrivateParticipationClaim
} from '@nondominium/shared-types';

// ─── Service interface ────────────────────────────────────────────────────────

export interface GovernanceService {
  createCommitment: (
    commitment: Omit<Commitment, 'created_at'>
  ) => E.Effect<ActionHash, GovernanceError>;
  /** Phase B: ValueFlows `propose_commitment` with `ndo_identity_hash`. */
  proposeCommitment: (
    input: ProposeCommitmentInput,
    cellId?: CellId
  ) => E.Effect<ProposeCommitmentOutput, GovernanceError>;
  getCommitment: (hash: ActionHash) => E.Effect<Commitment, GovernanceError>;
  getAllCommitments: (cellId?: CellId) => E.Effect<VfCommitment[], GovernanceError>;
  fulfillCommitment: (hash: ActionHash) => E.Effect<ActionHash, GovernanceError>;
  createEconomicEvent: (
    event: Omit<EconomicEvent, 'occurred_at'>
  ) => E.Effect<ActionHash, GovernanceError>;
  /** Phase B: ValueFlows `log_economic_event` with `ndo_identity_hash`. */
  logEconomicEvent: (
    input: LogEconomicEventInput,
    cellId?: CellId
  ) => E.Effect<LogEconomicEventOutput, GovernanceError>;
  getEconomicEvent: (hash: ActionHash) => E.Effect<EconomicEvent, GovernanceError>;
  getEventsByAgent: (agent: AgentPubKey) => E.Effect<EconomicEvent[], GovernanceError>;
  getCommitmentsByProvider: (provider: AgentPubKey) => E.Effect<Commitment[], GovernanceError>;
  getCommitmentsByReceiver: (receiver: AgentPubKey) => E.Effect<Commitment[], GovernanceError>;
  getPendingCommitments: () => E.Effect<Commitment[], GovernanceError>;
  cancelCommitment: (hash: ActionHash, reason?: string) => E.Effect<ActionHash, GovernanceError>;
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
  checkActionConstraints: (
    input: CheckActionConstraintsInput,
    cellId?: CellId
  ) => E.Effect<ConstraintViolation[], GovernanceError>;
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
  getEventsByResource: (
    resourceHash: ActionHash,
    cellId?: CellId
  ) => E.Effect<VfEconomicEvent[], GovernanceError>;
  getAllEconomicEvents: (cellId?: CellId) => E.Effect<VfEconomicEvent[], GovernanceError>;
  /** Returns commitments linked to one NDO via `NdoToCommitments`. */
  getCommitmentsForNdo: (
    ndoIdentityHash: ActionHash,
    cellId?: CellId
  ) => E.Effect<VfCommitment[], GovernanceError>;
  /**
   * Hash-paired variant of `getAllCommitments` — needed when the UI must act
   * on specific commitments (admit to a pool, fulfill). Prefer this when
   * mutation is possible; the data-only variant stays available for cheap
   * read-only lists.
   */
  getAllCommitmentsDetailed: (
    cellId?: CellId
  ) => E.Effect<CommitmentRecord[], GovernanceError>;
  /** Hash-paired variant of `getCommitmentsForNdo`. */
  getCommitmentsForNdoDetailed: (
    ndoIdentityHash: ActionHash,
    cellId?: CellId
  ) => E.Effect<CommitmentRecord[], GovernanceError>;
  /**
   * Atomic commitment fulfillment closure (fixes #14): writes the
   * EconomicEvent, the Claim with the real event hash, optionally updates
   * the resource's `OperationalState`, and persists both bilateral PPRs
   * with real co-signatures via `call_remote` countersigning.
   */
  fulfillCommitmentClosure: (
    input: FulfillCommitmentClosureInput,
    cellId?: CellId
  ) => E.Effect<FulfillCommitmentClosureOutput, GovernanceError>;
  /**
   * The caller's own `PrivateParticipationClaim` private entries. Private
   * entries are only readable by the agent that wrote them — this is a
   * self-only query by design.
   */
  getMyParticipationClaims: (
    options?: GetMyParticipationClaimsOptions,
    cellId?: CellId
  ) => E.Effect<GetMyParticipationClaimsResult, GovernanceError>;
}

export interface GetMyParticipationClaimsOptions {
  claimTypeFilter?: PrivateParticipationClaim['claim_type'];
  fromTime?: Timestamp;
  toTime?: Timestamp;
  limit?: number;
}

export interface GetMyParticipationClaimsResult {
  totalCount: number;
  claims: Array<{ hash: ActionHash; claim: PrivateParticipationClaim }>;
}

// ─── Context Tag ─────────────────────────────────────────────────────────────

export class GovernanceServiceTag extends Context.Service<
  GovernanceServiceTag,
  GovernanceService
>()('GovernanceService') {}

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
      context: string,
      cellId?: CellId
    ): E.Effect<T, GovernanceError> =>
      wrapZomeCallWithErrorFactory<T, GovernanceError>(
        holochainClient,
        'zome_gouvernance',
        fnName,
        payload,
        context,
        GovernanceError.fromError,
        undefined,
        cellId
      );

    return {
      createCommitment: (commitment) =>
        wz<ActionHash>('create_commitment', commitment, GOVERNANCE_CONTEXTS.CREATE_COMMITMENT),

      proposeCommitment: (input, cellId) =>
        wz<ProposeCommitmentOutput>(
          'propose_commitment',
          input,
          GOVERNANCE_CONTEXTS.CREATE_COMMITMENT,
          cellId
        ),

      getCommitment: (hash) =>
        wz<Commitment>('get_commitment', hash, GOVERNANCE_CONTEXTS.GET_COMMITMENT),

      getAllCommitments: (cellId) =>
        wz<VfCommitment[]>(
          'get_all_commitments',
          null,
          GOVERNANCE_CONTEXTS.GET_PENDING_COMMITMENTS,
          cellId
        ),

      fulfillCommitment: (hash) =>
        wz<ActionHash>('fulfill_commitment', hash, GOVERNANCE_CONTEXTS.FULFILL_COMMITMENT),

      createEconomicEvent: (event) =>
        wz<ActionHash>('create_economic_event', event, GOVERNANCE_CONTEXTS.CREATE_ECONOMIC_EVENT),

      logEconomicEvent: (input, cellId) =>
        wz<LogEconomicEventOutput>(
          'log_economic_event',
          input,
          GOVERNANCE_CONTEXTS.CREATE_ECONOMIC_EVENT,
          cellId
        ),

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
        wz<ActionHash>(
          'cancel_commitment',
          { hash, reason },
          GOVERNANCE_CONTEXTS.CANCEL_COMMITMENT
        ),

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

      checkActionConstraints: (input, cellId) =>
        wz<ConstraintViolation[]>(
          'check_action_constraints',
          input,
          GOVERNANCE_CONTEXTS.CHECK_ACTION_CONSTRAINTS,
          cellId
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

      getEventsByResource: (resourceHash, cellId) =>
        wz<VfEconomicEvent[]>(
          'get_events_for_resource',
          resourceHash,
          GOVERNANCE_CONTEXTS.GET_EVENTS_FOR_RESOURCE,
          cellId
        ),

      getAllEconomicEvents: (cellId) =>
        wz<VfEconomicEvent[]>(
          'get_all_economic_events',
          null,
          GOVERNANCE_CONTEXTS.GET_ALL_ECONOMIC_EVENTS,
          cellId
        ),

      getCommitmentsForNdo: (ndoIdentityHash, cellId) =>
        wz<VfCommitment[]>(
          'get_commitments_for_ndo',
          ndoIdentityHash,
          GOVERNANCE_CONTEXTS.GET_COMMITMENTS_FOR_NDO,
          cellId
        ),

      getAllCommitmentsDetailed: (cellId) =>
        wz<CommitmentRecord[]>(
          'get_all_commitments_detailed',
          null,
          GOVERNANCE_CONTEXTS.GET_PENDING_COMMITMENTS,
          cellId
        ),

      getCommitmentsForNdoDetailed: (ndoIdentityHash, cellId) =>
        wz<CommitmentRecord[]>(
          'get_commitments_for_ndo_detailed',
          ndoIdentityHash,
          GOVERNANCE_CONTEXTS.GET_COMMITMENTS_FOR_NDO,
          cellId
        ),

      fulfillCommitmentClosure: (input, cellId) =>
        wz<FulfillCommitmentClosureOutput>(
          'fulfill_commitment_closure',
          input,
          GOVERNANCE_CONTEXTS.FULFILL_COMMITMENT_CLOSURE,
          cellId
        ),

      getMyParticipationClaims: (options, cellId) =>
        E.map(
          wz<{
            total_count: number;
            claims: Array<[ActionHash, PrivateParticipationClaim]>;
          }>(
            'get_my_participation_claims',
            {
              claim_type_filter: options?.claimTypeFilter ?? null,
              from_time: options?.fromTime ?? null,
              to_time: options?.toTime ?? null,
              limit: options?.limit ?? null
            },
            GOVERNANCE_CONTEXTS.GET_MY_PARTICIPATION_CLAIMS,
            cellId
          ),
          (raw) => ({
            totalCount: raw.total_count,
            claims: raw.claims.map(([hash, claim]) => ({ hash, claim }))
          })
        )
    } satisfies GovernanceService;
  })
);

/** Fully-resolved layer for direct use (no further dependencies needed). */
export const GovernanceServiceResolved: Layer.Layer<GovernanceServiceTag> =
  GovernanceServiceLive.pipe(Layer.provide(HolochainClientServiceLive));
