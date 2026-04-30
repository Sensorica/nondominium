<script lang="ts">
  import { lobbyStore } from '$lib/stores/lobby.store.svelte';
  import { appContext } from '$lib/stores/app.context.svelte';
  import NdoBrowser from './NdoBrowser.svelte';

  $effect(() => {
    appContext.myPerson = lobbyStore.myPerson;
    appContext.currentView = 'lobby';
    void lobbyStore.loadNdos();
  });
</script>

<div class="flex min-h-full flex-col p-6">
  <header class="mb-6">
    <h1 class="text-2xl font-bold text-gray-900">Browse NDOs</h1>
    <p class="mt-1 text-gray-600">All NDOs across your groups.</p>
    {#if lobbyStore.myPerson}
      <p class="mt-2 text-sm text-gray-500">
        Agent: <span class="font-medium text-gray-800">{lobbyStore.myPerson.name}</span>
      </p>
    {/if}
  </header>

  <NdoBrowser
    descriptors={lobbyStore.filteredNdos}
    activeFilters={lobbyStore.activeFilters}
    onfilterchange={(f) => lobbyStore.setFilters(f)}
    onclearfilters={() => lobbyStore.clearFilters()}
    isLoading={lobbyStore.isLoading}
    errorMessage={lobbyStore.errorMessage}
  />
</div>
