import { Effect as E, pipe } from 'effect';
import type { ActionHash, DnaHash } from '@holochain/client';
import type { LobbyUserProfile } from '@nondominium/shared-types';
import holochainClientService from '$lib/services/holochain.service.svelte';
import { NdoServiceResolved, NdoServiceTag } from '$lib/services/zomes/ndo.service';
import { loadMossProfile, loadMyRoles, strongestRole, type MossRoleName } from '$lib/moss/profile';
import { ndoWal } from '$lib/moss/assets';
import { initialMossPath } from '$lib/moss/view';

/**
 * Identity, role and the Moss view inside Moss. The Moss group already holds
 * membership and profiles, so the standalone Lobby profile form is replaced by
 * the Moss profile, and the role comes from `myAccountabilitiesPerGroup()`.
 * Moss also decides what the tool shows first: an NDO asset opened from another
 * tool arrives as an asset view or as the main view on a WAL.
 * Everything is empty when the UI runs standalone.
 */
export type MossStore = {
  readonly isMoss: boolean;
  readonly profile: LobbyUserProfile | null;
  readonly roles: readonly MossRoleName[];
  readonly role: MossRoleName | null;
  /** Moss rendered the tool as an asset view (a side panel or window on one NDO). */
  readonly isAssetView: boolean;
  /** The NDO route Moss asked for, or null for the default page. */
  readonly initialPath: string | null;
  load: () => Promise<void>;
  /** Joins the clone cell of every anchored NDO so each resolves as a Moss asset. */
  joinNdoCells: () => Promise<void>;
  /** Puts an NDO in the Moss pocket, from where it can be linked in other tools. */
  addToPocket: (ndo: { dnaHash: DnaHash; identityActionHash: ActionHash }) => Promise<void>;
};

const services = pipe(
  E.gen(function* () {
    return { ndo: yield* NdoServiceTag };
  }),
  E.provide(NdoServiceResolved),
  E.runSync
);

let profile = $state<LobbyUserProfile | null>(null);
let roles = $state<MossRoleName[]>([]);
let isAssetView = $state(false);
let initialPath = $state<string | null>(null);

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
  get isAssetView() {
    return isAssetView;
  },
  get initialPath() {
    return initialPath;
  },
  async load() {
    const moss = holochainClientService.moss;
    if (!moss) return;
    const info = moss.weaveClient.renderInfo;
    isAssetView = info.type === 'applet-view' && info.view.type === 'asset';
    initialPath = initialMossPath(info);
    if (info.type !== 'applet-view') return;
    const me = await holochainClientService.getMyAgentPubKey();
    const [loadedProfile, loadedRoles] = await Promise.all([
      loadMossProfile(info.profilesClient, me),
      loadMyRoles(moss.weaveClient, moss.groupHash).catch((error) => {
        console.warn('[moss] could not read the group roles:', error);
        return [] as MossRoleName[];
      })
    ]);
    profile = loadedProfile;
    roles = loadedRoles;
  },
  async joinNdoCells() {
    if (!holochainClientService.moss) return;
    const exit = await E.runPromiseExit(services.ndo.joinAnchoredNdoCells());
    if (exit._tag === 'Failure') console.warn('[moss] joining the NDO cells failed:', exit.cause);
  },
  async addToPocket(ndo) {
    const moss = holochainClientService.moss;
    if (!moss) return;
    await moss.weaveClient.assets.assetToPocket(
      ndoWal({ ndo_dna_hash: ndo.dnaHash, identity_action_hash: ndo.identityActionHash })
    );
  }
};
