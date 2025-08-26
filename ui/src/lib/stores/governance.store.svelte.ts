import type { ActionHash, AgentPubKey, Timestamp } from '@holochain/client';
import { governanceService } from '../services/zomes/governance.service.js';
import type { Commitment, EconomicEvent } from '../types/holochain.js';

export type GovernanceLoadingState = 'idle' | 'loading' | 'success' | 'error';

export interface ResourceFlow {
	events: EconomicEvent[];
	commitments: Commitment[];
}

/**
 * Governance store using Svelte 5 runes
 * Clean architecture following requests-and-offers patterns (without Effect)
 */
function createGovernanceStore() {
	// Loading states
	let loadingState: GovernanceLoadingState = $state('idle');
	let error: Error | null = $state(null);

	// Data stores
	const allCommitments: Commitment[] = $state([]);
	const allEconomicEvents: EconomicEvent[] = $state([]);
	let myCommitmentsAsProvider: Commitment[] = $state([]);
	let myCommitmentsAsReceiver: Commitment[] = $state([]);
	let myEconomicEvents: EconomicEvent[] = $state([]);
	let pendingCommitments: Commitment[] = $state([]);
	let selectedCommitment: Commitment | null = $state(null);
	let selectedEconomicEvent: EconomicEvent | null = $state(null);

	// Cache for commitments and events
	const commitmentCache: Map<string, Commitment> = $state(new Map());
	const eventCache: Map<string, EconomicEvent> = $state(new Map());
	const commitmentsByProvider: Map<string, Commitment[]> = $state(new Map());
	const commitmentsByReceiver: Map<string, Commitment[]> = $state(new Map());
	const eventsByAgent: Map<string, EconomicEvent[]> = $state(new Map());
	const eventsByType: Map<string, EconomicEvent[]> = $state(new Map());

	/**
	 * Set loading state and error handling
	 */
	function setLoadingState(state: GovernanceLoadingState, errorMsg?: Error) {
		loadingState = state;
		error = errorMsg || null;
	}

	/**
	 * Create a new commitment
	 */
	async function createCommitment(
		commitmentData: Omit<Commitment, 'created_at'>
	): Promise<ActionHash | null> {
		setLoadingState('loading');

		try {
			const hash = await governanceService.createCommitment(commitmentData);

			// Refresh commitments lists
			await fetchPendingCommitments();
			await fetchCommitmentsByProvider(commitmentData.provider);
			await fetchCommitmentsByReceiver(commitmentData.receiver);

			setLoadingState('success');
			return hash;
		} catch (err) {
			setLoadingState('error', err as Error);
			return null;
		}
	}

	/**
	 * Get a specific commitment by hash
	 */
	async function fetchCommitment(hash: ActionHash): Promise<Commitment | null> {
		setLoadingState('loading');

		try {
			const commitment = await governanceService.getCommitment(hash);

			// Update cache
			const cacheKey = hash.toString();
			commitmentCache.set(cacheKey, commitment);

			setLoadingState('success');
			return commitment;
		} catch (err) {
			setLoadingState('error', err as Error);
			return null;
		}
	}

	/**
	 * Fulfill a commitment (mark as completed)
	 */
	async function fulfillCommitment(hash: ActionHash): Promise<ActionHash | null> {
		setLoadingState('loading');

		try {
			const fulfillHash = await governanceService.fulfillCommitment(hash);

			// Refresh relevant data
			await fetchPendingCommitments();
			const commitment = commitmentCache.get(hash.toString());
			if (commitment) {
				await fetchCommitmentsByProvider(commitment.provider);
				await fetchCommitmentsByReceiver(commitment.receiver);
			}

			setLoadingState('success');
			return fulfillHash;
		} catch (err) {
			setLoadingState('error', err as Error);
			return null;
		}
	}

	/**
	 * Create a new economic event
	 */
	async function createEconomicEvent(
		eventData: Omit<EconomicEvent, 'occurred_at'>
	): Promise<ActionHash | null> {
		setLoadingState('loading');

		try {
			const hash = await governanceService.createEconomicEvent(eventData);

			// Refresh events by agent
			await fetchEventsByAgent(eventData.provider);
			if (eventData.receiver) {
				await fetchEventsByAgent(eventData.receiver);
			}

			setLoadingState('success');
			return hash;
		} catch (err) {
			setLoadingState('error', err as Error);
			return null;
		}
	}

	/**
	 * Get a specific economic event by hash
	 */
	async function fetchEconomicEvent(hash: ActionHash): Promise<EconomicEvent | null> {
		setLoadingState('loading');

		try {
			const event = await governanceService.getEconomicEvent(hash);

			// Update cache
			const cacheKey = hash.toString();
			eventCache.set(cacheKey, event);

			setLoadingState('success');
			return event;
		} catch (err) {
			setLoadingState('error', err as Error);
			return null;
		}
	}

	/**
	 * Fetch commitments by provider
	 */
	async function fetchCommitmentsByProvider(provider: AgentPubKey): Promise<Commitment[]> {
		const providerKey = provider.toString();

		try {
			const commitments = await governanceService.getCommitmentsByProvider(provider);

			// Update cache
			commitmentsByProvider.set(providerKey, commitments);
			commitments.forEach((commitment) => {
				// TODO: We need the hash to use as cache key
				const cacheKey = `${commitment.provider.toString()}-${Date.now()}`;
				commitmentCache.set(cacheKey, commitment);
			});

			return commitments;
		} catch (err) {
			console.error('Failed to fetch commitments by provider:', err);
			return [];
		}
	}

	/**
	 * Fetch commitments by receiver
	 */
	async function fetchCommitmentsByReceiver(receiver: AgentPubKey): Promise<Commitment[]> {
		const receiverKey = receiver.toString();

		try {
			const commitments = await governanceService.getCommitmentsByReceiver(receiver);

			// Update cache
			commitmentsByReceiver.set(receiverKey, commitments);
			commitments.forEach((commitment) => {
				// TODO: We need the hash to use as cache key
				const cacheKey = `${commitment.receiver.toString()}-${Date.now()}`;
				commitmentCache.set(cacheKey, commitment);
			});

			return commitments;
		} catch (err) {
			console.error('Failed to fetch commitments by receiver:', err);
			return [];
		}
	}

	/**
	 * Fetch my commitments as provider
	 */
	async function fetchMyCommitmentsAsProvider(myAgentPubKey: AgentPubKey): Promise<void> {
		setLoadingState('loading');

		try {
			const commitments = await fetchCommitmentsByProvider(myAgentPubKey);
			myCommitmentsAsProvider = commitments;
			setLoadingState('success');
		} catch (err) {
			setLoadingState('error', err as Error);
		}
	}

	/**
	 * Fetch my commitments as receiver
	 */
	async function fetchMyCommitmentsAsReceiver(myAgentPubKey: AgentPubKey): Promise<void> {
		setLoadingState('loading');

		try {
			const commitments = await fetchCommitmentsByReceiver(myAgentPubKey);
			myCommitmentsAsReceiver = commitments;
			setLoadingState('success');
		} catch (err) {
			setLoadingState('error', err as Error);
		}
	}

	/**
	 * Fetch events by agent
	 */
	async function fetchEventsByAgent(agent: AgentPubKey): Promise<EconomicEvent[]> {
		const agentKey = agent.toString();

		try {
			const events = await governanceService.getEventsByAgent(agent);

			// Update cache
			eventsByAgent.set(agentKey, events);
			events.forEach((event) => {
				// TODO: We need the hash to use as cache key
				const cacheKey = `${event.provider.toString()}-${Date.now()}`;
				eventCache.set(cacheKey, event);
			});

			return events;
		} catch (err) {
			console.error('Failed to fetch events by agent:', err);
			return [];
		}
	}

	/**
	 * Fetch my economic events
	 */
	async function fetchMyEconomicEvents(myAgentPubKey: AgentPubKey): Promise<void> {
		setLoadingState('loading');

		try {
			const events = await fetchEventsByAgent(myAgentPubKey);
			myEconomicEvents = events;
			setLoadingState('success');
		} catch (err) {
			setLoadingState('error', err as Error);
		}
	}

	/**
	 * Fetch pending commitments
	 */
	async function fetchPendingCommitments(): Promise<void> {
		setLoadingState('loading');

		try {
			const commitments = await governanceService.getPendingCommitments();
			pendingCommitments = commitments;

			// Update cache
			commitments.forEach((commitment) => {
				// TODO: We need the hash to use as cache key
				const cacheKey = `${commitment.provider.toString()}-pending-${Date.now()}`;
				commitmentCache.set(cacheKey, commitment);
			});

			setLoadingState('success');
		} catch (err) {
			setLoadingState('error', err as Error);
		}
	}

	/**
	 * Cancel a commitment
	 */
	async function cancelCommitment(hash: ActionHash, reason?: string): Promise<ActionHash | null> {
		setLoadingState('loading');

		try {
			const cancelHash = await governanceService.cancelCommitment(hash, reason);

			// Refresh relevant data
			await fetchPendingCommitments();
			const commitment = commitmentCache.get(hash.toString());
			if (commitment) {
				await fetchCommitmentsByProvider(commitment.provider);
				await fetchCommitmentsByReceiver(commitment.receiver);
			}

			setLoadingState('success');
			return cancelHash;
		} catch (err) {
			setLoadingState('error', err as Error);
			return null;
		}
	}

	/**
	 * Update commitment details
	 */
	async function updateCommitment(
		hash: ActionHash,
		updatedCommitment: Omit<Commitment, 'created_at'>
	): Promise<ActionHash | null> {
		setLoadingState('loading');

		try {
			const updateHash = await governanceService.updateCommitment(hash, updatedCommitment);

			// Update cache and refresh
			commitmentCache.delete(hash.toString());
			await fetchCommitmentsByProvider(updatedCommitment.provider);
			await fetchCommitmentsByReceiver(updatedCommitment.receiver);

			setLoadingState('success');
			return updateHash;
		} catch (err) {
			setLoadingState('error', err as Error);
			return null;
		}
	}

	/**
	 * Get events filtered by type
	 */
	async function fetchEventsByType(
		eventType: 'transfer' | 'produce' | 'consume' | 'use'
	): Promise<EconomicEvent[]> {
		try {
			const events = await governanceService.getEventsByType(eventType);

			// Update cache
			eventsByType.set(eventType, events);
			events.forEach((event) => {
				const cacheKey = `${event.provider.toString()}-${eventType}-${Date.now()}`;
				eventCache.set(cacheKey, event);
			});

			return events;
		} catch (err) {
			console.error(`Failed to get events by type ${eventType}:`, err);
			return [];
		}
	}

	/**
	 * Get events within a time range
	 */
	async function fetchEventsInTimeRange(
		startTime: Timestamp,
		endTime: Timestamp
	): Promise<EconomicEvent[]> {
		try {
			return await governanceService.getEventsInTimeRange(startTime, endTime);
		} catch (err) {
			console.error('Failed to get events in time range:', err);
			return [];
		}
	}

	/**
	 * Get resource flow history
	 */
	async function fetchResourceFlow(resourceHash: ActionHash): Promise<ResourceFlow | null> {
		try {
			return await governanceService.getResourceFlow(resourceHash);
		} catch (err) {
			console.error('Failed to get resource flow:', err);
			return null;
		}
	}

	/**
	 * Validate governance rules for a resource operation
	 */
	async function validateGovernanceRules(
		resourceHash: ActionHash,
		operation: string,
		agent: AgentPubKey
	): Promise<boolean> {
		try {
			return await governanceService.validateGovernanceRules(resourceHash, operation, agent);
		} catch (err) {
			console.error('Failed to validate governance rules:', err);
			return false;
		}
	}

	/**
	 * Create a dispute resolution case
	 */
	async function createDispute(
		commitment: ActionHash,
		complainant: AgentPubKey,
		description: string
	): Promise<ActionHash | null> {
		setLoadingState('loading');

		try {
			const hash = await governanceService.createDispute(commitment, complainant, description);
			setLoadingState('success');
			return hash;
		} catch (err) {
			setLoadingState('error', err as Error);
			return null;
		}
	}

	/**
	 * Vote on a dispute resolution
	 */
	async function voteOnDispute(
		disputeHash: ActionHash,
		vote: 'approve' | 'reject' | 'abstain',
		agent: AgentPubKey
	): Promise<ActionHash | null> {
		setLoadingState('loading');

		try {
			const hash = await governanceService.voteOnDispute(disputeHash, vote, agent);
			setLoadingState('success');
			return hash;
		} catch (err) {
			setLoadingState('error', err as Error);
			return null;
		}
	}

	/**
	 * Select a commitment for detailed view
	 */
	function selectCommitment(commitment: Commitment) {
		selectedCommitment = commitment;
	}

	/**
	 * Select an economic event for detailed view
	 */
	function selectEconomicEvent(event: EconomicEvent) {
		selectedEconomicEvent = event;
	}

	/**
	 * Clear selections
	 */
	function clearSelections() {
		selectedCommitment = null;
		selectedEconomicEvent = null;
	}

	/**
	 * Clear error state
	 */
	function clearError() {
		error = null;
		if (loadingState === 'error') {
			loadingState = 'idle';
		}
	}

	/**
	 * Initialize the store
	 */
	async function initialize() {
		await fetchPendingCommitments();
	}

	return {
		// Reactive getters
		get loadingState() {
			return loadingState;
		},
		get error() {
			return error;
		},
		get allCommitments() {
			return allCommitments;
		},
		get allEconomicEvents() {
			return allEconomicEvents;
		},
		get myCommitmentsAsProvider() {
			return myCommitmentsAsProvider;
		},
		get myCommitmentsAsReceiver() {
			return myCommitmentsAsReceiver;
		},
		get myEconomicEvents() {
			return myEconomicEvents;
		},
		get pendingCommitments() {
			return pendingCommitments;
		},
		get selectedCommitment() {
			return selectedCommitment;
		},
		get selectedEconomicEvent() {
			return selectedEconomicEvent;
		},
		get commitmentsByProvider() {
			return commitmentsByProvider;
		},
		get commitmentsByReceiver() {
			return commitmentsByReceiver;
		},
		get eventsByAgent() {
			return eventsByAgent;
		},
		get eventsByType() {
			return eventsByType;
		},

		// Actions
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
}

// Export singleton instance
export const governanceStore = createGovernanceStore();

// Export type
export type GovernanceStore = ReturnType<typeof createGovernanceStore>;
