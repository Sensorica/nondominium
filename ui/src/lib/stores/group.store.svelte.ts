import { Effect as E, Exit, pipe } from 'effect';
import type { GroupDescriptor, NdoDescriptor, NdoInput } from '@nondominium/shared-types';
import { NdoServiceTag, NdoServiceResolved } from '../services/zomes/ndo.service';
import { LobbyServiceTag, LobbyServiceLive } from '../services/zomes/lobby.service';
import { Layer } from 'effect';

const GROUPS_KEY = 'ndo_groups_v1';

const GroupStoreServicesResolved = Layer.mergeAll(NdoServiceResolved, LobbyServiceLive);

function loadGroups(): GroupDescriptor[] {
  try {
    const raw = localStorage.getItem(GROUPS_KEY);
    return raw ? (JSON.parse(raw) as GroupDescriptor[]) : [];
  } catch {
    return [];
  }
}

export type GroupStore = {
  readonly groupNdos: NdoDescriptor[];
  readonly group: GroupDescriptor | null;
  readonly isLoading: boolean;
  readonly errorMessage: string | null;
  loadGroupData: (groupId: string) => Promise<void>;
  createNdo: (input: NdoInput) => Promise<string | null>;
};

function createGroupStore(): GroupStore {
  let groupNdos = $state<NdoDescriptor[]>([]);
  let group = $state<GroupDescriptor | null>(null);
  let isLoading = $state(false);
  let errorMessage = $state<string | null>(null);
  let currentGroupId = $state<string | null>(null);

  async function loadGroupData(groupId: string): Promise<void> {
    currentGroupId = groupId;
    isLoading = true;
    errorMessage = null;

    const groups = loadGroups();
    group = groups.find((g) => g.id === groupId) ?? null;

    const exit = await E.runPromiseExit(
      pipe(
        E.gen(function* () {
          const ndoService = yield* NdoServiceTag;
          return yield* ndoService.getGroupNdoDescriptors(groupId);
        }),
        E.provide(GroupStoreServicesResolved)
      )
    );

    if (Exit.isSuccess(exit)) {
      groupNdos = exit.value;
    } else {
      errorMessage = 'Failed to load group NDOs.';
    }
    isLoading = false;
  }

  async function createNdo(input: NdoInput): Promise<string | null> {
    if (!currentGroupId) return null;
    const groupId = currentGroupId;

    isLoading = true;
    errorMessage = null;

    const exit = await E.runPromiseExit(
      pipe(
        E.gen(function* () {
          const ndoService = yield* NdoServiceTag;
          return yield* ndoService.createNdo(input, groupId);
        }),
        E.provide(GroupStoreServicesResolved)
      )
    );

    isLoading = false;

    if (Exit.isSuccess(exit)) {
      const { encodeHashToBase64 } = await import('@holochain/client');
      const hashB64 = encodeHashToBase64(exit.value);
      await loadGroupData(groupId);
      return hashB64;
    } else {
      errorMessage = 'Failed to create NDO.';
      return null;
    }
  }

  return {
    get groupNdos() {
      return groupNdos;
    },
    get group() {
      return group;
    },
    get isLoading() {
      return isLoading;
    },
    get errorMessage() {
      return errorMessage;
    },
    loadGroupData,
    createNdo
  };
}

export const groupStore: GroupStore = createGroupStore();
