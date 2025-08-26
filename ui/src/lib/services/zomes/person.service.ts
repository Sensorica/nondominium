import type { ActionHash, AgentPubKey } from '@holochain/client';
import holochainService from '../holochain.service.svelte.js';
import type { Person, EncryptedProfile, PersonRole } from '../../types/holochain.js';

/**
 * Person zome service - clean architecture without Effect
 * Handles all person-related operations
 */
class PersonService {
	/**
	 * Create a new person profile
	 */
	async createPerson(person: Omit<Person, 'agent_pub_key' | 'created_at'>): Promise<ActionHash> {
		try {
			return await holochainService.callZome('zome_person', 'create_person', person);
		} catch (error) {
			console.error('Failed to create person:', error);
			throw error;
		}
	}

	/**
	 * Get a person by their action hash
	 */
	async getPerson(hash: ActionHash): Promise<Person> {
		try {
			return await holochainService.callZome('zome_person', 'get_person', hash);
		} catch (error) {
			console.error('Failed to get person:', error);
			throw error;
		}
	}

	/**
	 * Get all persons in the DHT for discovery
	 */
	async getAllPersons(): Promise<Person[]> {
		try {
			return await holochainService.callZome('zome_person', 'get_all_persons');
		} catch (error) {
			console.error('Failed to get all persons:', error);
			throw error;
		}
	}

	/**
	 * Create encrypted private profile data
	 */
	async createEncryptedProfile(
		profile: Omit<EncryptedProfile, 'agent_pub_key' | 'created_at'>
	): Promise<ActionHash> {
		try {
			return await holochainService.callZome('zome_person', 'create_encrypted_profile', profile);
		} catch (error) {
			console.error('Failed to create encrypted profile:', error);
			throw error;
		}
	}

	/**
	 * Get encrypted profile data (only accessible by the owner)
	 */
	async getEncryptedProfile(hash: ActionHash): Promise<EncryptedProfile> {
		try {
			return await holochainService.callZome('zome_person', 'get_encrypted_profile', hash);
		} catch (error) {
			console.error('Failed to get encrypted profile:', error);
			throw error;
		}
	}

	/**
	 * Assign a role to an agent
	 */
	async assignRole(agent: AgentPubKey, role: string): Promise<ActionHash> {
		try {
			return await holochainService.callZome('zome_person', 'assign_role', { agent, role });
		} catch (error) {
			console.error('Failed to assign role:', error);
			throw error;
		}
	}

	/**
	 * Get all roles assigned to an agent
	 */
	async getRoles(agent: AgentPubKey): Promise<PersonRole[]> {
		try {
			return await holochainService.callZome('zome_person', 'get_roles', agent);
		} catch (error) {
			console.error('Failed to get roles:', error);
			throw error;
		}
	}

	/**
	 * Get the current agent's own profile
	 */
	async getMyProfile(): Promise<{ person: Person | null; private_data: EncryptedProfile | null }> {
		try {
			return await holochainService.callZome('zome_person', 'get_my_profile');
		} catch (error) {
			console.error('Failed to get my profile:', error);
			throw error;
		}
	}

	/**
	 * Check if an agent has a specific role capability
	 */
	async hasRoleCapability(agent: AgentPubKey, role: string): Promise<boolean> {
		try {
			return await holochainService.callZome('zome_person', 'has_role_capability', { agent, role });
		} catch (error) {
			console.error('Failed to check role capability:', error);
			throw error;
		}
	}

	/**
	 * Get the capability level of an agent
	 */
	async getCapabilityLevel(agent: AgentPubKey): Promise<string> {
		try {
			return await holochainService.callZome('zome_person', 'get_capability_level', agent);
		} catch (error) {
			console.error('Failed to get capability level:', error);
			throw error;
		}
	}

	/**
	 * Update an existing person profile
	 */
	async updatePerson(
		hash: ActionHash,
		updatedPerson: Omit<Person, 'agent_pub_key' | 'created_at'>
	): Promise<ActionHash> {
		try {
			return await holochainService.callZome('zome_person', 'update_person', {
				hash,
				person: updatedPerson
			});
		} catch (error) {
			console.error('Failed to update person:', error);
			throw error;
		}
	}

	/**
	 * Delete a person profile (mark as deleted)
	 */
	async deletePerson(hash: ActionHash): Promise<ActionHash> {
		try {
			return await holochainService.callZome('zome_person', 'delete_person', hash);
		} catch (error) {
			console.error('Failed to delete person:', error);
			throw error;
		}
	}
}

// Export singleton instance
export const personService = new PersonService();

// Export class for testing
export { PersonService };
