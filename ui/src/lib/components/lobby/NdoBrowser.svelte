<script lang="ts">
  import type { LifecycleStage, NdoDescriptor, PropertyRegime, ResourceNature } from '@nondominium/shared-types';
  import type { ActiveFilters } from '$lib/stores/lobby.store.svelte';
  import NdoCard from './NdoCard.svelte';

  interface Props {
    descriptors: NdoDescriptor[];
    isLoading?: boolean;
    errorMessage?: string | null;
    activeFilters?: ActiveFilters;
    onfilterchange?: (partial: Partial<ActiveFilters>) => void;
    onclearfilters?: () => void;
  }

  let {
    descriptors,
    isLoading = false,
    errorMessage = null,
    activeFilters = { stages: [], natures: [], regimes: [] },
    onfilterchange,
    onclearfilters
  }: Props = $props();

  const allStages: LifecycleStage[] = [
    'Ideation', 'Specification', 'Development', 'Prototype',
    'Stable', 'Distributed', 'Active', 'Hibernating', 'Deprecated', 'EndOfLife'
  ];
  const allNatures: ResourceNature[] = ['Physical', 'Digital', 'Service', 'Hybrid', 'Information'];
  const allRegimes: PropertyRegime[] = ['Private', 'Commons', 'Collective', 'Pool', 'CommonPool', 'Nondominium'];

  const stageColors: Record<LifecycleStage, string> = {
    Ideation: 'bg-gray-100 text-gray-600 border-gray-300',
    Specification: 'bg-blue-50 text-blue-600 border-blue-300',
    Development: 'bg-indigo-100 text-indigo-700 border-indigo-300',
    Prototype: 'bg-amber-100 text-amber-700 border-amber-300',
    Stable: 'bg-green-100 text-green-700 border-green-300',
    Distributed: 'bg-teal-100 text-teal-700 border-teal-300',
    Active: 'bg-emerald-100 text-emerald-700 border-emerald-300',
    Hibernating: 'bg-yellow-100 text-yellow-700 border-yellow-300',
    Deprecated: 'bg-orange-100 text-orange-700 border-orange-300',
    EndOfLife: 'bg-red-100 text-red-700 border-red-300'
  };

  const natureColors: Record<ResourceNature, string> = {
    Physical: 'bg-blue-100 text-blue-700 border-blue-300',
    Digital: 'bg-purple-100 text-purple-700 border-purple-300',
    Service: 'bg-orange-100 text-orange-700 border-orange-300',
    Hybrid: 'bg-teal-100 text-teal-700 border-teal-300',
    Information: 'bg-indigo-100 text-indigo-700 border-indigo-300'
  };

  const regimeColors: Record<PropertyRegime, string> = {
    Nondominium: 'bg-emerald-100 text-emerald-700 border-emerald-300',
    Commons: 'bg-cyan-100 text-cyan-700 border-cyan-300',
    Collective: 'bg-violet-100 text-violet-700 border-violet-300',
    Pool: 'bg-amber-100 text-amber-700 border-amber-300',
    CommonPool: 'bg-rose-100 text-rose-700 border-rose-300',
    Private: 'bg-gray-100 text-gray-600 border-gray-300'
  };

  function toggleStage(s: LifecycleStage) {
    const current = activeFilters.stages;
    const next = current.includes(s) ? current.filter((x) => x !== s) : [...current, s];
    onfilterchange?.({ stages: next });
  }

  function toggleNature(n: ResourceNature) {
    const current = activeFilters.natures;
    const next = current.includes(n) ? current.filter((x) => x !== n) : [...current, n];
    onfilterchange?.({ natures: next });
  }

  function toggleRegime(r: PropertyRegime) {
    const current = activeFilters.regimes;
    const next = current.includes(r) ? current.filter((x) => x !== r) : [...current, r];
    onfilterchange?.({ regimes: next });
  }

  const hasFilters = $derived(
    activeFilters.stages.length > 0 ||
    activeFilters.natures.length > 0 ||
    activeFilters.regimes.length > 0
  );
</script>

<section class="rounded-lg border border-gray-200 bg-white shadow-sm">
  <!-- Filter bar -->
  <div class="border-b border-gray-100 px-4 py-3">
    <div class="flex flex-wrap items-center gap-1.5">
      <span class="mr-1 text-xs font-semibold text-gray-500 uppercase">Stage:</span>
      {#each allStages as s}
        <button
          type="button"
          onclick={() => toggleStage(s)}
          class="rounded border px-2 py-0.5 text-xs font-medium transition-opacity {stageColors[s]} {activeFilters.stages.includes(s) ? 'ring-2 ring-offset-1 ring-current' : 'opacity-60 hover:opacity-100'}"
        >
          {s}
        </button>
      {/each}
    </div>

    <div class="mt-2 flex flex-wrap items-center gap-1.5">
      <span class="mr-1 text-xs font-semibold text-gray-500 uppercase">Nature:</span>
      {#each allNatures as n}
        <button
          type="button"
          onclick={() => toggleNature(n)}
          class="rounded border px-2 py-0.5 text-xs font-medium transition-opacity {natureColors[n]} {activeFilters.natures.includes(n) ? 'ring-2 ring-offset-1 ring-current' : 'opacity-60 hover:opacity-100'}"
        >
          {n}
        </button>
      {/each}
    </div>

    <div class="mt-2 flex flex-wrap items-center gap-1.5">
      <span class="mr-1 text-xs font-semibold text-gray-500 uppercase">Regime:</span>
      {#each allRegimes as r}
        <button
          type="button"
          onclick={() => toggleRegime(r)}
          class="rounded border border-dashed px-2 py-0.5 text-xs font-medium transition-opacity {regimeColors[r]} {activeFilters.regimes.includes(r) ? 'ring-2 ring-offset-1 ring-current' : 'opacity-60 hover:opacity-100'}"
        >
          {r}
        </button>
      {/each}
    </div>

    {#if hasFilters}
      <div class="mt-2">
        <button
          type="button"
          onclick={() => onclearfilters?.()}
          class="text-xs text-gray-400 hover:text-gray-700 underline"
        >
          Clear filters
        </button>
      </div>
    {/if}
  </div>

  <!-- NDO grid -->
  <div class="p-4">
    <div class="mb-3 flex items-center justify-between">
      <h2 class="text-lg font-semibold text-gray-900">
        NDO browser
        {#if hasFilters}
          <span class="ml-1 text-sm font-normal text-gray-400">({descriptors.length} results)</span>
        {/if}
      </h2>
      {#if isLoading}
        <span class="text-sm text-gray-500">Loading…</span>
      {/if}
    </div>

    {#if errorMessage}
      <p class="mb-3 rounded border border-red-200 bg-red-50 p-2 text-sm text-red-700">{errorMessage}</p>
    {/if}

    {#if descriptors.length === 0 && !isLoading}
      <p class="text-sm text-gray-500">
        {hasFilters ? 'No NDOs match the selected filters.' : 'No NDOs yet. Create one from within a group.'}
      </p>
    {:else}
      <ul class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {#each descriptors as d (d.hash)}
          <li>
            <NdoCard descriptor={d} />
          </li>
        {/each}
      </ul>
    {/if}
  </div>
</section>
