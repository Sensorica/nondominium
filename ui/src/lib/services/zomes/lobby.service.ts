import { Context, Effect as E, Layer } from 'effect';
import type {
  GroupDescriptor,
  NdoAnnouncement,
  AnnounceNdoInput,
  LobbyAgentProfile,
  LobbyAgentProfileInput
} from '@nondominium/shared-types';
import { HolochainClientServiceTag, HolochainClientServiceLive } from '../holochain.service.svelte';
import { wrapZomeCallWithErrorFactory } from '$lib/utils/zome-helpers';
import { LobbyError } from '$lib/errors/lobby.errors';

// ─── localStorage group helpers ───────────────────────────────────────────────

const GROUPS_KEY = 'ndo_groups_v1';

function loadGroupsFromStorage(): GroupDescriptor[] {
  try {
    const raw = localStorage.getItem(GROUPS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as GroupDescriptor[];
  } catch {
    return [];
  }
}

function saveGroupsToStorage(groups: GroupDescriptor[]): void {
  try {
    localStorage.setItem(GROUPS_KEY, JSON.stringify(groups));
  } catch {
    // localStorage not available
  }
}

function generateId(): string {
  return `grp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// ─── Service interface ────────────────────────────────────────────────────────

export interface LobbyService {
  // Groups (localStorage-backed in MVP; Group DNA is post-MVP)
  getMyGroups: () => E.Effect<GroupDescriptor[], LobbyError>;
  createGroup: (name: string, createdBy?: string) => E.Effect<GroupDescriptor, LobbyError>;
  joinGroup: (inviteCode: string) => E.Effect<GroupDescriptor, LobbyError>;
  generateInviteLink: (groupId: string) => E.Effect<string, LobbyError>;
  // Lobby DHT (zome-backed)
  getAllNdoDescriptors: () => E.Effect<NdoAnnouncement[], LobbyError>;
  announceNdo: (input: AnnounceNdoInput) => E.Effect<Uint8Array, LobbyError>;
  upsertLobbyAgentProfile: (input: LobbyAgentProfileInput) => E.Effect<Uint8Array, LobbyError>;
  getLobbyAgentProfile: (agentPubKey: Uint8Array) => E.Effect<LobbyAgentProfile | null, LobbyError>;
}

// ─── Context Tag ─────────────────────────────────────────────────────────────

export class LobbyServiceTag extends Context.Tag('LobbyService')<LobbyServiceTag, LobbyService>() {}

// ─── Live Layer ───────────────────────────────────────────────────────────────

export const LobbyServiceLive: Layer.Layer<LobbyServiceTag, never, HolochainClientServiceTag> =
  Layer.effect(
    LobbyServiceTag,
    E.gen(function* () {
      const holochainClient = yield* HolochainClientServiceTag;

      const wz = <T>(fnName: string, payload: unknown, context: string): E.Effect<T, LobbyError> =>
        wrapZomeCallWithErrorFactory<T, LobbyError>(
          holochainClient,
          'zome_lobby',
          fnName,
          payload,
          context,
          LobbyError.fromError
        );

      return {
        // Groups — localStorage-backed (Group DNA is post-MVP)
        getMyGroups: () => E.sync(loadGroupsFromStorage) as E.Effect<GroupDescriptor[], LobbyError>,

        createGroup: (name, createdBy) =>
          E.sync(() => {
            const groups = loadGroupsFromStorage();
            const newGroup: GroupDescriptor = {
              id: generateId(),
              name: name.trim(),
              createdBy,
              createdAt: Date.now(),
              ndoHashes: []
            };
            saveGroupsToStorage([...groups, newGroup]);
            return newGroup;
          }) as E.Effect<GroupDescriptor, LobbyError>,

        joinGroup: (inviteCode) =>
          E.try({
            try: () => {
              const encoded = inviteCode.includes('?group=')
                ? inviteCode.split('?group=')[1]
                : inviteCode;
              const decoded = atob(encoded);
              const groupData: GroupDescriptor = JSON.parse(decoded);
              const groups = loadGroupsFromStorage();
              if (groups.some((g) => g.id === groupData.id)) return groupData;
              saveGroupsToStorage([...groups, { ...groupData, ndoHashes: groupData.ndoHashes ?? [] }]);
              return groupData;
            },
            catch: (e) => LobbyError.fromError(new Error(`Invalid invite code: ${String(e)}`))
          }),

        generateInviteLink: (groupId) =>
          E.sync(() => {
            const groups = loadGroupsFromStorage();
            const group = groups.find((g) => g.id === groupId);
            if (!group) return '';
            const encoded = btoa(JSON.stringify(group));
            return `${window.location.origin}?group=${encoded}`;
          }) as E.Effect<string, LobbyError>,

        // Lobby DHT — real zome calls
        getAllNdoDescriptors: () =>
          wz<NdoAnnouncement[]>('get_all_ndo_announcements', null, 'GET_ALL_NDO_ANNOUNCEMENTS'),

        announceNdo: (input) => wz<Uint8Array>('announce_ndo', input, 'ANNOUNCE_NDO'),

        upsertLobbyAgentProfile: (input) =>
          wz<Uint8Array>('upsert_lobby_agent_profile', input, 'UPSERT_LOBBY_AGENT_PROFILE'),

        getLobbyAgentProfile: (agentPubKey) =>
          wz<LobbyAgentProfile | null>(
            'get_lobby_agent_profile',
            agentPubKey,
            'GET_LOBBY_AGENT_PROFILE'
          )
      } satisfies LobbyService;
    })
  );

/** Fully-resolved layer for direct use (no further dependencies needed). */
export const LobbyServiceResolved: Layer.Layer<LobbyServiceTag> = LobbyServiceLive.pipe(
  Layer.provide(HolochainClientServiceLive)
);
