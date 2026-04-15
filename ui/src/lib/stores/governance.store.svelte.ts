import { Effect as E, Exit, pipe } from 'effect';
import type { ActionHash, AgentPubKey, Timestamp } from '@holochain/client';
import {
  GovernanceServiceTag,
  GovernanceServiceResolved,
  type GovernanceService
} from '../services/zomes/governance.service.js';
import { withLoadingState, createLoadingStateSetter } from '$lib/utils/store-helpers/core';
import type { Commitment, EconomicEvent } from '@nondominium/shared-types';

export interface ResourceFlow {
  events: EconomicEvent[];
  commitments: Commitment[];
}

// ─── Store type ────────────────────────────────────────────────────────────────

export type GovernanceStore = {
  readonly isLoading: boolean;
  readonly errorMessage: string | null;
  readonly allCommitments: Commitment[];
  readonly allEconomicEvents: EconomicEvent[];
  readonly myCommitmentsAsProvider: Commitment[];
  readonly myCommitmentsAsReceiver: Commitment[];
  readonly myEconomicEvents: EconomicEvent[];
  readonly pendingCommitments: Commitment[];
  readonly selectedCommitment: Commitment | null;
  readonly selectedEconomicEvent: EconomicEvent | null;
  readonly commitmentsByProvider: Map<string, Commitment[]>;
  readonly commitmentsByReceiver: Map<string, Commitment[]>;
  readonly eventsByAgent: Map<string, EconomicEvent[]>;
  readonly eventsByType: Map<string, EconomicEvent[]>;

  createCommitment: (
    commitmentData: Omit<Commitment, 'created_at'>
  ) => Promise<ActionHash | null>;
  fetchCommitment: (hash: ActionHash) => Promise<Commitment | null>;
  fulfillCommitment: (hash: ActionHash) => Promise<ActionHash | null>;
  createEconomicEvent: (
    eventData: Omit<EconomicEvent, 'occurred_at'>
  ) => Promise<ActionHash | null>;
  fetchEconomicEvent: (hash: ActionHash) => Promise<EconomicEvent | null>;
  fetchCommitmentsByProvider: (provider: AgentPubKey) => Promise<Commitment[]>;
  fetchCommitmentsByReceiver: (receiver: AgentPubKey) => Promise<Commitment[]>;
  fetchMyCommitmentsAsProvider: (myAgentPubKey: AgentPubKey) => Promise<void>;
  fetchMyCommitmentsAsReceiver: (myAgentPubKey: AgentPubKey) => Promise<void>;
  fetchEventsByAgent: (agent: AgentPubKey) => Promise<EconomicEvent[]>;
  fetchMyEconomicEvents: (myAgentPubKey: AgentPubKey) => Promise<void>;
  fetchPendingCommitments: () => Promise<void>;
  cancelCommitment: (hash: ActionHash, reason?: string) => Promise<ActionHash | null>;
  updateCommitment: (
    hash: ActionHash,
    updatedCommitment: Omit<Commitment, 'created_at'>
  ) => Promise<ActionHash | null>;
  fetchEventsByType: (
    eventType: 'transfer' | 'produce' | 'consume' | 'use'
  ) => Promise<EconomicEvent[]>;
  fetchEventsInTimeRange: (
    startTime: Timestamp,
    endTime: Timestamp
  ) => Promise<EconomicEvent[]>;
  fetchResourceFlow: (resourceHash: ActionHash) => Promise<ResourceFlow | null>;
  validateGovernanceRules: (
    resourceHash: ActionHash,
    operation: string,
    agent: AgentPubKey
  ) => Promise<boolean>;
  createDispute: (
    commitment: ActionHash,
    complainant: AgentPubKey,
    description: string
  ) => Promise<ActionHash | null>;
  voteOnDispute: (
    disputeHash: ActionHash,
    vote: 'approve' | 'reject' | 'abstain',
    agent: AgentPubKey
  ) => Promise<ActionHash | null>;
  selectCommitment: (commitment: Commitment) => void;
  selectEconomicEvent: (event: EconomicEvent) => void;
  clearSelections: () => void;
  clearError: () => void;
  initialize: () => Promise<void>;
};

// ─── Store factory ─────────────────────────────────────────────────────────────

