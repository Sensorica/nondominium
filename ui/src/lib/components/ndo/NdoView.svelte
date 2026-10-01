<script lang="ts">
  import { untrack } from 'svelte';
  import { appContext } from '$lib/stores/app.context.svelte';
  import {
    createNdoStore,
    isTaskInterrupted,
    setNdoStore,
    type NdoMember,
    type NdoStore
  } from '$lib/stores/ndo.store.svelte';
  import { dataOf, errorOf, isBusy, type EntityState } from '$lib/domain/entity-state';
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

  /**
   * The store of the NDO open in this view, one per `specHashB64`. Recreated when the
   * prop changes and destroyed with the old hash or on teardown, which interrupts every
   * fiber it forked. Descendants read it through `getNdoStore()`; they only mount once
   * `specActionHash` is set, so the store exists by then.
   */
  let store = $state.raw<NdoStore | null>(null);
  setNdoStore(() => store!);

  $effect(() => {
    const hashB64 = specHashB64;
    // Untracked: creating the store seeds and reads its own state, which must not
    // become a dependency of this effect.
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

  let tab = $state<'resources' | 'governance' | 'composition' | 'activity'>('resources');
  let showForkModal = $state(false);
  let showAssociateModal = $state(false);
  let showJoinPanel = $state(false);
  let joinMessage = $state<string | null>(null);
  let joinError = $state<string | null>(null);
  let joinLoading = $state(false);

  const specActionHash = $derived(store?.actionHash ?? null);
  const parseError = $derived(store?.parseError ?? null);
  const ndoDescriptor = $derived(store?.ndo ?? null);
  const isLoading = $derived(store?.isLoading ?? false);
  const loadError = $derived(store?.loadError ?? null);
  /**
   * The cloned `ndo` cell holding this NDO's Layer 0 identity. Every Layer 1 and
   * Layer 2 call below is addressed to it: the identity those entries reference
   * only exists in that DHT, never in the shared provisioned cell. `null` means
   * a legacy NDO still living in the shared cell, and callers fall back to it.
   */
  const ndoCellId = $derived(store?.cellId ?? null);

  // A failed members read shows an empty list beside its error, as before.
  const memberRows = (members: EntityState<NdoMember[], string>): NdoMember[] =>
    errorOf(members) ? [] : (dataOf(members) ?? []);
  const ndoMembers = $derived(store ? memberRows(store.members) : []);
  const membersLoading = $derived(store ? isBusy(store.members) : false);
  const membersError = $derived(store ? errorOf(store.members) : null);

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

  $effect(() => {
    if (showJoinPanel && ndoMembers.length === 0 && !membersLoading && !membersError) {
      void loadNdoMembers();
    }
  });

  const tabs = [
    { id: 'resources' as const, label: 'Resources' },
    { id: 'governance' as const, label: 'Governance' },
    { id: 'composition' as const, label: 'Composition' },
    { id: 'activity' as const, label: 'Activity' }
  ];

  const isAuthenticated = $derived(appContext.myAgentPubKey != null);
</script>

{#if parseError}
  <div class="p-6">
    <p class="text-red-600">{parseError}</p>
  </div>
{:else if specActionHash}
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

  <div class="border-b border-gray-200 bg-white px-6 pt-4">
    <div class="flex items-start justify-between">
      <div>
        {#if isLoading}
          <div class="mb-1 h-6 w-40 animate-pulse rounded bg-gray-200"></div>
        {:else if loadError}
          <h1 class="text-xl font-bold text-red-600">Failed to load NDO</h1>
        {:else}
          <h1 class="text-xl font-bold text-gray-900">{ndoDescriptor?.name ?? 'NDO'}</h1>
        {/if}
        <p class="mt-1 font-mono text-xs text-gray-400">{specHashB64.slice(0, 20)}…</p>
      </div>
      <div class="ml-4 flex shrink-0 items-center gap-2">
        <button
          type="button"
          disabled={joinLoading}
          onclick={() => {
            showJoinPanel = !showJoinPanel;
            if (showJoinPanel) void loadNdoMembers();
          }}
          class="rounded border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
        >
          {joinLoading ? 'Joining…' : 'Join NDO'}
        </button>

        <!-- Associate with group: writes an NdoAnchor (clone coordinates) on the target group DHT -->
        <button
          type="button"
          onclick={() => {
            showAssociateModal = true;
          }}
          class="rounded border border-blue-300 px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50"
        >
          Associate with a group
        </button>

        <!-- Fork: requires live Holochain connection -->
        {#if isAuthenticated}
          <button
            type="button"
            onclick={() => {
              showForkModal = true;
            }}
            class="rounded border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
          >
            Fork this NDO
          </button>
        {/if}
      </div>
    </div>
    <nav class="mt-4 flex gap-2" aria-label="NDO sections">
      {#each tabs as t}
        <button
          type="button"
          class="rounded-t border border-b-0 px-3 py-2 text-sm font-medium transition-colors {tab ===
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

  <!-- NDO detail card -->
  {#if ndoDescriptor}
    <div class="mx-6 mt-4 rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {#if ndoDescriptor.description}
          <div class="sm:col-span-2">
            <p class="text-xs font-semibold uppercase tracking-wide text-gray-400">Description</p>
            <p class="mt-1 text-sm text-gray-800">{ndoDescriptor.description}</p>
          </div>
        {/if}
        <div>
          <p class="text-xs font-semibold uppercase tracking-wide text-gray-400">Property regime</p>
          <p class="mt-1 text-sm font-medium text-gray-800">
            {ndoDescriptor.property_regime ?? '—'}
          </p>
        </div>
        <div>
          <p class="text-xs font-semibold uppercase tracking-wide text-gray-400">Resource nature</p>
          <p class="mt-1 text-sm font-medium text-gray-800">
            {ndoDescriptor.resource_nature ?? '—'}
          </p>
        </div>
        <div>
          <p class="text-xs font-semibold uppercase tracking-wide text-gray-400">Lifecycle stage</p>
          <p data-testid="ndo-lifecycle-stage" class="mt-1 text-sm font-medium text-gray-800">
            {ndoDescriptor.lifecycle_stage ?? '—'}
          </p>
        </div>
        {#if ndoDescriptor.created_at}
          <div>
            <p class="text-xs font-semibold uppercase tracking-wide text-gray-400">Created</p>
            <p class="mt-1 text-sm text-gray-600">
              {new Date(ndoDescriptor.created_at / 1000).toLocaleString()}
            </p>
          </div>
        {/if}
      </div>
    </div>
  {/if}

  {#if showJoinPanel}
    <div class="mx-6 mt-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
      <h2 class="text-sm font-semibold text-gray-800">NDO membership</h2>
      <p class="mt-1 text-xs text-gray-500">
        Joining an NDO records your participation on the DHT. This is distinct from associating the
        NDO with a group (a curated short list for group members).
      </p>
      <div class="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={joinLoading}
          onclick={handleJoinNdo}
          class="rounded bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {joinLoading ? 'Joining…' : 'Join this NDO'}
        </button>
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

  <NdoIdentityLayer descriptor={ndoDescriptor} onrefresh={handleRefresh} />

  <div class="p-6">
    {#if tab === 'resources'}
      <ResourcesTab
        {specActionHash}
        {ndoCellId}
        lifecycleStage={ndoDescriptor?.lifecycle_stage ?? null}
        propertyRegime={ndoDescriptor?.property_regime ?? null}
      />
    {:else if tab === 'governance'}
      <GovernanceTab
        {specActionHash}
        {ndoCellId}
        propertyRegime={ndoDescriptor?.property_regime ?? null}
        resourceNature={ndoDescriptor?.resource_nature ?? null}
        rivalryOverride={ndoDescriptor?.rivalry_override ?? null}
      />
    {:else if tab === 'composition'}
      <CompositionTab />
    {:else}
      <ActivityTab
        {specActionHash}
        {ndoCellId}
        propertyRegime={ndoDescriptor?.property_regime ?? null}
        resourceNature={ndoDescriptor?.resource_nature ?? null}
        rivalryOverride={ndoDescriptor?.rivalry_override ?? null}
      />
    {/if}
  </div>
{/if}
