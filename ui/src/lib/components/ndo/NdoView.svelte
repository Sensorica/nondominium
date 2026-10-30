<script lang="ts">
  import { untrack } from 'svelte';
  import { goto } from '$app/navigation';
  import {
    Breadcrumb,
    NdoActionRow,
    NdoButton,
    type BreadcrumbItem
  } from '@nondominium/ndo-ui';
  import { appContext } from '$lib/stores/app.context.svelte';
  import { lobbyStore } from '$lib/stores/lobby.store.svelte';
  import {
    createNdoStore,
    isTaskInterrupted,
    setNdoStore,
    type NdoMember,
    type NdoStore
  } from '$lib/stores/ndo.store.svelte';
  import { dataOf, errorOf, isBusy, needsFirstLoad, type EntityState } from '$lib/domain/entity-state';
  import MemberList from '$lib/components/group/MemberList.svelte';
  import ResourcesTab from './ResourcesTab.svelte';
  import GovernanceTab from './GovernanceTab.svelte';
  import ActivityTab from './ActivityTab.svelte';
  import CompositionTab from './CompositionTab.svelte';
  import NdoIdentityLayer from './NdoIdentityLayer.svelte';
  import ForkNdoModal from './ForkNdoModal.svelte';
  import AssociateNdoModal from './AssociateNdoModal.svelte';

  interface Props {
    specHashB64: string;
  }

  let { specHashB64 }: Props = $props();

  let store = $state.raw<NdoStore | null>(null);
  setNdoStore(() => store!);

  $effect(() => {
    const hashB64 = specHashB64;
    const next = untrack(() => {
      const created = createNdoStore(hashB64);
      if (created.actionHash) {
        appContext.currentView = 'ndo';
        appContext.selectedNdoId = created.actionHash;
      } else {
        appContext.selectedNdoId = null;
      }
      return created;
    });
    store = next;
    return () => next.destroy();
  });

  type TabId = 'overview' | 'resources' | 'governance' | 'composition' | 'activity';
  let tab = $state<TabId>('overview');
  let showForkModal = $state(false);
  let showAssociateModal = $state(false);
  let showJoinPanel = $state(false);
  let joinMessage = $state<string | null>(null);
  let joinError = $state<string | null>(null);
  let joinLoading = $state(false);
  let linkCopied = $state(false);

  const specActionHash = $derived(store?.actionHash ?? null);
  const parseError = $derived(store?.parseError ?? null);
  const ndoDescriptor = $derived(store?.ndo ?? null);
  const isLoading = $derived(store?.isLoading ?? false);
  const loadError = $derived(store?.loadError ?? null);
  const ndoCellId = $derived(store?.cellId ?? null);

  const memberRows = (members: EntityState<NdoMember[], string>): NdoMember[] =>
    errorOf(members) ? [] : (dataOf(members) ?? []);
  const ndoMembers = $derived(store ? memberRows(store.members) : []);
  const membersLoading = $derived(store ? isBusy(store.members) : false);
  const membersError = $derived(store ? errorOf(store.members) : null);

  const isAuthenticated = $derived(appContext.myAgentPubKey != null);
  const missing = $derived(!isLoading && !loadError && !ndoDescriptor && !parseError && !!specActionHash);

  const breadcrumb = $derived.by((): BreadcrumbItem[] => {
    const items: BreadcrumbItem[] = [{ label: 'Lobby', href: '/' }];
    const groupId = appContext.selectedGroupId;
    if (groupId) {
      const g = lobbyStore.groups.find((x) => x.id === groupId);
      items.push({
        label: g?.name ?? 'Group',
        href: `/group/${encodeURIComponent(groupId)}`
      });
      items.push({
        label: 'Resource',
        href: `/group/${encodeURIComponent(groupId)}`
      });
    }
    items.push({ label: ndoDescriptor?.name ?? 'NDO' });
    return items;
  });

  const tabs: { id: TabId; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'resources', label: 'Resources' },
    { id: 'governance', label: 'Governance' },
    { id: 'composition', label: 'Composition' },
    { id: 'activity', label: 'Activity' }
  ];

  function handleRefresh() {
    store?.refresh();
  }

  function loadNdoMembers() {
    store?.loadMembers();
  }

  async function handleJoinNdo() {
    const current = store;
    if (!current) return;
    joinLoading = true;
    joinMessage = null;
    joinError = null;
    let joined: boolean;
    try {
      joined = await current.join();
    } catch (error) {
      joinLoading = false;
      if (isTaskInterrupted(error)) return;
      throw error;
    }
    joinLoading = false;
    if (!joined) {
      joinError = 'Could not join this NDO. Please try again.';
    } else {
      joinMessage = 'You have joined this NDO.';
      current.loadMembers();
    }
    showJoinPanel = true;
  }

  async function copyLink() {
    try {
      const url = `${window.location.origin}/ndo/${encodeURIComponent(specHashB64)}`;
      await navigator.clipboard.writeText(url);
      linkCopied = true;
      setTimeout(() => (linkCopied = false), 2000);
    } catch {
      // clipboard unavailable
    }
  }

  $effect(() => {
    if (showJoinPanel && store && needsFirstLoad(store.members)) {
      void loadNdoMembers();
    }
  });

  $effect(() => {
    if (
      (tab === 'overview' || tab === 'activity') &&
      store &&
      needsFirstLoad(store.members)
    ) {
      void loadNdoMembers();
    }
  });
