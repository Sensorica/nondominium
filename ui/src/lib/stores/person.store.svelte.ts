import { Effect as E, Exit, pipe } from 'effect';
import type { ActionHash, AgentPubKey } from '@holochain/client';
import {
  PersonServiceTag,
  PersonServiceResolved,
  type PersonService
} from '../services/zomes/person.service.js';
import { withLoadingState, createLoadingStateSetter } from '$lib/utils/store-helpers/core';
import type {
  Person,
  PersonProfileOutput,
  PersonRole,
  PrivatePersonDataInput,
  UpdatePersonInput
} from '@nondominium/shared-types';

export type PersonProfile = PersonProfileOutput;

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
  fetchLatestPerson: (originalActionHash: ActionHash) => Promise<Person | null>;
  getPersonFromCache: (agentPubKey: AgentPubKey) => Promise<Person | null>;
  fetchMyPersonProfile: () => Promise<void>;
  storePrivatePersonData: (input: PrivatePersonDataInput) => Promise<ActionHash | null>;
  assignPersonRole: (
    agent: AgentPubKey,
    roleName: string,
    description?: string
  ) => Promise<ActionHash | null>;
  fetchPersonRoles: (agent: AgentPubKey) => Promise<PersonRole[]>;
  hasPersonRoleCapability: (agent: AgentPubKey, roleName: string) => Promise<boolean>;
  getPersonCapabilityLevel: (agent: AgentPubKey) => Promise<string>;
  updatePerson: (input: UpdatePersonInput) => Promise<ActionHash | null>;
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
      (v) => {
        isLoading = v;
      },
      (v) => {
        errorMessage = v;
      }
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
        await fetchMyPersonProfile();
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

    async function fetchLatestPerson(originalActionHash: ActionHash): Promise<Person | null> {
      const person = await run(personService.getLatestPerson(originalActionHash));
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

    async function fetchMyPersonProfile(): Promise<void> {
      const profile = await run(personService.getMyPersonProfile());
      if (profile) myProfile = profile;
    }

    async function storePrivatePersonData(input: PrivatePersonDataInput): Promise<ActionHash | null> {
      const hash = await run(personService.storePrivatePersonData(input));
      if (hash) await fetchMyPersonProfile();
      return hash;
    }

    async function assignPersonRole(
      agent: AgentPubKey,
      roleName: string,
      description?: string
    ): Promise<ActionHash | null> {
      const hash = await run(
        personService.assignPersonRole({ agent_pubkey: agent, role_name: roleName, description })
      );
      if (hash) await fetchPersonRoles(agent);
      return hash;
    }

    async function fetchPersonRoles(agent: AgentPubKey): Promise<PersonRole[]> {
      const exit = await E.runPromiseExit(personService.getPersonRoles(agent));
      if (Exit.isSuccess(exit)) {
        personRoles.set(agent.toString(), exit.value);
        return exit.value;
      }
      return [];
    }

    async function hasPersonRoleCapability(agent: AgentPubKey, roleName: string): Promise<boolean> {
      const exit = await E.runPromiseExit(personService.hasPersonRoleCapability(agent, roleName));
      return Exit.isSuccess(exit) ? exit.value : false;
    }

    async function getPersonCapabilityLevel(agent: AgentPubKey): Promise<string> {
      const exit = await E.runPromiseExit(personService.getPersonCapabilityLevel(agent));
      return Exit.isSuccess(exit) ? exit.value : 'MEMBER';
    }

    async function updatePerson(input: UpdatePersonInput): Promise<ActionHash | null> {
      const updateHash = await run(personService.updatePerson(input));
      if (updateHash) {
        await fetchAllPersons();
        if (myProfile?.person) await fetchMyPersonProfile();
      }
      return updateHash;
    }

    function selectPerson(person: Person) {
      selectedPerson = person;
    }
    function clearSelectedPerson() {
      selectedPerson = null;
    }
    function clearError() {
      errorMessage = null;
    }
    async function initialize() {
      await fetchAllPersons();
      await fetchMyPersonProfile();
    }

    return {
      get isLoading() {
        return isLoading;
      },
      get errorMessage() {
        return errorMessage;
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

      createPerson,
      fetchAllPersons,
      fetchLatestPerson,
      getPersonFromCache,
      fetchMyPersonProfile,
      storePrivatePersonData,
      assignPersonRole,
      fetchPersonRoles,
      hasPersonRoleCapability,
      getPersonCapabilityLevel,
      updatePerson,
      selectPerson,
      clearSelectedPerson,
      clearError,
      initialize
    };
  });

// ─── Store instance ───────────────────────────────────────────────────────────

export const personStore: PersonStore = pipe(
  createPersonStore(),
  E.provide(PersonServiceResolved),
  E.runSync
);