const createGovernanceStore = (): E.Effect<GovernanceStore, never, GovernanceServiceTag> =>
  E.gen(function* () {
    const governanceService: GovernanceService = yield* GovernanceServiceTag;

    // ─── Reactive state ──────────────────────────────────────────────────────
    let isLoading: boolean = $state(false);
    let errorMessage: string | null = $state(null);

    const allCommitments: Commitment[] = $state([]);
    const allEconomicEvents: EconomicEvent[] = $state([]);
    let myCommitmentsAsProvider: Commitment[] = $state([]);
    let myCommitmentsAsReceiver: Commitment[] = $state([]);
    let myEconomicEvents: EconomicEvent[] = $state([]);
    let pendingCommitments: Commitment[] = $state([]);
    let selectedCommitment: Commitment | null = $state(null);
    let selectedEconomicEvent: EconomicEvent | null = $state(null);

    const commitmentCache: Map<string, Commitment> = $state(new Map());
    const eventCache: Map<string, EconomicEvent> = $state(new Map());
    const commitmentsByProvider: Map<string, Commitment[]> = $state(new Map());
    const commitmentsByReceiver: Map<string, Commitment[]> = $state(new Map());
    const eventsByAgent: Map<string, EconomicEvent[]> = $state(new Map());
    const eventsByType: Map<string, EconomicEvent[]> = $state(new Map());

    // ─── Loading state setters ────────────────────────────────────────────────
    const setters = createLoadingStateSetter(
      (v) => { isLoading = v; },
      (v) => { errorMessage = v; }
    );

    // ─── Internal run helper ──────────────────────────────────────────────────
    async function run<T>(effect: E.Effect<T, unknown>): Promise<T | null> {
      const exit = await E.runPromiseExit(withLoadingState(() => effect)(setters));
      return Exit.isSuccess(exit) ? exit.value : null;
    }

    // ─── Actions ──────────────────────────────────────────────────────────────

    async function createCommitment(
      commitmentData: Omit<Commitment, 'created_at'>
    ): Promise<ActionHash | null> {
      const hash = await run(governanceService.createCommitment(commitmentData));
      if (hash) {
        await fetchPendingCommitments();
        await fetchCommitmentsByProvider(commitmentData.provider);
        await fetchCommitmentsByReceiver(commitmentData.receiver);
      }
      return hash;
    }

    async function fetchCommitment(hash: ActionHash): Promise<Commitment | null> {
      const commitment = await run(governanceService.getCommitment(hash));
      if (commitment) commitmentCache.set(hash.toString(), commitment);
      return commitment;
    }

    async function fulfillCommitment(hash: ActionHash): Promise<ActionHash | null> {
      const fulfillHash = await run(governanceService.fulfillCommitment(hash));
      if (fulfillHash) {
        await fetchPendingCommitments();
        const cached = commitmentCache.get(hash.toString());
        if (cached) {
          await fetchCommitmentsByProvider(cached.provider);
          await fetchCommitmentsByReceiver(cached.receiver);
        }
      }
      return fulfillHash;
    }

    async function createEconomicEvent(
      eventData: Omit<EconomicEvent, 'occurred_at'>
    ): Promise<ActionHash | null> {
      const hash = await run(governanceService.createEconomicEvent(eventData));
      if (hash) {
        await fetchEventsByAgent(eventData.provider);
        if (eventData.receiver) await fetchEventsByAgent(eventData.receiver);
      }
      return hash;
    }

    async function fetchEconomicEvent(hash: ActionHash): Promise<EconomicEvent | null> {
      const event = await run(governanceService.getEconomicEvent(hash));
      if (event) eventCache.set(hash.toString(), event);
      return event;
    }

    async function fetchCommitmentsByProvider(provider: AgentPubKey): Promise<Commitment[]> {
      const exit = await E.runPromiseExit(governanceService.getCommitmentsByProvider(provider));
      if (Exit.isSuccess(exit)) {
        commitmentsByProvider.set(provider.toString(), exit.value);
        return exit.value;
      }
      return [];
    }

    async function fetchCommitmentsByReceiver(receiver: AgentPubKey): Promise<Commitment[]> {
      const exit = await E.runPromiseExit(governanceService.getCommitmentsByReceiver(receiver));
      if (Exit.isSuccess(exit)) {
        commitmentsByReceiver.set(receiver.toString(), exit.value);
        return exit.value;
      }
      return [];
    }

    async function fetchMyCommitmentsAsProvider(myAgentPubKey: AgentPubKey): Promise<void> {
      const commitments = await run(governanceService.getCommitmentsByProvider(myAgentPubKey));
      if (commitments) myCommitmentsAsProvider = commitments;
    }

    async function fetchMyCommitmentsAsReceiver(myAgentPubKey: AgentPubKey): Promise<void> {
      const commitments = await run(governanceService.getCommitmentsByReceiver(myAgentPubKey));
      if (commitments) myCommitmentsAsReceiver = commitments;
    }

    async function fetchEventsByAgent(agent: AgentPubKey): Promise<EconomicEvent[]> {
      const exit = await E.runPromiseExit(governanceService.getEventsByAgent(agent));
      if (Exit.isSuccess(exit)) {
        eventsByAgent.set(agent.toString(), exit.value);
        return exit.value;
      }
      return [];
    }

    async function fetchMyEconomicEvents(myAgentPubKey: AgentPubKey): Promise<void> {
      const events = await run(governanceService.getEventsByAgent(myAgentPubKey));
      if (events) myEconomicEvents = events;
    }

    async function fetchPendingCommitments(): Promise<void> {
      const commitments = await run(governanceService.getPendingCommitments());
      if (commitments) pendingCommitments = commitments;
    }

    async function cancelCommitment(
      hash: ActionHash,
      reason?: string
    ): Promise<ActionHash | null> {
      const cancelHash = await run(governanceService.cancelCommitment(hash, reason));
      if (cancelHash) {
        await fetchPendingCommitments();
        const cached = commitmentCache.get(hash.toString());
        if (cached) {
          await fetchCommitmentsByProvider(cached.provider);
          await fetchCommitmentsByReceiver(cached.receiver);
        }
      }
      return cancelHash;
    }

    async function updateCommitment(
      hash: ActionHash,
      updatedCommitment: Omit<Commitment, 'created_at'>
    ): Promise<ActionHash | null> {
      const updateHash = await run(governanceService.updateCommitment(hash, updatedCommitment));
      if (updateHash) {
        commitmentCache.delete(hash.toString());
        await fetchCommitmentsByProvider(updatedCommitment.provider);
        await fetchCommitmentsByReceiver(updatedCommitment.receiver);
      }
      return updateHash;
    }

    async function fetchEventsByType(
      eventType: 'transfer' | 'produce' | 'consume' | 'use'
    ): Promise<EconomicEvent[]> {
      const exit = await E.runPromiseExit(governanceService.getEventsByType(eventType));
      if (Exit.isSuccess(exit)) {
        eventsByType.set(eventType, exit.value);
        return exit.value;
      }
      return [];
    }

    async function fetchEventsInTimeRange(
      startTime: Timestamp,
      endTime: Timestamp
    ): Promise<EconomicEvent[]> {
      const exit = await E.runPromiseExit(
        governanceService.getEventsInTimeRange(startTime, endTime)
      );
      return Exit.isSuccess(exit) ? exit.value : [];
    }

    async function fetchResourceFlow(resourceHash: ActionHash): Promise<ResourceFlow | null> {
      const exit = await E.runPromiseExit(governanceService.getResourceFlow(resourceHash));
      return Exit.isSuccess(exit) ? exit.value : null;
    }

    async function validateGovernanceRules(
      resourceHash: ActionHash,
      operation: string,
      agent: AgentPubKey
    ): Promise<boolean> {
      const exit = await E.runPromiseExit(
        governanceService.validateGovernanceRules(resourceHash, operation, agent)
      );
      return Exit.isSuccess(exit) ? exit.value : false;
    }

    async function createDispute(
      commitment: ActionHash,
      complainant: AgentPubKey,
      description: string
    ): Promise<ActionHash | null> {
      return run(governanceService.createDispute(commitment, complainant, description));
    }

    async function voteOnDispute(
      disputeHash: ActionHash,
      vote: 'approve' | 'reject' | 'abstain',
      agent: AgentPubKey
    ): Promise<ActionHash | null> {
      return run(governanceService.voteOnDispute(disputeHash, vote, agent));
    }

    function selectCommitment(commitment: Commitment) { selectedCommitment = commitment; }
    function selectEconomicEvent(event: EconomicEvent) { selectedEconomicEvent = event; }
    function clearSelections() { selectedCommitment = null; selectedEconomicEvent = null; }
    function clearError() { errorMessage = null; isLoading = false; }
    async function initialize() { await fetchPendingCommitments(); }

    return {
      get isLoading() { return isLoading; },
      get errorMessage() { return errorMessage; },
      get allCommitments() { return allCommitments; },
      get allEconomicEvents() { return allEconomicEvents; },
      get myCommitmentsAsProvider() { return myCommitmentsAsProvider; },
      get myCommitmentsAsReceiver() { return myCommitmentsAsReceiver; },
      get myEconomicEvents() { return myEconomicEvents; },
      get pendingCommitments() { return pendingCommitments; },
      get selectedCommitment() { return selectedCommitment; },
      get selectedEconomicEvent() { return selectedEconomicEvent; },
      get commitmentsByProvider() { return commitmentsByProvider; },
      get commitmentsByReceiver() { return commitmentsByReceiver; },
      get eventsByAgent() { return eventsByAgent; },
      get eventsByType() { return eventsByType; },

      createCommitment,
      fetchCommitment,
      fulfillCommitment,
      createEconomicEvent,
      fetchEconomicEvent,
      fetchCommitmentsByProvider,
      fetchCommitmentsByReceiver,
      fetchMyCommitmentsAsProvider,
      fetchMyCommitmentsAsReceiver,
      fetchEventsByAgent,
      fetchMyEconomicEvents,
      fetchPendingCommitments,
      cancelCommitment,
      updateCommitment,
      fetchEventsByType,
      fetchEventsInTimeRange,
      fetchResourceFlow,
      validateGovernanceRules,
      createDispute,
      voteOnDispute,
      selectCommitment,
      selectEconomicEvent,
      clearSelections,
      clearError,
      initialize
    };
  });

// ─── Store instance ────────────────────────────────────────────────────────────

export const governanceStore: GovernanceStore = pipe(
  createGovernanceStore(),
  E.provide(GovernanceServiceResolved),
  E.runSync
);
