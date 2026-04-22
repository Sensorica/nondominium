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

// ─── Service interface ────────────────────────────────────────────────────────

export interface LobbyService {
  getMyGroups: () => E.Effect<GroupDescriptor[], LobbyError>;
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
        getMyGroups: () => wz<GroupDescriptor[]>('get_my_groups', null, 'GET_MY_GROUPS'),

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
