import { Effect as E, Either, Exit, pipe } from 'effect';
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
  /**
   * Silently re-fetches the currently-open group (members + NDOs) without
   * toggling the loading state or clearing data on transient failure. Used by
   * the pull-based reactivity layer (tab focus + gentle poll) so newly-gossiped
   * items from other members appear without a manual reload.
   */
  refreshCurrentGroup: () => Promise<void>;
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

  async function loadGroupData(groupId: string, opts?: { silent?: boolean }): Promise<void> {
    currentGroupId = groupId;
    const silent = opts?.silent ?? false;
    if (!silent) {
      isLoading = true;
    }
    errorMessage = null;

    // Each fetch is captured as an Either so a transient failure of one part
    // (e.g. getMembers while the DHT is gossiping) does not look like a
    // successful empty result. On a silent refresh we only overwrite a field
    // when its own fetch genuinely succeeded — otherwise we keep what is on
    // screen. On a full load we still clear and surface the error.
    const exit = await E.runPromiseExit(
      pipe(
        E.gen(function* () {
          const lobbyService = yield* LobbyServiceTag;
          const ndoService = yield* NdoServiceTag;
          const groupService = yield* GroupServiceTag;

          const groupsRes = yield* E.either(lobbyService.getMyGroups());
          const ndosRes = yield* E.either(ndoService.getGroupNdoDescriptors(groupId));

          const cell = yield* lobbyService.getGroupCell(groupId).pipe(
            E.catchAll(() => E.succeed(null))
          );

          // members default to "not fetched" (Left) when there is no cell yet.
          let membersRes: Either.Either<{ id: string; name: string; role?: string }[], unknown> =
            Either.left(undefined);
          if (cell) {
            // Self-heal membership only on a full (non-silent) load: if this agent
            // joined via an invite but the join missed (group profile had not
            // gossiped yet, so joinGroup took the payload-fallback path without
            // committing membership), commit it now so the agent appears in the
            // group's member list. Skipped on silent polls — it is idempotent but
            // a profile fetch + is_member check every interval is wasteful.
            if (!silent) {
              yield* lobbyService.ensureMembership(groupId).pipe(
                E.catchAll(() => E.succeed(false))
              );
            }
            membersRes = yield* E.either(groupService.getMembers(cell.cellId));
          }

          return { groupsRes, ndosRes, hasCell: cell !== null, membersRes };
        }),
        E.provide(GroupStoreServicesResolved)
      )
    );

    if (Exit.isSuccess(exit)) {
      const { groupsRes, ndosRes, hasCell, membersRes } = exit.value;
      let anyFailed = false;

      if (Either.isRight(groupsRes)) {
        group = groupsRes.right.find((g) => g.id === groupId) ?? null;
      } else {
        anyFailed = true;
        if (!silent) group = null;
      }

      if (Either.isRight(ndosRes)) {
        groupNdos = ndosRes.right;
      } else {
        anyFailed = true;
        if (!silent) groupNdos = [];
      }

      // Only treat members as authoritative when a cell existed and the fetch
      // succeeded. A missing cell or a failed fetch must not blank an existing
      // member list during a silent poll.
      if (hasCell && Either.isRight(membersRes)) {
        members = membersRes.right;
      } else {
        if (hasCell) anyFailed = true;
        if (!silent) members = [];
      }

      if (anyFailed && !silent) {
        errorMessage = 'Failed to load group data.';
      }
    } else if (!silent) {
      // On a silent refresh we keep whatever is already on screen rather than
      // clearing it for a transient fetch failure.
      errorMessage = 'Failed to load group data.';
      group = null;
      groupNdos = [];
      members = [];
    }
    if (!silent) {
      isLoading = false;
    }
  }

  async function refreshCurrentGroup(): Promise<void> {
    if (!currentGroupId) return;
    await loadGroupData(currentGroupId, { silent: true });
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
    // Writes an NdoAnchor in the target group, copying the NDO's clone
    // coordinates from an existing anchor. Under model A the anchor is the only
    // pointer the lobby and group read paths follow, so a SoftLink here would
    // report success and leave the NDO invisible in the target group.
    const exit = await E.runPromiseExit(
      pipe(
        E.gen(function* () {
          const ndoService = yield* NdoServiceTag;
          yield* ndoService.associateNdoWithGroup(ndoHashB64, targetGroupId);
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
    refreshCurrentGroup,
    createNdo,
    associateNdoWithGroup
  };
}

export const groupStore: GroupStore = createGroupStore();
