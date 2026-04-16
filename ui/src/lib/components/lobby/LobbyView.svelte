<script lang="ts">
  import { onMount } from 'svelte';
  import { lobbyStore } from '$lib/stores/lobby.store.svelte';
  import { resourceStore } from '$lib/stores/resource.store.svelte';
  import { appContext } from '$lib/stores/app.context.svelte';
  import GroupSidebar from './GroupSidebar.svelte';
  import NdoBrowser from './NdoBrowser.svelte';

  /** Issue #96: NdoBrowser is populated from `resourceService.getAllResourceSpecifications()` (via `resourceStore`). */
  onMount(() => {
    void (async () => {
      await resourceStore.fetchAllResourceSpecifications();
      await lobbyStore.loadLobby();
    })();
  });

  $effect(() => {
    appContext.myPerson = lobbyStore.myPerson;
    appContext.myAgentPubKey = lobbyStore.myPerson?.agent_pub_key ?? null;
    appContext.currentView = 'lobby';
  });
</script>

<div class="flex min-h-full">
  <GroupSidebar groups={lobbyStore.groups} />
  <div class="flex-1 space-y-6 p-6">
    <header>
      <h1 class="text-2xl font-bold text-gray-900">Lobby</h1>
      <p class="mt-1 text-gray-600">
        Browse NDOs backed by resource specifications on your conductor.
      </p>
      {#if lobbyStore.myPerson}
        <p class="mt-2 text-sm text-gray-500">
          Signed in as <span class="font-medium text-gray-800">{lobbyStore.myPerson.name}</span>
        </p>
      {/if}
    </header>
    <NdoBrowser
      descriptors={lobbyStore.ndos}
      isLoading={lobbyStore.isLoading}
      errorMessage={lobbyStore.errorMessage}
    />
  </div>
</div>
