import type { ActionHash, AgentPubKey, Timestamp } from '@holochain/client';
import holochainService from '../holochain.service.svelte.js';
import type { Commitment, EconomicEvent } from '../../types/holochain.js';

/**
 * Governance zome service - clean architecture without Effect
 * Handles all governance-related operations (Phase 2)
 */
class GovernanceService {
	/**
	 * Create a new commitment
	 */
	async createCommitment(commitment: Omit<Commitment, 'created_at'>): Promise<ActionHash> {
		try {
			return await holochainService.callZome('zome_gouvernance', 'create_commitment', commitment);
		} catch (error) {
			console.error('Failed to create commitment:', error);
			throw error;
		}
	}

	/**
	 * Get a commitment by hash
	 */
	async getCommitment(hash: ActionHash): Promise<Commitment> {
		try {
			return await holochainService.callZome('zome_gouvernance', 'get_commitment', hash);
		} catch (error) {
			console.error('Failed to get commitment:', error);
			throw error;
		}
	}

	/**
	 * Fulfill a commitment (mark as completed)
	 */
	async fulfillCommitment(hash: ActionHash): Promise<ActionHash> {
		try {
			return await holochainService.callZome('zome_gouvernance', 'fulfill_commitment', hash);
		} catch (error) {
			console.error('Failed to fulfill commitment:', error);
			throw error;
		}
	}

	/**
	 * Create a new economic event
	 */
	async createEconomicEvent(event: Omit<EconomicEvent, 'occurred_at'>): Promise<ActionHash> {
		try {
			return await holochainService.callZome('zome_gouvernance', 'create_economic_event', event);
		} catch (error) {
			console.error('Failed to create economic event:', error);
			throw error;
		}
	}

	/**
	 * Get an economic event by hash
	 */
	async getEconomicEvent(hash: ActionHash): Promise<EconomicEvent> {
		try {
			return await holochainService.callZome('zome_gouvernance', 'get_economic_event', hash);
		} catch (error) {
			console.error('Failed to get economic event:', error);
			throw error;
		}
	}

	/**
	 * Get all economic events for a specific agent
	 */
	async getEventsByAgent(agent: AgentPubKey): Promise<EconomicEvent[]> {
		try {
			return await holochainService.callZome('zome_gouvernance', 'get_events_by_agent', agent);
		} catch (error) {
			console.error('Failed to get events by agent:', error);
			throw error;
		}
	}

	/**
	 * Get all commitments made by a specific agent
	 */
	async getCommitmentsByProvider(provider: AgentPubKey): Promise<Commitment[]> {
		try {
			return await holochainService.callZome(
				'zome_gouvernance',
				'get_commitments_by_provider',
				provider
			);
		} catch (error) {
			console.error('Failed to get commitments by provider:', error);
			throw error;
		}
	}

	/**
	 * Get all commitments received by a specific agent
	 */
	async getCommitmentsByReceiver(receiver: AgentPubKey): Promise<Commitment[]> {
		try {
			return await holochainService.callZome(
				'zome_gouvernance',
				'get_commitments_by_receiver',
				receiver
			);
		} catch (error) {
			console.error('Failed to get commitments by receiver:', error);
			throw error;
		}
	}

	/**
	 * Get pending commitments (unfulfilled)
	 */
	async getPendingCommitments(): Promise<Commitment[]> {
		try {
			return await holochainService.callZome('zome_gouvernance', 'get_pending_commitments');
		} catch (error) {
			console.error('Failed to get pending commitments:', error);
			throw error;
		}
	}

	/**
	 * Cancel a commitment
	 */
	async cancelCommitment(hash: ActionHash, reason?: string): Promise<ActionHash> {
		try {
			return await holochainService.callZome('zome_gouvernance', 'cancel_commitment', {
				hash,
				reason
			});
		} catch (error) {
			console.error('Failed to cancel commitment:', error);
			throw error;
		}
	}

	/**
	 * Update commitment details
	 */
	async updateCommitment(
		hash: ActionHash,
		updatedCommitment: Omit<Commitment, 'created_at'>
	): Promise<ActionHash> {
		try {
			return await holochainService.callZome('zome_gouvernance', 'update_commitment', {
				hash,
				commitment: updatedCommitment
			});
		} catch (error) {
			console.error('Failed to update commitment:', error);
			throw error;
		}
	}

	/**
	 * Get events filtered by type
	 */
	async getEventsByType(
		eventType: 'transfer' | 'produce' | 'consume' | 'use'
	): Promise<EconomicEvent[]> {
		try {
			return await holochainService.callZome('zome_gouvernance', 'get_events_by_type', eventType);
		} catch (error) {
			console.error('Failed to get events by type:', error);
			throw error;
		}
	}

	/**
	 * Get events within a time range
	 */
	async getEventsInTimeRange(startTime: Timestamp, endTime: Timestamp): Promise<EconomicEvent[]> {
		try {
			return await holochainService.callZome('zome_gouvernance', 'get_events_in_time_range', {
				start_time: startTime,
				end_time: endTime
			});
		} catch (error) {
			console.error('Failed to get events in time range:', error);
			throw error;
		}
	}

	/**
	 * Get resource flow history
	 */
	async getResourceFlow(
		resourceHash: ActionHash
	): Promise<{ events: EconomicEvent[]; commitments: Commitment[] }> {
		try {
			return await holochainService.callZome('zome_gouvernance', 'get_resource_flow', resourceHash);
		} catch (error) {
			console.error('Failed to get resource flow:', error);
			throw error;
		}
	}

	/**
	 * Validate governance rules for a resource operation
	 */
	async validateGovernanceRules(
		resourceHash: ActionHash,
		operation: string,
		agent: AgentPubKey
	): Promise<boolean> {
		try {
			return await holochainService.callZome('zome_gouvernance', 'validate_governance_rules', {
				resource_hash: resourceHash,
				operation,
				agent
			});
		} catch (error) {
			console.error('Failed to validate governance rules:', error);
			throw error;
		}
	}

	/**
	 * Create a dispute resolution case
	 */
	async createDispute(
		commitment: ActionHash,
		complainant: AgentPubKey,
		description: string
	): Promise<ActionHash> {
		try {
			return await holochainService.callZome('zome_gouvernance', 'create_dispute', {
				commitment,
				complainant,
				description
			});
		} catch (error) {
			console.error('Failed to create dispute:', error);
			throw error;
		}
	}

	/**
	 * Vote on a dispute resolution
	 */
	async voteOnDispute(
		disputeHash: ActionHash,
		vote: 'approve' | 'reject' | 'abstain',
		agent: AgentPubKey
	): Promise<ActionHash> {
		try {
			return await holochainService.callZome('zome_gouvernance', 'vote_on_dispute', {
				dispute_hash: disputeHash,
				vote,
				agent
			});
		} catch (error) {
			console.error('Failed to vote on dispute:', error);
			throw error;
		}
	}
}

// Export singleton instance
export const governanceService = new GovernanceService();

// Export class for testing
export { GovernanceService };
