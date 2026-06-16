import { Effect as E, Exit, pipe } from 'effect';
import type { GroupDescriptor, NdoDescriptor, NdoInput } from '@nondominium/shared-types';
import { NdoServiceTag, NdoServiceResolved } from '../services/zomes/ndo.service';
import { LobbyServiceTag, LobbyServiceResolved } from '../services/zomes/lobby.service';
import { GroupServiceTag, GroupServiceResolved } from '../services/zomes/group.service';
import { Layer } from 'effect';

const GroupStoreServicesResolved = Layer.mergeAll(
  NdoServiceResolved,
  LobbyServiceResolved,
  GroupServiceResolved
);

export type GroupStore = {
  readonly groupNdos: NdoDescriptor[];
  readonly group: GroupDescriptor | null;
  readonly members: { id: string; name: string; role?: string }[];
  readonly isLoading: boolean;
  readonly errorMessage: string | null;
  loadGroupData: (groupId: string) => Promise<void>;
  createNdo: (input: NdoInput) => Promise<string | null>;
  associateNdoWithGroup: (ndoHashB64: string, targetGroupId: string) => Promise<void>;
};

function createGroupStore(): GroupStore {
  let groupNdos = $state<NdoDescriptor[]>([]);
  let group = $state<GroupDescriptor | null>(null);
  let members = $state<{ id: string; name: string; role?: string }[]>([]);
  let isLoading = $state(false);
  let errorMessage = $state<string | null>(null);
  let currentGroupId = $state<string | null>(null);

  async function loadGroupData(groupId: string): Promise<void> {
    currentGroupId = groupId;
    isLoading = true;
    errorMessage = null;

    const exit = await E.runPromiseExit(
      pipe(
        E.gen(function* () {
          const lobbyService = yield* LobbyServiceTag;
          const ndoService = yield* NdoServiceTag;
          const groupService = yield* GroupServiceTag;

          const groups = yield* lobbyService.getMyGroups();
          const found = groups.find((g) => g.id === groupId) ?? null;
          const ndos = yield* ndoService.getGroupNdoDescriptors(groupId);

          let memberList: { id: string; name: string; role?: string }[] = [];
          const cell = yield* lobbyService.getGroupCell(groupId).pipe(
            E.catchAll(() => E.succeed(null))
          );
          if (cell) {
            memberList = yield* groupService.getMembers(cell.cellId).pipe(
              E.catchAll(() => E.succeed([]))
            );
          }

          return { found, ndos, memberList };
        }),
        E.provide(GroupStoreServicesResolved)
      )
    );

    if (Exit.isSuccess(exit)) {
      group = exit.value.found;
      groupNdos = exit.value.ndos;
      members = exit.value.memberList;
    } else {
      errorMessage = 'Failed to load group data.';
      group = null;
      groupNdos = [];
      members = [];
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
    }
    errorMessage = 'Failed to create NDO.';
    return null;
  }

  async function associateNdoWithGroup(ndoHashB64: string, targetGroupId: string): Promise<void> {
    const exit = await E.runPromiseExit(
      pipe(
        E.gen(function* () {
          const lobbyService = yield* LobbyServiceTag;
          const ndoService = yield* NdoServiceTag;
          const groupService = yield* GroupServiceTag;

          const cell = yield* lobbyService.getGroupCell(targetGroupId);
          if (!cell) {
            return yield* E.fail(new Error('Group cell not found'));
          }

          const groups = yield* lobbyService.getMyGroups();
          const g = groups.find((x) => x.id === targetGroupId);
          if (!g?.groupHash) {
            return yield* E.fail(new Error('Group profile hash not available'));
          }

          yield* groupService.createSoftLink(
            cell.cellId,
            g.groupHash,
            ndoHashB64,
            'Associated from NDO view'
          );
        }),
        E.provide(GroupStoreServicesResolved)
      )
    );

    if (Exit.isFailure(exit)) {
      errorMessage = 'Failed to associate NDO with group.';
    } else if (currentGroupId === targetGroupId) {
      await loadGroupData(targetGroupId);
    }
  }

  return {
    get groupNdos() {
      return groupNdos;
    },
    get group() {
      return group;
    },
    get members() {
      return members;
    },
    get isLoading() {
      return isLoading;
    },
    get errorMessage() {
      return errorMessage;
    },
    loadGroupData,
    createNdo,
    associateNdoWithGroup
  };
}

export const groupStore: GroupStore = createGroupStore();
