<script lang="ts">
  import type {
    GroupMemberProfile,
    LifecycleStage,
    NdoDescriptor,
    PropertyRegime,
    ResourceNature
  } from '@nondominium/shared-types';
  import { appContext } from '$lib/stores/app.context.svelte';
  import { groupStore } from '$lib/stores/group.store.svelte';
  import { lobbyStore } from '$lib/stores/lobby.store.svelte';
  import { devStorageKey } from '$lib/utils/hc-connect';
  import type { ActiveFilters } from '$lib/stores/lobby.store.svelte';
  import NdoBrowser from '$lib/components/lobby/NdoBrowser.svelte';
  import NdoCreateModal from './NdoCreateModal.svelte';
  import GroupProfileModal from './GroupProfileModal.svelte';
  import MemberList from './MemberList.svelte';

  interface Props {
    groupId: string;
    autoOpenCreateModal?: boolean;
  }

  let { groupId, autoOpenCreateModal = false }: Props = $props();

  let activeFilters = $state<ActiveFilters>({ stages: [], natures: [], regimes: [] });
  let inviteCopied = $state(false);

  function setFilters(partial: Partial<ActiveFilters>): void {
    activeFilters = { ...activeFilters, ...partial };
  }

  function clearFilters(): void {
    activeFilters = { stages: [], natures: [], regimes: [] };
  }

  const filteredNdos = $derived.by(() => {
    const { stages, natures, regimes } = activeFilters;
    const noFilter = stages.length === 0 && natures.length === 0 && regimes.length === 0;
    if (noFilter) return groupStore.groupNdos;
    return groupStore.groupNdos.filter((d: NdoDescriptor) => {
      const stageOk =
        stages.length === 0 ||
        (d.lifecycle_stage !== null && stages.includes(d.lifecycle_stage as LifecycleStage));
      const natureOk =
        natures.length === 0 ||
        (d.resource_nature !== null && natures.includes(d.resource_nature as ResourceNature));
      const regimeOk =
        regimes.length === 0 ||
        (d.property_regime !== null && regimes.includes(d.property_regime as PropertyRegime));
      return stageOk && natureOk && regimeOk;
    });
  });

  let showCreateModal = $state(false);
  let showProfileModal = $state(false);

  const VISITED_KEY = devStorageKey('ndo_group_visited_v1');

  function hasVisited(id: string): boolean {
    try {
      const raw = localStorage.getItem(VISITED_KEY);
      const visited: string[] = raw ? JSON.parse(raw) : [];
      return visited.includes(id);
    } catch {
      return false;
    }
  }

  function markVisited(id: string): void {
    try {
      const raw = localStorage.getItem(VISITED_KEY);
      const visited: string[] = raw ? JSON.parse(raw) : [];
      if (!visited.includes(id)) {
        localStorage.setItem(VISITED_KEY, JSON.stringify([...visited, id]));
      }
    } catch {
      // localStorage unavailable
    }
  }

  function saveGroupProfile(profile: GroupMemberProfile): void {
    void lobbyStore.saveGroupMemberProfile(groupId, profile);
    markVisited(groupId);
  }

  async function copyInviteLink() {
    const link = await lobbyStore.generateInviteLink(groupId);
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      inviteCopied = true;
      setTimeout(() => {
        inviteCopied = false;
      }, 2000);
    } catch {
      // clipboard unavailable
    }
  }

  $effect(() => {
    appContext.currentView = 'group';
    appContext.selectedGroupId = groupId;
    void groupStore.loadGroupData(groupId);
    if (!hasVisited(groupId)) {
      showProfileModal = true;
    }
  });

  // Pull-based reactivity for shared-group items (members, NDOs): silently
  // re-fetch when the tab regains focus and on a gentle poll while this group
  // is open, so changes gossiped from other members surface without a manual
  // reload. Keyed on groupId so listeners/interval are torn down and re-created
  // when navigating between groups.
  // TODO(signals): replace this pull layer with Holochain remote signals — the
  // group zome should remote_signal members on join_group / create_soft_link /
  // create_work_log, and the UI should refresh on those signals (keeping a
  // focus/poll fallback only for offline/missed-signal cases).
  $effect(() => {
    // Reference groupId so the effect re-runs when the open group changes.
    void groupId;
    if (typeof window === 'undefined') return;

    const POLL_INTERVAL_MS = 8000;
    const refresh = () => {
      void groupStore.refreshCurrentGroup();
    };
    const onFocus = () => refresh();
    const onVisibility = () => {
      if (document.visibilityState === 'visible') refresh();
    };

    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);
    const intervalId = window.setInterval(() => {
      if (document.visibilityState === 'visible') refresh();
    }, POLL_INTERVAL_MS);

    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
      window.clearInterval(intervalId);
    };
  });

  $effect(() => {
    if (autoOpenCreateModal) {
      showCreateModal = true;
    }
  });
</script>

{#if showCreateModal}
  <NdoCreateModal
    {groupId}
    onclose={() => {
      showCreateModal = false;
    }}
  />
{/if}

{#if showProfileModal}
  <GroupProfileModal
    {groupId}
    onclose={() => {
      showProfileModal = false;
      markVisited(groupId);
    }}
    onsave={(profile) => {
      saveGroupProfile(profile);
      showProfileModal = false;
    }}
  />
{/if}

<div class="p-6">
  <!-- Group header -->
  <div class="mb-6 flex items-start justify-between">
    <div>
      <h1 class="text-2xl font-bold text-gray-900">
        {groupStore.group?.name ?? 'Group'}
      </h1>
      <p class="mt-1 font-mono text-sm text-gray-400">{groupId}</p>
    </div>
    <div class="flex items-center gap-2">
      <button
        type="button"
        onclick={copyInviteLink}
        class="rounded border border-gray-300 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
      >
        {inviteCopied ? 'Invite link copied!' : 'Copy invite link'}
      </button>
      <button
        type="button"
        onclick={() => {
          showCreateModal = true;
        }}
        class="flex items-center gap-1.5 rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
      >
        <span class="text-base leading-none">+</span> Create NDO
      </button>
    </div>
  </div>

  {#if groupStore.errorMessage}
    <p class="mb-4 rounded border border-red-200 bg-red-50 p-2 text-sm text-red-700">
      {groupStore.errorMessage}
    </p>
  {/if}

  <!-- Group-scoped NDO browser -->
  <NdoBrowser
    descriptors={filteredNdos}
    {activeFilters}
    onfilterchange={(f) => setFilters(f)}
    onclearfilters={() => clearFilters()}
    isLoading={groupStore.isLoading}
  />

  <!-- Member list -->
  <div class="mt-6">
    <MemberList members={groupStore.members} />
  </div>
</div>
