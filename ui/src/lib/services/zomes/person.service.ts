import { Context, Effect as E, Layer } from 'effect';
import type { ActionHash, AgentPubKey } from '@holochain/client';
import {
  HolochainClientServiceTag,
  HolochainClientServiceLive
} from '../holochain.service.svelte';
import { wrapZomeCallWithErrorFactory } from '$lib/utils/zome-helpers';
import { PersonError } from '$lib/errors/person.errors';
import { PERSON_CONTEXTS } from '$lib/errors/error-contexts';
import type { Person, EncryptedProfile, PersonRole } from '@nondominium/shared-types';

// ─── Service interface ────────────────────────────────────────────────────────

export interface PersonService {
  createPerson: (
    person: Omit<Person, 'agent_pub_key' | 'created_at'>
  ) => E.Effect<ActionHash, PersonError>;
  getPerson: (hash: ActionHash) => E.Effect<Person, PersonError>;
  getAllPersons: () => E.Effect<Person[], PersonError>;
  createEncryptedProfile: (
    profile: Omit<EncryptedProfile, 'agent_pub_key' | 'created_at'>
  ) => E.Effect<ActionHash, PersonError>;
  getEncryptedProfile: (hash: ActionHash) => E.Effect<EncryptedProfile, PersonError>;
  assignRole: (agent: AgentPubKey, role: string) => E.Effect<ActionHash, PersonError>;
  getRoles: (agent: AgentPubKey) => E.Effect<PersonRole[], PersonError>;
  getMyProfile: () => E.Effect<
    { person: Person | null; private_data: EncryptedProfile | null },
    PersonError
  >;
  hasRoleCapability: (agent: AgentPubKey, role: string) => E.Effect<boolean, PersonError>;
  getCapabilityLevel: (agent: AgentPubKey) => E.Effect<string, PersonError>;
  updatePerson: (
    hash: ActionHash,
    updatedPerson: Omit<Person, 'agent_pub_key' | 'created_at'>
  ) => E.Effect<ActionHash, PersonError>;
  deletePerson: (hash: ActionHash) => E.Effect<ActionHash, PersonError>;
}

// ─── Context Tag ─────────────────────────────────────────────────────────────

export class PersonServiceTag extends Context.Tag('PersonService')<
  PersonServiceTag,
  PersonService
>() {}

// ─── Live Layer ───────────────────────────────────────────────────────────────

export const PersonServiceLive: Layer.Layer<
  PersonServiceTag,
  never,
  HolochainClientServiceTag
> = Layer.effect(
  PersonServiceTag,
  E.gen(function* () {
    const holochainClient = yield* HolochainClientServiceTag;

    const wz = <T>(fnName: string, payload: unknown, context: string): E.Effect<T, PersonError> =>
      wrapZomeCallWithErrorFactory<T, PersonError>(
        holochainClient,
        'zome_person',
        fnName,
        payload,
        context,
        PersonError.fromError
      );

    return {
      createPerson: (person) =>
        wz<ActionHash>('create_person', person, PERSON_CONTEXTS.CREATE_PERSON),

      getPerson: (hash) =>
        wz<Person>('get_person', hash, PERSON_CONTEXTS.GET_PERSON),

      getAllPersons: () =>
        wz<Person[]>('get_all_persons', null, PERSON_CONTEXTS.GET_ALL_PERSONS),

      createEncryptedProfile: (profile) =>
        wz<ActionHash>('create_encrypted_profile', profile, PERSON_CONTEXTS.CREATE_ENCRYPTED_PROFILE),

      getEncryptedProfile: (hash) =>
        wz<EncryptedProfile>('get_encrypted_profile', hash, PERSON_CONTEXTS.GET_ENCRYPTED_PROFILE),

      assignRole: (agent, role) =>
        wz<ActionHash>('assign_role', { agent, role }, PERSON_CONTEXTS.ASSIGN_ROLE),

      getRoles: (agent) =>
        wz<PersonRole[]>('get_roles', agent, PERSON_CONTEXTS.GET_ROLES),

      getMyProfile: () =>
        wz<{ person: Person | null; private_data: EncryptedProfile | null }>(
          'get_my_profile',
          null,
          PERSON_CONTEXTS.GET_MY_PROFILE
        ),

      hasRoleCapability: (agent, role) =>
        wz<boolean>('has_role_capability', { agent, role }, PERSON_CONTEXTS.HAS_ROLE_CAPABILITY),

      getCapabilityLevel: (agent) =>
        wz<string>('get_capability_level', agent, PERSON_CONTEXTS.GET_CAPABILITY_LEVEL),

      updatePerson: (hash, updatedPerson) =>
        wz<ActionHash>(
          'update_person',
          { hash, person: updatedPerson },
          PERSON_CONTEXTS.UPDATE_PERSON
        ),

      deletePerson: (hash) =>
        wz<ActionHash>('delete_person', hash, PERSON_CONTEXTS.DELETE_PERSON)
    } satisfies PersonService;
  })
);

/** Fully-resolved layer for direct use (no further dependencies needed). */
export const PersonServiceResolved: Layer.Layer<PersonServiceTag> = PersonServiceLive.pipe(
  Layer.provide(HolochainClientServiceLive)
);
