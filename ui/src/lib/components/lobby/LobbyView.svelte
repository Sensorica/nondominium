<script lang="ts">
  import { onMount } from 'svelte';
  import { lobbyStore } from '$lib/stores/lobby.store.svelte';
  import GroupSidebar from './GroupSidebar.svelte';
  import NdoBrowser from './NdoBrowser.svelte';

  onMount(() => {
    void lobbyStore.loadLobby();
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
