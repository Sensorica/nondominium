import type { LobbyUserProfile } from '@nondominium/shared-types';
import holochainClientService from '$lib/services/holochain.service.svelte';
import { loadMossProfile, loadMyRoles, strongestRole, type MossRoleName } from '$lib/moss/profile';

/**
 * Identity and role inside Moss. Inside Moss the Moss group already holds
 * membership and profiles, so the standalone Lobby profile form is replaced by
 * the Moss profile, and the role comes from `myAccountabilitiesPerGroup()`.
 * Everything is empty when the UI runs standalone.
 */
export type MossStore = {
  readonly isMoss: boolean;
  readonly profile: LobbyUserProfile | null;
  readonly roles: readonly MossRoleName[];
  readonly role: MossRoleName | null;
  load: () => Promise<void>;
};

let profile = $state<LobbyUserProfile | null>(null);
let roles = $state<MossRoleName[]>([]);

export const mossStore: MossStore = {
  get isMoss() {
    return holochainClientService.moss !== null;
  },
  get profile() {
    return profile;
  },
  get roles() {
    return roles;
  },
  get role() {
    return strongestRole(roles);
  },
  async load() {
    const moss = holochainClientService.moss;
    if (!moss || moss.weaveClient.renderInfo.type !== 'applet-view') return;
    const me = await holochainClientService.getMyAgentPubKey();
    const [loadedProfile, loadedRoles] = await Promise.all([
      loadMossProfile(moss.weaveClient.renderInfo.profilesClient, me),
      loadMyRoles(moss.weaveClient, moss.groupHash).catch((error) => {
        console.warn('[moss] could not read the group roles:', error);
        return [] as MossRoleName[];
      })
    ]);
    profile = loadedProfile;
    roles = loadedRoles;
  }
};
