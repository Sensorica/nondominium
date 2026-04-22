import { Effect as E, Exit, Layer, pipe } from 'effect';
import type {
  GroupDescriptor,
  LifecycleStage,
  NdoDescriptor,
  NdoOutput,
  Person,
  PropertyRegime,
  ResourceNature
} from '@nondominium/shared-types';
import { LobbyServiceTag, LobbyServiceLive } from '../services/zomes/lobby.service';
import { PersonServiceTag, PersonServiceResolved } from '../services/zomes/person.service';
import { NdoServiceTag, NdoServiceResolved } from '../services/zomes/ndo.service';
import { withLoadingState, createLoadingStateSetter } from '$lib/utils/store-helpers/core';

export interface ActiveFilters {
  stages: LifecycleStage[];
  natures: ResourceNature[];
  regimes: PropertyRegime[];
}

/** Lobby store: resolved zome layers only (no duplicate `HolochainClientServiceTag`). */
const LobbyStoreServicesResolved = Layer.mergeAll(
  LobbyServiceLive,
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

    function applyFilters(all: NdoDescriptor[], filters: ActiveFilters): NdoDescriptor[] {
      const { stages, natures, regimes } = filters;
      const noFilter = stages.length === 0 && natures.length === 0 && regimes.length === 0;
      if (noFilter) return all;
      return all.filter((d) => {
        const stageOk = stages.length === 0 || (d.lifecycle_stage !== null && stages.includes(d.lifecycle_stage as LifecycleStage));
        const natureOk = natures.length === 0 || (d.resource_nature !== null && natures.includes(d.resource_nature as ResourceNature));
        const regimeOk = regimes.length === 0 || (d.property_regime !== null && regimes.includes(d.property_regime as PropertyRegime));
        return stageOk && natureOk && regimeOk;
      });
    }

    function setFilters(partial: Partial<ActiveFilters>): void {
      activeFilters = { ...activeFilters, ...partial };
    }

    function clearFilters(): void {
      activeFilters = { stages: [], natures: [], regimes: [] };
    }

    async function createGroup(name: string, createdBy?: string): Promise<GroupDescriptor | null> {
      const exit = await E.runPromiseExit(
        lobbyService.createGroup(name, createdBy).pipe(
          E.tap((g) => { groups = [...groups, g]; })
        )
      );
      return Exit.isSuccess(exit) ? exit.value : null;
    }

    async function joinGroup(inviteCode: string): Promise<GroupDescriptor | null> {
      const exit = await E.runPromiseExit(
        lobbyService.joinGroup(inviteCode).pipe(
          E.tap((g) => {
            if (!groups.some((existing) => existing.id === g.id)) {
              groups = [...groups, g];
            }
          })
        )
      );
      return Exit.isSuccess(exit) ? exit.value : null;
    }

    async function loadLobby(): Promise<void> {
      isLoading = true;
      errorMessage = null;
      try {
        const [groupsExit, ndosExit, personExit] = await Promise.all([
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
        const failed = [groupsExit, ndosExit, personExit].filter(Exit.isFailure);
        if (failed.length > 0) {
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
      joinGroup
    };
  });

export const lobbyStore: LobbyStore = pipe(
  createLobbyStore(),
  E.provide(LobbyStoreServicesResolved),
  E.runSync
);
