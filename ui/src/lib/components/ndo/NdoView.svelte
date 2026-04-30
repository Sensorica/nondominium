<script lang="ts">
  import type { ActionHash } from '@holochain/client';
  import { decodeHashFromBase64 } from '@holochain/client';
  import { Effect as E, Exit, pipe } from 'effect';
  import type { NdoDescriptor } from '@nondominium/shared-types';
  import { appContext } from '$lib/stores/app.context.svelte';
  import { NdoServiceTag, NdoServiceResolved } from '$lib/services/zomes/ndo.service';
  import { ndoDescriptorCache } from '$lib/stores/ndo-cache';
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

  let specActionHash = $state<ActionHash | null>(null);
  let parseError = $state<string | null>(null);
  let tab = $state<'resources' | 'governance' | 'composition' | 'activity'>('resources');
  let ndoDescriptor = $state<NdoDescriptor | null>(null);
  let isLoading = $state(false);
  let loadError = $state<string | null>(null);
  let showForkModal = $state(false);
  let showAssociateModal = $state(false);
  let showJoinSoon = $state(false);

  $effect(() => {
    try {
      specActionHash = decodeHashFromBase64(decodeURIComponent(specHashB64)) as ActionHash;
      parseError = null;
      appContext.currentView = 'ndo';
      appContext.selectedNdoId = specActionHash;
    } catch {
      specActionHash = null;
      parseError = 'Could not decode resource specification hash from the URL.';
      appContext.selectedNdoId = null;
    }
    // Seed immediately from the in-memory cache (populated by NdoCard click).
    const cached = ndoDescriptorCache.get(specHashB64);
    if (cached) ndoDescriptor = cached;
  });

  async function loadDescriptor(hash: ActionHash) {
    // Only show spinner if we don't already have cached data to display.
    if (!ndoDescriptor) isLoading = true;
    loadError = null;
    const exit = await E.runPromiseExit(
      pipe(
        E.gen(function* () {
          const svc = yield* NdoServiceTag;
          return yield* svc.getNdoDescriptorForSpecActionHash(hash);
        }),
        E.provide(NdoServiceResolved)
      )
    );
    isLoading = false;
    if (Exit.isSuccess(exit)) {
      ndoDescriptor = exit.value;
      // Keep cache up to date with the latest on-chain version.
      ndoDescriptorCache.set(specHashB64, exit.value);
    } else if (!ndoDescriptor) {
      // Only show the error banner if we have nothing else to display.
      loadError = 'Could not refresh NDO details from the chain. Data shown may be cached.';
    }
  }

  $effect(() => {
    if (!specActionHash) return;
    const hash = specActionHash;
    void loadDescriptor(hash);
  });

  function handleRefresh() {
    if (specActionHash) void loadDescriptor(specActionHash);
  }

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
    <ForkNdoModal descriptor={ndoDescriptor} onclose={() => { showForkModal = false; }} />
  {/if}

  {#if showAssociateModal}
    <AssociateNdoModal
      ndoHashB64={specHashB64}
      ndoName={ndoDescriptor?.name ?? 'this NDO'}
      onclose={() => { showAssociateModal = false; }}
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
        <!-- Join NDO: placeholder, no backend yet -->
        <div class="relative">
          <button
            type="button"
            onclick={() => { showJoinSoon = !showJoinSoon; }}
            class="rounded border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
          >
            Join NDO
          </button>
          {#if showJoinSoon}
            <div class="absolute right-0 top-full z-10 mt-1 whitespace-nowrap rounded border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-500 shadow-md">
              Coming soon
            </div>
          {/if}
        </div>

        <!-- Associate with group: localStorage-only, no auth needed -->
        <button
          type="button"
          onclick={() => { showAssociateModal = true; }}
          class="rounded border border-blue-300 px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50"
        >
          Associate with group
        </button>

        <!-- Fork: requires live Holochain connection -->
        {#if isAuthenticated}
          <button
            type="button"
            onclick={() => { showForkModal = true; }}
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
          class="rounded-t border border-b-0 px-3 py-2 text-sm font-medium transition-colors {tab === t.id
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
      <button
        type="button"
        onclick={handleRefresh}
        class="ml-3 underline hover:text-red-900"
      >Retry</button>
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
          <p class="mt-1 text-sm font-medium text-gray-800">{ndoDescriptor.property_regime ?? '—'}</p>
        </div>
        <div>
          <p class="text-xs font-semibold uppercase tracking-wide text-gray-400">Resource nature</p>
          <p class="mt-1 text-sm font-medium text-gray-800">{ndoDescriptor.resource_nature ?? '—'}</p>
        </div>
        <div>
          <p class="text-xs font-semibold uppercase tracking-wide text-gray-400">Lifecycle stage</p>
          <p class="mt-1 text-sm font-medium text-gray-800">{ndoDescriptor.lifecycle_stage ?? '—'}</p>
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

  <NdoIdentityLayer descriptor={ndoDescriptor} onrefresh={handleRefresh} />

  <div class="p-6">
    {#if tab === 'resources'}
      <ResourcesTab specActionHash={specActionHash} />
    {:else if tab === 'governance'}
      <GovernanceTab specActionHash={specActionHash} />
    {:else if tab === 'composition'}
      <CompositionTab />
    {:else}
      <ActivityTab specActionHash={specActionHash} />
    {/if}
  </div>
{/if}
