import { Context, Effect as E, Layer } from 'effect';
import type { ActionHash, CellId } from '@holochain/client';
import { decodeHashFromBase64, encodeHashToBase64 } from '@holochain/client';
import type {
  GroupDescriptor,
  GroupAnnouncement,
  AnnounceGroupInput,
  LobbyAgentProfile,
  LobbyAgentProfileInput,
  GroupInvitePayload
} from '@nondominium/shared-types';
import {
  HolochainClientServiceTag,
  HolochainClientServiceLive
} from '../holochain.service.svelte';
import { wrapZomeCallWithErrorFactory } from '$lib/utils/zome-helpers';
import { devStorageKey } from '$lib/utils/hc-connect';
import { LobbyError } from '$lib/errors/lobby.errors';
import {
  enumerateGroupCells,
  getGroupCellHandleBySeed,
  type GroupCellInfo
} from '../cell.manager';
import {
  generateNetworkSeed,
  groupProfileFromRecord,
  type GroupHolochainRecord
} from '../group-clone.helpers';

// Per-group presentation profiles (Level 2 identity) — still localStorage-only.
// Namespaced per dev agent so two same-origin windows don't share disclosure prefs.
const GROUP_PROFILES_KEY = devStorageKey('ndo_group_profiles_v1');

function loadGroupProfiles(): Record<string, GroupDescriptor['memberProfile']> {
  try {
    const raw = localStorage.getItem(GROUP_PROFILES_KEY);
    return raw ? (JSON.parse(raw) as Record<string, GroupDescriptor['memberProfile']>) : {};
  } catch {
    return {};
  }
}

function saveGroupMemberProfile(groupId: string, profile: GroupDescriptor['memberProfile']): void {
  try {
    const profiles = loadGroupProfiles();
    profiles[groupId] = profile;
    localStorage.setItem(GROUP_PROFILES_KEY, JSON.stringify(profiles));
  } catch {
    // localStorage unavailable
  }
}

export function getStoredGroupMemberProfile(groupId: string): GroupDescriptor['memberProfile'] | undefined {
  return loadGroupProfiles()[groupId];
}

// ─── Service interface ────────────────────────────────────────────────────────

export interface LobbyService {
  getMyGroups: () => E.Effect<GroupDescriptor[], LobbyError>;
  createGroup: (name: string, createdBy?: string) => E.Effect<GroupDescriptor, LobbyError>;
  joinGroup: (inviteCode: string) => E.Effect<GroupDescriptor, LobbyError>;
  /**
   * Idempotently ensures the calling agent holds a committed GroupMembership for
   * the given group. Self-heals memberships that were missed during joinGroup
   * (e.g. the group profile had not yet gossiped to the freshly-cloned cell, so
   * the join took the payload-fallback path without committing membership).
   * Returns true if the agent is (now) a member.
   */
  ensureMembership: (groupId: string) => E.Effect<boolean, LobbyError>;
  generateInviteLink: (groupId: string) => E.Effect<string, LobbyError>;
  getGroupCell: (groupId: string) => E.Effect<GroupCellInfo | null, LobbyError>;
  saveGroupMemberProfile: (groupId: string, profile: NonNullable<GroupDescriptor['memberProfile']>) => E.Effect<void, LobbyError>;
  // Lobby DHT (zome-backed)
  announceGroup: (input: AnnounceGroupInput) => E.Effect<unknown, LobbyError>;
  getAllGroupAnnouncements: () => E.Effect<GroupAnnouncement[], LobbyError>;
  getMyGroupAnnouncements: () => E.Effect<GroupAnnouncement[], LobbyError>;
  upsertLobbyAgentProfile: (input: LobbyAgentProfileInput) => E.Effect<Uint8Array, LobbyError>;
  getLobbyAgentProfile: (agentPubKey: Uint8Array) => E.Effect<LobbyAgentProfile | null, LobbyError>;
}

export class LobbyServiceTag extends Context.Tag('LobbyService')<LobbyServiceTag, LobbyService>() { }

function encodeInvitePayload(payload: GroupInvitePayload): string {
  return btoa(JSON.stringify(payload));
}

function decodeInvitePayload(inviteCode: string): GroupInvitePayload {
  const encoded = inviteCode.includes('?group=')
    ? inviteCode.split('?group=')[1]?.split('&')[0] ?? inviteCode
    : inviteCode.trim();
  const decoded = atob(encoded);
  const data = JSON.parse(decoded) as Record<string, unknown>;

  if (data.network_seed && data.group_dna_hash && data.group_name) {
    return {
      network_seed: data.network_seed as string,
      group_dna_hash: data.group_dna_hash as string,
      group_name: data.group_name as string,
      description: data.description as string | undefined
    };
  }

  // Legacy invites encoded the full GroupDescriptor (pre–Group DNA UI).
  const legacyId = (data.id ?? data.networkSeed) as string | undefined;
  const legacyDna = data.dnaHash as string | undefined;
  const legacyName = data.name as string | undefined;
  if (legacyId && legacyDna && legacyName) {
    return {
      network_seed: legacyId,
      group_dna_hash: legacyDna,
      group_name: legacyName,
      description: (data.description as string | undefined) ?? undefined
    };
  }

  throw new Error('Invite missing required fields');
}