</script>

{#if parseError}
  <div class="p-6">
    <p class="text-red-600">{parseError}</p>
    <a href="/" class="mt-3 inline-block text-sm text-blue-700 hover:underline">Back to Lobby</a>
  </div>
{:else if !specActionHash}
  <div class="p-6">
    <h1 class="text-xl font-bold text-gray-900">This NDO is not available</h1>
    <p class="mt-2 text-sm text-gray-600">No resource matches this link.</p>
    <a href="/" class="mt-3 inline-block text-sm text-blue-700 hover:underline">Back to Lobby</a>
  </div>
{:else}
  {#if showForkModal && ndoDescriptor}
    <ForkNdoModal
      descriptor={ndoDescriptor}
      onclose={() => {
        showForkModal = false;
      }}
    />
  {/if}

  {#if showAssociateModal}
    <AssociateNdoModal
      ndoHashB64={specHashB64}
      ndoName={ndoDescriptor?.name ?? 'this NDO'}
      onclose={() => {
        showAssociateModal = false;
      }}
    />
  {/if}

  <div class="border-b border-gray-200 bg-white px-6 pt-4" data-testid="ndo-resource-view">
    <div class="mb-3">
      <Breadcrumb items={breadcrumb} />
    </div>

    <div class="flex flex-col items-start gap-3 md:flex-row md:justify-between md:gap-0">
      <div>
        {#if isLoading}
          <div class="mb-1 h-6 w-40 animate-pulse rounded bg-gray-200"></div>
        {:else if loadError}
          <h1 class="text-xl font-bold text-red-600">Failed to load NDO</h1>
        {:else if missing}
          <h1 class="text-xl font-bold text-gray-900">This NDO is not in the session</h1>
        {:else}
          <h1 class="text-xl font-bold text-gray-900">{ndoDescriptor?.name ?? 'NDO'}</h1>
        {/if}
        <p class="mt-1 font-mono text-xs text-gray-400">{specHashB64.slice(0, 20)}…</p>
      </div>
      <div class="flex flex-wrap items-center gap-2 md:ml-4 md:shrink-0">
        <NdoButton
          variant="ghost"
          disabled={joinLoading}
          onclick={() => {
            showJoinPanel = !showJoinPanel;
            if (showJoinPanel) void loadNdoMembers();
          }}
        >
          {joinLoading ? 'Joining…' : 'Join NDO'}
        </NdoButton>
        <NdoButton variant="ghost" onclick={() => (showAssociateModal = true)}>
          Associate with a group
        </NdoButton>
        <NdoButton variant="ghost" onclick={() => void copyLink()}>
          {linkCopied ? 'Link copied!' : 'Copy NDO link'}
        </NdoButton>
        {#if isAuthenticated}
          <NdoButton variant="ghost" onclick={() => (showForkModal = true)}>Fork this NDO</NdoButton>
        {/if}
      </div>
    </div>

    <nav class="mt-4 flex gap-2 overflow-x-auto" aria-label="NDO sections">
      {#each tabs as t}
        <button
          type="button"
          class="shrink-0 rounded-t border border-b-0 px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors {tab ===
          t.id
            ? 'border-gray-200 bg-gray-50 text-gray-900'
            : 'border-transparent text-gray-500 hover:text-gray-800'}"
          onclick={() => {
            tab = t.id;
          }}
        >
          {t.label}
        </button>
      {/each}
    </nav>
  </div>

  {#if loadError}
    <div class="mx-6 mt-4 rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      {loadError}
      <button type="button" onclick={handleRefresh} class="ml-3 underline hover:text-red-900"
        >Retry</button
      >
    </div>
  {/if}

  {#if missing}
    <div class="mx-6 mt-4 rounded border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
      No resource matches this link.
      {#if appContext.selectedGroupId}
        <a
          class="ml-1 text-blue-700 underline"
          href="/group/{encodeURIComponent(appContext.selectedGroupId)}"
        >
          Back to group
        </a>
      {:else}
        <button type="button" class="ml-1 text-blue-700 underline" onclick={() => goto('/')}>
          Back to the lobby
        </button>
      {/if}
    </div>
  {/if}

  {#if showJoinPanel}
    <div class="mx-6 mt-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
      <h2 class="text-sm font-semibold text-gray-800">NDO membership</h2>
      <p class="mt-1 text-xs text-gray-500">
        Joining an NDO records your participation on the DHT. This is distinct from associating the
        NDO with a group.
      </p>
      <div class="mt-3 flex flex-wrap items-center gap-2">
        <NdoButton disabled={joinLoading} onclick={() => void handleJoinNdo()}>
          {joinLoading ? 'Joining…' : 'Join this NDO'}
        </NdoButton>
      </div>
      {#if joinMessage}
        <p class="mt-2 text-xs text-gray-600">{joinMessage}</p>
      {/if}
      {#if joinError}
        <p class="mt-2 text-xs text-amber-700">{joinError}</p>
      {/if}
      <div class="mt-4">
        <MemberList members={ndoMembers} />
        {#if membersLoading}
          <p class="mt-2 text-xs text-gray-400 italic">Loading members…</p>
        {:else if membersError}
          <p class="mt-2 text-xs text-amber-700">{membersError}</p>
        {/if}
      </div>
    </div>
  {/if}

  <div class="space-y-4 p-6">
    {#if tab === 'overview'}
      <NdoActionRow
        oncreatendo={() => {
          const gid = appContext.selectedGroupId;
          if (gid) void goto(`/group/${encodeURIComponent(gid)}?createNdo=1`);
          else void goto('/ndo/new');
        }}
      />
      <NdoIdentityLayer descriptor={ndoDescriptor} onrefresh={handleRefresh} />
      <section class="rounded-lg border border-gray-200 bg-white p-4">
        <h2 class="text-sm font-semibold text-gray-800">Members</h2>
        <MemberList members={ndoMembers} />
        {#if membersLoading}
          <p class="mt-2 text-xs text-gray-400 italic">Loading members…</p>
        {:else if membersError}
          <p class="mt-2 text-xs text-amber-700">{membersError}</p>
        {/if}
      </section>
    {:else if tab === 'resources' && specActionHash}
      <ResourcesTab
        {specActionHash}
        {ndoCellId}
        lifecycleStage={ndoDescriptor?.lifecycle_stage ?? null}
        propertyRegime={ndoDescriptor?.property_regime ?? null}
        {ndoDescriptor}
      />
    {:else if tab === 'governance' && specActionHash}
      <GovernanceTab
        {specActionHash}
        {ndoCellId}
        propertyRegime={ndoDescriptor?.property_regime ?? null}
        resourceNature={ndoDescriptor?.resource_nature ?? null}
        rivalryOverride={ndoDescriptor?.rivalry_override ?? null}
        {ndoDescriptor}
      />
    {:else if tab === 'composition' && specActionHash}
      <CompositionTab ndoIdentityHash={specActionHash} />
    {:else if tab === 'activity' && specActionHash}
      <ActivityTab
        {specActionHash}
        {ndoCellId}
        propertyRegime={ndoDescriptor?.property_regime ?? null}
        resourceNature={ndoDescriptor?.resource_nature ?? null}
        rivalryOverride={ndoDescriptor?.rivalry_override ?? null}
        ndoMembers={ndoMembers}
      />
    {/if}
  </div>
{/if}
