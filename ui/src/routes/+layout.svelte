<script lang="ts">
  import '../app.css';
  import 'virtual:uno.css';
  import { goto } from '$app/navigation';
  import favicon from '$lib/assets/favicon.svg';
  import HolochainProvider from '$lib/components/HolochainProvider.svelte';
  import AppShell from '$lib/components/shell/AppShell.svelte';
  import ProfileSetupModal from '$lib/components/lobby/ProfileSetupModal.svelte';
  import { lobbyStore } from '$lib/stores/lobby.store.svelte';
  import { appContext } from '$lib/stores/app.context.svelte';
  import { connectionStore } from '$lib/stores/connection.store.svelte';
  import { mossStore } from '$lib/stores/moss.store.svelte';

  let { children } = $props();

  let showProfileModal = $state(false);
  let profileCheckDone = $state(false);

  // Only run after Holochain connection is established, not on first mount.
  $effect(() => {
    if (!connectionStore.isConnected || profileCheckDone) return;
    profileCheckDone = true;

    void (async () => {
      try {
        appContext.myAgentPubKey = await connectionStore.getMyAgentPubKey();
      } catch {
        appContext.myAgentPubKey = null;
      }
      if (mossStore.isMoss) {
        // Inside Moss the profile comes from the Moss group, not from a form.
        await mossStore.load();
        appContext.lobbyUserProfile = mossStore.profile ?? { nickname: 'Member' };
        // Moss opened the tool on an NDO (an asset linked from another tool).
        if (mossStore.initialPath) await goto(mossStore.initialPath);
      }
      await lobbyStore.loadLobby();
      // Inside Moss, join the clone of every anchored NDO in the background so each
      // one resolves as an asset here. Not awaited: it must not delay the first paint.
      if (mossStore.isMoss) void mossStore.joinNdoCells();
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
  <ProfileSetupModal bind:open={showProfileModal} />
  <AppShell>
    {@render children()}
  </AppShell>
</HolochainProvider>