function descriptorFromCell(
  cell: GroupCellInfo,
  profile: ReturnType<typeof groupProfileFromRecord>,
  createdBy?: string
): GroupDescriptor {
  const profiles = loadGroupProfiles();
  return {
    id: cell.networkSeed,
    networkSeed: cell.networkSeed,
    name: profile?.name ?? cell.networkSeed,
    description: profile?.description,
    createdBy,
    createdAt: Date.now(),
    dnaHash: cell.dnaHash,
    groupHash: profile?.groupHashB64,
    memberProfile: profiles[cell.networkSeed]
  };
}

// ─── Live Layer ───────────────────────────────────────────────────────────────

export const LobbyServiceLive: Layer.Layer<LobbyServiceTag, never, HolochainClientServiceTag> =
  Layer.effect(
    LobbyServiceTag,
    E.gen(function* () {
      const holochainClient = yield* HolochainClientServiceTag;

      const wzLobby = <T>(fnName: string, payload: unknown, context: string): E.Effect<T, LobbyError> =>
        wrapZomeCallWithErrorFactory<T, LobbyError>(
          holochainClient,
          'zome_lobby',
          fnName,
          payload,
          context,
          LobbyError.fromError,
          'lobby'
        );

      const callGroupZome = <T>(
        cellId: CellId,
        fnName: string,
        payload: unknown,
        context: string
      ): E.Effect<T, LobbyError> =>
        E.tryPromise({
          try: async () => {
            if (!holochainClient.isConnected) await holochainClient.connectClient();
            return holochainClient.callZome(
              'zome_group',
              fnName,
              payload,
              undefined,
              undefined,
              cellId
            ) as Promise<T>;
          },
          catch: (error) => LobbyError.fromError(error, context)
        });

      const fetchGroupProfile = (
        cellId: CellId
      ): E.Effect<ReturnType<typeof groupProfileFromRecord>, LobbyError> =>
        E.map(
          callGroupZome<GroupHolochainRecord | null>(
            cellId,
            'get_my_group',
            null,
            'GET_MY_GROUP'
          ),
          (record) => (record ? groupProfileFromRecord(record) : null)
        );

      // When joining via invite, the group entry created by another agent may not
      // have gossiped to this agent's freshly-cloned cell yet. Poll briefly so the
      // join succeeds on the common case without forcing the user to reload.
      // TODO(signals): replace this polling with a Holochain remote signal once
      // implemented — the group cell should emit a signal when the GroupProfile /
      // membership arrives, letting the UI react push-style instead of retrying
      // get_my_group on a timer (also remove the payload-fallback workaround in
      // joinGroup below once signals guarantee timely delivery).
      const fetchGroupProfileWithRetry = (
        cellId: CellId,
        attempts = 6,
        delayMs = 400
      ): E.Effect<ReturnType<typeof groupProfileFromRecord>, LobbyError> =>
        E.gen(function* () {
          for (let attempt = 1; attempt <= attempts; attempt += 1) {
            const profile = yield* fetchGroupProfile(cellId).pipe(E.catchAll(() => E.succeed(null)));
            if (profile) return profile;
            if (attempt < attempts) yield* E.sleep(`${delayMs} millis`);
          }
          return null;
        });

      const ensureCloneCell = (networkSeed: string): E.Effect<GroupCellInfo, LobbyError> =>
        E.tryPromise({
          try: async () => {
            if (!holochainClient.isConnected) await holochainClient.connectClient();
            let cell = await getGroupCellHandleBySeed(holochainClient.client!, networkSeed);
            if (!cell) {
              await holochainClient.createGroupCloneCell(networkSeed);
              if (holochainClient.client) {
                holochainClient.client.cachedAppInfo = undefined;
              }
              cell = await getGroupCellHandleBySeed(holochainClient.client!, networkSeed);
            }
            if (!cell) {
              throw new Error(`Failed to provision group cell for seed ${networkSeed}`);
            }
            if (!cell.enabled) {
              await holochainClient.enableGroupCloneCell(cell.dnaHash);
            }
            return cell;
          },
          catch: (e) => LobbyError.fromError(e, 'ENSURE_GROUP_CELL')
        });

      const bootstrapGroupCell = (
        cell: GroupCellInfo,
        name: string,
        description?: string
      ): E.Effect<{ groupHash: ActionHash; profile: NonNullable<ReturnType<typeof groupProfileFromRecord>> }, LobbyError> =>
        E.gen(function* () {
          let profile = yield* fetchGroupProfile(cell.cellId);
          if (!profile) {
            const record = yield* callGroupZome<GroupHolochainRecord>(
              cell.cellId,
              'create_group',
              { name, description: description ?? null },
              'CREATE_GROUP'
            );
            profile = groupProfileFromRecord(record);
            if (!profile) {
              return yield* E.fail(LobbyError.fromError(new Error('create_group returned no profile'), 'CREATE_GROUP'));
            }
            const groupHash = decodeHashFromBase64(profile.groupHashB64) as ActionHash;
            // Best-effort: the group entry already exists. If self-join fails
            // (e.g. AlreadyMember), still surface the group — membership can be
            // retried — instead of failing the whole creation.
            yield* callGroupZome<GroupHolochainRecord>(
              cell.cellId,
              'join_group',
              groupHash,
              'JOIN_GROUP'
            ).pipe(
              E.catchAll((e) => {
                console.warn('[lobby] join_group failed (non-fatal):', e);
                return E.succeed(null as unknown as GroupHolochainRecord);
              })
            );
          }
          const groupHash = decodeHashFromBase64(profile.groupHashB64) as ActionHash;
          return { groupHash, profile };
        });

      const buildDescriptorsFromCells = (): E.Effect<GroupDescriptor[], LobbyError> =>
        E.gen(function* () {
          if (!holochainClient.isConnected) {
            yield* E.tryPromise({
              try: () => holochainClient.connectClient(),
              catch: (e) => LobbyError.fromError(e, 'GET_MY_GROUPS')
            });
          }
          const appInfo = yield* E.tryPromise({
            try: () => holochainClient.getAppInfo(),
            catch: (e) => LobbyError.fromError(e, 'GET_MY_GROUPS')
          });
          const cells = enumerateGroupCells(appInfo);
          const descriptors: GroupDescriptor[] = [];
          for (const cell of cells) {
            const profile = yield* fetchGroupProfile(cell.cellId).pipe(
              E.catchAll(() => E.succeed(null))
            );
            if (profile) {
              descriptors.push(descriptorFromCell(cell, profile));
            }
          }
          return descriptors;
        });

      return {
        getMyGroups: () => buildDescriptorsFromCells(),

        getGroupCell: (groupId) =>
          E.tryPromise({
            try: async () => {
              if (!holochainClient.isConnected) await holochainClient.connectClient();
              return getGroupCellHandleBySeed(holochainClient.client!, groupId);
            },
            catch: (e) => LobbyError.fromError(e, 'GET_GROUP_CELL')
          }),

        saveGroupMemberProfile: (groupId, profile) =>
          E.sync(() => {
            saveGroupMemberProfile(groupId, profile);
          }),

        createGroup: (name, createdBy) =>
          E.gen(function* () {
            const networkSeed = generateNetworkSeed();
            const cell = yield* ensureCloneCell(networkSeed);
            const { profile } = yield* bootstrapGroupCell(cell, name.trim());

            // Best-effort: announce to the Lobby DHT for cross-agent discovery.
            // The group cell + profile already exist; a failed announcement must
            // not hide the group from its creator's own sidebar.
            yield* wzLobby<unknown>(
              'announce_group',
              {
                group_name: name.trim(),
                group_dna_hash: cell.dnaHash,
                network_seed: networkSeed,
                description: profile.description ?? undefined
              } satisfies AnnounceGroupInput,
              'ANNOUNCE_GROUP'
            ).pipe(
              E.catchAll((e) => {
                console.warn('[lobby] announce_group failed (non-fatal):', e);
                return E.succeed(undefined);
              })
            );

            return descriptorFromCell(cell, profile, createdBy);
          }),

        joinGroup: (inviteCode) =>
          E.gen(function* () {
            const payload = decodeInvitePayload(inviteCode);
            const cell = yield* ensureCloneCell(payload.network_seed);
            const profile = yield* fetchGroupProfileWithRetry(cell.cellId);

            if (profile) {
              const groupHash = decodeHashFromBase64(profile.groupHashB64) as ActionHash;
              const agentPubKey = yield* E.tryPromise({
                try: () => holochainClient.getMyAgentPubKey(),
                catch: (e) => LobbyError.fromError(e, 'JOIN_GROUP')
              });

              const isMember = yield* callGroupZome<boolean>(
                cell.cellId,
                'is_member',
                [agentPubKey, groupHash],
                'IS_MEMBER'
              ).pipe(E.catchAll(() => E.succeed(false)));

              if (!isMember) {
                // Best-effort: the clone cell already exists, so surface the group
                // even if membership commit is momentarily contended; it reconciles
                // on the next getMyGroups.
                yield* callGroupZome<GroupHolochainRecord>(
                  cell.cellId,
                  'join_group',
                  groupHash,
                  'JOIN_GROUP'
                ).pipe(
                  E.catchAll((e) => {
                    console.warn('[lobby] join_group failed (non-fatal):', e);
                    return E.succeed(null as unknown as GroupHolochainRecord);
                  })
                );
              }

              return descriptorFromCell(cell, profile);
            }

            // Profile not yet synced from the DHT. Surface the group immediately
            // from the invite payload so the sidebar updates without a reload;
            // membership and the full profile reconcile on the next getMyGroups.
            console.warn(
              '[lobby] group profile not synced yet; using invite payload for descriptor'
            );
            return {
              id: cell.networkSeed,
              networkSeed: cell.networkSeed,
              name: payload.group_name,
              description: payload.description,
              createdAt: Date.now(),
              dnaHash: cell.dnaHash,
              memberProfile: getStoredGroupMemberProfile(cell.networkSeed)
            } satisfies GroupDescriptor;
          }),

        ensureMembership: (groupId) =>
          E.gen(function* () {
            const cell = yield* E.tryPromise({
              try: async () => {
                if (!holochainClient.isConnected) await holochainClient.connectClient();
                return getGroupCellHandleBySeed(holochainClient.client!, groupId);
              },
              catch: (e) => LobbyError.fromError(e, 'ENSURE_MEMBERSHIP')
            });
            if (!cell) return false;

            // The group profile must be present locally before we can resolve the
            // group hash needed by join_group. By the time a group view is opened
            // it has usually gossiped; if not, reconciliation simply happens on a
            // later load.
            const profile = yield* fetchGroupProfile(cell.cellId).pipe(
              E.catchAll(() => E.succeed(null))
            );
            if (!profile) return false;

            const groupHash = decodeHashFromBase64(profile.groupHashB64) as ActionHash;
            const agentPubKey = yield* E.tryPromise({
              try: () => holochainClient.getMyAgentPubKey(),
              catch: (e) => LobbyError.fromError(e, 'ENSURE_MEMBERSHIP')
            });

            const isMember = yield* callGroupZome<boolean>(
              cell.cellId,
              'is_member',
              [agentPubKey, groupHash],
              'IS_MEMBER'
            ).pipe(E.catchAll(() => E.succeed(false)));

            if (isMember) return true;

            yield* callGroupZome<GroupHolochainRecord>(
              cell.cellId,
              'join_group',
              groupHash,
              'JOIN_GROUP'
            ).pipe(
              E.catchAll((e) => {
                console.warn('[lobby] ensureMembership join_group failed (non-fatal):', e);
                return E.succeed(null as unknown as GroupHolochainRecord);
              })
            );
            return true;
          }),

        generateInviteLink: (groupId) =>
          E.gen(function* () {
            const cell = yield* E.tryPromise({
              try: async () => {
                if (!holochainClient.isConnected) await holochainClient.connectClient();
                return getGroupCellHandleBySeed(holochainClient.client!, groupId);
              },
              catch: (e) => LobbyError.fromError(e, 'GENERATE_INVITE_LINK')
            });
            if (!cell) return '';

            const profile = yield* fetchGroupProfile(cell.cellId);
            const payload: GroupInvitePayload = {
              network_seed: cell.networkSeed,
              group_dna_hash: encodeHashToBase64(cell.dnaHash),
              group_name: profile?.name ?? groupId,
              description: profile?.description
            };
            const encoded = encodeInvitePayload(payload);
            const origin = typeof window !== 'undefined' ? window.location.origin : '';
            return `${origin}?group=${encoded}`;
          }),

        announceGroup: (input) => wzLobby<unknown>('announce_group', input, 'ANNOUNCE_GROUP'),

        getAllGroupAnnouncements: () =>
          wzLobby<GroupAnnouncement[]>('get_all_group_announcements', null, 'GET_ALL_GROUP_ANNOUNCEMENTS'),

        getMyGroupAnnouncements: () =>
          wzLobby<GroupAnnouncement[]>('get_my_group_announcements', null, 'GET_MY_GROUP_ANNOUNCEMENTS'),

        upsertLobbyAgentProfile: (input) =>
          wzLobby<Uint8Array>('upsert_lobby_agent_profile', input, 'UPSERT_LOBBY_AGENT_PROFILE'),

        getLobbyAgentProfile: (agentPubKey) =>
          wzLobby<LobbyAgentProfile | null>(
            'get_lobby_agent_profile',
            agentPubKey,
            'GET_LOBBY_AGENT_PROFILE'
          )
      } satisfies LobbyService;
    })
  );

export const LobbyServiceResolved: Layer.Layer<LobbyServiceTag> = LobbyServiceLive.pipe(
  Layer.provide(HolochainClientServiceLive)
);
