import { Effect as E, Exit, pipe } from 'effect';
import type { ActionHash, AgentPubKey } from '@holochain/client';
import {
  PersonServiceTag,
  PersonServiceResolved,
  type PersonService
} from '../services/zomes/person.service.js';
import { withLoadingState, createLoadingStateSetter } from '$lib/utils/store-helpers/core';
import type { Person, EncryptedProfile, PersonRole } from '@nondominium/shared-types';

export interface PersonProfile {
  person: Person | null;
  private_data: EncryptedProfile | null;
}

// ─── Store type ────────────────────────────────────────────────────────────────

export type PersonStore = {
  readonly isLoading: boolean;
  readonly errorMessage: string | null;
  readonly allPersons: Person[];
  readonly myProfile: PersonProfile | null;
  readonly selectedPerson: Person | null;
  readonly personRoles: Map<string, PersonRole[]>;

  createPerson: (
    personData: Omit<Person, 'agent_pub_key' | 'created_at'>
  ) => Promise<ActionHash | null>;
  fetchAllPersons: () => Promise<void>;
  fetchPerson: (hash: ActionHash) => Promise<Person | null>;
  getPersonFromCache: (agentPubKey: AgentPubKey) => Promise<Person | null>;
  fetchMyProfile: () => Promise<void>;
  createEncryptedProfile: (
    profileData: Omit<EncryptedProfile, 'agent_pub_key' | 'created_at'>
  ) => Promise<ActionHash | null>;
  assignRole: (agent: AgentPubKey, role: string) => Promise<ActionHash | null>;
  fetchPersonRoles: (agent: AgentPubKey) => Promise<PersonRole[]>;
  checkRoleCapability: (agent: AgentPubKey, role: string) => Promise<boolean>;
  getCapabilityLevel: (agent: AgentPubKey) => Promise<string>;
  updatePerson: (
    hash: ActionHash,
    updatedPerson: Omit<Person, 'agent_pub_key' | 'created_at'>
  ) => Promise<ActionHash | null>;
  selectPerson: (person: Person) => void;
  clearSelectedPerson: () => void;
  clearError: () => void;
  initialize: () => Promise<void>;
};

// ─── Store factory ─────────────────────────────────────────────────────────────

const createPersonStore = (): E.Effect<PersonStore, never, PersonServiceTag> =>
  E.gen(function* () {
    const personService: PersonService = yield* PersonServiceTag;

    // ─── Reactive state ──────────────────────────────────────────────────────
    let isLoading: boolean = $state(false);
    let errorMessage: string | null = $state(null);
    let allPersons: Person[] = $state([]);
    let myProfile: PersonProfile | null = $state(null);
    let selectedPerson: Person | null = $state(null);
    const personRoles: Map<string, PersonRole[]> = $state(new Map());
    const personCache: Map<string, Person> = $state(new Map());

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

    async function createPerson(
      personData: Omit<Person, 'agent_pub_key' | 'created_at'>
    ): Promise<ActionHash | null> {
      const hash = await run(personService.createPerson(personData));
      if (hash) {
        await fetchAllPersons();
        await fetchMyProfile();
      }
      return hash;
    }

    async function fetchAllPersons(): Promise<void> {
      const persons = await run(personService.getAllPersons());
      if (persons) {
        allPersons = persons;
        persons.forEach((p) => personCache.set(p.agent_pub_key.toString(), p));
      }
    }

    async function fetchPerson(hash: ActionHash): Promise<Person | null> {
      const person = await run(personService.getPerson(hash));
      if (person) personCache.set(person.agent_pub_key.toString(), person);
      return person;
    }

    async function getPersonFromCache(agentPubKey: AgentPubKey): Promise<Person | null> {
      const cacheKey = agentPubKey.toString();
      if (personCache.has(cacheKey)) return personCache.get(cacheKey)!;
      const existing = allPersons.find((p) => p.agent_pub_key.toString() === cacheKey);
      if (existing) {
        personCache.set(cacheKey, existing);
        return existing;
      }
      return null;
    }

    async function fetchMyProfile(): Promise<void> {
      const profile = await run(personService.getMyProfile());
      if (profile) myProfile = profile;
    }

    async function createEncryptedProfile(
      profileData: Omit<EncryptedProfile, 'agent_pub_key' | 'created_at'>
    ): Promise<ActionHash | null> {
      const hash = await run(personService.createEncryptedProfile(profileData));
      if (hash) await fetchMyProfile();
      return hash;
    }

    async function assignRole(agent: AgentPubKey, role: string): Promise<ActionHash | null> {
      const hash = await run(personService.assignRole(agent, role));
      if (hash) await fetchPersonRoles(agent);
      return hash;
    }

    async function fetchPersonRoles(agent: AgentPubKey): Promise<PersonRole[]> {
      const exit = await E.runPromiseExit(personService.getRoles(agent));
      if (Exit.isSuccess(exit)) {
        personRoles.set(agent.toString(), exit.value);
        return exit.value;
      }
      return [];
    }

    async function checkRoleCapability(agent: AgentPubKey, role: string): Promise<boolean> {
      const exit = await E.runPromiseExit(personService.hasRoleCapability(agent, role));
      return Exit.isSuccess(exit) ? exit.value : false;
    }

    async function getCapabilityLevel(agent: AgentPubKey): Promise<string> {
      const exit = await E.runPromiseExit(personService.getCapabilityLevel(agent));
      return Exit.isSuccess(exit) ? exit.value : 'MEMBER';
    }

    async function updatePerson(
      hash: ActionHash,
      updatedPerson: Omit<Person, 'agent_pub_key' | 'created_at'>
    ): Promise<ActionHash | null> {
      const updateHash = await run(personService.updatePerson(hash, updatedPerson));
      if (updateHash) {
        await fetchAllPersons();
        if (myProfile?.person) await fetchMyProfile();
      }
      return updateHash;
    }

    function selectPerson(person: Person) { selectedPerson = person; }
    function clearSelectedPerson() { selectedPerson = null; }
    function clearError() { errorMessage = null; }
    async function initialize() { await fetchAllPersons(); await fetchMyProfile(); }

    return {
      get isLoading() { return isLoading; },
      get errorMessage() { return errorMessage; },
      get allPersons() { return allPersons; },
      get myProfile() { return myProfile; },
      get selectedPerson() { return selectedPerson; },
      get personRoles() { return personRoles; },

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
  });

// ─── Store instance ────────────────────────────────────────────────────────────

export const personStore: PersonStore = pipe(
  createPersonStore(),
  E.provide(PersonServiceResolved),
  E.runSync
);
