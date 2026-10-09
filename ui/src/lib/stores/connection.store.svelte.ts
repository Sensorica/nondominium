import type { AgentPubKey } from '@holochain/client';
import type { HolochainConnectionMode } from '$lib/utils/hc-connect';
import holochainClientService from '$lib/services/holochain.service.svelte';

/**
 * Connection lifecycle for the shell (HolochainProvider, root layout) and the
 * caller's own agent key, so no component imports the client singleton.
 * Delegates to the singleton; the getters stay reactive through its $state.
 */
export type ConnectionStore = {
  readonly isConnected: boolean;
  readonly connectionUrl: string | null;
  readonly connectionMode: HolochainConnectionMode | null;
  connectClient: () => Promise<void>;
  getMyAgentPubKey: () => Promise<AgentPubKey>;
};

export const connectionStore: ConnectionStore = {
  get isConnected() {
    return holochainClientService.isConnected;
  },
  get connectionUrl() {
    return holochainClientService.connectionUrl;
  },
  get connectionMode() {
    return holochainClientService.connectionMode;
  },
  connectClient: () => holochainClientService.connectClient(),
  getMyAgentPubKey: () => holochainClientService.getMyAgentPubKey()
};
