import type { ActionHash, AgentPubKey } from '@holochain/client';
import { personService } from '../services/zomes/person.service.js';
import type { Person, EncryptedProfile, PersonRole } from '@nondominium/shared-types';

export type PersonLoadingState = 'idle' | 'loading' | 'success' | 'error';

export interface PersonProfile {
  person: Person | null;
  private_data: EncryptedProfile | null;
}

/**
 * Person store using Svelte 5 runes
 * Clean architecture following requests-and-offers patterns (without Effect)
 */
function createPersonStore() {
  // Loading states
  let loadingState: PersonLoadingState = $state('idle');
  let error: Error | null = $state(null);

  // Data stores
  let allPersons: Person[] = $state([]);
  let myProfile: PersonProfile | null = $state(null);
  let selectedPerson: Person | null = $state(null);
  const personRoles: Map<string, PersonRole[]> = $state(new Map());

  // Cache for person profiles
  const personCache: Map<string, Person> = $state(new Map());

  /**
   * Set loading state and error handling
   */
  function setLoadingState(state: PersonLoadingState, errorMsg?: Error) {
    loadingState = state;
    error = errorMsg || null;
  }

  /**
   * Create a new person profile
   */
  async function createPerson(
    personData: Omit<Person, 'agent_pub_key' | 'created_at'>
  ): Promise<ActionHash | null> {
    setLoadingState('loading');

    try {
      const hash = await personService.createPerson(personData);

      // Refresh the persons list
      await fetchAllPersons();
      await fetchMyProfile();

      setLoadingState('success');
      return hash;
    } catch (err) {
      setLoadingState('error', err as Error);
      return null;
    }
  }

  /**
   * Fetch all persons from the DHT
   */
  async function fetchAllPersons(): Promise<void> {
    setLoadingState('loading');

    try {
      const persons = await personService.getAllPersons();
      allPersons = persons;

      // Update cache
      persons.forEach((person) => {
        personCache.set(person.agent_pub_key.toString(), person);
      });

      setLoadingState('success');
    } catch (err) {
      setLoadingState('error', err as Error);
    }
  }

  /**
   * Get a specific person by hash
   */
  async function fetchPerson(hash: ActionHash): Promise<Person | null> {
    setLoadingState('loading');

    try {
      const person = await personService.getPerson(hash);

      // Update cache
      personCache.set(person.agent_pub_key.toString(), person);

      setLoadingState('success');
      return person;
    } catch (err) {
      setLoadingState('error', err as Error);
      return null;
    }
  }

  /**
   * Get person from cache or fetch if not cached
   */
  async function getPersonFromCache(agentPubKey: AgentPubKey): Promise<Person | null> {
    const cacheKey = agentPubKey.toString();

    if (personCache.has(cacheKey)) {
      return personCache.get(cacheKey)!;
    }

    // If not in cache, we need to search in allPersons or fetch
    const existingPerson = allPersons.find((p) => p.agent_pub_key.toString() === cacheKey);
    if (existingPerson) {
      personCache.set(cacheKey, existingPerson);
      return existingPerson;
    }

    // TODO: We might need a get_person_by_agent function in the zome
    return null;
  }

  /**
   * Fetch current agent's profile
   */
  async function fetchMyProfile(): Promise<void> {
    setLoadingState('loading');

    try {
      const profile = await personService.getMyProfile();
      myProfile = profile;
      setLoadingState('success');
    } catch (err) {
      setLoadingState('error', err as Error);
    }
  }

  /**
   * Create encrypted private profile
   */
  async function createEncryptedProfile(
    profileData: Omit<EncryptedProfile, 'agent_pub_key' | 'created_at'>
  ): Promise<ActionHash | null> {
    setLoadingState('loading');

    try {
      const hash = await personService.createEncryptedProfile(profileData);

      // Refresh my profile to include the new private data
      await fetchMyProfile();

      setLoadingState('success');
      return hash;
    } catch (err) {
      setLoadingState('error', err as Error);
      return null;
    }
  }

  /**
   * Assign a role to an agent
   */
  async function assignRole(agent: AgentPubKey, role: string): Promise<ActionHash | null> {
    setLoadingState('loading');

    try {
      const hash = await personService.assignRole(agent, role);

      // Refresh roles for this agent
      await fetchPersonRoles(agent);

      setLoadingState('success');
      return hash;
    } catch (err) {
      setLoadingState('error', err as Error);
      return null;
    }
  }

  /**
   * Fetch roles for a specific agent
   */
  async function fetchPersonRoles(agent: AgentPubKey): Promise<PersonRole[]> {
    const agentKey = agent.toString();

    try {
      const roles = await personService.getRoles(agent);

      // Update the roles map
      personRoles.set(agentKey, roles);

      return roles;
    } catch (err) {
      console.error('Failed to fetch person roles:', err);
      return [];
    }
  }

  /**
   * Check if an agent has a specific capability
   */
  async function checkRoleCapability(agent: AgentPubKey, role: string): Promise<boolean> {
    try {
      return await personService.hasRoleCapability(agent, role);
    } catch (err) {
      console.error('Failed to check role capability:', err);
      return false;
    }
  }

  /**
   * Get capability level for an agent
   */
  async function getCapabilityLevel(agent: AgentPubKey): Promise<string> {
    try {
      return await personService.getCapabilityLevel(agent);
    } catch (err) {
      console.error('Failed to get capability level:', err);
      return 'MEMBER'; // Default level
    }
  }

  /**
   * Update an existing person profile
   */
  async function updatePerson(
    hash: ActionHash,
    updatedPerson: Omit<Person, 'agent_pub_key' | 'created_at'>
  ): Promise<ActionHash | null> {
    setLoadingState('loading');

    try {
      const updateHash = await personService.updatePerson(hash, updatedPerson);

      // Refresh data
      await fetchAllPersons();
      if (myProfile?.person) {
        await fetchMyProfile();
      }

      setLoadingState('success');
      return updateHash;
    } catch (err) {
      setLoadingState('error', err as Error);
      return null;
    }
  }

  /**
   * Select a person for detailed view
   */
  function selectPerson(person: Person) {
    selectedPerson = person;
  }

  /**
   * Clear selected person
   */
  function clearSelectedPerson() {
    selectedPerson = null;
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
    await fetchAllPersons();
    await fetchMyProfile();
  }

  return {
    // Reactive getters
    get loadingState() {
      return loadingState;
    },
    get error() {
      return error;
    },
    get allPersons() {
      return allPersons;
    },
    get myProfile() {
      return myProfile;
    },
    get selectedPerson() {
      return selectedPerson;
    },
    get personRoles() {
      return personRoles;
    },

    // Actions
    createPerson,
    fetchAllPersons,
    fetchPerson,
    getPersonFromCache,
    fetchMyProfile,
    createEncryptedProfile,
    assignRole,
    fetchPersonRoles,
    checkRoleCapability,
    getCapabilityLevel,
    updatePerson,
    selectPerson,
    clearSelectedPerson,
    clearError,
    initialize
  };
}

// Export singleton instance
export const personStore = createPersonStore();

// Export type
export type PersonStore = ReturnType<typeof createPersonStore>;
