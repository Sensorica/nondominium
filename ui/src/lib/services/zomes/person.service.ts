import { Context, Effect as E, Layer, pipe } from 'effect';
import type { ActionHash, AgentPubKey, Record as HoloRecord } from '@holochain/client';
import {
  HolochainClientServiceTag,
  HolochainClientServiceLive
} from '../holochain.service.svelte';
import { wrapZomeCallWithErrorFactory } from '$lib/utils/zome-helpers';
import { PersonError } from '$lib/errors/person.errors';
import { PERSON_CONTEXTS } from '$lib/errors/error-contexts';
import type {
  GetAllPersonsOutput,
  GetPersonRolesOutput,
  Person,
  PersonProfileOutput,
  PersonRole,
  PersonRoleInput,
  PrivatePersonData,
  PrivatePersonDataInput,
  UpdatePersonInput
} from '@nondominium/shared-types';

const actionHashFromRecord = (record: HoloRecord): ActionHash => record.signed_action.hashed.hash;

// ─── Service interface (names aligned with `zome_person` externs) ─────────────

export interface PersonService {
  createPerson: (
    person: Omit<Person, 'agent_pub_key' | 'created_at'>
  ) => E.Effect<ActionHash, PersonError>;
  getLatestPerson: (originalActionHash: ActionHash) => E.Effect<Person, PersonError>;
  getAllPersons: () => E.Effect<Person[], PersonError>;
  storePrivatePersonData: (
    input: PrivatePersonDataInput
  ) => E.Effect<ActionHash, PersonError>;
  getAgentPrivateData: (agentPubKey: AgentPubKey) => E.Effect<PrivatePersonData | null, PersonError>;
  assignPersonRole: (input: PersonRoleInput) => E.Effect<ActionHash, PersonError>;
  getPersonRoles: (agentPubKey: AgentPubKey) => E.Effect<PersonRole[], PersonError>;
  getMyPersonProfile: () => E.Effect<PersonProfileOutput, PersonError>;
  hasPersonRoleCapability: (agent: AgentPubKey, roleName: string) => E.Effect<boolean, PersonError>;
  getPersonCapabilityLevel: (agent: AgentPubKey) => E.Effect<string, PersonError>;
  updatePerson: (input: UpdatePersonInput) => E.Effect<ActionHash, PersonError>;
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
        pipe(
          wz<HoloRecord>('create_person', person, PERSON_CONTEXTS.CREATE_PERSON),
          E.map(actionHashFromRecord)
        ),

      getLatestPerson: (originalActionHash) =>
        wz<Person>(
          'get_latest_person',
          originalActionHash,
          PERSON_CONTEXTS.GET_LATEST_PERSON
        ),

      getAllPersons: () =>
        pipe(
          wz<GetAllPersonsOutput>('get_all_persons', null, PERSON_CONTEXTS.GET_ALL_PERSONS),
          E.map((o) => o.persons)
        ),

      storePrivatePersonData: (input) =>
        pipe(
          wz<HoloRecord>(
            'store_private_person_data',
            input,
            PERSON_CONTEXTS.STORE_PRIVATE_PERSON_DATA
          ),
          E.map(actionHashFromRecord)
        ),

      getAgentPrivateData: (agentPubKey) =>
        wz<PrivatePersonData | null>(
          'get_agent_private_data',
          agentPubKey,
          PERSON_CONTEXTS.GET_AGENT_PRIVATE_DATA
        ),

      assignPersonRole: (input) =>
        pipe(
          wz<HoloRecord>('assign_person_role', input, PERSON_CONTEXTS.ASSIGN_PERSON_ROLE),
          E.map(actionHashFromRecord)
        ),

      getPersonRoles: (agentPubKey) =>
        pipe(
          wz<GetPersonRolesOutput>(
            'get_person_roles',
            agentPubKey,
            PERSON_CONTEXTS.GET_PERSON_ROLES
          ),
          E.map((o) => o.roles)
        ),

      getMyPersonProfile: () =>
        wz<PersonProfileOutput>(
          'get_my_person_profile',
          null,
          PERSON_CONTEXTS.GET_MY_PERSON_PROFILE
        ),

      hasPersonRoleCapability: (agent, roleName) =>
        wz<boolean>(
          'has_person_role_capability',
          [agent, roleName],
          PERSON_CONTEXTS.HAS_PERSON_ROLE_CAPABILITY
        ),

      getPersonCapabilityLevel: (agent) =>
        wz<string>(
          'get_person_capability_level',
          agent,
          PERSON_CONTEXTS.GET_PERSON_CAPABILITY_LEVEL
        ),

      updatePerson: (input) =>
        pipe(
          wz<HoloRecord>('update_person', input, PERSON_CONTEXTS.UPDATE_PERSON),
          E.map(actionHashFromRecord)
        )
    } satisfies PersonService;
  })
);

/** Fully-resolved layer for direct use (no further dependencies needed). */
export const PersonServiceResolved: Layer.Layer<PersonServiceTag> = PersonServiceLive.pipe(
  Layer.provide(HolochainClientServiceLive)
);
