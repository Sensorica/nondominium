import { Effect as E, Exit, Layer, pipe } from 'effect';
import type { GroupDescriptor, NdoDescriptor, NdoOutput, Person } from '@nondominium/shared-types';
import { LobbyServiceTag, LobbyServiceLive } from '../services/zomes/lobby.service';
import { PersonServiceTag, PersonServiceResolved } from '../services/zomes/person.service';
import { NdoServiceTag, NdoServiceResolved } from '../services/zomes/ndo.service';
import { withLoadingState, createLoadingStateSetter } from '$lib/utils/store-helpers/core';

/** Lobby store: resolved zome layers only (no duplicate `HolochainClientServiceTag`). */
const LobbyStoreServicesResolved = Layer.mergeAll(
  LobbyServiceLive,
  NdoServiceResolved,
  PersonServiceResolved
);

export type LobbyStore = {
  readonly ndos: NdoDescriptor[];
  readonly groups: GroupDescriptor[];
  readonly myPerson: Person | null;
  readonly isLoading: boolean;
  readonly errorMessage: string | null;
  loadGroups: () => Promise<void>;
  loadNdos: () => Promise<void>;
  loadMyPerson: () => Promise<void>;
  loadLobby: () => Promise<void>;
};

const createLobbyStore = (): E.Effect<
  LobbyStore,
  never,
  LobbyServiceTag | PersonServiceTag | NdoServiceTag
> =>
  E.gen(function* () {
    const lobbyService = yield* LobbyServiceTag;
    const personService = yield* PersonServiceTag;
    const ndoService = yield* NdoServiceTag;

    let ndos = $state<NdoDescriptor[]>([]);
    let groups = $state<GroupDescriptor[]>([]);
    let myPerson = $state<Person | null>(null);
    let isLoading = $state(false);
    let errorMessage = $state<string | null>(null);

    const setters = createLoadingStateSetter(
      (v) => {
        isLoading = v;
      },
      (v) => {
        errorMessage = v;
      }
    );

    async function runOp<A>(effect: E.Effect<A, unknown>): Promise<void> {
      const wrapped = withLoadingState(() => effect)(setters);
      await E.runPromiseExit(wrapped);
    }

    async function loadGroups(): Promise<void> {
      await runOp(lobbyService.getMyGroups().pipe(E.tap((g) => { groups = g; })));
    }

    async function loadNdos(): Promise<void> {
      await runOp(ndoService.getLobbyNdoDescriptors().pipe(E.tap((n) => { ndos = n; })));
    }

    async function loadMyPerson(): Promise<void> {
      const exit = await E.runPromiseExit(
        withLoadingState(() =>
          personService.getMyPersonProfile().pipe(
            E.tap((p) => {
              myPerson = p.person ?? null;
            })
          )
        )(setters)
      );
      if (Exit.isFailure(exit)) {
        myPerson = null;
      }
    }

    async function loadLobby(): Promise<void> {
      // Manage isLoading at the aggregate level — each sub-call uses withLoadingState
      // which would set isLoading=false as soon as it finishes (premature). Instead we
      // bypass per-op loading state and own the flag here across the full Promise.all.
      isLoading = true;
      errorMessage = null;
      try {
        await Promise.all([
          E.runPromiseExit(
            lobbyService.getMyGroups().pipe(E.tap((g) => { groups = g; }))
          ),
          E.runPromiseExit(
            ndoService.getLobbyNdoDescriptors().pipe(E.tap((n) => { ndos = n; }))
          ),
          E.runPromiseExit(
            personService.getMyPersonProfile().pipe(
              E.tap((p) => { myPerson = p.person ?? null; })
            )
          )
        ]);
      } finally {
        isLoading = false;
      }
    }

    return {
      get ndos() {
        return ndos;
      },
      get groups() {
        return groups;
      },
      get myPerson() {
        return myPerson;
      },
      get isLoading() {
        return isLoading;
      },
      get errorMessage() {
        return errorMessage;
      },
      loadGroups,
      loadNdos,
      loadMyPerson,
      loadLobby
    };
  });

export const lobbyStore: LobbyStore = pipe(
  createLobbyStore(),
  E.provide(LobbyStoreServicesResolved),
  E.runSync
);
