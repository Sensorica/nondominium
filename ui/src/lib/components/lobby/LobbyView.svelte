<script lang="ts">
  import { onMount } from 'svelte';
  import { lobbyStore } from '$lib/stores/lobby.store.svelte';
  import { resourceStore } from '$lib/stores/resource.store.svelte';
  import { appContext } from '$lib/stores/app.context.svelte';
  import holochainClientService from '$lib/services/holochain.service.svelte';
  import GroupSidebar from './GroupSidebar.svelte';
  import NdoBrowser from './NdoBrowser.svelte';
  import UserProfileForm from './UserProfileForm.svelte';

  let showProfileModal = $state(false);
  let showProfileEditModal = $state(false);

  onMount(() => {
    void (async () => {
      await resourceStore.fetchAllResourceSpecifications();
      await lobbyStore.loadLobby();
      try {
        appContext.myAgentPubKey = await holochainClientService.getMyAgentPubKey();
      } catch {
        appContext.myAgentPubKey = null;
      }
      if (!appContext.lobbyUserProfile) {
        showProfileModal = true;
      }
    })();
  });

  $effect(() => {
    appContext.myPerson = lobbyStore.myPerson;
    appContext.currentView = 'lobby';
  });
</script>

{#if showProfileModal}
  <UserProfileForm
    mode="modal"
    onclose={() => { showProfileModal = false; }}
    onsave={() => { showProfileModal = false; }}
  />
{/if}

{#if showProfileEditModal}
  <UserProfileForm
    mode="modal"
    onclose={() => { showProfileEditModal = false; }}
    onsave={() => { showProfileEditModal = false; }}
  />
{/if}

<div class="flex min-h-full flex-col">
  <!-- User profile bar -->
  <div class="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-6 py-2">
    {#if appContext.lobbyUserProfile}
      <span class="text-sm text-gray-600">
        Lobby profile: <span class="font-medium text-gray-900">{appContext.lobbyUserProfile.nickname}</span>
      </span>
      <button
        type="button"
        class="text-xs text-blue-600 hover:underline"
        onclick={() => { showProfileEditModal = true; }}
      >
        Edit profile
      </button>
    {:else}
      <span class="text-sm text-gray-400 italic">No lobby profile set</span>
      <button
        type="button"
        class="rounded bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700"
        onclick={() => { showProfileModal = true; }}
      >
        Set up profile
      </button>
    {/if}
  </div>

  <div class="flex flex-1">
    <GroupSidebar
      groups={lobbyStore.groups}
      oncreategroup={async (name) => { await lobbyStore.createGroup(name, appContext.lobbyUserProfile?.nickname); }}
      onjoingroup={async (code) => { await lobbyStore.joinGroup(code); }}
      oneditprofile={() => { showProfileEditModal = true; }}
    />
    <div class="flex-1 space-y-6 p-6">
      <header>
        <h1 class="text-2xl font-bold text-gray-900">Lobby</h1>
        <p class="mt-1 text-gray-600">
          Browse all NDOs. Create or join a group to start contributing.
        </p>
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
  </div>
</div>
