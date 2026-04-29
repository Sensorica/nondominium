<script lang="ts">
  import '../app.css';
  import 'virtual:uno.css';
  import favicon from '$lib/assets/favicon.svg';
  import HolochainProvider from '$lib/components/HolochainProvider.svelte';
  import AppShell from '$lib/components/shell/AppShell.svelte';
  import UserProfileForm from '$lib/components/lobby/UserProfileForm.svelte';
  import { lobbyStore } from '$lib/stores/lobby.store.svelte';
  import { appContext } from '$lib/stores/app.context.svelte';
  import holochainClientService from '$lib/services/holochain.service.svelte';

  let { children } = $props();

  let showProfileModal = $state(false);
  let profileCheckDone = $state(false);

  // Only run after Holochain connection is established, not on first mount.
  $effect(() => {
    if (!holochainClientService.isConnected || profileCheckDone) return;
    profileCheckDone = true;

    void (async () => {
      try {
        appContext.myAgentPubKey = await holochainClientService.getMyAgentPubKey();
      } catch {
        appContext.myAgentPubKey = null;
      }
      await lobbyStore.loadLobby();
      if (!appContext.lobbyUserProfile) {
        showProfileModal = true;
      }
    })();
  });
</script>

<svelte:head>
  <link rel="icon" href={favicon} />
  <title>Nondominium - ValueFlows Resource Sharing</title>
</svelte:head>

<HolochainProvider autoConnect={true}>
  {#if showProfileModal}
    <UserProfileForm
      mode="modal"
      onclose={() => { showProfileModal = false; }}
      onsave={() => { showProfileModal = false; }}
    />
  {/if}
  <AppShell>
    {@render children()}
  </AppShell>
</HolochainProvider>
