import { Cause, Effect as E, Exit, Layer, pipe } from 'effect';
import type { GroupDescriptor, NdoDescriptor, NdoOutput, Person } from '@nondominium/shared-types';
import { LobbyServiceTag, LobbyServiceResolved } from '../services/zomes/lobby.service';
import { PersonServiceTag, PersonServiceResolved } from '../services/zomes/person.service';
import { NdoServiceTag, NdoServiceResolved } from '../services/zomes/ndo.service';
import { withLoadingState, createLoadingStateSetter } from '$lib/utils/store-helpers/core';
import { applyFilters, type ActiveFilters } from '$lib/domain/ndo-filters';

export type { ActiveFilters };

const LobbyStoreServicesResolved = Layer.mergeAll(
  LobbyServiceResolved,
  NdoServiceResolved,
  PersonServiceResolved
);

export type LobbyStore = {
  readonly ndos: NdoDescriptor[];
  readonly filteredNdos: NdoDescriptor[];
  readonly groups: GroupDescriptor[];
  readonly myPerson: Person | null;
  readonly isLoading: boolean;
  readonly errorMessage: string | null;
  readonly activeFilters: ActiveFilters;
  setFilters: (filters: Partial<ActiveFilters>) => void;
  clearFilters: () => void;
  loadGroups: () => Promise<void>;
  loadNdos: () => Promise<void>;
  loadMyPerson: () => Promise<void>;
  loadLobby: () => Promise<void>;
  createGroup: (name: string, createdBy?: string) => Promise<GroupDescriptor | null>;
  joinGroup: (inviteCode: string) => Promise<GroupDescriptor | null>;
  generateInviteLink: (groupId: string) => Promise<string | null>;
  saveGroupMemberProfile: (
    groupId: string,
    profile: NonNullable<GroupDescriptor['memberProfile']>
  ) => Promise<void>;
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
    let activeFilters = $state<ActiveFilters>({ stages: [], natures: [], regimes: [] });

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
      await runOp(lobbyService.getMyGroups().pipe(E.tap((g) => E.sync(() => { groups = g; }))));
    }

    async function loadNdos(): Promise<void> {
      await runOp(ndoService.getLobbyNdoDescriptors().pipe(E.tap((n) => E.sync(() => { ndos = n; }))));
    }

    async function loadMyPerson(): Promise<void> {
      const exit = await E.runPromiseExit(
        withLoadingState(() =>
          personService.getMyPersonProfile().pipe(
            E.tap((p) =>
              E.sync(() => {
                myPerson = p.person ?? null;
              })
            )
          )
        )(setters)
      );
      if (Exit.isFailure(exit)) {
        myPerson = null;
      }
    }

    function setFilters(partial: Partial<ActiveFilters>): void {
      activeFilters = { ...activeFilters, ...partial };
    }

    function clearFilters(): void {
      activeFilters = { stages: [], natures: [], regimes: [] };
    }

    async function createGroup(name: string, createdBy?: string): Promise<GroupDescriptor | null> {
      errorMessage = null;
      const exit = await E.runPromiseExit(
        lobbyService.createGroup(name, createdBy).pipe(
          E.tap((g) => E.sync(() => { groups = [...groups, g]; }))
        )
      );
      if (Exit.isFailure(exit)) {
        console.error('createGroup failed:', Cause.pretty(exit.cause));
        errorMessage = `Group creation failed: ${Cause.pretty(exit.cause)}`;
        return null;
      }
      return exit.value;
    }

    async function joinGroup(inviteCode: string): Promise<GroupDescriptor | null> {
      errorMessage = null;
      const exit = await E.runPromiseExit(
        lobbyService.joinGroup(inviteCode).pipe(
          E.tap((g) =>
            E.sync(() => {
              if (!groups.some((existing) => existing.id === g.id)) {
                groups = [...groups, g];
              }
            })
          )
        )
      );
      if (Exit.isFailure(exit)) {
        console.error('joinGroup failed:', Cause.pretty(exit.cause));
        errorMessage = `Join group failed: ${Cause.pretty(exit.cause)}`;
        return null;
      }
      return exit.value;
    }

    async function generateInviteLink(groupId: string): Promise<string | null> {
      const exit = await E.runPromiseExit(lobbyService.generateInviteLink(groupId));
      return Exit.isSuccess(exit) ? exit.value : null;
    }

    async function saveGroupMemberProfile(
      groupId: string,
      profile: NonNullable<GroupDescriptor['memberProfile']>
    ): Promise<void> {
      await E.runPromiseExit(lobbyService.saveGroupMemberProfile(groupId, profile));
      const idx = groups.findIndex((g) => g.id === groupId);
      if (idx >= 0) {
        groups = groups.map((g, i) => (i === idx ? { ...g, memberProfile: profile } : g));
      }
    }

    async function loadLobby(): Promise<void> {
      isLoading = true;
      errorMessage = null;
      try {
        const [groupsExit, ndosExit, personExit] = await Promise.all([
          E.runPromiseExit(
            lobbyService.getMyGroups().pipe(E.tap((g) => E.sync(() => { groups = g; })))
          ),
          E.runPromiseExit(
            ndoService.getLobbyNdoDescriptors().pipe(E.tap((n) => E.sync(() => { ndos = n; })))
          ),
          E.runPromiseExit(
            personService.getMyPersonProfile().pipe(
              E.tap((p) => E.sync(() => { myPerson = p.person ?? null; }))
            )
          )
        ]);
        const hasFailed = [groupsExit, ndosExit, personExit].some((e) => e._tag === 'Failure');
        if (hasFailed) {
          errorMessage = 'Failed to load lobby data. Please try again.';
        }
      } finally {
        isLoading = false;
      }
    }

    return {
      get ndos() {
        return ndos;
      },
      get filteredNdos() {
        return applyFilters(ndos, activeFilters);
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
      get activeFilters() {
        return activeFilters;
      },
      setFilters,
      clearFilters,
      loadGroups,
      loadNdos,
      loadMyPerson,
      loadLobby,
      createGroup,
      joinGroup,
      generateInviteLink,
      saveGroupMemberProfile
    };
  });

export const lobbyStore: LobbyStore = pipe(
  createLobbyStore(),
  E.provide(LobbyStoreServicesResolved),
  E.runSync
);
