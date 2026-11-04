import { Effect as E } from 'effect';
import { decodeHashFromBase64, type ActionHash, type AgentPubKey, type CellId } from '@holochain/client';
import type { GroupDescriptor } from '@nondominium/shared-types';
import { LobbyError } from '$lib/errors/lobby.errors';
import { MOSS_GROUP_ID } from '$lib/moss/group-cell';
import { groupProfileFromRecord, type GroupCellInfo, type GroupHolochainRecord } from '../group-clone.helpers';
import type { LobbyService } from './lobby.service';

/**
 * What the Moss group context needs from the outside, injected so the whole
 * service runs in a unit test with a mocked WeaveClient.
 */
export interface MossLobbyDeps {
  /** The tool instance's provisioned `group` cell. */
  getGroupCell(): Promise<GroupCellInfo | null>;
  callGroupZome<T>(cellId: CellId, fnName: string, payload: unknown): Promise<T>;
  myAgentPubKey(): Promise<AgentPubKey>;
  /** The Moss group's own name, used when the first member creates the profile. */
  mossGroupName(): Promise<string>;
  /** Whether this agent installed the tool into the Moss group. */
  isToolInstaller(): Promise<boolean>;
  sleep(ms: number): Promise<void>;
}

type GroupProfile = NonNullable<ReturnType<typeof groupProfileFromRecord>>;

/** How long a member waits for the installer's GroupProfile to gossip into its cell. */
const PROFILE_WAIT_ATTEMPTS = 20;
const PROFILE_WAIT_MS = 1500;

const managedByMoss = (context: string) =>
  E.fail(LobbyError.create('Groups are managed by Moss inside Moss.', context));

/**
 * The group context inside Moss. The Moss group is the federation layer and
 * the tool instance's `group` cell is the one Nondominium group of that Moss
 * group, joined automatically: no Lobby, no invite codes, no clone per group.
 * Everything below the group (NDO anchors, NDO clones) is the standalone code.
 */
export function createMossLobbyService(deps: MossLobbyDeps): LobbyService {
  const lift = <T>(context: string, run: () => Promise<T>): E.Effect<T, LobbyError> =>
    E.tryPromise({ try: run, catch: (error) => LobbyError.fromError(error, context) });

  const fetchProfile = (cell: GroupCellInfo): Promise<GroupProfile | null> =>
    deps
      .callGroupZome<GroupHolochainRecord | null>(cell.cellId, 'get_my_group', null)
      .then((record) => (record ? groupProfileFromRecord(record) : null));

  const joinGroup = async (cell: GroupCellInfo, profile: GroupProfile): Promise<void> => {
    const groupHash = decodeHashFromBase64(profile.groupHashB64) as ActionHash;
    const me = await deps.myAgentPubKey();
    const isMember = await deps
      .callGroupZome<boolean>(cell.cellId, 'is_member', [me, groupHash])
      .catch(() => false);
    if (isMember) return;
    // Non-fatal: membership self-heals through ensureMembership on a later load.
    await deps.callGroupZome(cell.cellId, 'join_group', groupHash).catch((error) => {
      console.warn('[moss-lobby] join_group failed (non-fatal):', error);
    });
  };

  /**
   * The group profile and cell. The installer creates the profile when it is
   * missing; every other member waits for it to gossip, then joins. Null when
   * a member is still waiting: the caller shows no group yet and a later load
   * resolves it.
   */
  const resolveGroup = async (): Promise<{ cell: GroupCellInfo; profile: GroupProfile } | null> => {
    const cell = await deps.getGroupCell();
    if (!cell) throw new Error('The Moss tool instance has no group cell.');

    let profile = await fetchProfile(cell).catch(() => null);
    if (!profile && (await deps.isToolInstaller())) {
      const record = await deps.callGroupZome<GroupHolochainRecord>(cell.cellId, 'create_group', {
        name: await deps.mossGroupName(),
        description: null
      });
      profile = groupProfileFromRecord(record);
    }
    for (let attempt = 1; !profile && attempt < PROFILE_WAIT_ATTEMPTS; attempt += 1) {
      await deps.sleep(PROFILE_WAIT_MS);
      profile = await fetchProfile(cell).catch(() => null);
    }
    if (!profile) return null;
    await joinGroup(cell, profile);
    return { cell, profile };
  };

  // The stores and the NDO service all ask for the group at once on load. Each
  // resolution may commit to the source chain (create_group, join_group), and
  // concurrent commits fail with "source chain head has moved", so one
  // resolution runs at a time and a successful one is kept.
  let resolved: { cell: GroupCellInfo; profile: GroupProfile } | null = null;
  let inFlight: Promise<{ cell: GroupCellInfo; profile: GroupProfile } | null> | null = null;
  const resolveOnce = () => {
    if (resolved) return Promise.resolve(resolved);
    inFlight ??= resolveGroup()
      .then((result) => {
        resolved = result;
        return result;
      })
      .finally(() => {
        inFlight = null;
      });
    return inFlight;
  };

  const descriptor = (cell: GroupCellInfo, profile: GroupProfile): GroupDescriptor => ({
    id: MOSS_GROUP_ID,
    networkSeed: cell.networkSeed,
    name: profile.name,
    description: profile.description,
    createdAt: Date.now(),
    dnaHash: cell.dnaHash,
    groupHash: profile.groupHashB64
  });

  const forMossGroup = <T>(groupId: string, none: T, run: () => Promise<T>, context: string) =>
    groupId === MOSS_GROUP_ID ? lift(context, run) : E.succeed(none);

  return {
    getMyGroups: () =>
      lift('GET_MY_GROUPS', async () => {
        const group = await resolveOnce();
        return group ? [descriptor(group.cell, group.profile)] : [];
      }),

    getGroupCell: (groupId) =>
      forMossGroup<GroupCellInfo | null>(groupId, null, () => deps.getGroupCell(), 'GET_GROUP_CELL'),

    getGroupHash: (groupId) =>
      forMossGroup<string | null>(
        groupId,
        null,
        async () => {
          if (resolved) return resolved.profile.groupHashB64;
          const cell = await deps.getGroupCell();
          if (!cell) return null;
          return (await fetchProfile(cell).catch(() => null))?.groupHashB64 ?? null;
        },
        'GET_GROUP_HASH'
      ),

    ensureMembership: (groupId) =>
      forMossGroup<boolean>(
        groupId,
        false,
        // Resolving the group includes joining it, so membership is ensured by the same pass.
        async () => (await resolveOnce()) !== null,
        'ENSURE_MEMBERSHIP'
      ),

    // Moss owns group creation, invitations and the member profile.
    createGroup: () => managedByMoss('CREATE_GROUP'),
    joinGroup: () => managedByMoss('JOIN_GROUP'),
    generateInviteLink: () => managedByMoss('GENERATE_INVITE_LINK'),
    saveGroupMemberProfile: () => E.void,

    // The Lobby DHT does not exist as a shared network inside Moss: every tool
    // instance is its own network, so there is nothing to announce to or read.
    announceGroup: () => E.succeed(undefined),
    getAllGroupAnnouncements: () => E.succeed([]),
    getMyGroupAnnouncements: () => E.succeed([]),
    upsertLobbyAgentProfile: () => E.succeed(new Uint8Array()),
    getLobbyAgentProfile: () => E.succeed(null)
  };
}
